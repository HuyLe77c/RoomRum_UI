import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { ErrorState, Footer, Header, Loading, State, shortMoney, useResource } from '../../shared/ui'
import type { Sharing } from '../../shared/types'

const pageSize = 12

export function SharingPage({ dashboard = false }: { dashboard?: boolean }) {
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useResource<Sharing[]>(`/sharings?page=${page}&pageSize=${pageSize}`)
  const detailPath = (id: string) => dashboard ? `/tenant/sharing-requests/${id}` : `/sharing/${id}`

  return <>{!dashboard && <Header />}<main className={dashboard ? 'sharing-page tenant-sharing-page' : 'container generic-page sharing-page'}>
    {dashboard ? <div className="page-title"><h1>Tin ở ghép</h1></div> : <div className="page-title"><span className="section-label">CỘNG ĐỒNG ROOMRUM</span><h1>Tìm người ở ghép</h1><p>Khám phá các tin tìm người ở ghép và chọn lời mời phù hợp với bạn.</p></div>}
    {loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} /> : data?.length ? <>
      {dashboard ? <div className="tenant-sharing-list">{data.map(item => <article className="panel tenant-sharing-row" key={item.sharingId}>
        <div className="tenant-sharing-summary">
          <h2>{item.title || 'Lời mời ở ghép'}</h2>
          <p>Phòng: {item.roomTitle || 'Chưa có tên phòng'}</p>
          <p>Người đăng: {item.author || 'Chưa cập nhật'}</p>
        </div>
        <Link className="button button-secondary tenant-sharing-detail" to={detailPath(item.sharingId)} aria-label={`Xem chi tiết ${item.title || 'tin ở ghép'}`}>Xem chi tiết</Link>
      </article>)}</div> : <div className="sharing-grid">{data.map(item => <article className="panel sharing-card" key={item.sharingId}>
        <span className="eyebrow"><Users size={15} /> Tin ở ghép</span>
        <h2>{item.title || item.roomTitle || 'Lời mời ở ghép'}</h2>
        <p className="sharing-card-room">Phòng: {item.roomTitle || 'Chưa có tên phòng'} · Người đăng: {item.author || 'Chưa cập nhật'}</p>
        <p className="sharing-card-intro">{item.introduction ? `${item.introduction.slice(0, 160)}${item.introduction.length > 160 ? '…' : ''}` : 'Chưa có lời giới thiệu.'}</p>
        <div className="sharing-facts"><span>{item.quantity ?? '—'} chỗ</span><span>{item.gender || 'Không yêu cầu giới tính'}</span></div>
        <div className="room-bottom"><strong>{shortMoney(item.sharingFee)}{item.sharingFee != null && <small> / tháng</small>}</strong><Link className="button button-secondary sharing-card-detail" to={detailPath(item.sharingId)} aria-label={`Xem chi tiết ${item.title || 'tin ở ghép'}`}>Xem chi tiết <ArrowRight size={16} /></Link></div>
      </article>)}</div>}
      <div className="pagination"><button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}><ChevronLeft size={15} /> Trước</button><span>Trang {page}</span><button type="button" disabled={data.length < pageSize} onClick={() => setPage(value => value + 1)}>Tiếp <ChevronRight size={15} /></button></div>
    </> : page > 1 ? <div className="state"><h3>Không còn tin ở ghép ở trang này</h3><button className="button button-secondary" type="button" onClick={() => setPage(value => value - 1)}>Về trang trước</button></div> : <State title="Chưa có lời mời ở ghép" description="Danh sách sẽ xuất hiện khi người thuê đăng lời mời." />}
  </main>{!dashboard && <Footer />}</>
}
