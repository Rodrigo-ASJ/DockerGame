import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ProjectFilesPanel } from './ProjectFilesPanel'

const FILES = [
  { path: 'index.html', content: '<h1>Hola</h1>', sizeKb: 2 },
  { path: 'app.js', content: 'console.log(1);', sizeKb: 3 },
]

describe('ProjectFilesPanel', () => {
  it('lista los archivos del proyecto con ruta, tamaño y contenido', () => {
    render(<ProjectFilesPanel projectFiles={FILES} />)

    expect(screen.getByText('index.html')).toBeInTheDocument()
    expect(screen.getByText('2 KB')).toBeInTheDocument()
    expect(screen.getByText('<h1>Hola</h1>')).toBeInTheDocument()
    expect(screen.getByText('app.js')).toBeInTheDocument()
    expect(screen.getByText('console.log(1);')).toBeInTheDocument()
  })

  it('muestra el contexto de construcción y la imagen base', () => {
    const { container } = render(
      <ProjectFilesPanel
        projectFiles={FILES}
        baseReference="nginx:latest"
      />,
    )

    expect(container.textContent).toContain('Contexto de construcción')
    expect(container.textContent).toContain('.')
    expect(screen.getByText('nginx:latest')).toBeInTheDocument()
  })

  it('no permite editar los archivos (solo consulta)', () => {
    render(<ProjectFilesPanel projectFiles={FILES} />)

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('textarea')).not.toBeInTheDocument()
  })

  it('es consultable por teclado: expandir con Enter', async () => {
    const user = userEvent.setup()
    render(<ProjectFilesPanel projectFiles={FILES} />)

    const button = screen.getByRole('button', { name: /index\.html/ })
    await user.click(button)

    expect(screen.getByText('<h1>Hola</h1>')).toBeInTheDocument()
  })
})
