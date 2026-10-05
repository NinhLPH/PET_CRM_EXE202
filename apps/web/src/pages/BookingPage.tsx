import { useDemoStore } from '../state/DemoStoreContext';
import { Dog, Cat, CheckCircle2 } from 'lucide-react';
import { BOUTIQUE_SERVICES } from '../model/mockData';
import { useEffect, useState, type FormEvent } from 'react';
import type { BookingDraft } from '../state/DemoStoreContext';

export function BookingPage() {
  const { pets, bookingPetId, createBooking, setActiveTab } = useDemoStore();
  const [bookingForm, setBookingForm] = useState<BookingDraft>({
    petId: bookingPetId && pets.some(pet => pet.id === bookingPetId) ? bookingPetId : pets[0]?.id ?? '',
    serviceId: BOUTIQUE_SERVICES[0].id,
    date: '', time: '09:00 AM', notes: '', specialRequest: '',
  });
  const [bookingSuccessMessage, setBookingSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingSuccessMessage) return;
    const timeout = window.setTimeout(() => setActiveTab('orders'), 4500);
    return () => window.clearTimeout(timeout);
  }, [bookingSuccessMessage, setActiveTab]);

  const handleBookingSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const booking = createBooking(bookingForm);
    if (!booking) {
      alert('Please fill out all booking fields.');
      return;
    }
    setBookingSuccessMessage(`Your reservation is secured! ${booking.petName} is scheduled with ${booking.staff} on ${booking.date} at ${booking.time}.`);
    setBookingForm({
      petId: pets[0]?.id ?? '', serviceId: BOUTIQUE_SERVICES[0].id,
      date: '', time: '09:00 AM', notes: '', specialRequest: '',
    });
  };
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold text-text-primary">Request Salon Suite Appointment</h1>
        <p className="text-sm text-text-secondary mt-1">Select a companion's restoration package below.</p>
      </div>

      {bookingSuccessMessage && (
          <div className="bg-surface border-2 border-plum-noir p-4 rounded text-plum-noir text-sm font-medium flex items-center gap-3 animate-pulse">
            <CheckCircle2 size={18} className="text-plum-noir shrink-0" />
            <span>{bookingSuccessMessage}</span>
          </div>
      )}

      <form onSubmit={handleBookingSubmit} className="bg-surface border border-border-custom rounded-lg p-6 space-y-6">

        {/* Step 1: Select Pet */}
        <div className="space-y-3">
          <label className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">
            1. Choose Pet Companion
          </label>
          {pets.length === 0 ? (
              <p className="text-xs text-red-700">Please add a pet in the "My Pets" tab first.</p>
          ) : (
              <div className="grid grid-cols-2 gap-3">
                {pets.map(p => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => setBookingForm(f => ({ ...f, petId: p.id }))}
                        className={`p-3.5 rounded border text-left flex items-center gap-3 transition-all ${bookingForm.petId === p.id ? 'border-2 border-plum-noir bg-plum-pale/30' : 'border-border-custom hover:border-muted-accent'}`}
                    >
                      <div className="p-1.5 rounded-full bg-muted-surface text-plum-noir shrink-0">
                        {p.type === 'dog' ? <Dog size={16} /> : <Cat size={16} />}
                      </div>
                      <div className="truncate">
                        <strong className="block text-sm text-text-primary">{p.name}</strong>
                        <span className="text-xs text-text-secondary block truncate">{p.breed}</span>
                      </div>
                    </button>
                ))}
              </div>
          )}
        </div>

        {/* Step 2: Select Service package */}
        <div className="space-y-3">
          <label className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">
            2. Select Specialized Botanical Service
          </label>
          <div className="space-y-3">
            {BOUTIQUE_SERVICES.map(srv => (
                <button
                    key={srv.id}
                    type="button"
                    onClick={() => setBookingForm(f => ({ ...f, serviceId: srv.id }))}
                    className={`w-full p-4 rounded border text-left flex items-start justify-between transition-all ${bookingForm.serviceId === srv.id ? 'border-2 border-plum-noir bg-plum-pale/30' : 'border-border-custom hover:border-muted-accent'}`}
                >
                  <div className="space-y-1 pr-4">
                    <strong className="block text-[15px] text-text-primary font-serif font-bold">{srv.name}</strong>
                    <p className="text-xs text-text-secondary leading-relaxed">{srv.description}</p>
                    <span className="text-[11px] font-semibold text-muted-accent uppercase tracking-wider block">Duration: {srv.duration}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-base font-bold text-plum-noir">${srv.price}</span>
                  </div>
                </button>
            ))}
          </div>
        </div>

        {/* Step 3: Date & Time Select */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="booking-date" className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">
              3. Target Date
            </label>
            <input
                id="booking-date"
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={bookingForm.date}
                onChange={(e) => setBookingForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-canvas border border-border-custom p-2.5 rounded text-sm text-text-primary focus:outline-none focus:border-plum-noir font-mono"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="booking-time" className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">
              4. Available Time Slot
            </label>
            <select
                id="booking-time"
                value={bookingForm.time}
                onChange={(e) => setBookingForm(f => ({ ...f, time: e.target.value }))}
                className="w-full bg-canvas border border-border-custom p-2.5 rounded text-sm text-text-primary focus:outline-none focus:border-plum-noir"
            >
              <option value="09:00 AM">09:00 AM (Early Soak)</option>
              <option value="10:30 AM">10:30 AM (Morning Trim)</option>
              <option value="12:00 PM">12:00 PM (Midday Rest)</option>
              <option value="01:30 PM">01:30 PM (Afternoon Soak)</option>
              <option value="03:00 PM">03:00 PM (Sunset Polish)</option>
            </select>
          </div>
        </div>

        {/* Step 4: Notes */}
        <div className="space-y-2">
          <label htmlFor="booking-notes" className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">
            Special Notes & Grooming Preferences
          </label>
          <textarea
              id="booking-notes"
              placeholder="e.g. Sensitive paws, prefers lukewarm water, or needs extra quiet time..."
              rows={3}
              value={bookingForm.notes}
              onChange={(e) => setBookingForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full bg-canvas border border-border-custom p-3 rounded text-sm text-text-primary focus:outline-none focus:border-plum-noir leading-relaxed"
          />
        </div>

        {/* Booking Summary Box */}
        {bookingForm.serviceId && (
            <div className="bg-canvas p-4 rounded border border-border-custom text-xs space-y-2">
              <h4 className="font-semibold text-text-primary uppercase tracking-wider">Suite Appointment Summary</h4>
              <div className="flex justify-between">
                <span>Selected Package:</span>
                <strong className="text-text-primary font-medium">
                  {BOUTIQUE_SERVICES.find(s => s.id === bookingForm.serviceId)?.name}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Grooming Price (Botanical care):</span>
                <strong className="text-plum-noir font-mono font-bold">
                  ${BOUTIQUE_SERVICES.find(s => s.id === bookingForm.serviceId)?.price}.00
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <strong className="text-text-primary">
                  {BOUTIQUE_SERVICES.find(s => s.id === bookingForm.serviceId)?.duration}
                </strong>
              </div>
              <p className="text-[10px] text-text-secondary pt-2 border-t border-border-custom/50 italic">
                Note: Cancellations or updates can be made free of charge up to 24 hours prior via the "Order History" tab.
              </p>
            </div>
        )}

        {/* Submit Button */}
        <button
            type="submit"
            disabled={pets.length === 0}
            className="w-full bg-plum-noir hover:bg-plum-light disabled:bg-border-custom disabled:cursor-not-allowed text-surface py-3 rounded font-semibold text-sm transition-colors cursor-pointer"
        >
          Secure Vintage Appointment
        </button>

      </form>
    </div>
  );
}


