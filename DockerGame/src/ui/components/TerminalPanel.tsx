import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type {
  TerminalEntry,
  TerminalFactory,
  TerminalRenderer,
} from '../terminal/types'

const WELCOME_ENTRY: TerminalEntry = {
  text: 'Terminal simulado listo. Escribe un comando de Docker y pulsa Enter.',
  tone: 'info',
}

type TerminalPanelProps = {
  readonly entries: readonly TerminalEntry[]
  readonly onSubmitCommand: (command: string) => void
  readonly terminalFactory?: TerminalFactory
  readonly disabled?: boolean
}

export function TerminalPanel({
  entries,
  onSubmitCommand,
  terminalFactory,
  disabled = false,
}: TerminalPanelProps) {
  const inputId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<ReturnType<TerminalFactory> | null>(null)
  const lastWrittenCountRef = useRef(0)
  const entriesRef = useRef(entries)

  const [command, setCommand] = useState('')

  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  useEffect(() => {
    const container = containerRef.current

    if (container === null) {
      return
    }

    let disposed = false
    let renderer: TerminalRenderer | null = null

    const start = (createdRenderer: TerminalRenderer) => {
      renderer = createdRenderer
      rendererRef.current = createdRenderer
      createdRenderer.write(WELCOME_ENTRY)

      for (const entry of entriesRef.current) {
        createdRenderer.write(entry)
      }

      lastWrittenCountRef.current = entriesRef.current.length
    }

    if (terminalFactory !== undefined) {
      start(terminalFactory(container))
    } else {
      void import('../terminal/xtermRenderer').then(
        ({ createXtermRenderer }) => {
          if (!disposed) {
            start(createXtermRenderer(container))
          }
        },
      )
    }

    return () => {
      disposed = true
      renderer?.dispose()
      rendererRef.current = null
      lastWrittenCountRef.current = 0
    }
  }, [terminalFactory])

  useEffect(() => {
    const renderer = rendererRef.current

    if (renderer === null) {
      return
    }

    if (entries.length < lastWrittenCountRef.current) {
      renderer.clear()
      renderer.write(WELCOME_ENTRY)
      lastWrittenCountRef.current = 0
    }

    for (let index = lastWrittenCountRef.current; index < entries.length; index += 1) {
      const entry = entries[index]

      if (entry !== undefined) {
        renderer.write(entry)
      }
    }

    lastWrittenCountRef.current = entries.length
  }, [entries])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedCommand = command.trim()

    if (trimmedCommand.length === 0 || disabled) {
      return
    }

    onSubmitCommand(trimmedCommand)
    setCommand('')
  }

  return (
    <section
      aria-labelledby="terminal-title"
      className="tc-card tc-wobble-sm relative flex min-w-0 flex-col overflow-hidden p-4 sm:p-6"
    >
      <div aria-hidden="true" className="tc-stripe text-acid" />
      <div className="relative flex h-full flex-col">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-3 border-2 border-ink bg-acid shadow-[2px_2px_0_#0b0a0a]"
            />
            <h2
              id="terminal-title"
              className="font-display text-lg leading-none tracking-wide text-bone sm:text-xl"
            >
              Terminal simulado
            </h2>
          </div>
          <span className="tc-badge tc-badge--muted">Sandbox aislado</span>
        </div>

        <div
          ref={containerRef}
          aria-hidden="true"
          data-testid="xterm-container"
          className="tc-terminal-screen h-80 w-full p-2 md:h-96"
        />

        <div
          role="log"
          aria-label="Salida del terminal"
          aria-live="polite"
          className="sr-only"
        >
          {[WELCOME_ENTRY, ...entries].map((entry, index) => (
            <p key={`${entry.tone}-${index}`}>{entry.text}</p>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-2 sm:flex sm:items-stretch sm:gap-2 sm:space-y-0"
        >
          <label htmlFor={inputId} className="sr-only">
            Comando
          </label>
          <div className="flex items-stretch gap-2 sm:min-w-0 sm:flex-1">
            <span
              aria-hidden="true"
              className="flex w-10 shrink-0 items-center justify-center border-4 border-ink bg-acid font-mono text-base font-bold text-ink shadow-[3px_3px_0_#0b0a0a]"
            >
              $
            </span>
            <input
              id={inputId}
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="docker ps"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={disabled}
              className="tc-input min-w-0 flex-1"
            />
          </div>
          <button
            type="submit"
            disabled={disabled || command.trim().length === 0}
            className="tc-button w-full px-4 sm:w-auto sm:shrink-0"
          >
            Ejecutar
          </button>
        </form>
        <p className="mt-3 text-center font-mono text-[0.6rem] font-bold uppercase tracking-[0.18em] text-bone/55">
          Nada se ejecuta en tu equipo · Solo simulación
        </p>
      </div>
    </section>
  )
}
