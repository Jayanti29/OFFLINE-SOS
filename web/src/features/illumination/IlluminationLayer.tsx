import React, { useEffect, useState, useMemo } from 'react'
import { Circle, CircleMarker, Popup } from 'react-leaflet'
import { streetLightingEngine, type StreetlightOutageReport, type StreetLuxResult } from './streetLightingEngine'

interface IlluminationLayerProps {
  waypoints: [number, number][]
  currentCoords: [number, number]
  isActive: boolean
}

export const IlluminationLayer: React.FC<IlluminationLayerProps> = ({
  waypoints,
  currentCoords,
  isActive,
}) => {
  const [outages, setOutages] = useState<StreetlightOutageReport[]>(() => streetLightingEngine.getOutages())
  const [showReportDialog, setShowReportDialog] = useState<boolean>(false)
  const [reportDesc, setReportDesc] = useState<string>('')
  const [reportType, setReportType] = useState<StreetlightOutageReport['type']>('broken_light')

  useEffect(() => {
    return streetLightingEngine.subscribe(() => {
      setOutages([...streetLightingEngine.getOutages()])
    })
  }, [])

  const currentLux = useMemo<StreetLuxResult>(() => {
    // Re-evaluate when outages update
    if (outages) {
      return streetLightingEngine.calculatePointLux(currentCoords)
    }
    return streetLightingEngine.calculatePointLux(currentCoords)
  }, [currentCoords, outages])

  if (!isActive) return null

  // Calculate lux along sampled waypoints
  const sampledSegments = waypoints.map((pt, i) => {
    // Alternate segment types for realistic demonstration (arterials vs shortcuts)
    const segType = i === 1 ? 'alley' : i % 2 === 0 ? 'arterial' : 'collector'
    const luxInfo = streetLightingEngine.calculatePointLux(pt, new Date(), segType)
    return {
      point: pt,
      luxInfo,
    }
  })

  const handleSubmitOutage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportDesc.trim()) return

    streetLightingEngine.reportOutage({
      coords: currentCoords,
      description: reportDesc.trim(),
      type: reportType,
      radiusMeters: 200,
    })

    setReportDesc('')
    setShowReportDialog(false)
  }

  return (
    <>
      {/* Route Illumination Heatmap circles */}
      {sampledSegments.map((seg, idx) => (
        <CircleMarker
          key={`illum-${idx}`}
          center={seg.point}
          radius={14}
          pathOptions={{
            color: seg.luxInfo.color,
            fillColor: seg.luxInfo.color,
            fillOpacity: 0.45,
            weight: 2,
          }}
        >
          <Popup>
            <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
              <strong style={{ color: seg.luxInfo.color }}>
                {seg.luxInfo.lux} LUX ({seg.luxInfo.status.toUpperCase()})
              </strong>
              <br />
              {seg.luxInfo.hasOutageNearby ? (
                <span style={{ color: '#ef4444' }}>
                  ⚠️ Community Outage: {seg.luxInfo.outageDescription}
                </span>
              ) : (
                <span>Municipal LED Streetlight active</span>
              )}
              <br />
              <small>
                {seg.luxInfo.solarLunar.moonPhaseIcon} {seg.luxInfo.solarLunar.moonPhaseName} (
                {(seg.luxInfo.solarLunar.moonPhaseFraction * 100).toFixed(0)}% lit)
              </small>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Streetlight Outage Hazard Zones */}
      {outages.map((outage) => (
        <Circle
          key={outage.id}
          center={outage.coords}
          radius={outage.radiusMeters}
          pathOptions={{
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.2,
            dashArray: '4, 4',
            weight: 2,
          }}
        >
          <Popup>
            <div style={{ fontSize: '11px' }}>
              <strong style={{ color: '#ef4444' }}>⚠️ Streetlight Outage Active</strong>
              <br />
              {outage.description}
              <br />
              <button
                style={{
                  marginTop: '6px',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
                onClick={() => streetLightingEngine.clearOutage(outage.id)}
              >
                ✓ Mark Restored
              </button>
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Floating Map HUD Badge for Real-Time Lunar & Lux Telemetry */}
      <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'auto', margin: '12px' }}>
        <div className="lunar-lux-hud">
          <div className="hud-top">
            <span className="moon-icon">{currentLux.solarLunar.moonPhaseIcon}</span>
            <div>
              <strong>{currentLux.solarLunar.moonPhaseName}</strong>
              <small>
                {(currentLux.solarLunar.moonPhaseFraction * 100).toFixed(0)}% Lunar Illumination · {currentLux.solarLunar.twilightState}
              </small>
            </div>
          </div>

          <div className="lux-score-row">
            <div className="lux-chip" style={{ borderColor: currentLux.color }}>
              <span className="lux-val" style={{ color: currentLux.color }}>
                {currentLux.lux}
              </span>
              <span className="lux-lbl">EST. LUX</span>
            </div>
            <div className="lux-desc">
              <strong>{currentLux.status === 'bright' ? 'Well-Lit Corridor' : currentLux.status === 'moderate' ? 'Moderate Light' : 'Dark Shadow Zone'}</strong>
              <small>Municipal OGD Grid + Real-Time Astro Math</small>
            </div>
          </div>

          <button
            className="report-outage-toggle-btn"
            onClick={() => setShowReportDialog(!showReportDialog)}
          >
            📢 Report Broken Streetlight / Dark Alley
          </button>

          {showReportDialog && (
            <form className="report-outage-form" onSubmit={handleSubmitOutage}>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="outage-select"
              >
                <option value="broken_light">Broken Streetlight Pole</option>
                <option value="dark_alley">Unlit Dark Alley Shortcut</option>
                <option value="flickering">Flickering / Failing Lamp</option>
              </select>
              <input
                type="text"
                placeholder="Location detail (e.g. 2nd cross dark)"
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                className="outage-input"
              />
              <div className="outage-form-actions">
                <button type="submit" className="outage-submit-btn">
                  Submit Report
                </button>
                <button
                  type="button"
                  className="outage-cancel-btn"
                  onClick={() => setShowReportDialog(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
