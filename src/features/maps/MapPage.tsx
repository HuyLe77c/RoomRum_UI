import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Circle, CircleMarker, MapContainer, Marker, Popup, ScaleControl, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { ArrowRight, Crosshair, Home, Layers3, List, MapPin, Navigation, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { api } from '../../shared/api/client'
import { mapStyles, mapStyleUrl, mapTileUrl } from './mapConfig'
import type { MapStyle } from './mapConfig'
import { clusterRooms } from './clusterRooms'
import { enhanceMapStyle } from './enhanceMapStyle'
import { parseMapPoint } from './mapCoordinates'
import { ErrorState, Header, Loading, State, shortMoney, useResource } from '../../shared/ui'
import type { Room, RoomDetail, RoomSearch } from '../../shared/types'
import 'leaflet/dist/leaflet.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../../styles/map-layout.css'
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
      enhanceMapStyle(vectorMap, style)
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
  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize()
      if (selected) map.flyTo(selected, Math.max(map.getZoom(), 15))
      else if (center) map.flyTo(center, 13)
    }, 80)
    return () => window.clearTimeout(timer)
  }, [map, center?.[0], center?.[1], selected?.[0], selected?.[1], mode])
  const fitted = useRef(false)
  useEffect(() => {
    if (center) { fitted.current = false; return }
    if (fitted.current || !rooms.length) return
    fitted.current = true
    map.fitBounds(L.latLngBounds(rooms.map(room => [room.latitude, room.longitude] as Point)), { padding: [65, 65], maxZoom: 14 })
  }, [map, center, rooms])
  return null
}

function PickMapCenter({ enabled, onPick }: { enabled: boolean; onPick: (point: Point) => void }) {
  useMapEvents({ click: event => { if (enabled) onPick([event.latlng.lat, event.latlng.lng]) } })
  return null
}

function ReportZoom({ onZoom }: { onZoom: (zoom: number) => void }) {
  useMapEvents({ zoomend: event => onZoom(event.target.getZoom()) })
  return null
}

