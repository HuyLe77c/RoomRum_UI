import type * as React from 'react'

const statusLabels: Record<string, string> = { Available: 'Còn trống', Rented: 'Đã thuê', Draft: 'Bản nháp', Hidden: 'Đã ẩn', Pending: 'Đang chờ', Confirmed: 'Đã xác nhận', Rejected: 'Đã từ chối', Completed: 'Hoàn tất', Cancelled: 'Đã hủy', Active: 'Đang thuê', Ended: 'Đã kết thúc', InProgress: 'Đang xử lý' }
export const label = (value: string | null | undefined) => statusLabels[value || ''] || value || 'Chưa rõ'
export const Status = ({ value }: { value: string | null | undefined }) => <span className={`badge ${value?.toLowerCase() || 'unknown'}`}>{label(value)}</span>
export const Heading = ({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) => <div className="dash-heading"><div><span className="section-label">KHÔNG GIAN CHỦ TRỌ</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
export const Feedback = ({ message, error = false }: { message: string; error?: boolean }) => message ? <div className={error ? 'landlord-feedback is-error' : 'landlord-feedback'} role={error ? 'alert' : 'status'}>{message}</div> : null
