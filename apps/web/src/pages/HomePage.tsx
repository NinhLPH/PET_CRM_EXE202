import { useDemoStore } from '../state/DemoStoreContext';
import { Dog, Cat, Calendar, ShoppingBag, User, Plus, ChevronRight, Clock, ShieldAlert, Scissors, Heart, ArrowRight } from 'lucide-react';
import { APOTHECARY_PRODUCTS } from '../model/mockData';

export function HomePage() {
  const { setActiveTab, pets, bookings, profile, reminders, setSelectedPet, setAddPetModalOpen, addToCart } = useDemoStore();
  return (
    <div className="space-y-10">

      {/* Elegant Hero Welcome (Split-screen Style with CSS Fallback Illustration) */}
      <div className="bg-surface border border-border-custom rounded-lg p-6 lg:p-10 flex flex-col lg:flex-row items-center gap-8 justify-between relative overflow-hidden">
        <div className="space-y-4 max-w-lg z-10">
          <span className="text-xs uppercase tracking-widest font-semibold text-muted-accent">Welcome back to TailUp</span>
          <h1 className="text-3xl md:text-4xl font-bold font-serif leading-tight text-text-primary text-wrap-balance">
            Fine grooming care & organic remedies, {profile.name.split(' ')[0]}.
          </h1>
          <p className="text-text-secondary leading-relaxed text-[15px]">
            Crafted with premium natural botanicals for your companions' comfort. Enjoy our vintage-inspired salon suite and carefully filtered herbal apothecary.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
                onClick={() => setActiveTab('book')}
                className="bg-plum-noir text-surface hover:bg-plum-light px-5 py-2.5 rounded font-medium text-sm transition-all inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none"
            >
              <Calendar size={15} />
              Schedule Grooming Soak
            </button>
            <button
                onClick={() => setActiveTab('shop')}
                className="border border-border-custom hover:bg-muted-surface text-text-primary px-5 py-2.5 rounded font-medium text-sm transition-all inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none"
            >
              Browse Organic Remedies
              <ArrowRight size={14} className="text-muted-accent" />
            </button>
          </div>
        </div>

        {/* Premium Vector/CSS Art Graphic of Golden Retriever in Boutique - Since API generation was rate limited */}
        <div className="w-full lg:w-[380px] h-[240px] bg-muted-surface rounded border border-border-custom/50 flex flex-col justify-between p-6 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-radial from-transparent to-[#DDD4D6]/30 pointer-events-none" />
          <div className="flex justify-between items-start z-10">
            <div className="bg-surface/90 backdrop-blur-sm border border-border-custom px-2 py-1 rounded text-[11px] font-medium text-plum-noir">
              Boutique Signature
            </div>
            <Heart size={20} className="text-muted-accent fill-muted-accent" />
          </div>

          {/* SVG dog graphic inside container */}
          <div className="flex justify-center items-center my-auto">
            <svg viewBox="0 0 100 100" className="w-24 h-24 text-plum-noir" fill="currentColor">
              <circle cx="50" cy="50" r="40" className="text-canvas" fill="currentColor" opacity="0.3" />
              <path d="M40 35c-3 0-5 3-5 7s2 10 5 10c1 0 2-1 2-2s1-4 3-4c1 0 1 2 2 3c3 3 7 3 10-1c1-1 2-1 3-1s2 3 5 3c3 0 5-6 5-10s-2-7-5-7c-5 0-6 4-10 4s-5-4-10-4z" />
              <circle cx="43" cy="45" r="3" className="text-surface" fill="currentColor" />
              <circle cx="57" cy="45" r="3" className="text-surface" fill="currentColor" />
              <path d="M48 53h4l-2 3z" className="text-muted-accent" fill="currentColor" />
              <path d="M30 65c15 10 25 10 40 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
          </div>

          <div className="text-center z-10">
            <div className="text-xs font-serif font-bold text-plum-noir italic">"The Botanical Herbal Spa"</div>
            <div className="text-[11px] text-text-secondary">A Gentle Retreat For Every Companion</div>
          </div>
        </div>
      </div>

      {/* Quick Status Block: Care Reminders & Scheduled Booking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Quick Pet Selectors (Boutique Presentation) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-lg font-bold text-text-primary">Our Beloved Companions</h3>
            <button
                onClick={() => setActiveTab('pets')}
                className="text-xs text-muted-accent hover:text-plum-noir underline font-medium cursor-pointer"
            >
              Manage
            </button>
          </div>

          <div className="space-y-3">
            {pets.map(pet => (
                <div
                    key={pet.id}
                    onClick={() => { setSelectedPet(pet); setActiveTab('pets'); }}
                    className="bg-surface border border-border-custom rounded hover:border-muted-accent p-4 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted-surface border border-border-custom/60 flex items-center justify-center text-plum-noir">
                      {pet.type === 'dog' ? <Dog size={18} /> : <Cat size={18} />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-[15px] group-hover:text-plum-noir transition-colors">{pet.name}</h4>
                      <p className="text-xs text-text-secondary">{pet.breed} · {pet.age} yrs old</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-accent group-hover:translate-x-1 transition-transform" />
                </div>
            ))}

            <button
                onClick={() => { setAddPetModalOpen(true); }}
                className="w-full border border-dashed border-border-custom hover:border-plum-noir p-3 rounded text-center text-xs font-semibold text-text-secondary hover:text-plum-noir transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Add Another Pet
            </button>
          </div>
        </div>

        {/* Middle Column: Care Reminders (Task Tracking for Low Cognitive Load) */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="font-serif text-lg font-bold text-text-primary">Important Care Milestones</h3>

          <div className="bg-surface border border-border-custom rounded-lg divide-y divide-border-custom">
            {reminders.length === 0 ? (
                <div className="p-6 text-center text-sm text-text-secondary">
                  No scheduled vaccine or health reminders for your companions.
                </div>
            ) : (
                reminders.map(rem => (
                    <div key={rem.id} className="p-4 flex items-start gap-3.5 hover:bg-muted-surface/20 transition-all">
                      <div className={`mt-0.5 p-2 rounded-full ${rem.urgency === 'urgent' ? 'bg-plum-pale text-plum-noir' : 'bg-muted-surface text-text-secondary'}`}>
                        <ShieldAlert size={15} />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-1">
                  <span className="font-semibold text-xs tracking-wide uppercase text-plum-noir bg-plum-pale px-1 rounded">
                    {rem.petName}
                  </span>
                          <span className="text-xs text-text-secondary font-mono">Due {rem.dueDate}</span>
                        </div>
                        <h4 className="font-medium text-sm text-text-primary mt-1 leading-snug">
                          {rem.title}
                        </h4>
                      </div>
                      {rem.urgency === 'urgent' && (
                          <span className="text-[10px] font-bold text-plum-noir tracking-wider uppercase border border-plum-noir px-1.5 py-0.5 bg-plum-pale rounded shrink-0">
                  Immediate
                </span>
                      )}
                    </div>
                ))
            )}
          </div>
        </div>

        {/* Right Column: Next Booking Preview */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className="font-serif text-lg font-bold text-text-primary">Next Appointment</h3>

          {bookings.filter(b => b.status === 'Scheduled').length === 0 ? (
              <div className="bg-muted-surface/30 border border-border-custom border-dashed rounded-lg p-6 text-center space-y-3">
                <p className="text-xs text-text-secondary">Your companions look forward to their next wash.</p>
                <button
                    onClick={() => setActiveTab('book')}
                    className="text-xs bg-plum-noir text-surface hover:bg-plum-light px-3 py-1.5 rounded transition-colors cursor-pointer"
                >
                  Book Now
                </button>
              </div>
          ) : (
              (() => {
                const nextBooking = bookings.filter(b => b.status === 'Scheduled')[0];
                return (
                    <div className="bg-surface border-2 border-plum-noir rounded p-5 space-y-4 relative">
                      <div className="absolute top-4 right-4 text-plum-noir">
                        <Scissors size={18} />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-muted-accent uppercase tracking-wider block">Grooming Reservation</span>
                        <h4 className="font-serif font-bold text-lg text-text-primary">{nextBooking.petName}</h4>
                        <p className="text-xs text-plum-noir font-semibold">{nextBooking.serviceName}</p>
                      </div>

                      <div className="border-t border-border-custom pt-3 space-y-2 text-xs text-text-secondary">
                        <div className="flex items-center gap-2">
                          <Calendar size={13} className="text-muted-accent" />
                          <span>{nextBooking.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-muted-accent" />
                          <span>{nextBooking.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-muted-accent" />
                          <span>Stylist: <strong className="text-text-primary">{nextBooking.staff}</strong></span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                            onClick={() => setActiveTab('orders')}
                            className="w-full text-center text-xs font-semibold bg-muted-surface hover:bg-border-custom text-text-primary py-2 rounded transition-colors"
                        >
                          Manage Booking
                        </button>
                      </div>
                    </div>
                );
              })()
          )}
        </div>

      </div>

      {/* Curated Product Spotlight Carousel Title */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-xs uppercase tracking-widest font-semibold text-muted-accent">Care Recommendations</span>
            <h3 className="font-serif text-2xl font-bold text-text-primary mt-1">Recommended Apothecary</h3>
          </div>
          <button
              onClick={() => setActiveTab('shop')}
              className="text-xs text-plum-noir hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            View All Products <ArrowRight size={12} />
          </button>
        </div>

        {/* 3 Featured Products Spotlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {APOTHECARY_PRODUCTS.slice(0, 3).map(prod => (
              <div
                  key={prod.id}
                  className="bg-surface border border-border-custom rounded-lg p-5 flex flex-col justify-between hover:border-muted-accent transition-all group"
              >
                <div className="space-y-3">
                  {/* CSS Elegant Placeholder instead of rate limited image */}
                  <div className="h-40 rounded flex flex-col items-center justify-center relative overflow-hidden transition-transform group-hover:scale-[1.01]" style={{ backgroundColor: prod.colorHex }}>
                    <span className="text-xs font-serif font-semibold italic text-plum-noir opacity-70">Apothecary Remedy</span>
                    <div className="mt-2 w-10 h-10 border border-plum-noir/20 rounded-full flex items-center justify-center text-plum-noir/60">
                      <ShoppingBag size={18} />
                    </div>
                    <span className="absolute bottom-2 right-2 text-[10px] text-text-secondary uppercase font-mono">{prod.stock}</span>
                  </div>

                  <div className="text-xs text-text-secondary font-medium tracking-tight flex justify-between">
                    <span className="uppercase">{prod.category}</span>
                    <span>★ {prod.rating}</span>
                  </div>
                  <h4 className="font-serif font-bold text-base text-text-primary group-hover:text-plum-noir transition-colors line-clamp-1">{prod.name}</h4>
                  <p className="text-xs text-text-secondary leading-normal line-clamp-2">{prod.description}</p>
                </div>

                <div className="pt-4 border-t border-border-custom/60 mt-4 flex items-center justify-between">
                  <span className="font-mono font-bold text-plum-noir text-[15px]">${prod.price.toFixed(2)}</span>
                  <button
                      onClick={() => addToCart(prod)}
                      className="bg-plum-noir text-surface hover:bg-plum-light px-3 py-1.5 rounded text-xs font-semibold tracking-wide cursor-pointer transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
          ))}
        </div>
      </div>

      {/* Vintage Boutique Story block */}
      <div className="border border-border-custom p-6 lg:p-8 rounded-lg bg-surface text-center max-w-3xl mx-auto space-y-4">
        <span className="text-xs uppercase tracking-widest font-semibold text-muted-accent">Our Philosophy</span>
        <h3 className="font-serif text-xl font-bold italic text-text-primary">"The Heritage of Gentle Restoration"</h3>
        <p className="text-xs text-text-secondary leading-relaxed max-w-xl mx-auto">
          We believe in slowing down the pet care experience. No high-stress cage dryers, no rushing through baths, and absolutely no heavy synthetic detergents. Each animal is treated with botanical remedies selected for their natural restoring properties.
        </p>
        <div className="text-[11px] text-muted-accent font-semibold tracking-wider uppercase pt-2">
          Est. 2024 · NYC
        </div>
      </div>

    </div>
  );
}


