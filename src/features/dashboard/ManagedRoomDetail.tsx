import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, MapPin } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { ErrorState, Loading, money, useResource } from '../../shared/ui'
import type { RoomDetail } from '../../shared/types'
import { ManagedRoomImage } from '../rooms/ManagedRoomImage'
import { Badge, Heading } from './shared'
import './managed-room.css'

export function ManagedRoomDetail({ role }: { role: 'landlord' | 'admin' }) {
  const { id } = useParams()
  const roomResource = useResource<RoomDetail>(id ? `/rooms/${id}/management` : null)
  const { data: room, loading, error, reload } = roomResource
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const [selected, setSelected] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const submitting = useRef(false)
  const back = `/${role}/rooms`
  const review = async (status: 'Available' | 'Cancelled') => {
    if (submitting.current || !room || room.status !== 'Pending') return
    if (!window.confirm(status === 'Available' ? 'Duyệt và công khai tin đăng này?' : 'Từ chối tin đăng này?')) return
    submitting.current = true; setBusy(true); setNotice(''); setProblem('')
    try {
      await api(`/admin/rooms/${room.roomId}/review`, json('PATCH', { status }))
      setNotice(status === 'Available' ? 'Đã duyệt và công khai tin đăng.' : 'Đã từ chối tin đăng.')
      reload()
    } catch (cause) { setProblem((cause as Error).message); reload() }
    finally { submitting.current = false; setBusy(false) }
  }
  if (loading) return <Loading />
  if (error || !room || roomResource.dataPath !== `/rooms/${id}/management`) return <><Link className="button button-ghost" to={back}><ArrowLeft size={16} /> Quay lại danh sách</Link><ErrorState message={error || 'Không tìm thấy tin đăng hoặc bạn không có quyền xem.'} retry={reload} /></>
  const images = room.images.filter((image): image is typeof image & { imageUrl: string } => Boolean(image.imageUrl))
  const current = images[selected]
  return <div className="managed-room">
    <Link className="button button-ghost small" to={back}><ArrowLeft size={16} /> Quay lại danh sách</Link>
    <Heading eyebrow={role === 'admin' ? 'QUẢN TRỊ' : 'KHÔNG GIAN CHỦ TRỌ'} title={room.title || 'Tin đăng chưa có tiêu đề'} description="Chi tiết tin đăng" action={<Badge status={room.status} label={room.status === 'Cancelled' ? 'Bị từ chối' : undefined} />} />
    {notice && <p className="inline-notice" role="status">{notice}</p>}
    {problem && <p className="managed-room-error" role="alert">{problem}</p>}
    <p className="managed-room-address"><MapPin size={17} />{room.address || 'Chưa cập nhật địa chỉ'}</p>
    <section className="managed-room-section" aria-labelledby="room-photos"><h2 id="room-photos">Hình ảnh ({images.length})</h2>
      {images.length ? <div className="managed-room-photos">{images.map((image, index) => <button type="button" key={image.roomImageId} aria-label={`Phóng lớn ảnh ${index + 1}`} onClick={() => { setSelected(index); dialog.current?.showModal() }}><ManagedRoomImage src={image.imageUrl} alt={`Ảnh phòng ${index + 1}`} /><span>Ảnh {index + 1}</span></button>)}</div> : <p className="muted">Tin đăng chưa có ảnh.</p>}
    </section>
    <div className="managed-room-columns"><div>
      <section className="managed-room-section"><h2>Thông tin phòng</h2><dl className="managed-room-facts"><div><dt>Loại phòng</dt><dd>{room.type || 'Chưa cập nhật'}</dd></div><div><dt>Diện tích</dt><dd>{room.area == null ? 'Chưa cập nhật' : `${room.area} m²`}</dd></div><div><dt>Địa chỉ</dt><dd>{room.address || 'Chưa cập nhật'}</dd></div></dl></section>
      <section className="managed-room-section"><h2>Nội dung tin đăng</h2><p className="pre-line">{room.description || 'Chưa cập nhật mô tả.'}</p></section>
      <section className="managed-room-section"><h2>Tiện nghi</h2>{room.amenities.length ? <div className="amenities">{room.amenities.map(item => <span key={item.amenityId}><Check size={15} />{item.amenityName}</span>)}</div> : <p className="muted">Chưa cập nhật tiện nghi.</p>}</section>
      <section className="managed-room-section"><h2>Nội quy</h2><p className="pre-line">{room.rule || 'Chưa cập nhật nội quy.'}</p></section>
    </div><aside>
      <section className="managed-room-section"><h2>Giá thuê và chi phí</h2><dl className="managed-room-facts">{[['Giá thuê / tháng', room.price], ['Tiền cọc', room.deposit], ['Tiền điện', room.electricityFee], ['Tiền nước', room.waterFee], ['Phí dịch vụ', room.serviceFee]].map(([label, amount]) => <div key={String(label)}><dt>{label}</dt><dd>{amount == null ? 'Chưa cập nhật' : money(amount as number)}</dd></div>)}</dl></section>
      <section className="managed-room-section"><h2>Thông tin chủ trọ</h2><dl className="managed-room-facts"><div><dt>Họ tên</dt><dd>{room.owner?.name || 'Chưa cập nhật'}</dd></div><div><dt>Số điện thoại</dt><dd>{room.owner?.phone || 'Chưa cập nhật'}</dd></div></dl></section>
      {role === 'admin' && <section className="managed-room-section"><h2>Xét duyệt tin đăng</h2>{room.status === 'Pending' ? <><p>Kiểm tra thông tin, nội dung và hình ảnh trước khi quyết định.</p><div className="managed-room-review"><button className="button button-primary" disabled={busy} onClick={() => review('Available')}>{busy ? 'Đang xử lý…' : 'Duyệt tin đăng'}</button><button className="button button-secondary" disabled={busy} onClick={() => review('Cancelled')}>Từ chối tin đăng</button></div></> : <p>Tin đăng này không còn chờ duyệt.</p>}</section>}
    </aside></div>
    <dialog ref={dialog} className="managed-room-lightbox" aria-labelledby="photo-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close() }}><div className="managed-room-lightbox-head"><h2 id="photo-title">Ảnh {selected + 1} / {images.length}</h2><button className="button button-secondary small" onClick={() => dialog.current?.close()}>Đóng ảnh</button></div>{current && <ManagedRoomImage key={current.roomImageId} src={current.imageUrl} alt={`Ảnh phòng ${selected + 1} phóng lớn`} />}<div className="managed-room-photo-nav"><button className="button button-secondary" disabled={selected === 0} onClick={() => setSelected(value => value - 1)}>Ảnh trước</button><button className="button button-secondary" disabled={selected >= images.length - 1} onClick={() => setSelected(value => value + 1)}>Ảnh sau</button></div></dialog>
  </div>
}
