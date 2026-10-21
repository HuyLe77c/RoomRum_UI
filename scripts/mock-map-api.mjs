import http from 'node:http'

// Local, read-only fixture for exercising map pagination and dense markers.
// Run only while the real API is stopped; Vite proxies /api to port 5041.
const rooms = Array.from({ length: 132 }, (_, index) => {
  const district = index < 85 ? 0 : index < 120 ? 1 : 2
  const latitude = district === 0 ? 10.7754 + (index % 9) * 0.00032 : district === 1 ? 10.84 + (index % 7) * 0.0008 : 21.03 + (index % 5) * 0.001
  const longitude = district === 0 ? 106.6996 + Math.floor(index / 9) * 0.00035 : district === 1 ? 106.68 + Math.floor(index / 7) * 0.0007 : 105.82 + Math.floor(index / 5) * 0.001
  return {
    roomId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    userId: '00000000-0000-4000-8000-999999999999',
    title: `Phòng thử bản đồ ${index + 1}`,
    address: district === 2 ? 'Hà Nội' : 'Thành phố Hồ Chí Minh',
    type: 'Phòng trọ', price: 2500000 + index * 10000, area: 24 + index % 8,
    status: 'Available', imageUrl: null,
    latitude: index % 17 === 0 ? null : latitude,
    longitude: index % 17 === 0 ? null : longitude,
  }
})

const send = (response, status, data) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
  response.end(JSON.stringify({ success: status < 400, data, message: status < 400 ? null : 'Không tìm thấy.' }))
}

http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost:5041')
  if (url.pathname === '/api/rooms') {
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 12))
    const lat = Number(url.searchParams.get('latitude'))
    const lon = Number(url.searchParams.get('longitude'))
    const radius = Number(url.searchParams.get('maxDistanceKm'))
    const filtered = radius && url.searchParams.has('latitude') && url.searchParams.has('longitude')
      ? rooms.filter(room => room.latitude != null && Math.hypot((room.latitude - lat) * 111, (room.longitude - lon) * 109) <= radius)
      : rooms
    send(response, 200, { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize })
    return
  }
  if (url.pathname.startsWith('/api/rooms/')) {
    const room = rooms.find(item => url.pathname.endsWith(item.roomId))
    if (room) send(response, 200, { ...room, description: 'Dữ liệu thử', amenities: [], images: [] })
    else send(response, 404, null)
    return
  }
  send(response, 404, null)
}).listen(5041, '127.0.0.1', () => console.log('Mock map API on http://127.0.0.1:5041'))
