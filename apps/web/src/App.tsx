import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './app/authContext';
import { Layout } from './app/layout';
import { features } from './app/features';
import { LoginPage, RegisterPage, PublicPage } from './pages/v1/AuthPages';
import { CustomerHome, CustomerProfile, CustomerPets, CustomerPetDetail } from './pages/v1/CustomerPages';
import { CustomerBookingNew, CustomerBookings, CustomerBookingDetail } from './pages/v1/CustomerBookings';
import { AdminDashboard, AdminBookings, AdminBookingDetail } from './pages/v1/AdminBookings';
import { AdminCustomers, AdminCustomerDetail } from './pages/v1/AdminCustomers';
import { AdminServices } from './pages/v1/AdminServices';
import { AdminReminders, AdminReminderDetail } from './pages/v1/AdminReminders';

function Gate({ role }: { role: 'CUSTOMER' | 'ADMIN' }) {
  const { state, refresh } = useAuth();
  const location = useLocation();
  if (state.status === 'checking') return <div className="p-10">Đang xác minh phiên đăng nhập…</div>;
  if (state.status === 'error') return <div className="p-10 space-y-3"><p>{state.error}</p><button className="underline" onClick={() => void refresh()}>Thử lại</button></div>;
  if (state.status === 'anonymous') return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (state.role !== role) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}

export default function App() {
  return <Routes>
    <Route path="/" element={<PublicPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    {features.grooming && <Route element={<Gate role="CUSTOMER" />}><Route element={<Layout />}>
      <Route path="/app" element={<CustomerHome />} />
      <Route path="/app/profile" element={<CustomerProfile />} />
      <Route path="/app/pets" element={<CustomerPets />} />
      <Route path="/app/pets/:petId" element={<CustomerPetDetail />} />
      <Route path="/app/bookings/new" element={<CustomerBookingNew />} />
      <Route path="/app/bookings" element={<CustomerBookings />} />
      <Route path="/app/bookings/:bookingId" element={<CustomerBookingDetail />} />
    </Route></Route>}
    {features.crm && <Route element={<Gate role="ADMIN" />}><Route element={<Layout admin />}>
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/customers" element={<AdminCustomers />} />
      <Route path="/admin/customers/:customerId" element={<AdminCustomerDetail />} />
      <Route path="/admin/services" element={<AdminServices />} />
      <Route path="/admin/bookings" element={<AdminBookings />} />
      <Route path="/admin/bookings/:bookingId" element={<AdminBookingDetail />} />
      <Route path="/admin/reminders" element={<AdminReminders />} />
      <Route path="/admin/reminders/:reminderId" element={<AdminReminderDetail />} />
    </Route></Route>}
    <Route path="/forbidden" element={<div className="p-10"><h1 className="text-2xl mb-4">Bạn không có quyền truy cập</h1><a className="underline" href="/">Về trang chủ</a></div>} />
    <Route path="*" element={<div className="p-10"><h1 className="text-2xl mb-4">Không tìm thấy trang</h1><a className="underline" href="/">Về trang chủ</a></div>} />
  </Routes>;
}
