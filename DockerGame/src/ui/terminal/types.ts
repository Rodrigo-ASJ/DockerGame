export type TerminalTone = 'command' | 'output' | 'error' | 'info'

export type TerminalEntry = {
  readonly text: string
  readonly tone: TerminalTone
}

export type TerminalRenderer = {
  write(entry: TerminalEntry): void
  clear(): void
  dispose(): void
}

export type TerminalFactory = (container: HTMLElement) => TerminalRenderer
