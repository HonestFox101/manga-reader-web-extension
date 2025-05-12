// generate stub index.html files for dev entry
import { execSync } from 'node:child_process'
import chokidar from 'chokidar'
import { isDev, r } from './utils'

function writeManifest() {
  execSync('npx esno ./scripts/manifest.ts', { stdio: 'inherit' })
}

writeManifest()

if (isDev) {
  chokidar.watch([r('src/manifest.ts'), r('package.json')])
    .on('change', () => {
      writeManifest()
    })
}
