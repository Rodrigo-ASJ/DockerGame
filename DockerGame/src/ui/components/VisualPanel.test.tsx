import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Container, Image } from '../../core/types'
import { VisualPanel } from './VisualPanel'

const IMAGE: Image = {
  id: 'image-1',
  repository: 'nginx',
  tag: 'latest',
  reference: 'nginx:latest',
  origin: 'base',
  baseReference: null,
  layers: [
    { id: 'l1', instruction: 'FROM', label: 'sistema', sizeKb: 100000, cacheKey: 'FROM:nginx:latest', fromCache: false },
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

const CONTAINER: Container = {
  id: 'container-1',
  name: 'web',
  image: 'nginx:latest',
  status: 'running',
}

describe('VisualPanel', () => {
  it('renderiza proyecto, imágenes, capas y contenedores cuando hay datos', () => {
    render(
      <VisualPanel
        containers={[CONTAINER]}
        images={[IMAGE]}
        selectedImage={null}
        projectFiles={[
          { path: 'index.html', content: '<h1>', sizeKb: 2 },
        ]}
        baseReference="nginx:latest"
      />,
    )

    expect(screen.getByText('Espacio de trabajo · Proyecto')).toBeInTheDocument()
    expect(screen.getByText('Imágenes')).toBeInTheDocument()
    expect(screen.getByText('Capas de la imagen')).toBeInTheDocument()
    expect(screen.getByText('Runtime · Contenedores')).toBeInTheDocument()
    expect(screen.getByText('web')).toBeInTheDocument()
  })

  it('no renderiza la sección de proyecto sin projectFiles', () => {
    render(
      <VisualPanel containers={[]} images={[IMAGE]} selectedImage={null} />,
    )

    expect(
      screen.queryByText('Espacio de trabajo · Proyecto'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Imágenes')).toBeInTheDocument()
  })

  it('renderiza capas con mensaje orientativo sin selección', () => {
    const { container } = render(
      <VisualPanel containers={[]} images={[IMAGE]} selectedImage={null} />,
    )

    expect(container.textContent).toContain('Ejecuta')
    expect(container.textContent).toContain('docker history')
    expect(container.textContent).toContain('construye una imagen')
  })

  it('renderiza comparación solo cuando existen ambas referencias', () => {
    const baseline = { ...IMAGE, reference: 'optimizada:1.0' }
    const optimized = { ...IMAGE, reference: 'optimizada:2.0' }

    render(
      <VisualPanel
        containers={[]}
        images={[baseline, optimized]}
        selectedImage={null}
        comparison={{
          baselineReference: 'optimizada:1.0',
          optimizedReference: 'optimizada:2.0',
        }}
      />,
    )

    expect(screen.getByText('Comparación de tamaños')).toBeInTheDocument()
  })

  it('no renderiza comparación cuando faltan referencias', () => {
    render(
      <VisualPanel
        containers={[]}
        images={[IMAGE]}
        selectedImage={null}
        comparison={{
          baselineReference: 'optimizada:1.0',
          optimizedReference: 'optimizada:2.0',
        }}
      />,
    )

    expect(
      screen.queryByText('Comparación de tamaños'),
    ).not.toBeInTheDocument()
  })
})
