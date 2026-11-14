import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Home, MapPin, Plus, Search } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { ErrorState, Loading, State, money, useResource } from '../../shared/ui'
import type { Amenity, OwnedRoom } from '../../shared/types'
import { Status, Heading, Feedback } from './shared'

type RoomForm = { title: string; type: string; address: string; area: string; price: string; deposit: string; electricityFee: string; waterFee: string; serviceFee: string; description: string; rule: string; imageUrls: string; amenityIds: string[] }
type PendingPhoto = { id: string; file: File; previewUrl: string }
const roomImagePath = /^\/api\/rooms\/[0-9a-f-]{36}\/images\/[0-9a-f-]{36}\/content$/i
const blankRoom = (): RoomForm => ({ title: '', type: 'Phòng trọ', address: '', area: '', price: '', deposit: '', electricityFee: '', waterFee: '', serviceFee: '', description: '', rule: '', imageUrls: '', amenityIds: [] })
const numberOrNull = (value: string) => value.trim() ? Number(value) : null

export function LandlordRooms() {
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const rooms = useResource<OwnedRoom[]>(`/rooms/mine?page=${page}&pageSize=100`)
  const amenities = useResource<Amenity[]>('/rooms/amenities?page=1&pageSize=100')
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<RoomForm>(blankRoom)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const previewUrls = useRef<Set<string>>(new Set())
  useEffect(() => () => { previewUrls.current.forEach(url => URL.revokeObjectURL(url)) }, [])
  const showForm = params.get('new') === '1'
  const visible = useMemo(() => (rooms.data || []).filter(room => (filter === 'All' || room.status === filter) && (!search || `${room.title} ${room.address}`.toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN')))), [rooms.data, filter, search])
  const set = (key: keyof RoomForm, value: string) => setForm(previous => ({ ...previous, [key]: value }))
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
  const openCreate = () => { clearPendingPhotos(); setForm(blankRoom()); setProblem(''); setNotice(''); setParams({ new: '1' }) }
  const close = () => { clearPendingPhotos(); setParams({}); setProblem('') }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setProblem('')
    const imageUrls = form.imageUrls.split('\n').map(value => value.trim()).filter(Boolean)
    if (!form.address.trim() || !form.price.trim()) { setProblem('Phòng gửi duyệt cần có địa chỉ và giá thuê.'); return }
    if (imageUrls.some(value => { if (roomImagePath.test(value)) return false; try { return !['http:', 'https:'].includes(new URL(value).protocol) } catch { return true } })) { setProblem('URL ảnh phải bắt đầu bằng http:// hoặc https://, hoặc là ảnh đã tải lên từ RoomRum.'); return }
    if (imageUrls.length + pendingPhotos.length > 20) { setProblem('Mỗi phòng được tối đa 20 ảnh.'); return }
    setBusy(true)
    let roomSaved = false
    try {
      const body = { title: form.title.trim(), type: form.type.trim() || null, address: form.address.trim() || null,
        area: numberOrNull(form.area), price: numberOrNull(form.price), deposit: numberOrNull(form.deposit),
        electricityFee: numberOrNull(form.electricityFee), waterFee: numberOrNull(form.waterFee), serviceFee: numberOrNull(form.serviceFee),
        description: form.description, rule: form.rule, amenityIds: form.amenityIds, imageUrls }
      const saved = await api<{ roomId: string }>('/rooms', json('POST', body))
      roomSaved = true
      for (const photo of pendingPhotos) {
        const payload = new FormData()
        payload.append('file', photo.file)
        await api(`/rooms/${saved.roomId}/images`, { method: 'POST', body: payload })
        URL.revokeObjectURL(photo.previewUrl)
        previewUrls.current.delete(photo.previewUrl)
        setPendingPhotos(previous => previous.filter(item => item.id !== photo.id))
      }
      setNotice('Đã gửi phòng chờ quản trị viên duyệt.')
      close(); rooms.reload()
    } catch (cause) {
      if (roomSaved) {
        close(); rooms.reload()
        setProblem(`Phòng đã được tạo nhưng chưa tải hết ảnh: ${(cause as Error).message}`)
      } else setProblem((cause as Error).message)
    } finally { setBusy(false) }
  }
  const hide = async (room: OwnedRoom) => { if (!window.confirm(`Ẩn phòng “${room.title || 'Phòng trọ'}”?`)) return; try { await api(`/rooms/${room.roomId}`, { method: 'DELETE' }); setNotice('Đã ẩn phòng. Phòng sẽ không còn trong danh sách quản lý.'); rooms.reload() } catch (cause) { setProblem((cause as Error).message) } }
  return <div className="landlord-rooms"><Heading title="Quản lý phòng trọ" description="Đăng phòng và theo dõi trạng thái phòng trong một nơi." action={!showForm && <button className="button button-primary" onClick={openCreate}><Plus size={17} /> Đăng phòng mới</button>} />
    <Feedback message={notice} /><Feedback message={problem} error />
    {showForm && <form className="panel landlord-room-form" onSubmit={submit}><div className="landlord-section-head"><div><span className="section-label">PHÒNG MỚI</span><h2>Tạo phòng cho thuê</h2></div><button className="button button-ghost small" type="button" onClick={close}>Đóng</button></div><p className="landlord-note">Phòng mới sẽ chờ quản trị viên duyệt trước khi xuất hiện công khai. Hãy kiểm tra thông tin trước khi gửi.</p>
      <div className="landlord-form-section"><h3>Thông tin cơ bản</h3><div className="form-grid"><label className="span-two">Tên phòng *<input required maxLength={255} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ví dụ: Phòng trọ gần trường đại học" /></label><label>Loại phòng<input maxLength={50} value={form.type} onChange={e => set('type', e.target.value)} /></label><label className="span-two">Địa chỉ *<input required value={form.address} onChange={e => set('address', e.target.value)} placeholder="Số nhà, đường, phường/xã, tỉnh/thành" /></label><label>Diện tích (m²)<input type="number" min="0" max="99999999.99" step="0.01" value={form.area} onChange={e => set('area', e.target.value)} /></label><label>Giá thuê mỗi tháng (₫)<input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} /></label></div></div>
      <div className="landlord-form-section"><h3>Chi phí và mô tả</h3><div className="form-grid"><label>Tiền cọc (₫)<input type="number" min="0" step="0.01" value={form.deposit} onChange={e => set('deposit', e.target.value)} /></label><label>Tiền điện (₫)<input type="number" min="0" step="0.01" value={form.electricityFee} onChange={e => set('electricityFee', e.target.value)} /></label><label>Tiền nước (₫)<input type="number" min="0" step="0.01" value={form.waterFee} onChange={e => set('waterFee', e.target.value)} /></label><label>Phí dịch vụ (₫)<input type="number" min="0" step="0.01" value={form.serviceFee} onChange={e => set('serviceFee', e.target.value)} /></label><label className="span-two">Mô tả<textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)} /></label><label className="span-two">Nội quy<textarea rows={3} value={form.rule} onChange={e => set('rule', e.target.value)} /></label></div></div>
      <div className="landlord-form-section"><h3>Tiện nghi và hình ảnh</h3>{amenities.loading ? <Loading /> : amenities.error ? <ErrorState message={amenities.error} retry={amenities.reload} /> : amenities.data?.length ? <div className="landlord-amenities">{amenities.data.map(item => <label key={item.amenityId}><input type="checkbox" checked={form.amenityIds.includes(item.amenityId)} onChange={e => setForm(previous => ({ ...previous, amenityIds: e.target.checked ? [...previous.amenityIds, item.amenityId] : previous.amenityIds.filter(id => id !== item.amenityId) }))} /> {item.amenityName}</label>)}</div> : <p className="landlord-note">Chưa có danh mục tiện nghi.</p>}<label className="landlord-image-label">Chọn ảnh từ thiết bị (JPEG, PNG, WebP; tối đa 5 MB/ảnh)<input className="landlord-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => { addPhotos(e.target.files); e.target.value = '' }} /></label>
      {pendingPhotos.length > 0 && <div className="landlord-photo-previews" aria-label="Ảnh sẽ tải lên khi lưu phòng">{pendingPhotos.map(photo => <div className="landlord-photo-preview" key={photo.id}><img src={photo.previewUrl} alt={photo.file.name} /><span title={photo.file.name}>{photo.file.name}</span><button type="button" onClick={() => removePhoto(photo.id)} aria-label={`Bỏ ảnh ${photo.file.name}`}>Bỏ ảnh</button></div>)}</div>}
      <label className="landlord-image-label">URL ảnh, mỗi dòng một ảnh<textarea rows={4} value={form.imageUrls} onChange={e => set('imageUrls', e.target.value)} placeholder="https://example.com/anh-phong.jpg" /></label><p className="landlord-note">Hãy kiểm tra ảnh và tiện nghi trước khi gửi duyệt.</p></div>
      <div className="landlord-form-actions"><button className="button button-secondary" type="button" onClick={close}>Hủy</button><button className="button button-primary" type="submit" disabled={busy || amenities.loading || !!amenities.error}>{busy ? 'Đang lưu…' : 'Gửi duyệt phòng'}</button></div></form>}
    {!showForm && <><div className="landlord-list-bar"><div className="landlord-tabs" role="group" aria-label="Lọc trạng thái phòng">{[['All', 'Tất cả'], ['Pending', 'Chờ duyệt'], ['Available', 'Còn trống'], ['Rented', 'Đã thuê']].map(([value, title]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{title}</button>)}</div><label className="landlord-search"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên hoặc địa chỉ" aria-label="Tìm phòng của bạn" /></label></div>
    {rooms.loading ? <Loading /> : rooms.error ? <ErrorState message={rooms.error} retry={rooms.reload} /> : visible.length ? <div className="landlord-room-list">{visible.map(room => <article className="panel landlord-room-card" key={room.roomId}><div className="landlord-room-image">{room.images[0]?.imageUrl ? <img src={room.images[0].imageUrl} alt={room.title || 'Ảnh phòng'} /> : <Home size={29} />}</div><div className="landlord-room-info"><div className="landlord-room-title"><h2>{room.title || 'Phòng chưa có tiêu đề'}</h2><Status value={room.status} /></div><p><MapPin size={15} />{room.address || 'Chưa có địa chỉ'}</p><div className="landlord-room-meta"><strong>{money(room.price)} <small>/ tháng</small></strong><span>{room.area === null ? 'Chưa có diện tích' : `${room.area} m²`}</span><span>{room.amenities.length} tiện nghi</span><span>{room.images.length} ảnh</span></div><div className="landlord-room-actions">{room.status === 'Available' && <Link className="button button-ghost small" to={`/rooms/${room.roomId}`}>Xem trang phòng</Link>}{room.status !== 'Hidden' && <button className="button button-ghost small" onClick={() => hide(room)}>Ẩn phòng</button>}</div></div></article>)}</div> : <State title={rooms.data?.length ? 'Không có phòng phù hợp bộ lọc' : 'Bạn chưa đăng phòng nào'} description={rooms.data?.length ? 'Thử chọn trạng thái hoặc từ khóa khác.' : 'Gửi phòng đầu tiên để quản trị viên duyệt.'} action={!showForm && !rooms.data?.length && <button className="button button-primary small" onClick={openCreate}>Tạo phòng</button>} />}
    <div className="landlord-paging"><span>Trang {page}{rooms.data?.length === 100 ? ' · còn có thể có phòng ở trang sau' : ''}</span><div><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>Trước</button><button disabled={!rooms.data || rooms.data.length < 100} onClick={() => setPage(value => value + 1)}>Sau</button></div></div></>}
  </div>
}
