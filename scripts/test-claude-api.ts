import https from 'https'

const apiKey = 'sk-jy-cx-c5378b652c686513c432838a76b5c9a7'

async function testModel(modelName: string) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: modelName,
      max_tokens: 30,
      messages: [{ role: 'user', content: 'Say PONG in 1 word' }],
    })

    const options = {
      hostname: 'api.kandes.shop',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(data),
      },
    }

    console.log(`\n🧪 Testing model: "${modelName}"...`)
    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('end', () => {
        console.log(`HTTP Status: ${res.statusCode}`)
        console.log(`Response: ${body.slice(0, 300)}`)
        resolve(res.statusCode)
      })
    })

    req.on('error', (err) => {
      console.error('Req error:', err.message)
      resolve(500)
    })
    req.write(data)
    req.end()
  })
}

async function main() {
  await testModel('claude-3-5-sonnet-20241022')
  await testModel('claude-sonnet-4-6')
  await testModel('claude-sonnet-5')
  await testModel('kandes-claude')
}

main().catch(console.error)
