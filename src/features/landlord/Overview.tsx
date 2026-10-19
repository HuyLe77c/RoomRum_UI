import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Home, Plus, Users, Wrench } from 'lucide-react'
import { ErrorState, Loading, State, date, useAuth, useResource } from '../../shared/ui'
import type { Appointment, OwnedRoom, Repair, Tenancy } from '../../shared/types'
import { label, Heading } from './shared'

export function LandlordOverview() {
  const { session } = useAuth()
  const rooms = useResource<OwnedRoom[]>('/rooms/mine?page=1&pageSize=100')
  const appointments = useResource<Appointment[]>('/appointments/mine?page=1&pageSize=100')
  const tenancies = useResource<Tenancy[]>('/room-tenants/mine?page=1&pageSize=100')
  const repairs = useResource<Repair[]>('/repairs/mine?page=1&pageSize=100')
  const owned = rooms.data || []
  const cards = [
    { title: 'Phòng đang đăng', value: owned.filter(room => room.status === 'Available').length, icon: <Home />, path: '/landlord/rooms', loading: rooms.loading, error: rooms.error },
    { title: 'Lịch hẹn chờ xử lý', value: appointments.data?.filter(item => item.status === 'Pending').length || 0, icon: <CalendarDays />, path: '/landlord/appointments', loading: appointments.loading, error: appointments.error },
    { title: 'Người thuê hiện tại', value: tenancies.data?.filter(item => item.status === 'Active').length || 0, icon: <Users />, path: '/landlord/tenancies', loading: tenancies.loading, error: tenancies.error },
    { title: 'Sửa chữa chưa xong', value: repairs.data?.filter(item => item.status === 'Pending' || item.status === 'InProgress').length || 0, icon: <Wrench />, path: '/landlord/repairs', loading: repairs.loading, error: repairs.error },
  ]
  return <div className="landlord-overview">
    <Heading title={`Chào ${session?.name || 'bạn'}, quản lý nhà trọ dễ dàng hơn.`} description="Xem nhanh việc cần xử lý từ dữ liệu phòng và người thuê của bạn." action={<Link className="button button-primary" to="/landlord/rooms?new=1"><Plus size={17} /> Đăng phòng</Link>} />
    <div className="landlord-summary">{cards.map(card => <Link className="landlord-summary-card panel" to={card.path} key={card.title}><span className="landlord-summary-icon">{card.icon}</span><span className="landlord-summary-copy"><small>{card.title}</small><strong>{card.loading || card.error ? '—' : card.value === 100 ? '100+' : card.value}</strong>{card.error && <em>Chưa tải được</em>}</span><ArrowRight size={17} /></Link>)}</div>
    <div className="landlord-overview-grid"><section className="panel landlord-queue"><div className="landlord-section-head"><div><span className="section-label">ƯU TIÊN HÔM NAY</span><h2>Lịch xem phòng chờ phản hồi</h2></div><Link to="/landlord/appointments">Xem tất cả <ArrowRight size={16} /></Link></div>{appointments.loading ? <Loading /> : appointments.error ? <ErrorState message={appointments.error} retry={appointments.reload} /> : appointments.data?.filter(item => item.status === 'Pending').length ? appointments.data.filter(item => item.status === 'Pending').slice(0, 4).map(item => <Link className="landlord-queue-row" to="/landlord/appointments" key={item.appointmentId}><span className="landlord-row-icon"><CalendarDays size={18} /></span><span><strong>{item.roomTitle || 'Phòng trọ'}</strong><small>{item.guestName} · {date(item.appointmentDate)} · {item.appointmentTime.slice(0, 5)}</small></span><ArrowRight size={16} /></Link>) : <State title="Chưa có lịch hẹn cần xử lý" description="Lịch hẹn mới sẽ xuất hiện ở đây." />}</section>
    <section className="panel landlord-queue"><div className="landlord-section-head"><div><span className="section-label">PHÒNG CỦA BẠN</span><h2>Tình trạng đăng phòng</h2></div><Link to="/landlord/rooms">Quản lý <ArrowRight size={16} /></Link></div>{rooms.loading ? <Loading /> : rooms.error ? <ErrorState message={rooms.error} retry={rooms.reload} /> : owned.length ? <><div className="landlord-status-bars">{['Available', 'Rented', 'Draft', 'Hidden'].map(status => <div key={status}><span>{label(status)}</span><div><i style={{ width: `${owned.filter(room => room.status === status).length / owned.length * 100}%` }} /></div><strong>{owned.filter(room => room.status === status).length}</strong></div>)}</div><p className="landlord-note">Thống kê từ {owned.length === 100 ? '100 phòng đầu tiên' : `${owned.length} phòng`} trong tài khoản.</p></> : <State title="Bạn chưa có phòng nào" description="Tạo phòng đầu tiên để bắt đầu quản lý." action={<Link className="button button-primary small" to="/landlord/rooms?new=1">Đăng phòng</Link>} />}</section></div>
  </div>
}
