import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, House, Users } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { ErrorState, Loading, State, shortMoney, useAuth, useResource } from '../../shared/ui'
import type { Sharing, Tenancy } from '../../shared/types'
import { Heading, Notice } from './shared'

export function MySharing() {
  const resource = useResource<Sharing[]>('/sharings?page=1&pageSize=50')
  const tenancies = useResource<Tenancy[]>('/room-tenants/mine?page=1&pageSize=50')
  const { session } = useAuth()
  const [form, setForm] = useState({ roomId: '', title: '', quantity: '1', gender: '', sharingFee: '', introduction: '', rule: '' })
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const mine = resource.data?.filter(item => item.userId === session?.userId) || []
  const activeRooms = tenancies.data?.filter(item => item.status === 'Active') || []

  // Auto-select room if tenant only rents 1 active room
  useEffect(() => {
    if (!form.roomId && activeRooms.length === 1) {
      setForm(prev => ({ ...prev, roomId: activeRooms[0].roomId }))
    }
  }, [activeRooms, form.roomId])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await api('/sharings', json('POST', { ...form, quantity: Number(form.quantity), sharingFee: form.sharingFee ? Number(form.sharingFee) : null }))
      setNotice('Đã đăng lời mời ở ghép.')
      setForm({ roomId: activeRooms.length === 1 ? activeRooms[0].roomId : '', title: '', quantity: '1', gender: '', sharingFee: '', introduction: '', rule: '' })
      resource.reload()
    } catch (cause) {
      setNotice((cause as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await api(`/sharings/${id}`, { method: 'DELETE' })
      setNotice('Đã xóa lời mời ở ghép.')
      resource.reload()
    } catch (cause) {
      setNotice((cause as Error).message)
    }
  }

  return (
    <>
      <Heading eyebrow="NGƯỜI THUÊ" title="Ở ghép" description="Đăng lời mời cho phòng bạn đang thuê và quản lý lời mời của mình." />
      <Notice text={notice} />
      <form className="panel sharing-create" onSubmit={submit}>
        <div className="sharing-create-header">
          <span className="sharing-create-icon"><Users size={22} /></span>
          <div>
            <h2>Đăng lời mời ở ghép</h2>
            <p>Cho mọi người biết về phòng và người bạn muốn ở cùng.</p>
          </div>
        </div>
        <div className="sharing-create-fields">
          <label className="sharing-field-wide">
            Phòng bạn đang thuê <span className="required-mark">*</span>
            <select required value={form.roomId} onChange={e => setForm({ ...form, roomId: e.target.value })}>
              <option value="">Chọn phòng đang thuê</option>
              {activeRooms.map(item => <option key={item.roomId} value={item.roomId}>{item.roomTitle || 'Phòng đang thuê'}</option>)}
            </select>
          </label>
          <label className="sharing-field-wide">
            Tiêu đề lời mời <span className="required-mark">*</span>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ví dụ: Tìm bạn ở ghép phòng gần trường" />
          </label>
          <label>
            Số chỗ cần tìm <span className="required-mark">*</span>
            <input type="number" min="1" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
          </label>
          <label>
            Phí ở ghép / tháng
            <input type="number" min="0" value={form.sharingFee} onChange={e => setForm({ ...form, sharingFee: e.target.value })} placeholder="Nhập số tiền (₫)" />
          </label>
          <label>
            Giới tính mong muốn
            <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
              <option value="">Không yêu cầu</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </label>
          <label className="sharing-field-half">
            Giới thiệu
            <textarea rows={4} value={form.introduction} onChange={e => setForm({ ...form, introduction: e.target.value })} placeholder="Giới thiệu về bạn, căn phòng và sinh hoạt hằng ngày…" />
          </label>
          <label className="sharing-field-half">
            Quy tắc ở chung
            <textarea rows={4} value={form.rule} onChange={e => setForm({ ...form, rule: e.target.value })} placeholder="Ví dụ: Giữ vệ sinh chung, giờ giấc sinh hoạt…" />
          </label>
        </div>
        {activeRooms.length === 0 && !tenancies.loading && <p className="sharing-create-note"><House size={16} /> Bạn cần có phòng đang thuê (trạng thái Hoạt động) để đăng lời mời.</p>}
        <div className="sharing-create-footer">
          <span>Các trường có dấu <span className="required-mark">*</span> là bắt buộc.</span>
          <button className="button button-primary" type="submit" disabled={!form.roomId || submitting}>
            {submitting ? 'Đang đăng…' : 'Đăng lời mời'} <ArrowRight size={17} />
          </button>
        </div>
      </form>
      {resource.loading ? <Loading /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : mine.length ? (
        <div className="record-list">
          {mine.map(item => (
            <article className="panel record" key={item.sharingId}>
              <div className="record-icon"><Users /></div>
              <div className="record-main">
                <h2><Link to={`/sharing/${item.sharingId}`}>{item.title || 'Ở ghép'}</Link></h2>
                <p>{item.roomTitle || item.roomId} · {shortMoney(item.sharingFee)} / tháng</p>
              </div>
              <button className="button button-ghost small" onClick={() => remove(item.sharingId)}>Xóa</button>
            </article>
          ))}
        </div>
      ) : (
        <State title="Bạn chưa có lời mời ở ghép" />
      )}
    </>
  )
}
