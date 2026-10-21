import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Home, MapPin, Plus, Search } from 'lucide-react'
import { MapContainer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { api, json } from '../../shared/api/client'
import { OpenFreeMapLayer } from '../maps/OpenFreeMapLayer'
import { parseMapPoint } from '../maps/mapCoordinates'
import { ErrorState, Loading, State, money, useResource } from '../../shared/ui'
import type { Amenity, OwnedRoom } from '../../shared/types'
import { Status, Heading, Feedback } from './shared'

type RoomForm = { title: string; type: string; address: string; latitude: string; longitude: string; area: string; price: string; deposit: string; electricityFee: string; waterFee: string; serviceFee: string; description: string; rule: string; status: string; imageUrls: string; amenityIds: string[] }
type AddressSuggestion = { displayName: string; latitude: number; longitude: number; isApproximate: boolean }
type PendingPhoto = { id: string; file: File; previewUrl: string }
const roomImagePath = /^\/api\/rooms\/[0-9a-f-]{36}\/images\/[0-9a-f-]{36}\/content$/i
const blankRoom = (): RoomForm => ({ title: '', type: 'Phòng trọ', address: '', latitude: '', longitude: '', area: '', price: '', deposit: '', electricityFee: '', waterFee: '', serviceFee: '', description: '', rule: '', status: 'Draft', imageUrls: '', amenityIds: [] })
const fromRoom = (room: OwnedRoom): RoomForm => ({ title: room.title || '', type: room.type || '', address: room.address || '', latitude: String(room.latitude ?? ''), longitude: String(room.longitude ?? ''), area: String(room.area ?? ''), price: String(room.price ?? ''), deposit: String(room.deposit ?? ''), electricityFee: String(room.electricityFee ?? ''), waterFee: String(room.waterFee ?? ''), serviceFee: String(room.serviceFee ?? ''), description: room.description || '', rule: room.rule || '', status: room.status || 'Draft', imageUrls: room.images.map(image => image.imageUrl).filter(Boolean).join('\n'), amenityIds: room.amenities.map(item => item.amenityId) })
const numberOrNull = (value: string) => value.trim() ? Number(value) : null

function RoomMapCenter({ point }: { point: [number, number] | null }) {
  const map = useMap()
  useEffect(() => { if (point) map.setView(point, 14) }, [map, point])
  return null
}
function RoomMapClick({ onPick }: { onPick: (latitude: number, longitude: number) => void }) {
  useMapEvents({ click: event => onPick(event.latlng.lat, event.latlng.lng) })
  return null
}
const selectedRoomIcon = L.divIcon({
  className: 'room-selected-marker',
  html: '<span aria-hidden="true"></span>',
  iconSize: [36, 44],
  iconAnchor: [18, 44],
  popupAnchor: [0, -38],
})
function RoomSelectedMarker({ point, address }: { point: [number, number]; address: string }) {
  const marker = useRef<L.Marker>(null)
  useEffect(() => { marker.current?.openPopup() }, [point[0], point[1]])
  return <Marker position={point} icon={selectedRoomIcon} ref={marker}><Popup>{address || 'Đã chọn vị trí phòng tại đây'}</Popup></Marker>
}

export function LandlordRooms() {
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const rooms = useResource<OwnedRoom[]>(`/rooms/mine?page=${page}&pageSize=100`)
  const amenities = useResource<Amenity[]>('/rooms/amenities?page=1&pageSize=100')
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<RoomForm>(blankRoom)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const [locationStatus, setLocationStatus] = useState('')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(0)
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const previewUrls = useRef<Set<string>>(new Set())
  const locationRequest = useRef(0)
  useEffect(() => () => { previewUrls.current.forEach(url => URL.revokeObjectURL(url)) }, [])
  const showForm = params.get('new') === '1' || editing !== null
  const selectedPoint = useMemo(() => parseMapPoint(form.latitude, form.longitude), [form.latitude, form.longitude])
  const visible = useMemo(() => (rooms.data || []).filter(room => (filter === 'All' || room.status === filter) && (!search || `${room.title} ${room.address}`.toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN')))), [rooms.data, filter, search])
  const set = (key: keyof RoomForm, value: string) => setForm(previous => ({ ...previous, [key]: value }))
  const setAddress = (address: string) => {
    locationRequest.current++
    setLocationStatus('')
    setSuggestions([])
    setSuggesting(false)
    setActiveSuggestion(0)
    setForm(previous => ({ ...previous, address, latitude: '', longitude: '' }))
  }
  const chooseSuggestion = (place: AddressSuggestion) => {
    locationRequest.current++
    setSuggestions([])
    setSuggesting(false)
    setForm(previous => ({ ...previous, address: place.displayName,
      latitude: String(place.latitude), longitude: String(place.longitude) }))
    setLocationStatus(`${place.isApproximate ? 'Đã chọn vị trí gần đúng' : 'Đã chọn địa chỉ'}: ${place.displayName}. Kiểm tra ghim và nhấn bản đồ để chỉnh nếu cần.`)
  }
  useEffect(() => {
    const address = form.address.trim()
    if (!showForm || address.length < 3 || form.latitude || form.longitude) return
    const requestId = ++locationRequest.current
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSuggesting(true)
      setLocationStatus('Đang tìm địa chỉ liên quan…')
      try {
        const places = await api<AddressSuggestion[]>(`/locations/suggest?q=${encodeURIComponent(address)}`, { signal: controller.signal })
        if (requestId !== locationRequest.current) return
        setSuggestions(places)
        setActiveSuggestion(0)
        setLocationStatus(places.length
          ? 'Chọn đúng địa chỉ trong danh sách hoặc đặt ghim trên bản đồ. RoomRum sẽ không tự đoán vị trí phòng.'
          : 'Không tìm thấy gợi ý. Hãy nhập địa chỉ cụ thể hơn hoặc chọn ghim trên bản đồ.')
      } catch (cause) {
        if (requestId === locationRequest.current && !controller.signal.aborted)
          setLocationStatus(`Chưa tải được gợi ý: ${(cause as Error).message} Bạn có thể chọn ghim trực tiếp trên bản đồ.`)
      } finally {
        if (requestId === locationRequest.current && !controller.signal.aborted) setSuggesting(false)
      }
    }, 600)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [form.address, form.latitude, form.longitude, showForm])
  const clearPendingPhotos = () => {
    previewUrls.current.forEach(url => URL.revokeObjectURL(url))
    previewUrls.current.clear()
    setPendingPhotos([])
  }
  const addPhotos = (files: FileList | null) => {
    if (!files?.length) return
    const chosen = Array.from(files)
    if (form.imageUrls.split('\n').filter(value => value.trim()).length + pendingPhotos.length + chosen.length > 20) {
      setProblem('Mỗi phòng được tối đa 20 ảnh.'); return
    }
    if (chosen.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024)) {
      setProblem('Chỉ chọn ảnh JPEG, PNG hoặc WebP, tối đa 5 MB mỗi ảnh.'); return
    }
    const added = chosen.map(file => {
      const previewUrl = URL.createObjectURL(file)
      previewUrls.current.add(previewUrl)
      return { id: crypto.randomUUID(), file, previewUrl }
    })
    setPendingPhotos(previous => [...previous, ...added])
    setProblem('')
  }
  const removePhoto = (id: string) => setPendingPhotos(previous => previous.filter(photo => {
    if (photo.id !== id) return true
    URL.revokeObjectURL(photo.previewUrl)
    previewUrls.current.delete(photo.previewUrl)
    return false
  }))
  const openCreate = () => { locationRequest.current++; clearPendingPhotos(); setSuggestions([]); setSuggesting(false); setLocationStatus(''); setEditing(null); setForm(blankRoom()); setProblem(''); setNotice(''); setParams({ new: '1' }) }
  const openEdit = (room: OwnedRoom) => { locationRequest.current++; clearPendingPhotos(); setSuggestions([]); setSuggesting(false); setLocationStatus(''); setEditing(room.roomId); setForm(fromRoom(room)); setProblem(''); setNotice(''); setParams({}) }
  const close = () => { locationRequest.current++; clearPendingPhotos(); setSuggestions([]); setSuggesting(false); setEditing(null); setParams({}); setProblem('') }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setProblem('')
    const imageUrls = form.imageUrls.split('\n').map(value => value.trim()).filter(Boolean)
    if (form.status === 'Available' && (!form.address.trim() || !form.price.trim())) { setProblem('Phòng đang đăng cần có địa chỉ và giá thuê.'); return }
    if (Boolean(form.latitude) !== Boolean(form.longitude)) { setProblem('Hãy chọn đủ vĩ độ và kinh độ của phòng.'); return }
    if (imageUrls.some(value => { if (roomImagePath.test(value)) return false; try { return !['http:', 'https:'].includes(new URL(value).protocol) } catch { return true } })) { setProblem('URL ảnh phải bắt đầu bằng http:// hoặc https://, hoặc là ảnh đã tải lên từ RoomRum.'); return }
    if (imageUrls.length + pendingPhotos.length > 20) { setProblem('Mỗi phòng được tối đa 20 ảnh.'); return }
    setBusy(true)
    let roomSaved = false
    try {
      const body = { ...form, title: form.title.trim(), type: form.type.trim() || null, address: form.address.trim() || null, latitude: numberOrNull(form.latitude), longitude: numberOrNull(form.longitude), clearCoordinates: !!editing && !form.latitude && !form.longitude, area: numberOrNull(form.area), price: numberOrNull(form.price), deposit: numberOrNull(form.deposit), electricityFee: numberOrNull(form.electricityFee), waterFee: numberOrNull(form.waterFee), serviceFee: numberOrNull(form.serviceFee), amenityIds: form.amenityIds, imageUrls }
      const saved = await api<{ roomId: string }>(editing ? `/rooms/${editing}` : '/rooms', json(editing ? 'PUT' : 'POST', body))
      roomSaved = true
      if (pendingPhotos.length && !editing) { setEditing(saved.roomId); setParams({}) }
      for (const photo of pendingPhotos) {
        const payload = new FormData()
        payload.append('file', photo.file)
        const uploaded = await api<{ imageUrl: string }>(`/rooms/${saved.roomId}/images`, { method: 'POST', body: payload })
        setForm(previous => ({ ...previous, imageUrls: [previous.imageUrls.trim(), uploaded.imageUrl].filter(Boolean).join('\n') }))
        URL.revokeObjectURL(photo.previewUrl)
        previewUrls.current.delete(photo.previewUrl)
        setPendingPhotos(previous => previous.filter(item => item.id !== photo.id))
      }
      setNotice(editing ? 'Đã lưu thông tin phòng.' : form.status === 'Draft' ? 'Đã lưu bản nháp phòng.' : 'Đã đăng phòng.')
      close(); rooms.reload()
    } catch (cause) {
      setProblem(roomSaved ? `Bài đăng đã lưu nhưng chưa tải hết ảnh: ${(cause as Error).message}. Hãy thử lưu lại để tải các ảnh còn lại.` : (cause as Error).message)
      if (roomSaved) rooms.reload()
    } finally { setBusy(false) }
  }
  const hide = async (room: OwnedRoom) => { if (!window.confirm(`Ẩn phòng “${room.title || 'Phòng trọ'}”?`)) return; try { await api(`/rooms/${room.roomId}`, { method: 'DELETE' }); setNotice('Đã ẩn phòng. Bạn có thể mở lại bằng cách chỉnh sửa trạng thái.'); rooms.reload() } catch (cause) { setProblem((cause as Error).message) } }
  const addressInput = <div className="span-two address-autocomplete">
    <label htmlFor="room-address">Địa chỉ</label>
    <input id="room-address" value={form.address} onChange={e => setAddress(e.target.value)}
      placeholder="Số nhà, đường, phường/xã, tỉnh/thành" autoComplete="off"
      role="combobox" aria-autocomplete="list" aria-expanded={suggestions.length > 0}
      aria-controls="room-address-suggestions"
      aria-activedescendant={suggestions.length ? `room-address-option-${activeSuggestion}` : undefined}
      onKeyDown={event => {
        if (event.key === 'Escape') { setSuggestions([]); return }
        if (!suggestions.length) return
        if (event.key === 'ArrowDown') { event.preventDefault(); setActiveSuggestion(index => (index + 1) % suggestions.length) }
        if (event.key === 'ArrowUp') { event.preventDefault(); setActiveSuggestion(index => (index - 1 + suggestions.length) % suggestions.length) }
        if (event.key === 'Enter') { event.preventDefault(); chooseSuggestion(suggestions[activeSuggestion]) }
      }} />
    {suggesting && <small className="address-suggesting" role="status">Đang tìm địa chỉ…</small>}
    {suggestions.length > 0 && <div id="room-address-suggestions" className="address-suggestions" role="listbox" aria-label="Địa chỉ gợi ý">
      {suggestions.map((place, index) => <button id={`room-address-option-${index}`}
        className={index === activeSuggestion ? 'active' : ''} role="option" aria-selected={index === activeSuggestion}
        type="button" key={`${place.displayName}-${place.latitude}-${place.longitude}`}
        onMouseEnter={() => setActiveSuggestion(index)} onClick={() => chooseSuggestion(place)}>
        <MapPin size={16} /><span>{place.displayName}{place.isApproximate && <small>Vị trí gần đúng</small>}</span>
      </button>)}
    </div>}
  </div>
  return <div className="landlord-rooms"><Heading title="Quản lý phòng trọ" description="Đăng phòng, cập nhật giá và kiểm soát trạng thái trong một nơi." action={<button className="button button-primary" onClick={openCreate}><Plus size={17} /> Đăng phòng mới</button>} />
    <Feedback message={notice} /><Feedback message={problem} error />
    {showForm && <form className="panel landlord-room-form" onSubmit={submit}><div className="landlord-section-head"><div><span className="section-label">{editing ? 'CẬP NHẬT PHÒNG' : 'PHÒNG MỚI'}</span><h2>{editing ? 'Chỉnh sửa thông tin phòng' : 'Tạo phòng cho thuê'}</h2></div><button className="button button-ghost small" type="button" onClick={close}>Đóng</button></div><p className="landlord-note">Lưu bản nháp để hoàn thiện sau; chọn Còn trống khi đã sẵn sàng hiển thị công khai.</p>
      <div className="landlord-form-section"><h3>Thông tin cơ bản</h3><div className="form-grid"><label className="span-two">Tên phòng *<input required maxLength={255} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ví dụ: Phòng trọ gần trường đại học" /></label><label>Loại phòng<input maxLength={50} value={form.type} onChange={e => set('type', e.target.value)} /></label><label>Trạng thái<select value={form.status} onChange={e => set('status', e.target.value)}><option value="Draft">Bản nháp</option><option value="Available">Còn trống</option><option value="Rented">Đã thuê</option><option value="Hidden">Đã ẩn</option></select></label>{addressInput}<label>Diện tích (m²)<input type="number" min="0" max="99999999.99" step="0.01" value={form.area} onChange={e => set('area', e.target.value)} /></label><label>Giá thuê mỗi tháng (₫)<input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} /></label></div></div>
      <div className="landlord-form-section"><h3>Vị trí phòng trên bản đồ</h3><p className="landlord-note">Nhập địa chỉ, chọn đúng gợi ý và kiểm tra ghim. Bạn cũng có thể nhấn bản đồ để đặt vị trí chính xác.</p><div className="location-picker landlord-location-picker"><MapContainer center={[10.8, 106.7]} zoom={11} scrollWheelZoom={false} className="location-picker-map"><OpenFreeMapLayer onFallback={() => setLocationStatus('Lớp bản đồ chi tiết không tải được; đã chuyển sang bản đồ cơ bản. Bạn vẫn có thể chọn ghim.')} /><RoomMapCenter point={selectedPoint} /><RoomMapClick onPick={(latitude, longitude) => { locationRequest.current++; setLocationStatus('Đã chọn ghim thủ công.'); setForm(previous => ({ ...previous, latitude: latitude.toFixed(6), longitude: longitude.toFixed(6) })) }} />{selectedPoint && <RoomSelectedMarker point={selectedPoint} address={form.address} />}</MapContainer></div><div className="landlord-location-status"><span>{selectedPoint ? `Đã chọn: ${selectedPoint[0].toFixed(5)}, ${selectedPoint[1].toFixed(5)}` : 'Chưa chọn vị trí'}</span>{selectedPoint && <button type="button" className="button button-ghost small" onClick={() => { locationRequest.current++; setLocationStatus(''); setForm(previous => ({ ...previous, latitude: '', longitude: '' })) }}>Xóa vị trí</button>}</div>{locationStatus && <p className="landlord-note" role="status">{locationStatus}</p>}</div>
      <div className="landlord-form-section"><h3>Chi phí và mô tả</h3><div className="form-grid"><label>Tiền cọc (₫)<input type="number" min="0" step="0.01" value={form.deposit} onChange={e => set('deposit', e.target.value)} /></label><label>Tiền điện (₫)<input type="number" min="0" step="0.01" value={form.electricityFee} onChange={e => set('electricityFee', e.target.value)} /></label><label>Tiền nước (₫)<input type="number" min="0" step="0.01" value={form.waterFee} onChange={e => set('waterFee', e.target.value)} /></label><label>Phí dịch vụ (₫)<input type="number" min="0" step="0.01" value={form.serviceFee} onChange={e => set('serviceFee', e.target.value)} /></label><label className="span-two">Mô tả<textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)} /></label><label className="span-two">Nội quy<textarea rows={3} value={form.rule} onChange={e => set('rule', e.target.value)} /></label></div></div>
      <div className="landlord-form-section"><h3>Tiện nghi và hình ảnh</h3>{amenities.loading ? <Loading /> : amenities.error ? <ErrorState message={amenities.error} retry={amenities.reload} /> : amenities.data?.length ? <div className="landlord-amenities">{amenities.data.map(item => <label key={item.amenityId}><input type="checkbox" checked={form.amenityIds.includes(item.amenityId)} onChange={e => setForm(previous => ({ ...previous, amenityIds: e.target.checked ? [...previous.amenityIds, item.amenityId] : previous.amenityIds.filter(id => id !== item.amenityId) }))} /> {item.amenityName}</label>)}</div> : <p className="landlord-note">Chưa có danh mục tiện nghi.</p>}<label className="landlord-image-label">Chọn ảnh từ thiết bị (JPEG, PNG, WebP; tối đa 5 MB/ảnh)<input className="landlord-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => { addPhotos(e.target.files); e.target.value = '' }} /></label>
      {pendingPhotos.length > 0 && <div className="landlord-photo-previews" aria-label="Ảnh sẽ tải lên khi lưu phòng">{pendingPhotos.map(photo => <div className="landlord-photo-preview" key={photo.id}><img src={photo.previewUrl} alt={photo.file.name} /><span title={photo.file.name}>{photo.file.name}</span><button type="button" onClick={() => removePhoto(photo.id)} aria-label={`Bỏ ảnh ${photo.file.name}`}>Bỏ ảnh</button></div>)}</div>}
      <label className="landlord-image-label">URL ảnh, mỗi dòng một ảnh<textarea rows={4} value={form.imageUrls} onChange={e => set('imageUrls', e.target.value)} placeholder="https://example.com/anh-phong.jpg" /></label><p className="landlord-note">Ảnh và tiện nghi hiện có được giữ nguyên khi mở form chỉnh sửa.</p></div>
      <div className="landlord-form-actions"><button className="button button-secondary" type="button" onClick={close}>Hủy</button><button className="button button-primary" type="submit" disabled={busy || amenities.loading || !!amenities.error}>{busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : form.status === 'Draft' ? 'Lưu bản nháp' : 'Đăng phòng'}</button></div></form>}
    <div className="landlord-list-bar"><div className="landlord-tabs" role="group" aria-label="Lọc trạng thái phòng">{[['All', 'Tất cả'], ['Available', 'Còn trống'], ['Rented', 'Đã thuê'], ['Draft', 'Bản nháp'], ['Hidden', 'Đã ẩn']].map(([value, title]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{title}</button>)}</div><label className="landlord-search"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên hoặc địa chỉ" aria-label="Tìm phòng của bạn" /></label></div>
    {rooms.loading ? <Loading /> : rooms.error ? <ErrorState message={rooms.error} retry={rooms.reload} /> : visible.length ? <div className="landlord-room-list">{visible.map(room => <article className="panel landlord-room-card" key={room.roomId}><div className="landlord-room-image">{room.images[0]?.imageUrl ? <img src={room.images[0].imageUrl} alt={room.title || 'Ảnh phòng'} /> : <Home size={29} />}</div><div className="landlord-room-info"><div className="landlord-room-title"><h2>{room.title || 'Phòng chưa có tiêu đề'}</h2><Status value={room.status} /></div><p><MapPin size={15} />{room.address || 'Chưa có địa chỉ'}</p><div className="landlord-room-meta"><strong>{money(room.price)} <small>/ tháng</small></strong><span>{room.area === null ? 'Chưa có diện tích' : `${room.area} m²`}</span><span>{room.amenities.length} tiện nghi</span><span>{room.images.length} ảnh</span></div><div className="landlord-room-actions"><button className="button button-secondary small" onClick={() => openEdit(room)}>Chỉnh sửa</button>{room.status === 'Available' && <Link className="button button-ghost small" to={`/rooms/${room.roomId}`}>Xem trang phòng</Link>}{room.status !== 'Hidden' && <button className="button button-ghost small" onClick={() => hide(room)}>Ẩn phòng</button>}</div></div></article>)}</div> : <State title={rooms.data?.length ? 'Không có phòng phù hợp bộ lọc' : 'Bạn chưa đăng phòng nào'} description={rooms.data?.length ? 'Thử chọn trạng thái hoặc từ khóa khác.' : 'Tạo bản nháp phòng đầu tiên để bắt đầu.'} action={!rooms.data?.length && <button className="button button-primary small" onClick={openCreate}>Tạo phòng</button>} />}
    <div className="landlord-paging"><span>Trang {page}{rooms.data?.length === 100 ? ' · còn có thể có phòng ở trang sau' : ''}</span><div><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>Trước</button><button disabled={!rooms.data || rooms.data.length < 100} onClick={() => setPage(value => value + 1)}>Sau</button></div></div>
  </div>
}
