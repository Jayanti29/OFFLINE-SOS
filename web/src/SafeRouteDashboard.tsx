import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { divIcon } from 'leaflet'
import type { LatLngExpression } from 'leaflet'
import { firebaseAuth, firebaseConfigured } from './firebase'
import 'leaflet/dist/leaflet.css'

type RouteMode = 'safest' | 'shortest' | 'transit'
type PlaceCategory = 'origin' | 'destination' | 'hospital' | 'police' | 'fire' | 'support'
type DirectoryFilter = 'All' | 'Hospitals' | 'Police' | 'Fire' | 'NGO / Volunteer'
type EmergencyTarget = 'Hospitals' | 'Police' | 'Fire' | 'NGO / Volunteer'

type Place = {
  name: string
  category: PlaceCategory
  position: [number, number]
  detail: string
}

type DirectoryEntry = { name: string; category: string; number: string; source: string; url: string }
type RouteSummary = {
  label: string
  risk: number
  eta: string
  distance: string
  distanceMeters: number
  nearby: string[]
  waypoints: [number, number][]
  alternatives: { label: string; risk: number; note: string }[]
  source: string
}
type TransitCandidate = { number: string; label: string; status: 'unknown' | 'available' | 'unavailable'; message: string }

const directory: DirectoryEntry[] = [
  { name: 'Unified emergency response', category: 'Emergency', number: '112', source: 'India ERSS', url: 'https://112.gov.in/' },
  { name: 'Police emergency', category: 'Police', number: '100', source: 'Bengaluru Urban helpline', url: 'https://bengaluruurban.nic.in/en/helpline/' },
  { name: 'Hoysala patrol', category: 'Police', number: '103', source: 'Bengaluru Urban helpline', url: 'https://bengaluruurban.nic.in/en/helpline/' },
  { name: 'Ambulance emergency', category: 'Medical', number: '108', source: 'Karnataka emergency health services', url: 'https://hfwcom.karnataka.gov.in/' },
  { name: 'Fire emergency', category: 'Fire', number: '101', source: 'Bengaluru Urban helpline', url: 'https://bengaluruurban.nic.in/en/helpline/' },
  { name: 'Women helpline', category: 'Women support', number: '1091', source: 'Bengaluru Urban helpline', url: 'https://bengaluruurban.nic.in/en/helpline/' },
  { name: 'Child helpline', category: 'Child support', number: '1098', source: 'Bengaluru Urban helpline', url: 'https://bengaluruurban.nic.in/en/helpline/' },
]

const transitCandidates: TransitCandidate[] = [
  { number: '285M', label: 'Provident Wellworth City corridor to north Bengaluru', status: 'unknown', message: 'Needs live BMTC confirmation' },
  { number: 'V285M', label: 'Route-matched BMTC variant for this direction', status: 'unknown', message: 'Needs live BMTC confirmation' },
]

