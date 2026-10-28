import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Users } from 'lucide-react'
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
    try {
      await api('/sharings', json('POST', { ...form, quantity: Number(form.quantity), sharingFee: form.sharingFee ? Number(form.sharingFee) : null }))
      setNotice('Đã đăng lời mời ở ghép.')
      setForm({ roomId: activeRooms.length === 1 ? activeRooms[0].roomId : '', title: '', quantity: '1', gender: '', sharingFee: '', introduction: '', rule: '' })
      resource.reload()
    } catch (cause) {
      setNotice((cause as Error).message)
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
      <form className="panel inline-form" onSubmit={submit}>
        <h2>Đăng lời mời mới</h2>
        <label>
          Phòng bạn đang thuê *
          <select
            required
            value={form.roomId}
            onChange={e => setForm({ ...form, roomId: e.target.value })}
          >
            <option value="">-- Chọn phòng đang thuê --</option>
            {activeRooms.map(item => (
              <option key={item.roomId} value={item.roomId}>
                {item.roomTitle || 'Phòng đang thuê'}
              </option>
            ))}
          </select>
          {activeRooms.length === 0 && !tenancies.loading && (
            <small style={{ color: 'var(--text-muted, #666)' }}>
              Bạn cần có phòng đang thuê (trạng thái Hoạt động) để đăng tìm người ở ghép.
            </small>
          )}
        </label>
        <label>Tiêu đề<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
        <label>Số chỗ<input type="number" min="1" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></label>
        <label>Phí ở ghép<input type="number" min="0" value={form.sharingFee} onChange={e => setForm({ ...form, sharingFee: e.target.value })} /></label>
        <label>Giới tính mong muốn<input value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} /></label>
        <label>Giới thiệu<input value={form.introduction} onChange={e => setForm({ ...form, introduction: e.target.value })} /></label>
        <button className="button button-primary" type="submit" disabled={!form.roomId}>Đăng lời mời</button>
      </form>
      {resource.loading ? <Loading /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : mine.length ? (
        <div className="record-list">
          {mine.map(item => (
            <article className="panel record" key={item.sharingId}>
              <div className="record-icon"><Users /></div>
              <div className="record-main">
                <h2>{item.title || 'Ở ghép'}</h2>
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
