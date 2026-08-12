const http = require('http');

const data = JSON.stringify({
  model: 'gpt-5.4',
  messages: [{ role: 'user', content: 'Hello' }],
  max_tokens: 10
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/ai/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-jy-cx-c5378b652c686513c432838a76b5c9a7',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('Testing API with passthrough NCC key...');
console.log('Request body:', data);

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(data);
req.end();
