import React, { useEffect, useState, useMemo } from 'react'
import { companionService, type EphemeralCompanion } from './companionService'

interface WalkTogetherModalProps {
  isOpen: boolean
  onClose: () => void
  onTriggerSOS: () => void
  currentCorridor: string
}

export const WalkTogetherModal: React.FC<WalkTogetherModalProps> = ({
  isOpen,
  onClose,
  onTriggerSOS,
  currentCorridor,
}) => {
  const [matched, setMatched] = useState<EphemeralCompanion | null>(companionService.getMatchedCompanion())
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [zkToken, setZkToken] = useState<string>('')
  const candidates = useMemo(() => companionService.getAvailableCompanions(currentCorridor), [currentCorridor])

  useEffect(() => {
    const unsub = companionService.subscribe(() => {
      setMatched(companionService.getMatchedCompanion())
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    let cancelled = false
    if (isOpen) {
      companionService.generateZeroKnowledgeToken(currentCorridor || 'Main Corridor', 'now').then((token) => {
        if (!cancelled) setZkToken(token)
      })
    }
    return () => {
      cancelled = true
    }
  }, [isOpen, currentCorridor])

  if (!isOpen) return null

  const handleMatch = (companion: EphemeralCompanion) => {
    setIsSearching(true)
    setTimeout(() => {
      companionService.matchWith(companion)
      setIsSearching(false)
    }, 1200)
  }

  const handleEndWalk = () => {
    companionService.disconnectCompanion()
  }

  const handleMutualPanic = () => {
    companionService.triggerSharedPanic()
    onTriggerSOS()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="companion-modal-shell" onClick={(e) => e.stopPropagation()}>
        <div className="companion-header">
          <div>
            <div className="companion-eyebrow">WORLD-FIRST ZERO-KNOWLEDGE COMMUTER PAIRING</div>
            <h2>Anonymous "Walk-Together" Matching</h2>
            <p className="companion-subtitle">
              Walk safely late at night with verified peers along designated well-lit corridors without revealing your phone number, identity, or exact home destination.
            </p>
          </div>
          <button className="mesh-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {matched ? (
          <div className="matched-active-container">
            <div className="matched-banner">
              <span className="matched-badge-icon">🤝</span>
              <div>
                <h3>Matched with {matched.pseudonym}</h3>
                <p>Walking together on <strong>{matched.corridor}</strong></p>
              </div>
            </div>

            <div className="zk-card">
              <div className="zk-header">
                <span>MUTUAL ZERO-KNOWLEDGE VERIFICATION CODE</span>
                <span className="zk-hash">Token: {matched.tokenHash}</span>
              </div>
              <div className="mutual-code-display">
                <span className="code-circle" />
                <strong>{matched.mutualCode}</strong>
              </div>
              <small>
                Show this code on your screen when meeting at the rendezvous point to confirm your companion with 0 identity leakage.
              </small>
            </div>

            <div className="companion-info-grid">
              <div className="info-box">
                <span className="label">MEETING RENDEZVOUS</span>
                <strong>{matched.safeMeetingPoint}</strong>
              </div>
              <div className="info-box">
                <span className="label">MUTUAL DISTANCE</span>
                <strong>~{matched.distanceMeters}m away (Departing in {matched.departureMinutes}m)</strong>
              </div>
              <div className="info-box">
                <span className="label">WALKING PACE</span>
                <strong>{matched.paceKmH} km/h (Pace Synced)</strong>
              </div>
              <div className="info-box">
                <span className="label">COMMUNITY TRUST</span>
                <strong>⭐ {matched.reputationRating} / 5.0 (Verified Commuter)</strong>
              </div>
            </div>

            <div className="shared-panic-box">
              <div className="panic-info">
                <strong>🚨 Shared Companion Safety Switch</strong>
                <p>If either of you triggers emergency SOS, both phones sound loud alarms and alert 112 with mutual coordinates.</p>
              </div>
              <button
                className="shared-panic-btn"
                onClick={handleMutualPanic}
              >
                Trigger Mutual SOS
              </button>
            </div>

            <button className="end-walk-btn" onClick={handleEndWalk}>
              End Walk &amp; Disconnect Companion
            </button>
          </div>
        ) : (
          <div className="companion-search-view">
            <div className="zk-token-banner">
              <span className="shield-icon">🛡️</span>
              <div>
                <strong>Ephemeral Zero-Knowledge Token Active: <code>{zkToken}</code></strong>
                <small>Generated via Web Crypto SHA-256 with hourly geographic quantization.</small>
              </div>
            </div>

            <div className="corridor-selector-box">
              <label>DESIGNATED SAFEST CORRIDOR</label>
              <div className="corridor-input-badge">
                📍 {currentCorridor || 'Provident Wellworth City → Presidency University Corridor'}
              </div>
            </div>

            <h4>Nearby Verified Commuters Departing Soon</h4>
            {isSearching ? (
              <div className="matching-radar-pulse">
                <div className="radar-circle" />
                <p>Establishing encrypted Zero-Knowledge peer handshake...</p>
              </div>
            ) : (
              <div className="candidate-list">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="candidate-card">
                    <div className="candidate-main">
                      <div className="candidate-avatar">👤</div>
                      <div>
                        <strong>{candidate.pseudonym}</strong>
                        <p>{candidate.originHub} → {candidate.destinationHub}</p>
                        <small>Departing in {candidate.departureMinutes} mins · ⭐ {candidate.reputationRating} Trust</small>
                      </div>
                    </div>
                    <button
                      className="pair-btn"
                      onClick={() => handleMatch(candidate)}
                    >
                      Pair &amp; Walk Together
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
