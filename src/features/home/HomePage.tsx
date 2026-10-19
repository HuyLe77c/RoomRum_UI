import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarDays, Compass, Home, MapPin, Search as SearchIcon, ShieldCheck } from 'lucide-react'
import { query } from '../../shared/api/client'
import { ErrorState, Footer, Header, Loading, RoomCard, State, useResource } from '../../shared/ui'
import type { RoomSearch } from '../../shared/types'

function HeroSearch() {
  const navigate = useNavigate()
  const [area, setArea] = useState('')
  const [price, setPrice] = useState('')
  const submit = (event: FormEvent) => { event.preventDefault(); navigate(`/search?${query({ q: area, maxPrice: price })}`) }
  return <form className="hero-search" onSubmit={submit}><label><span>Khu vực bạn muốn ở</span><div><MapPin size={19} /><input aria-label="Khu vực" placeholder="Quận, đường, trường học…" value={area} onChange={event => setArea(event.target.value)} /></div></label><label><span>Ngân sách tối đa</span><select aria-label="Ngân sách tối đa" value={price} onChange={event => setPrice(event.target.value)}><option value="">Tất cả mức giá</option><option value="2000000">Dưới 2 triệu</option><option value="4000000">Dưới 4 triệu</option><option value="6000000">Dưới 6 triệu</option><option value="10000000">Dưới 10 triệu</option></select></label><button className="button button-primary" type="submit"><SearchIcon size={18} /> Tìm phòng</button></form>
}

export function HomePage() {
  const { data, loading, error, reload } = useResource<RoomSearch>('/rooms?page=1&pageSize=6')
  return <><Header /><main><section className="hero"><div className="container hero-inner"><div className="hero-copy"><span className="hero-kicker"><span className="live-dot" /> Không gian sống bắt đầu ở đây</span><h1>Tìm phòng trọ<br /><em>phù hợp nhất</em> với bạn</h1><p>Khám phá phòng trọ rõ thông tin, xem vị trí trên bản đồ và kết nối trực tiếp với chủ phòng.</p><HeroSearch /><div className="hero-shortcuts"><span>Khám phá nhanh:</span><Link to="/search">Tất cả phòng <ArrowRight size={14} /></Link><Link to="/map">Xem bản đồ <ArrowRight size={14} /></Link></div></div><div className="hero-art" aria-hidden="true"><div className="hero-house"><span className="house-roof" /><span className="house-body"><span className="house-window" /><span className="house-door" /></span></div><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="art-chip chip-top"><MapPin size={16} /> Tìm đúng khu vực</div><div className="art-chip chip-bottom"><ShieldCheck size={16} /> Thông tin rõ ràng</div></div></div></section>
    <section className="feature-strip"><div className="container feature-strip-grid"><div><SearchIcon size={23} /><span><strong>Tìm kiếm linh hoạt</strong><small>Lọc theo giá, loại phòng, tiện nghi</small></span></div><div><Compass size={23} /><span><strong>Tra cứu bản đồ</strong><small>Xem vị trí từ địa chỉ phòng</small></span></div><div><CalendarDays size={23} /><span><strong>Đặt lịch trực tiếp</strong><small>Kết nối với chủ phòng thuận tiện</small></span></div></div></section>
    <section className="section container"><div className="section-heading"><div><span className="section-label">PHÒNG ĐANG CÓ</span><h2>Khám phá nơi ở phù hợp</h2><p>Thông tin phòng được tải trực tiếp từ RoomRum.</p></div><Link className="text-link" to="/search">Xem tất cả <ArrowRight size={17} /></Link></div>{loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} /> : data?.items.length ? <div className="room-grid">{data.items.map(room => <RoomCard room={room} key={room.roomId} />)}</div> : <State title="Chưa có phòng đang mở" description="Khi chủ phòng đăng tin, danh sách sẽ xuất hiện tại đây." action={<Link className="button button-secondary" to="/map">Xem bản đồ</Link>} icon={<Home size={27} />} />}</section>
    <section className="how-section"><div className="container"><div className="section-heading"><div><span className="section-label">ROOMRUM HOẠT ĐỘNG THẾ NÀO</span><h2>Từ tìm kiếm đến buổi xem phòng</h2></div></div><div className="steps"><div><span>01</span><SearchIcon /><h3>Tìm phòng</h3><p>Nhập khu vực, mức giá hoặc loại phòng phù hợp.</p></div><div><span>02</span><MapPin /><h3>Xem chi tiết</h3><p>Đọc mô tả, xem ảnh và tra cứu vị trí phòng.</p></div><div><span>03</span><CalendarDays /><h3>Đặt lịch xem</h3><p>Chọn ngày giờ và gửi yêu cầu cho chủ phòng.</p></div></div></div></section>
    <section className="container host-cta"><div><span className="section-label">DÀNH CHO CHỦ PHÒNG</span><h2>Bạn có phòng muốn cho thuê?</h2><p>Đăng phòng và quản lý lịch hẹn, người thuê trong một nơi.</p></div><Link to="/register" className="button button-light">Tạo tài khoản chủ phòng <ArrowRight size={18} /></Link></section>
  </main><Footer /></>
}
