import { createContext, useContext } from 'react';
import type { Booking, CareReminder, CartItem, Order, Pet, Product, Profile, TabId } from '../model/types';

export interface PetDraft {
  name: string;
  type: Pet['type'];
  breed: string;
  age: string;
  weight: string;
  gender: Pet['gender'];
  notes: string;
}

export interface BookingDraft {
  petId: string;
  serviceId: string;
  date: string;
  time: string;
  notes: string;
  specialRequest: string;
}

export interface DemoStoreValue {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  pets: Pet[];
  bookings: Booking[];
  orders: Order[];
  profile: Profile;
  reminders: CareReminder[];
  cart: CartItem[];
  selectedPet: Pet | null;
  setSelectedPet: (pet: Pet | null) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addPetModalOpen: boolean;
  setAddPetModalOpen: (open: boolean) => void;
  editPetModalOpen: Pet | null;
  setEditPetModalOpen: (pet: Pet | null) => void;
  bookingPetId: string | null;
  bookForPet: (petId: string) => void;
  addPet: (draft: PetDraft) => Pet;
  updatePet: (pet: Pet) => void;
  deletePet: (id: string) => void;
  createBooking: (draft: BookingDraft) => Booking | null;
  cancelBooking: (id: string) => void;
  addToCart: (product: Product) => void;
  updateCartQty: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  checkout: () => Order | null;
  saveProfile: (nextProfile: Profile) => void;
  resetDemo: () => void;
  totalCartQty: number;
  cartSubtotal: number;
}

export const DemoStoreContext = createContext<DemoStoreValue | null>(null);

export function useDemoStore() {
  const value = useContext(DemoStoreContext);
  if (!value) throw new Error('useDemoStore must be used within DemoStoreProvider');
  return value;
}

