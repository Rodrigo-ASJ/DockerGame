import type { ProjectFile } from '../../core/types'
import { formatSize } from '../../core/images'

type ProjectFilesPanelProps = {
  readonly projectFiles: readonly ProjectFile[]
  readonly baseReference?: string | null
}

/**
 * Panel de archivos del proyecto: solo consulta, sin edición. Accesible por
 * teclado (Tab/Enter) mediante botones que expanden el contenido de cada
 * archivo.
 */
export function ProjectFilesPanel({
  projectFiles,
  baseReference,
}: ProjectFilesPanelProps) {
  const totalKb = projectFiles.reduce(
    (total, file) => total + file.sizeKb,
    0,
  )

  return (
    <section
      aria-labelledby="project-files-title"
      className="tc-card tc-wobble-sm relative overflow-hidden p-4 sm:p-6"
    >
      <div aria-hidden="true" className="tc-stripe text-mutant" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-3 border-2 border-ink bg-mutant shadow-[2px_2px_0_#0b0a0a]"
            />
            <h2
              id="project-files-title"
              className="font-display text-lg leading-none tracking-wide text-bone sm:text-xl"
            >
              Espacio de trabajo · Proyecto
            </h2>
          </div>
          <span className="tc-badge tc-badge--muted">
            {formatSize(totalKb)}
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-bone/75">
          Contexto de construcción: <code className="border-2 border-ink bg-ink px-1.5 py-0.5 font-mono text-xs font-bold text-acid">.</code>{' '}
          {baseReference !== null && baseReference !== undefined ? (
            <>
              {' '}
              Imagen base:
              <code className="border-2 border-ink bg-ink px-1.5 py-0.5 font-mono text-xs font-bold text-acid">
                {baseReference}
              </code>
            </>
          ) : (
            <>
              {' '}
              Imagen base: <span className="text-bone/50">sin definir</span>
            </>
          )}
        </p>

        <ul className="mt-5 space-y-3">
          {projectFiles.length === 0 ? (
            <li className="text-center py-4 text-bone/50 text-sm">
              Sin archivos en el proyecto.
            </li>
          ) : (
            projectFiles.map((file) => (
              <li key={file.path} className="border-4 border-ink bg-surface-2 p-3 shadow-[3px_3px_0_#0b0a0a]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <button
                    type="button"
                    aria-expanded={false}
                    aria-controls={`project-file-content-${file.path}`}
                    className="flex items-center gap-2 w-full text-left font-mono text-sm font-bold text-bone"
                  >
                    {file.path}
                    <span className="text-xs text-bone/50">
                      {formatSize(file.sizeKb)}
                    </span>
                  </button>
                </div>
                <div
                  id={`project-file-content-${file.path}`}
                  className="pre-wrap p-2 border-2 border-mud bg-ink text-[0.62rem] font-mono text-bone/80 overflow-x-auto"
                >
                  {file.content}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  )
}
