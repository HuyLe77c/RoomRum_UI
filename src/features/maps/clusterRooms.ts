export type MapRoom = { roomId: string; latitude: number; longitude: number }

export type RoomCluster<T extends MapRoom> = {
  key: string
  rooms: T[]
  latitude: number
  longitude: number
}

// Group nearby markers in screen-space. The grid is anchored to world pixels,
// so panning the map does not make markers jump between clusters.
export function clusterRooms<T extends MapRoom>(rooms: T[], zoom: number, cellSize = 84): RoomCluster<T>[] {
  const scale = 256 * 2 ** zoom
  const buckets = new Map<string, T[]>()
  for (const room of rooms) {
    const latitude = Math.max(-85.05112878, Math.min(85.05112878, room.latitude))
    const sin = Math.sin(latitude * Math.PI / 180)
    const x = (room.longitude + 180) / 360 * scale
    const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale
    const key = `${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`
    const bucket = buckets.get(key) || []
    bucket.push(room)
    buckets.set(key, bucket)
  }
  return [...buckets].map(([key, members]) => ({
    key,
    rooms: members,
    latitude: members.reduce((sum, room) => sum + room.latitude, 0) / members.length,
    longitude: members.reduce((sum, room) => sum + room.longitude, 0) / members.length,
  }))
}
