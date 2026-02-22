import { test, expect } from '../fixtures/electron'

test.describe('Comment flow', () => {
  test('broadcast comment appears in md3-comment-list overlay', async ({ electronApp }) => {
    await electronApp.firstWindow()

    const overlayPage = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = new BrowserWindow({
        width: 400,
        height: 600,
        webPreferences: { contextIsolation: false, nodeIntegration: false }
      })
      await win.loadURL('http://localhost:3939/plugins/md3-comment-list/overlay/')
      return win.id
    })

    const pages = electronApp.windows()
    const overlay = pages.find((p) => p.url().includes('md3-comment-list'))
    expect(overlay).toBeDefined()

    await overlay!.waitForLoadState('networkidle')
    await overlay!.waitForTimeout(1000)

    await electronApp.evaluate(async () => {
      const server = (global as any).__testServer
      if (server) {
        server.broadcast('comment', { content: 'リストテスト' })
      }
    })

    const commentEl = overlay!.locator('.comment-item', { hasText: 'リストテスト' })
    await expect(commentEl).toBeVisible({ timeout: 5_000 })
  })
})
