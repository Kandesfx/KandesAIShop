'use client'

import * as React from 'react'
import Link from 'next/link'

type OnboardingStep = {
  id: number
  title: string
  description: string
  icon: string
  cta?: string
  ctaHref?: string
}

const STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: 'Get Your API Key',
    description: 'Your API key has been created. Copy it from the API Keys page.',
    icon: '🔑',
    cta: 'Go to API Keys',
    ctaHref: '/account/api-keys',
  },
  {
    id: 2,
    title: 'Choose a Model',
    description: 'Kandes supports Claude Sonnet, Opus, GPT-5.4 and more. Check pricing for details.',
    icon: '🤖',
    cta: 'View Pricing',
    ctaHref: '/account/api-keys/pricing',
  },
  {
    id: 3,
    title: 'Test with Playground',
    description: 'Try the API Playground to test your requests before integrating.',
    icon: '🧪',
    cta: 'Open Playground',
    ctaHref: '/playground',
  },
  {
    id: 4,
    title: 'Monitor Usage',
    description: 'Track your usage and costs in real-time from your dashboard.',
    icon: '📊',
    cta: 'View Usage',
    ctaHref: '/account/api-keys',
  },
]

type OnboardingFlowProps = {
  isOpen: boolean
  onClose: () => void
  completedSteps?: number[]
}

export function OnboardingFlow({ isOpen, onClose, completedSteps = [] }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = React.useState(0)
  const [isCompleted, setIsCompleted] = React.useState(false)

  if (!isOpen) return null

  const step = STEPS[currentStep]
  if (!step) return null
  const isLastStep = currentStep === STEPS.length - 1
  const progress = ((currentStep + 1) / STEPS.length) * 100

  function handleNext() {
    if (isLastStep) {
      setIsCompleted(true)
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  function handleSkip() {
    onClose()
  }

  if (isCompleted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
          <div className="text-center">
            <div className="mb-4 text-6xl">🎉</div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">You&apos;re All Set!</h2>
            <p className="mb-6 text-gray-600">
              You&apos;re ready to start using Kandes AI Gateway.
              Happy coding!
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Welcome to Kandes AI</h2>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip
            </button>
          </div>
          {/* Progress Bar */}
          <div className="mt-3 h-1.5 w-full rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Step {currentStep + 1} of {STEPS.length}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6 text-center">
            <span className="mb-4 inline-block text-5xl">{step.icon}</span>
            <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
            <p className="text-gray-600">{step.description}</p>
          </div>

          {/* Steps Overview */}
          <div className="mb-6 rounded-lg bg-gray-50 p-3">
            <p className="mb-2 text-xs font-medium text-gray-500">What you&apos;ll learn:</p>
            <ul className="space-y-1">
              {STEPS.map((s, i) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    completedSteps.includes(s.id)
                      ? 'bg-green-100 text-green-600'
                      : i === currentStep
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {completedSteps.includes(s.id) ? '✓' : s.id}
                  </span>
                  <span className={i === currentStep ? 'font-medium text-gray-900' : 'text-gray-600'}>
                    {s.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          {step.cta && step.ctaHref && (
            <Link
              href={step.ctaHref}
              className="block rounded-lg border border-blue-600 px-4 py-2 text-center text-blue-600 hover:bg-blue-50"
            >
              {step.cta}
            </Link>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t p-4">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="flex-1 rounded-lg border px-4 py-2 text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
