import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import { api } from '../../shared/api/client'
import { ErrorState, Footer, Header, Loading, RoomCard, State, money, useAuth, useResource } from '../../shared/ui'
import type { Amenity, RoomSearch } from '../../shared/types'

type Filters = {
  q: string; type: string; minPrice: string; maxPrice: string; minArea: string; maxArea: string
  maxDeposit: string; maxMoveInCost: string; maxMonthlyCost: string; occupants: string
  monthlyKwh: string; amenityIds: string[]; sort: string
}

function readFilters(params: URLSearchParams): Filters {
  return {
    q: params.get('q') || '', type: params.get('type') || '',
    minPrice: params.get('minPrice') || '', maxPrice: params.get('maxPrice') || '',
    minArea: params.get('minArea') || '', maxArea: params.get('maxArea') || '',
    maxDeposit: params.get('maxDeposit') || '', maxMoveInCost: params.get('maxMoveInCost') || '',
    maxMonthlyCost: params.get('maxMonthlyCost') || '', occupants: params.get('occupants') || '1',
    monthlyKwh: params.get('monthlyKwh') || '100', amenityIds: params.getAll('amenityIds'),
    sort: params.get('sort') || 'relevance',
  }
}

function buildParams(filters: Filters, page = 1): URLSearchParams {
  const params = new URLSearchParams()
  const keys: (keyof Filters)[] = [
    'q', 'type', 'minPrice', 'maxPrice', 'minArea', 'maxArea', 'maxDeposit',
    'maxMoveInCost', 'maxMonthlyCost', 'sort',
  ]
  for (const key of keys) {
    const value = filters[key]
    if (typeof value === 'string' && value.trim() && !(key === 'sort' && value === 'relevance'))
      params.set(key, value.trim())
  }
  if (filters.maxMonthlyCost || filters.sort === 'monthlyCostAsc') {
    params.set('occupants', filters.occupants || '1')
    params.set('monthlyKwh', filters.monthlyKwh || '100')
  }
  for (const id of filters.amenityIds) params.append('amenityIds', id)
  params.set('page', String(page))
  return params
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const serializedParams = params.toString()
  const [draft, setDraft] = useState<Filters>(() => readFilters(params))
  const [notice, setNotice] = useState('')
  const { session } = useAuth()
  const { data: amenities } = useResource<Amenity[]>('/rooms/amenities?page=1&pageSize=100')
  useEffect(() => setDraft(readFilters(new URLSearchParams(serializedParams))), [serializedParams])

  const page = Math.max(1, Number(params.get('page') || 1) || 1)
  const apiParams = new URLSearchParams(params)
  for (const key of ['latitude', 'longitude', 'maxDistanceKm', 'locationLabel']) apiParams.delete(key)
  if (apiParams.get('sort') === 'distance') apiParams.delete('sort')
  apiParams.set('page', String(page))
  apiParams.set('pageSize', '12')
  const { data, loading, error, reload } = useResource<RoomSearch>(`/rooms?${apiParams}`)
  const apply = (event: FormEvent) => {
    event.preventDefault()
    const pairs: [string, string, string][] = [
      ['minPrice', 'maxPrice', 'giá'], ['minArea', 'maxArea', 'diện tích'],
    ]
    for (const [low, high, label] of pairs) {
      const minimum = draft[low as keyof Filters] as string
      const maximum = draft[high as keyof Filters] as string
      if (minimum && maximum && Number(minimum) > Number(maximum)) {
        setNotice(`Giá trị từ của ${label} phải nhỏ hơn hoặc bằng giá trị đến.`); return
      }
    }
    setNotice(''); setParams(buildParams(draft))
  }
  const update = (key: keyof Filters, value: string) => setDraft(previous => ({ ...previous, [key]: value }))
  const changeSort = (value: string) => setParams(buildParams({ ...readFilters(params), sort: value }))
  const changePage = (nextPage: number) => setParams(buildParams(readFilters(params), nextPage))
  const favorite = async (id: string) => {
    if (!session) { setNotice('Hãy đăng nhập để lưu phòng yêu thích.'); return }
    try { await api(`/favorites/${id}`, { method: 'POST' }); setNotice('Đã lưu phòng vào danh sách yêu thích.') }
    catch (cause) { setNotice((cause as Error).message) }
  }

  return <><Header /><main className="search-page"><div className="container">
    <div className="page-title"><span className="section-label">TÌM PHÒNG NÂNG CAO</span><h1>Tìm nơi ở vừa nhu cầu, vừa ngân sách</h1><p>Kết hợp giá, chi phí sinh hoạt và tiện ích trong cùng một lần tìm.</p></div>
    <div className="search-layout advanced-search-layout"><aside className="filter-panel advanced-filter-panel">
      <div className="filter-title"><SlidersHorizontal size={20} /><h2>Bộ lọc chi tiết</h2></div>
      <form onSubmit={apply} className="form-stack advanced-filter-form">
        <fieldset><legend>Phòng bạn cần</legend>
          <label>Từ khóa<input value={draft.q} onChange={e => update('q', e.target.value)} placeholder="Tên phòng, đường, khu vực…" /></label>
          <label>Loại phòng<select value={draft.type} onChange={e => update('type', e.target.value)}><option value="">Tất cả</option><option>Phòng trọ</option><option>Studio</option><option>Căn hộ mini</option><option>Ở ghép</option></select></label>
          <div className="form-pair"><label>Giá từ (₫)<input type="number" min="0" value={draft.minPrice} onChange={e => update('minPrice', e.target.value)} placeholder="0" /></label><label>Giá đến (₫)<input type="number" min="0" value={draft.maxPrice} onChange={e => update('maxPrice', e.target.value)} placeholder="Không giới hạn" /></label></div>
          <div className="form-pair"><label>Diện tích từ (m²)<input type="number" min="0" step="0.01" value={draft.minArea} onChange={e => update('minArea', e.target.value)} /></label><label>Diện tích đến (m²)<input type="number" min="0" step="0.01" value={draft.maxArea} onChange={e => update('maxArea', e.target.value)} /></label></div>
        </fieldset>
        <fieldset><legend>Ngân sách thực tế</legend>
          <label>Cọc tối đa (₫)<input type="number" min="0" value={draft.maxDeposit} onChange={e => update('maxDeposit', e.target.value)} placeholder="Không giới hạn" /></label>
          <label>Thuê + cọc lúc vào ở (₫)<input type="number" min="0" value={draft.maxMoveInCost} onChange={e => update('maxMoveInCost', e.target.value)} placeholder="Không giới hạn" /></label>
          <label>Chi phí tháng ước tính tối đa (₫)<input type="number" min="0" value={draft.maxMonthlyCost} onChange={e => update('maxMonthlyCost', e.target.value)} placeholder="Không giới hạn" /></label>
          <div className="form-pair"><label>Số người<input type="number" min="1" max="10" value={draft.occupants} onChange={e => update('occupants', e.target.value)} /></label><label>Điện dự kiến (kWh)<input type="number" min="0" max="2000" value={draft.monthlyKwh} onChange={e => update('monthlyKwh', e.target.value)} /></label></div>
          <p className="filter-explainer">Tạm tính = tiền thuê + phí dịch vụ + nước × số người + điện × kWh. Phòng thiếu mức phí sẽ không hiện khi lọc theo chi phí tháng.</p>
        </fieldset>
        <fieldset><legend>Tiện ích cần có</legend>
          <div className="amenity-checks">{amenities?.map(item => <label key={item.amenityId}><input type="checkbox" checked={draft.amenityIds.includes(item.amenityId)} onChange={e => setDraft(previous => ({ ...previous, amenityIds: e.target.checked ? [...previous.amenityIds, item.amenityId] : previous.amenityIds.filter(id => id !== item.amenityId) }))} />{item.amenityName}</label>) || <span>Đang tải tiện ích…</span>}</div>
          <p className="filter-explainer">Phòng cần có tất cả tiện ích đã chọn.</p>
        </fieldset>
        <button className="button button-primary full" type="submit"><Search size={17} /> Áp dụng bộ lọc</button>
        <button type="button" className="button button-ghost full" onClick={() => { setNotice(''); setParams({}) }}>Xóa bộ lọc</button>
      </form>
    </aside><section className="search-results"><div className="result-toolbar advanced-result-toolbar"><div><strong>{loading ? 'Đang tìm…' : `${data?.total ?? 0} phòng phù hợp`}</strong><span>{params.get('q') ? `Kết quả cho “${params.get('q')}”` : 'Tất cả khu vực'}</span></div><div className="result-toolbar-actions"><label>Sắp xếp<select aria-label="Sắp xếp kết quả" value={params.get('sort') || 'relevance'} onChange={e => changeSort(e.target.value)}><option value="relevance">Mặc định</option><option value="priceAsc">Giá thấp trước</option><option value="priceDesc">Giá cao trước</option><option value="areaDesc">Diện tích lớn trước</option><option value="monthlyCostAsc">Chi phí tháng thấp trước</option></select></label></div></div>
      {notice && <div className="inline-notice" role="status">{notice}</div>}
      {loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} /> : data?.items.length ? <><div className="room-grid results-grid">{data.items.map(room => <div className="advanced-room-result" key={room.roomId}><RoomCard room={room} onFavorite={favorite} /><div className="advanced-room-metrics">{room.estimatedMonthlyCost != null && <span>Ước tính {money(room.estimatedMonthlyCost)} / tháng</span>}</div></div>)}</div><div className="pagination"><button disabled={page <= 1} onClick={() => changePage(page - 1)}><ChevronLeft size={18} /> Trước</button><span>Trang {page} / {Math.max(1, Math.ceil(data.total / 12))}</span><button disabled={page * 12 >= data.total} onClick={() => changePage(page + 1)}>Tiếp <ChevronRight size={18} /></button></div></> : <State title="Không tìm thấy phòng phù hợp" description="Thử nới rộng khoảng giá hoặc bỏ bớt tiện ích." action={<button className="button button-secondary" onClick={() => setParams({})}>Xóa bộ lọc</button>} />}
    </section></div></div></main><Footer /></>
}
