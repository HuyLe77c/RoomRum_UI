import { UserRound } from 'lucide-react'
import { useAuth, useResource } from '../../shared/ui'
import type { CurrentUser } from '../../shared/types'
import { Heading, Badge, DataPanel } from './shared'

export function Profile() { const { session } = useAuth(); const resource = useResource<CurrentUser>('/auth/me'); return <><Heading eyebrow="TÀI KHOẢN" title="Hồ sơ của bạn" description="Thông tin tài khoản được cung cấp bởi RoomRum API." /><DataPanel resource={resource} empty="Chưa có thông tin hồ sơ">{data => <div className="panel profile-panel"><div className="profile-avatar"><UserRound size={34} /></div><div className="profile-details"><div><span>Họ và tên</span><strong>{data.name}</strong></div><div><span>Email</span><strong>{data.email || 'Chưa cập nhật'}</strong></div><div><span>Số điện thoại</span><strong>{data.phone || 'Chưa cập nhật'}</strong></div><div><span>Vai trò</span><strong>{data.role}</strong></div><div><span>Trạng thái</span><Badge status={data.status} /></div><div><span>ID tài khoản</span><code>{session?.userId}</code></div></div><p className="muted">API hiện chưa có chức năng cập nhật hồ sơ.</p></div>}</DataPanel></> }
