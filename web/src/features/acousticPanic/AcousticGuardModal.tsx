import React, { useEffect, useState, useRef } from 'react'
import { acousticGuardService } from './acousticGuardService'

interface AcousticGuardModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AcousticGuardModal: React.FC<AcousticGuardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isActive, setIsActive] = useState<boolean>(acousticGuardService.isRunning())
  const [currentDb, setCurrentDb] = useState<number>(42)
  const [highFreqRatio, setHighFreqRatio] = useState<number>(0.12)
  const [sensitivity, setSensitivity] = useState<'low' | 'medium' | 'high'>(
    acousticGuardService.getSensitivity()
  )
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const unsubStatus = acousticGuardService.onStatusChange((active) => setIsActive(active))
    const unsubMetrics = acousticGuardService.onAudioMetrics((db, ratio) => {
      setCurrentDb(db)
      setHighFreqRatio(ratio)
    })

    return () => {
      unsubStatus()
      unsubMetrics()
    }
  }, [])

  // Audio visualizer waveform animation
  useEffect(() => {
    if (!isOpen) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let phase = 0

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      phase += 0.08

      const numBars = 32
      const barWidth = (canvas.width - (numBars - 1) * 3) / numBars

      for (let i = 0; i < numBars; i++) {
        // Base bar height influenced by currentDb
        const norm = Math.min(1, Math.max(0.1, (currentDb - 30) / 60))
        const wave = Math.sin(phase + i * 0.3) * 0.4 + 0.6
        const barHeight = canvas.height * norm * wave

        const x = i * (barWidth + 3)
        const y = canvas.height - barHeight

        // Color transitions to red when loud/scream
        const isSpike = currentDb > 75 && i > 18
        ctx.fillStyle = isSpike
          ? '#e63946'
          : currentDb > 65
          ? '#f4a261'
          : '#2a9d8f'

        ctx.fillRect(x, y, barWidth, barHeight)
      }

      animId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [isOpen, currentDb])

  if (!isOpen) return null

  const handleToggleMonitoring = async () => {
    if (isActive) {
      acousticGuardService.stopMonitoring()
    } else {
      await acousticGuardService.startMonitoring()
    }
  }

  const handleSensitivityChange = (level: 'low' | 'medium' | 'high') => {
    setSensitivity(level)
    acousticGuardService.setSensitivity(level)
  }

  const handleTestScream = () => {
    acousticGuardService.firePanicTrigger({
      source: 'scream_decibel',
      decibels: 88,
      timestamp: Date.now(),
    })
    onClose()
  }

  const handleTestKeyword = () => {
    acousticGuardService.firePanicTrigger({
      source: 'voice_keyword',
      keyword: 'Help me!',
      decibels: 79,
      timestamp: Date.now(),
    })
    onClose()
  }

  const handleTestMotion = () => {
    acousticGuardService.firePanicTrigger({
      source: 'physical_motion',
      acceleration: 29,
      decibels: 68,
      timestamp: Date.now(),
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="guard-modal-shell" onClick={(e) => e.stopPropagation()}>
        <div className="guard-header">
          <div>
            <div className="guard-eyebrow">HANDS-FREE EMERGENCY MONITORING</div>
            <h2>Acoustic Panic &amp; "Scream Guard"</h2>
            <p className="guard-subtitle">
              Listens for sudden high-decibel screams (2.5kHz-4.5kHz spectral peak), voice distress keywords, or violent physical struggle.
            </p>
          </div>
          <button className="mesh-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="guard-monitor-toggle-row">
          <div className="monitor-status">
            <span className={`guard-dot ${isActive ? 'dot-active' : 'dot-inactive'}`} />
            <strong>{isActive ? 'SCREAM GUARD RUNNING IN BACKGROUND' : 'MONITORING STANDBY (OFF)'}</strong>
          </div>
          <button
            className={`guard-main-btn ${isActive ? 'btn-stop' : 'btn-start'}`}
            onClick={handleToggleMonitoring}
          >
            {isActive ? 'Stop Monitoring' : '🎙️ Start Scream Guard'}
          </button>
        </div>

        <div className="visualizer-card">
          <div className="visualizer-header">
            <span>Spectral Audio Feed</span>
            <div className="db-meter">
              <strong>{currentDb} dB</strong>
              <small>Peak Spectrum: {(highFreqRatio * 100).toFixed(0)}% High-Freq</small>
            </div>
          </div>
          <canvas ref={canvasRef} width={520} height={100} className="visualizer-canvas" />
        </div>

        <div className="guard-settings-section">
          <h4>Scream Detection Sensitivity</h4>
          <div className="sensitivity-selector">
            <button
              className={`sens-btn ${sensitivity === 'low' ? 'active' : ''}`}
              onClick={() => handleSensitivityChange('low')}
            >
              <strong>Low (92 dB)</strong>
              <small>Only loud piercing shrieks</small>
            </button>
            <button
              className={`sens-btn ${sensitivity === 'medium' ? 'active' : ''}`}
              onClick={() => handleSensitivityChange('medium')}
            >
              <strong>Medium (84 dB)</strong>
              <small>Standard threat detection</small>
            </button>
            <button
              className={`sens-btn ${sensitivity === 'high' ? 'active' : ''}`}
              onClick={() => handleSensitivityChange('high')}
            >
              <strong>High (76 dB)</strong>
              <small>Quiet street / indoor protection</small>
            </button>
          </div>
        </div>

        <div className="guard-triggers-info">
          <h4>Armed Multi-Modal Sensors</h4>
          <div className="triggers-grid">
            <div className="trigger-item">
              <span className="trigger-icon">🗣️</span>
              <div>
                <strong>Voice Distress Keywords</strong>
                <small>"Help me", "Bachao", "Stop", "Emergency", "Police", "Attack"</small>
              </div>
            </div>
            <div className="trigger-item">
              <span className="trigger-icon">🏃</span>
              <div>
                <strong>Physical Motion &amp; Struggle</strong>
                <small>Sudden violent shake, drop, or physical assault (&gt; 25 m/s²)</small>
              </div>
            </div>
            <div className="trigger-item">
              <span className="trigger-icon">⏱️</span>
              <div>
                <strong>Dead-Man's Switch</strong>
                <small>5-second silent vibration timer before automatic SOS dispatch</small>
              </div>
            </div>
            <div className="trigger-item">
              <span className="trigger-icon">🎙️</span>
              <div>
                <strong>Evidence Audio Capture</strong>
                <small>Records &amp; streams 10s audio incident snippet automatically</small>
              </div>
            </div>
          </div>
        </div>

        <div className="guard-sim-section">
          <h4>Interactive Demo &amp; Sensor Simulation</h4>
          <p>Test the 5-second Dead-Man's Switch and emergency recording flow without shouting:</p>
          <div className="sim-buttons">
            <button className="sim-btn" onClick={handleTestScream}>
              ⚡ Simulate 88dB Scream
            </button>
            <button className="sim-btn" onClick={handleTestKeyword}>
              🎙️ Simulate Voice Keyword ("Help me!")
            </button>
            <button className="sim-btn" onClick={handleTestMotion}>
              🏃 Simulate Violent Shake
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
