import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { createFakeTerminalFactory } from './test/fakeTerminal'

describe('App', () => {
  it('renders the first available lesson, the index and the terminal', () => {
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

  it('shows an alert when attempting to open a locked lesson', async () => {
    const user = userEvent.setup()
    render(<App terminalFactory={createFakeTerminalFactory()} />)

    const index = screen.getByRole('complementary')
    const locked = within(index).getByRole('button', { name: /Imágenes y capas/ })

    expect(locked).toHaveAttribute('aria-disabled', 'true')
    expect(locked).not.toHaveAttribute('disabled')

    await user.click(locked)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Para abrir «Imágenes y capas» primero completa «Crear y listar contenedores».',
    )
  })
})
