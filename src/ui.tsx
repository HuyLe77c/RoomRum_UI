import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ArrowRight, Bell, Heart, Home, LayoutDashboard, LogOut, MapPin, Menu, MessageCircle, Search, ShieldCheck, UserRound, X } from 'lucide-react'
import { api, getSession, setSession } from './api'
import type { Room, Session } from './types'

type AuthValue = { session: Session | null; save: (value: Session | null) => void }
const AuthContext = createContext<AuthValue>({ session: null, save: () => undefined })
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, update] = useState<Session | null>(getSession)
  useEffect(() => { const sync = () => update(getSession()); window.addEventListener('roomrum-session', sync); return () => window.removeEventListener('roomrum-session', sync) }, [])
  const save = (value: Session | null) => { setSession(value); update(value) }
  return <AuthContext.Provider value={{ session, save }}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)

export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [error, setError] = useState('')
  const [version, reload] = useState(0)
  useEffect(() => {
    if (!path) { setData(null); setLoading(false); return }
    let active = true
    setLoading(true); setError('')
    api<T>(path).then(value => { if (active) setData(value) }).catch((cause: Error) => { if (active) setError(cause.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [path, version])
  return { data, loading, error, reload: () => reload(value => value + 1) }
}

export const money = (value: number | null | undefined) => value === null || value === undefined ? 'Liên hệ' : `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
export const shortMoney = (value: number | null | undefined) => value === null || value === undefined ? 'Liên hệ' : value >= 1_000_000 ? `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu` : money(value)
export const date = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString('vi-VN') : '—'

export function Logo() { return <Link to="/" className="brand" aria-label="RoomRum - Trang chủ"><span className="brand-icon"><Home size={20} strokeWidth={2.5} /></span><span>Room<span>Rum</span></span></Link> }

export function Header() {
  const { session, save } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const dashboard = session?.role === 'Admin' ? '/admin' : session?.role === 'Landlord' ? '/landlord' : '/tenant'
  return <header className="site-header"><div className="header-inner"><Logo />
    <nav className={open ? 'site-nav open' : 'site-nav'} aria-label="Điều hướng chính">
      <NavLink to="/" end onClick={() => setOpen(false)}>Trang chủ</NavLink>
      <NavLink to="/search" onClick={() => setOpen(false)}>Tìm phòng</NavLink>
      <NavLink to="/map" onClick={() => setOpen(false)}>Bản đồ</NavLink>
      <NavLink to="/sharing" onClick={() => setOpen(false)}>Ở ghép</NavLink>
    </nav>
    <div className="header-actions">
      {session ? <><Link className="header-dashboard" to={dashboard}><LayoutDashboard size={17} /> Bảng điều khiển</Link><button className="icon-button logout" title="Đăng xuất" onClick={() => { save(null); navigate('/') }}><LogOut size={18} /></button></> : <><Link className="login-link" to="/login">Đăng nhập</Link><Link className="button button-primary small" to="/register">Đăng ký</Link></>}
      <button className="icon-button menu-button" aria-label={open ? 'Đóng menu' : 'Mở menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={21} /> : <Menu size={21} />}</button>
    </div>
  </div></header>
}

export function Footer() { return <footer className="site-footer"><div className="container footer-grid"><div><Logo /><p>Không gian sống phù hợp bắt đầu từ thông tin rõ ràng.</p></div><div><strong>Khám phá</strong><Link to="/search">Tìm phòng</Link><Link to="/map">Tra cứu bản đồ</Link><Link to="/sharing">Tìm người ở ghép</Link></div><div><strong>Tài khoản</strong><Link to="/login">Đăng nhập</Link><Link to="/register">Tạo tài khoản</Link></div><div><strong>RoomRum</strong><p>Thông tin phòng và tài khoản được tải từ hệ thống RoomRum.</p></div></div><div className="container footer-bottom">© {new Date().getFullYear()} RoomRum</div></footer> }

export function State({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return <div className="state"><div className="state-icon">{icon || <Search size={25} />}</div><h3>{title}</h3>{description && <p>{description}</p>}{action}</div>
}
export function Loading({ label = 'Đang tải dữ liệu…' }: { label?: string }) { return <div className="loading"><span className="spinner" />{label}</div> }
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) { return <State title="Chưa tải được dữ liệu" description={message} action={retry && <button className="button button-primary" onClick={retry}>Thử lại</button>} /> }

export function RoomCard({ room, onFavorite }: { room: Room; onFavorite?: (id: string) => void }) {
  return <article className="room-card"><Link to={`/rooms/${room.roomId}`} className="room-cover">{room.imageUrl ? <img src={room.imageUrl} alt={room.title || 'Ảnh phòng'} loading="lazy" /> : <div className="image-empty"><Home size={32} /><span>Chưa có ảnh phòng</span></div>}<span className="room-status">{room.status === 'Available' ? 'Còn trống' : room.status || 'Phòng trọ'}</span></Link>
    {onFavorite && <button className="favorite-button" aria-label="Lưu phòng" onClick={() => onFavorite(room.roomId)}><Heart size={19} /></button>}
    <div className="room-body"><div className="room-meta"><span>{room.type || 'Phòng trọ'}</span>{room.area !== null && <span>{room.area} m²</span>}</div><Link to={`/rooms/${room.roomId}`} className="room-title">{room.title || 'Phòng chưa có tiêu đề'}</Link><p className="room-address"><MapPin size={15} />{room.address || 'Chưa cập nhật địa chỉ'}</p><div className="room-bottom"><strong>{shortMoney(room.price)}<small> / tháng</small></strong><Link to={`/rooms/${room.roomId}`} aria-label={`Xem ${room.title || 'phòng'}`}><ArrowRight size={19} /></Link></div></div>
  </article>
}

type MenuItem = { path: string; label: string; icon: ReactNode }
export function DashboardShell({ role, children }: { role: 'tenant' | 'landlord' | 'admin'; children: ReactNode }) {
  const { session, save } = useAuth(); const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const items: MenuItem[] = role === 'tenant' ? [
    { path: '/tenant', label: 'Tổng quan', icon: <LayoutDashboard size={18} /> },
    { path: '/tenant/favorites', label: 'Phòng yêu thích', icon: <Heart size={18} /> },
    { path: '/tenant/appointments', label: 'Lịch xem phòng', icon: <Bell size={18} /> },
    { path: '/tenant/tenancies', label: 'Phòng đang thuê', icon: <Home size={18} /> },
    { path: '/tenant/sharing', label: 'Ở ghép', icon: <UserRound size={18} /> },
    { path: '/tenant/repairs', label: 'Yêu cầu sửa chữa', icon: <ShieldCheck size={18} /> },
    { path: '/tenant/reports', label: 'Báo cáo', icon: <ShieldCheck size={18} /> },
    { path: '/tenant/messages', label: 'Tin nhắn', icon: <MessageCircle size={18} /> },
    { path: '/tenant/profile', label: 'Hồ sơ', icon: <UserRound size={18} /> },
  ] : role === 'landlord' ? [
    { path: '/landlord', label: 'Tổng quan', icon: <LayoutDashboard size={18} /> },
    { path: '/landlord/rooms', label: 'Quản lý phòng', icon: <Home size={18} /> },
    { path: '/landlord/appointments', label: 'Lịch xem phòng', icon: <Bell size={18} /> },
    { path: '/landlord/tenancies', label: 'Người thuê', icon: <UserRound size={18} /> },
    { path: '/landlord/repairs', label: 'Sửa chữa', icon: <ShieldCheck size={18} /> },
    { path: '/landlord/messages', label: 'Tin nhắn', icon: <MessageCircle size={18} /> },
    { path: '/landlord/profile', label: 'Hồ sơ', icon: <UserRound size={18} /> },
  ] : [
    { path: '/admin', label: 'Tổng quan', icon: <LayoutDashboard size={18} /> },
    { path: '/admin/users', label: 'Người dùng', icon: <UserRound size={18} /> },
    { path: '/admin/amenities', label: 'Tiện nghi', icon: <Home size={18} /> },
    { path: '/admin/reports', label: 'Báo cáo', icon: <ShieldCheck size={18} /> },
    { path: '/admin/profile', label: 'Hồ sơ', icon: <UserRound size={18} /> },
  ]
  return <div className="dashboard">{menuOpen && <button className="dashboard-backdrop" aria-label="Đóng menu tài khoản" onClick={() => setMenuOpen(false)} />}<aside className={menuOpen ? 'dashboard-sidebar mobile-open' : 'dashboard-sidebar'}><div className="sidebar-brand-line"><Logo /><button className="icon-button dashboard-menu-close" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}><X size={20} /></button></div><div className="sidebar-caption">{role === 'tenant' ? 'Dành cho người thuê' : role === 'landlord' ? 'Dành cho chủ phòng' : 'Quản trị hệ thống'}</div><nav aria-label="Điều hướng tài khoản">{items.map(item => <NavLink key={item.path} to={item.path} end={item.path.split('/').length === 2} onClick={() => setMenuOpen(false)}>{item.icon}{item.label}</NavLink>)}</nav><div className="sidebar-foot"><Link to="/" onClick={() => setMenuOpen(false)}>← Về trang chủ</Link><button onClick={() => { save(null); navigate('/') }}><LogOut size={17} /> Đăng xuất</button></div></aside><div className="dashboard-main"><div className="dashboard-top"><div className="dashboard-mobile-brand"><Logo /></div><span>Xin chào, <strong>{session?.name}</strong></span><span className="avatar">{session?.name?.slice(0, 1).toUpperCase()}</span><button className="icon-button dashboard-menu-button" aria-label="Mở menu tài khoản" onClick={() => setMenuOpen(true)}><Menu size={21} /></button></div><div className="dashboard-content">{children}</div><nav className="dashboard-mobile-nav" aria-label="Điều hướng tài khoản">{items.slice(0, 5).map(item => <NavLink key={item.path} to={item.path} end={item.path.split('/').length === 2}>{item.icon}<span>{item.label}</span></NavLink>)}</nav></div></div>
}
