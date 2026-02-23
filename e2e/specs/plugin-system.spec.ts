import { test, expect } from '../fixtures/electron'

test.describe('Plugin system', () => {
  test('main window shows plugin URLs', async ({ mainPage }) => {
    await mainPage.waitForLoadState('networkidle')

    await expect(mainPage.locator('text=表示プラグイン')).toBeVisible()
    await expect(mainPage.locator('text=コメントリスト')).toBeVisible()
    await expect(mainPage.locator('text=ニコニコ風スクロール')).toBeVisible()
  })

  test('plugin serves static files via HTTP', async ({ electronApp }) => {
    await electronApp.firstWindow()

    const resp = await fetch('http://localhost:3939/plugins/comment-list/plugin.json')
    expect(resp.status).toBe(200)
    const manifest = await resp.json()
    expect(manifest.id).toBe('comment-list')
    expect(manifest.overlay).toBe(true)
  })

  test('event filter checkboxes are visible', async ({ mainPage }) => {
    await mainPage.waitForLoadState('networkidle')

    await expect(mainPage.locator('text=表示イベント')).toBeVisible()
    await expect(mainPage.locator('text=コメント')).toBeVisible()
    await expect(mainPage.locator('text=ギフト')).toBeVisible()
  })
})
