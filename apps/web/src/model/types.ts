export interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed: string;
  age: number;
  weight: number;
  gender: 'Male' | 'Female';
  notes: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'grooming' | 'wellness' | 'treats' | 'accessories';
  price: number;
  description: string;
  rating: number;
  stock: 'In Stock' | 'Limited Run' | 'Out of Stock';
  ingredients: string;
  colorHex: string; // for custom elegant visual background placeholder
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: string;
  description: string;
}

export interface Booking {
  id: string;
  petId: string;
  petName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  notes: string;
  status: 'Scheduled' | 'In Parlor' | 'Groomed' | 'Cancelled';
  price: number;
  staff: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  date: string;
  status: 'Processing' | 'Shipped' | 'Delivered';
  address: string;
}

export interface Profile {
  name: string;
  email: string;
  phone: string;
  address: string;
  memberSince: string;
  premiumStatus: boolean;
}

export interface CareReminder {
  id: string;
  petName: string;
  title: string;
  dueDate: string;
  type: 'vaccine' | 'treatment' | 'checkup';
  urgency: 'urgent' | 'upcoming';
}

export type TabId = 'home' | 'pets' | 'book' | 'shop' | 'orders' | 'profile';
export type ShopCategory = 'all' | Product['category'];
export interface CartItem {
  product: Product;
  quantity: number;
}
