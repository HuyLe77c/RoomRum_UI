import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, House, ShieldCheck } from 'lucide-react'
import { api, json } from '../../shared/api/client'

type RoomOption = { roomId: string; roomTitle: string | null }
type RepairForm = { roomId: string; priority: string; repairItems: string; description: string; expectingDate: string }

export function RepairCreateForm({ kind, rooms, loading, onCreated }: {
  kind: 'request' | 'notice'
  rooms: RoomOption[]
  loading: boolean
  onCreated: () => void
}) {
  const isNotice = kind === 'notice'
  const blank = (): RepairForm => ({ roomId: rooms.length === 1 ? rooms[0].roomId : '', priority: 'Bình thường', repairItems: '', description: '', expectingDate: '' })
  const [form, setForm] = useState<RepairForm>(blank)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!form.roomId && rooms.length === 1) setForm(previous => ({ ...previous, roomId: rooms[0].roomId }))
  }, [form.roomId, rooms])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      await api(isNotice ? '/repairs/maintenance-notices' : '/repairs', json('POST', {
        ...form,
        expectingDate: form.expectingDate || null,
      }))
      setNotice(isNotice ? 'Đã tạo thông báo bảo trì.' : 'Đã gửi yêu cầu sửa chữa.')
      setForm(blank())
      onCreated()
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return <>
    {notice && <div className="landlord-feedback" role="status">{notice}</div>}
    {error && <div className="landlord-feedback is-error" role="alert">{error}</div>}
    <form className="panel sharing-create" onSubmit={submit}>
      <div className="sharing-create-header">
        <span className="sharing-create-icon"><ShieldCheck size={22} /></span>
        <div>
          <h2>{isNotice ? 'Tạo thông báo bảo trì' : 'Gửi yêu cầu sửa chữa'}</h2>
          <p>{isNotice ? 'Thông báo lịch bảo trì cho người đang thuê phòng.' : 'Mô tả sự cố để chủ phòng có thể hỗ trợ bạn nhanh hơn.'}</p>
        </div>
      </div>
      <div className="sharing-create-fields">
        <label>Phòng <span className="required-mark">*</span>
          <select required value={form.roomId} onChange={e => setForm({ ...form, roomId: e.target.value })}>
            <option value="">{isNotice ? 'Chọn phòng bạn quản lý' : 'Chọn phòng đang thuê'}</option>
            {rooms.map(room => <option key={room.roomId} value={room.roomId}>{room.roomTitle || 'Phòng trọ'}</option>)}
          </select>
        </label>
        {!isNotice && <label>Mức ưu tiên
          <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
            <option value="Bình thường">Bình thường</option>
            <option value="Khẩn cấp">Khẩn cấp</option>
          </select>
        </label>}
        <label>Hạng mục<input value={form.repairItems} onChange={e => setForm({ ...form, repairItems: e.target.value })} placeholder="Ví dụ: Vòi nước, đèn, điều hòa…" /></label>
        <label>{isNotice ? 'Ngày bảo trì dự kiến' : 'Ngày mong muốn'} {isNotice && <span className="required-mark">*</span>}
          <input required={isNotice} type="date" value={form.expectingDate} onChange={e => setForm({ ...form, expectingDate: e.target.value })} />
        </label>
        <label>Mô tả chi tiết <span className="required-mark">*</span>
          <textarea required rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={isNotice ? 'Mô tả công việc bảo trì và những điều người thuê cần biết…' : 'Mô tả sự cố cần khắc phục…'} />
        </label>
      </div>
      {rooms.length === 0 && !loading && <p className="sharing-create-note"><House size={16} /> {isNotice ? 'Bạn cần có phòng đang quản lý để tạo thông báo.' : 'Bạn cần có phòng đang thuê (trạng thái Hoạt động) để gửi yêu cầu.'}</p>}
      <div className="sharing-create-footer">
        <span>Các trường có dấu <span className="required-mark">*</span> là bắt buộc.</span>
        <button className="button button-primary" type="submit" disabled={!form.roomId || submitting || loading}>
          {submitting ? 'Đang gửi…' : isNotice ? 'Tạo thông báo' : 'Gửi yêu cầu'} <ArrowRight size={17} />
        </button>
      </div>
    </form>
  </>
}
