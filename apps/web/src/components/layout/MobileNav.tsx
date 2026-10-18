import { useDemoStore } from '../../state/DemoStoreContext';
import { Dog, Calendar, ShoppingBag, User, Clock, Heart } from 'lucide-react';

export function MobileNav() {
  const { activeTab, setActiveTab } = useDemoStore();
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-md border-t border-border-custom md:hidden h-16 pb-safe">
      <div className="grid grid-cols-6 items-center h-full text-center">
        {([
          { id: 'home', label: 'Home', icon: <Heart size={16} /> },
          { id: 'pets', label: 'Pets', icon: <Dog size={16} /> },
          { id: 'book', label: 'Book', icon: <Calendar size={16} /> },
          { id: 'shop', label: 'Shop', icon: <ShoppingBag size={16} /> },
          { id: 'orders', label: 'History', icon: <Clock size={16} /> },
          { id: 'profile', label: 'Profile', icon: <User size={16} /> }
        ] as const).map(tab => (
            <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`flex flex-col items-center justify-center h-full cursor-pointer ${activeTab === tab.id ? 'text-plum-noir font-bold' : 'text-text-secondary'}`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium tracking-tight mt-0.5">{tab.label}</span>
            </button>
        ))}
      </div>
    </footer>
  );
}


