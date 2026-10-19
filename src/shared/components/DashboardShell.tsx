import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Bell, Heart, Home, LayoutDashboard, LogOut, Menu, MessageCircle, ShieldCheck, UserRound, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { Logo } from './SiteChrome'

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
