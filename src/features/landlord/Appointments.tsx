import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { ErrorState, Loading, State, date, useResource } from '../../shared/ui'
import type { Appointment } from '../../shared/types'
import { label, Status, Heading, Feedback } from './shared'

export function LandlordAppointments() {
  const resource = useResource<Appointment[]>('/appointments/mine?page=1&pageSize=100')
  const [filter, setFilter] = useState('Pending')
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const update = async (id: string, status: string) => { setBusy(id); setProblem(''); try { await api(`/appointments/${id}/status`, json('PATCH', { status })); setNotice(`Đã cập nhật lịch hẹn: ${label(status).toLowerCase()}.`); resource.reload() } catch (cause) { setProblem((cause as Error).message) } finally { setBusy(null) } }
  const items = (resource.data || []).filter(item => filter === 'All' || item.status === filter)
  return <><Heading title="Lịch xem phòng" description="Xác nhận hoặc từ chối yêu cầu xem phòng từ người tìm thuê." /><Feedback message={notice} /><Feedback message={problem} error /><div className="landlord-list-bar"><div className="landlord-tabs">{[['Pending', 'Chờ xử lý'], ['Confirmed', 'Đã xác nhận'], ['Completed', 'Hoàn tất'], ['All', 'Tất cả']].map(([value, title]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{title}</button>)}</div></div>{resource.loading ? <Loading /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : items.length ? <div className="record-list">{items.map(item => <article className="panel record landlord-record" key={item.appointmentId}><div className="record-icon"><CalendarDays /></div><div className="record-main"><h2>{item.roomTitle || 'Phòng trọ'}</h2><p>{item.guestName} · {date(item.appointmentDate)} lúc {item.appointmentTime.slice(0, 5)}</p>{item.description && <small>{item.description}</small>}</div><Status value={item.status} /><div className="record-actions"><Link className="button button-ghost small" to={`/rooms/${item.roomId}`}>Xem phòng</Link>{item.status === 'Pending' && <><button className="button button-primary small" disabled={busy === item.appointmentId} onClick={() => update(item.appointmentId, 'Confirmed')}>Xác nhận</button><button className="button button-ghost small" disabled={busy === item.appointmentId} onClick={() => update(item.appointmentId, 'Rejected')}>Từ chối</button></>}{item.status === 'Confirmed' && <button className="button button-primary small" disabled={busy === item.appointmentId} onClick={() => update(item.appointmentId, 'Completed')}>Hoàn tất</button>}</div></article>)}</div> : <State title="Chưa có lịch hẹn trong nhóm này" description="Lịch mới sẽ xuất hiện khi người tìm thuê đặt hẹn." />}</>
}
