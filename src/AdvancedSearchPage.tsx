import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { ChevronLeft, ChevronRight, Compass, MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { api } from './api'
import { mapTileUrl } from './mapConfig'
import { ErrorState, Footer, Header, Loading, RoomCard, State, money, useAuth, useResource } from './ui'
import type { Amenity, RoomSearch } from './types'

type Filters = {
  q: string; type: string; minPrice: string; maxPrice: string; minArea: string; maxArea: string
  maxDeposit: string; maxMoveInCost: string; maxMonthlyCost: string; occupants: string
  monthlyKwh: string; amenityIds: string[]; locationLabel: string
  latitude: string; longitude: string; maxDistanceKm: string; sort: string
}

function readFilters(params: URLSearchParams): Filters {
  return {
    q: params.get('q') || '', type: params.get('type') || '',
    minPrice: params.get('minPrice') || '', maxPrice: params.get('maxPrice') || '',
    minArea: params.get('minArea') || '', maxArea: params.get('maxArea') || '',
    maxDeposit: params.get('maxDeposit') || '', maxMoveInCost: params.get('maxMoveInCost') || '',
    maxMonthlyCost: params.get('maxMonthlyCost') || '', occupants: params.get('occupants') || '1',
    monthlyKwh: params.get('monthlyKwh') || '100', amenityIds: params.getAll('amenityIds'),
    locationLabel: params.get('locationLabel') || '', latitude: params.get('latitude') || '',
    longitude: params.get('longitude') || '', maxDistanceKm: params.get('maxDistanceKm') || '',
    sort: params.get('sort') || 'relevance',
  }
}

function buildParams(filters: Filters, page = 1): URLSearchParams {
  const params = new URLSearchParams()
  const keys: (keyof Filters)[] = [
    'q', 'type', 'minPrice', 'maxPrice', 'minArea', 'maxArea', 'maxDeposit',
    'maxMoveInCost', 'maxMonthlyCost', 'latitude', 'longitude', 'maxDistanceKm', 'sort',
  ]
  for (const key of keys) {
    const value = filters[key]
    if (typeof value === 'string' && value.trim() && !(key === 'sort' && value === 'relevance'))
      params.set(key, value.trim())
  }
  if (filters.maxMonthlyCost || filters.sort === 'monthlyCostAsc') {
    params.set('occupants', filters.occupants || '1')
    params.set('monthlyKwh', filters.monthlyKwh || '100')
  }
  if (filters.latitude && filters.longitude && filters.locationLabel)
    params.set('locationLabel', filters.locationLabel)
  for (const id of filters.amenityIds) params.append('amenityIds', id)
  params.set('page', String(page))
  return params
}

function MapCenter({ point }: { point: [number, number] | null }) {
  const map = useMap()
  useEffect(() => { if (point) map.setView(point, Math.max(map.getZoom(), 13)) }, [map, point])
  return null
}

function MapSelection({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: event => onPick(event.latlng.lat, event.latlng.lng) })
  return null
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const serializedParams = params.toString()
  const [draft, setDraft] = useState<Filters>(() => readFilters(params))
  const [notice, setNotice] = useState('')
  const [locating, setLocating] = useState(false)
  const { session } = useAuth()
  const { data: amenities } = useResource<Amenity[]>('/rooms/amenities?page=1&pageSize=100')
  useEffect(() => setDraft(readFilters(new URLSearchParams(serializedParams))), [serializedParams])

  const page = Math.max(1, Number(params.get('page') || 1) || 1)
  const apiParams = new URLSearchParams(params)
  apiParams.delete('locationLabel')
  apiParams.set('page', String(page))
  apiParams.set('pageSize', '12')
  const { data, loading, error, reload } = useResource<RoomSearch>(`/rooms?${apiParams}`)
  const point = useMemo<[number, number] | null>(() => {
    const lat = Number(draft.latitude); const lon = Number(draft.longitude)
    return draft.latitude && draft.longitude && Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null
  }, [draft.latitude, draft.longitude])

  const update = (key: keyof Filters, value: string) => setDraft(previous => key === 'locationLabel'
    ? { ...previous, locationLabel: value, latitude: '', longitude: '' }
    : { ...previous, [key]: value })
  const pickLocation = (lat: number, lon: number, label = 'Điểm đã chọn trên bản đồ') => {
    setDraft(previous => ({ ...previous, latitude: lat.toFixed(6), longitude: lon.toFixed(6),
      locationLabel: label }))
    setNotice('Đã chọn tâm tìm kiếm. Bấm “Áp dụng bộ lọc” để xem kết quả.')
  }
  const findLocation = async () => {
    const place = draft.locationLabel.trim()
    if (!place) { setNotice('Nhập địa điểm trước khi tra vị trí.'); return }
    setLocating(true); setNotice('')
    try {
      const result = await api<{ latitude: number; longitude: number }>(`/locations/search?q=${encodeURIComponent(place)}`)
      pickLocation(result.latitude, result.longitude, place)
    } catch (cause) { setNotice((cause as Error).message) } finally { setLocating(false) }
  }
  const apply = (event: FormEvent) => {
    event.preventDefault()
    const pairs: [string, string, string][] = [
      ['minPrice', 'maxPrice', 'giá'], ['minArea', 'maxArea', 'diện tích'],
    ]
    for (const [low, high, label] of pairs) {
      const minimum = draft[low as keyof Filters] as string
      const maximum = draft[high as keyof Filters] as string
      if (minimum && maximum && Number(minimum) > Number(maximum)) {
        setNotice(`Giá trị từ của ${label} phải nhỏ hơn hoặc bằng giá trị đến.`); return
      }
    }
    if ((draft.maxDistanceKm || draft.sort === 'distance') && !point) {
      setNotice('Chọn tâm tìm kiếm trên bản đồ trước khi lọc hoặc sắp xếp theo khoảng cách.'); return
    }
    setNotice(''); setParams(buildParams(draft))
  }
  const changeSort = (value: string) => setParams(buildParams({ ...readFilters(params), sort: value }))
  const changePage = (nextPage: number) => setParams(buildParams(readFilters(params), nextPage))
  const favorite = async (id: string) => {
    if (!session) { setNotice('Hãy đăng nhập để lưu phòng yêu thích.'); return }
    try { await api(`/favorites/${id}`, { method: 'POST' }); setNotice('Đã lưu phòng vào danh sách yêu thích.') }
    catch (cause) { setNotice((cause as Error).message) }
  }

  return <><Header /><main className="search-page"><div className="container">
    <div className="page-title"><span className="section-label">TÌM PHÒNG NÂNG CAO</span><h1>Tìm nơi ở vừa nhu cầu, vừa ngân sách</h1><p>Kết hợp giá, chi phí sinh hoạt, tiện ích và khoảng cách trong cùng một lần tìm.</p></div>
    <div className="search-layout advanced-search-layout"><aside className="filter-panel advanced-filter-panel">
      <div className="filter-title"><SlidersHorizontal size={20} /><h2>Bộ lọc chi tiết</h2></div>
      <form onSubmit={apply} className="form-stack advanced-filter-form">
        <fieldset><legend>Phòng bạn cần</legend>
          <label>Từ khóa<input value={draft.q} onChange={e => update('q', e.target.value)} placeholder="Tên phòng, đường, khu vực…" /></label>
          <label>Loại phòng<select value={draft.type} onChange={e => update('type', e.target.value)}><option value="">Tất cả</option><option>Phòng trọ</option><option>Studio</option><option>Căn hộ mini</option><option>Ở ghép</option></select></label>
          <div className="form-pair"><label>Giá từ (₫)<input type="number" min="0" value={draft.minPrice} onChange={e => update('minPrice', e.target.value)} placeholder="0" /></label><label>Giá đến (₫)<input type="number" min="0" value={draft.maxPrice} onChange={e => update('maxPrice', e.target.value)} placeholder="Không giới hạn" /></label></div>
          <div className="form-pair"><label>Diện tích từ (m²)<input type="number" min="0" step="0.01" value={draft.minArea} onChange={e => update('minArea', e.target.value)} /></label><label>Diện tích đến (m²)<input type="number" min="0" step="0.01" value={draft.maxArea} onChange={e => update('maxArea', e.target.value)} /></label></div>
        </fieldset>
        <fieldset><legend>Ngân sách thực tế</legend>
          <label>Cọc tối đa (₫)<input type="number" min="0" value={draft.maxDeposit} onChange={e => update('maxDeposit', e.target.value)} placeholder="Không giới hạn" /></label>
          <label>Thuê + cọc lúc vào ở (₫)<input type="number" min="0" value={draft.maxMoveInCost} onChange={e => update('maxMoveInCost', e.target.value)} placeholder="Không giới hạn" /></label>
          <label>Chi phí tháng ước tính tối đa (₫)<input type="number" min="0" value={draft.maxMonthlyCost} onChange={e => update('maxMonthlyCost', e.target.value)} placeholder="Không giới hạn" /></label>
          <div className="form-pair"><label>Số người<input type="number" min="1" max="10" value={draft.occupants} onChange={e => update('occupants', e.target.value)} /></label><label>Điện dự kiến (kWh)<input type="number" min="0" max="2000" value={draft.monthlyKwh} onChange={e => update('monthlyKwh', e.target.value)} /></label></div>
          <p className="filter-explainer">Tạm tính = tiền thuê + phí dịch vụ + nước × số người + điện × kWh. Phòng thiếu mức phí sẽ không hiện khi lọc theo chi phí tháng.</p>
        </fieldset>
        <fieldset><legend>Tiện ích cần có</legend>
          <div className="amenity-checks">{amenities?.map(item => <label key={item.amenityId}><input type="checkbox" checked={draft.amenityIds.includes(item.amenityId)} onChange={e => setDraft(previous => ({ ...previous, amenityIds: e.target.checked ? [...previous.amenityIds, item.amenityId] : previous.amenityIds.filter(id => id !== item.amenityId) }))} />{item.amenityName}</label>) || <span>Đang tải tiện ích…</span>}</div>
          <p className="filter-explainer">Phòng cần có tất cả tiện ích đã chọn.</p>
        </fieldset>
        <fieldset><legend>Khoảng cách</legend>
          <label>Địa điểm làm tâm<input value={draft.locationLabel} onChange={e => update('locationLabel', e.target.value)} placeholder="Ví dụ: HUTECH Bình Thạnh" /></label>
          <button type="button" className="button button-secondary full" disabled={locating} onClick={findLocation}><Search size={16} />{locating ? 'Đang tra vị trí…' : 'Tìm vị trí'}</button>
          <div className="location-picker" aria-label="Chọn tâm tìm kiếm trên bản đồ"><MapContainer center={[10.8, 106.7]} zoom={11} scrollWheelZoom={false} className="location-picker-map"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url={mapTileUrl} /><MapCenter point={point} /><MapSelection onPick={pickLocation} />{point && <CircleMarker center={point} radius={9} pathOptions={{ color: '#1e63b4', fillColor: '#1e63b4', fillOpacity: 0.8 }} />}</MapContainer></div>
          <p className="filter-explainer">{point ? `Tâm đã chọn: ${point[0].toFixed(4)}, ${point[1].toFixed(4)}.` : 'Nhấn vào bản đồ để chọn tâm tìm kiếm.'} Khoảng cách là đường chim bay, chỉ tính cho phòng có vị trí.</p>
          <label>Bán kính<select value={draft.maxDistanceKm} onChange={e => update('maxDistanceKm', e.target.value)}><option value="">Không giới hạn</option><option value="1">1 km</option><option value="3">3 km</option><option value="5">5 km</option><option value="10">10 km</option><option value="20">20 km</option><option value="50">50 km</option></select></label>
        </fieldset>
        <button className="button button-primary full" type="submit"><Search size={17} /> Áp dụng bộ lọc</button>
        <button type="button" className="button button-ghost full" onClick={() => { setNotice(''); setParams({}) }}>Xóa bộ lọc</button>
      </form>
    </aside><section className="search-results"><div className="result-toolbar advanced-result-toolbar"><div><strong>{loading ? 'Đang tìm…' : `${data?.total ?? 0} phòng phù hợp`}</strong><span>{params.get('q') ? `Kết quả cho “${params.get('q')}”` : 'Tất cả khu vực'}</span></div><div className="result-toolbar-actions"><label>Sắp xếp<select aria-label="Sắp xếp kết quả" value={params.get('sort') || 'relevance'} onChange={e => changeSort(e.target.value)}><option value="relevance">Mặc định</option><option value="priceAsc">Giá thấp trước</option><option value="priceDesc">Giá cao trước</option><option value="areaDesc">Diện tích lớn trước</option><option value="monthlyCostAsc">Chi phí tháng thấp trước</option><option value="distance" disabled={!params.get('latitude')}>Gần tâm nhất</option></select></label><Link to={`/map?${params.toString()}`} className="button button-secondary small"><MapPin size={16} /> Bản đồ</Link></div></div>
      {notice && <div className="inline-notice" role="status">{notice}</div>}
      {loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} /> : data?.items.length ? <><div className="room-grid results-grid">{data.items.map(room => <div className="advanced-room-result" key={room.roomId}><RoomCard room={room} onFavorite={favorite} /><div className="advanced-room-metrics">{room.distanceKm != null && <span><Compass size={14} /> {room.distanceKm.toLocaleString('vi-VN')} km</span>}{room.estimatedMonthlyCost != null && <span>Ước tính {money(room.estimatedMonthlyCost)} / tháng</span>}</div></div>)}</div><div className="pagination"><button disabled={page <= 1} onClick={() => changePage(page - 1)}><ChevronLeft size={18} /> Trước</button><span>Trang {page} / {Math.max(1, Math.ceil(data.total / 12))}</span><button disabled={page * 12 >= data.total} onClick={() => changePage(page + 1)}>Tiếp <ChevronRight size={18} /></button></div></> : <State title="Không tìm thấy phòng phù hợp" description="Thử nới rộng khoảng giá, bán kính hoặc bỏ bớt tiện ích." action={<button className="button button-secondary" onClick={() => setParams({})}>Xóa bộ lọc</button>} />}
    </section></div></div></main><Footer /></>
}
