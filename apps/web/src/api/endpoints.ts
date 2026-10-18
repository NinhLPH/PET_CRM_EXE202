import {query, request, send} from './client';
import type {
    Activity,
    Booking,
    BookingInput,
    BookingStatus,
    Customer,
    CustomerDetail,
    CustomerInput,
    Dashboard,
    Page,
    Pet,
    PetInput,
    Price,
    PriceInput,
    Profile,
    Quote,
    Reminder,
    ReminderConfig,
    Role,
    Service,
    ServiceInput,
    Species,
    Status
} from './types';

const id = (value: string) => encodeURIComponent(value);
export const api = {
    auth: {
        register: (body: { fullName: string; phone: string; password: string; confirmPassword: string }) => send<{
            id: string;
            phone: string;
            role: Role
        }>('POST', '/auth/register', body),
        login: (body: { phone: string; password: string }) => send<{
            role: Role;
            userId: string
        }>('POST', '/auth/login', body),
        logout: () => send<{ success: true }>('POST', '/auth/logout', {}),
    },
    profile: {
        get: (signal?: AbortSignal) => request<Profile>('/me/profile', {signal}),
        update: (body: { fullName?: string; address?: string }) => send<Profile>('PATCH', '/me/profile', body),
    },
    pets: {
        mine: (page = 1, limit = 20, signal?: AbortSignal) => request<Page<Pet>>(`/pets/mine${query({
            page,
            limit
        })}`, {signal}),
        get: (petId: string, signal?: AbortSignal) => request<Pet>(`/pets/${id(petId)}`, {signal}),
        create: (body: PetInput) => send<Pet>('POST', '/pets', body),
        update: (petId: string, body: Partial<PetInput>) => send<Pet>('PATCH', `/pets/${id(petId)}`, body),
        remove: (petId: string) => send<{ success: true }>('DELETE', `/pets/${id(petId)}`),
    },
    services: {
        list: (page = 1, limit = 20, signal?: AbortSignal) => request<Page<Service>>(`/services${query({
            status: 'ACTIVE',
            page,
            limit
        })}`, {signal}),
        quote: (serviceId: string, species: Species, weight: string, signal?: AbortSignal) => request<Quote>(`/services/${id(serviceId)}/quote${query({
            species,
            weight
        })}`, {signal}),
    },
    bookings: {
        mine: (page = 1, limit = 20, signal?: AbortSignal) => request<Page<Booking>>(`/bookings/mine${query({
            page,
            limit
        })}`, {signal}),
        get: (bookingId: string, signal?: AbortSignal) => request<Booking>(`/bookings/${id(bookingId)}`, {signal}),
        create: (body: BookingInput, key: string) => send<Booking>('POST', '/bookings', body, {'Idempotency-Key': key}),
    },
    admin: {
        dashboard: (signal?: AbortSignal) => request<Dashboard>('/admin/dashboard', {signal}),
        customers: (q = '', page = 1, signal?: AbortSignal) => request<Page<Customer>>(`/admin/customers${query({
            q,
            page
        })}`, {signal}),
        customer: (customerId: string, signal?: AbortSignal) => request<CustomerDetail>(`/admin/customers/${id(customerId)}`, {signal}),
        createCustomer: (body: CustomerInput) => send<Customer>('POST', '/admin/customers', body),
        updateCustomer: (customerId: string, body: Partial<CustomerInput>) => send<Customer>('PATCH', `/admin/customers/${id(customerId)}`, body),
        deleteCustomer: (customerId: string) => send<{ success: true }>('DELETE', `/admin/customers/${id(customerId)}`),
        customerPets: (customerId: string, page = 1, signal?: AbortSignal) => request<Page<Pet>>(`/admin/customers/${id(customerId)}/pets${query({page})}`, {signal}),
        createPet: (customerId: string, body: PetInput) => send<Pet>('POST', `/admin/customers/${id(customerId)}/pets`, body),
        updatePet: (petId: string, body: Partial<PetInput>) => send<Pet>('PATCH', `/admin/pets/${id(petId)}`, body),
        deletePet: (petId: string) => send<{ success: true }>('DELETE', `/admin/pets/${id(petId)}`),
        services: (page = 1, signal?: AbortSignal) => request<Page<Service>>(`/admin/services${query({page})}`, {signal}),
        createService: (body: ServiceInput) => send<Service>('POST', '/admin/services', body),
        updateService: (serviceId: string, body: Partial<ServiceInput>) => send<Service>('PATCH', `/admin/services/${id(serviceId)}`, body),
        serviceStatus: (serviceId: string, status: Status) => send<Service>('PATCH', `/admin/services/${id(serviceId)}/status`, {status}),
        prices: (serviceId: string, species: Species, page = 1, signal?: AbortSignal) => request<Page<Price>>(`/admin/services/${id(serviceId)}/prices${query({
            species,
            page
        })}`, {signal}),
        createPrice: (serviceId: string, body: PriceInput) => send<Price>('POST', `/admin/services/${id(serviceId)}/prices`, body),
        updatePrice: (serviceId: string, priceId: string, body: PriceInput) => send<Price>('PATCH', `/admin/services/${id(serviceId)}/prices/${id(priceId)}`, body),
        priceStatus: (priceId: string, status: Status) => send<Price>('PATCH', `/admin/prices/${id(priceId)}/status`, {status}),
        reminderConfig: (serviceId: string, signal?: AbortSignal) => request<ReminderConfig | null>(`/admin/services/${id(serviceId)}/reminder-config`, {signal}),
        putReminderConfig: (serviceId: string, reminderDays: number) => send<ReminderConfig>('PUT', `/admin/services/${id(serviceId)}/reminder-config`, {reminderDays}),
        bookings: (filters: {
            status?: BookingStatus;
            date?: string;
            page?: number
        }, signal?: AbortSignal) => request<Page<Booking>>(`/admin/bookings${query(filters)}`, {signal}),
        booking: (bookingId: string, signal?: AbortSignal) => request<Booking>(`/admin/bookings/${id(bookingId)}`, {signal}),
        confirm: (bookingId: string) => send<Booking>('POST', `/admin/bookings/${id(bookingId)}/confirm`, {}),
        cancel: (bookingId: string, reason?: string) => send<Booking>('POST', `/admin/bookings/${id(bookingId)}/cancel`, reason ? {reason} : {}),
        complete: (bookingId: string, body: {
            surcharges: { name: string; amount: number; note?: string }[];
            discount: number
        }) => send<Booking>('POST', `/admin/bookings/${id(bookingId)}/complete`, body),
        reminders: (due: boolean, page = 1, signal?: AbortSignal) => request<Page<Reminder>>(`/admin/reminders${query({
            due,
            page
        })}`, {signal}),
        reminder: (reminderId: string, signal?: AbortSignal) => request<Reminder>(`/admin/reminders/${id(reminderId)}`, {signal}),
        contact: (reminderId: string, body: {
            method: 'PHONE' | 'ZALO' | 'OTHER';
            note?: string
        }) => send<Reminder>('POST', `/admin/reminders/${id(reminderId)}/contact`, body),
        activities: (customerId: string, page = 1, signal?: AbortSignal) => request<Page<Activity>>(`/admin/customers/${id(customerId)}/activities${query({page})}`, {signal}),
        addActivity: (customerId: string, body: {
            type: 'NOTE';
            content: string;
            petId?: string
        }) => send<Activity>('POST', `/admin/customers/${id(customerId)}/activities`, body),
    },
};
