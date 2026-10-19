import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { api } from '../../shared/api/client'
import { shortMoney, useResource } from '../../shared/ui'
import type { Favorite } from '../../shared/types'
import { Heading, Notice, DataPanel } from './shared'

export function Favorites() { const resource = useResource<Favorite[]>('/favorites?page=1&pageSize=50'); const [notice, setNotice] = useState(''); const remove = async (id: string) => { try { await api(`/favorites/${id}`, { method: 'DELETE' }); resource.reload(); setNotice('Đã bỏ phòng khỏi danh sách yêu thích.') } catch (cause) { setNotice((cause as Error).message) } }; return <><Heading eyebrow="NGƯỜI THUÊ" title="Phòng yêu thích" description="Những phòng bạn đã lưu để xem lại." /><Notice text={notice} /><DataPanel resource={resource} empty="Chưa lưu phòng nào">{data => <div className="dash-card-grid">{data.map(item => <article className="panel favorite-card" key={item.favoriteId}><div className="favorite-cover">{item.imageUrl ? <img src={item.imageUrl} alt={item.title || 'Phòng trọ'} /> : <Home />}</div><div className="favorite-content"><h2>{item.title || 'Phòng trọ'}</h2><strong>{shortMoney(item.price)} / tháng</strong><div><Link className="button button-primary small" to={`/rooms/${item.roomId}`}>Xem chi tiết</Link><button className="button button-ghost small" onClick={() => remove(item.roomId)}>Bỏ lưu</button></div></div></article>)}</div>}</DataPanel></> }
