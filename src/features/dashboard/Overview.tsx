import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Heart, Home, MapPin, Plus, ShieldCheck, Users } from 'lucide-react'
import { date, useAuth, useResource } from '../../shared/ui'
import type { AdminUser, Appointment, Favorite, Report, Room } from '../../shared/types'
import { Heading, Badge } from './shared'
import type { RolePath } from './shared'

export function Overview({ role }: { role: RolePath }) {
  const { session } = useAuth()
  const rooms = useResource<Room[]>(role === 'landlord' ? '/rooms/mine?page=1&pageSize=50' : null)
  const appointments = useResource<Appointment[]>(role === 'admin' ? null : '/appointments/mine?page=1&pageSize=50')
  const favorites = useResource<Favorite[]>(role === 'tenant' ? '/favorites?page=1&pageSize=50' : null)
  const users = useResource<AdminUser[]>(role === 'admin' ? '/admin/users?page=1&pageSize=50' : null)
  const reports = useResource<Report[]>(role === 'admin' ? '/reports/pending?page=1&pageSize=50' : null)
  const cards = role === 'tenant' ? [
    { label: 'Phòng đã lưu', value: favorites.data?.length, icon: <Heart />, path: '/tenant/favorites' },
    { label: 'Lịch xem phòng', value: appointments.data?.length, icon: <CalendarDays />, path: '/tenant/appointments' },
  ] : role === 'landlord' ? [
    { label: 'Phòng của bạn', value: rooms.data?.length, icon: <Home />, path: '/landlord/rooms' },
    { label: 'Lịch xem phòng', value: appointments.data?.length, icon: <CalendarDays />, path: '/landlord/appointments' },
  ] : [
    { label: 'Người dùng', value: users.data?.length, icon: <Users />, path: '/admin/users' },
    { label: 'Báo cáo', value: reports.data?.length, icon: <ShieldCheck />, path: '/admin/reports' },
  ]
  return <><Heading eyebrow="TỔNG QUAN" title={`Chào mừng trở lại, ${session?.name || 'bạn'}!`} description="Thông tin bên dưới được tải từ tài khoản RoomRum của bạn." /><div className="overview-cards">{cards.map(card => <Link to={card.path} className="overview-card" key={card.label}><div className="overview-icon">{card.icon}</div><div><span>{card.label}</span><strong>{card.value === undefined ? '—' : card.value}</strong><small>Trong danh sách hiện tại</small></div><ArrowRight className="overview-arrow" size={18} /></Link>)}</div><div className="dashboard-two"><section className="panel overview-panel"><h2>Thao tác nhanh</h2><div className="quick-actions">{role === 'tenant' ? <><Link to="/search"><Home /> Tìm phòng <ArrowRight /></Link><Link to="/map"><MapPin /> Xem bản đồ <ArrowRight /></Link><Link to="/tenant/appointments"><CalendarDays /> Lịch xem phòng <ArrowRight /></Link></> : role === 'landlord' ? <><Link to="/landlord/rooms"><Plus /> Đăng phòng mới <ArrowRight /></Link><Link to="/landlord/appointments"><CalendarDays /> Xử lý lịch hẹn <ArrowRight /></Link><Link to="/landlord/tenancies"><Users /> Quản lý người thuê <ArrowRight /></Link></> : <><Link to="/admin/users"><Users /> Quản lý người dùng <ArrowRight /></Link><Link to="/admin/reports"><ShieldCheck /> Xử lý báo cáo <ArrowRight /></Link><Link to="/admin/amenities"><Home /> Thêm tiện nghi <ArrowRight /></Link></>}</div></section><section className="panel overview-panel"><h2>Hoạt động gần đây</h2>{role === 'admin' ? reports.data?.length ? reports.data.slice(0, 4).map(item => <div className="activity-row" key={item.reportId}><ShieldCheck size={18} /><span>Báo cáo phòng {item.roomId.slice(0, 8)}…</span><Badge status={item.status} /></div>) : <p className="muted">Chưa có báo cáo.</p> : appointments.data?.length ? appointments.data.slice(0, 4).map(item => <div className="activity-row" key={item.appointmentId}><CalendarDays size={18} /><span>{item.roomTitle || 'Lịch xem phòng'} · {date(item.appointmentDate)}</span><Badge status={item.status} /></div>) : <p className="muted">Chưa có lịch xem phòng.</p>}</section></div></>
}
