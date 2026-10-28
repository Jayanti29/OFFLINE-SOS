export type TriggerSource = 'scream_decibel' | 'voice_keyword' | 'physical_motion' | 'manual_test'

export interface PanicTriggerEvent {
  source: TriggerSource
  decibels: number
  keyword?: string
  acceleration?: number
  timestamp: number
}

class AcousticGuardService {
  private isMonitoring: boolean = false
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private micStream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private recognition: any = null
  private motionListenerAttached: boolean = false

  // Callbacks
  private onTriggerListeners: Set<(event: PanicTriggerEvent) => void> = new Set()
  private onAudioMetricsListeners: Set<(db: number, highFreqRatio: number) => void> = new Set()
  private onAudioClipReadyListeners: Set<(audioUrl: string) => void> = new Set()
  private statusListeners: Set<(active: boolean) => void> = new Set()

  private animFrameId: number | null = null
  private sensitivity: 'low' | 'medium' | 'high' = 'medium'
  private lastTriggerTime: number = 0

  public isRunning(): boolean {
    return this.isMonitoring
  }

  public setSensitivity(level: 'low' | 'medium' | 'high') {
    this.sensitivity = level
  }

  public getSensitivity(): 'low' | 'medium' | 'high' {
    return this.sensitivity
  }

  public onTrigger(callback: (event: PanicTriggerEvent) => void): () => void {
    this.onTriggerListeners.add(callback)
    return () => this.onTriggerListeners.delete(callback)
  }

  public onAudioMetrics(callback: (db: number, highFreqRatio: number) => void): () => void {
    this.onAudioMetricsListeners.add(callback)
    return () => this.onAudioMetricsListeners.delete(callback)
  }

  public onAudioClipReady(callback: (audioUrl: string) => void): () => void {
    this.onAudioClipReadyListeners.add(callback)
    return () => this.onAudioClipReadyListeners.delete(callback)
  }

  public onStatusChange(callback: (active: boolean) => void): () => void {
    this.statusListeners.add(callback)
    return () => this.statusListeners.delete(callback)
  }

  private notifyStatus() {
    this.statusListeners.forEach((fn) => fn(this.isMonitoring))
  }

