import type { ProjectFile } from '../../core/types'

export const STATIC_SITE_PROJECT_ID = 'static-site'

export const staticSiteFiles: readonly ProjectFile[] = [
  {
    path: 'index.html',
    content: '<!DOCTYPE html>\n<html lang="es">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Sitio estático</title>\n  </head>\n  <body>\n    <h1>Sitio estático</h1>\n    <script src="app.js"></script>\n    <link rel="stylesheet" href="styles.css" />\n  </body>\n</html>',
    sizeKb: 2,
  },
  {
    path: 'app.js',
    content: "console.log('Sitio estático listo');",
    sizeKb: 3,
  },
  {
    path: 'styles.css',
    content: 'body {\n  font-family: sans-serif;\n}',
    sizeKb: 1,
  },
]

export type StaticSiteProject = {
  readonly id: string
  readonly title: string
  readonly files: readonly ProjectFile[]
}

export const staticSiteProject: StaticSiteProject = {
  id: STATIC_SITE_PROJECT_ID,
  title: 'Sitio estático',
  files: staticSiteFiles,
}
