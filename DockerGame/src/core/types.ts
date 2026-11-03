export type ContainerStatus = 'running'

export type Container = {
  readonly id: string
  readonly name: string
  readonly image: string
  readonly status: ContainerStatus
}

export type CommandKind = 'ps' | 'run'

export type ParsedCommand =
  | { readonly kind: 'ps' }
  | { readonly kind: 'run'; readonly name: string; readonly image: string }

export type CommandErrorCode =
  | 'duplicate-name'
  | 'image-not-found'
  | 'unsupported-command'
  | 'command-not-allowed'

export type CommandError = {
  readonly code: CommandErrorCode
  readonly message: string
}

export type CommandLogEntry = {
  readonly rawCommand: string
  readonly normalizedCommand: string
  readonly command: ParsedCommand | null
  readonly ok: boolean
  readonly lines: readonly string[]
  readonly error: CommandError | null
  readonly containerCountBefore: number
  readonly containerCountAfter: number
}

export type SimState = {
  readonly containers: readonly Container[]
  readonly lastError: CommandError | null
  readonly nextContainerNumber: number
  readonly log: readonly CommandLogEntry[]
}

export type CommandResult = {
  readonly ok: boolean
  readonly lines: readonly string[]
  readonly state: SimState
  readonly error: CommandError | null
}

export type ExecuteOptions = {
  readonly allowedCommands?: readonly CommandKind[]
}

export type ParseResult =
  | {
      readonly ok: true
      readonly normalizedCommand: string
      readonly command: ParsedCommand
    }
  | {
      readonly ok: false
      readonly normalizedCommand: string
      readonly error: CommandError
    }

export type StepCheckContext = {
  readonly state: SimState
  readonly log: readonly CommandLogEntry[]
}

export type StepChecker = (context: StepCheckContext) => boolean

export type LessonStep = {
  readonly id: string
  readonly title: string
  readonly instruction: string
  readonly allowedCommands: readonly CommandKind[]
  readonly checker: StepChecker
  readonly successMessage: string
  readonly errorHint: string
}

export type LessonDiagramStep = {
  readonly label: string
  readonly detail: string
}

export type LessonDiagram = {
  readonly title: string
  readonly steps: readonly LessonDiagramStep[]
}

export type Lesson = {
  readonly id: string
  readonly level: number
  readonly title: string
  readonly objective: string
  readonly explanation: string
  readonly diagram: LessonDiagram
  readonly steps: readonly LessonStep[]
}
