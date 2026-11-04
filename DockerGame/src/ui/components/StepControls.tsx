type StepControlsProps = {
  readonly canCheck: boolean
  readonly canAdvance: boolean
  readonly isLastStep: boolean
  readonly onCheck: () => void
  readonly onAdvance: () => void
}

export function StepControls({
  canCheck,
  canAdvance,
  isLastStep,
  onCheck,
  onAdvance,
}: StepControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={onCheck}
        disabled={!canCheck}
        className="tc-button"
      >
        Comprobar
      </button>
      <button
        type="button"
        onClick={onAdvance}
        disabled={!canAdvance}
        className="tc-button tc-button--ghost"
      >
        Avanzar
      </button>
      <p
        className="max-w-md font-mono text-[0.65rem] font-bold uppercase leading-relaxed tracking-[0.1em] text-bone/65"
        aria-live="polite"
      >
        {canAdvance
          ? isLastStep
            ? 'Paso superado. Avanza para completar la lección.'
            : 'Paso superado. Ya puedes avanzar.'
          : 'Supera el paso con «Comprobar» para habilitar «Avanzar».'}
      </p>
    </div>
  )
}
