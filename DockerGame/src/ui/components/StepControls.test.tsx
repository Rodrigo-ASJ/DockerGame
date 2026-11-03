import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StepControls } from './StepControls'

describe('StepControls', () => {
  it('keeps Avanzar disabled until the step is passed', async () => {
    const user = userEvent.setup()
    const onCheck = vi.fn()
    const onAdvance = vi.fn()

    render(
      <StepControls
        canCheck
        canAdvance={false}
        isLastStep={false}
        onCheck={onCheck}
        onAdvance={onAdvance}
      />,
    )

    expect(screen.getByRole('button', { name: 'Avanzar' })).toBeDisabled()
    expect(
      screen.getByText('Supera el paso con «Comprobar» para habilitar «Avanzar».'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Comprobar' }))
    await user.click(screen.getByRole('button', { name: 'Avanzar' }))

    expect(onCheck).toHaveBeenCalledTimes(1)
    expect(onAdvance).not.toHaveBeenCalled()
  })

  it('enables both actions when the step is passed', async () => {
    const user = userEvent.setup()
    const onCheck = vi.fn()
    const onAdvance = vi.fn()

    render(
      <StepControls
        canCheck
        canAdvance
        isLastStep={false}
        onCheck={onCheck}
        onAdvance={onAdvance}
      />,
    )

    expect(
      screen.getByText('Paso superado. Ya puedes avanzar.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Comprobar' }))
    await user.click(screen.getByRole('button', { name: 'Avanzar' }))

    expect(onCheck).toHaveBeenCalledTimes(1)
    expect(onAdvance).toHaveBeenCalledTimes(1)
  })

  it('announces that the next advance completes the lesson', () => {
    render(
      <StepControls
        canCheck
        canAdvance
        isLastStep
        onCheck={() => undefined}
        onAdvance={() => undefined}
      />,
    )

    expect(
      screen.getByText('Paso superado. Avanza para completar la lección.'),
    ).toBeInTheDocument()
  })

  it('disables Comprobar when checking is not available', () => {
    render(
      <StepControls
        canCheck={false}
        canAdvance={false}
        isLastStep={false}
        onCheck={() => undefined}
        onAdvance={() => undefined}
      />,
    )

    expect(screen.getByRole('button', { name: 'Comprobar' })).toBeDisabled()
  })
})
