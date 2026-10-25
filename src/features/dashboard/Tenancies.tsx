import { useState } from 'react'
import type { FormEvent } from 'react'
import { Home } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { date, useResource } from '../../shared/ui'
import type { OwnedRoom, Tenancy } from '../../shared/types'
import { Heading, Badge, Notice, DataPanel } from './shared'
import type { RolePath } from './shared'

export function Tenancies({ role }: { role: RolePath }) {
  const resource = useResource<Tenancy[]>('/room-tenants/mine?page=1&pageSize=50')
  const rooms = useResource<OwnedRoom[]>(role === 'landlord' ? '/rooms/mine?page=1&pageSize=100' : null)
  const [notice, setNotice] = useState('')
  const [invite, setInvite] = useState({ roomId: '', email: '' })
  const [history, setHistory] = useState<{ key: string; items: { status: string; hiredAt: string; leftAt: string | null }[] } | null>(null)

  const act = async (path: string) => {
    try {
      await api(path, { method: 'PATCH' })
      setNotice('Đã cập nhật quan hệ thuê.')
      resource.reload()
    } catch (cause) {
      setNotice((cause as Error).message)
    }
  }

  const sendInvite = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await api(`/room-tenants/${invite.roomId}/invite-by-email`, json('POST', { email: invite.email.trim() }))
      setNotice('Đã gửi lời mời thuê phòng đến email người thuê.')
      setInvite({ roomId: '', email: '' })
      resource.reload()
    } catch (cause) {
      setNotice((cause as Error).message)
    }
  }

  const loadHistory = async (item: Tenancy) => {
    try {
      const page = await api<{ items: { status: string; hiredAt: string; leftAt: string | null }[] }>(`/room-tenants/${item.roomId}/${item.userId}/history?page=1&pageSize=20`)
      setHistory({ key: `${item.roomId}-${item.userId}`, items: page.items })
    } catch (cause) {
      setNotice((cause as Error).message)
    }
  }

  return (
    <>
      <Heading
        eyebrow={role === 'tenant' ? 'NGƯỜI THUÊ' : 'CHỦ PHÒNG'}
        title={role === 'tenant' ? 'Phòng đang thuê' : 'Quản lý người thuê'}
        description="Lời mời, trạng thái thuê và lịch sử được lấy từ RoomRum."
      />
      <Notice text={notice} />

      {role === 'landlord' && (
        <form className="panel inline-form" onSubmit={sendInvite}>
          <h2>Mời người thuê</h2>
          <label>
            Phòng của bạn *
            <select
              required
              value={invite.roomId}
              onChange={e => setInvite({ ...invite, roomId: e.target.value })}
            >
              <option value="">-- Chọn phòng --</option>
              {rooms.data?.filter(r => r.status !== 'Hidden').map(r => (
                <option key={r.roomId} value={r.roomId}>
                  {r.title || r.roomId}
                </option>
              ))}
            </select>
          </label>
          <label>
            Email người thuê *
            <input
              required
              type="email"
              value={invite.email}
              onChange={e => setInvite({ ...invite, email: e.target.value })}
              placeholder="email@vidu.com"
            />
          </label>
          <button className="button button-primary" type="submit" disabled={!invite.roomId}>
            Gửi lời mời
          </button>
        </form>
      )}

      <DataPanel resource={resource} empty="Chưa có quan hệ thuê">
        {data => (
          <div className="record-list">
            {data.map(item => (
              <article className="panel record tenancy-record" key={`${item.roomId}-${item.userId}`}>
                <div className="record-icon"><Home /></div>
                <div className="record-main">
                  <h2>{item.roomTitle || 'Phòng trọ'}</h2>
                  <p>Bắt đầu: {date(item.hiredAt)}</p>
                  <small>Người thuê: {item.tenantName || item.userId}</small>
                  {history?.key === `${item.roomId}-${item.userId}` && (
                    <div className="history-list">
                      {history.items.map((period, index) => (
                        <p key={index}>{date(period.hiredAt)} – {date(period.leftAt)} · {period.status}</p>
                      ))}
                    </div>
                  )}
                </div>
                <Badge status={item.status} />
                <div className="record-actions">
                  {role === 'tenant' && item.status === 'Pending' && (
                    <button className="button button-primary small" onClick={() => act(`/room-tenants/${item.roomId}/accept`)}>
                      Chấp nhận
                    </button>
                  )}
                  {['Pending', 'Active'].includes(item.status) && (
                    <button className="button button-secondary small" onClick={() => act(`/room-tenants/${item.roomId}/${item.userId}/end`)}>
                      {item.status === 'Pending' ? 'Hủy lời mời' : 'Kết thúc thuê'}
                    </button>
                  )}
                  <button className="button button-ghost small" onClick={() => loadHistory(item)}>
                    Lịch sử
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </DataPanel>
    </>
  )
}
