// @ts-nocheck — Test script uses intentionally-loose assertions for compactness.
// Run with: npx tsx scripts/test-anthropic-adapter.ts

// Stub env vars so lib/env.ts doesn't fail validation when it gets imported
// transitively via the adapter module (adapter imports logger → env).
;(process.env as Record<string, string>).DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
;(process.env as Record<string, string>).APP_URL = 'http://localhost:3000'
;(process.env as Record<string, string>).NODE_ENV = 'test'

import {
  anthropicToOpenAI,
  openAIToAnthropic,
  openAIErrorToAnthropic,
  AnthropicAdapterError,
} from '../modules/ai-gateway/anthropic-adapter'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  [OK]   ${name}`)
    passed++
  } catch (err) {
    console.log(`  [FAIL] ${name}: ${(err as Error).message}`)
    failed++
  }
}

function assertEq(actual: unknown, expected: unknown, label = '') {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) throw new Error(`${label}\n    expected: ${e}\n    actual:   ${a}`)
}

// === Test: anthropicToOpenAI ===

console.log('\n--- anthropicToOpenAI ---')

test('basic user text message', () => {
  const out = anthropicToOpenAI({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: 'Hello' }],
  })
  assertEq(out.model, 'claude-sonnet-4-6')
  assertEq(out.messages, [{ role: 'user', content: 'Hello' }])
  assertEq(out.max_tokens, 1024)
})

test('system as string', () => {
  const out = anthropicToOpenAI({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    system: 'You are a helpful assistant.',
    messages: [{ role: 'user', content: 'Hi' }],
  })
  assertEq(out.messages[0], { role: 'system', content: 'You are a helpful assistant.' })
  assertEq(out.messages[1], { role: 'user', content: 'Hi' })
})

test('system as array of text blocks', () => {
  const out = anthropicToOpenAI({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    system: [
      { type: 'text', text: 'Be concise.' },
      { type: 'text', text: 'Use Vietnamese.' },
    ],
    messages: [{ role: 'user', content: 'Xin chào' }],
  })
  assertEq(out.messages[0], {
    role: 'system',
    content: 'Be concise.\n\nUse Vietnamese.',
  })
})

test('user multi-modal: text + image', () => {
  const out = anthropicToOpenAI({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is in this image?' },
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: 'abc123' },
          },
        ],
      },
    ],
  })
  assertEq(out.messages[0].role, 'user')
  const content = out.messages[0].content as Array<Record<string, unknown>>
  assertEq(content[0], { type: 'text', text: 'What is in this image?' })
  assertEq(content[1], {
    type: 'image_url',
    image_url: { url: 'data:image/png;base64,abc123' },
  })
})

test('image with URL source', () => {
  const out = anthropicToOpenAI({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: 'https://example.com/img.png' } },
        ],
      },
    ],
  })
  const content = out.messages[0].content as Array<Record<string, unknown>>
  assertEq(content[0], {
    type: 'image_url',
    image_url: { url: 'https://example.com/img.png' },
  })
})

test('tool_use in assistant + tool_result in user', () => {
  const out = anthropicToOpenAI({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [
      { role: 'user', content: 'What is the weather in Hanoi?' },
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'toolu_01',
            name: 'get_weather',
            input: { city: 'Hanoi' },
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'toolu_01',
            content: 'Sunny, 28°C',
          },
        ],
      },
    ],
    tools: [
      {
        name: 'get_weather',
        description: 'Get current weather',
        input_schema: {
          type: 'object',
          properties: { city: { type: 'string' } },
          required: ['city'],
        },
      },
    ],
  })

  // Expected: user, assistant (with tool_calls), tool
  assertEq(out.messages.length, 3)
  assertEq(out.messages[0].role, 'user')
  assertEq(out.messages[1].role, 'assistant')
  assertEq(out.messages[2].role, 'tool')

  const asst = out.messages[1] as {
    role: string
    content: string | null
    tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>
  }
  assertEq(asst.content, null)
  assertEq(asst.tool_calls?.length, 1)
  assertEq(asst.tool_calls?.[0].id, 'toolu_01')
  assertEq(asst.tool_calls?.[0].function.name, 'get_weather')
  assertEq(JSON.parse(asst.tool_calls![0]!.function.arguments), { city: 'Hanoi' })

  const tool = out.messages[2] as { role: string; tool_call_id: string; content: string }
  assertEq(tool.tool_call_id, 'toolu_01')
  assertEq(tool.content, 'Sunny, 28°C')

  // Tools mapping
  assertEq(out.tools?.[0], {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather',
      parameters: {
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city'],
      },
    },
  })
})

test('tool_choice auto → "auto"', () => {
  const out = anthropicToOpenAI({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [{ role: 'user', content: 'Hi' }],
    tool_choice: { type: 'auto' },
  })
  assertEq(out.tool_choice, 'auto')
})

test('tool_choice any → "required"', () => {
  const out = anthropicToOpenAI({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [{ role: 'user', content: 'Hi' }],
    tool_choice: { type: 'any' },
  })
  assertEq(out.tool_choice, 'required')
})

test('tool_choice tool:foo → named function', () => {
  const out = anthropicToOpenAI({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [{ role: 'user', content: 'Hi' }],
    tool_choice: { type: 'tool', name: 'foo' },
  })
  assertEq(out.tool_choice, { type: 'function', function: { name: 'foo' } })
})

test('stop_sequences → stop', () => {
  const out = anthropicToOpenAI({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [{ role: 'user', content: 'Hi' }],
    stop_sequences: ['END', 'STOP'],
  })
  assertEq(out.stop, ['END', 'STOP'])
})

// === Test: openAIToAnthropic ===

console.log('\n--- openAIToAnthropic ---')

test('basic text response', () => {
  const out = openAIToAnthropic(
    {
      id: 'chatcmpl-123',
      choices: [
        {
          finish_reason: 'stop',
          message: { role: 'assistant', content: 'Hello there!' },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
    },
    'claude-sonnet-4-6'
  )
  assertEq(out.type, 'message')
  assertEq(out.role, 'assistant')
  assertEq(out.content, [{ type: 'text', text: 'Hello there!' }])
  assertEq(out.stop_reason, 'end_turn')
  assertEq(out.usage, { input_tokens: 10, output_tokens: 4 })
})

test('tool_calls response → tool_use blocks + stop_reason=tool_use', () => {
  const out = openAIToAnthropic(
    {
      id: 'chatcmpl-456',
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_xyz',
                type: 'function',
                function: {
                  name: 'get_weather',
                  arguments: '{"city":"Hanoi"}',
                },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    },
    'claude-sonnet-4-6'
  )
  assertEq(out.content[0], {
    type: 'tool_use',
    id: 'call_xyz',
    name: 'get_weather',
    input: { city: 'Hanoi' },
  })
  assertEq(out.stop_reason, 'tool_use')
})

test('finish_reason=length → stop_reason=max_tokens', () => {
  const out = openAIToAnthropic(
    {
      id: 'x',
      choices: [{ finish_reason: 'length', message: { role: 'assistant', content: 'partial' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    },
    'm'
  )
  assertEq(out.stop_reason, 'max_tokens')
})

test('empty content → empty text block', () => {
  const out = openAIToAnthropic(
    {
      id: 'x',
      choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: '' } }],
      usage: { prompt_tokens: 1, completion_tokens: 0, total_tokens: 1 },
    },
    'm'
  )
  assertEq(out.content, [{ type: 'text', text: '' }])
})

// === Test: openAIErrorToAnthropic ===

console.log('\n--- openAIErrorToAnthropic ---')

test('401 → authentication_error', () => {
  const { type } = openAIErrorToAnthropic(401, null)
  assertEq(type, 'authentication_error')
})

test('429 → rate_limit_error', () => {
  const { type } = openAIErrorToAnthropic(429, null)
  assertEq(type, 'rate_limit_error')
})

test('400 → invalid_request_error', () => {
  const { type } = openAIErrorToAnthropic(400, null)
  assertEq(type, 'invalid_request_error')
})

test('string error body → message extracted', () => {
  const { message } = openAIErrorToAnthropic(500, 'Internal Server Error')
  assertEq(message, 'Internal Server Error')
})

test('object error body with type → type inferred', () => {
  const { type, message } = openAIErrorToAnthropic(401, {
    error: { type: 'invalid_api_key', message: 'Bad key' },
  })
  assertEq(message, 'Bad key')
  // "invalid_api_key" includes "invalid" → invalid_request_error
  assertEq(type, 'invalid_request_error')
})

// === Test: AnthropicAdapterError ===

console.log('\n--- AnthropicAdapterError ---')

test('default status 400, type invalid_request_error', () => {
  const e = new AnthropicAdapterError('bad')
  assertEq(e.status, 400)
  assertEq(e.type, 'invalid_request_error')
  assertEq(e.message, 'bad')
})

test('custom status + type', () => {
  const e = new AnthropicAdapterError('nope', 'authentication_error', 401)
  assertEq(e.status, 401)
  assertEq(e.type, 'authentication_error')
})

// === Summary ===

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`)
if (failed > 0) process.exit(1)
