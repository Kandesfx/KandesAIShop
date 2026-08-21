import subprocess
import json
import time

sh_script = """
docker restart kandes-app
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
print(f"Restarting app container... (Command ID: {command_id})")

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
            print(f"Status: {status}")
            break
