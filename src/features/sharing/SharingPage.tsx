import { Link } from 'react-router-dom'
import { ArrowRight, Users } from 'lucide-react'
import { ErrorState, Footer, Header, Loading, State, shortMoney, useResource } from '../../shared/ui'
import type { Sharing } from '../../shared/types'

export function SharingPage() {
  const { data, loading, error, reload } = useResource<Sharing[]>('/sharings?page=1&pageSize=50')
  return <><Header /><main className="container generic-page"><div className="page-title"><span className="section-label">CỘNG ĐỒNG ROOMRUM</span><h1>Tìm người ở ghép</h1><p>Những lời mời ở ghép từ người thuê trên RoomRum.</p></div>{loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} /> : data?.length ? <div className="sharing-grid">{data.map(item => <article className="panel sharing-card" key={item.sharingId}><span className="eyebrow"><Users size={15} /> Ở ghép</span><h2>{item.title || item.roomTitle || 'Lời mời ở ghép'}</h2><p>{item.introduction || 'Chưa có lời giới thiệu.'}</p><div className="sharing-facts"><span>{item.quantity || '—'} chỗ</span><span>{item.gender || 'Không yêu cầu giới tính'}</span></div><div className="room-bottom"><strong>{shortMoney(item.sharingFee)}<small> / tháng</small></strong><Link to={`/rooms/${item.roomId}`}>Xem phòng <ArrowRight size={16} /></Link></div></article>)}</div> : <State title="Chưa có lời mời ở ghép" description="Danh sách sẽ xuất hiện khi người thuê đăng lời mời." />}</main><Footer /></>
}
