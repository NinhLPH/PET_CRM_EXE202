import { useDemoStore } from '../../state/DemoStoreContext';
import { ShoppingBag, X } from 'lucide-react';

export function ProductModal() {
  const { selectedProduct, setSelectedProduct, addToCart } = useDemoStore();
  if (!selectedProduct) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
            onClick={() => setSelectedProduct(null)}
            className="fixed inset-0 bg-plum-noir/40 backdrop-blur-sm transition-opacity"
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="relative z-10 inline-block align-bottom bg-surface border border-border-custom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="relative">
            {/* Close Button */}
            <button
                onClick={() => setSelectedProduct(null)}
                className="absolute right-4 top-4 bg-surface/80 p-1.5 rounded-full border border-border-custom text-text-secondary hover:text-plum-noir transition-colors z-10"
            >
              <X size={16} />
            </button>

            {/* Elegant Vintage Background placeholder instead of image */}
            <div className="h-56 flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundColor: selectedProduct.colorHex }}>
              <span className="text-xs font-serif font-semibold italic text-plum-noir opacity-80">Botanical Curated Selection</span>
              <div className="mt-3 w-12 h-12 border border-plum-noir/30 rounded-full flex items-center justify-center text-plum-noir">
                <ShoppingBag size={20} />
              </div>
              <div className="absolute bottom-3 left-3 bg-surface/90 border border-border-custom px-2 py-0.5 rounded text-[11px] font-medium font-mono text-plum-noir">
                ★ {selectedProduct.rating} Rating
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-xs font-semibold text-muted-accent uppercase tracking-wider">{selectedProduct.category}</span>
                  <h3 className="font-serif text-2xl font-bold text-text-primary mt-0.5">{selectedProduct.name}</h3>
                </div>
                <span className="font-mono text-xl font-bold text-plum-noir">${selectedProduct.price.toFixed(2)}</span>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                {selectedProduct.description}
              </p>

              {/* Active Ingredients list */}
              <div className="space-y-1 bg-canvas p-3.5 rounded border border-border-custom/50">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-accent block">Organic Composition / Ingredients</span>
                <p className="text-xs text-text-primary italic leading-relaxed">
                  {selectedProduct.ingredients}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>Boutique Stock: <strong className="text-text-primary">{selectedProduct.stock}</strong></span>
                <span>VIP Ground courier delivery available</span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                    onClick={() => {
                      setSelectedProduct(null);
                    }}
                    className="flex-1 text-center border border-border-custom hover:bg-canvas py-2.5 rounded text-xs font-bold text-text-secondary uppercase transition-colors"
                >
                  Back to Apothecary
                </button>
                <button
                    onClick={() => {
                      addToCart(selectedProduct);
                      setSelectedProduct(null);
                    }}
                    className="flex-1 text-center bg-plum-noir hover:bg-plum-light text-surface py-2.5 rounded text-xs font-bold uppercase transition-colors"
                >
                  Add To Basket
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



