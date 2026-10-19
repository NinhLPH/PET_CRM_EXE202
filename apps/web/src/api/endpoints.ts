import {query, request, send} from './client';
import type {
    Activity, SessionContext,
    Availability, AuditEvent, BookingReport, CareReport, OperationResult, ScheduleRule, ValueReport,
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
        context: (signal?: AbortSignal) => request<SessionContext>('/auth/context', {signal}),
        register: (body: { fullName: string; phone: string; password: string; confirmPassword: string; verificationToken?: string }) => send<{
            id: string;
            phone: string;
            role: Role
        }>('POST', '/auth/register', body),
        login: (body: { phone: string; password: string }) => send<{
            role: Role;
            userId: string
        }>('POST', '/auth/login', body),
        logout: () => send<{ success: true }>('POST', '/auth/logout', {}),
        recoveryRequest: (phone: string) => send<{ message: string }>('POST', '/auth/recovery/request', { phone }),
        recover: (body: { phone: string; verificationToken: string; newPassword: string; confirmPassword: string }) => send<{ success: boolean }>('POST', '/auth/recover', body),
    },
    profile: {
        get: (signal?: AbortSignal) => request<Profile>('/me/profile', {signal}),
        update: (body: { fullName?: string; address?: string }) => send<Profile>('PATCH', '/me/profile', body),
    },
    pets: {
        operation: (key: string, signal?: AbortSignal) => request<OperationResult<Pet>>(`/operations/${id(key)}`, {signal}),
        mine: (page = 1, limit = 20, signal?: AbortSignal) => request<Page<Pet>>(`/pets/mine${query({
            page,
            limit
        })}`, {signal}),
        get: (petId: string, signal?: AbortSignal) => request<Pet>(`/pets/${id(petId)}`, {signal}),
        create: (body: PetInput, key?: string) => send<Pet>('POST', '/pets', body, key ? {'Idempotency-Key': key} : undefined),
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
        availability: (serviceId: string, date: string, signal?: AbortSignal) => request<Availability>(`/availability${query({serviceId,date})}`, {signal}),
        operation: (key: string, signal?: AbortSignal) => request<OperationResult<Booking>>(`/bookings/operations/${id(key)}`, {signal}),
    },
    admin: {
        readiness: (signal?: AbortSignal) => request<{status:string;missing?:string[];errors?:string[]}>('/health/ready', {signal}),
        dashboard: (signal?: AbortSignal) => request<Dashboard>('/admin/dashboard', {signal}),
        customers: (q = '', page = 1, signal?: AbortSignal) => request<Page<Customer>>(`/admin/customers${query({
            q,
            page
        })}`, {signal}),
        customer: (customerId: string, signal?: AbortSignal) => request<CustomerDetail>(`/admin/customers/${id(customerId)}`, {signal}),
        createCustomer: (body: CustomerInput, key?: string) => send<Customer>('POST', '/admin/customers', body, key ? {'Idempotency-Key': key} : undefined),
        updateCustomer: (customerId: string, body: Partial<CustomerInput>) => send<Customer>('PATCH', `/admin/customers/${id(customerId)}`, body),
        deleteCustomer: (customerId: string) => send<{ success: true }>('DELETE', `/admin/customers/${id(customerId)}`),
        customerPets: (customerId: string, page = 1, signal?: AbortSignal) => request<Page<Pet>>(`/admin/customers/${id(customerId)}/pets${query({page})}`, {signal}),
        createPet: (customerId: string, body: PetInput, key?: string) => send<Pet>('POST', `/admin/customers/${id(customerId)}/pets`, body, key ? {'Idempotency-Key': key} : undefined),
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
            from?: string;
            to?: string;
            dateBasis?: 'bookingDate'|'completedAt';
            page?: number
        }, signal?: AbortSignal) => request<Page<Booking>>(`/admin/bookings${query(filters)}`, {signal}),
        booking: (bookingId: string, signal?: AbortSignal) => request<Booking>(`/admin/bookings/${id(bookingId)}`, {signal}),
        createBooking: (body: BookingInput & {customerId: string; source: 'COUNTER'|'PHONE'|'ZALO'|'OTHER'; targetStatus: 'PENDING'|'CONFIRMED'}, key: string) => send<Booking>('POST', '/admin/bookings', body, {'Idempotency-Key': key}),
        bookingOperation: (key: string, signal?: AbortSignal) => request<OperationResult<Booking>>(`/admin/bookings/operations/${id(key)}`, {signal}),
        resourceOperation: (key: string, signal?: AbortSignal) => request<OperationResult<unknown>>(`/admin/operations/${id(key)}`, {signal}),
        confirm: (bookingId: string, key?: string) => send<Booking>('POST', `/admin/bookings/${id(bookingId)}/confirm`, {}, key ? {'Idempotency-Key': key} : undefined),
        cancel: (bookingId: string, reason?: string, key?: string) => send<Booking>('POST', `/admin/bookings/${id(bookingId)}/cancel`, reason ? {reason} : {}, key ? {'Idempotency-Key': key} : undefined),
        reschedule: (bookingId: string, bookingDate: string, reason: string, key: string) => send<Booking>('POST', `/admin/bookings/${id(bookingId)}/reschedule`, {bookingDate,reason}, {'Idempotency-Key': key}),
        noShow: (bookingId: string, key: string) => send<Booking>('POST', `/admin/bookings/${id(bookingId)}/no-show`, {}, {'Idempotency-Key': key}),
        complete: (bookingId: string, body: {
            surcharges: { name: string; amount: number; note?: string }[];
            discount: number
        }, key?: string) => send<Booking>('POST', `/admin/bookings/${id(bookingId)}/complete`, body, key ? {'Idempotency-Key': key} : undefined),
        adjust: (bookingId: string, body: {delta: number; reason: string; reversalRef?: string}, key: string) => send<{adjustment: {id:string}; originalTotal: number; adjustedTotal: number; replay?: boolean}>('POST', `/admin/bookings/${id(bookingId)}/adjustments`, body, {'Idempotency-Key': key}),
        reminders: (due: boolean, page = 1, signal?: AbortSignal) => request<Page<Reminder>>(`/admin/reminders${query({
            due,
            page
        })}`, {signal}),
        reminder: (reminderId: string, signal?: AbortSignal) => request<Reminder>(`/admin/reminders/${id(reminderId)}`, {signal}),
        contact: (reminderId: string, body: {
            method: 'PHONE' | 'ZALO' | 'OTHER';
            note?: string
        }, key?: string) => send<Reminder>('POST', `/admin/reminders/${id(reminderId)}/contact`, body, key ? {'Idempotency-Key': key} : undefined),
        activities: (customerId: string, page = 1, signal?: AbortSignal) => request<Page<Activity>>(`/admin/customers/${id(customerId)}/activities${query({page})}`, {signal}),
        addActivity: (customerId: string, body: {
            type: 'NOTE';
            content: string;
            petId?: string
        }, key?: string) => send<Activity>('POST', `/admin/customers/${id(customerId)}/activities`, body, key ? {'Idempotency-Key': key} : undefined),
        weekly: (signal?: AbortSignal) => request<ScheduleRule[]>('/admin/schedule/weekly', {signal}),
        rescheduleAvailability: (bookingId: string, date: string, signal?: AbortSignal) => request<Availability>(`/admin/schedule/bookings/${id(bookingId)}/availability${query({date})}`, {signal}),
        exceptions: (from: string, to: string, signal?: AbortSignal) => request<ScheduleRule[]>(`/admin/schedule/exceptions${query({from,to})}`, {signal}),
        saveWeekly: (weekday: number, body: Pick<ScheduleRule,'intervals'|'capacity'|'slotStep'>) => send<ScheduleRule>('PUT', `/admin/schedule/weekly/${weekday}`, body),
        saveException: (date: string, body: Pick<ScheduleRule,'intervals'|'capacity'|'slotStep'>) => send<ScheduleRule>('PUT', `/admin/schedule/exceptions/${id(date)}`, body),
        deleteException: (date: string) => send<{deleted:boolean}>('DELETE', `/admin/schedule/exceptions/${id(date)}`),
        bookingReport: (from: string, to: string, signal?: AbortSignal) => request<BookingReport>(`/admin/reports/bookings${query({from,to})}`, {signal}),
        valueReport: (from: string, to: string, signal?: AbortSignal) => request<ValueReport>(`/admin/reports/value${query({from,to})}`, {signal}),
        careReport: (from: string, to: string, windowDays: number, signal?: AbortSignal) => request<CareReport>(`/admin/reports/care${query({from,to,windowDays})}`, {signal}),
        audit: (filters: {actorId?:string; action?:string; objectType?:string; objectId?:string; from?:string; to?:string; page?:number}, signal?: AbortSignal) => request<Page<AuditEvent>>(`/admin/audit${query(filters)}`, {signal}),
        identityEvidence: (body: {phone:string; purpose:'LINK'|'RECOVERY'; evidenceSummary:string; customerId?:string}) => send<{verificationToken:string; expiresAt:string}>('POST','/admin/identity-evidence',body),
    },
};
