import { Link } from 'react-router-dom'
import { ArrowRight, Heart, Home, MapPin } from 'lucide-react'
import type { Room } from '../types'
import { shortMoney } from '../utils/format'

export function RoomCard({ room, onFavorite }: { room: Room; onFavorite?: (id: string) => void }) {
  return <article className="room-card"><Link to={`/rooms/${room.roomId}`} className="room-cover">{room.imageUrl ? <img src={room.imageUrl} alt={room.title || 'Ảnh phòng'} loading="lazy" /> : <div className="image-empty"><Home size={32} /><span>Chưa có ảnh phòng</span></div>}<span className="room-status">{room.status === 'Available' ? 'Còn trống' : room.status || 'Phòng trọ'}</span></Link>
    {onFavorite && <button className="favorite-button" aria-label="Lưu phòng" onClick={() => onFavorite(room.roomId)}><Heart size={19} /></button>}
    <div className="room-body"><div className="room-meta"><span>{room.type || 'Phòng trọ'}</span>{room.area !== null && <span>{room.area} m²</span>}</div><Link to={`/rooms/${room.roomId}`} className="room-title">{room.title || 'Phòng chưa có tiêu đề'}</Link><p className="room-address"><MapPin size={15} />{room.address || 'Chưa cập nhật địa chỉ'}</p><div className="room-bottom"><strong>{shortMoney(room.price)}<small> / tháng</small></strong><Link to={`/rooms/${room.roomId}`} aria-label={`Xem ${room.title || 'phòng'}`}><ArrowRight size={19} /></Link></div></div>
  </article>
}
