import { useState, type ReactNode } from 'react';
import {
  BOUTIQUE_SERVICES,
  INITIAL_BOOKINGS,
  INITIAL_ORDERS,
  INITIAL_PETS,
  INITIAL_PROFILE,
  INITIAL_REMINDERS,
} from '../model/mockData';
import { isBooking, isCartItem, isListOf, isOrder, isPet, isProfile, isReminder } from '../model/storageGuards';
import type {
  Booking,
  CareReminder,
  CartItem,
  Order,
  OrderItem,
  Pet,
  Product,
  Profile,
  TabId,
} from '../model/types';
import { useLocalStorageState } from './useLocalStorageState';
import { DemoStoreContext, type DemoStoreValue, type PetDraft, type BookingDraft } from './DemoStoreContext';

const STORAGE_KEYS = [
  'petcare_pets', 'petcare_bookings', 'petcare_orders',
  'petcare_profile', 'petcare_reminders', 'petcare_cart',
] as const;

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [pets, setPets] = useLocalStorageState<Pet[]>('petcare_pets', INITIAL_PETS, value => isListOf(value, isPet));
  const [bookings, setBookings] = useLocalStorageState<Booking[]>('petcare_bookings', INITIAL_BOOKINGS, value => isListOf(value, isBooking));
  const [orders, setOrders] = useLocalStorageState<Order[]>('petcare_orders', INITIAL_ORDERS, value => isListOf(value, isOrder));
  const [profile, setProfile] = useLocalStorageState<Profile>('petcare_profile', INITIAL_PROFILE, isProfile);
  const [reminders, setReminders] = useLocalStorageState<CareReminder[]>('petcare_reminders', INITIAL_REMINDERS, value => isListOf(value, isReminder));
  const [cart, setCart] = useLocalStorageState<CartItem[]>('petcare_cart', [], value => isListOf(value, isCartItem));

  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [addPetModalOpen, setAddPetModalOpen] = useState(false);
  const [editPetModalOpen, setEditPetModalOpen] = useState<Pet | null>(null);
  const [bookingPetId, setBookingPetId] = useState<string | null>(null);

  const bookForPet = (petId: string) => {
    setBookingPetId(petId);
    setActiveTab('book');
  };

  const addPet = (draft: PetDraft) => {
    const pet: Pet = {
      id: `pet-${Date.now()}`,
      name: draft.name,
      type: draft.type,
      breed: draft.breed,
      age: Number(draft.age) || 1,
      weight: Number(draft.weight) || 10,
      gender: draft.gender,
      notes: draft.notes,
    };
    setPets(current => [...current, pet]);
    setAddPetModalOpen(false);
    return pet;
  };

  const updatePet = (pet: Pet) => {
    setPets(current => current.map(item => item.id === pet.id ? pet : item));
    setSelectedPet(current => current?.id === pet.id ? pet : current);
    setEditPetModalOpen(null);
  };

  const deletePet = (id: string) => {
    setPets(current => current.filter(pet => pet.id !== id));
    setSelectedPet(current => current?.id === id ? null : current);
    setBookingPetId(current => current === id ? null : current);
  };

  const createBooking = (draft: BookingDraft) => {
    const pet = pets.find(item => item.id === draft.petId);
    const service = BOUTIQUE_SERVICES.find(item => item.id === draft.serviceId);
    if (!pet || !service || !draft.date || !draft.time) return null;

    const booking: Booking = {
      id: `b-${Date.now()}`,
      petId: pet.id,
      petName: pet.name,
      serviceId: service.id,
      serviceName: service.name,
      date: draft.date,
      time: draft.time,
      notes: draft.notes,
      status: 'Scheduled',
      price: service.price,
      staff: ['Claire Dumont', 'Julian Moreau', 'Amara Vance'][Math.floor(Math.random() * 3)],
    };
    const reminderDate = new Date(draft.date);
    reminderDate.setMonth(reminderDate.getMonth() + 1);
    const reminder: CareReminder = {
      id: `rem-${Date.now()}`,
      petName: pet.name,
      title: 'Follow-up Grooming Recommendation',
      dueDate: reminderDate.toISOString().split('T')[0],
      type: 'checkup',
      urgency: 'upcoming',
    };
    setBookings(current => [booking, ...current]);
    setReminders(current => [reminder, ...current]);
    return booking;
  };

  const cancelBooking = (id: string) => {
    setBookings(current => current.map(item => item.id === id ? { ...item, status: 'Cancelled' } : item));
  };

  const addToCart = (product: Product) => {
    setCart(current => {
      const existing = current.find(item => item.product.id === product.id);
      return existing
        ? current.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(current => current.map(item => item.product.id === productId
      ? { ...item, quantity: Math.max(1, item.quantity + delta) }
      : item));
  };

  const removeFromCart = (productId: string) => {
    setCart(current => current.filter(item => item.product.id !== productId));
  };

  const checkout = () => {
    if (cart.length === 0) return null;
    const items: OrderItem[] = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
    }));
    const order: Order = {
      id: `ord-${Math.floor(1000 + Math.random() * 9000)}`,
      items,
      total: cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
      date: new Date().toISOString().split('T')[0],
      status: 'Processing',
      address: profile.address,
    };
    setOrders(current => [order, ...current]);
    setCart([]);
    setIsCartOpen(false);
    setSelectedProduct(null);
    setActiveTab('orders');
    return order;
  };

  const resetDemo = () => {
    try {
      for (const key of STORAGE_KEYS) localStorage.removeItem(key);
    } catch {
      // State can still be reset when storage is blocked.
    }
    setPets(INITIAL_PETS);
    setBookings(INITIAL_BOOKINGS);
    setOrders(INITIAL_ORDERS);
    setProfile(INITIAL_PROFILE);
    setReminders(INITIAL_REMINDERS);
    setCart([]);
    setSelectedPet(null);
    setSelectedProduct(null);
    setIsCartOpen(false);
    setBookingPetId(null);
    setActiveTab('home');
  };

  const value: DemoStoreValue = {
    activeTab, setActiveTab, pets, bookings, orders, profile, reminders, cart,
    selectedPet, setSelectedPet, selectedProduct, setSelectedProduct,
    isCartOpen, setIsCartOpen, addPetModalOpen, setAddPetModalOpen,
    editPetModalOpen, setEditPetModalOpen, bookingPetId, bookForPet,
    addPet, updatePet, deletePet, createBooking, cancelBooking,
    addToCart, updateCartQty, removeFromCart, checkout, saveProfile: setProfile, resetDemo,
    totalCartQty: cart.reduce((sum, item) => sum + item.quantity, 0),
    cartSubtotal: cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  };

  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}

