import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Image } from '../../core/types'
import { ImageLayersPanel } from './ImageLayersPanel'

const IMAGE_WITH_LAYERS: Image = {
  id: 'image-1',
  repository: 'nginx',
  tag: 'latest',
  reference: 'nginx:latest',
  origin: 'base',
  baseReference: null,
  layers: [
    { id: 'l1', instruction: 'FROM', label: 'sistema', sizeKb: 100000, cacheKey: 'FROM:nginx:latest', fromCache: true },
    { id: 'l2', instruction: 'WORKDIR', label: 'WORKDIR /usr/share/nginx/html', sizeKb: 1, cacheKey: 'WORKDIR:/usr/share/nginx/html', fromCache: false },
    { id: 'l3', instruction: 'COPY', label: 'COPY index.html .', sizeKb: 2, cacheKey: 'COPY:index.html:.:2', fromCache: false },
  ],
  startCommand: {
    entrypoint: null,
    cmd: ['nginx'],
    entrypointForm: null,
    cmdForm: 'exec',
    final: ['nginx'],
    display: 'nginx',
  },
}

describe('ImageLayersPanel', () => {
  it('muestra las capas de la imagen seleccionada con tamaño por capa', () => {
    render(<ImageLayersPanel image={IMAGE_WITH_LAYERS} />)

    expect(screen.getByText('sistema')).toBeInTheDocument()
    expect(screen.getAllByText('100 MB').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1 KB').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2 KB').length).toBeGreaterThan(0)
  })

  it('marca las capas de caché y reconstruidas', () => {
    render(<ImageLayersPanel image={IMAGE_WITH_LAYERS} />)

    expect(screen.getAllByText('Caché').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Reconstruida').length).toBe(2)
  })

  it('muestra el tamaño total de la imagen', () => {
    render(<ImageLayersPanel image={IMAGE_WITH_LAYERS} />)

    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getAllByText('100 MB').length).toBeGreaterThan(0)
  })

  it('muestra mensaje orientativo cuando no hay imagen seleccionada', () => {
    const { container } = render(<ImageLayersPanel image={null} />)

    expect(container.textContent).toContain('Ejecuta')
    expect(container.textContent).toContain('docker history')
    expect(container.textContent).toContain('construye una imagen')
  })
})
