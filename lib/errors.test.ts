import { describe, it, expect } from 'vitest'
import { AppError, NotFoundError, ValidationError, ConflictError } from '@/lib/errors'

describe('Custom Error Classes', () => {
  it('NotFoundError có code + statusCode đúng', () => {
    const err = new NotFoundError('User not found')
    expect(err.code).toBe('NOT_FOUND')
    expect(err.statusCode).toBe(404)
    expect(err.message).toBe('User not found')
    expect(err).toBeInstanceOf(AppError)
    expect(err).toBeInstanceOf(Error)
  })

  it('ValidationError có fields', () => {
    const err = new ValidationError('Bad input', [
      { field: 'email', message: 'Required' },
    ])
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.statusCode).toBe(422)
    expect(err.fields).toEqual([{ field: 'email', message: 'Required' }])
    const json = err.toJSON()
    expect(json).toHaveProperty('code')
    expect(json).toHaveProperty('fields')
  })

  it('ConflictError không có fields thì toJSON không chứa field key', () => {
    const err = new ConflictError('Dup')
    const json = err.toJSON()
    expect(json).toEqual({ code: 'CONFLICT', message: 'Dup' })
    expect(json).not.toHaveProperty('fields')
  })
})
