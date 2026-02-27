import fs from 'fs'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'
import type { TtsAdapterParamDef } from '../../../shared/types'
import type { TtsAdapter } from '../types'

interface VoicevoxStyle {
  name: string
  id: number
}

interface VoicevoxSpeaker {
  name: string
  styles: VoicevoxStyle[]
}

export class VoicevoxAdapter implements TtsAdapter {
  readonly id = 'voicevox'
  readonly name = 'VOICEVOX'
  readonly defaultSettings = { host: 'localhost', port: 50021, speakerId: 0 }

  private host: string
  private port: number
  private speakerId: number

  constructor(settings?: Record<string, string | number | boolean>) {
    this.host = String(settings?.host ?? this.defaultSettings.host)
    this.port = Number(settings?.port ?? this.defaultSettings.port)
    this.speakerId = Number(settings?.speakerId ?? this.defaultSettings.speakerId)
  }

  updateSettings(settings: Record<string, string | number | boolean>): void {
    if (settings.host !== undefined) {
      const h = String(settings.host)
      // スキームやパス区切り文字を含むホストを拒否（SSRF 対策）
      if (/[/:?# ]/.test(h)) {
        console.warn('[VOICEVOX] 不正なホスト名を拒否:', h)
      } else {
        this.host = h
      }
    }
    if (settings.port !== undefined) this.port = Number(settings.port)
    if (settings.speakerId !== undefined) this.speakerId = Number(settings.speakerId)
  }

  async getParamDefs(): Promise<TtsAdapterParamDef[]> {
    const defs: TtsAdapterParamDef[] = [
      {
        key: 'host',
        label: 'ホスト',
        type: 'string',
        defaultValue: 'localhost'
      },
      {
        key: 'port',
        label: 'ポート',
        type: 'number',
        defaultValue: 50021,
        min: 1,
        max: 65535,
        step: 1
      }
    ]

    // キャラクター（話者）一覧を動的に取得
    const speakerDef: TtsAdapterParamDef = {
      key: 'speakerId',
      label: 'キャラクター',
      type: 'select',
      defaultValue: 0,
      options: []
    }

    try {
      const res = await fetch(`http://${this.host}:${this.port}/speakers`)
      if (res.ok) {
        const speakers = (await res.json()) as VoicevoxSpeaker[]
        speakerDef.options = speakers.flatMap((speaker) =>
          speaker.styles.map((style) => ({
            value: style.id,
            label: `${speaker.name} (${style.name})`
          }))
        )
      }
    } catch {
      // VOICEVOX未起動時は空のオプションで返す
    }

    defs.push(speakerDef)
    return defs
  }

  async speak(text: string, speed: number, volume: number, speakerOverride?: number | string): Promise<void> {
    const baseUrl = `http://${this.host}:${this.port}`
    const speaker = speakerOverride !== undefined ? Number(speakerOverride) : this.speakerId

    // 1. POST /audio_query
    const queryRes = await fetch(
      `${baseUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`,
      { method: 'POST' }
    )
    if (!queryRes.ok) {
      throw new Error(`audio_query failed: ${queryRes.status}`)
    }
    const query = (await queryRes.json()) as Record<string, unknown>

    // Apply speed and volume
    query.speedScale = speed
    query.volumeScale = volume

    // 2. POST /synthesis
    const synthRes = await fetch(`${baseUrl}/synthesis?speaker=${speaker}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    })
    if (!synthRes.ok) {
      throw new Error(`synthesis failed: ${synthRes.status}`)
    }

    const wavBuffer = Buffer.from(await synthRes.arrayBuffer())

    // 3. Write to temp file and play
    const tmpFile = path.join(os.tmpdir(), `nicomview-tts-${Date.now()}.wav`)
    fs.writeFileSync(tmpFile, wavBuffer)

    try {
      await this.playWav(tmpFile)
    } finally {
      try {
        fs.unlinkSync(tmpFile)
      } catch {
        // ignore cleanup errors
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`http://${this.host}:${this.port}/version`)
      return res.ok
    } catch {
      return false
    }
  }

  dispose(): void {
    // No resources to clean up
  }

  private playWav(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const platform = process.platform
      let cmd: string
      let args: string[]

      if (platform === 'linux') {
        cmd = 'aplay'
        args = [filePath]
      } else if (platform === 'darwin') {
        cmd = 'afplay'
        args = [filePath]
      } else if (platform === 'win32') {
        cmd = 'powershell'
        // PowerShell 内シングルクォート文字列のエスケープ: ' → ''
        const escapedPath = filePath.replace(/'/g, "''")
        args = ['-c', `(New-Object Media.SoundPlayer '${escapedPath}').PlaySync()`]
      } else {
        reject(new Error(`Unsupported platform: ${platform}`))
        return
      }

      execFile(cmd, args, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}
