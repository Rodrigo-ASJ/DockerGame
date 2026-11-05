import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Lesson, LessonStep } from '../../core/types'
import { createFakeTerminalFactory } from '../../test/fakeTerminal'
import { LessonView } from './LessonView'

const EDITOR_STEP: LessonStep = {
  id: '2.2.1',
  title: 'Define la base',
  instruction: 'Escribe FROM nginx:latest.',
  allowedCommands: [],
  checker: () => true,
  successMessage: 'Bien.',
  errorHint: 'Revisa.',
}

const COMMAND_STEP: LessonStep = {
  id: '2.2.4',
  title: 'Construye',
  instruction: 'Ejecuta docker build.',
  allowedCommands: ['build', 'images'],
  checker: () => true,
  successMessage: 'Bien.',
  errorHint: 'Revisa.',
}

function makeLesson(overrides: {
  steps: readonly LessonStep[]
  workspace?: NonNullable<Lesson['workspace']>
}): Lesson {
  return {
    id: 'level2-02-first-dockerfile',
    level: 2,
    title: 'Primer Dockerfile',
    objective: 'Escribe un Dockerfile.',
    explanation: 'Explicación en español.',
    diagram: { title: 'Diagrama', steps: [] },
    availableCommands: ['ps', 'run', 'images', 'history', 'build'],
    workspace: overrides.workspace,
    steps: overrides.steps,
  }
}

function renderLessonView(overrides: {
  steps: readonly LessonStep[]
  workspace?: NonNullable<Lesson['workspace']>
  currentStepIndex?: number
}) {
  const lesson = makeLesson(overrides)
  const currentStepIndex = overrides.currentStepIndex ?? 0
  const currentStep = lesson.steps[currentStepIndex]

  const utils = render(
    <LessonView
      lesson={lesson}
      simState={{
        containers: [],
        images: [],
        projectFiles: [],
        builds: [],
        selectedImage: null,
        lastError: null,
        nextContainerNumber: 1,
        nextImageNumber: 1,
        nextBuildNumber: 1,
        log: [],
      }}
      currentStep={currentStep}
      currentStepNumber={currentStepIndex + 1}
      totalSteps={lesson.steps.length}
      isStepPassed={false}
      isLessonCompleted={false}
      feedback={null}
      terminalEntries={[]}
      dockerfile=""
      onDockerfileChange={() => undefined}
      onRunCommand={() => undefined}
      onCheckStep={() => undefined}
      onAdvance={() => undefined}
      terminalFactory={createFakeTerminalFactory()}
    />,
  )

  return { lesson, currentStep, ...utils }
}

describe('LessonView', () => {
  it('muestra «Comprobar» en todos los pasos', () => {
    const { getByRole } = renderLessonView({ steps: [EDITOR_STEP] })

    expect(getByRole('button', { name: 'Comprobar' })).toBeInTheDocument()
  })

  it('muestra el mensaje de solo editor cuando la allowlist está vacía', () => {
    const { getByText } = renderLessonView({ steps: [EDITOR_STEP] })

    expect(
      getByText(/Solo editor: edita el Dockerfile y pulsa «Comprobar»\./),
    ).toBeInTheDocument()
  })

  it('muestra las etiquetas de los cinco comandos en español', () => {
    const { getByText } = renderLessonView({ steps: [COMMAND_STEP] })

    expect(getByText('docker build -t <nombre> .')).toBeInTheDocument()
    expect(getByText('docker images')).toBeInTheDocument()
  })

  it('renderiza el editor y el panel de proyecto solo con workspace', () => {
    const { getByLabelText, container } = renderLessonView({
      steps: [EDITOR_STEP],
      workspace: {
        projectFiles: [
          { path: 'index.html', content: '<h1>', sizeKb: 2 },
        ],
        initialDockerfile: 'FROM nginx:latest',
      },
    })

    expect(getByLabelText('Dockerfile')).toBeInTheDocument()
    expect(container.textContent).toContain('index.html')
    expect(container.textContent).toContain('2 KB')
    expect(container).toBeInTheDocument()
  })

  it('no renderiza el editor sin workspace', () => {
    const { queryByLabelText } = renderLessonView({ steps: [COMMAND_STEP] })

    expect(queryByLabelText('Dockerfile')).not.toBeInTheDocument()
  })
})
