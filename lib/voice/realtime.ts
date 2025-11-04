// Minimal browser Realtime helper for OpenAI Realtime (Voice v3)
// - TypeScript only
// - Exactly one data channel "oai-events" for JSON events
// - Fail fast on missing browser APIs

export type RealtimeSession = {
  pc: RTCPeerConnection
  dc: RTCDataChannel
  remoteAudio: HTMLAudioElement
  speak: (text: string) => void
  waitForFinalTranscript: (timeoutMs?: number) => Promise<string>
  waitForSpeechStop: (timeoutMs?: number) => Promise<void>
  updateSession: (patch: any) => void
  dumpInboundAudioStats: (tag?: string) => Promise<void>
  close: () => void
}


export async function connect(
  getToken: () => Promise<{ client_secret: { value: string } }>
): Promise<RealtimeSession> {
  if (!('RTCPeerConnection' in window) || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Browser does not support required WebRTC APIs')
  }

  // 1) PeerConnection with a public STUN server
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  })

  // Helpful state logs
  pc.addEventListener('iceconnectionstatechange', () => console.log('[realtime] ice:', pc.iceConnectionState))
  pc.addEventListener('connectionstatechange', () => console.log('[realtime] pc:', pc.connectionState))
  pc.addEventListener('icecandidateerror', (e) => console.warn('[realtime] icecandidateerror', e))

  // 2) DataChannel created before the offer
  const dc = pc.createDataChannel('oai-events')
  console.log('[realtime] DataChannel created:', dc.label)
  dc.onopen = () => console.log('[realtime] DataChannel open:', dc.label)
  dc.onclose = () => console.log('[realtime] DataChannel closed:', dc.label)
  dc.onerror = (e) => console.error('[realtime] DataChannel error:', e)

  // 3) Remote audio element
  const remoteAudio = document.createElement('audio')
  remoteAudio.autoplay = true
  remoteAudio.muted = false
  remoteAudio.setAttribute('playsinline', 'true')

  pc.ontrack = (ev) => {
    console.log('[realtime] ontrack kind=', ev.track.kind, 'streams=', ev.streams.length)
    const [stream] = ev.streams
    if (remoteAudio.srcObject !== stream) {
      remoteAudio.srcObject = stream
      console.log('[realtime] remote audio track attached')
      // Force play attempt on first track
      remoteAudio.play().then(
        () => console.log('[realtime] remoteAudio.play OK'),
        err => console.warn('[realtime] remoteAudio.play blocked or failed:', err)
      )
    }
    ev.track.onunmute = () => console.log('[realtime] track unmuted', ev.track.kind)
    ev.track.onmute = () => console.log('[realtime] track muted', ev.track.kind)
  }

  // 4) Attach local microphone before creating the offer
  const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  for (const track of micStream.getAudioTracks()) pc.addTrack(track, micStream)

  // CRITICAL: Add an audio transceiver before createOffer to ensure audio m-line exists
  // Without this, some browser/server combos produce invalid SDP
  pc.addTransceiver('audio', { direction: 'sendrecv' })
  console.log('[realtime] added audio transceiver')

  // 5) Listen for JSON events from Realtime
  const listeners: Array<(ev: any) => void> = []
  dc.addEventListener('message', (ev) => {
    try {
      const parsed = JSON.parse(ev.data)
      const t = parsed?.type
      if (t) console.log('[realtime] event:', t)
      for (const l of listeners) l(parsed)
    } catch {}
  })

  // Helpers to wait for ICE and connection
  async function waitIceGatheringComplete(conn: RTCPeerConnection) {
    if (conn.iceGatheringState === 'complete') return
    await new Promise<void>((resolve) => {
      const h = () => {
        if (conn.iceGatheringState === 'complete') {
          conn.removeEventListener('icegatheringstatechange', h)
          resolve()
        }
      }
      conn.addEventListener('icegatheringstatechange', h)
    })
  }

  async function waitPcConnected(conn: RTCPeerConnection) {
    if (conn.connectionState === 'connected') return
    await new Promise<void>((resolve, reject) => {
      const h = () => {
        if (conn.connectionState === 'connected') {
          conn.removeEventListener('connectionstatechange', h)
          resolve()
        } else if (conn.connectionState === 'failed' || conn.connectionState === 'closed') {
          conn.removeEventListener('connectionstatechange', h)
          reject(new Error(`pc state ${conn.connectionState}`))
        }
      }
      conn.addEventListener('connectionstatechange', h)
    })
  }

  // 6) Offer and SDP exchange
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  // Wait for ICE gather so the offer SDP contains candidates
  await waitIceGatheringComplete(pc)

  const { client_secret: { value: ephem } = { value: '' } } = await getToken()
  if (!ephem) throw new Error('ephemeral key not returned from token endpoint')

  // Helper: normalize SDP to CRLF line endings (RFC requirement)
  function normalizeSDP(sdp: string): string {
    // Replace any \r\n or \n with \r\n uniformly
    return sdp.replace(/\r\n|\r|\n/g, '\r\n')
  }

  // Helper: validate that response looks like SDP
  function validateSDP(text: string): void {
    const trimmed = text.trim()
    if (!trimmed.startsWith('v=')) {
      console.error('[realtime] Invalid SDP answer preview:', trimmed.slice(0, 120))
      throw new Error('Invalid SDP answer: does not start with v=')
    }
    // Log first 20 lines for debugging
    const lines = trimmed.split(/\r\n|\n/)
    console.log('[realtime] SDP answer first 20 lines:')
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      console.log(`  ${i + 1}: ${lines[i]}`)
    }
  }

  async function fetchAnswerSDP(offerSdp: string): Promise<string> {
    const resp = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        'Authorization': `Bearer ${ephem}`,
        'OpenAI-Beta': 'realtime=v1'
      },
      body: offerSdp ?? ''
    })
    
    const text = await resp.text()
    
    if (!resp.ok) {
      console.error('[realtime] SDP POST failed', resp.status, text.slice(0, 200))
      throw new Error(`Realtime SDP exchange failed ${resp.status}`)
    }
    
    // Validate it's actually SDP (not JSON error or HTML)
    validateSDP(text)
    
    // Normalize to CRLF line endings (RFC 4566 requirement)
    const normalized = normalizeSDP(text)
    console.log('[realtime] SDP answer normalized and validated')
    
    return normalized
  }

  let answerSDP: string
  try {
    answerSDP = await fetchAnswerSDP(offer.sdp ?? '')
  } catch (e) {
    // Retry once after a short delay in case of transient backend error or malformed SDP
    console.warn('[realtime] SDP fetch failed, retrying once after 1s...', e)
    await new Promise(r => setTimeout(r, 1000))
    
    // Create a fresh offer to be safe
    const retryOffer = await pc.createOffer()
    await pc.setLocalDescription(retryOffer)
    await waitIceGatheringComplete(pc)
    console.log('[realtime] retry offer created, posting SDP again...')
    
    answerSDP = await fetchAnswerSDP(retryOffer.sdp ?? '')
  }

  console.log('[realtime] setting remote description...')
  await pc.setRemoteDescription({ type: 'answer', sdp: answerSDP })
  console.log('[realtime] remote description set successfully')

  // Wait until the transport is connected and DC is open
  await waitPcConnected(pc)
  await new Promise<void>((resolve) => {
    if (dc.readyState === 'open') return resolve()
    const onopen = () => { dc.removeEventListener('open', onopen); resolve() }
    dc.addEventListener('open', onopen)
  })

  // Send initial session.update to assert runtime config
  const initialConfig = {
    voice: 'verse',
    modalities: ['audio', 'text'],
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 800,
      create_response: false,
      interrupt_response: true
    }
  }
  dc.send(JSON.stringify({ type: 'session.update', session: initialConfig }))
  console.log('[realtime] session.update sent with voice+VAD config')

  // Force an immediate hello TTS to verify audio output
  const hello = {
    type: 'response.create',
    response: {
      instructions: 'Hello. This is an audio check.',
      modalities: ['audio', 'text'],
      audio: { voice: 'verse' }
    }
  }
  dc.send(JSON.stringify(hello))
  console.log('[realtime] forced hello TTS sent')

  // 7) Exposed API

  // Small send queue to avoid races if .speak() or .updateSession() is called a tick early
  const sendQueue: string[] = []
  dc.addEventListener('open', () => {
    while (sendQueue.length) {
      const msg = sendQueue.shift()!
      try { dc.send(msg) } catch (e) { console.error('[realtime] queued send failed', e) }
    }
  })

  function updateSession(patch: any) {
    const msg = JSON.stringify({ type: 'session.update', session: patch })
    if (dc.readyState !== 'open') {
      console.warn('[realtime] session.update queued until dc opens')
      sendQueue.push(msg)
      return
    }
    dc.send(msg)
  }

  function speak(text: string) {
    console.log('[realtime] speak called, dc.readyState:', dc.readyState)
    const payload = {
      type: 'response.create',
      response: {
        instructions: text || 'Audio check.',
        modalities: ['audio', 'text'],
        audio: { voice: 'verse' }
      }
    }
    const msg = JSON.stringify(payload)
    if (dc.readyState !== 'open') {
      console.warn('[realtime] channel not open yet, queueing response.create')
      sendQueue.push(msg)
      return
    }
    console.log('[realtime] sending response.create')
    dc.send(msg)
  }

  function waitForSpeechStop(timeoutMs = 5000): Promise<void> {
    return new Promise((resolve) => {
      let settled = false
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true
          cleanup()
          console.warn('[realtime] waitForSpeechStop timeout')
          resolve()
        }
      }, timeoutMs)

      const onEvent = (ev: any) => {
        const t = ev?.type
        if (t === 'input_audio_buffer.speech_stopped') {
          if (!settled) {
            settled = true
            cleanup()
            clearTimeout(timer)
            console.log('[realtime] VAD speech_stopped')
            resolve()
          }
        }
      }

      function cleanup() {
        const idx = listeners.indexOf(onEvent)
        if (idx >= 0) listeners.splice(idx, 1)
      }

      listeners.push(onEvent)
    })
  }

  function waitForFinalTranscript(timeoutMs = 20000): Promise<string> {
    return new Promise((resolve, reject) => {
      let settled = false
      let textBuf = ''
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true
          cleanup()
          reject(new Error('timeout waiting for final transcript'))
        }
      }, timeoutMs)

      const onEvent = (ev: any) => {
        const t = ev?.type

        // Prefer explicit STT completion events
        if (
          t === 'conversation.item.input_audio_transcription.completed' ||
          t === 'input_audio_buffer.speech_recognition.completed'
        ) {
          const transcript = ev?.transcript ?? ev?.payload?.transcript ?? ev?.text
          if (transcript && String(transcript).trim().length > 0) {
            cleanup()
            clearTimeout(timer)
            settled = true
            console.log('[realtime] transcript resolved via stt.complete →', transcript)
            resolve(String(transcript))
            return
          }
        }

        // Streamed text deltas
        if (t === 'response.output_text.delta') {
          const delta = ev?.delta ?? ev?.text ?? ''
          if (typeof delta === 'string') textBuf += delta
        }

        // Resolve when response finishes with whatever text we accumulated
        if (t === 'response.completed') {
          const direct = ev?.response?.output_text?.content
          const finalText = (typeof direct === 'string' && direct?.trim().length > 0) ? direct : textBuf
          if (finalText && String(finalText).trim().length > 0) {
            cleanup()
            clearTimeout(timer)
            settled = true
            console.log('[realtime] transcript resolved via response.completed →', finalText)
            resolve(String(finalText))
          }
        }
      }

      function cleanup() {
        const idx = listeners.indexOf(onEvent)
        if (idx >= 0) listeners.splice(idx, 1)
      }

      listeners.push(onEvent)
    })
  }

  function close() {
    try { for (const t of micStream.getTracks()) t.stop() } catch {}
    try { dc.close() } catch {}
    try { pc.close() } catch {}
    try { if (remoteAudio.parentElement) remoteAudio.remove() } catch {}
  }

  async function dumpInboundAudioStats(tag = 'stats') {
    try {
      const stats = await pc.getStats()
      let inbound = 0, codec = ''
      stats.forEach(r => {
        if (r.type === 'inbound-rtp' && r.kind === 'audio') inbound += (r.bytesReceived || 0)
        if (r.type === 'codec' && r.mimeType) codec = r.mimeType
      })
      console.log(`[realtime] ${tag}: inboundAudioBytes=`, inbound, 'codec=', codec)
    } catch (e) {
      console.warn('[realtime] getStats failed', e)
    }
  }

  return { pc, dc, remoteAudio, speak, waitForFinalTranscript, waitForSpeechStop, updateSession, dumpInboundAudioStats, close }
}
