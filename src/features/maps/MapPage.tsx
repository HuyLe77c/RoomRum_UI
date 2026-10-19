import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { ArrowRight, Crosshair, Home, Layers3, List, MapPin, Navigation, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { api } from '../../shared/api/client'
import { mapStyles, mapStyleUrl, mapTileUrl } from './mapConfig'
import type { MapStyle } from './mapConfig'
import { ErrorState, Header, Loading, State, shortMoney, useResource } from '../../shared/ui'
import type { Room, RoomDetail, RoomSearch } from '../../shared/types'
import 'leaflet/dist/leaflet.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import './map.css'

type Point = [number, number]
type LocatedRoom = Room & { latitude: number; longitude: number }
type Location = { displayName: string; latitude: number; longitude: number }

const vietNamCenter: Point = [16.05, 107.8]
const vectorAttribution = '&copy; <a href="https://openfreemap.org/">OpenFreeMap</a> &middot; <a href="https://openmaptiles.org/">OpenMapTiles</a> &middot; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'

setWorkerUrl(workerUrl)

function MapBasemap({ style, onFallback }: { style: MapStyle; onFallback: () => void }) {
  const map = useMap()
  useEffect(() => {
    if (style === 'classic') return
    const layer = maplibreGL({ style: mapStyleUrl(style), interactive: false, attributionControl: false })
    let loaded = false
    let removed = false
    try {
      layer.addTo(map)
    } catch {
      onFallback()
      return
    }
    map.attributionControl?.addAttribution(vectorAttribution)
    const vectorMap = layer.getMaplibreMap()
    const onLoad = () => {
      loaded = true
      for (const label of vectorMap.getStyle().layers) {
        if (label.type !== 'symbol') continue
        const textField = label.layout?.['text-field']
        if (textField && JSON.stringify(textField).includes('name')) {
          vectorMap.setLayoutProperty(label.id, 'text-field', ['coalesce', ['get', 'name:vi'], ['get', 'name'], ['get', 'name_en']])
        }
      }
    }
    const onError = (event: { error?: { message?: string } }) => {
      if (!loaded && /403|404|fetch|style|network/i.test(event.error?.message || '')) onFallback()
    }
    vectorMap.on('load', onLoad)
    vectorMap.on('error', onError)
    const timeout = window.setTimeout(() => { if (!loaded && !removed) onFallback() }, 12000)
    return () => {
      removed = true
      window.clearTimeout(timeout)
      vectorMap.off('load', onLoad)
      vectorMap.off('error', onError)
      map.attributionControl?.removeAttribution(vectorAttribution)
      map.removeLayer(layer)
    }
  }, [map, style, onFallback])
  return style === 'classic' ? <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url={mapTileUrl} /> : null
}

function validPoint(latitude: number | null | undefined, longitude: number | null | undefined): Point | null {
  return latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
    ? [latitude, longitude] : null
}

function priceMarker(room: Room, selected: boolean) {
  const label = shortMoney(room.price)
  return L.divIcon({
    className: `price-marker${selected ? ' is-selected' : ''}`,
    html: `<span class="price-marker-label">${label}</span><i aria-hidden="true"></i>`,
    iconSize: [112, 48], iconAnchor: [56, 48],
  })
}

function MapViewport({ center, rooms, selected, mode }: {
  center: Point | null; rooms: LocatedRoom[]; selected: Point | null; mode: 'map' | 'list'
}) {
  const map = useMap()
  const locations = rooms.map(room => [room.latitude, room.longitude] as Point)
  const key = locations.map(point => point.join(',')).join(';')
  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize()
      if (selected) map.flyTo(selected, Math.max(map.getZoom(), 15))
      else if (center) map.flyTo(center, 13)
      else if (locations.length) map.fitBounds(L.latLngBounds(locations), { padding: [65, 65], maxZoom: 14 })
    }, 80)
    return () => window.clearTimeout(timer)
  // The location key tracks marker changes without refitting on unrelated rerenders.
  }, [map, center?.[0], center?.[1], selected?.[0], selected?.[1], mode, key])
  return null
}

function PickMapCenter({ enabled, onPick }: { enabled: boolean; onPick: (point: Point) => void }) {
  useMapEvents({ click: event => { if (enabled) onPick([event.latlng.lat, event.latlng.lng]) } })
  return null
}

