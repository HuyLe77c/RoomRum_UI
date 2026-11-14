import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, FileText, Home, ImagePlus, X } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { useAuth } from '../../shared/ui'
import type { Role, Session } from '../../shared/types'

type Registration = { userId: string; name: string; email: string | null; role: Role; status: string }
type SelectedFile = { file: File; previewUrl: string | null }
type UploadKind = 'property' | 'verification'
const maxFileSize = 10 * 1024 * 1024
const imageTypes = ['image/jpeg', 'image/png', 'image/webp']

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { save } = useAuth(); const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'Tenant' })
  const [propertyImages, setPropertyImages] = useState<SelectedFile[]>([])
  const [verificationDocuments, setVerificationDocuments] = useState<SelectedFile[]>([])
  const previewUrls = useRef<Set<string>>(new Set())
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { setError(''); setNotice(''); setBusy(false) }, [mode])
  useEffect(() => () => { previewUrls.current.forEach(url => URL.revokeObjectURL(url)) }, [])
  const addFiles = (kind: UploadKind, event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || [])
    event.target.value = ''
    if (!picked.length) return
    const current = kind === 'property' ? propertyImages : verificationDocuments
    const limit = kind === 'property' ? 3 : 2
    const allowed = kind === 'property' ? imageTypes : [...imageTypes, 'application/pdf']
    if (current.length + picked.length > limit) { setError(`Chỉ được chọn tối đa ${limit} ${kind === 'property' ? 'ảnh phòng' : 'giấy tờ xác minh'}.`); return }
    const invalid = picked.find(file => !allowed.includes(file.type) || file.size > maxFileSize)
    if (invalid) { setError(`Tệp “${invalid.name}” phải đúng định dạng và không vượt quá 10 MB.`); return }
    const added = picked.map(file => {
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      if (previewUrl) previewUrls.current.add(previewUrl)
      return { file, previewUrl }
    })
    if (kind === 'property') setPropertyImages(previous => [...previous, ...added])
    else setVerificationDocuments(previous => [...previous, ...added])
    setError('')
  }
  const removeFile = (kind: UploadKind, index: number) => {
    const files = kind === 'property' ? propertyImages : verificationDocuments
    const previewUrl = files[index]?.previewUrl
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrls.current.delete(previewUrl) }
    if (kind === 'property') setPropertyImages(previous => previous.filter((_, i) => i !== index))
    else setVerificationDocuments(previous => previous.filter((_, i) => i !== index))
    setError('')
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setNotice('')
    if (mode === 'register' && form.role === 'Landlord' && (!propertyImages.length || !verificationDocuments.length)) {
      setError('Chủ phòng cần tải lên 1–3 ảnh phòng và 1–2 giấy tờ xác minh.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'register') {
        if (form.role === 'Landlord') {
          const payload = new FormData()
          payload.append('Name', form.name)
          payload.append('Email', form.email)
          payload.append('Password', form.password)
          if (form.phone.trim()) payload.append('Phone', form.phone.trim())
          propertyImages.forEach(({ file }) => payload.append('PropertyImages', file))
          verificationDocuments.forEach(({ file }) => payload.append('IdentityDocuments', file))
          await api<Registration>('/auth/register/landlord', { method: 'POST', body: payload })
        } else {
          await api<Registration>('/auth/register', json('POST', form))
        }
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
  const uploadField = (kind: UploadKind, title: string, files: SelectedFile[], hint: string) => (
    <div className="auth-upload-group">
      <div className="auth-upload-heading"><strong>{title}</strong><span>{files.length}/{kind === 'property' ? 3 : 2}</span></div>
      <label className="auth-upload-zone">
        <input type="file" multiple accept={kind === 'property' ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,application/pdf'} onChange={event => addFiles(kind, event)} disabled={busy || files.length >= (kind === 'property' ? 3 : 2)} />
        <ImagePlus size={26} aria-hidden="true" />
        <span>Bấm vào đây để thêm {kind === 'property' ? 'ảnh' : 'giấy tờ'}</span>
        <small>{hint}</small>
      </label>
      {files.length > 0 && <ul className="auth-upload-list">{files.map(({ file, previewUrl }, index) => <li key={`${file.name}-${index}`}>
        {previewUrl ? <img src={previewUrl} alt={`Xem trước ${file.name}`} /> : <span className="auth-upload-pdf"><FileText size={23} aria-hidden="true" /></span>}
        <span className="auth-upload-file"><strong>{file.name}</strong><small>{(file.size / (1024 * 1024)).toFixed(1)} MB · {file.type === 'application/pdf' ? 'PDF' : file.type.split('/')[1].toUpperCase()}</small></span>
        <button type="button" aria-label={`Xóa ${file.name}`} onClick={() => removeFile(kind, index)} disabled={busy}><X size={17} /></button>
      </li>)}</ul>}
    </div>
  )
  return <div className="auth-page"><div className="auth-visual"><Link to="/" className="auth-brand"><Home size={22} /> RoomRum</Link><div className="auth-visual-copy"><span>KHÔNG GIAN SỐNG CỦA BẠN</span><h1>{mode === 'login' ? 'Mừng bạn trở lại với RoomRum.' : 'Bắt đầu hành trình tìm nơi ở phù hợp.'}</h1><p>Tìm phòng và kết nối với chủ phòng trong một trải nghiệm rõ ràng.</p></div><div className="auth-pattern" aria-hidden="true"><div /><div /><div /></div></div><div className="auth-form-wrap"><Link to="/" className="auth-back">← Về trang chủ</Link><form className="auth-form" onSubmit={submit}><span className="section-label">{mode === 'login' ? 'ĐĂNG NHẬP' : 'TẠO TÀI KHOẢN'}</span><h2>{mode === 'login' ? 'Chào mừng trở lại' : 'Tham gia RoomRum'}</h2><p>{mode === 'login' ? 'Đăng nhập để tiếp tục quản lý không gian sống của bạn.' : 'Chọn vai trò phù hợp để bắt đầu.'}</p>{mode === 'register' && <><label>Họ và tên<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nhập họ và tên" /></label><label>Vai trò<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="Tenant">Người thuê</option><option value="Landlord">Chủ phòng</option></select></label></>}<label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ten@example.com" /></label>{mode === 'register' && <label>Số điện thoại (không bắt buộc)<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Số điện thoại" /></label>}<label>Mật khẩu<input required minLength={8} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Ít nhất 8 ký tự" /></label>{mode === 'register' && form.role === 'Landlord' && <div className="auth-upload-section"><p>Ảnh phòng và giấy tờ sẽ được gửi cùng hồ sơ đăng ký để xác minh tài khoản chủ phòng.</p>{uploadField('property', 'Ảnh phòng (1–3 ảnh)', propertyImages, 'JPG, JPEG, PNG hoặc WEBP · tối đa 10 MB mỗi ảnh')}{uploadField('verification', 'Giấy tờ xác minh (1–2 tệp)', verificationDocuments, 'JPG, JPEG, PNG, WEBP hoặc PDF · tối đa 10 MB mỗi tệp')}</div>}{error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="form-success" role="status">{notice} <Link to="/login">Đến trang đăng nhập</Link></div>}<button className="button button-primary full" disabled={busy || !!notice}>{busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <ArrowRight size={17} /></button><div className="auth-switch">{mode === 'login' ? <>Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></> : <>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></>}</div></form></div></div>
}
