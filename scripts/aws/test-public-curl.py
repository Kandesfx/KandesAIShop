#!/usr/bin/env python3
import subprocess
import json

result = subprocess.run([
    'curl', '-s', '-X', 'POST',
    'https://api.kandes.shop/v1/chat/completions',
    '-H', 'Content-Type: application/json',
    '-H', 'Authorization: Bearer sk-jy-cx-c5378b652c686513c432838a76b5c9a7',
    '-d', json.dumps({
        'model': 'gpt-5.4',
        'messages': [{'role': 'user', 'content': 'Hello'}],
        'max_tokens': 10
    }),
    '--max-time', '60'
], capture_output=True, text=True, timeout=70)

print(f"Exit code: {result.returncode}")
print(f"Stdout: {result.stdout[:500]}")
if result.stderr:
    print(f"Stderr: {result.stderr[:200]}")
