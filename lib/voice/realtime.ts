// Minimal browser Realtime helper for OpenAI Realtime (Voice v3)

export type RealtimeSession = {
  pc: RTCPeerConnection
  dc: RTCDataChannel
  remoteAudio: HTMLAudioElement
  speak: (text: string) => void
  waitForFinalTranscript: (timeoutMs?: number) => Promise<string>
  close: () => void
  dumpInboundAudioStats: (tag?: string) => Promise<void>
}


export async function connect(
  getToken: () => Promise<{ client_secret: { value: string } }>
): Promise<RealtimeSession> {
  if (!('RTCPeerConnection' in window) || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Browser does not support required WebRTC APIs')
  }

  // 1) PeerConnection with simple STUN
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  })

  pc.addEventListener('iceconnectionstatechange', () => 
    console.log('[realtime] ice:', pc.iceConnectionState))
  pc.addEventListener('connectionstatechange', () => 
    console.log('[realtime] pc:', pc.connectionState))

  // 2) Add audio transceiver BEFORE getUserMedia/createOffer
  pc.addTransceiver('audio', { direction: 'sendrecv' })
  console.log('[realtime] audio transceiver added')

  // 3) Attach microphone
  const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  for (const track of micStream.getAudioTracks()) {
    pc.addTrack(track, micStream)
  }
  console.log('[realtime] mic tracks added')

  // 4) Create DataChannel before offer
  const dc = pc.createDataChannel('oai-events')
  dc.onopen = () => console.log('[realtime] dc open')
  dc.onclose = () => console.log('[realtime] dc close')
  dc.onerror = (e) => console.error('[realtime] dc error', e)

  // 5) Audio element
  const remoteAudio = document.createElement('audio')
  remoteAudio.autoplay = true
  remoteAudio.muted = false
  remoteAudio.setAttribute('playsinline', 'true')
  document.body.appendChild(remoteAudio)
  console.log('[realtime] remoteAudio created and appended')

  pc.ontrack = (ev) => {
    console.log('[realtime] ontrack kind=', ev.track.kind, 'streams=', ev.streams.length)
    const [stream] = ev.streams
    if (stream && remoteAudio.srcObject !== stream) {
      remoteAudio.srcObject = stream
      console.log('[realtime] stream attached to remoteAudio')
      remoteAudio.play().then(
        () => console.log('[realtime] remoteAudio.play OK'),
        (err) => console.error('[realtime] remoteAudio.play failed:', err)
      )
    }
    ev.track.onunmute = () => console.log('[realtime] track unmuted', ev.track.kind)
    ev.track.onmute = () => console.log('[realtime] track muted', ev.track.kind)
  }

  // 6) Event listeners for DataChannel messages
  const listeners: Array<(ev: any) => void> = []
  dc.addEventListener('message', (ev) => {
    try {
      const parsed = JSON.parse(ev.data)
      const t = parsed?.type
      if (t) console.log('[realtime] event:', t)
      for (const l of listeners) l(parsed)
    } catch {}
  })

  // 7) Create offer, wait for ICE gathering
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  console.log('[realtime] offer created, waiting for ICE...')

  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve()
    const h = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', h)
        resolve()
      }
    }
    pc.addEventListener('icegatheringstatechange', h)
  })
  console.log('[realtime] ICE gathering complete')

  // 8) Get ephemeral key
  const tokenResp = await getToken()
  const ephemeralKey = tokenResp.client_secret.value
  console.log('[realtime] ephemeral key received')

  // 9) POST SDP to Realtime
  const sdpResp = await fetch(
    'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        'Authorization': `Bearer ${ephemeralKey}`,
        'OpenAI-Beta': 'realtime=v1'
      },
      body: offer.sdp ?? ''
    }
  )

  if (!sdpResp.ok) {
    const errText = await sdpResp.text()
    console.error('[realtime] SDP POST failed:', sdpResp.status, errText)
    throw new Error(`SDP POST failed: ${sdpResp.status}`)
  }

  let answerSDP = await sdpResp.text()
  // Normalize line endings to CRLF
  answerSDP = answerSDP.replace(/\r\n|\r|\n/g, '\r\n')
  console.log('[realtime] answer SDP received, first 10 lines:')
  answerSDP.split('\r\n').slice(0, 10).forEach(line => console.log('  ', line))

  await pc.setRemoteDescription({ type: 'answer', sdp: answerSDP })
  console.log('[realtime] remote description set')

  // 10) Wait for connection
  await new Promise<void>((resolve) => {
    if (pc.connectionState === 'connected') return resolve()
    const h = () => {
      if (pc.connectionState === 'connected') {
        pc.removeEventListener('connectionstatechange', h)
        resolve()
      }
    }
    pc.addEventListener('connectionstatechange', h)
  })
  console.log('[realtime] pc connected')

  // 11) Wait for DataChannel open
  await new Promise<void>((resolve) => {
    if (dc.readyState === 'open') return resolve()
    const onopen = () => {
      dc.removeEventListener('open', onopen)
      resolve()
    }
    dc.addEventListener('open', onopen)
  })

  // 12) Send session.update
  dc.send(JSON.stringify({
    type: 'session.update',
    session: {
      voice: 'verse',
      modalities: ['audio', 'text'],
      turn_detection: { type: 'server_vad', create_response: true }
    }
  }))
  console.log('[realtime] session.update sent')

  // 13) Send forced hello TTS
  dc.send(JSON.stringify({
    type: 'response.create',
    response: {
      instructions: 'Hello. Audio test.',
      modalities: ['audio', 'text'],
      audio: { voice: 'verse' }
    }
  }))
  console.log('[realtime] hello TTS sent')

  // 14) Public API

  function speak(text: string) {
    const payload = {
      type: 'response.create',
      response: {
        instructions: text || 'Please respond briefly.',
        modalities: ['audio', 'text'],
        audio: { voice: 'verse' }
      }
    }
    console.log('[realtime] speak:', payload.response.instructions)
    if (dc.readyState !== 'open') {
      console.warn('[realtime] dc not open for speak')
      return
    }
    dc.send(JSON.stringify(payload))
  }

  function waitForFinalTranscript(timeoutMs = 20000): Promise<string> {
    return new Promise((resolve, reject) => {
      let settled = false
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true
          cleanup()
          console.warn('[realtime] waitForFinalTranscript timeout')
          reject(new Error('transcript timeout'))
        }
      }, timeoutMs)

      const onEvent = (ev: any) => {
        const t = ev?.type

        // Prefer explicit STT completion events
        if (
          t === 'conversation.item.input_audio_transcription.completed' ||
          t === 'input_audio_buffer.speech_recognition.completed'
        ) {
          const transcript = ev?.transcript ?? ev?.text ?? ''
          if (transcript && String(transcript).trim().length > 0) {
            cleanup()
            clearTimeout(timer)
            settled = true
            console.log('[realtime] transcript resolved:', transcript)
            resolve(String(transcript))
            return
          }
        }

        // Fallback: response.completed with output_text
        if (t === 'response.completed') {
          const outputText = ev?.response?.output_text?.content ?? ''
          if (outputText && String(outputText).trim().length > 0) {
            cleanup()
            clearTimeout(timer)
            settled = true
            console.log('[realtime] transcript from response.completed:', outputText)
            resolve(String(outputText))
            return
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

  async function dumpInboundAudioStats(tag = 'stats') {
    try {
      const stats = await pc.getStats()
      let bytes = 0
      let codec = ''
      stats.forEach((r: any) => {
        if (r.type === 'inbound-rtp' && r.kind === 'audio') {
          bytes += r.bytesReceived || 0
        }
        if (r.type === 'codec' && r.mimeType && r.kind === 'audio') {
          codec = r.mimeType
        }
      })
      console.log(`[realtime] ${tag}: inboundAudioBytes=${bytes} codec=${codec}`)
    } catch (e) {
      console.warn('[realtime] getStats failed', e)
    }
  }

  function close() {
    try { for (const t of micStream.getTracks()) t.stop() } catch {}
    try { dc.close() } catch {}
    try { pc.close() } catch {}
    try { if (remoteAudio.parentElement) remoteAudio.remove() } catch {}
  }

  return { pc, dc, remoteAudio, speak, waitForFinalTranscript, dumpInboundAudioStats, close }
}
