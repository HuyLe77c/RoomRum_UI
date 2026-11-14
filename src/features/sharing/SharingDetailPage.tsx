import { Link, useParams } from 'react-router-dom'
import { ChevronRight, House, Users } from 'lucide-react'
import { ErrorState, Footer, Header, Loading, shortMoney, useResource } from '../../shared/ui'
import type { Sharing } from '../../shared/types'

export function SharingDetailPage({ dashboard = false }: { dashboard?: boolean }) {
  const { id } = useParams()
  const { data: item, loading, error, reload } = useResource<Sharing>(id ? `/sharings/${id}` : null)
  const listPath = dashboard ? '/tenant/sharing-requests' : '/sharing'

  return <>{!dashboard && <Header />}<main className={dashboard ? 'sharing-detail-page tenant-sharing-detail-page' : 'container generic-page sharing-detail-page'}>
    <div className="breadcrumbs">{!dashboard && <><Link to="/">Trang chủ</Link><ChevronRight size={14} /></>}<Link to={listPath}>Tin yêu cầu ở ghép</Link><ChevronRight size={14} /><span>Chi tiết tin</span></div>
    {loading ? <Loading /> : error || !item ? <ErrorState message={error || 'Không tìm thấy tin ở ghép.'} retry={reload} /> : <>
      <div className="page-title"><span className="section-label">TIN TÌM NGƯỜI Ở GHÉP</span><h1>{item.title || 'Lời mời ở ghép'}</h1><p>Đăng bởi {item.author || 'Người thuê RoomRum'}</p></div>
      <div className="sharing-detail-layout"><div className="sharing-detail-main">
        <section className="panel sharing-detail-facts" aria-label="Thông tin ở ghép"><div><Users size={20} /><span>Số chỗ cần tìm</span><strong>{item.quantity ?? 'Chưa cập nhật'}</strong></div><div><Users size={20} /><span>Giới tính mong muốn</span><strong>{item.gender || 'Không yêu cầu'}</strong></div><div><House size={20} /><span>Phòng</span><strong>{item.roomTitle || 'Chưa cập nhật'}</strong></div></section>
        <section className="panel sharing-detail-section"><h2>Giới thiệu</h2><p>{item.introduction || 'Người đăng chưa thêm lời giới thiệu.'}</p></section>
        <section className="panel sharing-detail-section"><h2>Quy tắc ở chung</h2><p>{item.rule || 'Người đăng chưa cập nhật quy tắc ở chung.'}</p></section>
      </div><aside className="panel sharing-detail-aside"><span className="section-label">PHÍ Ở GHÉP</span><div className="sharing-detail-price">{shortMoney(item.sharingFee)} {item.sharingFee != null && <small>/ tháng</small>}</div><p>Người đăng: <strong>{item.author || 'Chưa cập nhật'}</strong></p><Link className="sharing-back-link" to={listPath}>Xem các tin ở ghép khác</Link></aside></div>
    </>}
  </main>{!dashboard && <Footer />}</>
}
