import type { ReactNode } from 'react'
import { Search } from 'lucide-react'

export function State({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return <div className="state"><div className="state-icon">{icon || <Search size={25} />}</div><h3>{title}</h3>{description && <p>{description}</p>}{action}</div>
}
export function Loading({ label = 'Đang tải dữ liệu…' }: { label?: string }) { return <div className="loading"><span className="spinner" />{label}</div> }
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) { return <State title="Chưa tải được dữ liệu" description={message} action={retry && <button className="button button-primary" onClick={retry}>Thử lại</button>} /> }
