import json

# Read existing config
import subprocess
result = subprocess.run(['aws', 'cloudfront', 'get-distribution-config', '--id', 'E1Q8DEYAXGY3N9', '--output', 'json'], capture_output=True, text=True)
data = json.loads(result.stdout)

# Get ETag from response
import subprocess as sp
res = sp.run(['aws', 'cloudfront', 'get-distribution-config', '--id', 'E1Q8DEYAXGY3N9'], capture_output=True, text=True)
raw = json.loads(res.stdout)
print("ETag:", raw.get('ETag'))