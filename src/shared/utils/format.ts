export const money = (value: number | null | undefined) => value === null || value === undefined ? 'Liên hệ' : `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
export const shortMoney = (value: number | null | undefined) => value === null || value === undefined ? 'Liên hệ' : value >= 1_000_000 ? `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu` : money(value)
export const date = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString('vi-VN') : '—'
