export interface SolarLunarData {
  sunAltitudeDeg: number
  sunAzimuthDeg: number
  isNight: boolean
  twilightState: 'Day' | 'Civil Twilight' | 'Nautical Twilight' | 'Astronomical Twilight' | 'Deep Night'
  moonAltitudeDeg: number
  moonAzimuthDeg: number
  moonPhaseFraction: number // 0.0 to 1.0
  moonPhaseName: string
  moonPhaseIcon: string
  naturalAmbientLux: number
}

// Convert Date to Julian Date
function toJulianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

// Calculate Sun and Moon positions and illumination
export function calculateSolarLunarData(lat: number, lon: number, date: Date = new Date()): SolarLunarData {
  const jd = toJulianDate(date)
  const d = jd - 2451545.0 // days since J2000.0

  // 1. Solar calculations
  const L = (280.46 + 0.9856474 * d) % 360 // mean longitude
  const g = ((357.528 + 0.9856003 * d) % 360) * (Math.PI / 180) // mean anomaly
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * (Math.PI / 180) // ecliptic longitude
  const epsilon = (23.439 - 0.0000004 * d) * (Math.PI / 180) // obliquity

  // Sun right ascension and declination
  const sinAlpha = Math.cos(epsilon) * Math.sin(lambda)
  const cosAlpha = Math.cos(lambda)
  const alpha = Math.atan2(sinAlpha, cosAlpha)
  const delta = Math.asin(Math.sin(epsilon) * Math.sin(lambda))

  // Greenwich Mean Sidereal Time
  const GMST0 = (18.697374558 + 24.06570982441908 * d) % 24
  const hourAngle = (GMST0 * 15 + lon) * (Math.PI / 180) - alpha

  const latRad = lat * (Math.PI / 180)
  const sunAltRad = Math.asin(
    Math.sin(latRad) * Math.sin(delta) + Math.cos(latRad) * Math.cos(delta) * Math.cos(hourAngle)
  )
  const sunAltitudeDeg = sunAltRad * (180 / Math.PI)

  const sunAzRad = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(latRad) - Math.tan(delta) * Math.cos(latRad)
  )
  const sunAzimuthDeg = (sunAzRad * (180 / Math.PI) + 180) % 360

  // Twilight state
  let twilightState: SolarLunarData['twilightState'] = 'Day'
  if (sunAltitudeDeg > 0) twilightState = 'Day'
  else if (sunAltitudeDeg > -6) twilightState = 'Civil Twilight'
  else if (sunAltitudeDeg > -12) twilightState = 'Nautical Twilight'
  else if (sunAltitudeDeg > -18) twilightState = 'Astronomical Twilight'
  else twilightState = 'Deep Night'

  const isNight = sunAltitudeDeg < -0.833

  // 2. Lunar phase calculation (Synodic month 29.530588853 days)
  // Known reference new moon: Jan 6 2000, 18:14 UTC (JD 2451549.26)
  const synodicMonth = 29.530588853
  const phaseCycle = ((jd - 2451549.26) % synodicMonth + synodicMonth) % synodicMonth
  const moonAgeDays = phaseCycle
  // Illumination fraction (0.0 to 1.0)
  const moonPhaseFraction = (1 - Math.cos((2 * Math.PI * moonAgeDays) / synodicMonth)) / 2

  let moonPhaseName = 'New Moon'
  let moonPhaseIcon = '🌑'

  if (moonAgeDays < 1.84) {
    moonPhaseName = 'New Moon'
    moonPhaseIcon = '🌑'
  } else if (moonAgeDays < 7.38) {
    moonPhaseName = 'Waxing Crescent'
    moonPhaseIcon = '🌒'
  } else if (moonAgeDays < 9.22) {
    moonPhaseName = 'First Quarter'
    moonPhaseIcon = '🌓'
  } else if (moonAgeDays < 13.84) {
    moonPhaseName = 'Waxing Gibbous'
    moonPhaseIcon = '🌔'
  } else if (moonAgeDays < 15.68) {
    moonPhaseName = 'Full Moon'
    moonPhaseIcon = '🌕'
  } else if (moonAgeDays < 20.3) {
    moonPhaseName = 'Waning Gibbous'
    moonPhaseIcon = '🌖'
  } else if (moonAgeDays < 22.14) {
    moonPhaseName = 'Last Quarter'
    moonPhaseIcon = '🌗'
  } else {
    moonPhaseName = 'Waning Crescent'
    moonPhaseIcon = '🌘'
  }

  // Approximate Moon Altitude (opposing sun around full moon, offset by age)
  const moonHourAngle = hourAngle - (2 * Math.PI * moonAgeDays) / synodicMonth
  const moonAltRad = Math.asin(
    Math.sin(latRad) * Math.sin(-delta) + Math.cos(latRad) * Math.cos(-delta) * Math.cos(moonHourAngle)
  )
  const moonAltitudeDeg = Math.max(-90, Math.min(90, moonAltRad * (180 / Math.PI)))
  const moonAzimuthDeg = ((sunAzimuthDeg + 180 + (moonAgeDays / synodicMonth) * 360) % 360)

  // 3. Natural ambient lux calculation
  let naturalAmbientLux = 0.001
  if (sunAltitudeDeg > 0) {
    naturalAmbientLux = Math.sin(sunAltRad) * 40000 + 400
  } else if (sunAltitudeDeg > -6) {
    naturalAmbientLux = 3 + ((sunAltitudeDeg + 6) / 6) * 397
  } else if (sunAltitudeDeg > -12) {
    naturalAmbientLux = 0.2 + ((sunAltitudeDeg + 12) / 6) * 2.8
  } else {
    // Night: moonlight
    if (moonAltitudeDeg > 0) {
      naturalAmbientLux = Math.sin(Math.max(0, moonAltRad)) * 0.32 * moonPhaseFraction + 0.002
    } else {
      naturalAmbientLux = 0.002
    }
  }

  return {
    sunAltitudeDeg: Number(sunAltitudeDeg.toFixed(1)),
    sunAzimuthDeg: Number(sunAzimuthDeg.toFixed(1)),
    isNight,
    twilightState,
    moonAltitudeDeg: Number(moonAltitudeDeg.toFixed(1)),
    moonAzimuthDeg: Number(moonAzimuthDeg.toFixed(1)),
    moonPhaseFraction: Number(moonPhaseFraction.toFixed(2)),
    moonPhaseName,
    moonPhaseIcon,
    naturalAmbientLux: Number(naturalAmbientLux.toFixed(3)),
  }
}
