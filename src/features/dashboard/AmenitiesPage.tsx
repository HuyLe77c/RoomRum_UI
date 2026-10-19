import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Plus } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { useResource } from '../../shared/ui'
import type { Amenity } from '../../shared/types'
import { Heading, Notice, DataPanel } from './shared'

export function AmenitiesPage() { const resource = useResource<Amenity[]>('/rooms/amenities?page=1&pageSize=50'); const [name, setName] = useState(''); const [notice, setNotice] = useState(''); const submit = async (event: FormEvent) => { event.preventDefault(); try { await api('/admin/amenities', json('POST', { name })); setName(''); setNotice('Đã thêm tiện nghi.'); resource.reload() } catch (cause) { setNotice((cause as Error).message) } }; return <><Heading eyebrow="QUẢN TRỊ" title="Tiện nghi" description="Danh mục tiện nghi dùng cho các phòng trên RoomRum." /><Notice text={notice} /><form className="panel inline-form" onSubmit={submit}><h2>Thêm tiện nghi</h2><label>Tên tiện nghi<input required value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Máy lạnh" /></label><button className="button button-primary" type="submit"><Plus size={16} /> Thêm</button></form><DataPanel resource={resource} empty="Chưa có tiện nghi">{data => <div className="amenity-list">{data.map(item => <span className="panel" key={item.amenityId}><Check size={17} />{item.amenityName}</span>)}</div>}</DataPanel></> }
