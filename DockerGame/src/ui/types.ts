export type FeedbackTone = 'success' | 'error' | 'info'

export type FeedbackMessage = {
  readonly tone: FeedbackTone
  readonly message: string
}
