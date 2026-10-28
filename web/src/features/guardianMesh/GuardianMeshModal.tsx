import React, { useEffect, useState, useRef } from 'react'
import { guardianMeshService } from './guardianMeshService'
import type { MeshNode, MeshPacket, MeshEventLog } from './meshTypes'

interface GuardianMeshModalProps {
  isOpen: boolean
  onClose: () => void
  currentCoords: [number, number]
  locationLabel: string
  emergencyContacts: { name: string; number: string }[]
}

export const GuardianMeshModal: React.FC<GuardianMeshModalProps> = ({
  isOpen,
  onClose,
  currentCoords,
  locationLabel,
  emergencyContacts,
}) => {
  const [nodes, setNodes] = useState<MeshNode[]>(guardianMeshService.getNodes())
  const [packets, setPackets] = useState<MeshPacket[]>(guardianMeshService.getPackets())
  const [logs, setLogs] = useState<MeshEventLog[]>(guardianMeshService.getLogs())
  const [isDeadZone, setIsDeadZone] = useState<boolean>(guardianMeshService.getIsDeadZoneSimulated())
  const [activeTab, setActiveTab] = useState<'topology' | 'nodes' | 'logs'>('topology')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const unsubscribe = guardianMeshService.subscribe(() => {
      setNodes([...guardianMeshService.getNodes()])
      setPackets([...guardianMeshService.getPackets()])
      setLogs([...guardianMeshService.getLogs()])
      setIsDeadZone(guardianMeshService.getIsDeadZoneSimulated())
    })
    return () => unsubscribe()
  }, [])

  const activePacket = packets[0]

  // Canvas visualizer for mesh topology & animated hopping packets
  useEffect(() => {
    if (!isOpen || activeTab !== 'topology') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrame: number
    let animOffset = 0

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      animOffset += 0.04

      // Draw background grid
      ctx.strokeStyle = 'rgba(31, 138, 112, 0.08)'
      ctx.lineWidth = 1
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Map node positions across the canvas
      const nodePositions: Record<string, { x: number; y: number; label: string; color: string; isGateway?: boolean }> = {
        [guardianMeshService.getSelfNodeId()]: {
          x: 70,
          y: canvas.height / 2,
          label: 'You (Victim)',
          color: '#e63946',
        },
        'NODE-7X9A': {
          x: 200,
          y: canvas.height / 2 - 45,
          label: 'Relay 1 (Metro)',
          color: '#3a86ff',
        },
        'NODE-3K2P': {
          x: 340,
          y: canvas.height / 2 + 45,
          label: 'Relay 2 (Shop)',
          color: '#3a86ff',
        },
        'NODE-GW99': {
          x: 480,
          y: canvas.height / 2,
          label: 'Gateway 4G (112 Relay)',
          color: '#2a9d8f',
          isGateway: true,
        },
      }

      // Draw connections between nodes
      const pathNodes = Object.keys(nodePositions)
      for (let i = 0; i < pathNodes.length - 1; i++) {
        const from = nodePositions[pathNodes[i]]
        const to = nodePositions[pathNodes[i + 1]]

        const isCurrentHop =
          activePacket &&
          activePacket.path.includes(pathNodes[i]) &&
          activePacket.path.includes(pathNodes[i + 1])

        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.strokeStyle = isCurrentHop ? '#2a9d8f' : 'rgba(100, 116, 139, 0.4)'
        ctx.lineWidth = isCurrentHop ? 3 : 1.5
        ctx.setLineDash(isCurrentHop ? [6, 4] : [2, 2])
        ctx.stroke()
        ctx.setLineDash([])

        // Draw moving packet pulse along the link if active
        if (isCurrentHop) {
          const t = (Math.sin(animOffset * 3) + 1) / 2
          const px = from.x + (to.x - from.x) * t
          const py = from.y + (to.y - from.y) * t

          ctx.beginPath()
          ctx.arc(px, py, 6, 0, Math.PI * 2)
          ctx.fillStyle = '#ffb703'
          ctx.fill()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }

      // Draw each node
      Object.entries(nodePositions).forEach(([id, node]) => {
        // Outer pulsing ring
        const pulseRadius = 14 + Math.sin(animOffset * 2) * 5
        ctx.beginPath()
        ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2)
        ctx.fillStyle = node.color === '#e63946' ? 'rgba(230, 57, 70, 0.18)' : 'rgba(42, 157, 143, 0.18)'
        ctx.fill()

        // Node center circle
        ctx.beginPath()
        ctx.arc(node.x, node.y, 10, 0, Math.PI * 2)
        ctx.fillStyle = node.color
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()

        // Node label
        ctx.fillStyle = '#1e293b'
        ctx.font = 'bold 10px "Space Grotesk", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(node.label, node.x, node.y + 24)

        // Node ID
        ctx.fillStyle = '#64748b'
        ctx.font = '9px monospace'
        ctx.fillText(id, node.x, node.y - 16)
      })

      animationFrame = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animationFrame)
  }, [isOpen, activeTab, activePacket])

  if (!isOpen) return null

  const handleToggleDeadZone = (e: React.ChangeEvent<HTMLInputElement>) => {
    guardianMeshService.setDeadZoneSimulation(e.target.checked)
  }

  const handleTriggerMeshSOS = () => {
    guardianMeshService.broadcastSOS({
      id: Math.random().toString(36).slice(2, 9),
      originNodeId: guardianMeshService.getSelfNodeId(),
      timestamp: Date.now(),
      coords: currentCoords,
      locationLabel: locationLabel || 'Bengaluru Corridor',
      severity: 'critical',
      category: 'sos',
      emergencyContacts: emergencyContacts,
      medicalNotes: 'Type O+ blood · Asthmatic inhaler carried',
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="mesh-modal-shell" onClick={(e) => e.stopPropagation()}>
        <div className="mesh-modal-header">
          <div>
            <div className="mesh-eyebrow">WORLD-FIRST ZERO-CELLULAR P2P TECHNOLOGY</div>
            <h2>Guardian Mesh SOS Protocol</h2>
            <p className="mesh-subtitle">
              Routes encrypted distress packets browser-to-browser via WebRTC &amp; Web Bluetooth across offline peers until reaching a cellular node.
            </p>
          </div>
          <button className="mesh-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="mesh-status-strip">
          <div className="mesh-mode-indicator">
            <span className={`mesh-indicator-dot ${isDeadZone ? 'dot-deadzone' : 'dot-online'}`} />
            <strong>{isDeadZone ? '0-BARS DEAD ZONE DETECTED' : 'CELLULAR ONLINE (STANDBY)'}</strong>
          </div>

          <label className="mesh-toggle-label">
            <input
              type="checkbox"
              checked={isDeadZone}
              onChange={handleToggleDeadZone}
            />
            <span>Simulate Dead Zone / 0 Cellular Bars</span>
          </label>
        </div>

        {activePacket && (
          <div className={`mesh-active-alert ${activePacket.type === 'ACK_DISPATCHED' ? 'alert-success' : 'alert-hopping'}`}>
            <div className="alert-header">
              <span className="pulse-icon">{activePacket.type === 'ACK_DISPATCHED' ? '✅' : '🚨'}</span>
              <div>
                <strong>
                  {activePacket.type === 'ACK_DISPATCHED'
                    ? '112 POLICE ERSS DISPATCH CONFIRMED'
                    : `EMERGENCY SOS RELAYING (HOP ${activePacket.hops}/5)`}
                </strong>
                <p>
                  Packet ID: <code>{activePacket.packetId}</code> · Origin: {locationLabel}
                </p>
              </div>
            </div>
            <div className="mesh-path-pills">
              <span>Hop Sequence:</span>
              {activePacket.path.map((nodeId, idx) => (
                <span key={nodeId} className="path-pill">
                  {idx > 0 && ' → '}
                  <strong>{nodeId}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mesh-tab-bar">
          <button
            className={`mesh-tab ${activeTab === 'topology' ? 'active' : ''}`}
            onClick={() => setActiveTab('topology')}
          >
            Topology Map
          </button>
          <button
            className={`mesh-tab ${activeTab === 'nodes' ? 'active' : ''}`}
            onClick={() => setActiveTab('nodes')}
          >
            Nearby Peers ({nodes.length})
          </button>
          <button
            className={`mesh-tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            Relay Telemetry Logs ({logs.length})
          </button>
        </div>

        <div className="mesh-tab-content">
          {activeTab === 'topology' && (
            <div className="topology-view">
              <canvas
                ref={canvasRef}
                width={560}
                height={220}
                className="mesh-canvas"
              />
              <div className="topology-legend">
                <span><i style={{ background: '#e63946' }} /> Victim Device (You)</span>
                <span><i style={{ background: '#3a86ff' }} /> Offline Peer Relays</span>
                <span><i style={{ background: '#2a9d8f' }} /> 4G Gateway to 112</span>
              </div>
            </div>
          )}

          {activeTab === 'nodes' && (
            <div className="mesh-node-list">
              {nodes.map((node) => (
                <div key={node.id} className="mesh-node-card">
                  <div className="node-icon">{node.hasCellular ? '📶' : '📡'}</div>
                  <div className="node-details">
                    <strong>{node.name}</strong>
                    <span className="node-id">ID: {node.id} {node.isSelf && '(This Phone)'}</span>
                    <small>Distance: ~{node.distanceMeters}m · RSSI: {node.rssi} dBm</small>
                  </div>
                  <div className="node-badge">
                    <span className={`pill ${node.hasCellular ? 'pill-green' : 'pill-amber'}`}>
                      {node.hasCellular ? '4G Cellular Gateway' : 'Offline Mesh Relay'}
                    </span>
                    <span className="battery-level">🔋 {node.battery}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="mesh-log-view">
              {logs.map((log) => (
                <div key={log.id} className={`log-line log-${log.type}`}>
                  <span className="log-time">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="log-msg">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mesh-actions-footer">
          <button
            className="mesh-test-btn"
            onClick={handleTriggerMeshSOS}
          >
            🚨 Broadcast 0-Cellular SOS Distress Packet
          </button>
          <button className="mesh-close-secondary" onClick={onClose}>
            Close Mesh Panel
          </button>
        </div>
      </div>
    </div>
  )
}
