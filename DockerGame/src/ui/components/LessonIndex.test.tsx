import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LessonIndex } from './LessonIndex'

const items = [
  {
    id: 'level1-create-list',
    level: 1,
    title: 'Crear y listar contenedores',
    completed: true,
  },
  {
    id: 'level1-inspect',
    level: 1,
    title: 'Inspeccionar contenedores',
    completed: false,
  },
]

describe('LessonIndex', () => {
  it('shows level, title and completed state', () => {
    render(
      <LessonIndex items={items} activeLessonId="level1-create-list" />,
    )

    expect(screen.getByRole('heading', { name: 'Nivel 1' })).toBeInTheDocument()
    expect(screen.getByText('Completada')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Crear y listar contenedores/ }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('notifies the selected lesson', async () => {
    const user = userEvent.setup()
    const onSelectLesson = vi.fn()

    render(
      <LessonIndex
        items={items}
        activeLessonId="level1-create-list"
        onSelectLesson={onSelectLesson}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: /Inspeccionar contenedores/ }),
    )

    expect(onSelectLesson).toHaveBeenCalledWith('level1-inspect')
  })
})
