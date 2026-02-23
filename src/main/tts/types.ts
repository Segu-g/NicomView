export interface TtsAdapter {
  readonly id: string
  readonly name: string
  readonly defaultSettings: Record<string, string | number | boolean>

  /** テキストを読み上げる。キューから1件ずつ呼ばれる */
  speak(text: string, speed: number, volume: number): Promise<void>

  /** ソフトが起動中か確認 */
  isAvailable(): Promise<boolean>

  /** リソース解放 */
  dispose(): void
}
