export type ContainerStatus = 'running'

export type Container = {
  readonly id: string
  readonly name: string
  readonly image: string
  readonly status: ContainerStatus
  readonly command?: readonly string[]
}

export type CommandKind = 'ps' | 'run' | 'images' | 'history' | 'build'

export type ParsedCommand =
  | { readonly kind: 'ps' }
  | { readonly kind: 'run'; readonly name: string; readonly image: string }
  | { readonly kind: 'images' }
  | { readonly kind: 'history'; readonly image: string }
  | { readonly kind: 'build'; readonly reference: string }

export type CommandErrorCode =
  | 'duplicate-name'
  | 'image-not-found'
  | 'image-build-failed'
  | 'unsupported-command'
  | 'command-not-allowed'
  | 'invalid-command-syntax'
  | 'missing-from'
  | 'from-not-first'
  | 'multiple-from'
  | 'base-image-not-found'
  | 'unsupported-instruction'
  | 'invalid-instruction-arguments'
  | 'invalid-exec-form'
  | 'copy-source-not-found'
  | 'run-failed'
  | 'missing-start-command'
  | 'invalid-image-tag'
  | 'duplicate-image-tag'

export type CommandError = {
  readonly code: CommandErrorCode
  readonly message: string
}

export type ProjectFile = {
  readonly path: string
  readonly content: string
  readonly sizeKb: number
}

export type ImageComparisonConfig = {
  readonly baselineReference: string
  readonly optimizedReference: string
}

export type LessonWorkspace = {
  readonly projectFiles: readonly ProjectFile[]
  readonly initialDockerfile: string
  readonly comparison?: ImageComparisonConfig
}

export type DockerfileInstructionKind =
  | 'FROM'
  | 'WORKDIR'
  | 'COPY'
  | 'RUN'
  | 'CMD'
  | 'ENTRYPOINT'

export type ImageLayer = {
  readonly id: string
  readonly instruction: DockerfileInstructionKind
  readonly label: string
  readonly sizeKb: number
  readonly cacheKey: string
  readonly fromCache: boolean
}

export type StartCommand = {
  readonly entrypoint: readonly string[] | null
  readonly cmd: readonly string[] | null
  readonly entrypointForm: 'exec' | 'shell' | null
  readonly cmdForm: 'exec' | 'shell' | null
  readonly final: readonly string[]
  readonly display: string
}

export type Image = {
  readonly id: string
  readonly repository: string
  readonly tag: string
  readonly reference: string
  readonly origin: 'base' | 'built'
  readonly baseReference: string | null
  readonly layers: readonly ImageLayer[]
  readonly startCommand: StartCommand
}

export type BaseImage = {
  readonly id: string
  readonly repository: string
  readonly tag: string
  readonly reference: string
  readonly layers: readonly ImageLayer[]
  readonly defaultCommand: readonly string[]
}

export type DockerfileInstruction = {
  readonly kind: DockerfileInstructionKind
  readonly raw: string
  readonly args: readonly string[]
  readonly form: 'exec' | 'shell' | null
  readonly line: number
}

export type DockerfileParseResult =
  | {
      readonly ok: true
      readonly instructions: readonly DockerfileInstruction[]
    }
  | {
      readonly ok: false
      readonly error: CommandError
    }

export type BuildAttempt = {
  readonly id: string
  readonly dockerfile: string
  readonly repository: string
  readonly tag: string
  readonly reference: string
  readonly ok: boolean
  readonly error: CommandError | null
  readonly imageId: string | null
  readonly cacheKeys: readonly string[]
  readonly cacheHits: number
  readonly cacheMisses: number
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
  readonly images: readonly Image[]
  readonly projectFiles: readonly ProjectFile[]
  readonly builds: readonly BuildAttempt[]
  readonly selectedImage: string | null
  readonly lastError: CommandError | null
  readonly nextContainerNumber: number
  readonly nextImageNumber: number
  readonly nextBuildNumber: number
  readonly log: readonly CommandLogEntry[]
}

export type CreateInitialSimStateOptions = {
  readonly baseImages?: readonly BaseImage[]
  readonly projectFiles?: readonly ProjectFile[]
}

export type CommandResult = {
  readonly ok: boolean
  readonly lines: readonly string[]
  readonly state: SimState
  readonly error: CommandError | null
}

export type ExecuteOptions = {
  readonly availableCommands?: readonly CommandKind[]
  readonly allowedCommands?: readonly CommandKind[]
  readonly dockerfile?: string
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
  readonly dockerfile?: string
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
  readonly availableCommands: readonly CommandKind[]
  readonly workspace?: LessonWorkspace
  readonly exampleDockerfiles?: readonly string[]
  readonly steps: readonly LessonStep[]
}

export type CurriculumLevel = {
  readonly number: number
  readonly title: string
  readonly subtitle: string
  readonly lessonIds: readonly string[]
}

export type Curriculum = {
  readonly levels: readonly CurriculumLevel[]
  readonly lessons: readonly Lesson[]
  readonly lessonOrder: readonly string[]
  readonly baseImages: readonly BaseImage[]
}
