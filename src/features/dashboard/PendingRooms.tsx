import { useState } from 'react'
import { api, json } from '../../shared/api/client'
import { useResource } from '../../shared/ui'
import { DataPanel, Heading, Notice } from './shared'

type PendingRoom = { roomId: string; userId: string; title: string | null; address: string | null; status: string }

export function PendingRooms() {
  const rooms = useResource<PendingRoom[]>('/admin/rooms/pending?page=1&pageSize=100')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const review = async (roomId: string, status: 'Available' | 'Cancelled') => {
    setBusy(roomId); setNotice('')
    try {
      await api(`/admin/rooms/${roomId}/review`, json('PATCH', { status }))
      setNotice(status === 'Available' ? 'Đã duyệt phòng.' : 'Đã từ chối phòng.')
      rooms.reload()
    } catch (error) { setNotice((error as Error).message) } finally { setBusy(null) }
  }
  return <><Heading eyebrow="QUẢN TRỊ" title="Phòng chờ duyệt" description="Duyệt phòng trước khi hiển thị công khai." />
    <Notice text={notice} />
    <DataPanel resource={rooms} empty="Không có phòng chờ duyệt">{items =>
      <div className="record-list">{items.map(room => <article className="panel record" key={room.roomId}>
        <div className="record-main"><h2>{room.title || 'Phòng chưa có tiêu đề'}</h2><p>{room.address || 'Chưa có địa chỉ'}</p><small>Chủ phòng: {room.userId}</small></div>
        <div className="record-actions"><button className="button button-primary small" disabled={busy === room.roomId} onClick={() => review(room.roomId, 'Available')}>Duyệt</button>
          <button className="button button-ghost small" disabled={busy === room.roomId} onClick={() => review(room.roomId, 'Cancelled')}>Từ chối</button></div>
      </article>)}</div>}</DataPanel></>
}
