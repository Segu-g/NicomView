/**
 * Screenshot capture script for docs site.
 * Launches the built Electron app, broadcasts mock data, and captures screenshots.
 *
 * Usage: npm run capture-screenshots
 */

import { _electron as electron } from 'playwright'
import { createRequire } from 'module'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const projectRoot = path.resolve(__dirname, '..')
const electronBin = require('electron') as unknown as string
const mainEntry = path.join(projectRoot, 'out/main/index.js')
const outDir = path.join(projectRoot, 'docs-src/public/img/screenshots')

fs.mkdirSync(outDir, { recursive: true })

const mockComments = [
  { event: 'comment', data: { content: 'わこつなのだ', userName: 'ずんだmong', userIconUrl: '' } },
  { event: 'comment', data: { content: 'わこー', userName: 'たんぽP', userIconUrl: '' } },
  { event: 'comment', data: { content: '何も聞こえないのだ', userName: 'ずんだmong', userIconUrl: '' } },
  { event: 'operatorComment', data: { content: 'あれ？', userName: '宇宙羊' } },
  { event: 'operatorComment', data: { content: '虚無に向かって話してました...', userName: '宇宙羊' } },
  { event: 'comment', data: { content: 'カレー美味しい！', userName: '埼玉県民', userIconUrl: '' } },
  { event: 'comment', data: { content: 'ぐへへ', userName: 'たんぽP', userIconUrl: '' } },
  { event: 'notification', data: { message: '放送を延長しました' } },
  { event: 'comment', data: { content: 'ずんだアロー構文すき', userName: 'プログラマー兼P', userIconUrl: '' } },
  { event: 'comment', data: { content: 'なのだ〜', userName: 'ずんだもん', userIconUrl: '' } },
]

// Subset for cards (fewer items, broadcast with delays)
const cardEvents = mockComments;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main(): Promise<void> {
  console.log('Launching Electron app...')
  const app = await electron.launch({
    executablePath: electronBin,
    args: ['--no-sandbox', mainEntry],
    env: { ...process.env, NODE_ENV: 'test' },
  })

  try {
    const mainPage = await app.firstWindow()
    await mainPage.waitForLoadState('domcontentloaded')
    await sleep(2000) // Wait for React to fully render

    // 1. Main window screenshot
    console.log('Capturing main-window.png...')
    await mainPage.screenshot({
      path: path.join(outDir, 'main-window.png'),
    })
    console.log('  Done.')

    // 2. TTS settings screenshot (expand TTS section)
    console.log('Capturing tts-settings.png...')
    // TTS section should already be visible with engine settings expanded by default
    // Expand event settings too
    const eventToggle = mainPage.locator('text=イベント設定')
    if (await eventToggle.isVisible()) {
      await eventToggle.click()
      await sleep(500)
    }
    const audioToggle = mainPage.locator('text=音声調整')
    if (await audioToggle.isVisible()) {
      await audioToggle.click()
      await sleep(500)
    }
    // Scroll to TTS card and capture
    const ttsCard = mainPage.locator('text=読み上げ設定').first()
    if (await ttsCard.isVisible()) {
      await ttsCard.scrollIntoViewIfNeeded()
    }
    await sleep(300)
    await mainPage.screenshot({
      path: path.join(outDir, 'tts-settings.png'),
    })
    console.log('  Done.')

    // 3. Comment list overlay
    console.log('Capturing comment-list.png...')
    const commentListWinId = await app.evaluate(async ({ BrowserWindow }) => {
      const win = new BrowserWindow({
        width: 400,
        height: 700,
        webPreferences: { contextIsolation: false, nodeIntegration: false },
      })
      await win.loadURL('http://localhost:3939/plugins/comment-list/overlay/?fontSize=14')
      return win.id
    })

    await sleep(1000)
    let overlayPage = app.windows().find((p) => p.url().includes('comment-list'))
    if (overlayPage) {
      await overlayPage.waitForLoadState('networkidle')
      // Wait for WebSocket connection to establish
      await sleep(3000)

      // Broadcast mock comments
      for (const item of mockComments) {
        await app.evaluate(
          async (_electron, arg) => {
            const server = (global as any).__testServer
            if (server) server.broadcast(arg.event, arg.data)
          },
          { event: item.event, data: item.data },
        )
        await sleep(100)
      }
      await sleep(1000)

      await overlayPage.screenshot({
        path: path.join(outDir, 'comment-list.png'),
      })
      console.log('  Done.')

      // Close the overlay window
      await app.evaluate(
        async ({ BrowserWindow }, winId) => {
          const win = BrowserWindow.fromId(winId)
          if (win) win.close()
        },
        commentListWinId,
      )
      await sleep(500)
    } else {
      console.log('  Warning: comment-list overlay page not found')
    }

    // 4. Comment cards overlay
    console.log('Capturing comment-cards.png...')
    const cardsWinId = await app.evaluate(async ({ BrowserWindow }) => {
      const win = new BrowserWindow({
        width: 500,
        height: 700,
        webPreferences: { contextIsolation: false, nodeIntegration: false },
      })
      await win.loadURL('http://localhost:3939/plugins/comment-cards/overlay/?fontSize=14')
      return win.id
    })

    await sleep(1000)
    overlayPage = app.windows().find((p) => p.url().includes('comment-cards'))
    if (overlayPage) {
      await overlayPage.waitForLoadState('networkidle')
      // Wait for WebSocket connection to establish
      await sleep(3000)

      // Broadcast card events with staggered timing
      for (const item of cardEvents) {
        await app.evaluate(
          async (_electron, arg) => {
            const server = (global as any).__testServer
            if (server) server.broadcast(arg.event, arg.data)
          },
          { event: item.event, data: item.data },
        )
        await sleep(600)
      }
      await sleep(1500)

      await overlayPage.screenshot({
        path: path.join(outDir, 'comment-cards.png'),
      })
      console.log('  Done.')

      await app.evaluate(
        async ({ BrowserWindow }, winId) => {
          const win = BrowserWindow.fromId(winId)
          if (win) win.close()
        },
        cardsWinId,
      )
    } else {
      console.log('  Warning: comment-cards overlay page not found')
    }

    console.log(`\nAll screenshots saved to ${outDir}`)
  } finally {
    await app.close()
  }
}

main().catch((err) => {
  console.error('Screenshot capture failed:', err)
  process.exit(1)
})
