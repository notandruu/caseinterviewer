export type STT = {
  start: (onFinal: (text: string) => void) => void
  stop: () => void
  isSupported: boolean
}

export function makeBrowserSTT(): STT {
  const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  const isSupported = !!SR
  let rec: SpeechRecognition | null = null
  let finalText = ''

  function start(onFinal: (text: string) => void) {
    if (!SR) return
    finalText = ''
    rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t
        else interim += t
      }
      // optional: show interim somewhere
    }

    rec.onerror = () => {}
    rec.onend = () => {
      onFinal(finalText.trim())
    }
    rec.start()
  }

  function stop() {
    try { rec?.stop() } catch {}
    rec = null
  }

  return { start, stop, isSupported }
}
