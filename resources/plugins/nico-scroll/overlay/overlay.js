;(function () {
  'use strict'

  const WS_URL = 'ws://localhost:3940'
  const RECONNECT_INTERVAL = 5000

  let ws = null
  let laneCount = 10
  const lanes = new Array(laneCount).fill(0)

  function connect() {
    ws = new WebSocket(WS_URL)

    ws.addEventListener('open', function () {
      console.log('[NicomView] WebSocket connected')
    })

    ws.addEventListener('message', function (event) {
      try {
        const msg = JSON.parse(event.data)
        if (msg.event === 'comment') {
          showComment(msg.data)
        }
      } catch (e) {
        console.error('[NicomView] Failed to parse message:', e)
      }
    })

    ws.addEventListener('close', function () {
      console.log('[NicomView] WebSocket disconnected, reconnecting in ' + RECONNECT_INTERVAL + 'ms')
      ws = null
      setTimeout(connect, RECONNECT_INTERVAL)
    })

    ws.addEventListener('error', function () {
      if (ws) {
        ws.close()
      }
    })
  }

  function getFreeLane() {
    const now = Date.now()
    let bestLane = 0
    let bestTime = lanes[0]
    for (let i = 0; i < laneCount; i++) {
      if (lanes[i] <= now) {
        return i
      }
      if (lanes[i] < bestTime) {
        bestTime = lanes[i]
        bestLane = i
      }
    }
    return bestLane
  }

  function showComment(data) {
    const el = document.createElement('div')
    el.className = 'comment'
    el.textContent = data.content || ''

    const lane = getFreeLane()
    const laneHeight = window.innerHeight / laneCount
    el.style.top = (lane * laneHeight) + 'px'

    document.body.appendChild(el)

    const speed = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--comment-speed')) || 5
    lanes[lane] = Date.now() + speed * 1000

    el.addEventListener('animationend', function () {
      el.remove()
    })
  }

  connect()
})()
