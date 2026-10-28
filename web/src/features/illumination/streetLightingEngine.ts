import { calculateSolarLunarData, type SolarLunarData } from './astronomyMath'

export interface StreetlightOutageReport {
  id: string
  coords: [number, number]
  reportedAt: number
  description: string
  type: 'broken_light' | 'dark_alley' | 'flickering'
  radiusMeters: number
}

export interface StreetLuxResult {
  lux: number
  status: 'bright' | 'moderate' | 'dark'
  color: string
  solarLunar: SolarLunarData
  hasOutageNearby: boolean
  outageDescription?: string
}

const STORAGE_KEY = 'saferoute-streetlight-outages'

class StreetLightingEngine {
  private outages: StreetlightOutageReport[] = []
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.loadOutages()
  }

  private loadOutages() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        this.outages = JSON.parse(saved)
      } else {
        // Initial sample community outage
        this.outages = [
          {
            id: 'OUT-01',
            coords: [13.066, 77.539],
            reportedAt: Date.now() - 3600000 * 2,
            description: '3 Municipal sodium vapor poles dark on connector alley',
            type: 'broken_light',
            radiusMeters: 180,
          },
        ]
      }
    } catch {
      this.outages = []
    }
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify() {
    this.listeners.forEach((fn) => fn())
  }

  public getOutages(): StreetlightOutageReport[] {
    return this.outages
  }

  public reportOutage(report: Omit<StreetlightOutageReport, 'id' | 'reportedAt'>) {
    const newReport: StreetlightOutageReport = {
      ...report,
      id: `OUT-${Date.now().toString(36).toUpperCase()}`,
      reportedAt: Date.now(),
    }
    this.outages.unshift(newReport)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.outages))
    } catch {}
    this.notify()
    return newReport
  }

  public clearOutage(id: string) {
    this.outages = this.outages.filter((o) => o.id !== id)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.outages))
    } catch {}
    this.notify()
  }

  // Distance in meters
  private distanceMeters(c1: [number, number], c2: [number, number]): number {
    const R = 6371000
    const dLat = ((c2[0] - c1[0]) * Math.PI) / 180
    const dLon = ((c2[1] - c1[1]) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((c1[0] * Math.PI) / 180) *
        Math.cos((c2[0] * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Compute composite lux for a given coordinate
  public calculatePointLux(
    coords: [number, number],
    date: Date = new Date(),
    segmentType: 'arterial' | 'collector' | 'alley' = 'arterial'
  ): StreetLuxResult {
    const solarLunar = calculateSolarLunarData(coords[0], coords[1], date)

    // Base streetlight lux based on municipal standards
    let municipalLux = segmentType === 'arterial' ? 42 : segmentType === 'collector' ? 22 : 6

    // Check if near a reported streetlight outage
    let hasOutageNearby = false
    let outageDescription: string | undefined

    for (const outage of this.outages) {
      const dist = this.distanceMeters(coords, outage.coords)
      if (dist < outage.radiusMeters) {
        hasOutageNearby = true
        outageDescription = outage.description
        // Outage severely penalizes municipal lighting
        municipalLux *= 0.15 // 85% drop in light
        break
      }
    }

    // Composite Lux:
    // If daylight, natural ambient lux dominates
    // If night, natural ambient is moonlight (0.002 to 0.3 lux) + municipal streetlights
    let totalLux: number
    if (!solarLunar.isNight) {
      totalLux = Math.round(solarLunar.naturalAmbientLux)
    } else {
      totalLux = Math.round(municipalLux + solarLunar.naturalAmbientLux * 15)
    }

    let status: StreetLuxResult['status'] = 'bright'
    let color = '#10b981' // Bright Green

    if (totalLux >= 25) {
      status = 'bright'
      color = '#10b981'
    } else if (totalLux >= 12) {
      status = 'moderate'
      color = '#f59e0b' // Amber/Yellow
    } else {
      status = 'dark'
      color = '#ef4444' // Red warning shadow
    }

    return {
      lux: totalLux,
      status,
      color,
      solarLunar,
      hasOutageNearby,
      outageDescription,
    }
  }
}

export const streetLightingEngine = new StreetLightingEngine()
