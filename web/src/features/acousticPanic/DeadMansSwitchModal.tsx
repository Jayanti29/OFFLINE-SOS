import React, { useEffect, useState, useRef, useCallback } from 'react'
import type { PanicTriggerEvent } from './acousticGuardService'
import { acousticGuardService } from './acousticGuardService'

interface DeadMansSwitchModalProps {
  isOpen: boolean
  triggerEvent: PanicTriggerEvent | null
  onCancel: () => void
  onConfirmedPanic: (audioUrl?: string) => void
}

const DeadMansSwitchModalContent: React.FC<{
  triggerEvent: PanicTriggerEvent | null
  onCancel: () => void
  onConfirmedPanic: (audioUrl?: string) => void
}> = ({ triggerEvent, onCancel, onConfirmedPanic }) => {
  const [countdown, setCountdown] = useState<number>(5)
  const [isTriggered, setIsTriggered] = useState<boolean>(false)
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false)
  const timerRef = useRef<any>(null)

  const handleTimerExpired = useCallback(async () => {
    setIsTriggered(true)
    setIsRecordingAudio(true)

    // Notify parent to initiate SOS broadcast immediately
    onConfirmedPanic()

    // Record 10s background ambient audio
    try {
      const url = await acousticGuardService.record10sAudioSnippet()
      if (url) {
        setRecordedAudioUrl(url)
      }
    } catch {} finally {
      setIsRecordingAudio(false)
    }
  }, [onConfirmedPanic])

  useEffect(() => {
    // Trigger haptic vibration pulses
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([300, 150, 300, 150, 450])
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          void handleTimerExpired()
          return 0
        }
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([200, 80, 200])
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [handleTimerExpired])

  const getTriggerLabel = () => {
    if (!triggerEvent) return 'Acoustic Alert'
    switch (triggerEvent.source) {
      case 'scream_decibel':
        return `High-Decibel Scream Detected (${triggerEvent.decibels} dB)`
      case 'voice_keyword':
        return `Voice Distress Keyword Detected ("${triggerEvent.keyword}")`
      case 'physical_motion':
        return `Violent Physical Motion / Struggle Detected (${triggerEvent.acceleration} m/s²)`
      default:
        return 'Manual Emergency Panic Trigger'
    }
  }

  return (
    <div className="deadman-backdrop">
      <div className="deadman-shell">
        {!isTriggered ? (
          <div className="deadman-countdown-card">
            <div className="deadman-pulse-ring">
              <span className="deadman-number">{countdown}</span>
            </div>

            <div className="deadman-warning-badge">⚠️ ACOUSTIC PANIC TRIGGERED</div>
            <h2>Dead-Man's Switch Active</h2>
            <p className="deadman-desc">{getTriggerLabel()}</p>
            <p className="deadman-subtext">
              Silent emergency distress payload will auto-broadcast in <strong>{countdown}s</strong> unless you tap below.
            </p>

            <button
              className="deadman-safe-btn"
              onClick={onCancel}
            >
              🛡️ I'M SAFE — CANCEL ALERT
            </button>
          </div>
        ) : (
          <div className="deadman-confirmed-card">
            <div className="confirmed-icon">🚨</div>
            <h2>Distress Broadcast Dispatched!</h2>
            <p className="confirmed-desc">
              Automatic alert broadcasted to <strong>Guardian Mesh</strong>, emergency contacts, and 112 ERSS responders.
            </p>

            <div className="audio-recording-panel">
              <div className="recording-status">
                <span className={`record-dot ${isRecordingAudio ? 'recording' : 'recorded'}`} />
                <span>
                  {isRecordingAudio
                    ? 'Capturing 10-second ambient incident audio...'
                    : '10-Second ambient audio evidence captured'}
                </span>
              </div>

              {recordedAudioUrl && (
                <div className="audio-player-wrap">
                  <audio controls src={recordedAudioUrl} className="evidence-audio" />
                  <small>Audio streamed to emergency contact mesh</small>
                </div>
              )}
            </div>

            <button className="deadman-close-btn" onClick={onCancel}>
              Dismiss Alert Screen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export const DeadMansSwitchModal: React.FC<DeadMansSwitchModalProps> = ({
  isOpen,
  triggerEvent,
  onCancel,
  onConfirmedPanic,
}) => {
  if (!isOpen) return null

  return (
    <DeadMansSwitchModalContent
      triggerEvent={triggerEvent}
      onCancel={onCancel}
      onConfirmedPanic={onConfirmedPanic}
    />
  )
}
