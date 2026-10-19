import { useState } from 'react'
import type { FormEvent } from 'react'
import { ShieldCheck } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { date, useResource } from '../../shared/ui'
import type { Report } from '../../shared/types'
import { Heading, Badge, Notice, DataPanel } from './shared'
import type { RolePath } from './shared'

export function Reports({ role }: { role: RolePath }) { const resource = useResource<Report[]>('/reports/mine?page=1&pageSize=50'); const [form, setForm] = useState({ roomId: '', reason: '' }); const [notice, setNotice] = useState('')
  const submit = async (event: FormEvent) => { event.preventDefault(); try { await api('/reports', json('POST', form)); setNotice('Đã gửi báo cáo.'); setForm({ roomId: '', reason: '' }); resource.reload() } catch (cause) { setNotice((cause as Error).message) } }
  const update = async (id: string, status: string) => { try { await api(`/reports/${id}/status`, json('PATCH', { status })); setNotice('Đã cập nhật trạng thái báo cáo.'); resource.reload() } catch (cause) { setNotice((cause as Error).message) } }
  return <><Heading eyebrow={role === 'admin' ? 'QUẢN TRỊ' : 'NGƯỜI THUÊ'} title="Báo cáo" description={role === 'admin' ? 'Xem và xử lý báo cáo từ người dùng.' : 'Theo dõi những báo cáo bạn đã gửi.'} /><Notice text={notice} />{role === 'tenant' && <form className="panel inline-form" onSubmit={submit}><h2>Gửi báo cáo</h2><label>ID phòng<input required value={form.roomId} onChange={e => setForm({ ...form, roomId: e.target.value })} /></label><label>Lý do<input required value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></label><button className="button button-primary" type="submit">Gửi báo cáo</button></form>}<DataPanel resource={resource} empty="Chưa có báo cáo">{data => <div className="record-list">{data.map(item => <article className="panel record" key={item.reportId}><div className="record-icon"><ShieldCheck /></div><div className="record-main"><h2>{item.reason || 'Báo cáo phòng'}</h2><p>Phòng: {item.roomId} · {date(item.reportDate)}</p></div><Badge status={item.status} />{role === 'admin' && <div className="record-actions"><button className="button button-primary small" onClick={() => update(item.reportId, 'Resolved')}>Giải quyết</button><button className="button button-ghost small" onClick={() => update(item.reportId, 'Rejected')}>Từ chối</button></div>}</article>)}</div>}</DataPanel></> }
