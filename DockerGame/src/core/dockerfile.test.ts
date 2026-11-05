import { describe, expect, it } from 'vitest'
import { parseDockerfile } from './dockerfile'
import type {
  CommandError,
  CommandErrorCode,
  DockerfileInstruction,
} from './types'

function expectOk(content: string): readonly DockerfileInstruction[] {
  const result = parseDockerfile(content)

  if (!result.ok) {
    throw new Error(
      `Se esperaba un parseo correcto, pero falló con ${result.error.code}: ${result.error.message}`,
    )
  }

  return result.instructions
}

function expectError(content: string, code: CommandErrorCode): CommandError {
  const result = parseDockerfile(content)

  if (result.ok) {
    throw new Error(`Se esperaba el error ${code}, pero el parseo fue correcto.`)
  }

  expect(result.error.code).toBe(code)

  return result.error
}

describe('parseDockerfile', () => {
  it('parses a complete Dockerfile with comments, blank lines and all six instructions', () => {
    const content = [
      '# imagen base del sitio',
      'FROM nginx:latest',
      '',
      'WORKDIR /usr/share/nginx/html',
      'COPY index.html .',
      'COPY app.js .',
      'COPY styles.css .',
      'RUN echo listo',
      'CMD ["nginx", "-g", "daemon off;"]',
      'ENTRYPOINT ["/docker-entrypoint.sh"]',
    ].join('\n')

    const instructions = expectOk(content)

    expect(instructions.map((instruction) => instruction.kind)).toEqual([
      'FROM',
      'WORKDIR',
      'COPY',
      'COPY',
      'COPY',
      'RUN',
      'CMD',
      'ENTRYPOINT',
    ])
    expect(instructions.map((instruction) => instruction.line)).toEqual([
      2, 4, 5, 6, 7, 8, 9, 10,
    ])
    expect(instructions[0]).toEqual({
      kind: 'FROM',
      raw: 'FROM nginx:latest',
      args: ['nginx:latest'],
      form: null,
      line: 2,
    })
    expect(instructions[1]).toEqual({
      kind: 'WORKDIR',
      raw: 'WORKDIR /usr/share/nginx/html',
      args: ['/usr/share/nginx/html'],
      form: null,
      line: 4,
    })
    expect(instructions[2].args).toEqual(['index.html', '.'])
    expect(instructions[3].args).toEqual(['app.js', '.'])
    expect(instructions[4].args).toEqual(['styles.css', '.'])
    expect(instructions[5]).toEqual({
      kind: 'RUN',
      raw: 'RUN echo listo',
      args: ['echo listo'],
      form: null,
      line: 8,
    })
    expect(instructions[6]).toEqual({
      kind: 'CMD',
      raw: 'CMD ["nginx", "-g", "daemon off;"]',
      args: ['nginx', '-g', 'daemon off;'],
      form: 'exec',
      line: 9,
    })
    expect(instructions[7]).toEqual({
      kind: 'ENTRYPOINT',
      raw: 'ENTRYPOINT ["/docker-entrypoint.sh"]',
      args: ['/docker-entrypoint.sh'],
      form: 'exec',
      line: 10,
    })
  })

  it('normalizes CRLF and CR line endings', () => {
    expect(expectOk('FROM nginx:latest\r\nRUN echo hola\r\n')).toHaveLength(2)
    expect(expectOk('FROM nginx:latest\rRUN echo hola\r')).toHaveLength(2)
  })

  it('ignores full-line comments with leading whitespace and blank lines', () => {
    const instructions = expectOk(
      [
        '   # comentario con sangría',
        '',
        '\t',
        '  FROM nginx:latest',
        '   # otro comentario',
      ].join('\n'),
    )

    expect(instructions).toHaveLength(1)
    expect(instructions[0].kind).toBe('FROM')
    expect(instructions[0].line).toBe(4)
  })

  it('returns no instructions for empty content, whitespace or comments only', () => {
    expect(expectOk('')).toEqual([])
    expect(expectOk('   \n\t\n  ')).toEqual([])
    expect(expectOk('# solo un comentario\n   # otro más\n')).toEqual([])
  })

  it('joins continuation lines and keeps the first physical line number', () => {
    const instructions = expectOk(
      [
        'FROM nginx:latest',
        'RUN echo hola \\',
        '    mundo \\',
        '    otra-vez',
      ].join('\n'),
    )

    expect(instructions).toHaveLength(2)
    expect(instructions[1]).toEqual({
      kind: 'RUN',
      raw: 'RUN echo hola mundo otra-vez',
      args: ['echo hola mundo otra-vez'],
      form: null,
      line: 2,
    })
  })

  it('skips comments and blank lines inside a continuation', () => {
    const instructions = expectOk(
      [
        'FROM nginx:latest',
        'RUN echo hola \\',
        '# comentario intermedio',
        '',
        '    mundo',
      ].join('\n'),
    )

    expect(instructions[1].line).toBe(2)
    expect(instructions[1].args).toEqual(['echo hola mundo'])
  })

  it('validates an instruction that ends with a trailing backslash at EOF', () => {
    const instructions = expectOk('FROM nginx:latest\nRUN echo hola \\')

    expect(instructions[1]).toEqual({
      kind: 'RUN',
      raw: 'RUN echo hola',
      args: ['echo hola'],
      form: null,
      line: 2,
    })
  })

  it('accepts lowercase instructions and normalizes the kind to uppercase', () => {
    const instructions = expectOk(
      [
        'from nginx:latest',
        'workdir /app',
        'copy index.html .',
        'run echo hola',
        'cmd ["sh"]',
        'entrypoint ["/bin/sh"]',
      ].join('\n'),
    )

    expect(instructions.map((instruction) => instruction.kind)).toEqual([
      'FROM',
      'WORKDIR',
      'COPY',
      'RUN',
      'CMD',
      'ENTRYPOINT',
    ])
    expect(instructions[0].raw).toBe('from nginx:latest')
    expect(instructions[4].form).toBe('exec')
    expect(instructions[5].form).toBe('exec')
  })

  it('accepts mixed case instructions', () => {
    const instructions = expectOk('FrOm nginx:latest')

    expect(instructions[0].kind).toBe('FROM')
  })

  it('keeps raw and the physical line while ignoring indentation', () => {
    const instructions = expectOk('  # comentario\n\n  from   nginx:latest  ')

    expect(instructions[0]).toEqual({
      kind: 'FROM',
      raw: 'from   nginx:latest',
      args: ['nginx:latest'],
      form: null,
      line: 3,
    })
  })

  it('parses FROM with exactly one reference', () => {
    const instructions = expectOk('FROM nginx:alpine')

    expect(instructions[0].args).toEqual(['nginx:alpine'])
    expect(instructions[0].form).toBeNull()
  })

  it('rejects FROM without an argument', () => {
    const error = expectError('FROM', 'invalid-instruction-arguments')

    expect(error.message).toContain('FROM')
    expect(error.message).toContain('línea 1')
  })

  it('rejects FROM with more than one argument such as AS', () => {
    const error = expectError(
      'FROM nginx:latest AS build',
      'invalid-instruction-arguments',
    )

    expect(error.message).toContain('FROM')
    expect(error.message).toContain('línea 1')
  })

  it('rejects inline comments in FROM and asks for their own line', () => {
    const error = expectError(
      'FROM nginx:latest # base',
      'invalid-instruction-arguments',
    )

    expect(error.message).toContain('comentario')
    expect(error.message).toContain('línea 1')
  })

  it('rejects a second FROM with multiple-from', () => {
    const error = expectError(
      ['FROM nginx:latest', 'RUN echo hola', 'FROM nginx:alpine'].join('\n'),
      'multiple-from',
    )

    expect(error.message).toContain('FROM')
    expect(error.message).toContain('línea 3')
  })

  it('parses COPY with exactly two arguments', () => {
    const instructions = expectOk('COPY index.html .')

    expect(instructions[0]).toEqual({
      kind: 'COPY',
      raw: 'COPY index.html .',
      args: ['index.html', '.'],
      form: null,
      line: 1,
    })
  })

  it('rejects COPY with one or three arguments', () => {
    for (const content of [
      'COPY index.html',
      'COPY index.html app.js .',
    ]) {
      const error = expectError(content, 'invalid-instruction-arguments')

      expect(error.message).toContain('COPY')
      expect(error.message).toContain('línea 1')
    }
  })

  it('rejects COPY in JSON form', () => {
    const error = expectError(
      'COPY ["index.html", "."]',
      'invalid-instruction-arguments',
    )

    expect(error.message).toContain('COPY')
  })

  it('rejects COPY with wildcards', () => {
    const error = expectError('COPY *.html .', 'invalid-instruction-arguments')

    expect(error.message).toContain('COPY')
  })

  it('rejects inline comments in COPY and asks for their own line', () => {
    const error = expectError(
      'COPY index.html . # nota',
      'invalid-instruction-arguments',
    )

    expect(error.message).toContain('comentario')
  })

  it('parses WORKDIR as a single text preserving internal spaces', () => {
    const instructions = expectOk('WORKDIR /ruta con espacios')

    expect(instructions[0].args).toEqual(['/ruta con espacios'])
    expect(instructions[0].form).toBeNull()
  })

  it('parses RUN as a single text and collapses repeated spaces', () => {
    const instructions = expectOk('RUN   echo   hola   mundo')

    expect(instructions[0]).toEqual({
      kind: 'RUN',
      raw: 'RUN   echo   hola   mundo',
      args: ['echo hola mundo'],
      form: null,
      line: 1,
    })
  })

  it('rejects WORKDIR and RUN without arguments', () => {
    for (const [content, kind] of [
      ['WORKDIR', 'WORKDIR'],
      ['RUN   ', 'RUN'],
    ] as const) {
      const error = expectError(content, 'invalid-instruction-arguments')

      expect(error.message).toContain(kind)
      expect(error.message).toContain('línea 1')
    }
  })

  it('parses CMD and ENTRYPOINT in shell form', () => {
    const instructions = expectOk(
      ['CMD echo hola', 'ENTRYPOINT /docker-entrypoint.sh nginx'].join('\n'),
    )

    expect(instructions[0]).toEqual({
      kind: 'CMD',
      raw: 'CMD echo hola',
      args: ['echo hola'],
      form: 'shell',
      line: 1,
    })
    expect(instructions[1]).toEqual({
      kind: 'ENTRYPOINT',
      raw: 'ENTRYPOINT /docker-entrypoint.sh nginx',
      args: ['/docker-entrypoint.sh nginx'],
      form: 'shell',
      line: 2,
    })
  })

  it('parses CMD and ENTRYPOINT in exec form', () => {
    const instructions = expectOk(
      [
        'CMD ["nginx", "-g", "daemon off;"]',
        'ENTRYPOINT [ "docker-entrypoint.sh" , "nginx" ]',
      ].join('\n'),
    )

    expect(instructions[0].args).toEqual(['nginx', '-g', 'daemon off;'])
    expect(instructions[0].form).toBe('exec')
    expect(instructions[1].args).toEqual(['docker-entrypoint.sh', 'nginx'])
    expect(instructions[1].form).toBe('exec')
  })

  it('rejects invalid exec JSON, empty arrays and non-string elements', () => {
    for (const content of [
      'CMD [nginx]',
      'CMD []',
      'CMD [1, 2]',
      'CMD ["a", 2]',
      'CMD ["a"] extra',
      'CMD [null]',
      'ENTRYPOINT ["a", true]',
    ]) {
      const error = expectError(content, 'invalid-exec-form')

      expect(error.message).toContain('exec')
      expect(error.message).toContain('línea 1')
    }
  })

  it('rejects CMD and ENTRYPOINT without arguments', () => {
    for (const [content, kind] of [
      ['CMD', 'CMD'],
      ['CMD   ', 'CMD'],
      ['ENTRYPOINT', 'ENTRYPOINT'],
    ] as const) {
      const error = expectError(content, 'invalid-instruction-arguments')

      expect(error.message).toContain(kind)
      expect(error.message).toContain('línea 1')
    }
  })

  it('rejects unknown instructions with their line', () => {
    const error = expectError('LABEL foo=bar', 'unsupported-instruction')

    expect(error.message).toContain('LABEL')
    expect(error.message).toContain('línea 1')
  })

  it('reports the line of an unknown instruction after comments and blanks', () => {
    const error = expectError(
      ['# comentario', '', 'HEALTHCHECK --interval=1m CMD true'].join('\n'),
      'unsupported-instruction',
    )

    expect(error.message).toContain('HEALTHCHECK')
    expect(error.message).toContain('línea 3')
  })

  it('does not reject FROM after another instruction; order belongs to build', () => {
    const instructions = expectOk(
      ['WORKDIR /app', 'FROM nginx:latest'].join('\n'),
    )

    expect(instructions.map((instruction) => instruction.kind)).toEqual([
      'WORKDIR',
      'FROM',
    ])
  })

  it('does not validate the base image catalog', () => {
    expect(expectOk('FROM nginx:no-existe')).toHaveLength(1)
  })

  it('does not validate COPY sources against project files', () => {
    expect(
      expectOk(['FROM nginx:latest', 'COPY missing.html .'].join('\n')),
    ).toHaveLength(2)
  })

  it('does not evaluate RUN success', () => {
    expect(
      expectOk(['FROM nginx:latest', 'RUN false'].join('\n')),
    ).toHaveLength(2)
  })

  it('does not require CMD or ENTRYPOINT', () => {
    expect(
      expectOk(['FROM nginx:latest', 'WORKDIR /app'].join('\n')),
    ).toHaveLength(2)
  })

  it('accepts several CMD instructions; the last one wins in build', () => {
    const instructions = expectOk(
      ['FROM nginx:latest', 'CMD ["a"]', 'CMD ["b"]'].join('\n'),
    )

    expect(instructions).toHaveLength(3)
    expect(instructions[1].args).toEqual(['a'])
    expect(instructions[2].args).toEqual(['b'])
  })

  it('treats a hash inside RUN or WORKDIR as an argument, not a comment', () => {
    const instructions = expectOk(
      ['RUN echo # hola', 'WORKDIR /app # nota'].join('\n'),
    )

    expect(instructions[0].args).toEqual(['echo # hola'])
    expect(instructions[1].args).toEqual(['/app # nota'])
  })
})
