import { useState } from 'react'
import { Check, Wrench } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { ErrorState, Loading, State, date, useResource } from '../../shared/ui'
import type { Repair } from '../../shared/types'
import { Status, Heading, Feedback } from './shared'

export function LandlordRepairs() {
  const resource = useResource<Repair[]>('/repairs/mine?page=1&pageSize=100')
  const [drafts, setDrafts] = useState<Record<string, { status: string; response: string }>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const save = async (item: Repair) => { const draft = drafts[item.maintenanceId] || { status: item.status || 'Pending', response: item.response || '' }; setBusy(item.maintenanceId); setProblem(''); try { await api(`/repairs/${item.maintenanceId}`, json('PATCH', draft)); setNotice('Đã lưu phản hồi sửa chữa.'); resource.reload() } catch (cause) { setProblem((cause as Error).message) } finally { setBusy(null) } }
  const change = (item: Repair, key: 'status' | 'response', value: string) => setDrafts(previous => ({ ...previous, [item.maintenanceId]: { status: previous[item.maintenanceId]?.status ?? item.status ?? 'Pending', response: previous[item.maintenanceId]?.response ?? item.response ?? '', [key]: value } }))
  return <><Heading title="Yêu cầu sửa chữa" description="Xem sự cố do người thuê gửi và lưu phản hồi sau khi xử lý." /><Feedback message={notice} /><Feedback message={problem} error />{resource.loading ? <Loading /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : resource.data?.length ? <div className="landlord-repairs">{resource.data.map(item => <article className="panel landlord-repair-card" key={item.maintenanceId}><div className="landlord-repair-head"><span className="landlord-row-icon"><Wrench size={19} /></span><div><h2>{item.repairItems || 'Yêu cầu sửa chữa'}</h2><small>{item.roomTitle || item.roomId} · {item.tenantName}</small></div><Status value={item.status} /></div><p>{item.description || 'Người thuê chưa cung cấp mô tả.'}</p><div className="landlord-repair-facts"><span>Ưu tiên: <strong>{item.priority || 'Chưa đặt'}</strong></span><span>Ngày mong muốn: <strong>{date(item.expectingDate)}</strong></span></div><div className="landlord-repair-controls"><label>Trạng thái<select value={drafts[item.maintenanceId]?.status ?? item.status ?? 'Pending'} onChange={e => change(item, 'status', e.target.value)}><option value="Pending">Đang chờ</option><option value="InProgress">Đang xử lý</option><option value="Completed">Hoàn tất</option><option value="Rejected">Từ chối</option></select></label><label>Phản hồi người thuê<textarea rows={2} value={drafts[item.maintenanceId]?.response ?? item.response ?? ''} onChange={e => change(item, 'response', e.target.value)} placeholder="Cập nhật hướng xử lý hoặc lịch sửa chữa" /></label><button className="button button-primary small" disabled={busy === item.maintenanceId} onClick={() => save(item)}><Check size={15} /> {busy === item.maintenanceId ? 'Đang lưu…' : 'Lưu phản hồi'}</button></div></article>)}</div> : <State title="Chưa có yêu cầu sửa chữa" description="Yêu cầu từ người thuê sẽ xuất hiện tại đây." />}</>
}
