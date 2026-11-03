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
      className="flex min-w-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="terminal-title" className="text-lg font-semibold text-slate-100">
          Terminal simulado
        </h2>
        <span className="text-xs text-slate-500">
          Nada se ejecuta en tu equipo
        </span>
      </div>

      <div
        ref={containerRef}
        aria-hidden="true"
        data-testid="xterm-container"
        className="h-72 w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950 p-3"
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

      <form onSubmit={handleSubmit} className="mt-4 flex items-stretch gap-2">
        <label htmlFor={inputId} className="sr-only">
          Comando
        </label>
        <span
          aria-hidden="true"
          className="flex items-center rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-sm text-cyan-400"
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
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || command.trim().length === 0}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Ejecutar
        </button>
      </form>
    </section>
  )
}
