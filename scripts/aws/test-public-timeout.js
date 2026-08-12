const https = require('https');

const data = JSON.stringify({
  model: 'gpt-5.4',
  messages: [{ role: 'user', content: 'Hello' }],
  max_tokens: 10
});

const options = {
  hostname: 'api.kandes.shop',
  port: 443,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-jy-cx-c5378b652c686513c432838a76b5c9a7',
    'Content-Length': Buffer.byteLength(data)
  },
  timeout: 60000
};

console.log('Testing public API at https://api.kandes.shop...');
console.log('Request body:', data);

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body.substring(0, 500));
    process.exit(0);
  });
});

req.on('timeout', () => {
  console.log('Request timeout!');
  req.destroy();
  process.exit(1);
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

req.write(data);
req.end();