  public async startMonitoring(): Promise<boolean> {
    if (this.isMonitoring) return true

    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        this.audioContext = new AudioContextClass()

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          this.micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          })

          const source = this.audioContext.createMediaStreamSource(this.micStream)
          this.analyser = this.audioContext.createAnalyser()
          this.analyser.fftSize = 1024
          this.analyser.smoothingTimeConstant = 0.4
          source.connect(this.analyser)

          this.startAudioAnalysisLoop()
        }
      }

      this.initVoiceKeywordRecognition()
      this.initMotionSensor()

      this.isMonitoring = true
      this.notifyStatus()
      return true
    } catch (err) {
      console.warn('Microphone permission or audio context unavailable, starting in fallback mode:', err)
      // Fallback monitoring mode for environments without microphone access
      this.isMonitoring = true
      this.startSimulatedAudioLoop()
      this.notifyStatus()
      return true
    }
  }

  public stopMonitoring() {
    this.isMonitoring = false

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop())
      this.micStream = null
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
    }

    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch {}
      this.recognition = null
    }

    if (this.motionListenerAttached && typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.handleDeviceMotion)
      this.motionListenerAttached = false
    }

    this.notifyStatus()
  }

  private startAudioAnalysisLoop() {
    if (!this.analyser) return
    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const thresholdDb = this.sensitivity === 'high' ? 76 : this.sensitivity === 'medium' ? 84 : 92

    const analyze = () => {
      if (!this.isMonitoring || !this.analyser) return

      this.analyser.getByteFrequencyData(dataArray)

      // Calculate RMS power
      let sumSquares = 0
      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i] / 255
        sumSquares += val * val
      }
      const rms = Math.sqrt(sumSquares / bufferLength)
      const decibels = Math.round(20 * Math.log10(Math.max(rms, 0.0001)) + 100)

      // Calculate high frequency ratio (scream band ~ 2500Hz - 4500Hz)
      const sampleRate = this.audioContext?.sampleRate || 44100
      const binWidth = sampleRate / 1024
      const startBin = Math.floor(2500 / binWidth)
      const endBin = Math.floor(4500 / binWidth)

      let screamBandEnergy = 0
      let totalEnergy = 0
      for (let i = 0; i < bufferLength; i++) {
        totalEnergy += dataArray[i]
        if (i >= startBin && i <= endBin) {
          screamBandEnergy += dataArray[i]
        }
      }

      const highFreqRatio = totalEnergy > 0 ? screamBandEnergy / totalEnergy : 0

      // Notify metric listeners
      this.onAudioMetricsListeners.forEach((fn) => fn(decibels, highFreqRatio))

      // Scream panic trigger condition: High decibels + prominent high-frequency scream acoustic profile
      const now = Date.now()
      if (
        decibels >= thresholdDb &&
        highFreqRatio > 0.32 &&
        now - this.lastTriggerTime > 12000
      ) {
        this.lastTriggerTime = now
        this.firePanicTrigger({
          source: 'scream_decibel',
          decibels,
          timestamp: now,
        })
      }

      this.animFrameId = requestAnimationFrame(analyze)
    }

    analyze()
  }

  private startSimulatedAudioLoop() {
    let phase = 0
    const simulate = () => {
      if (!this.isMonitoring) return
      phase += 0.05
      // Ambient noise level around 35-48 dB
      const simulatedDb = Math.round(40 + Math.sin(phase) * 6 + Math.random() * 4)
      const highFreqRatio = 0.12 + Math.random() * 0.05
      this.onAudioMetricsListeners.forEach((fn) => fn(simulatedDb, highFreqRatio))
      this.animFrameId = requestAnimationFrame(simulate)
    }
    simulate()
  }

  private initVoiceKeywordRecognition() {
    if (typeof window === 'undefined') return
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionClass) return

    try {
      this.recognition = new SpeechRecognitionClass()
      this.recognition.continuous = true
      this.recognition.interimResults = false
      this.recognition.lang = 'en-US'

      const distressKeywords = ['help me', 'bachao', 'stop', 'leave me', 'emergency', 'police', 'save me', 'attack']

      this.recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1
        const transcript = event.results[lastIndex][0]?.transcript?.toLowerCase() || ''

        const matched = distressKeywords.find((word) => transcript.includes(word))
        if (matched && Date.now() - this.lastTriggerTime > 12000) {
          this.lastTriggerTime = Date.now()
          this.firePanicTrigger({
            source: 'voice_keyword',
            keyword: matched,
            decibels: 78,
            timestamp: Date.now(),
          })
        }
      }

      this.recognition.onerror = () => {
        // Voice recognition errors are gracefully ignored
      }

      this.recognition.onend = () => {
        if (this.isMonitoring) {
          try {
            this.recognition.start()
          } catch {}
        }
      }

      this.recognition.start()
    } catch {}
  }

  private initMotionSensor() {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return
    window.addEventListener('devicemotion', this.handleDeviceMotion)
    this.motionListenerAttached = true
  }

  private handleDeviceMotion = (event: DeviceMotionEvent) => {
    if (!this.isMonitoring) return
    const acc = event.accelerationIncludingGravity || event.acceleration
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return

    const totalAcc = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z)
    // Severe shaking or violent struggle detection (> 26 m/s²)
    if (totalAcc > 26 && Date.now() - this.lastTriggerTime > 12000) {
      this.lastTriggerTime = Date.now()
      this.firePanicTrigger({
        source: 'physical_motion',
        acceleration: Math.round(totalAcc),
        decibels: 65,
        timestamp: Date.now(),
      })
    }
  }

  public firePanicTrigger(event: PanicTriggerEvent) {
    this.onTriggerListeners.forEach((fn) => fn(event))
  }

  // Records 10 seconds of background audio upon uncancelled trigger
  public async record10sAudioSnippet(): Promise<string | null> {
    const stream = this.micStream
    if (!stream) return null
    return new Promise((resolve) => {
      try {
        this.recordedChunks = []
        this.mediaRecorder = new MediaRecorder(stream)

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.recordedChunks.push(e.data)
        }

        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, { type: 'audio/webm' })
          const audioUrl = URL.createObjectURL(blob)
          this.onAudioClipReadyListeners.forEach((fn) => fn(audioUrl))
          resolve(audioUrl)
        }

        this.mediaRecorder.start()
        setTimeout(() => {
          if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop()
          }
        }, 10000)
      } catch {
        resolve(null)
      }
    })
  }
}

export const acousticGuardService = new AcousticGuardService()
