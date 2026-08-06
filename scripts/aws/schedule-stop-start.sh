#!/bin/bash
# ============================================================================
# Kandes.shop — Auto-Stop/Start Schedule (cost saving)
# D64 (CONTEXT.md §7): Stop instance during low-traffic hours
#
# Saves ~67% EC2 cost by running m7i-flex.large only during business hours:
#   - STOP: 23:00 Vietnam time (16:00 UTC)
#   - START: 07:00 Vietnam time (00:00 UTC)
#   - Uptime: 8 hours/day = 33% of the day
#   - m7i-flex.large: $28.7/mo instead of $89.7/mo
#
# Requirements:
#   - AWS CLI configured
#   - Instance ID and SNS topic
#   - IAM role: ec2:StartInstances, ec2:StopInstances, sns:Publish
#
# Usage:
#   ./scripts/aws/schedule-stop-start.sh
# ============================================================================

set -euo pipefail

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
INSTANCE_ID="${KANDES_INSTANCE_ID:-i-XXXXX}"
REGION="ap-southeast-1"
SNS_TOPIC_ARN="${KANDES_SNS_TOPIC_ARN:-arn:aws:sns:ap-southeast-1:XXXXX:kandes-cost-alerts}"
LAMBDA_NAME="kandes-ec2-stop-start"
RULE_NAME_STOP="kandes-stop-instance-nightly"
RULE_NAME_START="kandes-start-instance-morning"

# Cron expressions (UTC):
#   Stop:  16:00 UTC = 23:00 Vietnam
#   Start: 00:00 UTC = 07:00 Vietnam
CRON_STOP="cron(0 16 * * ? *)"
CRON_START="cron(0 0 * * ? *)"

# ----------------------------------------------------------------------------
# Pre-flight
# ----------------------------------------------------------------------------
echo "==> Configuring auto-stop/start for instance: $INSTANCE_ID"
echo "    Region: $REGION"
echo ""
echo "  Schedule:"
echo "    STOP:  23:00 Vietnam (16:00 UTC) every day"
echo "    START: 07:00 Vietnam (00:00 UTC) every day"
echo "    Uptime: 8 hrs/day (~33%)"
echo "    Estimated cost: \$28.7/mo (vs \$89.7/mo 24/7)"
echo ""

if [ "$INSTANCE_ID" = "i-XXXXX" ]; then
  echo "ERROR: Set KANDES_INSTANCE_ID environment variable first:"
  echo "  export KANDES_INSTANCE_ID=i-0123456789abcdef0"
  exit 1
fi

# ----------------------------------------------------------------------------
# Create IAM role for Lambda
# ----------------------------------------------------------------------------
echo "==> Creating IAM role: kandes-lambda-ec2-stop-start..."

cat > /tmp/lambda-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

ROLE_ARN=$(aws iam create-role \
  --role-name "kandes-lambda-ec2-stop-start" \
  --assume-role-policy-document file:///tmp/lambda-trust-policy.json \
  --query 'Role.Arn' --output text 2>/dev/null) || \
ROLE_ARN=$(aws iam get-role \
  --role-name "kandes-lambda-ec2-stop-start" \
  --query 'Role.Arn' --output text)

echo "    Role ARN: $ROLE_ARN"

# Attach policies
aws iam attach-role-policy \
  --role-name "kandes-lambda-ec2-stop-start" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" \
  > /dev/null 2>&1 || true

# Inline policy for EC2 stop/start
cat > /tmp/lambda-inline-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:StopInstances",
        "ec2:StartInstances",
        "ec2:DescribeInstances"
      ],
      "Resource": "arn:aws:ec2:$REGION:*:instance/$INSTANCE_ID"
    },
    {
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "$SNS_TOPIC_ARN"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name "kandes-lambda-ec2-stop-start" \
  --policy-name "EC2StopStartPolicy" \
  --policy-document file:///tmp/lambda-inline-policy.json

rm -f /tmp/lambda-trust-policy.json /tmp/lambda-inline-policy.json

# ----------------------------------------------------------------------------
# Create Lambda function
# ----------------------------------------------------------------------------
echo "==> Creating Lambda function: $LAMBDA_NAME..."

cat > /tmp/lambda-function.py <<'EOF'
import json
import os
import boto3

ec2 = boto3.client('ec2', region_name=os.environ['AWS_REGION'])
sns = boto3.client('sns', region_name=os.environ['AWS_REGION'])

INSTANCE_ID = os.environ['INSTANCE_ID']
TOPIC_ARN = os.environ['SNS_TOPIC_ARN']

def handler(event, context):
    """Triggered by EventBridge. Action = 'stop' or 'start' from event."""
    action = event.get('action', 'unknown')
    if action not in ('stop', 'start'):
        return {
            'statusCode': 400,
            'body': json.dumps(f'Invalid action: {action}')
        }

    print(f"Action requested: {action} on instance {INSTANCE_ID}")

    try:
        if action == 'stop':
            response = ec2.stop_instances(InstanceIds=[INSTANCE_ID])
            current_state = response['StoppingInstances'][0]['CurrentState']['Name']
            message = f"EC2 instance {INSTANCE_ID} STOPPED at scheduled time. Cost saving active."
        else:
            response = ec2.start_instances(InstanceIds=[INSTANCE_ID])
            current_state = response['StartingInstances'][0]['CurrentState']['Name']
            message = f"EC2 instance {INSTANCE_ID} STARTED at scheduled time. Serving traffic."

        print(f"Current state: {current_state}")

        # Send SNS notification
        try:
            sns.publish(
                TopicArn=TOPIC_ARN,
                Subject=f"Kandes EC2 {action.upper()}: {INSTANCE_ID}",
                Message=message
            )
        except Exception as e:
            print(f"Failed to publish SNS: {e}")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'action': action,
                'instance': INSTANCE_ID,
                'state': current_state
            })
        }
    except Exception as e:
        error_msg = f"Failed to {action} instance {INSTANCE_ID}: {str(e)}"
        print(error_msg)
        try:
            sns.publish(
                TopicArn=TOPIC_ARN,
                Subject=f"Kandes EC2 {action.upper()} FAILED",
                Message=error_msg
            )
        except Exception:
            pass
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
EOF

