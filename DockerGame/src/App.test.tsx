import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { createFakeTerminalFactory } from './test/fakeTerminal'

describe('App', () => {
  it('renders the lesson, the index and the terminal', () => {
    render(<App terminalFactory={createFakeTerminalFactory()} />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Crear y listar contenedores',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('complementary')).toHaveTextContent('Nivel 1')
    expect(screen.getByLabelText('Comando')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Avanzar' })).toBeDisabled()
  })
})
