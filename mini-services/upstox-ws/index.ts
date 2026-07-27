import { createServer } from 'http'
import { Server } from 'socket.io'
import WebSocket from 'ws'

const HTTP_PORT = 3003
const UPSTOX_WS_URL = 'wss://api.upstox.com/v2/feed/market-data-feed'

// ==================== Types ====================
interface LiveTick {
  instrumentKey: string
  symbol: string
  ltp: number
  lt: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  changePct: number
  oi?: number
  bestBuyPrice?: number
  bestSellPrice?: number
}

interface SubRequest {
  instrumentKeys: string[]
}

// ==================== Instrument Key Builder ====================
// Maps NSE trading symbol → Upstox instrument_key format
const INDEX_NAMES: Record<string, string> = {
  'NIFTY': 'Nifty 50',
  'BANKNIFTY': 'Nifty Bank',
  'FINNIFTY': 'Nifty Fin Service',
  'NIFTYIT': 'Nifty IT',
  'NIFTYNXT50': 'Nifty Next 50',
  'NIFTYMIDCAP': 'Nifty Midcap 50',
  'NIFTYSMLCAP': 'Nifty Smallcap 50',
  'NIFTYPHARMA': 'Nifty Pharma',
  'NIFTYAUTO': 'Nifty Auto',
  'NIFTYMETAL': 'Nifty Metal',
  'NIFTYENERGY': 'Nifty Energy',
  'NIFTYFMCG': 'Nifty FMCG',
  'NIFTYREALTY': 'Nifty Realty',
  'NIFTYINFRA': 'Nifty Infrastructure',
  'NIFTYPSUBANK': 'Nifty PSE Bank',
  'INDIAVIX': 'India VIX',
}

const REVERSE_INDEX: Record<string, string> = {}
for (const [k, v] of Object.entries(INDEX_NAMES)) {
  REVERSE_INDEX[v.toLowerCase()] = k
}

// NSE index symbols that are NOT in the equity list
const INDEX_SYMBOLS = new Set(Object.keys(INDEX_NAMES))

function buildInstrumentKey(symbol: string): string {
  const upper = symbol.toUpperCase()
  if (INDEX_SYMBOLS.has(upper)) {
    return `NSE_INDEX|${INDEX_NAMES[upper]}`
  }
  return `NSE_EQ|${upper}`
}

// Parse instrument_key back to our internal symbol
function keyToSymbol(instrumentKey: string): string {
  const parts = instrumentKey.split('|')
  if (parts.length !== 2) return instrumentKey
  const [, name] = parts
  // Check if it's an index
  const lower = name.toLowerCase()
  if (lower in REVERSE_INDEX) {
    return REVERSE_INDEX[lower]
  }
  // For equities, the name is the trading symbol itself
  return name
}

// ==================== Upstox WS Connection Manager ====================
class UpstoxWSManager {
  private ws: WebSocket | null = null
  private token: string | null = null
  private subscribedKeys: Set<string> = new Set()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private clients: Set<any> = new Set()
  private isConnecting = false

  // Track live ticks to send on new client connect
  private latestTicks: Map<string, LiveTick> = new Map()

  setToken(token: string) {
    const changed = this.token !== token
    this.token = token
    if (changed && this.ws) {
      // Token changed, reconnect
      this.disconnect()
      this.connect()
    } else if (changed) {
      this.connect()
    }
  }

  addClient(socket: any) {
    this.clients.add(socket)
    // Send cached ticks immediately
    for (const [, tick] of this.latestTicks) {
      socket.emit('tick', tick)
    }
  }

  removeClient(socket: any) {
    this.clients.delete(socket)
  }

  subscribe(symbols: string[]) {
    const keysToSub = symbols
      .filter(s => !this.subscribedKeys.has(s))
      .map(s => buildInstrumentKey(s))

    if (keysToSub.length === 0) return

    for (const k of keysToSub) {
      this.subscribedKeys.add(k)
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(keysToSub)
    }
    // If WS not open yet, keys are stored and will be sent on connect
  }

  unsubscribe(symbols: string[]) {
    const keysToUnsub = symbols.map(s => buildInstrumentKey(s))
    for (const k of keysToUnsub) {
      this.subscribedKeys.delete(k)
      this.latestTicks.delete(k)
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendUnsubscribe(keysToUnsub)
    }
  }