# Zip the function
cd /tmp && zip lambda-function.zip lambda-function.py > /dev/null

# Create or update Lambda
LAMBDA_ARN=$(aws lambda create-function \
  --function-name "$LAMBDA_NAME" \
  --runtime "python3.12" \
  --role "$ROLE_ARN" \
  --handler "lambda-function.handler" \
  --zip-file "fileb:///tmp/lambda-function.zip" \
  --timeout 60 \
  --memory-size 128 \
  --environment "Variables={INSTANCE_ID=$INSTANCE_ID,SNS_TOPIC_ARN=$SNS_TOPIC_ARN}" \
  --region "$REGION" \
  --query 'FunctionArn' --output text 2>/dev/null) || \
LAMBDA_ARN=$(aws lambda update-function-code \
  --function-name "$LAMBDA_NAME" \
  --zip-file "fileb:///tmp/lambda-function.zip" \
  --region "$REGION" \
  --query 'FunctionArn' --output text)

rm -f /tmp/lambda-function.py /tmp/lambda-function.zip

echo "    Lambda ARN: $LAMBDA_ARN"

# ----------------------------------------------------------------------------
# Create EventBridge rules
# ----------------------------------------------------------------------------
echo "==> Creating EventBridge rules..."

# Stop rule
aws events put-rule \
  --name "$RULE_NAME_STOP" \
  --schedule-expression "$CRON_STOP" \
  --region "$REGION" \
  --description "Stop Kandes EC2 at 23:00 Vietnam time" \
  > /dev/null

# Start rule
aws events put-rule \
  --name "$RULE_NAME_START" \
  --schedule-expression "$CRON_START" \
  --region "$REGION" \
  --description "Start Kandes EC2 at 07:00 Vietnam time" \
  > /dev/null

# Add Lambda targets
aws events put-targets \
  --rule "$RULE_NAME_STOP" \
  --targets "Id=1,Arn=$LAMBDA_ARN,Input={\"action\":\"stop\"}" \
  --region "$REGION" \
  > /dev/null

aws events put-targets \
  --rule "$RULE_NAME_START" \
  --targets "Id=1,Arn=$LAMBDA_ARN,Input={\"action\":\"start\"}" \
  --region "$REGION" \
  > /dev/null

# Grant EventBridge permission to invoke Lambda
aws lambda add-permission \
  --function-name "$LAMBDA_NAME" \
  --statement-id "AllowEventBridgeInvokeStop" \
  --action "lambda:InvokeFunction" \
  --principal "events.amazonaws.com" \
  --source-arn "arn:aws:events:$REGION:$(aws sts get-caller-identity --query Account --output text):rule/$RULE_NAME_STOP" \
  --region "$REGION" \
  > /dev/null 2>&1 || true

aws lambda add-permission \
  --function-name "$LAMBDA_NAME" \
  --statement-id "AllowEventBridgeInvokeStart" \
  --action "lambda:InvokeFunction" \
  --principal "events.amazonaws.com" \
  --source-arn "arn:aws:events:$REGION:$(aws sts get-caller-identity --query Account --output text):rule/$RULE_NAME_START" \
  --region "$REGION" \
  > /dev/null 2>&1 || true

echo ""
echo "==> Auto-stop/start schedule configured!"
echo ""
echo "  Schedule:"
echo "    STOP:  23:00 Vietnam (cron: $CRON_STOP)"
echo "    START: 07:00 Vietnam (cron: $CRON_START)"
echo ""
echo "  Resources created:"
echo "    IAM Role: kandes-lambda-ec2-stop-start"
echo "    Lambda: $LAMBDA_NAME"
echo "    EventBridge Rules: $RULE_NAME_STOP, $RULE_NAME_START"
echo ""
echo "  Test (manual trigger):"
echo "    aws lambda invoke --function-name $LAMBDA_NAME \\"
echo "      --payload '{\"action\":\"stop\"}' --region $REGION"
echo ""
echo "  Disable (if needed):"
echo "    aws events disable-rule --name $RULE_NAME_STOP --region $REGION"
echo "    aws events disable-rule --name $RULE_NAME_START --region $REGION"
echo ""
