import { useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'

type RouteMode = 'safest' | 'shortest' | 'transit'
type PlaceCategory = 'origin' | 'destination' | 'hospital' | 'police' | 'fire' | 'support'

type Place = {
  name: string
  category: PlaceCategory
  position: [number, number]
  detail: string
}

const origin: Place = {
  name: 'Provident Wellworth City',
  category: 'origin',
  position: [13.025, 77.526],
  detail: 'Origin reference point',
}

const destination: Place = {
  name: 'Presidency University Bengaluru',
  category: 'destination',
  position: [13.171, 77.558],
  detail: 'Destination reference point',
}

const places: Place[] = [
  origin,
  destination,
  { name: 'Ramaiah Memorial Hospital', category: 'hospital', position: [13.032, 77.566], detail: 'Hospital reference point' },
  { name: 'Baptist Hospital', category: 'hospital', position: [13.059, 77.594], detail: 'Hospital reference point' },
  { name: 'Aster CMI Hospital', category: 'hospital', position: [13.058, 77.592], detail: 'Hospital reference point' },
  { name: 'Jalahalli Police Station', category: 'police', position: [13.045, 77.543], detail: 'Police station reference point' },
  { name: 'Yeshwanthpur Police Station', category: 'police', position: [13.028, 77.554], detail: 'Police station reference point' },
  { name: 'Jalahalli Fire Station', category: 'fire', position: [13.06, 77.551], detail: 'Fire station reference point' },
  { name: 'Local Support Point', category: 'support', position: [13.113, 77.574], detail: 'Support reference point' },
]

const routeWaypoints: [number, number][] = [
  origin.position,
  [13.053, 77.548],
  [13.077, 77.594],
  destination.position,
]

const markerColor: Record<PlaceCategory, string> = {
  origin: '#1f8a70',
  destination: '#6b4fc4',
  hospital: '#c94742',
  police: '#2c67a8',
  fire: '#d47b30',
  support: '#3e7c55',
}

function MapViewport({ center }: { center: LatLngExpression }) {
  const map = useMap()
  map.setView(center, map.getZoom(), { animate: true })
  return null
}

function SafeRouteDashboard() {
  const [routeMode, setRouteMode] = useState<RouteMode>('safest')
  const [online, setOnline] = useState(false)
  const [location, setLocation] = useState<[number, number]>(origin.position)
  const [locationLabel, setLocationLabel] = useState('Provident Wellworth City')
  const [destinationInput, setDestinationInput] = useState(destination.name)
  const [routeVisible, setRouteVisible] = useState(false)
  const [alertSent, setAlertSent] = useState(false)
  const [notice, setNotice] = useState('Local map data is ready. Choose a route mode to begin.')

  const mapCenter = useMemo<[number, number]>(() => [location[0], location[1]], [location])
  const liveTransitUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(locationLabel)}&destination=${encodeURIComponent(destinationInput)}&travelmode=transit`

  function detectLocation() {
    if (!navigator.geolocation) {
      setNotice('This browser does not expose location services. The reference location remains active.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next: [number, number] = [position.coords.latitude, position.coords.longitude]
        setLocation(next)
        setLocationLabel('Current device location')
        setOnline(true)
        setNotice('Browser location detected with permission. It is used only in this session.')
      },
      () => setNotice('Location permission was unavailable. Using Provident Wellworth City as the local reference.'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  function findRoute() {
    if (!destinationInput.trim()) {
      setNotice('Enter a destination before calculating a route.')
      return
    }
    if (routeMode === 'transit') {
      window.open(liveTransitUrl, '_blank', 'noopener,noreferrer')
      setNotice('Live public transport directions opened in Google Maps. Transit data is supplied by Google, not this app.')
      return
    }
    setRouteVisible(true)
    setNotice(`${routeMode === 'safest' ? 'Safest' : 'Shortest'} local route drawn from ${locationLabel} to ${destinationInput}.`
      + ' Route weights are currently local demo data.')
  }

  function sendEmergencyAlert() {
    setAlertSent(true)
    setNotice('Emergency alert prepared locally. No dispatcher, SMS, or emergency service was contacted.')
  }

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">S</span>
          <div>
            <p className="eyebrow">OFFLINE-FIRST ROUTE PLANNER</p>
            <h1>SafeRoute</h1>
          </div>
        </div>
        <div className="top-actions">
          <span className={`connection-pill ${online ? 'is-online' : ''}`}>{online ? 'ONLINE LOCATION' : 'OFFLINE READY'}</span>
          <button className="button button-alert" type="button" onClick={sendEmergencyAlert}>Emergency alert</button>
          <button className="button button-sos" type="button" onClick={sendEmergencyAlert}>SOS</button>
        </div>
      </header>

      <section className="welcome-row">
        <div>
          <p className="eyebrow">MONDAY, SEPTEMBER 7</p>
          <h2>Good evening, Jayanti.</h2>
          <p className="lede">One calm place to check a route, find nearby help, and keep your next move visible.</p>
        </div>
        <div className="profile-panel">
          <div className="avatar">JG</div>
          <div><strong>Jayanti Gautam</strong><span>Local profile · authentication pending</span></div>
          <button className="icon-button" type="button" aria-label="Open profile settings">•••</button>
        </div>
      </section>

      <section className="metric-grid" aria-label="Dashboard summary">
        <article className="metric-card"><span className="metric-label">CURRENT POSITION</span><strong>{locationLabel}</strong><small>{online ? 'Browser permission active' : 'Local reference point'}</small></article>
        <article className="metric-card"><span className="metric-label">NEARBY SUPPORT</span><strong>9 reference points</strong><small>3 hospitals · 2 police · 1 fire</small></article>
        <article className="metric-card"><span className="metric-label">PROFILE STATUS</span><strong>Local mode active</strong><small>Firebase Auth can be connected later</small></article>
      </section>

      <section className="workbench">
        <div className="map-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">LIVE TILE SOURCE</p><h3>Bengaluru support map</h3></div>
            <button className="button button-quiet" type="button" onClick={() => setRouteVisible(false)}>Clear route</button>
          </div>
          <div className="map-wrap">
            <MapContainer center={mapCenter} zoom={11} scrollWheelZoom className="leaflet-map">
              <MapViewport center={mapCenter} />
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {routeVisible && <Polyline positions={routeWaypoints} pathOptions={{ color: '#d64a43', weight: 5, opacity: 0.9 }} />}
              <CircleMarker center={location} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#1f8a70', fillOpacity: 1 }}><Popup>Current reference: {locationLabel}</Popup></CircleMarker>
              {places.filter((place) => place.name !== origin.name).map((place) => <CircleMarker key={place.name} center={place.position} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: markerColor[place.category], fillOpacity: 1 }}><Popup><strong>{place.name}</strong><br />{place.detail}<br /><small>Verify availability before relying on this point.</small></Popup></CircleMarker>)}
            </MapContainer>
            <div className="map-badge">REAL OSM TILES · DATA ACCESS DEPENDS ON NETWORK</div>
          </div>
          <div className="legend"><span><i className="legend-dot route-dot" />Route</span><span><i className="legend-dot hospital-dot" />Hospital</span><span><i className="legend-dot police-dot" />Police</span><span><i className="legend-dot fire-dot" />Fire</span></div>
        </div>

        <aside className="control-rail">
          <section className="control-card">
            <div className="panel-heading compact"><div><p className="eyebrow">ROUTE PLANNER</p><h3>Where are you going?</h3></div></div>
            <label>FROM<input value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} /></label>
            <label>TO<input value={destinationInput} onChange={(event) => setDestinationInput(event.target.value)} placeholder="Enter any destination" /></label>
            <div className="route-modes" aria-label="Route mode">
              <button type="button" className={routeMode === 'safest' ? 'selected' : ''} onClick={() => setRouteMode('safest')}>Safest</button>
              <button type="button" className={routeMode === 'shortest' ? 'selected' : ''} onClick={() => setRouteMode('shortest')}>Shortest</button>
              <button type="button" className={routeMode === 'transit' ? 'selected' : ''} onClick={() => setRouteMode('transit')}>Transit</button>
            </div>
            <div className="control-actions"><button className="button button-secondary" type="button" onClick={detectLocation}>Detect location</button><button className="button button-primary" type="button" onClick={findRoute}>Find route</button></div>
            <p className="helper">Transit opens a live Google Maps handoff. Safest and shortest use the local routing model until a routing provider is connected.</p>
          </section>
          <section className="control-card nearby-card"><div className="panel-heading compact"><div><p className="eyebrow">NEARBY DIRECTORY</p><h3>Emergency contacts</h3></div><span className="directory-state">Reference</span></div><div className="contact-list"><a href="tel:112"><span className="contact-icon alert-icon">!</span><span><strong>112</strong><small>India unified emergency number</small></span><span className="call-arrow">↗</span></a><a href="tel:100"><span className="contact-icon police-icon">P</span><span><strong>100</strong><small>Police emergency line</small></span><span className="call-arrow">↗</span></a><a href="tel:108"><span className="contact-icon hospital-icon">+</span><span><strong>108</strong><small>Ambulance emergency line</small></span><span className="call-arrow">↗</span></a></div><p className="helper">Directory numbers are general references. The app cannot verify who is physically present at a location.</p></section>
        </aside>
      </section>

      <section className="status-strip"><span className="status-dot" />{alertSent ? 'Emergency alert prepared locally.' : notice}<span className="status-note">No unsupported safety claims · no live dispatch</span></section>
      <footer>Map data © OpenStreetMap contributors · This prototype requires a network for map tiles and live transit handoff.</footer>
    </main>
  )
}

export default SafeRouteDashboard
