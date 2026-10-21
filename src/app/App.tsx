import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AuthProvider, Footer, Header, State } from '../shared/ui'
import { HomePage } from '../features/home/HomePage'

const MapPage = lazy(() => import('../features/maps/MapPage').then(module => ({ default: module.MapPage })))
const SearchPage = lazy(() => import('../features/search/AdvancedSearchPage').then(module => ({ default: module.SearchPage })))
const DetailPage = lazy(() => import('../features/rooms/DetailPage').then(module => ({ default: module.DetailPage })))
const SharingPage = lazy(() => import('../features/sharing/SharingPage').then(module => ({ default: module.SharingPage })))
const AuthPage = lazy(() => import('../features/auth/AuthPage').then(module => ({ default: module.AuthPage })))
const DashboardRouter = lazy(() => import('../features/dashboard/DashboardRouter').then(module => ({ default: module.DashboardRouter })))

export default function App() {
  return <AuthProvider><Suspense fallback={<><Header /><main className="container generic-page" role="status">Đang mở trang…</main></>}><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/search" element={<SearchPage />} />
    <Route path="/rooms/:id" element={<DetailPage />} />
    <Route path="/map" element={<MapPage />} />
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
  </Routes></Suspense></AuthProvider>
}
