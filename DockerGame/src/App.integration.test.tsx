import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { LEVEL1_CREATE_LIST_LESSON_ID } from './content/lessons/level1-create-list'
import { PROGRESS_STORAGE_KEY } from './ui/storage/progressStorage'
import { createFakeTerminalFactory } from './test/fakeTerminal'

type User = Awaited<ReturnType<typeof userEvent.setup>>

async function submitCommand(user: User, command: string) {
  const input = screen.getByLabelText('Comando')

  await user.clear(input)
  await user.type(input, `${command}{Enter}`)
}

async function checkStep(user: User) {
  await user.click(screen.getByRole('button', { name: 'Comprobar' }))
}

async function advanceStep(user: User) {
  await user.click(screen.getByRole('button', { name: 'Avanzar' }))
}

function renderApp() {
  return render(<App terminalFactory={createFakeTerminalFactory()} />)
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('recorrido completo de la lección', () => {
  it('crea, lista, provoca errores, corrige y completa la lección', async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp()

    expect(screen.getByRole('button', { name: 'Avanzar' })).toBeDisabled()

    await submitCommand(user, 'docker ps')
    expect(
      within(screen.getByRole('log')).getByText(
        'No hay contenedores activos.',
      ),
    ).toBeInTheDocument()
    await checkStep(user)
    expect(screen.getByRole('status')).toHaveTextContent('Correcto')
    expect(screen.getByRole('button', { name: 'Avanzar' })).toBeEnabled()
    await advanceStep(user)

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Crea el contenedor web',
      }),
    ).toBeInTheDocument()
    await submitCommand(user, 'docker run -d --name web nginx')
    expect(
      within(
        screen.getAllByRole('region', { name: /Contenedores/i })[
          screen.getAllByRole('region', { name: /Contenedores/i }).length - 1
        ],
      ).getByText('web'),
    ).toBeInTheDocument()
    await checkStep(user)
    expect(screen.getByText('Paso superado')).toBeInTheDocument()
    await advanceStep(user)

    await submitCommand(user, 'docker ps')
    await checkStep(user)
    await advanceStep(user)

    await submitCommand(user, 'docker run -d --name web nginx')
    expect(
      within(screen.getByRole('log')).getByText(
        /Ya existe un contenedor llamado "web"/,
      ),
    ).toBeInTheDocument()
    await checkStep(user)
    await advanceStep(user)

    await submitCommand(user, 'docker run -d --name web2 nginx:inexistente')
    expect(
      within(screen.getByRole('log')).getByText(
        /No se encontró la imagen "nginx:inexistente"/,
      ),
    ).toBeInTheDocument()
    await checkStep(user)
    await advanceStep(user)

    await submitCommand(user, 'docker run -d --name web2 nginx')
    await submitCommand(user, 'docker ps')
    const containersPanels = screen.getAllByRole('region', {
      name: /Contenedores/i,
    })
    const containersPanel = containersPanels[containersPanels.length - 1]

    expect(within(containersPanel).getByText('web')).toBeInTheDocument()
    expect(within(containersPanel).getByText('web2')).toBeInTheDocument()
    expect(
      within(screen.getByRole('log')).getByText(
        /container-2\s+web2\s+nginx\s+running/,
      ),
    ).toBeInTheDocument()
    await checkStep(user)
    expect(screen.getByRole('button', { name: 'Avanzar' })).toBeEnabled()
    await advanceStep(user)

    expect(
      screen.getByText(
        'Lección completada. Puedes practicar de nuevo sin perder la insignia del índice.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('complementary')).toHaveTextContent('Completada')

    const storedProgress = JSON.parse(
      window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? '{}',
    )

    expect(storedProgress).toEqual({
      version: 1,
      completedLessonIds: [LEVEL1_CREATE_LIST_LESSON_ID],
    })

    unmount()
    renderApp()

    expect(screen.getByRole('complementary')).toHaveTextContent('Completada')
  })

  it('bloquea docker run en el paso de lista vacía y muestra la pista', async () => {
    const user = userEvent.setup()
    renderApp()

    await submitCommand(user, 'docker run -d --name web nginx')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ejecuta exactamente "docker ps". En este primer paso todavía no puedes crear contenedores.',
    )
    expect(screen.getByText(/Sin contenedores/i)).toBeInTheDocument()

    await checkStep(user)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ejecuta exactamente "docker ps". En este primer paso todavía no puedes crear contenedores.',
    )
    expect(screen.getByRole('button', { name: 'Avanzar' })).toBeDisabled()
  })
})