export function MapPage() {
  const [params, setParams] = useSearchParams()
  const serialized = params.toString()
  const [term, setTerm] = useState(params.get('locationLabel') || '')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [suggestions, setSuggestions] = useState<Location[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(0)
  const suggestionRequest = useRef(0)
  const [resultPage, setResultPage] = useState(1)
  const [roomResults, setRoomResults] = useState<{ key: string; items: Room[]; total: number }>({ key: '', items: [], total: 0 })
  const [view, setView] = useState<'map' | 'list'>('map')
  const [mapZoom, setMapZoom] = useState(6)
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

  const searchCenter = parseMapPoint(params.get('latitude'), params.get('longitude'))
  const invalidCoordinates = (params.has('latitude') || params.has('longitude')) && !searchCenter
  const rawRadius = params.get('maxDistanceKm')
  const invalidRadius = rawRadius !== null && (!searchCenter || !rawRadius.trim() ||
    !Number.isFinite(Number(rawRadius)) || Number(rawRadius) <= 0 || Number(rawRadius) > 100)
  const invalidDistanceSort = params.get('sort') === 'distance' && !searchCenter
  useEffect(() => {
    if (!invalidCoordinates && !invalidRadius && !invalidDistanceSort) return
    const next = new URLSearchParams(params)
    if (invalidCoordinates) { next.delete('latitude'); next.delete('longitude'); next.delete('locationLabel') }
    if (invalidRadius) next.delete('maxDistanceKm')
    if (invalidDistanceSort) next.delete('sort')
    setNotice('Liên kết có tọa độ hoặc bán kính không hợp lệ; đã bỏ phần tìm kiếm vị trí.')
    setParams(next, { replace: true })
  }, [serialized, invalidCoordinates, invalidRadius, invalidDistanceSort, setParams])

  const query = new URLSearchParams(params)
  if (invalidCoordinates) { query.delete('latitude'); query.delete('longitude') }
  if (invalidRadius) query.delete('maxDistanceKm')
  if (invalidDistanceSort) query.delete('sort')
  query.delete('locationLabel'); query.delete('roomId')
  query.delete('page'); query.delete('pageSize')
  const resultKey = query.toString()
  query.set('page', String(resultPage)); query.set('pageSize', '100')
  const listQuery = new URLSearchParams(params)
  listQuery.delete('roomId')
  const resourcePath = `/rooms?${query}`
  const { data, dataPath, loading, error, reload } = useResource<RoomSearch>(resourcePath)
  useEffect(() => { setResultPage(1); setRoomResults({ key: resultKey, items: [], total: 0 }) }, [resultKey])
  useEffect(() => {
    if (!data || dataPath !== resourcePath || roomResults.key !== resultKey) return
    setRoomResults(previous => ({ key: resultKey,
      items: resultPage === 1 ? data.items : [...previous.items, ...data.items.filter(room => !previous.items.some(item => item.roomId === room.roomId))],
      total: data.total }))
  }, [data, dataPath, resourcePath, resultKey, resultPage])
  useEffect(() => {
    const place = term.trim()
    if (place.length < 3 || place === params.get('locationLabel')) { setSuggestions([]); setSuggesting(false); return }
    const requestId = ++suggestionRequest.current
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSuggesting(true)
      try {
        const places = await api<Location[]>(`/locations/suggest?q=${encodeURIComponent(place)}`, { signal: controller.signal })
        if (requestId === suggestionRequest.current) { setSuggestions(places); setActiveSuggestion(0) }
      } catch (cause) {
        if (!controller.signal.aborted && requestId === suggestionRequest.current) setNotice((cause as Error).message)
      } finally { if (requestId === suggestionRequest.current) setSuggesting(false) }
    }, 350)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [term, serialized])
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

  const radius = Number(params.get('maxDistanceKm'))
  const hasRadius = !!searchCenter && !invalidRadius && Number.isFinite(radius) && radius > 0
  const located = useMemo(() => {
    const rooms = roomResults.key === resultKey ? roomResults.items : []
    const included = focusedRoom && !rooms.some(room => room.roomId === focusedRoom.roomId)
      ? [...rooms, focusedRoom] : rooms
    return included.filter(room => validPoint(room.latitude, room.longitude)) as LocatedRoom[]
  }, [roomResults, resultKey, focusedRoom])
  const selectedRoom = located.find(room => room.roomId === selectedId)
  const selectedPoint = selectedRoom ? [selectedRoom.latitude, selectedRoom.longitude] as Point : null
  const groupedRooms = useMemo(() => clusterRooms(located.filter(room => room.roomId !== selectedId), mapZoom), [located, selectedId, mapZoom])
  const individualRooms = [...groupedRooms.filter(group => group.rooms.length === 1).map(group => group.rooms[0]), ...(selectedRoom ? [selectedRoom] : [])]
  const roomClusters = groupedRooms.filter(group => group.rooms.length > 1)
  const visibleRooms = roomResults.key === resultKey ? roomResults.items : []
  const totalRooms = roomResults.key === resultKey ? roomResults.total : 0
  const unlocated = visibleRooms.filter(room => !validPoint(room.latitude, room.longitude)).length
  useEffect(() => {
    if (!roomId || !selectedRoom) return
    const timer = window.setTimeout(() => markers.current[roomId]?.openPopup(), 450)
    return () => window.clearTimeout(timer)
  }, [roomId, selectedRoom?.roomId])

  const updateCenter = (point: Point, label: string, nextRadius = 5) => {
    suggestionRequest.current++; setSuggestions([]); setTerm(label)
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
    if (suggestions.length) { const choice = suggestions[activeSuggestion]; updateCenter([choice.latitude, choice.longitude], choice.displayName); return }
    setBusy(true); setNotice('')
    try {
      const results = await api<Location[]>(`/locations/suggest?q=${encodeURIComponent(place)}`)
      if (results.length === 1) updateCenter([results[0].latitude, results[0].longitude], results[0].displayName)
      else if (results.length) { setSuggestions(results); setActiveSuggestion(0); setNotice('Có nhiều địa điểm phù hợp. Hãy chọn đúng vị trí trong danh sách.') }
      else setNotice('Không tìm thấy địa điểm. Hãy nhập cụ thể hơn hoặc chọn tâm trên bản đồ.')
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
    else if (searchCenter) map.flyTo(searchCenter, 13)
    else map.setView(vietNamCenter, 6)
  }

  const locationLabel = params.get('locationLabel') || 'tâm tìm kiếm'
  const activeFilters = [...params.keys()].filter(key => !['page', 'pageSize', 'sort', 'latitude', 'longitude', 'maxDistanceKm', 'locationLabel', 'roomId'].includes(key)).length
  const chooseMapStyle = (style: MapStyle) => { setMapStyle(style); window.localStorage.setItem('roomrum-map-style', style) }
  const fallbackMapStyle = useCallback(() => setMapStyle('classic'), [])

  return <><Header /><main className="map-page">
    <div className="map-toolbar">
      <form onSubmit={searchPlace} role="search"><Search size={19} aria-hidden="true" /><input aria-label="Tìm địa điểm trên bản đồ" placeholder="Tìm trường học, đường phố, khu vực..." value={term} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={suggestions.length > 0} aria-controls="map-place-suggestions" aria-activedescendant={suggestions.length ? `map-place-option-${activeSuggestion}` : undefined} onChange={event => { suggestionRequest.current++; setSuggestions([]); setTerm(event.target.value); setNotice('') }} onKeyDown={event => { if (event.key === 'Escape') { setSuggestions([]); return } if (event.key === 'ArrowDown' && suggestions.length) { event.preventDefault(); setActiveSuggestion(index => (index + 1) % suggestions.length) } if (event.key === 'ArrowUp' && suggestions.length) { event.preventDefault(); setActiveSuggestion(index => (index - 1 + suggestions.length) % suggestions.length) } }} /><button className="button button-primary small" disabled={busy}>{busy ? 'Đang tìm…' : 'Tìm trên bản đồ'}</button>{suggesting && <span className="map-suggesting" role="status">Đang tìm địa điểm…</span>}{suggestions.length > 0 && <div id="map-place-suggestions" className="map-place-suggestions" role="listbox" aria-label="Địa điểm gợi ý">{suggestions.map((place, index) => <button type="button" role="option" aria-selected={index === activeSuggestion} id={`map-place-option-${index}`} key={`${place.displayName}-${place.latitude}-${place.longitude}`} className={index === activeSuggestion ? 'active' : ''} onMouseEnter={() => setActiveSuggestion(index)} onClick={() => updateCenter([place.latitude, place.longitude], place.displayName)}><MapPin size={16} /><span>{place.displayName}</span></button>)}</div>}</form>
      <div className="map-toolbar-actions"><button type="button" className="map-toolbar-action" disabled={busy} onClick={useMyLocation}><Navigation size={17} aria-hidden="true" /><span>Vị trí của tôi</span></button>
      <Link to={`/search?${listQuery.toString()}`} className="map-toolbar-action"><SlidersHorizontal size={17} aria-hidden="true" /><span>Bộ lọc nâng cao{activeFilters > 0 ? ` (${activeFilters})` : ''}</span></Link></div>
    </div>
    {notice && <div className="map-notice" role="alert">{notice}</div>}
    <div className="map-layout">
      <aside className={view === 'list' ? 'map-list mobile-show' : 'map-list'}>
        <div className="map-list-head"><div className="map-list-heading"><div><span className="map-eyebrow">KHÁM PHÁ KHU VỰC</span><h1>Phòng trên bản đồ</h1></div><span className="map-count">{totalRooms} phòng</span></div>
          <p>{hasRadius ? `Kết quả quanh ${locationLabel}` : 'Khám phá các phòng đã có vị trí trên RoomRum'}</p>
          {hasRadius && <div className="map-active-area"><div><MapPin size={16} aria-hidden="true" /><span>Bán kính <strong>{radius} km</strong></span><button type="button" onClick={clearCenter} aria-label="Xóa khu vực tìm kiếm" title="Xóa khu vực tìm kiếm"><X size={15} /></button></div><div className="map-radius-options" role="group" aria-label="Chọn bán kính tìm kiếm">{[2, 5, 10, 20].map(value => <button key={value} type="button" aria-pressed={radius === value} className={radius === value ? 'active' : ''} onClick={() => changeRadius(value)}>{value} km</button>)}</div></div>}
          {(unlocated > 0 || totalRooms > visibleRooms.length) && <p className="map-data-note">{unlocated > 0 && `${unlocated} phòng chưa có vị trí để ghim. `}{totalRooms > visibleRooms.length && `Đang hiển thị ${visibleRooms.length}/${totalRooms} phòng; tải thêm để xem các phòng còn lại.`}</p>}
        </div>
        <div className="map-list-scroll">{loading && !visibleRooms.length ? <Loading /> : error && !visibleRooms.length ? <ErrorState message={error} retry={reload} /> : !visibleRooms.length ? <State title="Khu vực này chưa có phòng" description={hasRadius ? 'Thử tăng bán kính phía trên hoặc chọn khu vực khác.' : 'Thử tìm khu vực khác hoặc điều chỉnh bộ lọc.'} /> : visibleRooms.map(room => {
          const hasPoint = !!validPoint(room.latitude, room.longitude)
          return <article className={`map-result${selectedId === room.roomId ? ' is-selected' : ''}`} key={room.roomId}>
            <div className="map-result-thumb">{room.imageUrl ? <img src={room.imageUrl} alt="" loading="lazy" /> : <Home size={28} aria-hidden="true" />}{room.type && <span>{room.type}</span>}</div>
            <div className="map-result-content"><strong>{room.title || 'Phòng chưa có tiêu đề'}</strong><span className="map-result-address"><MapPin size={14} aria-hidden="true" /> {room.address || 'Chưa có địa chỉ'}</span><div className="map-result-meta">{room.area != null && <span>{room.area.toLocaleString('vi-VN')} m²</span>}<span>{hasPoint ? room.distanceKm != null ? `${room.distanceKm.toLocaleString('vi-VN')} km từ tâm` : 'Có vị trí trên bản đồ' : 'Chưa có vị trí'}</span></div><div className="map-result-bottom"><span className="map-result-price">{shortMoney(room.price)} <small>/ tháng</small></span><div className="map-result-actions">{hasPoint && <button type="button" onClick={() => selectRoom(room as LocatedRoom)} aria-label={`Xem ${room.title || 'phòng'} trên bản đồ`}><MapPin size={16} /></button>}<Link to={`/rooms/${room.roomId}`} aria-label={`Xem chi tiết ${room.title || 'phòng'}`}><ArrowRight size={17} /></Link></div></div></div>
          </article>
        })}{visibleRooms.length < totalRooms && <button type="button" className="map-load-more" disabled={loading} onClick={() => setResultPage(page => page + 1)}>{loading ? 'Đang tải…' : `Tải thêm phòng (${visibleRooms.length}/${totalRooms})`}</button>}{error && visibleRooms.length > 0 && <ErrorState message={error} retry={reload} />}</div>
      </aside>
      <div className={view === 'map' ? 'map-canvas mobile-show' : 'map-canvas'}>
        <MapContainer center={vietNamCenter} zoom={6} scrollWheelZoom className={picking ? 'leaflet-map is-picking' : 'leaflet-map'} ref={mapRef} zoomControl={false}>
          <MapBasemap style={mapStyle} onFallback={fallbackMapStyle} />
          <ScaleControl position="bottomright" metric imperial={false} maxWidth={100} />
          <MapViewport center={searchCenter} rooms={located} selected={selectedPoint} mode={view} />
          <ReportZoom onZoom={setMapZoom} />
          <PickMapCenter enabled={picking} onPick={point => updateCenter(point, 'Điểm đã chọn trên bản đồ')} />
          {searchCenter && <>{hasRadius && <Circle center={searchCenter} radius={radius * 1000} pathOptions={{ color: '#2563ad', weight: 2, dashArray: '7 5', fillColor: '#3b82d8', fillOpacity: 0.09 }} />}<CircleMarker center={searchCenter} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563ad', fillOpacity: 1 }}><Popup>Tâm tìm kiếm: {locationLabel}</Popup></CircleMarker></>}
          {roomClusters.map(group => <Marker key={`cluster-${group.key}-${group.rooms.length}`} position={[group.latitude, group.longitude]} icon={L.divIcon({ className: 'room-cluster-icon', html: `<span>${group.rooms.length} phòng</span>`, iconSize: [72, 44], iconAnchor: [36, 22] })} title={`${group.rooms.length} phòng gần nhau`} eventHandlers={{ click: event => {
            const bounds = L.latLngBounds(group.rooms.map(room => [room.latitude, room.longitude] as Point))
            const zoomLimit = mapRef.current ? Math.min(mapRef.current.getMaxZoom(), 18) : 18
            if (mapRef.current && mapZoom < zoomLimit && bounds.isValid() && !bounds.getNorthEast().equals(bounds.getSouthWest())) {
              event.target.closePopup()
              mapRef.current.fitBounds(bounds, { padding: [55, 55], maxZoom: zoomLimit })
            }
          } }}><Popup className="room-cluster-popup"><strong>{group.rooms.length} phòng gần nhau</strong><div>{group.rooms.slice(0, 8).map(room => <Link key={room.roomId} to={`/rooms/${room.roomId}`}>{room.title || 'Phòng trọ'} <span>{shortMoney(room.price)}</span></Link>)}</div>{group.rooms.length > 8 && <button type="button" onClick={() => setView('list')}>Xem tất cả trong danh sách</button>}</Popup></Marker>)}
          {individualRooms.map(room => <Marker key={room.roomId} position={[room.latitude, room.longitude]} icon={priceMarker(room, selectedId === room.roomId)} title={`${room.title || 'Phòng trọ'} — ${shortMoney(room.price)}`} ref={instance => { markers.current[room.roomId] = instance }} eventHandlers={{ click: () => setSelectedId(room.roomId) }}><Popup className="room-map-popup" autoPanPaddingTopLeft={[20, 72]} autoPanPaddingBottomRight={[20, 110]}><div className="map-popup"><div className="map-popup-image">{room.imageUrl ? <img src={room.imageUrl} alt="" /> : <Home size={32} aria-hidden="true" />}</div><div className="map-popup-body"><span className="map-popup-meta">{[room.type, room.area != null ? `${room.area.toLocaleString('vi-VN')} m²` : null].filter(Boolean).join(' · ') || 'Phòng trọ'}</span><strong>{room.title || 'Phòng trọ'}</strong><span className="map-popup-address"><MapPin size={14} aria-hidden="true" />{room.address || 'Chưa có địa chỉ'}</span>{selectedDetail?.roomId === room.roomId && <>{selectedDetail.description && <p className="map-popup-description">{selectedDetail.description}</p>}{selectedDetail.amenities.length > 0 && <div className="map-popup-amenities">{selectedDetail.amenities.slice(0, 3).map(amenity => <span key={amenity.amenityId}>{amenity.amenityName}</span>)}{selectedDetail.amenities.length > 3 && <span>+{selectedDetail.amenities.length - 3}</span>}</div>}</>}<div className="map-popup-bottom"><b>{shortMoney(room.price)} <small>/ tháng</small></b><Link to={`/rooms/${room.roomId}`}>Chi tiết <ArrowRight size={15} aria-hidden="true" /></Link></div></div></div></Popup></Marker>)}
        </MapContainer>
        <div className="map-maphead"><span className="map-live-dot" /><strong>{loading && !visibleRooms.length ? 'Đang tải phòng…' : `${located.length} vị trí phòng`}</strong><span>{hasRadius ? `trong ${radius} km quanh ${locationLabel}` : 'trên bản đồ'}</span></div>
        {error && !visibleRooms.length && <div className="map-canvas-error" role="alert">Không tải được phòng. <button type="button" onClick={reload}>Thử lại</button></div>}
        <div className="map-controls"><button type="button" aria-label="Tìm khu vực đang xem" title="Tìm khu vực đang xem" onClick={searchViewport}><Search size={17} aria-hidden="true" /><span>Tìm khu vực đang xem</span></button><button type="button" aria-label={picking ? 'Đang chọn tâm tìm kiếm' : 'Chọn tâm tìm kiếm'} title={picking ? 'Nhấn vào bản đồ để chọn tâm' : 'Chọn tâm tìm kiếm'} aria-pressed={picking} className={picking ? 'active' : ''} onClick={() => setPicking(value => !value)}><Crosshair size={17} aria-hidden="true" /><span>{picking ? 'Nhấn vào bản đồ…' : 'Chọn tâm tìm kiếm'}</span></button><button type="button" aria-label="Xem tất cả phòng" title="Xem tất cả phòng" onClick={showAllMarkers}><RotateCcw size={17} aria-hidden="true" /><span>Xem tất cả phòng</span></button></div>
        <div className="map-zoom" aria-label="Thu phóng bản đồ"><button type="button" aria-label="Phóng to bản đồ" onClick={() => mapRef.current?.zoomIn()}>+</button><button type="button" aria-label="Thu nhỏ bản đồ" onClick={() => mapRef.current?.zoomOut()}>−</button></div>
        <div className="map-style-picker" role="group" aria-label="Kiểu bản đồ"><span className="map-style-title"><Layers3 size={15} aria-hidden="true" /> Lớp bản đồ</span><div>{mapStyles.map(style => <button key={style.id} type="button" className={`map-style-option map-style-${style.id}${mapStyle === style.id ? ' active' : ''}`} aria-pressed={mapStyle === style.id} title={style.description} onClick={() => chooseMapStyle(style.id)}><span aria-hidden="true" />{style.label}</button>)}</div></div>
        <div className="map-legend"><span className="map-legend-marker" /><span>Giá thuê theo tháng</span><span className="map-legend-separator" /><span>Nhấn marker để xem phòng</span></div>
        {picking && <div className="map-pick-hint" role="status"><Crosshair size={16} /> Chạm vào bản đồ để chọn tâm tìm kiếm</div>}
      </div>
    </div>
    <div className="map-mobile-toggle"><button type="button" onClick={() => setView(value => value === 'map' ? 'list' : 'map')}>{view === 'map' ? <><List size={18} /> Xem {totalRooms} phòng</> : <><MapPin size={18} /> Xem bản đồ</>}</button></div>
  </main></>
}
