import { useState } from 'react'
import { Check, Wrench } from 'lucide-react'
import { api, json } from '../../shared/api/client'
import { ErrorState, Loading, State, date, useResource } from '../../shared/ui'
import type { OwnedRoom, Repair } from '../../shared/types'
import { RepairCreateForm } from '../dashboard/RepairCreateForm'
import { Status, Heading, Feedback } from './shared'

export function LandlordRepairs() {
  const resource = useResource<Repair[]>('/repairs/mine?page=1&pageSize=100')
  const rooms = useResource<OwnedRoom[]>('/rooms/mine?page=1&pageSize=100')
  const [drafts, setDrafts] = useState<Record<string, { status: string; response: string }>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const roomOptions = rooms.data?.map(room => ({ roomId: room.roomId, roomTitle: room.title })) || []

  const save = async (item: Repair) => {
    const draft = drafts[item.maintenanceId] || { status: item.status || (item.isMaintenanceNotice ? 'Scheduled' : 'Pending'), response: item.response || '' }
    setBusy(item.maintenanceId)
    setProblem('')
    try {
      await api(`/repairs/${item.maintenanceId}`, json('PATCH', draft))
      setNotice(item.isMaintenanceNotice ? 'Đã cập nhật thông báo bảo trì.' : 'Đã lưu phản hồi sửa chữa.')
      resource.reload()
    } catch (cause) {
      setProblem((cause as Error).message)
    } finally {
      setBusy(null)
    }
  }
  const change = (item: Repair, key: 'status' | 'response', value: string) => setDrafts(previous => ({ ...previous, [item.maintenanceId]: {
    status: previous[item.maintenanceId]?.status ?? item.status ?? (item.isMaintenanceNotice ? 'Scheduled' : 'Pending'),
    response: previous[item.maintenanceId]?.response ?? item.response ?? '',
    [key]: value,
  } }))

  return <>
    <Heading title="Sửa chữa và bảo trì" description="Theo dõi yêu cầu của người thuê và thông báo bảo trì cho phòng bạn quản lý." />
    <RepairCreateForm kind="notice" rooms={roomOptions} loading={rooms.loading} onCreated={resource.reload} />
    {rooms.error && <Feedback message={rooms.error} error />}
    <Feedback message={notice} />
    <Feedback message={problem} error />
    {resource.loading ? <Loading /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : resource.data?.length ?
      <div className="landlord-repairs">{resource.data.map(item => <article className="panel landlord-repair-card" key={item.maintenanceId}>
        <div className="landlord-repair-head">
          <span className="landlord-row-icon"><Wrench size={19} /></span>
          <div>
            <h2>{item.isMaintenanceNotice ? 'Thông báo bảo trì' : 'Yêu cầu sửa chữa'}: {item.repairItems || 'Chưa ghi hạng mục'}</h2>
            <small>{item.roomTitle || item.roomId} · {item.isMaintenanceNotice ? `Chủ trọ: ${item.tenantName}` : `Người thuê: ${item.tenantName}`}</small>
          </div>
          <Status value={item.status} />
        </div>
        <p>{item.description || 'Chưa có mô tả.'}</p>
        <div className="landlord-repair-facts">
          {!item.isMaintenanceNotice && <span>Ưu tiên: <strong>{item.priority || 'Chưa đặt'}</strong></span>}
          <span>{item.isMaintenanceNotice ? 'Ngày bảo trì' : 'Ngày mong muốn'}: <strong>{date(item.expectingDate)}</strong></span>
        </div>
        <div className="landlord-repair-controls">
          <label>Trạng thái
            <select value={drafts[item.maintenanceId]?.status ?? item.status ?? (item.isMaintenanceNotice ? 'Scheduled' : 'Pending')} onChange={e => change(item, 'status', e.target.value)}>
              {item.isMaintenanceNotice ? <>
                <option value="Scheduled">Đã lên lịch</option>
                <option value="InProgress">Đang thực hiện</option>
                <option value="Completed">Hoàn tất</option>
                <option value="Cancelled">Đã hủy</option>
              </> : <>
                <option value="Pending">Đang chờ</option>
                <option value="InProgress">Đang xử lý</option>
                <option value="Completed">Hoàn tất</option>
                <option value="Rejected">Từ chối</option>
              </>}
            </select>
          </label>
          <label>{item.isMaintenanceNotice ? 'Ghi chú cho người thuê' : 'Phản hồi người thuê'}
            <textarea rows={2} value={drafts[item.maintenanceId]?.response ?? item.response ?? ''} onChange={e => change(item, 'response', e.target.value)} placeholder="Cập nhật hướng xử lý hoặc lịch bảo trì" />
          </label>
          <button className="button button-primary small" disabled={busy === item.maintenanceId} onClick={() => save(item)}>
            <Check size={15} /> {busy === item.maintenanceId ? 'Đang lưu…' : 'Lưu cập nhật'}
          </button>
        </div>
      </article>)}</div> : <State title="Chưa có mục sửa chữa hoặc bảo trì" description="Yêu cầu từ người thuê và thông báo của bạn sẽ xuất hiện tại đây." />}
  </>
}
