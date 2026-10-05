import { useDemoStore } from '../../state/DemoStoreContext';
import { ShoppingBag, X, ShoppingBag as BagIcon } from 'lucide-react';

export function CartDrawer() {
  const { setActiveTab, profile, cart, setIsCartOpen, updateCartQty, removeFromCart, checkout, cartSubtotal } = useDemoStore();
  const handleCheckout = () => {
    const order = checkout();
    if (order) alert(`Thank you! Order ${order.id} has been placed. We are preparing your organic package.`);
  };
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop blur overlay */}
      <div
          onClick={() => setIsCartOpen(false)}
          className="absolute inset-0 bg-plum-noir/30 backdrop-blur-sm transition-opacity"
      />

      <div className="absolute z-10 inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface border-l border-border-custom flex flex-col justify-between">

          {/* Basket Header */}
          <div className="px-4 py-5 bg-canvas border-b border-border-custom flex items-center justify-between sm:px-6">
            <div className="flex items-center gap-2">
              <BagIcon size={18} className="text-plum-noir" />
              <h2 className="text-lg font-bold font-serif text-text-primary">Apothecary Basket</h2>
            </div>
            <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 text-text-secondary hover:text-plum-noir rounded focus:outline-none"
                aria-label="Close basket"
            >
              <X size={20} />
            </button>
          </div>

          {/* Basket Content */}
          <div className="flex-1 overflow-y-auto py-4 px-4 sm:px-6 space-y-4">
            {cart.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <ShoppingBag size={32} className="text-muted-accent mx-auto opacity-50" />
                  <p className="text-xs text-text-secondary italic">Your apothecary shopping basket is empty.</p>
                  <button
                      onClick={() => { setIsCartOpen(false); setActiveTab('shop'); }}
                      className="text-xs bg-plum-noir text-surface px-3 py-1.5 rounded"
                  >
                    Browse Remedies
                  </button>
                </div>
            ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                      <div key={item.product.id} className="flex items-start justify-between gap-4 pb-4 border-b border-border-custom/50">
                        {/* Placeholder image representation with colorHex background */}
                        <div className="w-12 h-12 rounded shrink-0 flex items-center justify-center text-xs" style={{ backgroundColor: item.product.colorHex }}>
                          <ShoppingBag size={14} className="text-plum-noir/50" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className="text-xs font-bold text-text-primary leading-tight truncate">{item.product.name}</h4>
                          <span className="text-[10px] text-text-secondary capitalize">{item.product.category}</span>
                          <div className="flex items-center gap-2 mt-1.5">
                            <button
                                onClick={() => updateCartQty(item.product.id, -1)}
                                className="w-5 h-5 bg-canvas border border-border-custom rounded flex items-center justify-center hover:bg-muted-surface text-xs font-mono"
                            >
                              -
                            </button>
                            <span className="text-xs font-mono font-bold text-text-primary w-4 text-center">
                      {item.quantity}
                    </span>
                            <button
                                onClick={() => updateCartQty(item.product.id, 1)}
                                className="w-5 h-5 bg-canvas border border-border-custom rounded flex items-center justify-center hover:bg-muted-surface text-xs font-mono"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="block text-xs font-mono font-bold text-plum-noir">${(item.product.price * item.quantity).toFixed(2)}</span>
                          <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-[10px] text-red-700 hover:underline mt-1 cursor-pointer block"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                  ))}
                </div>
            )}
          </div>

          {/* Basket Footer with COD details */}
          <div className="border-t border-border-custom p-4 bg-canvas sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-text-secondary">
                <span>Apothecary Subtotal:</span>
                <span className="font-mono">${cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-text-secondary">
                <span>VIP Ground Courier:</span>
                <span className="font-mono text-green-700 uppercase font-semibold">Free (Gold)</span>
              </div>
              <div className="flex justify-between text-sm font-serif font-bold text-text-primary pt-1.5 border-t border-border-custom/40">
                <span>Order Total:</span>
                <span className="font-mono text-plum-noir">${cartSubtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Delivery details display */}
            <div className="bg-surface p-2.5 rounded border border-border-custom text-[11px] text-text-secondary space-y-1">
              <strong>Delivering to {profile.name}:</strong>
              <p className="truncate">{profile.address}</p>
            </div>

            <div className="pt-1">
              <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className="w-full bg-plum-noir hover:bg-plum-light disabled:bg-border-custom disabled:cursor-not-allowed text-surface py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Confirm & Ship Apothecary Order
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}



