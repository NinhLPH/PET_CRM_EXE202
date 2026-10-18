import type { Booking, CareReminder, CartItem, Order, OrderItem, Pet, Product, Profile } from './types';

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const list = <T>(value: unknown, guard: (item: unknown) => item is T): value is T[] =>
  Array.isArray(value) && value.every(guard);

export const isPet = (value: unknown): value is Pet => record(value)
  && text(value.id) && text(value.name) && (value.type === 'dog' || value.type === 'cat')
  && text(value.breed) && number(value.age) && number(value.weight)
  && (value.gender === 'Male' || value.gender === 'Female') && text(value.notes);

export const isBooking = (value: unknown): value is Booking => record(value)
  && text(value.id) && text(value.petId) && text(value.petName)
  && text(value.serviceId) && text(value.serviceName) && text(value.date)
  && text(value.time) && text(value.notes) && text(value.staff) && number(value.price)
  && ['Scheduled', 'In Parlor', 'Groomed', 'Cancelled'].includes(String(value.status));

const isOrderItem = (value: unknown): value is OrderItem => record(value)
  && text(value.productId) && text(value.productName)
  && number(value.quantity) && number(value.price);

export const isOrder = (value: unknown): value is Order => record(value)
  && text(value.id) && list(value.items, isOrderItem) && number(value.total)
  && text(value.date) && text(value.address)
  && ['Processing', 'Shipped', 'Delivered'].includes(String(value.status));

export const isProfile = (value: unknown): value is Profile => record(value)
  && text(value.name) && text(value.email) && text(value.phone)
  && text(value.address) && text(value.memberSince) && typeof value.premiumStatus === 'boolean';

export const isReminder = (value: unknown): value is CareReminder => record(value)
  && text(value.id) && text(value.petName) && text(value.title) && text(value.dueDate)
  && ['vaccine', 'treatment', 'checkup'].includes(String(value.type))
  && ['urgent', 'upcoming'].includes(String(value.urgency));

const isProduct = (value: unknown): value is Product => record(value)
  && text(value.id) && text(value.name) && text(value.description)
  && text(value.ingredients) && text(value.colorHex)
  && number(value.price) && number(value.rating)
  && ['grooming', 'wellness', 'treats', 'accessories'].includes(String(value.category))
  && ['In Stock', 'Limited Run', 'Out of Stock'].includes(String(value.stock));

export const isCartItem = (value: unknown): value is CartItem => record(value)
  && isProduct(value.product) && number(value.quantity) && value.quantity >= 1;

export const isListOf = list;
