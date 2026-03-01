import { EventEmitter } from 'events'
import type { ConnectionState } from '../shared/types'

interface ProviderOptions {
  liveId: string
  cookies?: string
}

interface Provider extends EventEmitter {
  connect(): Promise<void>
  disconnect(): void
}

type ProviderFactory = (options: ProviderOptions) => Provider
type BroadcastFn = (event: string, data: unknown) => void
type StateChangeFn = (state: ConnectionState) => void

const RELAY_EVENTS = ['comment', 'gift', 'emotion', 'notification', 'operatorComment'] as const

export class CommentManager {
  private provider: Provider | null = null
  private providerFactory: ProviderFactory
  private broadcast: BroadcastFn
  private onStateChange: StateChangeFn
  private broadcasterName: string | undefined = undefined

  constructor(
    providerFactory: ProviderFactory,
    broadcast: BroadcastFn,
    onStateChange: StateChangeFn
  ) {
    this.providerFactory = providerFactory
    this.broadcast = broadcast
    this.onStateChange = onStateChange
  }

  async connect(liveId: string, cookies?: string): Promise<void> {
    if (this.provider) {
      this.provider.disconnect()
      this.provider.removeAllListeners()
      this.provider = null
    }

    this.broadcasterName = undefined
    this.onStateChange('connecting')

    const options: ProviderOptions = { liveId }
    if (cookies) {
      options.cookies = cookies
    }

    this.provider = this.providerFactory(options)

    this.provider.on('metadata', (metadata: { broadcasterName?: string }) => {
      this.broadcasterName = metadata.broadcasterName
    })

    for (const event of RELAY_EVENTS) {
      this.provider.on(event, (data: unknown) => {
        if (event === 'operatorComment') {
          const op = data as { name?: string }
          if (!op.name && this.broadcasterName) {
            this.broadcast(event, { ...op, name: this.broadcasterName })
            return
          }
        }
        this.broadcast(event, data)
      })
    }

    this.provider.on('stateChange', (state: ConnectionState) => {
      this.onStateChange(state)
    })

    this.provider.on('error', () => {
      this.onStateChange('error')
    })

    this.provider.on('end', () => {
      if (this.provider) {
        this.provider.removeAllListeners()
        this.provider = null
      }
      this.onStateChange('disconnected')
    })

    await this.provider.connect()
  }

  disconnect(): void {
    if (this.provider) {
      this.provider.disconnect()
      this.provider.removeAllListeners()
      this.provider = null
    }
    this.onStateChange('disconnected')
  }
}
