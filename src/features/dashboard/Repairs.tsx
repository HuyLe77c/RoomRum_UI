import { ShieldCheck } from 'lucide-react'
import { date, useResource } from '../../shared/ui'
import type { Repair, Tenancy } from '../../shared/types'
import { Heading, Badge, DataPanel } from './shared'
import type { RolePath } from './shared'
import { RepairCreateForm } from './RepairCreateForm'

export function Repairs({ role }: { role: RolePath }) {
  const resource = useResource<Repair[]>('/repairs/mine?page=1&pageSize=100')
  const tenancies = useResource<Tenancy[]>(role === 'tenant' ? '/room-tenants/mine?page=1&pageSize=100' : null)
  const activeRooms = tenancies.data?.filter(item => item.status === 'Active').map(item => ({ roomId: item.roomId, roomTitle: item.roomTitle })) || []

  return <>
    <Heading
      eyebrow={role === 'tenant' ? 'NGƯỜI THUÊ' : 'CHỦ PHÒNG'}
      title="Sửa chữa và bảo trì"
      description="Theo dõi yêu cầu sửa chữa và thông báo bảo trì của phòng."
    />
    {role === 'tenant' && <RepairCreateForm kind="request" rooms={activeRooms} loading={tenancies.loading} onCreated={resource.reload} />}
    <DataPanel resource={resource} empty="Chưa có yêu cầu sửa chữa hoặc thông báo bảo trì">
      {data => <div className="record-list">{data.map(item => <article className="panel record" key={item.maintenanceId}>
        <div className="record-icon"><ShieldCheck /></div>
        <div className="record-main">
          <h2>{item.isMaintenanceNotice ? 'Thông báo bảo trì' : 'Yêu cầu sửa chữa'}: {item.repairItems || 'Chưa ghi hạng mục'}</h2>
          <p>{item.description || 'Không có mô tả.'}</p>
          <small>Phòng: {item.roomTitle || item.roomId} · {item.isMaintenanceNotice ? `Chủ trọ: ${item.tenantName}` : `Người thuê: ${item.tenantName}`}</small>
          {item.expectingDate && <small> · {item.isMaintenanceNotice ? 'Ngày bảo trì' : 'Ngày mong muốn'}: {date(item.expectingDate)}</small>}
          {!item.isMaintenanceNotice && <small> · Ưu tiên: {item.priority || 'Bình thường'}</small>}
          {item.response && <p className="response-note">Phản hồi: {item.response}</p>}
        </div>
        <Badge status={item.status} />
      </article>)}</div>}
    </DataPanel>
  </>
}
