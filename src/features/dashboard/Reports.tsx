import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { date, useResource } from '../../shared/ui'
import type { Report, RoomSearch } from '../../shared/types'
import { Heading, Badge, Notice, DataPanel } from './shared'
import type { RolePath } from './shared'

export function Reports({ role }: { role: RolePath }) {
  const [searchParams] = useSearchParams()
  const paramRoomId = searchParams.get('roomId') || ''
  const paramTitle = searchParams.get('title') || ''

  const resource = useResource<Report[]>(role === 'admin' ? '/reports/pending?page=1&pageSize=50' : '/reports/mine?page=1&pageSize=50')
  const availableRooms = useResource<RoomSearch>(role === 'tenant' && !paramRoomId ? '/rooms?page=1&pageSize=50' : null)

  const [form, setForm] = useState({ roomId: paramRoomId, reason: '' })
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (paramRoomId) {
      setForm(prev => ({ ...prev, roomId: paramRoomId }))
    }
  }, [paramRoomId])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await api('/reports', json('POST', form))
      setNotice('Đã gửi báo cáo vi phạm phòng thành công.')
      setForm({ roomId: paramRoomId || '', reason: '' })
      resource.reload()
    } catch (cause) {
      setNotice((cause as Error).message)
    }
  }

  const update = async (id: string, status: string) => {
    try {
      await api(`/reports/${id}/status`, json('PATCH', { status }))
      setNotice('Đã cập nhật trạng thái báo cáo.')
      resource.reload()
    } catch (cause) {
      setNotice((cause as Error).message)
    }
  }

  return (
    <>
      <Heading
        eyebrow={role === 'admin' ? 'QUẢN TRỊ' : 'NGƯỜI THUÊ'}
        title="Báo cáo phòng"
        description={role === 'admin' ? 'Xem và xử lý báo cáo từ người dùng.' : 'Theo dõi và gửi báo cáo về các phòng vi phạm trên hệ thống.'}
      />
      <Notice text={notice} />

      {role === 'tenant' && (
        <form className="panel inline-form" onSubmit={submit}>
          <h2>Gửi báo cáo vi phạm</h2>

          {paramRoomId ? (
            <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.8rem', background: 'var(--surface-muted, #f8f9fa)', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #666)' }}>Phòng được báo cáo: </span>
              <strong>{paramTitle || paramRoomId}</strong>
              <Link to={`/rooms/${paramRoomId}`} style={{ marginLeft: '0.75rem', fontSize: '0.85rem' }}>Xem phòng</Link>
            </div>
          ) : (
            <label>
              Chọn phòng cần báo cáo *
              <select
                required
                value={form.roomId}
                onChange={e => setForm({ ...form, roomId: e.target.value })}
              >
                <option value="">-- Chọn phòng vi phạm --</option>
                {availableRooms.data?.items.map(r => (
                  <option key={r.roomId} value={r.roomId}>
                    {r.title || 'Phòng trọ'} {r.address ? `(${r.address})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Lý do vi phạm *
            <input
              required
              list="report-reasons"
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              placeholder="Chọn hoặc nhập lý do..."
            />
            <datalist id="report-reasons">
              <option value="Thông tin phòng không đúng thực tế" />
              <option value="Giá thuê sai lệch so với tin đăng" />
              <option value="Phòng đã cho thuê nhưng vẫn để trạng thái trống" />
              <option value="Nghi ngờ có dấu hiệu lừa đảo đặt cọc" />
              <option value="Chủ phòng không liên lạc được" />
              <option value="Hình ảnh giả mạo hoặc vi phạm tiêu chuẩn cộng đồng" />
            </datalist>
          </label>

          <button className="button button-primary" type="submit" disabled={!form.roomId}>
            Gửi báo cáo
          </button>
        </form>
      )}

      <DataPanel resource={resource} empty="Chưa có báo cáo">
        {data => (
          <div className="record-list">
            {data.map(item => (
              <article className="panel record" key={item.reportId}>
                <div className="record-icon"><ShieldCheck /></div>
                <div className="record-main">
                  <h2>{item.reason || 'Báo cáo phòng'}</h2>
                  <p>Phòng: {item.roomTitle || item.roomId} · {date(item.reportDate)}</p>
                </div>
                <Badge status={item.status} />
                {role === 'admin' && (
                  <div className="record-actions">
                    <button className="button button-primary small" onClick={() => update(item.reportId, 'Resolved')}>Giải quyết</button>
                    <button className="button button-ghost small" onClick={() => update(item.reportId, 'Rejected')}>Từ chối</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </DataPanel>
    </>
  )
}
