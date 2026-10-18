import type {BookingInput} from '../api/types';

export type PendingBooking = { key: string; customerId: string; body: BookingInput };
const storageKey = 'petcare_pending_booking_v1';

export function clearPendingBooking() {
    try {
        sessionStorage.removeItem(storageKey);
    } catch { /* Storage may be disabled. */
    }
}

export function readPendingBooking(): PendingBooking | null {
    try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) return null;
        const value = JSON.parse(raw) as PendingBooking;
        if (typeof value.key !== 'string' || !value.key || typeof value.customerId !== 'string' || !/^\d+$/.test(value.customerId)
            || typeof value.body?.petId !== 'string' || typeof value.body.serviceId !== 'string'
            || typeof value.body.bookingDate !== 'string' || !Number.isFinite(Date.parse(value.body.bookingDate))
            || !Number.isSafeInteger(value.body.expectedBasePrice) || value.body.expectedBasePrice <= 0
            || (value.body.note !== undefined && typeof value.body.note !== 'string')) {
            clearPendingBooking();
            return null;
        }
        return value;
    } catch {
        clearPendingBooking();
        return null;
    }
}

export function writePendingBooking(value: PendingBooking) {
    try {
        sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
        throw new Error('Không thể lưu yêu cầu trên trình duyệt. Vui lòng bật lưu trữ phiên rồi thử lại.');
    }
}

export function retainPendingForCustomer(customerId: string) {
    const pending = readPendingBooking();
    if (pending && pending.customerId !== customerId) clearPendingBooking();
}
