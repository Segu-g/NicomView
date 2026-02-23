import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync } from 'fs'
import { resolve } from 'path'

const rootDir = resolve(import.meta.dirname, '..')

const plugins = ['comment-list', 'comment-cards']

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

    const settingsHtml = resolve(rootDir, 'src/plugins', pluginId, 'settings.html')
    if (existsSync(settingsHtml)) {
      console.log(`\nBuilding settings: ${pluginId}`)
      await build({
        root: resolve(rootDir, 'src/plugins', pluginId),
        base: './',
        plugins: [react()],
        build: {
          outDir: resolve(rootDir, 'resources/plugins', pluginId, 'settings'),
          emptyOutDir: true,
          rollupOptions: {
            input: settingsHtml,
          },
        },
      })
      console.log(`Done settings: ${pluginId}`)
    }
  }
}

buildPlugins().catch((err) => {
  console.error(err)
  process.exit(1)
})
