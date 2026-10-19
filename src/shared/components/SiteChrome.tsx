import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Home, LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

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
