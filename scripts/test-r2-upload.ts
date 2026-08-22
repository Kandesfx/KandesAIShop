import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

const accountId = '796b5d2473febd50c38a8539d6e7b520'
const accessKeyId = '8d281dee0452ff2fb725b97b7e54041c'
const secretAccessKey = 'ff85a3b86eaabffdde9593d77cd9992a5e431fe5052988ba69081072cb2ddd53'
const bucket = 'kandes-assets'

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
})

async function run() {
  console.log('Testing R2 connection to bucket:', bucket)
  try {
    const listRes = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 5 }))
    console.log('ListObjects OK, found items count:', listRes.KeyCount)
    console.log('Items:', listRes.Contents?.map(c => c.Key))

    // Try put object
    const testKey = `test/test-${Date.now()}.txt`
    console.log('Putting object to:', testKey)
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: Buffer.from('Hello R2 from Kandes Test'),
      ContentType: 'text/plain',
    }))
    console.log('PutObject OK! Upload succeeded to R2!')
  } catch (err) {
    console.error('R2 Test Error:', err)
  }
}

run()
