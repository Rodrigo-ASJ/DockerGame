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
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onCheck}
        disabled={!canCheck}
        className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        Comprobar
      </button>
      <button
        type="button"
        onClick={onAdvance}
        disabled={!canAdvance}
        className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-400 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
      >
        Avanzar
      </button>
      <p className="text-xs text-slate-500" aria-live="polite">
        {canAdvance
          ? isLastStep
            ? 'Paso superado. Avanza para completar la lección.'
            : 'Paso superado. Ya puedes avanzar.'
          : 'Supera el paso con «Comprobar» para habilitar «Avanzar».'}
      </p>
    </div>
  )
}
