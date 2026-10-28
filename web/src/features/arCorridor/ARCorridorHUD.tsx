import React, { useEffect, useState, useRef } from 'react'

interface ARCorridorHUDProps {
  isOpen: boolean
  onClose: () => void
  onTriggerSOS: () => void
  currentStreetName: string
  nearbyHospitals: { name: string; distance: string }[]
  nearbyPolice: { name: string; distance: string }[]
}

const ARCorridorHUDContent: React.FC<Omit<ARCorridorHUDProps, 'isOpen'>> = ({
  onClose,
  onTriggerSOS,
  currentStreetName,
  nearbyHospitals,
  nearbyPolice,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false)
  const [heading, setHeading] = useState<number>(42)
  const [pitch, setPitch] = useState<number>(0)
  const streetLux = 36
  const [showAlleyWarning, setShowAlleyWarning] = useState<boolean>(true)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Start camera stream on mount
  useEffect(() => {
    let active = true
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        .then((stream) => {
          if (!active) {
            stream.getTracks().forEach((track) => track.stop())
            return
          }
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play().catch(() => {})
          }
          setCameraActive(true)
        })
        .catch(() => {
          if (active) setCameraActive(false)
        })
    }

    return () => {
      active = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  // Device orientation / gyroscope
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) setHeading(Math.round(e.alpha))
      if (e.beta !== null) setPitch(Math.round(e.beta - 60)) // tilt offset
    }

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleOrientation)
      }
    }
  }, [])

  // Mouse / touch drag fallback for desktop
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cameraActive) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setHeading(Math.round(42 + x * 60))
    setPitch(Math.round(y * 30))
  }

  // 3D Canvas AR Corridor rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let flowOffset = 0

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      flowOffset += 0.03

      const w = canvas.width
      const h = canvas.height
      const vanishingX = w / 2 + (heading - 42) * 4
      const vanishingY = h * 0.46 + pitch * 3

      // 1. Draw 3D Translucent Safe Green Corridor onto the street plane
      const bottomWidth = w * 0.72
      const topWidth = w * 0.14
      const bottomY = h
      const topY = vanishingY + 30

      // Safe Corridor Polygon
      const gradient = ctx.createLinearGradient(0, bottomY, 0, topY)
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.45)')
      gradient.addColorStop(0.6, 'rgba(16, 185, 129, 0.25)')
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)')

      ctx.beginPath()
      ctx.moveTo(vanishingX - bottomWidth / 2, bottomY)
      ctx.lineTo(vanishingX - topWidth / 2, topY)
      ctx.lineTo(vanishingX + topWidth / 2, topY)
      ctx.lineTo(vanishingX + bottomWidth / 2, bottomY)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()

      // Neon Corridor Edge Lines
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 3
      ctx.shadowColor = '#10b981'
      ctx.shadowBlur = 12

      ctx.beginPath()
      ctx.moveTo(vanishingX - bottomWidth / 2, bottomY)
      ctx.lineTo(vanishingX - topWidth / 2, topY)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(vanishingX + bottomWidth / 2, bottomY)
      ctx.lineTo(vanishingX + topWidth / 2, topY)
      ctx.stroke()
      ctx.shadowBlur = 0

      // Animated Chevrons moving along the safe corridor
      for (let i = 0; i < 5; i++) {
        const t = ((flowOffset + i * 0.2) % 1)
        const cy = bottomY - (bottomY - topY) * t
        const curW = bottomWidth - (bottomWidth - topWidth) * t

        ctx.beginPath()
        ctx.moveTo(vanishingX - curW * 0.35, cy + 10)
        ctx.lineTo(vanishingX, cy - 8)
        ctx.lineTo(vanishingX + curW * 0.35, cy + 10)
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 - t * 0.6})`
        ctx.lineWidth = 4 - t * 2
        ctx.stroke()
      }

      // 2. Draw Dark Alley Red Danger Warning on the side alley
      if (showAlleyWarning) {
        const alleyX = vanishingX + w * 0.28
        const alleyY = vanishingY + 70

        // Danger zone polygon
        ctx.beginPath()
        ctx.moveTo(vanishingX + topWidth / 2 + 10, topY + 40)
        ctx.lineTo(alleyX, alleyY)
        ctx.lineTo(alleyX + 80, alleyY + 60)
        ctx.lineTo(vanishingX + bottomWidth * 0.42, bottomY - 50)
        ctx.closePath()
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)'
        ctx.fill()

        // Red border with warning stripes
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2
        ctx.stroke()

        // Floating 3D Danger Sign
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(alleyX - 85, alleyY - 45, 170, 42, 6)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = '#ef4444'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('⚠️ UNLIT DARK ALLEY', alleyX, alleyY - 26)
        ctx.fillStyle = '#fca5a5'
        ctx.font = '10px sans-serif'
        ctx.fillText('Lux: 3.2 · High-Risk Shortcut', alleyX, alleyY - 12)
      }

      // 3. Floating 3D Holographic Hospital Beacon
      const hospX = vanishingX - w * 0.26
      const hospY = vanishingY - 40
      const hospDist = nearbyHospitals[0]?.distance || '420m'
      const hospName = nearbyHospitals[0]?.name || 'Ramaiah Memorial Hospital'

      // Hospital Beacon Pillar
      ctx.beginPath()
      ctx.moveTo(hospX, hospY)
      ctx.lineTo(hospX, hospY + 90)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])

      // Hospital Holographic Card
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(hospX - 95, hospY - 48, 190, 46, 8)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#10b981'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`🏥 ${hospName.slice(0, 18)}...`, hospX, hospY - 28)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px sans-serif'
      ctx.fillText(`24/7 Emergency · ${hospDist} ahead`, hospX, hospY - 12)

      // 4. Floating 3D Holographic Police Station Beacon
      const polX = vanishingX + w * 0.32
      const polY = vanishingY - 60
      const polDist = nearbyPolice[0]?.distance || '850m'
      const polName = nearbyPolice[0]?.name || 'Jalahalli Police Station'

      ctx.beginPath()
      ctx.moveTo(polX, polY)
      ctx.lineTo(polX, polY + 110)
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(polX - 90, polY - 48, 180, 46, 8)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#3b82f6'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`🛡️ ${polName.slice(0, 18)}...`, polX, polY - 28)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px sans-serif'
      ctx.fillText(`Police Outpost · ${polDist}`, polX, polY - 12)

      animId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [heading, pitch, showAlleyWarning, nearbyHospitals, nearbyPolice])

  // Generate compass ribbon ticks
  const compassDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

  return (
    <div className="ar-fullscreen-shell" onMouseMove={handleMouseMove}>
      {/* Background camera or simulated night street */}
      {cameraActive ? (
        <video ref={videoRef} className="ar-camera-video" playsInline muted autoPlay />
      ) : (
        <div className="ar-simulated-night-scene">
          <div className="night-city-skyline" />
          <div className="night-street-surface" />
          <div className="camera-note-overlay">
            <span>📷 Simulated Night Camera View (Drag mouse/tilt phone to look around)</span>
          </div>
        </div>
      )}

      {/* 3D AR Canvas Overlay */}
      <canvas
        ref={canvasRef}
        width={window.innerWidth || 1024}
        height={window.innerHeight || 768}
        className="ar-canvas-overlay"
      />

      {/* Top HUD Telemetry Bar */}
      <header className="ar-top-hud">
        <div className="ar-compass-wrap">
          <div className="ar-compass-tape">
            {compassDirections.map((dir, i) => (
              <span key={dir} className={`compass-mark ${heading >= i * 45 - 20 && heading <= i * 45 + 20 ? 'active' : ''}`}>
                {dir}
              </span>
            ))}
          </div>
          <span className="ar-bearing-badge">{heading.toString().padStart(3, '0')}°</span>
        </div>

        <div className="ar-top-actions">
          <div className="ar-lux-pill">
            <span className="lux-icon">💡</span>
            <span>{streetLux} Lux (Well-Lit Corridor)</span>
          </div>
          <button className="ar-close-btn" onClick={onClose}>
            ✕ Exit AR
          </button>
        </div>
      </header>

      {/* Bottom AR Guidance Card */}
      <footer className="ar-bottom-hud">
        <div className="ar-guidance-card">
          <div className="guidance-meta">
            <span className="corridor-safe-tag">✓ 94% SAFE WELL-LIT CORRIDOR</span>
            <h3>{currentStreetName || 'Safe Corridor: Main Road'}</h3>
            <p>Follow the glowing green path. Avoid dark side alleys.</p>
          </div>

          <div className="ar-actions-cluster">
            <button
              className="ar-sos-emergency-btn"
              onClick={onTriggerSOS}
            >
              🚨 EMERGENCY SOS
            </button>
            <button
              className="ar-toggle-alley-btn"
              onClick={() => setShowAlleyWarning(!showAlleyWarning)}
            >
              {showAlleyWarning ? 'Hide Alley Warning' : 'Show Dark Alley'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

export const ARCorridorHUD: React.FC<ARCorridorHUDProps> = (props) => {
  if (!props.isOpen) return null
  return <ARCorridorHUDContent {...props} />
}
