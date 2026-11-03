import type { FeedbackMessage, FeedbackTone } from '../types'

const TONE_STYLES: Record<FeedbackTone, string> = {
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  error: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  info: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
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
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${TONE_STYLES[feedback.tone]}`}
    >
      {feedback.message}
    </div>
  )
}
