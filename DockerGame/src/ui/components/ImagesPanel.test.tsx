import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Image } from '../../core/types'
import { ImagesPanel } from './ImagesPanel'

const BASE_IMAGE: Image = {
  id: 'image-1',
  repository: 'nginx',
  tag: 'latest',
  reference: 'nginx:latest',
  origin: 'base',
  baseReference: null,
  layers: [
    { id: 'l1', instruction: 'FROM', label: 'sistema', sizeKb: 100000, cacheKey: 'FROM:nginx:latest', fromCache: false },
    { id: 'l2', instruction: 'FROM', label: 'binarios', sizeKb: 70000, cacheKey: 'FROM:nginx:latest', fromCache: false },
    { id: 'l3', instruction: 'FROM', label: 'configuración', sizeKb: 17000, cacheKey: 'FROM:nginx:latest', fromCache: false },
  ],
  startCommand: {
    entrypoint: null,
    cmd: ['/docker-entrypoint.sh', 'nginx', '-g', 'daemon off;'],
    entrypointForm: null,
    cmdForm: 'exec',
    final: ['/docker-entrypoint.sh', 'nginx', '-g', 'daemon off;'],
    display: '/docker-entrypoint.sh nginx -g daemon off;',
  },
}

const BUILT_IMAGE: Image = {
  ...BASE_IMAGE,
  id: 'image-2',
  repository: 'mi-sitio',
  tag: '1.0',
  reference: 'mi-sitio:1.0',
  origin: 'built',
  baseReference: 'nginx:latest',
}

describe('ImagesPanel', () => {
  it('muestra todas las imágenes con nombre, tag, ID y tamaño total', () => {
    render(<ImagesPanel images={[BASE_IMAGE, BUILT_IMAGE]} />)

    expect(screen.getByText('nginx')).toBeInTheDocument()
    expect(screen.getByText('latest')).toBeInTheDocument()
    expect(screen.getByText('mi-sitio')).toBeInTheDocument()
    expect(screen.getByText('1.0')).toBeInTheDocument()
    expect(screen.getByText('image-1')).toBeInTheDocument()
    expect(screen.getByText('image-2')).toBeInTheDocument()
    expect(screen.getAllByText('187 MB').length).toBe(2)
  })

  it('muestra el total de imágenes y el tamaño total combinado', () => {
    render(<ImagesPanel images={[BASE_IMAGE, BUILT_IMAGE]} />)

    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByText('374 MB')).toBeInTheDocument()
  })

  it('muestra origen base o construida', () => {
    render(<ImagesPanel images={[BASE_IMAGE, BUILT_IMAGE]} />)

    expect(screen.getByText('base')).toBeInTheDocument()
    expect(screen.getByText('built')).toBeInTheDocument()
  })

  it('muestra mensaje vacío sin imágenes', () => {
    render(<ImagesPanel images={[]} />)

    expect(screen.getByText('Sin imágenes.')).toBeInTheDocument()
  })
})
