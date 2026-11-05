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

async function typeDockerfile(user: User, text: string) {
  const editor = screen.getByLabelText('Dockerfile')
  await user.clear(editor)
  if (text.length > 0) {
    await user.type(editor, text)
  }
}

async function completeLevel1(user: User) {
  // Paso 1: docker ps
  await submitCommand(user, 'docker ps')
  await checkStep(user)
  await advanceStep(user)

  // Paso 2: docker run -d --name web nginx
  await submitCommand(user, 'docker run -d --name web nginx')
  await checkStep(user)
  await advanceStep(user)

  // Paso 3: docker ps
  await submitCommand(user, 'docker ps')
  await checkStep(user)
  await advanceStep(user)

  // Paso 4: duplicate name error
  await submitCommand(user, 'docker run -d --name web nginx')
  await checkStep(user)
  await advanceStep(user)

  // Paso 5: imagen inexistente + web2 correcto + ps
  await submitCommand(user, 'docker run -d --name web2 nginx:inexistente')
  await checkStep(user)
  await advanceStep(user)
  await submitCommand(user, 'docker run -d --name web2 nginx')
  await submitCommand(user, 'docker ps')
  await checkStep(user)
  await advanceStep(user)
}

function clickIndexLesson(title: string) {
  return screen.getByRole('button', { name: new RegExp(title) })
}

