import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Image } from '../../core/types'
import { ImageComparison } from './ImageComparison'

const BASE_IMAGE: Image = {
  id: 'image-1',
  repository: 'optimizada',
  tag: '1.0',
  reference: 'optimizada:1.0',
  origin: 'built',
  baseReference: 'nginx:latest',
  layers: [
    { id: 'l1', instruction: 'FROM', label: 'sistema', sizeKb: 100000, cacheKey: 'FROM:nginx:latest', fromCache: false },
    { id: 'l2', instruction: 'FROM', label: 'binarios', sizeKb: 70000, cacheKey: 'FROM:nginx:latest', fromCache: false },
    { id: 'l3', instruction: 'FROM', label: 'configuración', sizeKb: 17000, cacheKey: 'FROM:nginx:latest', fromCache: false },
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

const ALPINE_IMAGE: Image = {
  ...BASE_IMAGE,
  id: 'image-2',
  repository: 'optimizada',
  tag: '2.0',
  reference: 'optimizada:2.0',
  baseReference: 'nginx:alpine',
  layers: [
    { id: 'l1', instruction: 'FROM', label: 'sistema', sizeKb: 20000, cacheKey: 'FROM:nginx:alpine', fromCache: false },
    { id: 'l2', instruction: 'FROM', label: 'binarios', sizeKb: 18000, cacheKey: 'FROM:nginx:alpine', fromCache: false },
    { id: 'l3', instruction: 'FROM', label: 'configuración', sizeKb: 5000, cacheKey: 'FROM:nginx:alpine', fromCache: false },
  ],
}

describe('ImageComparison', () => {
  it('muestra 187 MB frente a 43 MB', () => {
    render(
      <ImageComparison
        images={[BASE_IMAGE, ALPINE_IMAGE]}
        baselineReference="optimizada:1.0"
        optimizedReference="optimizada:2.0"
      />,
    )

    expect(screen.getByText('187 MB')).toBeInTheDocument()
    expect(screen.getByText('43 MB')).toBeInTheDocument()
    expect(screen.getByText(/187 MB frente a 43 MB/)).toBeInTheDocument()
  })

  it('no renderiza si faltan las imágenes', () => {
    const { container } = render(
      <ImageComparison
        images={[BASE_IMAGE]}
        baselineReference="optimizada:1.0"
        optimizedReference="optimizada:2.0"
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
