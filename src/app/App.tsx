import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AuthProvider, Footer, Header, State } from '../shared/ui'
import { AuthPage } from '../features/auth/AuthPage'
import { DetailPage } from '../features/rooms/DetailPage'
import { HomePage } from '../features/home/HomePage'
import { SharingPage } from '../features/sharing/SharingPage'
import { SearchPage } from '../features/search/AdvancedSearchPage'
import { DashboardRouter } from '../features/dashboard/DashboardRouter'

const MapPage = lazy(() => import('../features/maps/MapPage').then(module => ({ default: module.MapPage })))

export default function App() {
  return <AuthProvider><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/search" element={<SearchPage />} />
    <Route path="/rooms/:id" element={<DetailPage />} />
    <Route path="/map" element={<Suspense fallback={<><Header /><main className="container generic-page">Đang mở bản đồ…</main></>}><MapPage /></Suspense>} />
    <Route path="/sharing" element={<SharingPage />} />
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route path="/tenant" element={<DashboardRouter role="tenant" />} />
    <Route path="/tenant/:section" element={<DashboardRouter role="tenant" />} />
    <Route path="/landlord" element={<DashboardRouter role="landlord" />} />
    <Route path="/landlord/:section" element={<DashboardRouter role="landlord" />} />
    <Route path="/admin" element={<DashboardRouter role="admin" />} />
    <Route path="/admin/:section" element={<DashboardRouter role="admin" />} />
    <Route path="*" element={<><Header /><main className="container generic-page"><State title="Không tìm thấy trang" description="Đường dẫn này không tồn tại trên RoomRum." /></main><Footer /></>} />
  </Routes></AuthProvider>
}
