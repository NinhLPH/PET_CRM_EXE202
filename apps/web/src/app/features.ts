export const features = {
  grooming: true, crm: true, commerce: false, medical: false, loyalty: false,
  staffScheduling: false, onlinePayment: false, messagingAutomation: false,
  advancedReports: false, multiBranch: false, multiServiceBooking: false,
} as const;

export const customerNav = [
  { to: '/app', label: 'Trang chủ' },
  { to: '/app/pets', label: 'Thú cưng' },
  { to: '/app/bookings/new', label: 'Đặt lịch' },
  { to: '/app/bookings', label: 'Lịch hẹn' },
  { to: '/app/profile', label: 'Tài khoản' },
];
export const adminNav = [
  { to: '/admin', label: 'Tổng quan' },
  { to: '/admin/customers', label: 'Khách hàng' },
  { to: '/admin/services', label: 'Dịch vụ' },
  { to: '/admin/bookings', label: 'Lịch hẹn' },
  { to: '/admin/reminders', label: 'Cần nhắc' },
];
