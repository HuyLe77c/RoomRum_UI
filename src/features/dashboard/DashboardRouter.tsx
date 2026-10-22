import { Link, useNavigate, useParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { DashboardShell, State, useAuth } from '../../shared/ui'
import type { RolePath } from './shared'
import { LandlordAppointments, LandlordMessages, LandlordOverview, LandlordRepairs, LandlordRooms, LandlordTenancies } from '../landlord'
import { Overview } from './Overview'
import { Favorites } from './Favorites'
import { Appointments } from './Appointments'
import { Tenancies } from './Tenancies'
import { MySharing } from './MySharing'
import { Repairs } from './Repairs'
import { Reports } from './Reports'
import { Messages } from './Messages'
import { UsersPage } from './UsersPage'
import { PendingRooms } from './PendingRooms'
import { AmenitiesPage } from './AmenitiesPage'
import { Profile } from './Profile'

export function DashboardRouter({ role }: { role: RolePath }) {
  const { section } = useParams(); const { session } = useAuth()
  const navigate = useNavigate()
  if (!session) return <div className="access-page"><ShieldCheck size={32} /><h1>Hãy đăng nhập để tiếp tục</h1><p>Trang này dành cho tài khoản RoomRum.</p><Link className="button button-primary" to="/login">Đăng nhập</Link></div>
  if (session.role.toLowerCase() !== role) return <div className="access-page"><ShieldCheck size={32} /><h1>Bạn không có quyền truy cập</h1><p>Tài khoản hiện tại không thuộc khu vực này.</p><button className="button button-primary" onClick={() => navigate(session.role === 'Admin' ? '/admin' : session.role === 'Landlord' ? '/landlord' : '/tenant')}>Đến bảng điều khiển</button></div>
  if (role === 'landlord') return <DashboardShell role={role}>{!section ? <LandlordOverview /> : section === 'rooms' ? <LandlordRooms /> : section === 'appointments' ? <LandlordAppointments /> : section === 'tenancies' ? <LandlordTenancies /> : section === 'repairs' ? <LandlordRepairs /> : section === 'messages' ? <LandlordMessages /> : section === 'profile' ? <Profile /> : <State title="Không tìm thấy trang" />}</DashboardShell>
  return <DashboardShell role={role}>{!section ? <Overview role={role} /> : section === 'favorites' ? <Favorites /> : section === 'appointments' ? <Appointments role={role} /> : section === 'tenancies' ? <Tenancies role={role} /> : section === 'sharing' ? <MySharing /> : section === 'rooms' ? (role === 'admin' ? <PendingRooms /> : <LandlordRooms />) : section === 'repairs' ? <Repairs role={role} /> : section === 'reports' ? <Reports role={role} /> : section === 'messages' ? <Messages /> : section === 'users' ? <UsersPage /> : section === 'amenities' ? <AmenitiesPage /> : section === 'profile' ? <Profile /> : <State title="Không tìm thấy trang" />}</DashboardShell>
}
