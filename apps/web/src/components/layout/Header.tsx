import { useDemoStore } from '../../state/DemoStoreContext';
import { ShoppingBag, User } from 'lucide-react';

export function Header() {
  const { activeTab, setActiveTab, profile, setIsCartOpen, totalCartQty } = useDemoStore();
  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border-custom px-4 lg:px-8 py-4 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between">

        {/* Zone 1: Wordmark / Brand Logo in Elegant Serif Display */}
        <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 cursor-pointer focus-visible:outline-none"
        >
        <span className="font-serif text-2xl font-bold tracking-tight text-plum-noir">
          TailUp <span className="font-sans text-xs uppercase tracking-widest font-normal text-muted-accent block lg:inline lg:ml-1">Boutique</span>
        </span>
        </button>

        {/* Zone 2: Navigation Links, Unboxed, Muted, 1-2 Word labels */}
        <nav className="hidden md:flex items-center gap-6 text-[15px] font-medium text-text-secondary">
          <button
              onClick={() => setActiveTab('home')}
              className={`hover:text-plum-noir cursor-pointer transition-colors ${activeTab === 'home' ? 'text-plum-noir font-semibold underline underline-offset-4 decoration-2 decoration-plum-noir' : ''}`}
          >
            Home
          </button>
          <button
              onClick={() => setActiveTab('pets')}
              className={`hover:text-plum-noir cursor-pointer transition-colors ${activeTab === 'pets' ? 'text-plum-noir font-semibold underline underline-offset-4 decoration-2 decoration-plum-noir' : ''}`}
          >
            My Pets
          </button>
          <button
              onClick={() => setActiveTab('book')}
              className={`hover:text-plum-noir cursor-pointer transition-colors ${activeTab === 'book' ? 'text-plum-noir font-semibold underline underline-offset-4 decoration-2 decoration-plum-noir' : ''}`}
          >
            Book Service
          </button>
          <button
              onClick={() => setActiveTab('shop')}
              className={`hover:text-plum-noir cursor-pointer transition-colors ${activeTab === 'shop' ? 'text-plum-noir font-semibold underline underline-offset-4 decoration-2 decoration-plum-noir' : ''}`}
          >
            Apothecary Shop
          </button>
          <button
              onClick={() => setActiveTab('orders')}
              className={`hover:text-plum-noir cursor-pointer transition-colors ${activeTab === 'orders' ? 'text-plum-noir font-semibold underline underline-offset-4 decoration-2 decoration-plum-noir' : ''}`}
          >
            Order History
          </button>
          <button
              onClick={() => setActiveTab('profile')}
              className={`hover:text-plum-noir cursor-pointer transition-colors ${activeTab === 'profile' ? 'text-plum-noir font-semibold underline underline-offset-4 decoration-2 decoration-plum-noir' : ''}`}
          >
            Profile
          </button>
        </nav>

        {/* Zone 3: Interactive Affordance & Customer Drawer Action */}
        <div className="flex items-center gap-3">
          {/* Quick Profile Widget */}
          <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2 hover:bg-muted-surface px-3 py-1.5 rounded text-sm text-text-primary transition-colors focus-visible:ring-1 focus-visible:ring-plum-noir"
              aria-label="View user profile"
          >
            <User size={16} className="text-muted-accent" />
            <span className="hidden sm:inline font-medium text-xs tracking-tight text-text-secondary truncate max-w-[110px]">
            {profile.name.split(' ')[0]}
          </span>
          </button>

          {/* Shopping Cart Trigger */}
          <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-plum-noir hover:bg-muted-surface rounded transition-colors focus-visible:ring-1 focus-visible:ring-plum-noir cursor-pointer"
              aria-label="Open boutique basket"
          >
            <ShoppingBag size={18} />
            {totalCartQty > 0 && (
                <span className="absolute -top-1 -right-1 bg-plum-noir text-surface text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center font-mono">
              {totalCartQty}
            </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}


