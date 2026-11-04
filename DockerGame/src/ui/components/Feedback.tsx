import type { FeedbackMessage, FeedbackTone } from '../types'

const TONE_STYLES: Record<FeedbackTone, string> = {
  success: 'tc-feedback tc-feedback--success',
  error: 'tc-feedback tc-feedback--error',
  info: 'tc-feedback tc-feedback--info',
}

const TONE_ICONS: Record<FeedbackTone, string> = {
  success: '✓',
  error: '!',
  info: 'i',
}

type FeedbackProps = {
  readonly feedback: FeedbackMessage | null
}

export function Feedback({ feedback }: FeedbackProps) {
  if (feedback === null) {
    return null
  }

  return (
    <div
      role={feedback.tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      data-tone={feedback.tone}
      className={TONE_STYLES[feedback.tone]}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center border-2 border-current font-mono text-xs font-bold"
        >
          {TONE_ICONS[feedback.tone]}
        </span>
        <div>{feedback.message}</div>
      </div>
    </div>
  )
}
