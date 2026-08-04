import { logger } from '@/lib/logger'
import type { AiProviderName, CircuitState } from './types'

/**
 * Circuit breaker — Phase 6 P6-06.
 *
 * Phase 6 chỉ có 1 provider (ccpro) → failover stub. Logic đầy đủ để Phase 7+
 * thêm provider thứ 2 có target failover thật.
 *
 * State machine per provider:
 *   closed → (5 failures trong 60s) → open
 *   open   → (sau 60s) → half-open (thử 1 request)
 *   half-open → success → closed
 *   half-open → fail → open
 *
 * Khi open: caller vẫn gọi provider (fail anyway) + log warn. Phase 7+ skip provider.
 */

const FAILURE_THRESHOLD = 5
const FAILURE_WINDOW_MS = 60_000
const OPEN_COOLDOWN_MS = 60_000

type ProviderState = {
  state: CircuitState
  failures: number
  firstFailureAt: number
  openedAt: number
}

const states = new Map<AiProviderName, ProviderState>()

function getState(provider: AiProviderName): ProviderState {
  let s = states.get(provider)
  if (!s) {
    s = { state: 'closed', failures: 0, firstFailureAt: 0, openedAt: 0 }
    states.set(provider, s)
  }
  return s
}

export function getCircuitState(provider: AiProviderName): CircuitState {
  const s = getState(provider)
  const now = Date.now()

  // Auto-transition open → half-open sau cooldown.
  if (s.state === 'open' && now - s.openedAt >= OPEN_COOLDOWN_MS) {
    s.state = 'half-open'
    logger.info({ provider }, 'circuit-breaker: open → half-open')
  }
  return s.state
}

/** Record successful request → reset circuit. */
export function recordSuccess(provider: AiProviderName): void {
  const s = getState(provider)
  if (s.state !== 'closed') {
    logger.info({ provider, prevState: s.state }, 'circuit-breaker: success → closed')
  }
  s.state = 'closed'
  s.failures = 0
  s.firstFailureAt = 0
}

/** Record failed request → maybe open. */
export function recordFailure(provider: AiProviderName, err: Error): void {
  const s = getState(provider)
  const now = Date.now()

  // Reset window nếu qua window.
  if (now - s.firstFailureAt > FAILURE_WINDOW_MS) {
    s.failures = 0
    s.firstFailureAt = now
  }
  s.failures += 1

  if (s.state === 'half-open') {
    s.state = 'open'
    s.openedAt = now
    logger.warn({ provider, err: err.message }, 'circuit-breaker: half-open → open')
    return
  }

  if (s.state === 'closed' && s.failures >= FAILURE_THRESHOLD) {
    s.state = 'open'
    s.openedAt = now
    logger.warn(
      { provider, failures: s.failures, err: err.message },
      'circuit-breaker: closed → open'
    )
  }
}

/** Test-only: reset all state. */
export function _resetCircuitForTest(): void {
  states.clear()
}