import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import type { TerminalEntry, TerminalFactory } from './types'

const ANSI_BY_TONE: Record<TerminalEntry['tone'], string> = {
  command: '\u001b[36m',
  output: '\u001b[37m',
  error: '\u001b[31m',
  info: '\u001b[33m',
}

/**
 * Adaptador real de Xterm.js. La UI solo depende de `TerminalFactory`, de modo
 * que los tests puedan sustituirlo por una implementación en memoria.
 */
export const createXtermRenderer: TerminalFactory = (container) => {
  const terminal = new Terminal({
    convertEol: true,
    cursorBlink: false,
    disableStdin: true,
    fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
    fontSize: 14,
    rows: 12,
    theme: {
      background: '#020617',
      foreground: '#e2e8f0',
      cursor: '#22d3ee',
      selectionBackground: '#164e63',
    },
  })
  const fitAddon = new FitAddon()

  terminal.loadAddon(fitAddon)
  terminal.open(container)

  const fit = () => {
    try {
      fitAddon.fit()
    } catch {
      // En entornos sin medidas reales el terminal sigue funcionando.
    }
  }

  fit()
  window.addEventListener('resize', fit)

  return {
    write: (entry) => {
      const color = ANSI_BY_TONE[entry.tone]
      terminal.write(`${color}${entry.text}\u001b[0m\r\n`)
    },
    clear: () => {
      terminal.clear()
    },
    dispose: () => {
      window.removeEventListener('resize', fit)
      terminal.dispose()
    },
  }
}