export function MapPage() {
  const [params, setParams] = useSearchParams()
  const serialized = params.toString()
  const [term, setTerm] = useState(params.get('locationLabel') || '')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [view, setView] = useState<'map' | 'list'>('map')
  const [mapStyle, setMapStyle] = useState<MapStyle>(() => {
    const saved = window.localStorage.getItem('roomrum-map-style')
    return mapStyles.some(style => style.id === saved) ? saved as MapStyle : 'bright'
  })
  const [picking, setPicking] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(params.get('roomId'))
  const [focusedRoom, setFocusedRoom] = useState<RoomDetail | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<RoomDetail | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markers = useRef<Record<string, L.Marker | null>>({})

  useEffect(() => setTerm(params.get('locationLabel') || ''), [serialized])
  useEffect(() => setSelectedId(params.get('roomId')), [serialized])

  const query = new URLSearchParams(params)
  query.delete('locationLabel'); query.delete('roomId')
  query.set('page', '1'); query.set('pageSize', '100')
  const listQuery = new URLSearchParams(params)
  listQuery.delete('roomId')
  const { data, loading, error, reload } = useResource<RoomSearch>(`/rooms?${query}`)
  const roomId = params.get('roomId')
  useEffect(() => {
    if (!roomId) { setFocusedRoom(null); return }
    let active = true
    api<RoomDetail>(`/rooms/${encodeURIComponent(roomId)}`)
      .then(room => { if (active) setFocusedRoom(room) })
      .catch(() => { if (active) setFocusedRoom(null) })
    return () => { active = false }
  }, [roomId])
  useEffect(() => {
    if (!selectedId) { setSelectedDetail(null); return }
    if (selectedId === roomId) { setSelectedDetail(focusedRoom); return }
    let active = true
    setSelectedDetail(null)
    api<RoomDetail>(`/rooms/${encodeURIComponent(selectedId)}`)
      .then(room => { if (active) setSelectedDetail(room) })
      .catch(() => { if (active) setSelectedDetail(null) })
    return () => { active = false }
  }, [selectedId, roomId, focusedRoom])

  const center = validPoint(Number(params.get('latitude')), Number(params.get('longitude')))
  const searchCenter = params.has('latitude') && params.has('longitude') ? center : null
  const radius = Number(params.get('maxDistanceKm'))
  const hasRadius = searchCenter && Number.isFinite(radius) && radius > 0
  const located = useMemo(() => {
    const rooms = data?.items || []
    const included = focusedRoom && !rooms.some(room => room.roomId === focusedRoom.roomId)
      ? [...rooms, focusedRoom] : rooms
    return included.filter(room => validPoint(room.latitude, room.longitude)) as LocatedRoom[]
  }, [data, focusedRoom])
  const selectedRoom = located.find(room => room.roomId === selectedId)
  const selectedPoint = selectedRoom ? [selectedRoom.latitude, selectedRoom.longitude] as Point : null
  const unlocated = (data?.items || []).filter(room => !validPoint(room.latitude, room.longitude)).length
  useEffect(() => {
    if (!roomId || !selectedRoom) return
    const timer = window.setTimeout(() => markers.current[roomId]?.openPopup(), 450)
    return () => window.clearTimeout(timer)
  }, [roomId, selectedRoom?.roomId])

  const updateCenter = (point: Point, label: string, nextRadius = 5) => {
    const next = new URLSearchParams(params)
    next.set('latitude', point[0].toFixed(6)); next.set('longitude', point[1].toFixed(6))
    next.set('maxDistanceKm', String(nextRadius)); next.set('sort', 'distance')
    next.set('locationLabel', label); next.delete('roomId'); next.set('page', '1')
    mapRef.current?.closePopup(); setSelectedId(null); setPicking(false); setNotice(''); setParams(next)
  }

  const searchPlace = async (event: FormEvent) => {
    event.preventDefault()
    const place = term.trim()
    if (!place) { setNotice('Nhập địa điểm để tìm trên bản đồ.'); return }
    setBusy(true); setNotice('')
    try {
      const result = await api<Location>(`/locations/search?q=${encodeURIComponent(place)}`)
      updateCenter([result.latitude, result.longitude], place)
    } catch (cause) { setNotice((cause as Error).message) }
    finally { setBusy(false) }
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) { setNotice('Trình duyệt này không hỗ trợ vị trí hiện tại.'); return }
    setBusy(true); setNotice('')
    navigator.geolocation.getCurrentPosition(
      position => { updateCenter([position.coords.latitude, position.coords.longitude], 'Vị trí của tôi'); setBusy(false) },
      error => { setNotice(error.code === 1 ? 'Bạn chưa cấp quyền vị trí cho trình duyệt.' : 'Không lấy được vị trí hiện tại. Hãy thử tìm địa điểm.'); setBusy(false) },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    )
  }

  const searchViewport = () => {
    const map = mapRef.current
    if (!map) return
    const c = map.getCenter()
    const radiusKm = map.distance(c, map.getBounds().getNorthEast()) / 1000
    if (radiusKm > 100) { setNotice('Hãy phóng to bản đồ để tìm trong bán kính tối đa 100 km.'); return }
    updateCenter([c.lat, c.lng], 'Khu vực đang xem', Math.max(1, Math.ceil(radiusKm)))
  }

  const selectRoom = (room: LocatedRoom) => {
    setSelectedId(room.roomId); setView('map')
    window.setTimeout(() => markers.current[room.roomId]?.openPopup(), 160)
  }

  const changeRadius = (value: number) => {
    const next = new URLSearchParams(params)
    next.set('maxDistanceKm', String(value)); next.set('page', '1')
    mapRef.current?.closePopup(); setSelectedId(null); setParams(next)
  }

  const clearCenter = () => {
    const next = new URLSearchParams(params)
    for (const key of ['latitude', 'longitude', 'maxDistanceKm', 'locationLabel']) next.delete(key)
    if (next.get('sort') === 'distance') next.delete('sort')
    next.set('page', '1')
    mapRef.current?.closePopup(); setTerm(''); setSelectedId(null); setPicking(false); setNotice(''); setParams(next)
  }

  const showAllMarkers = () => {
    const map = mapRef.current
    if (!map) return
    map.closePopup(); setSelectedId(null); setPicking(false)
    if (located.length) map.fitBounds(L.latLngBounds(located.map(room => [room.latitude, room.longitude] as Point)), { padding: [70, 70], maxZoom: 14 })
    else map.setView(vietNamCenter, 6)
  }

  const locationLabel = params.get('locationLabel') || 'tâm tìm kiếm'
  const activeFilters = [...params.keys()].filter(key => !['page', 'pageSize', 'sort', 'latitude', 'longitude', 'maxDistanceKm', 'locationLabel', 'roomId'].includes(key)).length
  const chooseMapStyle = (style: MapStyle) => { setMapStyle(style); window.localStorage.setItem('roomrum-map-style', style) }
  const fallbackMapStyle = useCallback(() => setMapStyle('classic'), [])

  return <><Header /><main className="map-page">
    <div className="map-toolbar">
      <form onSubmit={searchPlace} role="search"><Search size={19} aria-hidden="true" /><input aria-label="Tìm địa điểm trên bản đồ" placeholder="Tìm trường học, đường phố, khu vực..." value={term} onChange={event => setTerm(event.target.value)} /><button className="button button-primary small" disabled={busy}>{busy ? 'Đang tìm…' : 'Tìm trên bản đồ'}</button></form>
      <div className="map-toolbar-actions"><button type="button" className="map-toolbar-action" disabled={busy} onClick={useMyLocation}><Navigation size={17} aria-hidden="true" /><span>Vị trí của tôi</span></button>
      <Link to={`/search?${listQuery.toString()}`} className="map-toolbar-action"><SlidersHorizontal size={17} aria-hidden="true" /><span>Bộ lọc nâng cao{activeFilters > 0 ? ` (${activeFilters})` : ''}</span></Link></div>
    </div>
    {notice && <div className="map-notice" role="alert">{notice}</div>}
    <div className="map-layout">
      <aside className={view === 'list' ? 'map-list mobile-show' : 'map-list'}>
        <div className="map-list-head"><div className="map-list-heading"><div><span className="map-eyebrow">KHÁM PHÁ KHU VỰC</span><h1>Phòng trên bản đồ</h1></div><span className="map-count">{data?.total ?? 0} phòng</span></div>
          <p>{hasRadius ? `Kết quả quanh ${locationLabel}` : 'Khám phá các phòng đã có vị trí trên RoomRum'}</p>
          {hasRadius && <div className="map-active-area"><div><MapPin size={16} aria-hidden="true" /><span>Bán kính <strong>{radius} km</strong></span><button type="button" onClick={clearCenter} aria-label="Xóa khu vực tìm kiếm" title="Xóa khu vực tìm kiếm"><X size={15} /></button></div><div className="map-radius-options" role="group" aria-label="Chọn bán kính tìm kiếm">{[2, 5, 10, 20].map(value => <button key={value} type="button" aria-pressed={radius === value} className={radius === value ? 'active' : ''} onClick={() => changeRadius(value)}>{value} km</button>)}</div></div>}
          {(unlocated > 0 || (data && data.total > data.items.length)) && <p className="map-data-note">{unlocated > 0 && `${unlocated} phòng chưa có vị trí để ghim. `}{data && data.total > data.items.length && `Đang hiển thị ${data.items.length} phòng đầu tiên.`}</p>}
        </div>
        <div className="map-list-scroll">{loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} /> : !data?.items.length ? <State title="Khu vực này chưa có phòng" description="Thử khu vực khác hoặc tăng bán kính ở trang bộ lọc." /> : data.items.map(room => {
          const hasPoint = !!validPoint(room.latitude, room.longitude)
          return <article className={`map-result${selectedId === room.roomId ? ' is-selected' : ''}`} key={room.roomId}>
            <div className="map-result-thumb">{room.imageUrl ? <img src={room.imageUrl} alt="" loading="lazy" /> : <Home size={28} aria-hidden="true" />}{room.type && <span>{room.type}</span>}</div>
            <div className="map-result-content"><strong>{room.title || 'Phòng chưa có tiêu đề'}</strong><span className="map-result-address"><MapPin size={14} aria-hidden="true" /> {room.address || 'Chưa có địa chỉ'}</span><div className="map-result-meta">{room.area != null && <span>{room.area.toLocaleString('vi-VN')} m²</span>}<span>{hasPoint ? room.distanceKm != null ? `${room.distanceKm.toLocaleString('vi-VN')} km từ tâm` : 'Có vị trí trên bản đồ' : 'Chưa có vị trí'}</span></div><div className="map-result-bottom"><span className="map-result-price">{shortMoney(room.price)} <small>/ tháng</small></span><div className="map-result-actions">{hasPoint && <button type="button" onClick={() => selectRoom(room as LocatedRoom)} aria-label={`Xem ${room.title || 'phòng'} trên bản đồ`}><MapPin size={16} /></button>}<Link to={`/rooms/${room.roomId}`} aria-label={`Xem chi tiết ${room.title || 'phòng'}`}><ArrowRight size={17} /></Link></div></div></div>
          </article>
        })}</div>
      </aside>
      <div className={view === 'map' ? 'map-canvas mobile-show' : 'map-canvas'}>
        <MapContainer center={vietNamCenter} zoom={6} scrollWheelZoom className={picking ? 'leaflet-map is-picking' : 'leaflet-map'} ref={mapRef} zoomControl={false}>
          <MapBasemap style={mapStyle} onFallback={fallbackMapStyle} />
          <MapViewport center={searchCenter} rooms={located} selected={selectedPoint} mode={view} />
          <PickMapCenter enabled={picking} onPick={point => updateCenter(point, 'Điểm đã chọn trên bản đồ')} />
          {searchCenter && <>{hasRadius && <Circle center={searchCenter} radius={radius * 1000} pathOptions={{ color: '#2563ad', weight: 2, dashArray: '7 5', fillColor: '#3b82d8', fillOpacity: 0.09 }} />}<CircleMarker center={searchCenter} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563ad', fillOpacity: 1 }}><Popup>Tâm tìm kiếm: {locationLabel}</Popup></CircleMarker></>}
          {located.map(room => <Marker key={room.roomId} position={[room.latitude, room.longitude]} icon={priceMarker(room, selectedId === room.roomId)} ref={instance => { markers.current[room.roomId] = instance }} eventHandlers={{ click: () => setSelectedId(room.roomId) }}><Popup className="room-map-popup" autoPanPaddingTopLeft={[20, 72]} autoPanPaddingBottomRight={[20, 110]}><div className="map-popup"><div className="map-popup-image">{room.imageUrl ? <img src={room.imageUrl} alt="" /> : <Home size={32} aria-hidden="true" />}</div><div className="map-popup-body"><span className="map-popup-meta">{[room.type, room.area != null ? `${room.area.toLocaleString('vi-VN')} m²` : null].filter(Boolean).join(' · ') || 'Phòng trọ'}</span><strong>{room.title || 'Phòng trọ'}</strong><span className="map-popup-address"><MapPin size={14} aria-hidden="true" />{room.address || 'Chưa có địa chỉ'}</span>{selectedDetail?.roomId === room.roomId && <>{selectedDetail.description && <p className="map-popup-description">{selectedDetail.description}</p>}{selectedDetail.amenities.length > 0 && <div className="map-popup-amenities">{selectedDetail.amenities.slice(0, 3).map(amenity => <span key={amenity.amenityId}>{amenity.amenityName}</span>)}{selectedDetail.amenities.length > 3 && <span>+{selectedDetail.amenities.length - 3}</span>}</div>}</>}<div className="map-popup-bottom"><b>{shortMoney(room.price)} <small>/ tháng</small></b><Link to={`/rooms/${room.roomId}`}>Chi tiết <ArrowRight size={15} aria-hidden="true" /></Link></div></div></div></Popup></Marker>)}
        </MapContainer>
        <div className="map-maphead"><span className="map-live-dot" /><strong>{loading ? 'Đang tải phòng…' : `${located.length} vị trí phòng`}</strong><span>trên bản đồ</span></div>
        <div className="map-controls"><button type="button" aria-label="Tìm khu vực đang xem" title="Tìm khu vực đang xem" onClick={searchViewport}><Search size={17} aria-hidden="true" /><span>Tìm khu vực đang xem</span></button><button type="button" aria-label={picking ? 'Đang chọn tâm tìm kiếm' : 'Chọn tâm tìm kiếm'} title={picking ? 'Nhấn vào bản đồ để chọn tâm' : 'Chọn tâm tìm kiếm'} aria-pressed={picking} className={picking ? 'active' : ''} onClick={() => setPicking(value => !value)}><Crosshair size={17} aria-hidden="true" /><span>{picking ? 'Nhấn vào bản đồ…' : 'Chọn tâm tìm kiếm'}</span></button><button type="button" aria-label="Xem tất cả phòng" title="Xem tất cả phòng" onClick={showAllMarkers}><RotateCcw size={17} aria-hidden="true" /><span>Xem tất cả phòng</span></button></div>
        <div className="map-zoom" aria-label="Thu phóng bản đồ"><button type="button" aria-label="Phóng to bản đồ" onClick={() => mapRef.current?.zoomIn()}>+</button><button type="button" aria-label="Thu nhỏ bản đồ" onClick={() => mapRef.current?.zoomOut()}>−</button></div>
        <div className="map-style-picker" role="group" aria-label="Kiểu bản đồ"><span className="map-style-title"><Layers3 size={15} aria-hidden="true" /> Lớp bản đồ</span><div>{mapStyles.map(style => <button key={style.id} type="button" className={`map-style-option map-style-${style.id}${mapStyle === style.id ? ' active' : ''}`} aria-pressed={mapStyle === style.id} title={style.description} onClick={() => chooseMapStyle(style.id)}><span aria-hidden="true" />{style.label}</button>)}</div></div>
        <div className="map-legend"><span className="map-legend-marker" /><span>Giá thuê theo tháng</span><span className="map-legend-separator" /><span>Nhấn marker để xem phòng</span></div>
        {picking && <div className="map-pick-hint" role="status"><Crosshair size={16} /> Chạm vào bản đồ để chọn tâm tìm kiếm</div>}
      </div>
    </div>
    <div className="map-mobile-toggle"><button type="button" onClick={() => setView(value => value === 'map' ? 'list' : 'map')}>{view === 'map' ? <><List size={18} /> Xem {data?.total ?? 0} phòng</> : <><MapPin size={18} /> Xem bản đồ</>}</button></div>
  </main></>
}
