import { describe, it, expect } from 'vitest'
import { parseStreamUsage } from './stream'

describe('parseStreamUsage', () => {
  it('parses usage từ OpenAI-compatible chunk cuối', () => {
    const block =
      'event: message\n' +
      'data: {"id":"x","choices":[],"usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30}}\n\n'
    const result = parseStreamUsage(block)
    expect(result).toEqual({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    })
  })

  it('returns null khi không có usage field', () => {
    const block = 'data: {"id":"x","choices":[{"index":0,"delta":{"content":"hi"}}]}\n\n'
    expect(parseStreamUsage(block)).toBeNull()
  })

  it('skips DONE chunk', () => {
    const block = 'data: [DONE]\n\n'
    expect(parseStreamUsage(block)).toBeNull()
  })

  it('handles malformed JSON gracefully', () => {
    const block = 'data: {not-json}\n\n'
    expect(parseStreamUsage(block)).toBeNull()
  })

  it('total_tokens derives từ prompt + completion nếu missing', () => {
    const block = 'data: {"usage":{"prompt_tokens":7,"completion_tokens":13}}\n\n'
    const result = parseStreamUsage(block)
    expect(result?.totalTokens).toBe(20)
  })

  it('parses Codex Responses API nested usage', () => {
    const block =
      'event: response.completed\n' +
      'data: {"type":"response.completed","response":{"id":"r1","usage":{"input_tokens":100,"output_tokens":50,"total_tokens":150}}}\n\n'
    const result = parseStreamUsage(block)
    expect(result).toEqual({ promptTokens: 100, completionTokens: 50, totalTokens: 150 })
  })

  it('maps input_tokens to promptTokens, output_tokens to completionTokens', () => {
    const block = 'data: {"usage":{"input_tokens":5,"output_tokens":9}}\n\n'
    const result = parseStreamUsage(block)
    expect(result).toEqual({ promptTokens: 5, completionTokens: 9, totalTokens: 14 })
  })

  it('handles multi-line JSON (Responses API full format)', () => {
    const block =
      'event: response.completed\n' +
      'data: {"type":"response.completed","response":{"status":"completed","model":"gpt-5.4","usage":{"input_tokens":4392,"output_tokens":9,"total_tokens":4401}}}\n\n'
    const result = parseStreamUsage(block)
    expect(result).toEqual({ promptTokens: 4392, completionTokens: 9, totalTokens: 4401 })
  })
})