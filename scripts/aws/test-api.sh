#!/bin/bash
# Test API chat completions
curl -s -X POST "http://kandes-app:3000/api/ai/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-jy-cx-c5378b652c686513c432838a76b5c9a7" \
  -d '{
    "model": "gpt-5.4",
    "messages": [
      {
        "role": "user",
        "content": "Hello"
      }
    ],
    "max_tokens": 10
  }'
