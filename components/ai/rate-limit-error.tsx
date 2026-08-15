'use client'

import * as React from 'react'

type ErrorType = 'rate_limit' | 'quota_exceeded' | 'api_error' | 'network_error' | 'auth_error'

type ErrorConfig = {
  title: string
  icon: string
  message: string
  suggestion: string
  variant: 'warning' | 'error' | 'info'
}

const ERROR_CONFIGS: Record<ErrorType, ErrorConfig> = {
  rate_limit: {
    title: 'Rate Limit Exceeded',
    icon: '⚡',
    message: 'You have sent too many requests in a short period.',
    suggestion: 'Please wait a moment before trying again, or consider upgrading your plan for higher limits.',
    variant: 'warning',
  },
  quota_exceeded: {
    title: 'Quota Exceeded',
    icon: '📊',
    message: 'You have reached your monthly usage limit.',
    suggestion: 'Upgrade your plan or wait until your quota resets next month.',
    variant: 'warning',
  },
  api_error: {
    title: 'API Error',
    icon: '🔧',
    message: 'Something went wrong with your request.',
    suggestion: 'Please check your request format and try again. If the problem persists, contact support.',
    variant: 'error',
  },
  network_error: {
    title: 'Network Error',
    icon: '🌐',
    message: 'Unable to connect to the server.',
    suggestion: 'Please check your internet connection and try again.',
    variant: 'error',
  },
  auth_error: {
    title: 'Authentication Error',
    icon: '🔑',
    message: 'Invalid API key or token.',
    suggestion: 'Please check your API key and make sure it is still active.',
    variant: 'error',
  },
}

type ApiErrorResponse = {
  error?: {
    code?: string
    message?: string
    type?: string
  }
}

type RateLimitErrorProps = {
  error: Error | ApiErrorResponse
  onRetry?: () => void
  showDetails?: boolean
}

export function RateLimitError({ error, onRetry, showDetails = false }: RateLimitErrorProps) {
  const [showFullDetails, setShowFullDetails] = React.useState(showDetails)
  
  // Determine error type from error response
  const errorType = React.useMemo((): ErrorType => {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const err = (error as ApiErrorResponse).error
      if (err?.code === 'rate_limit_exceeded' || err?.type === 'rate_limit') {
        return 'rate_limit'
      }
      if (err?.code === 'quota_exceeded' || err?.type === 'quota') {
        return 'quota_exceeded'
      }
      if (err?.code === 'invalid_api_key' || err?.type === 'auth_error') {
        return 'auth_error'
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
    if (errorMessage.toLowerCase().includes('rate limit')) return 'rate_limit'
    if (errorMessage.toLowerCase().includes('quota')) return 'quota_exceeded'
    if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
      return 'network_error'
    }
    if (errorMessage.toLowerCase().includes('auth') || errorMessage.toLowerCase().includes('token')) {
      return 'auth_error'
    }
    return 'api_error'
  }, [error])

  const config = ERROR_CONFIGS[errorType]

  const variantStyles = {
    warning: 'border-amber-200 bg-amber-50',
    error: 'border-red-200 bg-red-50',
    info: 'border-blue-200 bg-blue-50',
  }

  const iconStyles = {
    warning: 'text-amber-600',
    error: 'text-red-600',
    info: 'text-blue-600',
  }

  return (
    <div className={`rounded-lg border p-4 ${variantStyles[config.variant]}`}>
      <div className="flex gap-3">
        <span className={`text-2xl ${iconStyles[config.variant]}`}>{config.icon}</span>
        <div className="flex-1">
          <h3 className={`font-semibold ${config.variant === 'warning' ? 'text-amber-900' : config.variant === 'error' ? 'text-red-900' : 'text-blue-900'}`}>
            {config.title}
          </h3>
          <p className={`mt-1 text-sm ${config.variant === 'warning' ? 'text-amber-800' : config.variant === 'error' ? 'text-red-800' : 'text-blue-800'}`}>
            {config.message}
          </p>
          <p className={`mt-2 text-sm ${config.variant === 'warning' ? 'text-amber-700' : config.variant === 'error' ? 'text-red-700' : 'text-blue-700'}`}>
            💡 {config.suggestion}
          </p>

          {/* Error Details */}
          {typeof error === 'object' && error !== null && (
            <button
              onClick={() => setShowFullDetails(!showFullDetails)}
              className={`mt-2 text-xs ${config.variant === 'warning' ? 'text-amber-600' : config.variant === 'error' ? 'text-red-600' : 'text-blue-600'} hover:underline`}
            >
              {showFullDetails ? 'Hide details' : 'Show details'}
            </button>
          )}

          {showFullDetails && typeof error === 'object' && error !== null && (
            <div className="mt-2 rounded bg-white/50 p-2 font-mono text-xs">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(error, null, 2)}
              </pre>
            </div>
          )}

          {/* Actions */}
          {onRetry && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={onRetry}
                className={`rounded px-3 py-1.5 text-sm font-medium ${
                  config.variant === 'warning'
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : config.variant === 'error'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Try Again
              </button>
              <a
                href="/account/api-keys"
                className={`rounded border px-3 py-1.5 text-sm ${
                  config.variant === 'warning'
                    ? 'border-amber-300 text-amber-700 hover:bg-amber-100'
                    : config.variant === 'error'
                    ? 'border-red-300 text-red-700 hover:bg-red-100'
                    : 'border-blue-300 text-blue-700 hover:bg-blue-100'
                }`}
              >
                View API Keys
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Hook for handling API errors
export function useApiError() {
  const [error, setError] = React.useState<Error | ApiErrorResponse | null>(null)
  const [isRetrying, setIsRetrying] = React.useState(false)

  function handleError(err: Error | ApiErrorResponse) {
    setError(err)
  }

  function clearError() {
    setError(null)
  }

  async function retryWithDelay(fn: () => Promise<void>, delayMs = 1000) {
    setIsRetrying(true)
    try {
      await fn()
      clearError()
    } catch (e) {
      handleError(e as Error)
    } finally {
      setIsRetrying(false)
    }
  }

  return {
    error,
    isRetrying,
    handleError,
    clearError,
    retryWithDelay,
  }
}
