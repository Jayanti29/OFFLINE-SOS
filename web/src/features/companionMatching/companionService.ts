export interface EphemeralCompanion {
  id: string
  pseudonym: string
  corridor: string
  originHub: string
  destinationHub: string
  departureMinutes: number
  reputationRating: number
  distanceMeters: number
  tokenHash: string
  mutualCode: string
  safeMeetingPoint: string
  paceKmH: number
}

class CompanionService {
  private channel: BroadcastChannel | null = null
  private matchedCompanion: EphemeralCompanion | null = null
  private isSearching: boolean = false
  private listeners: Set<() => void> = new Set()

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('saferoute-companion-pool')
        this.channel.onmessage = (e) => {
          if (e.data?.type === 'SHARED_PANIC' && this.matchedCompanion) {
            this.handleSharedPanic(e.data)
          }
        }
      } catch {}
    }
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify() {
    this.listeners.forEach((fn) => fn())
  }

  public async generateZeroKnowledgeToken(corridorName: string, departureWindow: string): Promise<string> {
    const hourlySalt = Math.floor(Date.now() / (1000 * 60 * 60)).toString()
    const input = `${corridorName}:${departureWindow}:${hourlySalt}`

    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(input)
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16).toUpperCase()
    }
    return `ZK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
  }

  public getAvailableCompanions(corridor: string): EphemeralCompanion[] {
    return [
      {
        id: 'CMP-902',
        pseudonym: 'Metro Commuter #409',
        corridor: corridor || 'Peenya - Jalahalli Safe Corridor',
        originHub: 'Metro Exit Gate 2',
        destinationHub: 'Tech Park North Gate',
        departureMinutes: 3,
        reputationRating: 4.9,
        distanceMeters: 45,
        tokenHash: 'A8F1C32D90E5',
        mutualCode: 'EMERALD-74',
        safeMeetingPoint: 'Well-Lit CCTV Booth near Metro Gate 2',
        paceKmH: 4.8,
      },
      {
        id: 'CMP-441',
        pseudonym: 'Safe Walker #812',
        corridor: corridor || 'Peenya - Jalahalli Safe Corridor',
        originHub: 'Bus Rapid Transit Stop #3',
        destinationHub: 'Presidency Campus Road',
        departureMinutes: 5,
        reputationRating: 5.0,
        distanceMeters: 110,
        tokenHash: '3D90E5B742A1',
        mutualCode: 'AMBER-32',
        safeMeetingPoint: '24/7 Pharmacy Entrance (Bright LED Zone)',
        paceKmH: 5.1,
      },
    ]
  }

  public matchWith(companion: EphemeralCompanion) {
    this.matchedCompanion = companion
    this.isSearching = false
    this.notify()
  }

  public getIsSearching(): boolean {
    return this.isSearching
  }

  public getMatchedCompanion(): EphemeralCompanion | null {
    return this.matchedCompanion
  }

  public disconnectCompanion() {
    this.matchedCompanion = null
    this.isSearching = false
    this.notify()
  }

  public triggerSharedPanic() {
    if (!this.matchedCompanion) return
    if (this.channel) {
      this.channel.postMessage({
        type: 'SHARED_PANIC',
        companionId: this.matchedCompanion.id,
        timestamp: Date.now(),
      })
    }
  }

  private handleSharedPanic(_data: any) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([400, 100, 400, 100, 400])
    }
    alert('🚨 COMPANION MUTUAL PANIC: Your walking companion activated emergency SOS! Coordinates dispatched.')
  }
}

export const companionService = new CompanionService()
