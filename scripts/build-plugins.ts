import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const rootDir = resolve(import.meta.dirname, '..')

const plugins = ['md3-comment-list', 'comment-cards']

async function buildPlugins() {
  for (const pluginId of plugins) {
    console.log(`\nBuilding plugin: ${pluginId}`)
    await build({
      root: resolve(rootDir, 'src/plugins', pluginId),
      base: './',
      plugins: [react()],
      build: {
        outDir: resolve(rootDir, 'resources/plugins', pluginId, 'overlay'),
        emptyOutDir: true,
      },
    })
    console.log(`Done: ${pluginId}`)
  }
}

buildPlugins().catch((err) => {
  console.error(err)
  process.exit(1)
})
