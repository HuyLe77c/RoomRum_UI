import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { api } from '../../shared/api/client'
import { ErrorState, Loading, RoomCard, State, useResource } from '../../shared/ui'
import type { RoomSearch } from '../../shared/types'
import { Heading, Notice } from './shared'

const pageSize = 12

export function TenantRooms() {
  const [params, setParams] = useSearchParams()
  const [keyword, setKeyword] = useState(params.get('q') || '')
  const [notice, setNotice] = useState('')
  const page = Math.max(1, Number(params.get('page')) || 1)
  const query = new URLSearchParams(params)
  query.set('page', String(page))
  query.set('pageSize', String(pageSize))
  const { data, loading, error, reload } = useResource<RoomSearch>(`/rooms?${query}`)

  const updateParams = (changes: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (resetPage) next.delete('page')
    setParams(next)
  }
  const search = (event: FormEvent) => {
    event.preventDefault()
    updateParams({ q: keyword.trim() })
  }
  const clear = () => {
    setKeyword('')
    setParams({})
  }
  const favorite = async (roomId: string) => {
    try {
      await api(`/favorites/${roomId}`, { method: 'POST' })
      setNotice('Đã lưu phòng vào danh sách yêu thích.')
    } catch (cause) {
      setNotice((cause as Error).message)
    }
  }

  return <>
    <Heading eyebrow="NGƯỜI THUÊ" title="Danh sách phòng" description="Khám phá các phòng đang có trên RoomRum." />
    <form className="panel tenant-room-filters" onSubmit={search}>
      <label>Tìm phòng
        <input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tên phòng, đường, khu vực…" />
      </label>
      <label>Loại phòng
        <select value={params.get('type') || ''} onChange={event => updateParams({ type: event.target.value })}>
          <option value="">Tất cả</option>
          <option>Phòng trọ</option><option>Studio</option><option>Căn hộ mini</option><option>Ở ghép</option>
        </select>
      </label>
      <label>Sắp xếp
        <select value={params.get('sort') || 'relevance'} onChange={event => updateParams({ sort: event.target.value === 'relevance' ? '' : event.target.value })}>
          <option value="relevance">Mặc định</option>
          <option value="priceAsc">Giá thấp trước</option>
          <option value="priceDesc">Giá cao trước</option>
          <option value="areaDesc">Diện tích lớn trước</option>
        </select>
      </label>
      <button className="button button-primary" type="submit"><Search size={17} /> Tìm</button>
    </form>
    <Notice text={notice} />
    <div className="tenant-room-count">{loading ? 'Đang tải phòng…' : `${data?.total ?? 0} phòng phù hợp`}</div>
    {loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} /> : data?.items.length ? <>
      <div className="room-grid tenant-room-grid">{data.items.map(room => <RoomCard key={room.roomId} room={room} onFavorite={favorite} />)}</div>
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) }, false)}><ChevronLeft size={18} /> Trước</button>
        <span>Trang {page} / {Math.max(1, Math.ceil(data.total / pageSize))}</span>
        <button disabled={page * pageSize >= data.total} onClick={() => updateParams({ page: String(page + 1) }, false)}>Tiếp <ChevronRight size={18} /></button>
      </div>
    </> : <State title="Không tìm thấy phòng phù hợp" description="Hãy thử đổi từ khóa hoặc loại phòng." action={<button className="button button-secondary" onClick={clear}>Xóa bộ lọc</button>} />}
  </>
}
