export function parseMapPoint(latitude: string | number | null | undefined, longitude: string | number | null | undefined): [number, number] | null {
  if (latitude == null || longitude == null || String(latitude).trim() === '' || String(longitude).trim() === '') return null
  const lat = Number(latitude)
  const lon = Number(longitude)
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
    ? [lat, lon] : null
}
