import subprocess
import json
import base64
import time

sh_script = """
if [ -f /opt/kandes/.env ]; then
  export $(grep -v '^#' /opt/kandes/.env | grep 'DATABASE_URL' | xargs)
fi

docker run --rm --network host postgres:16-alpine psql "$DATABASE_URL" -c "SELECT id, name, slug, sku, is_published, is_featured, price_cents, sale_price_cents FROM products;"
docker run --rm --network host postgres:16-alpine psql "$DATABASE_URL" -c "SELECT count(*) FROM product_variants;"
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

command_id = json.loads(res.stdout)["Command"]["CommandId"]

for _ in range(15):
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
            print(inv_data.get("StandardOutputContent", ""))
            print(inv_data.get("StandardErrorContent", ""))
            break
