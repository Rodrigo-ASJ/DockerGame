import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LessonIndex } from './LessonIndex'

const items = [
  {
    id: 'level1-create-list',
    level: 1,
    title: 'Crear y listar contenedores',
    status: 'completed' as const,
  },
  {
    id: 'level2-01-images-layers',
    level: 2,
    title: 'Imágenes y capas',
    status: 'locked' as const,
    prerequisiteTitle: 'Crear y listar contenedores',
  },
  {
    id: 'level2-02-first-dockerfile',
    level: 2,
    title: 'Primer Dockerfile',
    status: 'available' as const,
  },
]

const levels = [
  { number: 1, title: 'Fundamentos', subtitle: 'Contenedores y comandos básicos' },
  { number: 2, title: 'Imágenes y Dockerfiles', subtitle: 'Construye imágenes y entiende su arranque' },
]

describe('LessonIndex', () => {
  it('shows level, title and completion states', () => {
    render(
      <LessonIndex
        items={items}
        levels={levels}
        activeLessonId="level1-create-list"
        onSelectLesson={vi.fn()}
        onLockedLessonAttempt={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Nivel 1' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nivel 2' })).toBeInTheDocument()
    expect(screen.getByText('Completada')).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByText('Bloqueada')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Crear y listar contenedores/ }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('shows progress per level', () => {
    render(
      <LessonIndex
        items={items}
        levels={levels}
        activeLessonId="level1-create-list"
        onSelectLesson={vi.fn()}
        onLockedLessonAttempt={vi.fn()}
      />,
    )

    expect(screen.getByText('1/1')).toBeInTheDocument()
    expect(screen.getByText('0/2')).toBeInTheDocument()
  })

  it('selects an available lesson', async () => {
    const user = userEvent.setup()
    const onSelectLesson = vi.fn()
    const onLockedLessonAttempt = vi.fn()

    render(
      <LessonIndex
        items={items}
        levels={levels}
        activeLessonId="level2-01-images-layers"
        onSelectLesson={onSelectLesson}
        onLockedLessonAttempt={onLockedLessonAttempt}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: /Primer Dockerfile/ }),
    )

    expect(onSelectLesson).toHaveBeenCalledWith('level2-02-first-dockerfile')
    expect(onLockedLessonAttempt).not.toHaveBeenCalled()
  })

  it('does not navigate to a locked lesson and notifies the attempt', async () => {
    const user = userEvent.setup()
    const onSelectLesson = vi.fn()
    const onLockedLessonAttempt = vi.fn()

    render(
      <LessonIndex
        items={items}
        levels={levels}
        activeLessonId="level2-01-images-layers"
        onSelectLesson={onSelectLesson}
        onLockedLessonAttempt={onLockedLessonAttempt}
      />,
    )

    const locked = screen.getByRole('button', { name: /Imágenes y capas/ })

    expect(locked).toHaveAttribute('aria-disabled', 'true')
    expect(locked).not.toHaveAttribute('disabled')
    expect(locked).toHaveAttribute('aria-describedby', 'prereq-level2-01-images-layers')

    await user.click(locked)

    expect(onLockedLessonAttempt).toHaveBeenCalledWith('level2-01-images-layers')
    expect(onSelectLesson).not.toHaveBeenCalled()
  })

  it('announces the prerequisite for a locked lesson', () => {
    render(
      <LessonIndex
        items={items}
        levels={levels}
        activeLessonId="level2-01-images-layers"
        onSelectLesson={vi.fn()}
        onLockedLessonAttempt={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Requiere completar: "Crear y listar contenedores".'),
    ).toBeInTheDocument()
  })
})
