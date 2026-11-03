import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Feedback } from './Feedback'

describe('Feedback', () => {
  it('renders nothing without feedback', () => {
    const { container } = render(<Feedback feedback={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders success feedback as a status message', () => {
    render(
      <Feedback
        feedback={{ tone: 'success', message: 'Paso superado correctamente.' }}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Paso superado correctamente.',
    )
  })

  it('renders error feedback as an alert', () => {
    render(
      <Feedback
        feedback={{ tone: 'error', message: 'Todavía no has creado el contenedor.' }}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Todavía no has creado el contenedor.',
    )
  })

  it('renders informational feedback as a status message', () => {
    render(
      <Feedback feedback={{ tone: 'info', message: 'Revisa el comando.' }} />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Revisa el comando.')
  })
})
