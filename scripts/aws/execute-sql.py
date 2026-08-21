import subprocess
import json
import base64
import time

with open("scripts/sync-products.sql", "rb") as f:
    b64 = base64.b64encode(f.read()).decode("utf-8")

sh_script = f"""
echo "{b64}" | base64 -d > /tmp/sync.sql

# 1. Try with psql if available using DATABASE_URL from .env
if [ -f /opt/kandes/.env ]; then
  export $(grep -v '^#' /opt/kandes/.env | grep 'DATABASE_URL' | xargs)
fi

if [ -n "$DATABASE_URL" ]; then
  # Use python3 inside container or on host with postgres client
  docker run --rm --network host -v /tmp/sync.sql:/tmp/sync.sql postgres:16-alpine psql "$DATABASE_URL" -f /tmp/sync.sql
else
  echo "DATABASE_URL not found"
fi
"""

payload = {
    "DocumentName": "AWS-RunShellScript",
    "InstanceIds": ["i-0a6fca834c9429bca"],
    "Parameters": {
        "commands": [sh_script]
    }
}

with open("scripts/aws/temp-cmd.json", "w") as f:
    json.dump(payload, f)

res = subprocess.run([
    "aws", "ssm", "send-command",
    "--cli-input-json", "file://scripts/aws/temp-cmd.json",
    "--region", "ap-southeast-1",
    "--output", "json"
], capture_output=True, text=True)

if res.returncode != 0:
    print("Error:", res.stderr)
    exit(1)

command_id = json.loads(res.stdout)["Command"]["CommandId"]
print(f"SSM command sent! ID: {command_id}")

for _ in range(25):
    time.sleep(2)
    inv = subprocess.run([
        "aws", "ssm", "get-command-invocation",
        "--command-id", command_id,
        "--instance-id", "i-0a6fca834c9429bca",
        "--region", "ap-southeast-1",
        "--output", "json"
    ], capture_output=True, text=True)
    
    if inv.returncode == 0:
        inv_data = json.loads(inv.stdout)
        status = inv_data["Status"]
        if status in ["Success", "Failed", "TimedOut", "Cancelled"]:
            print(f"Finished with status: {status} (Code: {inv_data.get('ResponseCode')})")
            stdout_text = inv_data.get("StandardOutputContent", "")
            stderr_text = inv_data.get("StandardErrorContent", "")
            print("--- STDOUT ---")
            print(stdout_text.encode('ascii', errors='replace').decode('ascii'))
            if stderr_text:
                print("--- STDERR ---")
                print(stderr_text.encode('ascii', errors='replace').decode('ascii'))
            break
        else:
            print(f"Status: {status}...")
