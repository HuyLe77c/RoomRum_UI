import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, House, ShieldCheck } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { useResource } from '../../shared/ui'
import type { Repair, Tenancy } from '../../shared/types'
import { Heading, Badge, Notice, DataPanel } from './shared'
import type { RolePath } from './shared'

export function Repairs({ role }: { role: RolePath }) {
  const resource = useResource<Repair[]>('/repairs/mine?page=1&pageSize=50')
  const tenancies = useResource<Tenancy[]>(role === 'tenant' ? '/room-tenants/mine?page=1&pageSize=50' : null)
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ roomId: '', priority: 'Bình thường', repairItems: '', description: '', expectingDate: '' })
  const [responses, setResponses] = useState<Record<string, string>>({})
  const activeRooms = tenancies.data?.filter(item => item.status === 'Active') || []

  useEffect(() => {
    if (!form.roomId && activeRooms.length === 1) {
      setForm(prev => ({ ...prev, roomId: activeRooms[0].roomId }))
    }
  }, [activeRooms, form.roomId])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await api('/repairs', json('POST', { ...form, expectingDate: form.expectingDate || null }))
      setNotice('Đã gửi yêu cầu sửa chữa.')
      setForm({ roomId: activeRooms.length === 1 ? activeRooms[0].roomId : '', priority: 'Bình thường', repairItems: '', description: '', expectingDate: '' })
      resource.reload()
    } catch (cause) {
      setNotice((cause as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const update = async (id: string, status: string) => {
    try {
      await api(`/repairs/${id}`, json('PATCH', { status, response: responses[id] || null }))
      setNotice('Đã cập nhật yêu cầu sửa chữa.')
      resource.reload()
    } catch (cause) {
      setNotice((cause as Error).message)
    }
  }

  return (
    <>
      <Heading
        eyebrow={role === 'tenant' ? 'NGƯỜI THUÊ' : 'CHỦ PHÒNG'}
        title="Yêu cầu sửa chữa"
        description={role === 'tenant' ? 'Thông báo sự cố tại phòng đang thuê.' : 'Theo dõi và phản hồi yêu cầu từ người thuê.'}
      />
      <Notice text={notice} />
      {role === 'tenant' && (
        <form className="panel sharing-create" onSubmit={submit}>
          <div className="sharing-create-header">
            <span className="sharing-create-icon"><ShieldCheck size={22} /></span>
            <div>
              <h2>Gửi yêu cầu sửa chữa</h2>
              <p>Mô tả sự cố để chủ phòng có thể hỗ trợ bạn nhanh hơn.</p>
            </div>
          </div>
          <div className="sharing-create-fields">
            <label>
              Phòng cần sửa chữa <span className="required-mark">*</span>
              <select required value={form.roomId} onChange={e => setForm({ ...form, roomId: e.target.value })}>
                <option value="">Chọn phòng đang thuê</option>
                {activeRooms.map(item => <option key={item.roomId} value={item.roomId}>{item.roomTitle || 'Phòng đang thuê'}</option>)}
              </select>
            </label>
            <label>
              Mức ưu tiên
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="Bình thường">Bình thường</option>
                <option value="Khẩn cấp">Khẩn cấp</option>
              </select>
            </label>
            <label>Hạng mục<input value={form.repairItems} onChange={e => setForm({ ...form, repairItems: e.target.value })} placeholder="Ví dụ: Vòi nước, đèn, điều hòa…" /></label>
            <label>Ngày mong muốn<input type="date" value={form.expectingDate} onChange={e => setForm({ ...form, expectingDate: e.target.value })} /></label>
            <label>
              Mô tả chi tiết <span className="required-mark">*</span>
              <textarea required rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả sự cố cần khắc phục…" />
            </label>
          </div>
          {activeRooms.length === 0 && !tenancies.loading && <p className="sharing-create-note"><House size={16} /> Bạn cần có phòng đang thuê (trạng thái Hoạt động) để gửi yêu cầu.</p>}
          <div className="sharing-create-footer">
            <span>Các trường có dấu <span className="required-mark">*</span> là bắt buộc.</span>
            <button className="button button-primary" type="submit" disabled={!form.roomId || submitting}>
              {submitting ? 'Đang gửi…' : 'Gửi yêu cầu'} <ArrowRight size={17} />
            </button>
          </div>
        </form>
      )}
      <DataPanel resource={resource} empty="Chưa có yêu cầu sửa chữa">
        {data => (
          <div className="record-list">
            {data.map(item => (
              <article className="panel record" key={item.maintenanceId}>
                <div className="record-icon"><ShieldCheck /></div>
                <div className="record-main">
                  <h2>{item.repairItems || 'Yêu cầu sửa chữa'}</h2>
                  <p>{item.description || 'Không có mô tả.'}</p>
                  <small>Phòng: {item.roomTitle || item.roomId} · Ưu tiên: {item.priority || 'Bình thường'}</small>
                  {item.response && <p className="response-note">Phản hồi: {item.response}</p>}
                </div>
                <Badge status={item.status} />
                {role === 'landlord' && (
                  <div className="record-actions">
                    <input
                      aria-label="Phản hồi yêu cầu"
                      value={responses[item.maintenanceId] || ''}
                      onChange={e => setResponses({ ...responses, [item.maintenanceId]: e.target.value })}
                      placeholder="Phản hồi"
                    />
                    <select
                      aria-label="Trạng thái sửa chữa"
                      defaultValue={item.status || 'Pending'}
                      onChange={e => update(item.maintenanceId, e.target.value)}
                    >
                      <option value="Pending">Đang chờ</option>
                      <option value="InProgress">Đang xử lý</option>
                      <option value="Completed">Hoàn tất</option>
                      <option value="Rejected">Từ chối</option>
                    </select>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </DataPanel>
    </>
  )
}
