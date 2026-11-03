import type { TerminalEntry, TerminalFactory } from '../ui/terminal/types'

/**
 * Terminal en memoria para tests de jsdom. Evita inicializar Xterm.js y
 * mantiene la misma interfaz que el adaptador real.
 */
export function createFakeTerminalFactory(): TerminalFactory {
  return () => {
    const entries: TerminalEntry[] = []

    return {
      write: (entry) => {
        entries.push(entry)
      },
      clear: () => {
        entries.splice(0, entries.length)
      },
      dispose: () => undefined,
    }
  }
}
