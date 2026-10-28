import React, { useEffect, useState } from 'react'
import {
  predictiveRiskService,
  type PredictiveHorizonResult,
} from './predictiveRiskService'

interface PredictiveRiskPanelProps {
  baseRisk: number
  originLabel: string
  destinationLabel: string
  onRiskUpdated?: (dynamicRisk: number) => void
}

export const PredictiveRiskPanel: React.FC<PredictiveRiskPanelProps> = ({
  baseRisk,
  originLabel,
  destinationLabel,
  onRiskUpdated,
}) => {
  const [hourOffset, setHourOffset] = useState<number>(0)
  const [horizon, setHorizon] = useState<PredictiveHorizonResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    let isCancelled = false

    predictiveRiskService
      .getRiskHorizon(baseRisk, hourOffset, originLabel, destinationLabel)
      .then((res) => {
        if (!isCancelled) {
          setHorizon(res)
          setLoading(false)
          if (onRiskUpdated) {
            onRiskUpdated(res.calculatedRouteRisk)
          }
        }
      })
      .catch(() => {
        if (!isCancelled) setLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [baseRisk, hourOffset, originLabel, destinationLabel, onRiskUpdated])

  const timeLabels = ['Now', '+1 Hour', '+2 Hours', '+4 Hours', '+6 Hours (Midnight/Late)']

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    const offsets = [0, 1, 2, 4, 6]
    setLoading(true)
    setHourOffset(offsets[val])
  }

  return (
    <div className="risk-horizon-panel">
      <div className="horizon-header">
        <div>
          <div className="horizon-eyebrow">WORLD-FIRST TEMPORAL RISK ENGINE</div>
          <h3>Predictive Event &amp; Crowd-Aware Risk Horizon</h3>
          <p className="horizon-subtitle">
            Streets safe in daylight can become hazardous at midnight. Slide forward to forecast active crowd dispersals, transit curfews, and A* risk weight updates.
          </p>
        </div>
        {horizon && (
          <div className="horizon-risk-pill">
            <span>{loading ? 'Recalculating...' : 'Forecast Risk'}</span>
            <strong>{loading ? '...' : `${horizon.calculatedRouteRisk}%`}</strong>
          </div>
        )}
      </div>

      <div className="timeline-slider-wrap">
        <div className="timeline-header">
          <span>FORECAST TIME HORIZON:</span>
          <strong>{horizon ? horizon.simulatedTimeStr : 'Current Time'} ({hourOffset === 0 ? 'Now' : `+${hourOffset}h ahead`})</strong>
        </div>

        <input
          type="range"
          min="0"
          max="4"
          step="1"
          value={hourOffset === 0 ? 0 : hourOffset === 1 ? 1 : hourOffset === 2 ? 2 : hourOffset === 4 ? 3 : 4}
          onChange={handleSliderChange}
          className="horizon-range-slider"
        />

        <div className="timeline-ticks">
          {timeLabels.map((lbl, idx) => (
            <span key={lbl} className={idx === (hourOffset === 0 ? 0 : hourOffset === 1 ? 1 : hourOffset === 2 ? 2 : hourOffset === 4 ? 3 : 4) ? 'active' : ''}>
              {lbl}
            </span>
          ))}
        </div>
      </div>

      {horizon && (
        <div className="horizon-details-area">
          <div className="routing-advice-banner">
            <span className="advice-icon">🔮</span>
            <div>
              <strong>A* Dynamic Routing Adjustment ({horizon.temporalRiskMultiplier}x Temporal Multiplier)</strong>
              <p>{horizon.routingRecommendation}</p>
            </div>
          </div>

          <h4>Active Monitored Event Horizons Along Route</h4>
          <div className="events-grid">
            {horizon.events.map((evt) => (
              <div key={evt.id} className={`event-card event-${evt.severity}`}>
                <div className="event-top">
                  <span className={`severity-tag tag-${evt.severity}`}>
                    {evt.severity.toUpperCase()} RISK
                  </span>
                  <span className="event-category">
                    {evt.category === 'crowd'
                      ? '👥 Crowd Surge'
                      : evt.category === 'closure'
                      ? '🚫 Transit Curfew'
                      : '⚠️ Night Hazard'}
                  </span>
                </div>
                <strong>{evt.title}</strong>
                <p className="affected-corridor">📍 {evt.affectedCorridor}</p>
                <p className="event-advice">{evt.advice}</p>
                <small className="event-source">Source: {evt.source}</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