describe('nivel 2: desbloqueo, recorrido completo y persistencia', () => {
  it('mantiene el nivel 2 bloqueado hasta completar el nivel 1', async () => {
    const user = userEvent.setup()
    renderApp()

    const index = screen.getByRole('complementary')
    const locked = within(index).getByRole('button', { name: /Imágenes y capas/ })

    expect(locked).toHaveAttribute('aria-disabled', 'true')
    expect(locked).not.toHaveAttribute('disabled')

    await user.click(locked)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Para abrir «Imágenes y capas» primero completa «Crear y listar contenedores».',
    )
  })

  it('desbloquea el nivel 2 tras completar el nivel 1', async () => {
    const user = userEvent.setup()
    renderApp()

    await completeLevel1(user)

    const index = screen.getByRole('complementary')
    const available = within(index).getByRole('button', {
      name: /Imágenes y capas/,
    })

    expect(available).not.toHaveAttribute('aria-disabled')
    expect(screen.getByRole('complementary')).toHaveTextContent('Completada')
  })

  it(
    'recorre las cuatro lecciones del nivel 2, comprueba caché y tamaños, y persiste tras recarga',
    { timeout: 60000 },
    async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp()

    await completeLevel1(user)

    // ── Lección 2.1: imágenes y capas ──
    await user.click(clickIndexLesson('Imágenes y capas'))

    await submitCommand(user, 'docker images')
    await checkStep(user)
    await advanceStep(user)

    await submitCommand(user, 'docker history nginx:latest')
    await checkStep(user)
    await advanceStep(user)

    await submitCommand(user, 'docker history nginx:alpine')
    await checkStep(user)
    await advanceStep(user)

    await submitCommand(user, 'docker history nginx:no-existe')
    await checkStep(user)
    await advanceStep(user)

    await submitCommand(user, 'docker run -d --name web nginx:alpine')
    await checkStep(user)
    expect(screen.getByText('Paso superado')).toBeInTheDocument()
    await advanceStep(user)

    expect(
      within(screen.getByRole('complementary')).getByRole('button', {
        name: /Imágenes y capas/,
      }),
    ).toHaveTextContent('Completada')

    // ── Lección 2.2: primer Dockerfile ──
    await user.click(clickIndexLesson('Primer Dockerfile'))

    const dockerfile22 = [
      'FROM nginx:latest',
      'WORKDIR /usr/share/nginx/html',
      'COPY index.html .',
      'COPY app.js .',
      'COPY styles.css .',
      'RUN echo listo',
      'CMD nginx -g daemon off;',
    ].join('\n')

    // Paso 2.2.1: FROM + WORKDIR
    await typeDockerfile(user, 'FROM nginx:latest\nWORKDIR /usr/share/nginx/html')
    await checkStep(user)
    await advanceStep(user)

    // Paso 2.2.2: COPYs
    await typeDockerfile(
      user,
      'FROM nginx:latest\nWORKDIR /usr/share/nginx/html\nCOPY index.html .\nCOPY app.js .\nCOPY styles.css .',
    )
    await checkStep(user)
    await advanceStep(user)

    // Paso 2.2.3: RUN + CMD
    await typeDockerfile(user, dockerfile22)
    await checkStep(user)
    await advanceStep(user)

    // Paso 2.2.4: build mi-sitio:1.0 (187 MB)
    await submitCommand(user, 'docker build -t mi-sitio:1.0 .')
    await checkStep(user)
    await advanceStep(user)

    // Paso 2.2.5: run sitio
    await submitCommand(user, 'docker run -d --name sitio mi-sitio:1.0')
    await checkStep(user)
    await advanceStep(user)

    expect(
      within(screen.getByRole('complementary')).getByRole('button', {
        name: /Primer Dockerfile/,
      }),
    ).toHaveTextContent('Completada')

    // ── Lección 2.3: errores de construcción ──
    await user.click(clickIndexLesson('Errores de construcción'))

    // 2.3.1: Dockerfile vacío -> missing-from
    await typeDockerfile(user, '')
    await submitCommand(user, 'docker build -t errores:0.0 .')
    await checkStep(user)
    await advanceStep(user)

    // 2.3.2: FROM no primero -> from-not-first
    await typeDockerfile(user, 'WORKDIR /app\nFROM nginx:latest')
    await submitCommand(user, 'docker build -t errores:0.1 .')
    await checkStep(user)
    await advanceStep(user)

    // 2.3.3: RUN exit 1 -> run-failed
    await typeDockerfile(
      user,
      'FROM nginx:latest\nWORKDIR /app\nCOPY index.html .\nCMD nginx\nRUN exit 1',
    )
    await submitCommand(user, 'docker build -t errores:0.2 .')
    await checkStep(user)
    await advanceStep(user)

    // 2.3.4: falta CMD/ENTRYPOINT -> missing-start-command
    await typeDockerfile(
      user,
      'FROM nginx:latest\nWORKDIR /app\nCOPY index.html .\nRUN echo ok',
    )
    await submitCommand(user, 'docker build -t errores:0.3 .')
    await checkStep(user)
    await advanceStep(user)

    // 2.3.5: tag inválido -> invalid-image-tag
    await typeDockerfile(user, dockerfile22)
    await submitCommand(user, 'docker build -t Mi-Sitio:1.0 .')
    await checkStep(user)
    await advanceStep(user)

    // 2.3.6: tag duplicado -> duplicate-image-tag
    await submitCommand(user, 'docker build -t nginx:latest .')
    await checkStep(user)
    await advanceStep(user)

    // 2.3.7: run de imagen cuya build falló -> image-build-failed
    await typeDockerfile(
      user,
      'FROM nginx:latest\nRUN exit 1\nCMD nginx',
    )
    await submitCommand(user, 'docker build -t errores:0.4 .')
    await submitCommand(user, 'docker run -d --name roto errores:0.4')
    await checkStep(user)
    await advanceStep(user)

    // 2.3.8: recuperar -> errores:1.0
    await typeDockerfile(user, dockerfile22)
    await submitCommand(user, 'docker build -t errores:1.0 .')
    await submitCommand(user, 'docker run -d --name errores errores:1.0')
    await checkStep(user)
    await advanceStep(user)

    expect(
      within(screen.getByRole('complementary')).getByRole('button', {
        name: /Errores de construcción/,
      }),
    ).toHaveTextContent('Completada')

    // ── Lección 2.4: ENTRYPOINT, caché y tamaño ──
    await user.click(clickIndexLesson('ENTRYPOINT, caché y tamaño'))

    const dockerfile24 = [
      'FROM nginx:latest',
      'WORKDIR /usr/share/nginx/html',
      'COPY index.html .',
      'COPY app.js .',
      'COPY styles.css .',
      'RUN echo Sitio listo',
      'CMD nginx -g daemon off;',
      'ENTRYPOINT nginx',
    ].join('\n')

    // 2.4.1: ENTRYPOINT + CMD
    await typeDockerfile(user, dockerfile24)
    await checkStep(user)
    await advanceStep(user)

    // 2.4.2: build optimizada:1.0 (187 MB)
    await submitCommand(user, 'docker build -t optimizada:1.0 .')
    await checkStep(user)
    await advanceStep(user)

    // 2.4.3: rebuild sin cambios -> todo caché
    await submitCommand(user, 'docker build -t optimizada:1.1 .')
    await checkStep(user)
    await advanceStep(user)

    // 2.4.4: cambiar RUN intermedio -> caché parcial
    const dockerfile24Changed = dockerfile24.replace('RUN echo Sitio listo', 'RUN echo Sitio listo y actualizado')
    await typeDockerfile(user, dockerfile24Changed)
    await submitCommand(user, 'docker build -t optimizada:1.2 .')
    await checkStep(user)
    await advanceStep(user)

    // 2.4.5: cambiar base a alpine -> 43 MB
    const dockerfile24Alpine = dockerfile24Changed.replace('FROM nginx:latest', 'FROM nginx:alpine')
    await typeDockerfile(user, dockerfile24Alpine)
    await submitCommand(user, 'docker build -t optimizada:2.0 .')
    await checkStep(user)
    await advanceStep(user)

    // 2.4.6: comparación 187 MB vs 43 MB (solo Comprobar)
    await checkStep(user)
    await advanceStep(user)

    // 2.4.7: run optimizada
    await submitCommand(user, 'docker run -d --name optimizada optimizada:2.0')
    await checkStep(user)
    await advanceStep(user)

    // Nivel 2 completado en el índice
    expect(
      screen.getByRole('complementary'),
    ).toHaveTextContent('Nivel completado')

    // ── Persistencia tras recarga ──
    const storedBefore = JSON.parse(
      window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? '{}',
    )
    expect(storedBefore.completedLessonIds).toContain(
      'level2-04-entrypoint-cache-size',
    )

    // Simular recarga: desmontar y volver a renderizar.
    unmount()
    renderApp()

    const indexAfter = screen.getByRole('complementary')
    expect(indexAfter).toHaveTextContent('Completada')
    // Todas las lecciones del nivel 2 siguen completadas y ninguna bloqueada.
    expect(
      within(indexAfter).getByRole('button', { name: /Imágenes y capas/ }),
    ).toHaveTextContent('Completada')
    expect(
      within(indexAfter).getByRole('button', { name: /ENTRYPOINT, caché y tamaño/ }),
    ).toHaveTextContent('Completada')

    const lockedAfter = within(indexAfter).getAllByRole('button').filter(
      (button) => button.getAttribute('aria-disabled') === 'true',
    )
    expect(lockedAfter).toHaveLength(0)

    // El progreso sigue guardado.
    const storedAfter = JSON.parse(
      window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? '{}',
    )
    expect(storedAfter.completedLessonIds).toContain(
      'level2-04-entrypoint-cache-size',
    )
  })
})