const nearbyDirectory: Record<string, DirectoryEntry[]> = {
  Hospitals: [
    { name: 'Ramaiah Memorial Hospital', category: 'Hospital', number: '080 2360 8888', source: 'Bengaluru Urban public utility listing', url: 'https://bengaluruurban.nic.in/en/public-utility/ramaiah-memorial-hospital/' },
    { name: 'Bangalore Baptist Hospital', category: 'Hospital', number: '080 2202 4700', source: 'Hospital website', url: 'https://bbh.org.in/contact/' },
    { name: 'Aster CMI Hospital', category: 'Hospital', number: '080 4342 0100', source: 'Hospital website', url: 'https://www.asterhospitals.in/hospitals/aster-cmi-bangalore' },
  ],
  Police: [
    { name: 'Jalahalli Police Station', category: 'Police', number: '080 2294 2527', source: 'Bengaluru City Police contact list', url: 'https://bcp.karnataka.gov.in/24/law-%26-order-/en' },
    { name: 'Yeshwanthpur Police Station', category: 'Police', number: '080 2294 2526', source: 'Bengaluru City Police contact list', url: 'https://bcp.karnataka.gov.in/24/law-%26-order-/en' },
    { name: 'Bagalagunte Police Station', category: 'Police', number: '080 2839 6900', source: 'Bengaluru City Police contact list', url: 'https://bcp.karnataka.gov.in/24/law-%26-order-/en' },
  ],
  Fire: [
    { name: 'Jalahalli Fire Station', category: 'Fire', number: '101', source: 'Karnataka Fire and Emergency Services', url: 'https://ksfes.karnataka.gov.in/' },
    { name: 'Peenya fire response area', category: 'Fire', number: '101', source: 'Karnataka Fire and Emergency Services', url: 'https://ksfes.karnataka.gov.in/' },
  ],
  'NGO / Volunteer': [
    { name: 'Vanitha Sahayavani', category: 'Women support', number: '080 2294 3224', source: 'Bengaluru Police women support reference', url: 'https://bcp.karnataka.gov.in/38/women-help-desk-officers/en' },
    { name: 'Women helpline', category: 'Women support', number: '181', source: 'Women helpline scheme', url: 'https://kswdc.karnataka.gov.in/' },
    { name: 'Childline India', category: 'Child support', number: '1098', source: 'Bengaluru Urban helpline', url: 'https://bengaluruurban.nic.in/en/helpline/' },
  ],
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

const knownDestinations: Record<string, [number, number]> = {
  [destination.name.toLowerCase()]: destination.position,
  'presidency university': destination.position,
  'presidency university bengaluru': destination.position,
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

const shortestWaypoints: [number, number][] = [
  origin.position,
  [13.066, 77.539],
  [13.121, 77.549],
  destination.position,
]

const routeProfiles = {
  safest: {
    label: 'Safest',
    risk: 18,
    eta: '62 min',
    distance: '22.4 km',
    distanceMeters: 22400,
    nearby: ['Ramaiah Memorial Hospital', 'Jalahalli Police Station', 'Jalahalli Fire Station'],
    waypoints: routeWaypoints,
    alternatives: [
      { label: 'Shortest direct route', risk: 34, note: 'Fewer nearby support points' },
      { label: 'Outer ring connector', risk: 47, note: 'More weak-network patches' },
    ],
    source: 'Local fallback',
  },
  shortest: {
    label: 'Shortest',
    risk: 34,
    eta: '51 min',
    distance: '19.1 km',
    distanceMeters: 19100,
    nearby: ['Yeshwanthpur Police Station', 'Aster CMI Hospital'],
    waypoints: shortestWaypoints,
    alternatives: [],
    source: 'Local fallback',
  },
} satisfies Record<'safest' | 'shortest', RouteSummary>

const emergencyLabels: Record<EmergencyTarget, string> = {
  Hospitals: 'nearest hospital',
  Police: 'nearest police station',
  Fire: 'fire emergency',
  'NGO / Volunteer': 'NGO / volunteer support',
}

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

function loadContacts() {
  try {
    const saved = JSON.parse(localStorage.getItem('saferoute-contacts') || '[]')
    return Array.isArray(saved) ? saved as { name: string; number: string }[] : []
  } catch {
    return []
  }
}

function distanceKm(from: [number, number], to: [number, number]) {
  const radius = 6371
  const latDistance = (to[0] - from[0]) * Math.PI / 180
  const lngDistance = (to[1] - from[1]) * Math.PI / 180
  const a = Math.sin(latDistance / 2) ** 2
    + Math.cos(from[0] * Math.PI / 180) * Math.cos(to[0] * Math.PI / 180) * Math.sin(lngDistance / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function nearestEntries(target: EmergencyTarget, from: [number, number]) {
  const entries = nearbyDirectory[target] || []
  return entries
    .map((entry) => {
      const place = places.find((candidate) => candidate.name === entry.name || candidate.name.includes(entry.name.replace('Bangalore ', '')))
      return { entry, distance: place ? distanceKm(from, place.position) : Number.POSITIVE_INFINITY }
    })
    .sort((left, right) => left.distance - right.distance)
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60))
  return minutes >= 60 ? `${Math.floor(minutes / 60)} hr ${minutes % 60} min` : `${minutes} min`
}

function SafeRouteDashboard() {
  const [routeMode, setRouteMode] = useState<RouteMode>('safest')
  const [online, setOnline] = useState(false)
  const [location, setLocation] = useState<[number, number]>(origin.position)
  const [locationLabel, setLocationLabel] = useState('Provident Wellworth City')
  const [destinationInput, setDestinationInput] = useState(destination.name)
  const [routeVisible, setRouteVisible] = useState(false)
  const [alertSent, setAlertSent] = useState(false)
  const [sosActive, setSosActive] = useState(false)
  const [notice, setNotice] = useState('Local map data is ready. Choose a route mode to begin.')
  const [user, setUser] = useState<User | null>(null)
  const [localProfile, setLocalProfile] = useState(false)
  const [authReady, setAuthReady] = useState(!firebaseConfigured)
  const [authMode, setAuthMode] = useState<'sign-in' | 'create'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [profileImage, setProfileImage] = useState('')
  const [mapStyle, setMapStyle] = useState<'normal' | 'satellite'>('normal')
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [transitOpen, setTransitOpen] = useState(false)
  const [networkWeak, setNetworkWeak] = useState(!navigator.onLine)
  const [customContacts, setCustomContacts] = useState<{ name: string; number: string }[]>(loadContacts)
  const [contactName, setContactName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [directoryFilter, setDirectoryFilter] = useState<DirectoryFilter>('All')
  const [emergencyTarget, setEmergencyTarget] = useState<EmergencyTarget>('Hospitals')
  const [routeOptions, setRouteOptions] = useState(routeProfiles)
  const [routeLoading, setRouteLoading] = useState(false)
  const [transitStatus, setTransitStatus] = useState<'idle' | 'checking' | 'handoff'>('idle')
  const [liveTransitCandidates, setLiveTransitCandidates] = useState(transitCandidates)

  useEffect(() => {
    if (!firebaseAuth) return undefined
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser)
      setAuthReady(true)
    })
  }, [])

  useEffect(() => {
    if (!online || !navigator.geolocation) return undefined
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation([position.coords.latitude, position.coords.longitude])
        setAccuracy(position.coords.accuracy)
        setLocationLabel('Current device location')
      },
      () => setNotice('Live location updates stopped. Check browser location permission.'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [online])

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string; addEventListener?: typeof window.addEventListener; removeEventListener?: typeof window.removeEventListener } }).connection
    const updateNetwork = () => {
      const effectiveType = connection?.effectiveType
      setNetworkWeak(!navigator.onLine || effectiveType === '2g' || effectiveType === 'slow-2g')
    }
    window.addEventListener('online', updateNetwork)
    window.addEventListener('offline', updateNetwork)
    connection?.addEventListener?.('change', updateNetwork)
    updateNetwork()
    return () => {
      window.removeEventListener('online', updateNetwork)
      window.removeEventListener('offline', updateNetwork)
      connection?.removeEventListener?.('change', updateNetwork)
    }
  }, [])

  const buildingIcon = (category: PlaceCategory) => divIcon({
    className: `building-marker building-${category}`,
    html: `<span>${category === 'hospital' ? '+' : category === 'police' ? 'P' : category === 'fire' ? 'F' : '◆'}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

  const mapCenter = useMemo<[number, number]>(() => [location[0], location[1]], [location])
  const liveTransitUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(locationLabel)}&destination=${encodeURIComponent(destinationInput)}&travelmode=transit`
  const selectedRoute = routeOptions[routeMode === 'transit' ? 'safest' : routeMode]
  const nearestEmergency = nearestEntries(emergencyTarget, location)[0]?.entry
  const directoryGroups = directoryFilter === 'All'
    ? Object.entries(nearbyDirectory)
    : Object.entries(nearbyDirectory).filter(([category]) => category === directoryFilter)
  const routeRiskBreakdown = [
    { label: 'Time to reach', value: selectedRoute.eta, detail: `${selectedRoute.distance} total` },
    { label: 'Network risk', value: networkWeak ? 'High' : 'Low', detail: networkWeak ? 'Weak/offline signal warning active' : 'Live map and route checks available' },
    { label: 'Theft / harassment', value: `${Math.min(72, selectedRoute.risk + 9)}%`, detail: 'Prototype concern estimate from route exposure and support density' },
    { label: 'Violent-crime concern', value: `${Math.min(68, selectedRoute.risk + 14)}%`, detail: 'Not official crime data; verify locally before travel' },
    { label: 'Accident risk', value: `${Math.min(76, selectedRoute.risk + 18)}%`, detail: 'Estimated from route distance and arterial-road exposure' },
    { label: 'Nearby help', value: `${selectedRoute.nearby.length}`, detail: selectedRoute.nearby.join(' · ') },
  ]

  const profileLabel = user?.email || 'Jayanti Gautam'
  const mapTilerKey = import.meta.env.VITE_MAPTILER_KEY
  const tileUrl = mapTilerKey
    ? `https://api.maptiler.com/maps/${mapStyle === 'satellite' ? 'hybrid' : 'streets-v2'}/{z}/{x}/{y}.jpg?key=${mapTilerKey}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  const tileAttribution = mapTilerKey ? '&copy; MapTiler &copy; OpenStreetMap contributors' : '&copy; OpenStreetMap contributors'

  async function authenticate() {
    setAuthError('')
    try {
      if (!firebaseAuth) {
        setLocalProfile(true)
        return
      }
      const result = authMode === 'create'
        ? await createUserWithEmailAndPassword(firebaseAuth, email, password)
        : await signInWithEmailAndPassword(firebaseAuth, email, password)
      setUser(result.user)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed.')
    }
  }

  async function uploadProfileImage(file: File | undefined) {
    if (!file) return
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
    if (!cloudName || !uploadPreset) {
      setNotice('Cloudinary needs VITE_CLOUDINARY_CLOUD_NAME and an unsigned VITE_CLOUDINARY_UPLOAD_PRESET.')
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData })
    const result = await response.json()
    if (!response.ok) {
      setNotice(result.error?.message || 'Cloudinary upload failed.')
      return
    }
    setProfileImage(result.secure_url)
    setNotice('Profile image uploaded to Cloudinary.')
  }

  async function getRouteBrief() {
    const response = await fetch('/api/gemini/route-summary', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ origin: locationLabel, destination: destinationInput, mode: routeMode }) })
    const result = await response.json()
    setNotice(response.ok ? result.text : result.error || 'Gemini server is unavailable.')
  }

  async function resolveDestination() {
    const known = knownDestinations[destinationInput.trim().toLowerCase()]
    if (known) return known
    const query = `${destinationInput}, Bengaluru, Karnataka, India`
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`)
    const results = await response.json()
    const first = Array.isArray(results) ? results[0] : undefined
    if (!first?.lat || !first?.lon) throw new Error('Destination was not found on OpenStreetMap.')
    return [Number(first.lat), Number(first.lon)] as [number, number]
  }

  async function buildLiveRoutes() {
    const resolvedDestination = await resolveDestination()
    const url = `https://router.project-osrm.org/route/v1/driving/${location[1]},${location[0]};${resolvedDestination[1]},${resolvedDestination[0]}?alternatives=3&overview=full&geometries=geojson`
    const response = await fetch(url)
    const result = await response.json()
    if (!response.ok || result.code !== 'Ok' || !Array.isArray(result.routes) || result.routes.length === 0) {
      throw new Error(result.message || 'OSRM route service did not return a route.')
    }
    const liveRoutes: RouteSummary[] = result.routes.map((route: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }, index: number) => {
      const waypoints = route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])
      const nearby = places
        .filter((place) => place.category === 'hospital' || place.category === 'police' || place.category === 'fire')
        .map((place) => ({ place, distance: Math.min(...waypoints.filter((_, waypointIndex) => waypointIndex % 12 === 0).map((point) => distanceKm(point, place.position))) }))
        .filter(({ distance }) => distance < 3.5)
        .sort((left, right) => left.distance - right.distance)
        .slice(0, 3)
        .map(({ place }) => place.name)
      const supportBonus = Math.min(18, nearby.length * 6)
      const routeRisk = Math.max(12, Math.min(68, Math.round(24 + index * 7 + route.distance / 2500 - supportBonus)))
      return {
        label: index === 0 ? 'Recommended road route' : `Road alternative ${index + 1}`,
        risk: routeRisk,
        eta: formatDuration(route.duration),
        distance: formatDistance(route.distance),
        distanceMeters: route.distance,
        nearby: nearby.length ? nearby : ['No mapped emergency point within 3.5 km of sampled route'],
        waypoints,
        alternatives: [],
        source: 'OSRM live road geometry',
      }
    })
    const shortest = [...liveRoutes].sort((left, right) => left.distanceMeters - right.distanceMeters)[0]
    const safest = [...liveRoutes].sort((left, right) => left.risk - right.risk)[0]
    return {
      safest: {
        ...safest,
        label: 'Safest',
        alternatives: liveRoutes
          .filter((route) => route !== safest)
          .map((route) => ({ label: route.label, risk: route.risk, note: `${route.distance} · ${route.eta}` })),
      },
      shortest: {
        ...shortest,
        label: 'Shortest',
        alternatives: [],
      },
    } satisfies Record<'safest' | 'shortest', RouteSummary>
  }

  async function checkTransitAvailability() {
    setTransitStatus('checking')
    setTransitOpen(true)
    setRouteVisible(false)
    try {
      const routeNumbers = transitCandidates.map((bus) => bus.number).join(',')
      const response = await fetch(`/api/transit/bmtc?routes=${encodeURIComponent(routeNumbers)}`)
      const result = await response.json()
      const nextCandidates = Array.isArray(result.routes)
        ? result.routes.map((route: { number: string; status?: TransitCandidate['status']; message?: string }) => {
          const fallback = transitCandidates.find((bus) => bus.number === route.number)
          return {
            number: route.number,
            label: fallback?.label || 'BMTC route',
            status: route.status || 'unknown',
            message: route.message || (response.ok ? 'Live provider returned this route.' : 'Live status unknown.'),
          } satisfies TransitCandidate
        })
        : transitCandidates.map((bus) => ({ ...bus, message: result.error || 'Live status unknown.' }))
      setLiveTransitCandidates(nextCandidates)
      setTransitStatus('handoff')
      setNotice(response.ok ? 'Transit availability checked through the configured provider.' : result.error || 'Live BMTC status is unavailable.')
    } catch {
      setLiveTransitCandidates(transitCandidates.map((bus) => ({ ...bus, status: 'unknown', message: 'Transit API is not reachable from this session.' })))
      setTransitStatus('handoff')
      setNotice('Live transit API is not reachable. Use Namma BMTC or Google Transit for confirmation.')
    }
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      setNotice('This browser does not expose location services. The reference location remains active.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next: [number, number] = [position.coords.latitude, position.coords.longitude]
        setLocation(next)
        setAccuracy(position.coords.accuracy)
        setLocationLabel('Current device location')
        setOnline(true)
        setNotice('Browser location detected with permission. It is used only in this session.')
      },
      () => setNotice('Location permission was unavailable. Using Provident Wellworth City as the local reference.'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  async function findRoute(mode: RouteMode = routeMode) {
    if (!destinationInput.trim()) {
      setNotice('Enter a destination before calculating a route.')
      return
    }
    if (mode === 'transit') {
      await checkTransitAvailability()
      return
    }
    setRouteLoading(true)
    setTransitOpen(false)
    try {
      const liveRoutes = await buildLiveRoutes()
      setRouteOptions(liveRoutes)
      const route = liveRoutes[mode]
      setRouteVisible(true)
      setNotice(`${route.label} route loaded from OSRM road geometry. Risk is an app estimate based on distance and nearby mapped help.`)
    } catch (error) {
      setRouteOptions(routeProfiles)
      setRouteVisible(true)
      setNotice(`${error instanceof Error ? error.message : 'Live routing failed.'} Showing local fallback route, clearly marked as fallback.`)
    } finally {
      setRouteLoading(false)
    }
  }

  function sendEmergencyAlert() {
    setAlertSent(true)
    setSosActive(false)
    setNotice(`Emergency alert prepared locally for ${emergencyLabels[emergencyTarget]}. Choose SOS to call ${nearestEmergency?.name || 'the selected category'}.`)
  }

  function callEmergencyTarget() {
    setAlertSent(true)
    setSosActive(true)
    if (!nearestEmergency) {
      setNotice(`No ${emergencyLabels[emergencyTarget]} number is saved in the local directory.`)
      return
    }
    setNotice(`Opening phone dialer for ${nearestEmergency.name}: ${nearestEmergency.number}.`)
    window.location.href = `tel:${nearestEmergency.number.replace(/\s/g, '')}`
  }

  function addContact() {
    if (!contactName.trim() || !contactNumber.trim()) return
    const next = [...customContacts, { name: contactName.trim(), number: contactNumber.trim() }]
    setCustomContacts(next)
    localStorage.setItem('saferoute-contacts', JSON.stringify(next))
    setContactName('')
    setContactNumber('')
  }

  function womensSos() {
    setAlertSent(true)
    setSosActive(true)
    setNotice('Women’s SOS alert active locally. Use Call 112 in the directory if immediate official help is needed.')
    if (navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 450])
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
    if ('Notification' in window && Notification.permission === 'granted') new Notification('SafeRoute womens SOS', { body: 'Loud local SOS alert active. Call 112 if you are in immediate danger.' })
    const audio = new AudioContext()
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.connect(gain).connect(audio.destination)
    oscillator.frequency.value = 880
    oscillator.type = 'square'
    gain.gain.value = 0.28
    oscillator.start()
    const now = audio.currentTime
    gain.gain.setValueAtTime(0.28, now)
    gain.gain.setValueAtTime(0, now + 0.35)
    gain.gain.setValueAtTime(0.28, now + 0.5)
    gain.gain.setValueAtTime(0, now + 0.85)
    gain.gain.setValueAtTime(0.28, now + 1)
    gain.gain.setValueAtTime(0, now + 1.35)
    oscillator.stop(now + 1.45)
  }

  if (!authReady || (!user && !localProfile)) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <p className="eyebrow">SAFEROUTE WEB</p>
          <h1>Keep your route dashboard close.</h1>
          <p className="auth-copy">Sign in to Firebase when configured, or continue with the local profile while this prototype is offline.</p>
          {firebaseConfigured ? <>
            <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></label>
            <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" /></label>
            <button className="button button-primary full-button" type="button" onClick={authenticate}>{authMode === 'create' ? 'Create account' : 'Sign in'}</button>
            <button className="text-button" type="button" onClick={() => setAuthMode(authMode === 'create' ? 'sign-in' : 'create')}>{authMode === 'create' ? 'Already have an account? Sign in' : 'Create a Firebase account'}</button>
          </> : <button className="button button-primary full-button" type="button" onClick={authenticate}>Continue with local profile</button>}
          {authError && <p className="auth-error">{authError}</p>}
          <p className="helper">Firebase values stay in local environment variables and are never committed.</p>
        </section>
      </main>
    )
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
          <label className="sos-target">SOS target
            <select value={emergencyTarget} onChange={(event) => setEmergencyTarget(event.target.value as EmergencyTarget)}>
              <option value="Hospitals">Hospital</option>
              <option value="Police">Police</option>
              <option value="Fire">Fire</option>
              <option value="NGO / Volunteer">NGO / Volunteer</option>
            </select>
          </label>
          <button className="button button-alert" type="button" onClick={sendEmergencyAlert}>Emergency alert</button>
          <button className="button button-sos" type="button" onClick={callEmergencyTarget}>SOS</button>
          <button className="button button-women" type="button" onClick={womensSos}>Women’s SOS</button>
        </div>
      </header>

      <section className="welcome-row">
        <div>
          <p className="eyebrow">MONDAY, SEPTEMBER 7</p>
          <h2>Good evening, Jayanti.</h2>
          <p className="lede">One calm place to check a route, find nearby help, and keep your next move visible.</p>
        </div>
        <div className="profile-panel">
          {profileImage ? <img className="avatar avatar-image" src={profileImage} alt="Profile" /> : <div className="avatar">JG</div>}
          <div><strong>{profileLabel}</strong><span>{user ? 'Firebase account active' : 'Local profile active'}</span></div>
          <label className="icon-button upload-button" title="Upload profile image">+<input className="visually-hidden" type="file" accept="image/*" onChange={(event) => uploadProfileImage(event.target.files?.[0])} /></label>
          {user && <button className="icon-button" type="button" aria-label="Sign out" onClick={() => firebaseAuth && signOut(firebaseAuth)}>↪</button>}
        </div>
      </section>

      <section className="metric-grid" aria-label="Dashboard summary">
        <article className="metric-card"><span className="metric-label">CURRENT POSITION</span><strong>{locationLabel}</strong><small>{online ? `Browser permission active${accuracy ? ` · ±${Math.round(accuracy)}m` : ''}` : 'Local reference point'}</small></article>
        <article className="metric-card"><span className="metric-label">NEARBY SUPPORT</span><strong>12 reference points</strong><small>Hospitals · police · fire · NGO/volunteer</small></article>
        <article className="metric-card"><span className="metric-label">PROFILE STATUS</span><strong>Local mode active</strong><small>Firebase Auth can be connected later</small></article>
      </section>

      <section className="workbench">
        <div className="map-column">
          <div className="map-panel">
            <div className="panel-heading">
              <div><p className="eyebrow">{mapTilerKey ? 'MAPTILER LIVE TILES' : 'OPENSTREETMAP LIVE TILES'}</p><h3>Bengaluru support map</h3></div>
              <div className="map-actions"><button className={`button button-quiet ${mapStyle === 'normal' ? 'active-style' : ''}`} type="button" onClick={() => setMapStyle('normal')}>Normal</button><button className={`button button-quiet ${mapStyle === 'satellite' ? 'active-style' : ''}`} type="button" onClick={() => setMapStyle('satellite')} disabled={!mapTilerKey}>Satellite</button><button className="button button-quiet" type="button" onClick={() => setRouteVisible(false)}>Clear route</button></div>
            </div>
            <div className="map-wrap">
              <MapContainer center={mapCenter} zoom={11} scrollWheelZoom className="leaflet-map">
                <MapViewport center={mapCenter} />
                <TileLayer attribution={tileAttribution} url={tileUrl} />
                {routeVisible && <Polyline positions={selectedRoute.waypoints} pathOptions={{ color: routeMode === 'safest' ? '#1f8a70' : '#d64a43', weight: 5, opacity: 0.9 }} />}
                <CircleMarker center={location} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#1f8a70', fillOpacity: 1 }}><Popup>Current reference: {locationLabel}{accuracy ? ` (${Math.round(accuracy)}m accuracy)` : ''}</Popup></CircleMarker>
                {places.filter((place) => place.name !== origin.name).map((place) => place.category === 'hospital' || place.category === 'police' || place.category === 'fire' ? <Marker key={place.name} position={place.position} icon={buildingIcon(place.category)}><Popup><strong>{place.name}</strong><br />{place.detail}<br /><small>Verify availability before relying on this point.</small></Popup></Marker> : <CircleMarker key={place.name} center={place.position} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: markerColor[place.category], fillOpacity: 1 }}><Popup><strong>{place.name}</strong><br />{place.detail}<br /><small>Verify availability before relying on this point.</small></Popup></CircleMarker>)}
              </MapContainer>
              <div className="map-badge">{mapTilerKey ? 'MAPTILER TILES · NETWORK REQUIRED' : 'OSM TILES · NETWORK REQUIRED'}</div>
            </div>
            <div className="legend"><span><i className="legend-dot route-dot" />Route</span><span><i className="legend-dot hospital-dot" />Hospital</span><span><i className="legend-dot police-dot" />Police</span><span><i className="legend-dot fire-dot" />Fire</span></div>
          </div>

          <section className="risk-analysis-panel">
            <div className="panel-heading">
              <div><p className="eyebrow">ROUTE RISK ANALYSIS</p><h3>Travel time and safety signals</h3></div>
              <span className="risk-pill">{selectedRoute.risk}% route risk</span>
            </div>
            <div className="risk-analysis-grid">
              {routeRiskBreakdown.map((item) => (
                <article className="risk-analysis-card" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.detail}</small>
                </article>
              ))}
            </div>
            <p className="helper">These are prototype estimates, not official crime, traffic, or emergency-service records. OSRM is used for road shape and travel time when available.</p>
          </section>
        </div>

        <aside className="control-rail">
          <section className="control-card">
            <div className="panel-heading compact"><div><p className="eyebrow">ROUTE PLANNER</p><h3>Where are you going?</h3></div></div>
            <label>FROM<input value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} /></label>
            <label>TO<input value={destinationInput} onChange={(event) => setDestinationInput(event.target.value)} placeholder="Enter any destination" /></label>
            <div className="route-modes" aria-label="Route mode">
              <button type="button" className={routeMode === 'safest' ? 'selected' : ''} onClick={() => { setRouteMode('safest'); void findRoute('safest') }}>Safest</button>
              <button type="button" className={routeMode === 'shortest' ? 'selected' : ''} onClick={() => { setRouteMode('shortest'); void findRoute('shortest') }}>Shortest</button>
              <button type="button" className={routeMode === 'transit' ? 'selected' : ''} onClick={() => { setRouteMode('transit'); void findRoute('transit') }}>Transit</button>
            </div>
            <div className="control-actions"><button className="button button-secondary" type="button" onClick={detectLocation}>Detect location</button><button className="button button-primary" type="button" onClick={() => void findRoute()} disabled={routeLoading}>{routeLoading ? 'Finding...' : 'Find route'}</button></div>
            <button className="button button-quiet full-button" type="button" onClick={getRouteBrief}>Ask route assistant</button>
            <p className="helper">Detect location needs browser permission. Safest and shortest use OSRM road geometry online, then local fallback only when routing fails.</p>
          </section>
          {routeVisible && (
            <section className="control-card route-comparison">
              <div className="panel-heading compact">
                <div><p className="eyebrow">ROUTE RISK</p><h3>{selectedRoute.label} route selected</h3></div>
                <span className="risk-pill">{selectedRoute.risk}% risk</span>
              </div>
              <div className="risk-row selected-risk"><span>Selected route<small>{selectedRoute.source}</small></span><strong>{selectedRoute.distance} · {selectedRoute.eta}</strong></div>
              {selectedRoute.alternatives.map((alternative) => (
                <div className="risk-row" key={alternative.label}>
                  <span>{alternative.label}<small>{alternative.note}</small></span>
                  <strong>{alternative.risk}% risk</strong>
                </div>
              ))}
              <div className="near-route">
                <span className="metric-label">NEAR THIS ROUTE</span>
                {selectedRoute.nearby.map((name) => <strong key={name}>{name}</strong>)}
              </div>
              <p className="helper">{routeMode === 'shortest' ? 'Shortest mode shows only the shortest local route plus risk and nearby support.' : 'Safest mode shows the recommended safest route with other route danger percentages.'}</p>
            </section>
          )}
          <section className="control-card nearby-card"><div className="panel-heading compact"><div><p className="eyebrow">NEARBY DIRECTORY</p><h3>Emergency contacts</h3></div><span className="directory-state">Official sources</span></div><div className="contact-list">{directory.map((entry) => <div className="contact-row" key={entry.number}><span className={`contact-icon ${entry.category === 'Police' ? 'police-icon' : entry.category === 'Medical' ? 'hospital-icon' : 'alert-icon'}`}>{entry.category === 'Police' ? 'P' : entry.category === 'Medical' ? '+' : '!'}</span><span><strong>{entry.number}</strong><small>{entry.name} · {entry.source}</small></span><span className="contact-actions"><a href={`tel:${entry.number}`} aria-label={`Call ${entry.name}`}>Call</a><a href={entry.url} target="_blank" rel="noreferrer" aria-label={`Open ${entry.source}`}>Source</a></span></div>)}</div><p className="helper">Numbers and sources are published references. The app cannot verify who is physically present at a location.</p></section>
        </aside>
      </section>

      <section className="directory-section">
        <div className="panel-heading">
          <div><p className="eyebrow">LOCAL AUTHORITY DIRECTORY</p><h3>Nearby services and support</h3></div>
          <span className="directory-state">Source-labelled</span>
        </div>
        <div className="directory-tabs" aria-label="Directory category filter">
          {(['All', 'Hospitals', 'Police', 'Fire', 'NGO / Volunteer'] as DirectoryFilter[]).map((category) => (
            <button className={directoryFilter === category ? 'selected' : ''} type="button" key={category} onClick={() => setDirectoryFilter(category)}>{category}</button>
          ))}
        </div>
        <div className="directory-grid">
          {directoryGroups.map(([category, entries]) => (
            <article className="directory-group" key={category}>
              <h4>{category}</h4>
              {entries.map((entry) => (
                <div className="directory-entry" key={entry.name}>
                  <strong>{entry.name}</strong>
                  <small>{entry.number} · {entry.source}</small>
                  <span><a href={`tel:${entry.number}`}>Call</a><a href={entry.url} target="_blank" rel="noreferrer">Source</a></span>
                </div>
              ))}
            </article>
          ))}
        </div>
        <div className="custom-contacts">
          <h4>My emergency contacts</h4>
          <div className="contact-form">
            <input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Contact name" />
            <input value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} placeholder="Phone number" inputMode="tel" />
            <button className="button button-secondary" type="button" onClick={addContact}>Save contact</button>
          </div>
          {customContacts.map((contact) => <a className="saved-contact" href={`tel:${contact.number}`} key={`${contact.name}-${contact.number}`}><strong>{contact.name}</strong><span>{contact.number}</span></a>)}
        </div>
      </section>

      {transitOpen && (
        <section className="transit-card">
          <div>
            <p className="eyebrow">PUBLIC TRANSPORT</p>
            <h3>{transitStatus === 'checking' ? 'Checking buses...' : 'Bus availability'}</h3>
            <p>BMTC does not expose a stable public API in this project. If BMTC_API_URL is configured, this panel shows live results; otherwise use the official handoff buttons.</p>
          </div>
          <div className="bus-list">
            {liveTransitCandidates.map((bus) => (
              <div className={`bus-row bus-${bus.status}`} key={bus.number}>
                <span className="bus-icon">BUS</span>
                <strong>{bus.number}</strong>
                <small>{bus.label} · {bus.message}</small>
              </div>
            ))}
          </div>
          <a className="button button-secondary" href="https://nammabmtcapp.karnataka.gov.in/" target="_blank" rel="noreferrer">Open Namma BMTC</a>
          <a className="button button-primary" href={liveTransitUrl} target="_blank" rel="noreferrer">Open live transit directions</a>
        </section>
      )}

      <section className={`status-strip ${sosActive ? 'sos-active' : ''}`}><span className="status-dot" />{notice}<span className="status-note">{alertSent ? 'Alert ready locally' : 'No unsupported safety claims'} · no live dispatch</span></section>
      {networkWeak && <section className="network-warning">Warning: network appears weak or offline in this area. Live tiles, GPS refresh, transit status, and directory updates may be unavailable.</section>}
      <footer>Map data © OpenStreetMap contributors · This prototype requires a network for map tiles and live transit handoff.</footer>
    </main>
  )
}

export default SafeRouteDashboard
