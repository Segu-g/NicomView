import { describe, it, expect } from 'vitest'
import { formatTtsText } from './formatter'
import { DEFAULT_TTS_TEMPLATES } from '../../shared/types'

describe('formatTtsText', () => {
  describe('デフォルトテンプレートとの互換性', () => {
    it('comment: content をそのまま返す', () => {
      expect(formatTtsText(DEFAULT_TTS_TEMPLATES.comment, { content: 'こんにちは' })).toBe('こんにちは')
    })

    it('comment: content が空なら null', () => {
      expect(formatTtsText(DEFAULT_TTS_TEMPLATES.comment, { content: '' })).toBeNull()
    })

    it('comment: content がなければ null', () => {
      expect(formatTtsText(DEFAULT_TTS_TEMPLATES.comment, {})).toBeNull()
    })

    it('gift: userName と itemName からテキストを生成', () => {
      expect(
        formatTtsText(DEFAULT_TTS_TEMPLATES.gift, { userName: 'たろう', itemName: 'スター' })
      ).toBe('たろうさんがスターを贈りました')
    })

    it('gift: userName がなければ空文字に置換される', () => {
      expect(
        formatTtsText(DEFAULT_TTS_TEMPLATES.gift, { itemName: 'スター' })
      ).toBe('さんがスターを贈りました')
    })

    it('gift: 両方なければ null にならない（テンプレートのリテラル部分が残る）', () => {
      expect(formatTtsText(DEFAULT_TTS_TEMPLATES.gift, {})).toBe('さんがを贈りました')
    })

    it('emotion: content をそのまま返す', () => {
      expect(formatTtsText(DEFAULT_TTS_TEMPLATES.emotion, { content: '8888' })).toBe('8888')
    })

    it('notification: message を返す', () => {
      expect(formatTtsText(DEFAULT_TTS_TEMPLATES.notification, { message: '来場者数1000人' })).toBe(
        '来場者数1000人'
      )
    })

    it('notification: message が空なら null', () => {
      expect(formatTtsText(DEFAULT_TTS_TEMPLATES.notification, { message: '' })).toBeNull()
    })

    it('operatorComment: 運営コメント: を付けて返す', () => {
      expect(
        formatTtsText(DEFAULT_TTS_TEMPLATES.operatorComment, { content: 'お知らせ' })
      ).toBe('運営コメント: お知らせ')
    })
  })

  describe('カスタムテンプレート', () => {
    it('userName 付きコメントテンプレート', () => {
      expect(
        formatTtsText('{userName}さん、{content}', { userName: 'たろう', content: 'こんにちは' })
      ).toBe('たろうさん、こんにちは')
    })

    it('未定義のプレースホルダーは空文字に置換される', () => {
      expect(formatTtsText('{unknown}テスト', { content: 'test' })).toBe('テスト')
    })

    it('プレースホルダーが全て空で結果が空白のみなら null', () => {
      expect(formatTtsText('{content}', {})).toBeNull()
    })

    it('プレースホルダーなしの固定テキスト', () => {
      expect(formatTtsText('ギフトが届きました', {})).toBe('ギフトが届きました')
    })

    it('複数プレースホルダーの混在', () => {
      expect(
        formatTtsText('{userName}さんが{point}ポイントの{itemName}を贈りました', {
          userName: 'たろう',
          point: 500,
          itemName: 'スター'
        })
      ).toBe('たろうさんが500ポイントのスターを贈りました')
    })
  })
})
