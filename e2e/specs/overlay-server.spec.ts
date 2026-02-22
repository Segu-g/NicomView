import { test, expect } from '../fixtures/electron'

test.describe('Overlay HTTP server', () => {
  test('serves plugin index at /', async ({ electronApp }) => {
    await electronApp.firstWindow()

    const resp = await fetch('http://localhost:3939/')
    const html = await resp.text()
    expect(resp.status).toBe(200)
    expect(html).toContain('NicomView Plugins')
    expect(html).toContain('md3-comment-list')
  })

  test('serves md3-comment-list overlay HTML', async ({ electronApp }) => {
    await electronApp.firstWindow()

    const resp = await fetch('http://localhost:3939/plugins/md3-comment-list/overlay/')
    const html = await resp.text()
    expect(resp.status).toBe(200)
    expect(html).toContain('コメントリスト')
  })
})
