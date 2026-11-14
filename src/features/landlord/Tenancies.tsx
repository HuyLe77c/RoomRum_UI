import { useEffect, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Users } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { ErrorState, Loading, State, date, useResource } from '../../shared/ui'
import type { OwnedRoom, Tenancy } from '../../shared/types'
import { label, Status, Heading, Feedback } from './shared'

type TenantCandidate = { userId: string; name: string; email: string }

export function LandlordTenancies() {
  const rooms = useResource<OwnedRoom[]>('/rooms/mine?page=1&pageSize=100')
  const tenancies = useResource<Tenancy[]>('/room-tenants/mine?page=1&pageSize=100')
  const [roomId, setRoomId] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [selectedTenant, setSelectedTenant] = useState<TenantCandidate | null>(null)
  const [candidates, setCandidates] = useState<TenantCandidate[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [activeCandidate, setActiveCandidate] = useState(0)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const [history, setHistory] = useState<{ key: string; items: { status: string; hiredAt: string; leftAt: string | null }[] } | null>(null)

  useEffect(() => {
    const term = tenantName.trim()
    if (!term || selectedTenant) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      setSearchError('')
      try {
        const matches = await api<TenantCandidate[]>(`/room-tenants/candidates?name=${encodeURIComponent(term)}`, { signal: controller.signal })
        if (!controller.signal.aborted) { setCandidates(matches); setActiveCandidate(0) }
      } catch (cause) {
        if (!controller.signal.aborted) setSearchError((cause as Error).message)
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [tenantName, selectedTenant])

  const chooseTenant = (tenant: TenantCandidate) => {
    setSelectedTenant(tenant)
    setTenantName(tenant.name)
    setCandidates([])
    setSuggestionsOpen(false)
    setSearching(false)
    setSearchError('')
  }

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') { setSuggestionsOpen(false); return }
    if (!suggestionsOpen || !candidates.length) return
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveCandidate(index => (index + 1) % candidates.length) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveCandidate(index => (index - 1 + candidates.length) % candidates.length) }
    if (event.key === 'Enter') { event.preventDefault(); chooseTenant(candidates[activeCandidate]) }
  }

  const invite = async (event: FormEvent) => {
    event.preventDefault()
    if (!roomId || !selectedTenant) return
    setBusy(true)
    setProblem('')
    try {
      await api(`/room-tenants/${roomId}/invite-by-email`, json('POST', { email: selectedTenant.email }))
      setNotice('Đã gửi lời mời thuê phòng.')
      setTenantName('')
      setSelectedTenant(null)
      setCandidates([])
      tenancies.reload()
    } catch (cause) { setProblem((cause as Error).message) }
    finally { setBusy(false) }
  }
  const end = async (item: Tenancy) => { if (!window.confirm(item.status === 'Pending' ? 'Hủy lời mời này?' : 'Kết thúc quan hệ thuê phòng này?')) return; try { await api(`/room-tenants/${item.roomId}/${item.userId}/end`, { method: 'PATCH' }); setNotice('Đã cập nhật quan hệ thuê.'); tenancies.reload() } catch (cause) { setProblem((cause as Error).message) } }
  const loadHistory = async (item: Tenancy) => { try { const page = await api<{ items: { status: string; hiredAt: string; leftAt: string | null }[] }>(`/room-tenants/${item.roomId}/${item.userId}/history?page=1&pageSize=20`); setHistory({ key: `${item.roomId}-${item.userId}`, items: page.items }) } catch (cause) { setProblem((cause as Error).message) } }

  const showSuggestions = suggestionsOpen && !!tenantName.trim() && !selectedTenant

  return <>
    <Heading title="Quản lý người thuê" description="Gửi lời mời thuê, theo dõi trạng thái và lịch sử thuê phòng." />
    <Feedback message={notice} /><Feedback message={problem} error />
    <form className="panel landlord-invite" onSubmit={invite}>
      <div><span className="section-label">LỜI MỜI MỚI</span><h2>Mời người thuê vào phòng</h2><p>Nhập tên để tìm người thuê đã đăng ký trên RoomRum, rồi chọn đúng tài khoản.</p></div>
      <div className="form-grid">
        <label>Phòng của bạn<select required value={roomId} onChange={event => setRoomId(event.target.value)}><option value="">Chọn phòng</option>{rooms.data?.filter(room => room.status !== 'Hidden').map(room => <option key={room.roomId} value={room.roomId}>{room.title || room.roomId}</option>)}</select></label>
        <div className="tenant-autocomplete" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSuggestionsOpen(false) }}>
          <label htmlFor="tenant-name">Tên người thuê</label>
          <input id="tenant-name" required type="text" maxLength={100} autoComplete="off" placeholder="Nhập tên người thuê" value={tenantName}
            role="combobox" aria-autocomplete="list" aria-expanded={showSuggestions} aria-controls="tenant-suggestions"
            aria-activedescendant={showSuggestions && candidates.length ? `tenant-option-${activeCandidate}` : undefined}
            onFocus={() => { if (tenantName.trim() && !selectedTenant) setSuggestionsOpen(true) }}
            onChange={event => { setTenantName(event.target.value); setSelectedTenant(null); setCandidates([]); setSearchError(''); setSearching(!!event.target.value.trim()); setSuggestionsOpen(true) }}
            onKeyDown={handleNameKeyDown} />
          {selectedTenant && <small className="tenant-selected">Đã chọn: {selectedTenant.name} – {selectedTenant.email}</small>}
          {showSuggestions && <div id="tenant-suggestions" className="tenant-suggestions" role="listbox" aria-label="Người thuê gợi ý">
            {searching && <p role="status">Đang tìm người thuê…</p>}
            {searchError && <p role="alert">{searchError}</p>}
            {!searching && !searchError && !candidates.length && <p>Không tìm thấy người thuê phù hợp.</p>}
            {candidates.map((tenant, index) => <button key={tenant.userId} id={`tenant-option-${index}`} type="button" role="option" aria-selected={index === activeCandidate} className={index === activeCandidate ? 'active' : ''} onMouseEnter={() => setActiveCandidate(index)} onClick={() => chooseTenant(tenant)}><strong>{tenant.name}</strong><span>– {tenant.email}</span></button>)}
          </div>}
        </div>
      </div>
      <button className="button button-primary" disabled={busy || rooms.loading || !!rooms.error || !roomId || !selectedTenant}>Gửi lời mời</button>
      {rooms.error && <p className="form-error">{rooms.error}</p>}
    </form>
    {tenancies.loading ? <Loading /> : tenancies.error ? <ErrorState message={tenancies.error} retry={tenancies.reload} /> : tenancies.data?.length ? <div className="record-list">{tenancies.data.map(item => <article className="panel record landlord-record" key={`${item.roomId}-${item.userId}`}><div className="record-icon"><Users /></div><div className="record-main"><h2>{item.roomTitle || rooms.data?.find(room => room.roomId === item.roomId)?.title || 'Phòng trọ'}</h2><p>{item.tenantName} · Bắt đầu: {date(item.hiredAt)}</p>{item.leftAt && <small>Kết thúc: {date(item.leftAt)}</small>}{history?.key === `${item.roomId}-${item.userId}` && <div className="history-list">{history.items.length ? history.items.map((entry, index) => <p key={index}>{date(entry.hiredAt)} – {date(entry.leftAt)} · {label(entry.status)}</p>) : <p>Chưa có lịch sử.</p>}</div>}</div><Status value={item.status} /><div className="record-actions"><button className="button button-ghost small" onClick={() => loadHistory(item)}>Lịch sử</button>{['Pending', 'Active'].includes(item.status) && <button className="button button-secondary small" onClick={() => end(item)}>{item.status === 'Pending' ? 'Hủy lời mời' : 'Kết thúc thuê'}</button>}</div></article>)}</div> : <State title="Chưa có người thuê" description="Các lời mời và quan hệ thuê sẽ xuất hiện ở đây." />}
  </>
}
