export type EmergencyCategory = 'sos' | 'acoustic_scream' | 'womens_sos' | 'medical' | 'companion_panic'

export type DisasterPayload = {
  id: string
  originNodeId: string
  timestamp: number
  coords: [number, number]
  locationLabel: string
  severity: 'critical' | 'urgent' | 'warning'
  category: EmergencyCategory
  medicalNotes?: string
  emergencyContacts: { name: string; number: string }[]
  audioClipUrl?: string
  audioDurationSec?: number
}

export type MeshPacketType = 'SOS_PAYLOAD' | 'ACK_DISPATCHED' | 'HEARTBEAT' | 'PEER_PING'

export type MeshPacket = {
  packetId: string
  type: MeshPacketType
  payload: DisasterPayload
  hops: number
  maxHops: number
  path: string[]
  dispatchedBy?: string
  dispatchedAt?: number
}

export type MeshNodeStatus = 'online_cellular' | 'mesh_relay' | 'dead_zone_victim'

export type MeshNode = {
  id: string
  name: string
  status: MeshNodeStatus
  hasCellular: boolean
  battery: number
  distanceMeters: number
  lastSeen: number
  isSelf?: boolean
  rssi: number
  coords?: [number, number]
}

export type MeshEventLog = {
  id: string
  timestamp: number
  message: string
  type: 'info' | 'hop' | 'dispatch' | 'connect' | 'error'
  packetId?: string
}
