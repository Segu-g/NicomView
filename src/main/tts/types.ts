import type { TtsAdapterParamDef } from '../../shared/types'

export interface TtsAdapter {
  readonly id: string
  readonly name: string
  readonly defaultSettings: Record<string, string | number | boolean>

  /** テキストを読み上げる。キューから1件ずつ呼ばれる */
  speak(text: string, speed: number, volume: number, speakerOverride?: number | string): Promise<void>

  /** ソフトが起動中か確認 */
  isAvailable(): Promise<boolean>

  /** アダプター固有のパラメーター定義を返す（動的オプションを含む） */
  getParamDefs(): Promise<TtsAdapterParamDef[]>

  /** アダプター固有設定を更新する */
  updateSettings(settings: Record<string, string | number | boolean>): void

  /** リソース解放 */
  dispose(): void
}
