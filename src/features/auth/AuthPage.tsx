import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Home } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { useAuth } from '../../shared/ui'
import type { Role, Session } from '../../shared/types'

type Registration = { userId: string; name: string; email: string | null; role: Role; status: string }

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { save } = useAuth(); const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'Tenant' })
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { setError(''); setNotice(''); setBusy(false) }, [mode])
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true)
    try {
      if (mode === 'register') {
        await api<Registration>('/auth/register', json('POST', form))
        save(null)
        setNotice('Tài khoản đã được tạo và đang chờ quản trị viên kích hoạt. Bạn có thể đăng nhập sau khi được duyệt.')
        return
      }
      const session = await api<Session>('/auth/login', json('POST', { email: form.email, password: form.password }))
      if (!session?.token) throw new Error('Đăng nhập không trả về phiên hợp lệ.')
      save(session)
      navigate(session.role === 'Admin' ? '/admin' : session.role === 'Landlord' ? '/landlord' : '/tenant')
    } catch (cause) { setError((cause as Error).message) } finally { setBusy(false) }
  }
  return <div className="auth-page"><div className="auth-visual"><Link to="/" className="auth-brand"><Home size={22} /> RoomRum</Link><div className="auth-visual-copy"><span>KHÔNG GIAN SỐNG CỦA BẠN</span><h1>{mode === 'login' ? 'Mừng bạn trở lại với RoomRum.' : 'Bắt đầu hành trình tìm nơi ở phù hợp.'}</h1><p>Tìm phòng, xem bản đồ và kết nối với chủ phòng trong một trải nghiệm rõ ràng.</p></div><div className="auth-pattern" aria-hidden="true"><div /><div /><div /></div></div><div className="auth-form-wrap"><Link to="/" className="auth-back">← Về trang chủ</Link><form className="auth-form" onSubmit={submit}><span className="section-label">{mode === 'login' ? 'ĐĂNG NHẬP' : 'TẠO TÀI KHOẢN'}</span><h2>{mode === 'login' ? 'Chào mừng trở lại' : 'Tham gia RoomRum'}</h2><p>{mode === 'login' ? 'Đăng nhập để tiếp tục quản lý không gian sống của bạn.' : 'Chọn vai trò phù hợp để bắt đầu.'}</p>{mode === 'register' && <><label>Họ và tên<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nhập họ và tên" /></label><label>Vai trò<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="Tenant">Người thuê</option><option value="Landlord">Chủ phòng</option></select></label></>}<label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ten@example.com" /></label>{mode === 'register' && <label>Số điện thoại (không bắt buộc)<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Số điện thoại" /></label>}<label>Mật khẩu<input required minLength={8} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Ít nhất 8 ký tự" /></label>{error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="form-success" role="status">{notice} <Link to="/login">Đến trang đăng nhập</Link></div>}<button className="button button-primary full" disabled={busy || !!notice}>{busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <ArrowRight size={17} /></button><div className="auth-switch">{mode === 'login' ? <>Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></> : <>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></>}</div></form></div></div>
}
