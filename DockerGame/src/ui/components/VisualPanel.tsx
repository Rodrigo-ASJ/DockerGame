import type { ReactNode } from 'react'
import type { Container, Image } from '../../core/types'
import { ImageComparison } from './ImageComparison'
import { ImageLayersPanel } from './ImageLayersPanel'
import { ImageStartCommand } from './ImageStartCommand'
import { ImagesPanel } from './ImagesPanel'
import { ProjectFilesPanel } from './ProjectFilesPanel'

type VisualPanelProps = {
  readonly containers: readonly Container[]
  readonly images: readonly Image[]
  readonly selectedImage: string | null
  readonly projectFiles?: readonly {
    readonly path: string
    readonly content: string
    readonly sizeKb: number
  }[]
  readonly baseReference?: string | null
  readonly comparison?: {
    readonly baselineReference: string
    readonly optimizedReference: string
  }
}

/**
 * Panel visual compuesto. Renderiza, en este orden, solo las secciones que
 * tienen datos disponibles:
 *
 * 1. Proyecto y contexto (solo con projectFiles)
 * 2. Imágenes (todas, base y construidas)
 * 3. Capas de la imagen seleccionada (solo si hay selección)
 * 4. Arranque (solo imagen seleccionada construida)
 * 5. Comparación (solo si existen ambas referencias)
 * 6. Contenedores
 */
export function VisualPanel({
  containers,
  images,
  selectedImage,
  projectFiles,
  baseReference = null,
  comparison,
}: VisualPanelProps) {
  const selectedImageObj =
    selectedImage === null
      ? null
      : images.find((image) => image.reference === selectedImage) ?? null

  const sections: Array<{
    readonly id: string
    readonly title: string
    readonly element: ReactNode
  }> = []

  if (projectFiles !== undefined && projectFiles.length > 0) {
    sections.push({
      id: 'project-files',
      title: 'Espacio de trabajo · Proyecto',
      element: (
        <ProjectFilesPanel
          key="project-files"
          projectFiles={projectFiles}
          baseReference={baseReference}
        />
      ),
    })
  }

  if (images.length > 0) {
    sections.push({
      id: 'images',
      title: 'Imágenes',
      element: <ImagesPanel key="images" images={images} />,
    })
  }

  sections.push({
    id: 'image-layers',
    title: 'Capas de la imagen',
    element: (
      <ImageLayersPanel
        key="image-layers"
        image={selectedImageObj}
      />
    ),
  })

  if (selectedImageObj !== null && selectedImageObj.origin === 'built') {
    sections.push({
      id: 'image-start-command',
      title: 'Comando de arranque',
      element: (
        <ImageStartCommand
          key="image-start-command"
          image={selectedImageObj}
        />
      ),
    })
  }

  if (
    comparison !== undefined &&
    images.some((image) => image.reference === comparison.baselineReference) &&
    images.some((image) => image.reference === comparison.optimizedReference)
  ) {
    sections.push({
      id: 'image-comparison',
      title: 'Comparación de tamaños',
      element: (
        <ImageComparison
          key="image-comparison"
          images={images}
          baselineReference={comparison.baselineReference}
          optimizedReference={comparison.optimizedReference}
        />
      ),
    })
  }

  sections.push({
    id: 'containers',
    title: 'Runtime · Contenedores',
    element: (
      <ContainersSection key="containers" containers={containers} />
    ),
  })

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section
          key={section.id}
          aria-labelledby={`${section.id}-title`}
          className="tc-card tc-wobble-sm relative overflow-hidden p-4 sm:p-6"
        >
          <div aria-hidden="true" className="tc-stripe text-acid" />
          <div className="relative">
            {section.element}
          </div>
        </section>
      ))}
    </div>
  )
}

function ContainersSection({
  containers,
}: {
  readonly containers: readonly Container[]
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3 w-3 border-2 border-ink bg-mutant shadow-[2px_2px_0_#0b0a0a]"
          />
          <h2
            id="containers-title"
            className="font-display text-lg leading-none tracking-wide text-bone sm:text-xl"
          >
            Runtime · Contenedores
          </h2>
        </div>
        <span className="tc-badge">
          {containers.length.toString().padStart(2, '0')}
        </span>
      </div>

      {containers.length === 0 ? (
        <div className="mt-5 border-4 border-dashed border-mud bg-ink/30 p-6 text-center">
          <p className="font-display text-base uppercase tracking-wide text-bone">
            Sin contenedores
          </p>
          <p className="mt-2 text-sm leading-relaxed text-bone/60">
            Usa{' '}
            <code className="border-2 border-ink bg-ink px-1.5 py-0.5 font-mono text-xs font-bold text-acid">
              docker run
            </code>{' '}
            para instanciar uno.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-4">
          {containers.map((container) => (
            <li key={container.id} className="tc-container-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm font-bold text-bone">
                  {container.name}
                </p>
                <span className="tc-badge">UP</span>
              </div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="font-mono text-[0.58rem] font-bold uppercase tracking-[0.18em] text-bone/55">
                  CONTAINER_ID
                </dt>
                <dd className="break-all font-mono text-bone/80">
                  {container.id}
                </dd>
                <dt className="font-mono text-[0.58rem] font-bold uppercase tracking-[0.18em] text-bone/55">
                  IMAGE
                </dt>
                <dd className="break-all font-mono text-bone/80">
                  {container.image}
                </dd>
                {container.command !== undefined && container.command.length > 0 && (
                  <>
                    <dt className="font-mono text-[0.58rem] font-bold uppercase tracking-[0.18em] text-bone/55">
                      COMANDO
                    </dt>
                    <dd className="break-all font-mono text-bone/80">
                      {container.command.join(' ')}
                    </dd>
                  </>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
