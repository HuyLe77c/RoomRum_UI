export const mapTileUrl = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export type MapStyle = 'bright' | 'positron' | 'liberty' | 'classic'

export const mapStyles: { id: MapStyle; label: string; description: string }[] = [
  { id: 'bright', label: 'Phố rõ', description: 'Đường phố và địa danh nổi bật' },
  { id: 'positron', label: 'Tối giản', description: 'Nền sáng để tập trung vào phòng' },
  { id: 'liberty', label: 'Đậm nét', description: 'Màu sắc và công trình rõ hơn' },
  { id: 'classic', label: 'Cơ bản', description: 'Nền OpenStreetMap quen thuộc' },
]

export const mapStyleUrl = (style: Exclude<MapStyle, 'classic'>) => `https://tiles.openfreemap.org/styles/${style}`
