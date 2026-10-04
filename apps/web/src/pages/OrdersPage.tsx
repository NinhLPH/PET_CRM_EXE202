import { useDemoStore } from '../state/DemoStoreContext';
import { Calendar, User, Clock, Package } from 'lucide-react';

export function OrdersPage() {
  const { bookings, orders, cancelBooking } = useDemoStore();
  return (
    <div className="space-y-10">

      {/* Header Section */}
      <div>
        <h1 className="font-serif text-3xl font-bold text-text-primary">History & Status</h1>
        <p className="text-sm text-text-secondary">Keep track of outstanding clinic bookings and custom apothecary orders.</p>
      </div>

      {/* Segment A: Grooming Appointments Status */}
      <div className="space-y-4">
        <h2 className="font-serif text-xl font-bold text-text-primary border-b border-border-custom pb-2">
          Salon & Grooming Suite Bookings
        </h2>

        {bookings.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-border-custom rounded-lg text-sm text-text-secondary">
              No grooming bookings found. Make your companion's first reservation!
            </div>
        ) : (
            <div className="space-y-4">
              {bookings.map(book => (
                  <div
                      key={book.id}
                      className="bg-surface border border-border-custom rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-plum-noir uppercase bg-plum-pale px-2 py-0.5 rounded">
                  Companion: {book.petName}
                </span>
                        <span className="text-xs text-text-secondary font-mono">ID: {book.id}</span>
                      </div>
                      <h3 className="font-serif font-bold text-lg text-text-primary">{book.serviceName}</h3>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1.5 gap-x-4 text-xs text-text-secondary">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-muted-accent" />
                          <span>Date: {book.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-muted-accent" />
                          <span>Time: {book.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                          <User size={13} className="text-muted-accent" />
                          <span>Stylist: <strong className="text-text-primary">{book.staff}</strong></span>
                        </div>
                      </div>

                      {book.notes && (
                          <p className="text-xs text-text-secondary leading-normal bg-canvas p-2.5 rounded italic">
                            "{book.notes}"
                          </p>
                      )}
                    </div>

                    {/* Right Booking Details & Action Panel */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-border-custom">
                      <div className="text-left md:text-right">
                        <span className="block text-[10px] uppercase text-text-secondary">Total Paid</span>
                        <strong className="font-mono text-plum-noir font-bold text-base">${book.price}.00</strong>
                      </div>

                      <div className="flex items-center gap-2">
                        {book.status === 'Scheduled' ? (
                            <>
                    <span className="text-xs font-semibold text-plum-noir bg-plum-pale border border-plum-noir/40 px-2.5 py-1 rounded inline-flex items-center gap-1 font-mono">
                      <Clock size={12} /> Scheduled
                    </span>
                              <button
                                  onClick={() => {
                                    if (confirm(`Cancel ${book.petName}'s grooming appointment?`)) {
                                      cancelBooking(book.id);
                                    }
                                  }}
                                  className="text-xs text-red-700 hover:bg-red-50 px-2.5 py-1 rounded border border-red-200 transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                        ) : (
                            <span className={`text-xs px-2.5 py-1 rounded font-mono ${book.status === 'Cancelled' ? 'bg-muted-surface text-text-secondary' : 'bg-green-50 text-green-800'}`}>
                    {book.status}
                  </span>
                        )}
                      </div>
                    </div>

                  </div>
              ))}
            </div>
        )}
      </div>

      {/* Segment B: Apothecary Product Orders */}
      <div className="space-y-4">
        <h2 className="font-serif text-xl font-bold text-text-primary border-b border-border-custom pb-2">
          Apothecary Curated Orders
        </h2>

        {orders.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-border-custom rounded-lg text-sm text-text-secondary">
              No boutique orders placed yet.
            </div>
        ) : (
            <div className="space-y-4">
              {orders.map(order => (
                  <div
                      key={order.id}
                      className="bg-surface border border-border-custom rounded-lg p-5 space-y-4"
                  >
                    {/* Top Header of Order card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-custom/50 pb-3">
                      <div className="flex items-center gap-3">
                        <Package size={16} className="text-muted-accent" />
                        <span className="font-mono font-bold text-text-primary">Order ID: {order.id}</span>
                        <span className="text-xs text-text-secondary font-mono">Placed on {order.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 font-semibold rounded font-mono ${order.status === 'Delivered' ? 'bg-green-50 text-green-800' : 'bg-plum-pale text-plum-noir'}`}>
                  {order.status}
                </span>
                      </div>
                    </div>

                    {/* Items Row */}
                    <div className="divide-y divide-border-custom/40">
                      {order.items.map((item, idx) => (
                          <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex-grow min-w-0 pr-4">
                              <span className="font-semibold text-text-primary text-[14px]">{item.productName}</span>
                              <span className="text-text-secondary font-mono text-[11px] block mt-0.5">Quantity: {item.quantity}</span>
                            </div>
                            <span className="font-mono text-text-primary shrink-0 font-medium">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                          </div>
                      ))}
                    </div>

                    {/* Bottom Footer of Order card */}
                    <div className="bg-canvas/50 p-3 rounded border border-border-custom/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-text-secondary">
                      <div className="truncate">
                        <strong className="text-text-primary block">Delivery Location:</strong>
                        <span className="truncate block max-w-sm">{order.address}</span>
                      </div>
                      <div className="sm:text-right shrink-0">
                        <span className="text-[10px] uppercase text-text-secondary block">Grand Total</span>
                        <strong className="font-mono text-plum-noir font-bold text-base">${order.total.toFixed(2)}</strong>
                      </div>
                    </div>

                  </div>
              ))}
            </div>
        )}
      </div>

    </div>
  );
}


