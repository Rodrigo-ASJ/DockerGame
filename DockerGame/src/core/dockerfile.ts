import type {
  CommandError,
  CommandErrorCode,
  DockerfileInstruction,
  DockerfileInstructionKind,
  DockerfileParseResult,
} from './types'

type LogicalLine = {
  readonly text: string
  readonly line: number
}

type ParsedArguments =
  | {
      readonly ok: true
      readonly args: readonly string[]
      readonly form: 'exec' | 'shell' | null
    }
  | {
      readonly ok: false
      readonly error: CommandError
    }

function isSupportedInstruction(
  value: string,
): value is DockerfileInstructionKind {
  return (
    value === 'FROM' ||
    value === 'WORKDIR' ||
    value === 'COPY' ||
    value === 'RUN' ||
    value === 'CMD' ||
    value === 'ENTRYPOINT'
  )
}

function isSkippable(line: string): boolean {
  const trimmed = line.trim()

  return trimmed.length === 0 || trimmed.startsWith('#')
}

function toLogicalLines(content: string): readonly LogicalLine[] {
  const physical = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
  const logical: LogicalLine[] = []
  let index = 0

  while (index < physical.length) {
    if (isSkippable(physical[index])) {
      index += 1
      continue
    }

    const line = index + 1
    let text = physical[index].trim()
    index += 1

    while (text.endsWith('\\')) {
      text = text.slice(0, -1).trimEnd()

      while (index < physical.length && isSkippable(physical[index])) {
        index += 1
      }

      if (index >= physical.length) {
        break
      }

      text = `${text} ${physical[index].trim()}`.trim()
      index += 1
    }

    if (text.length > 0) {
      logical.push({ text, line })
    }
  }

  return logical
}

function parseError(
  code: CommandErrorCode,
  message: string,
): ParsedArguments {
  return { ok: false, error: { code, message } }
}

function invalidArgumentsDetail(kind: DockerfileInstructionKind): string {
  switch (kind) {
    case 'FROM':
      return 'FROM necesita exactamente una imagen base'
    case 'COPY':
      return 'COPY necesita exactamente un origen y un destino separados por espacios'
    case 'WORKDIR':
      return 'WORKDIR necesita una ruta'
    case 'RUN':
      return 'RUN necesita un comando'
    case 'CMD':
    case 'ENTRYPOINT':
      return `${kind} necesita argumentos o un array JSON`
  }
}

function invalidArguments(
  kind: DockerfileInstructionKind,
  line: number,
  rest: string,
): ParsedArguments {
  const message = rest.includes('#')
    ? `Los comentarios deben ir en su propia línea: el "#" forma parte de los argumentos de ${kind} (línea ${line}).`
    : `${invalidArgumentsDetail(kind)} (línea ${line}).`

  return parseError('invalid-instruction-arguments', message)
}

function invalidExecForm(
  kind: DockerfileInstructionKind,
  line: number,
): ParsedArguments {
  return parseError(
    'invalid-exec-form',
    `La forma exec de ${kind} necesita un array JSON no vacío de textos (línea ${line}).`,
  )
}

function parseArguments(
  kind: DockerfileInstructionKind,
  rest: string,
  line: number,
): ParsedArguments {
  if (kind === 'FROM') {
    if (rest.length === 0) {
      return invalidArguments(kind, line, rest)
    }

    const tokens = rest.split(/\s+/)

    if (tokens.length !== 1) {
      return invalidArguments(kind, line, rest)
    }

    return { ok: true, args: tokens, form: null }
  }

  if (kind === 'COPY') {
    if (rest.length === 0 || rest.startsWith('[')) {
      return invalidArguments(kind, line, rest)
    }

    const tokens = rest.split(/\s+/)

    if (
      tokens.length !== 2 ||
      tokens.some((token) => /[*?]/.test(token))
    ) {
      return invalidArguments(kind, line, rest)
    }

    return { ok: true, args: tokens, form: null }
  }

  if (kind === 'WORKDIR') {
    if (rest.length === 0) {
      return invalidArguments(kind, line, rest)
    }

    return { ok: true, args: [rest], form: null }
  }

  if (kind === 'RUN') {
    if (rest.length === 0) {
      return invalidArguments(kind, line, rest)
    }

    return {
      ok: true,
      args: [rest.split(/\s+/).join(' ')],
      form: null,
    }
  }

  if (rest.length === 0) {
    return invalidArguments(kind, line, rest)
  }

  if (rest.startsWith('[')) {
    let parsed: unknown

    try {
      parsed = JSON.parse(rest)
    } catch {
      return invalidExecForm(kind, line)
    }

    if (
      !Array.isArray(parsed) ||
      parsed.length === 0 ||
      !parsed.every((item) => typeof item === 'string')
    ) {
      return invalidExecForm(kind, line)
    }

    return { ok: true, args: parsed as readonly string[], form: 'exec' }
  }

  return { ok: true, args: [rest], form: 'shell' }
}

export function parseDockerfile(content: string): DockerfileParseResult {
  const instructions: DockerfileInstruction[] = []
  let fromSeen = false

  for (const logical of toLogicalLines(content)) {
    const match = /^(\S+)(?:\s+([\s\S]*))?$/.exec(logical.text)

    if (match === null) {
      continue
    }

    const word = match[1]
    const rest = (match[2] ?? '').trim()
    const kind = word.toUpperCase()

    if (!isSupportedInstruction(kind)) {
      return {
        ok: false,
        error: {
          code: 'unsupported-instruction',
          message: `Instrucción no soportada en la línea ${logical.line}: "${word}". Usa FROM, WORKDIR, COPY, RUN, CMD o ENTRYPOINT.`,
        },
      }
    }

    if (kind === 'FROM') {
      if (fromSeen) {
        return {
          ok: false,
          error: {
            code: 'multiple-from',
            message: `Solo se admite un FROM por Dockerfile (línea ${logical.line}).`,
          },
        }
      }

      fromSeen = true
    }

    const parsedArguments = parseArguments(kind, rest, logical.line)

    if (!parsedArguments.ok) {
      return parsedArguments
    }

    instructions.push({
      kind,
      raw: logical.text,
      args: parsedArguments.args,
      form: parsedArguments.form,
      line: logical.line,
    })
  }

  return { ok: true, instructions }
}
