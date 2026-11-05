import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Image } from '../../core/types'
import { ImageStartCommand } from './ImageStartCommand'

const IMAGE_WITH_ENTRYPOINT_CMD: Image = {
  id: 'image-1',
  repository: 'optimizada',
  tag: '1.0',
  reference: 'optimizada:1.0',
  origin: 'built',
  baseReference: 'nginx:latest',
  layers: [],
  startCommand: {
    entrypoint: ['nginx'],
    cmd: ['-g', 'daemon off;'],
    entrypointForm: 'exec',
    cmdForm: 'exec',
    final: ['nginx', '-g', 'daemon off;'],
    display: 'nginx -g "daemon off;"',
  },
}

describe('ImageStartCommand', () => {
  it('muestra ENTRYPOINT, CMD y el comando final compuesto', () => {
    render(<ImageStartCommand image={IMAGE_WITH_ENTRYPOINT_CMD} />)

    expect(screen.getByText('ENTRYPOINT')).toBeInTheDocument()
    expect(screen.getByText('CMD')).toBeInTheDocument()
    expect(screen.getByText('Comando final')).toBeInTheDocument()
    expect(screen.getByText('nginx -g "daemon off;"')).toBeInTheDocument()
  })

  it('muestra guión cuando no hay ENTRYPOINT ni CMD', () => {
    render(
      <ImageStartCommand
        image={{
          ...IMAGE_WITH_ENTRYPOINT_CMD,
          startCommand: {
            entrypoint: null,
            cmd: null,
            entrypointForm: null,
            cmdForm: null,
            final: [],
            display: '',
          },
        }}
      />,
    )

    expect(screen.getAllByText('—').length).toBe(2)
  })

  it('muestra mensaje orientativo sin imagen construida seleccionada', () => {
    const { container } = render(<ImageStartCommand image={null} />)

    expect(container.textContent).toContain('Selecciona una imagen construida')
  })
})
