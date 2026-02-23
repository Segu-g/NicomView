import { test, expect } from '../fixtures/electron'

test.describe('Overlay HTTP server', () => {
  test('serves plugin index at /', async ({ electronApp }) => {
    await electronApp.firstWindow()

    const resp = await fetch('http://localhost:3939/')
    const html = await resp.text()
    expect(resp.status).toBe(200)
    expect(html).toContain('NicomView Plugins')
    expect(html).toContain('comment-list')
  })

  test('serves comment-list overlay HTML', async ({ electronApp }) => {
    await electronApp.firstWindow()

    const resp = await fetch('http://localhost:3939/plugins/comment-list/overlay/')
    const html = await resp.text()
    expect(resp.status).toBe(200)
    expect(html).toContain('コメントリスト')
  })
})
