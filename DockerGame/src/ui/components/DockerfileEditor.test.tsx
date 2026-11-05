import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DockerfileEditor } from './DockerfileEditor'

describe('DockerfileEditor', () => {
  it('renderiza un textarea con etiqueta y ayuda accesibles', () => {
    render(<DockerfileEditor value="" onChange={() => undefined} />)

    expect(screen.getByLabelText('Dockerfile')).toBeInTheDocument()
    expect(
      screen.getByText(/Edita el contenido del Dockerfile/),
    ).toBeInTheDocument()
  })

  it('es un textarea navegable por teclado y con spellCheck desactivado', () => {
    const { container } = render(
      <DockerfileEditor value="" onChange={() => undefined} />,
    )

    const textarea = container.querySelector('textarea')
    expect(textarea).not.toBeNull()
    expect(textarea).toHaveAttribute('spellcheck', 'false')
    expect(textarea).toHaveAttribute('autocapitalize', 'off')
    expect(textarea).toHaveAttribute('autocomplete', 'off')
    expect(textarea).toHaveClass('font-mono')
  })

  it('notifica cambios al escribir', () => {
    const onChange = vi.fn()
    render(<DockerfileEditor value="" onChange={onChange} />)

    const textarea = screen.getByLabelText('Dockerfile')
    fireEvent.input(textarea, { target: { value: 'FROM nginx:latest' } })

    expect(onChange).toHaveBeenCalledWith('FROM nginx:latest')
  })

  it('es deshabilitáble', () => {
    render(
      <DockerfileEditor value="" onChange={() => undefined} disabled />,
    )

    expect(screen.getByLabelText('Dockerfile')).toBeDisabled()
  })
})
