import { describe, it, expect } from 'vitest'
import { formatTtsText } from './formatter'

describe('formatTtsText', () => {
  it('comment: content をそのまま返す', () => {
    expect(formatTtsText('comment', { content: 'こんにちは' })).toBe('こんにちは')
  })

  it('comment: content が空なら null', () => {
    expect(formatTtsText('comment', { content: '' })).toBeNull()
  })

  it('comment: content がなければ null', () => {
    expect(formatTtsText('comment', {})).toBeNull()
  })

  it('gift: userName と itemName からテキストを生成', () => {
    expect(formatTtsText('gift', { userName: 'たろう', itemName: 'スター' })).toBe(
      'たろうさんがスターを贈りました'
    )
  })

  it('gift: userName がなければ匿名を使う', () => {
    expect(formatTtsText('gift', { itemName: 'スター' })).toBe('匿名さんがスターを贈りました')
  })

  it('gift: itemName がなければギフトを使う', () => {
    expect(formatTtsText('gift', { userName: 'たろう' })).toBe('たろうさんがギフトを贈りました')
  })

  it('gift: 両方なければ null', () => {
    expect(formatTtsText('gift', {})).toBeNull()
  })

  it('emotion: content をそのまま返す', () => {
    expect(formatTtsText('emotion', { content: '8888' })).toBe('8888')
  })

  it('notification: message を返す', () => {
    expect(formatTtsText('notification', { message: '来場者数1000人' })).toBe('来場者数1000人')
  })

  it('notification: message が空なら null', () => {
    expect(formatTtsText('notification', { message: '' })).toBeNull()
  })

  it('operatorComment: 運営コメント: を付けて返す', () => {
    expect(formatTtsText('operatorComment', { content: 'お知らせ' })).toBe('運営コメント: お知らせ')
  })

  it('operatorComment: content がなければ null', () => {
    expect(formatTtsText('operatorComment', {})).toBeNull()
  })
})
