import { useId } from 'react'

type DockerfileEditorProps = {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly disabled?: boolean
}

/**
 * Editor de Dockerfile: un `<textarea>` accesible por teclado, sin resaltado
 * ni autocompletado, con etiqueta y ayuda visibles.
 */
export function DockerfileEditor({
  value,
  onChange,
  disabled = false,
}: DockerfileEditorProps) {
  const labelId = useId()
  const helpId = useId()

  return (
    <div className="space-y-2">
      <label
        htmlFor={labelId}
        className="tc-label block mb-1"
      >
        Dockerfile
      </label>
      <textarea
        id={labelId}
        aria-describedby={helpId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        wrap="off"
        className="font-mono text-sm leading-relaxed text-bone bg-ink border-4 border-ink p-3 shadow-[3px_3px_0_#0b0a0a] min-h-[240px] resize-y focus:outline-none"
      />
      <p id={helpId} className="tc-label text-[0.58rem] text-bone/60">
        Edita el contenido del Dockerfile. Solo instrucciones FROM, WORKDIR, COPY, RUN, CMD y ENTRYPOINT.
      </p>
    </div>
  )
}
