import subprocess
import json
import sys
import time

def run_remote_commands(commands, instance_id="i-0a6fca834c9429bca", region="ap-southeast-1"):
    payload = {
        "DocumentName": "AWS-RunShellScript",
        "InstanceIds": [instance_id],
        "Parameters": {
            "commands": commands
        }
    }
    
    with open("scripts/aws/temp-cmd.json", "w") as f:
        json.dump(payload, f)
        
    res = subprocess.run([
        "aws", "ssm", "send-command",
        "--cli-input-json", "file://scripts/aws/temp-cmd.json",
        "--region", region,
        "--output", "json"
    ], capture_output=True, text=True)
    
    if res.returncode != 0:
        print("Error sending command:", res.stderr)
        return
        
    data = json.loads(res.stdout)
    command_id = data["Command"]["CommandId"]
    print(f"Command sent! ID: {command_id}. Waiting for completion...")
    
    for _ in range(30):
        time.sleep(2)
        inv = subprocess.run([
            "aws", "ssm", "get-command-invocation",
            "--command-id", command_id,
            "--instance-id", instance_id,
            "--region", region,
            "--output", "json"
        ], capture_output=True, text=True)
        
        if inv.returncode == 0:
            inv_data = json.loads(inv.stdout)
            status = inv_data["Status"]
            if status in ["Success", "Failed", "TimedOut", "Cancelled"]:
                print(f"\nStatus: {status} (Exit code: {inv_data.get('ResponseCode')})")
                print("--- STDOUT ---")
                print(inv_data.get("StandardOutputContent", ""))
                print("--- STDERR ---")
                print(inv_data.get("StandardErrorContent", ""))
                return
            else:
                print(f"Status: {status}...")

if __name__ == "__main__":
    cmds = sys.argv[1:] if len(sys.argv) > 1 else [
        "ls -la /var/www /home /opt 2>/dev/null",
        "ps aux | grep node"
    ]
    run_remote_commands(cmds)