  getSubscribedSymbols(): string[] {
    return [...this.subscribedKeys].map(keyToSymbol)
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  isAuthorized(): boolean {
    return !!this.token
  }

  connect() {
    if (!this.token || this.isConnecting) return
    this.isConnecting = true

    console.log('[UpstoxWS] Connecting...')
    const url = `${UPSTOX_WS_URL}?authorization=Bearer ${this.token}`

    this.ws = new WebSocket(url, {
      handshakeTimeout: 10000,
    })

    this.ws.on('open', () => {
      this.isConnecting = false
      console.log('[UpstoxWS] Connected to Upstox')
      this.broadcast('upstox-status', { connected: true })

      // Re-subscribe to all tracked instruments
      if (this.subscribedKeys.size > 0) {
        this.sendSubscribe([...this.subscribedKeys])
      }
    })

    this.ws.on('message', (raw: WebSocket.Data) => {
      try {
        const data = JSON.parse(raw.toString())
        this.handleMessage(data)
      } catch (err) {
        // Ignore parse errors for heartbeat/binary frames
      }
    })

    this.ws.on('close', (code: number, reason: Buffer) => {
      this.isConnecting = false
      console.log(`[UpstoxWS] Disconnected (code: ${code}, reason: ${reason.toString()})`)
      this.broadcast('upstox-status', { connected: false, code })
      this.scheduleReconnect()
    })

    this.ws.on('error', (err: Error) => {
      this.isConnecting = false
      console.error('[UpstoxWS] Error:', err.message)
      this.broadcast('upstox-status', { connected: false, error: err.message })
    })
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.isConnecting = false
    if (this.ws) {
      try { this.ws.close() } catch {}
      this.ws = null
    }
    this.broadcast('upstox-status', { connected: false })
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    if (!this.token) return

    // Don't reconnect if market is closed (weekends, nights)
    const now = new Date()
    const istHour = (now.getUTCHours() + 5.5) % 24
    const day = now.getUTCDay()
    if (day === 0 || day === 6) {
      console.log('[UpstoxWS] Market closed (weekend), skipping reconnect')
      return
    }
    if (istHour < 9 || istHour >= 16) {
      console.log('[UpstoxWS] Market likely closed, skipping reconnect')
      return
    }

    console.log('[UpstoxWS] Reconnecting in 5s...')
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 5000)
  }

  private sendSubscribe(keys: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const msg = JSON.stringify({
      guid: 'dashboard-' + Date.now(),
      method: 'sub',
      data: { instrumentKeys: keys },
    })
    this.ws.send(msg)
    console.log(`[UpstoxWS] Subscribed: ${keys.length} instruments`)
  }

  private sendUnsubscribe(keys: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const msg = JSON.stringify({
      guid: 'dashboard-' + Date.now(),
      method: 'unsub',
      data: { instrumentKeys: keys },
    })
    this.ws.send(msg)
  }

  private handleMessage(data: any) {
    if (!data.feeds) return

    for (const [instrumentKey, feed] of Object.entries(data.feeds)) {
      const f = (feed as any).ff  // full feed
      if (!f) continue

      const symbol = keyToSymbol(instrumentKey)

      const tick: LiveTick = {
        instrumentKey,
        symbol,
        ltp: f.ltp ?? 0,
        lt: f.ltt ?? '',
        open: f.ohlc?.open ?? 0,
        high: f.ohlc?.high ?? 0,
        low: f.ohlc?.low ?? 0,
        close: f.ohlc?.close ?? 0,
        volume: f.v ? parseInt(f.v, 10) : 0,
        changePct: f.c ? parseFloat(f.c) : 0,
        oi: f.oi ?? undefined,
        bestBuyPrice: f.bp ?? undefined,
        bestSellPrice: f.sp ?? undefined,
      }

      this.latestTicks.set(instrumentKey, tick)
      this.broadcast('tick', tick)
    }
  }

  private broadcast(event: string, data: any) {
    for (const client of this.clients) {
      try {
        client.emit(event, data)
      } catch (err) {
        // Client may have disconnected
      }
    }
  }
}

// ==================== Socket.io Server ====================
const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

const upstoxWS = new UpstoxWSManager()

io.on('connection', (socket) => {
  console.log(`[SocketIO] Client connected: ${socket.id}`)

  // Send current status
  socket.emit('upstox-status', {
    connected: upstoxWS.isConnected(),
    authorized: upstoxWS.isAuthorized(),
    subscribedSymbols: upstoxWS.getSubscribedSymbols(),
  })

  // Client sends Upstox access token (obtained from /api/upstox/token)
  socket.on('set-token', (data: { token: string }) => {
    console.log('[SocketIO] Token received, connecting to Upstox...')
    upstoxWS.setToken(data.token)
    socket.emit('upstox-status', {
      connected: upstoxWS.isConnected(),
      authorized: true,
    })
  })

  // Client requests subscription to instruments
  socket.on('subscribe', (data: { symbols: string[] }) => {
    console.log(`[SocketIO] Subscribe request: ${data.symbols.join(', ')}`)
    upstoxWS.subscribe(data.symbols)
    socket.emit('subscribed', { symbols: data.symbols })
  })

  // Client requests unsubscription
  socket.on('unsubscribe', (data: { symbols: string[] }) => {
    upstoxWS.unsubscribe(data.symbols)
  })

  // Register client for tick broadcasts
  upstoxWS.addClient(socket)

  socket.on('disconnect', () => {
    console.log(`[SocketIO] Client disconnected: ${socket.id}`)
    upstoxWS.removeClient(socket)
  })

  socket.on('error', (err) => {
    console.error(`[SocketIO] Error (${socket.id}):`, err)
  })
})

httpServer.listen(HTTP_PORT, () => {
  console.log(`Upstox WS bridge running on port ${HTTP_PORT}`)
})

process.on('SIGTERM', () => {
  upstoxWS.disconnect()
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  upstoxWS.disconnect()
  httpServer.close(() => process.exit(0))
})
