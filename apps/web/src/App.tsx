import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { AddPetModal } from './features/pets/AddPetModal';
import { EditPetModal } from './features/pets/EditPetModal';
import { CartDrawer } from './features/shop/CartDrawer';
import { ProductModal } from './features/shop/ProductModal';
import { BookingPage } from './pages/BookingPage';
import { HomePage } from './pages/HomePage';
import { OrdersPage } from './pages/OrdersPage';
import { PetsPage } from './pages/PetsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ShopPage } from './pages/ShopPage';
import { useDemoStore } from './state/DemoStoreContext';

export default function App() {
  const { activeTab, isCartOpen, selectedProduct, addPetModalOpen, editPetModalOpen } = useDemoStore();

  return (
    <div className="min-h-screen bg-canvas font-sans flex flex-col selection:bg-plum-pale selection:text-plum-noir">
      <Header />
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 lg:px-8 py-6 md:py-10 pb-24 md:pb-12">
        {activeTab === 'home' && <HomePage />}
        {activeTab === 'pets' && <PetsPage />}
        {activeTab === 'book' && <BookingPage />}
        {activeTab === 'shop' && <ShopPage />}
        {activeTab === 'orders' && <OrdersPage />}
        {activeTab === 'profile' && <ProfilePage />}
      </main>
      <MobileNav />
      {isCartOpen && <CartDrawer />}
      {selectedProduct && <ProductModal />}
      {addPetModalOpen && <AddPetModal />}
      {editPetModalOpen && <EditPetModal key={editPetModalOpen.id} pet={editPetModalOpen} />}
    </div>
  );
}
