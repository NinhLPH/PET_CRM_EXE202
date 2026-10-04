import { useDemoStore } from '../state/DemoStoreContext';
import { ShoppingBag, Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { APOTHECARY_PRODUCTS } from '../model/mockData';
import type { ShopCategory } from '../model/types';

export function ShopPage() {
  const { setSelectedProduct, addToCart } = useDemoStore();
  const [shopCategory, setShopCategory] = useState<ShopCategory>('all');
  const [shopSearch, setShopSearch] = useState('');
  const [maxPrice, setMaxPrice] = useState(100);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const filteredProducts = APOTHECARY_PRODUCTS.filter(product => {
    const query = shopSearch.toLowerCase();
    return (shopCategory === 'all' || product.category === shopCategory)
      && (product.name.toLowerCase().includes(query)
        || product.description.toLowerCase().includes(query)
        || product.ingredients.toLowerCase().includes(query))
      && product.price <= maxPrice
      && (!onlyInStock || product.stock !== 'Out of Stock');
  });
  return (
    <div className="space-y-8">

      {/* Header section with inline boutique detail */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <span className="text-xs uppercase tracking-widest font-semibold text-muted-accent">Organic Apothecary Remedies</span>
        <h1 className="font-serif text-3xl font-bold text-text-primary">Curated Pet Remedies & Provisions</h1>
        <p className="text-sm text-text-secondary">Botanical formulas without aggressive chemicals or heavy detergents.</p>
      </div>

      {/* Layout Grid: Left Sidebar Filters + Right Product Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Product Search & Filter Sidebar */}
        <div className="bg-surface border border-border-custom rounded-lg p-5 space-y-6 h-fit">

          {/* Search Text Input */}
          <div className="space-y-2">
            <label htmlFor="shop-search" className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">
              Search Remedy
            </label>
            <div className="relative">
              <input
                  id="shop-search"
                  type="text"
                  placeholder="e.g. Chamomile, Ear, Treats..."
                  value={shopSearch}
                  onChange={(e) => setShopSearch(e.target.value)}
                  className="w-full bg-canvas border border-border-custom pl-8 pr-3 py-2 rounded text-xs text-text-primary focus:outline-none focus:border-plum-noir"
              />
              <Search size={13} className="text-muted-accent absolute left-2.5 top-3" />
              {shopSearch && (
                  <button
                      onClick={() => setShopSearch('')}
                      className="absolute right-2.5 top-2.5 text-text-secondary hover:text-plum-noir text-xs font-bold"
                  >
                    <X size={12} />
                  </button>
              )}
            </div>
          </div>

          {/* Category Selector Tabs - Rendered with active background, zero Static Pills */}
          <div className="space-y-2.5">
        <span className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">
          Botanical Category
        </span>
            <div className="flex flex-col gap-1.5">
              {([
                { id: 'all', label: 'All Apothecary' },
                { id: 'grooming', label: 'Grooming Wash' },
                { id: 'wellness', label: 'Wellness Elixirs' },
                { id: 'treats', label: 'Hand-baked Treats' },
                { id: 'accessories', label: 'Artisanal Accessories' }
              ] satisfies { id: ShopCategory; label: string }[]).map(tab => (
                  <button
                      key={tab.id}
                      onClick={() => setShopCategory(tab.id)}
                      className={`w-full text-left text-xs font-medium px-3 py-2 rounded transition-colors whitespace-nowrap truncate ${shopCategory === tab.id ? 'bg-plum-noir text-surface' : 'text-text-secondary hover:bg-canvas hover:text-text-primary'}`}
                  >
                    {tab.label}
                  </button>
              ))}
            </div>
          </div>

          {/* Price Limit Filter (With Live Value Display) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="uppercase tracking-wider font-semibold text-text-secondary">Max Budget</span>
              <strong className="text-plum-noir font-mono font-bold">${maxPrice}</strong>
            </div>
            <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-plum-noir cursor-pointer bg-canvas"
            />
            <div className="flex justify-between text-[10px] text-text-secondary font-mono">
              <span>$10</span>
              <span>$100</span>
            </div>
          </div>

          {/* Stock Switch Filter */}
          <div className="flex items-center justify-between pt-2 border-t border-border-custom/60">
            <span className="text-xs font-semibold text-text-secondary">Only In Stock</span>
            <button
                type="button"
                onClick={() => setOnlyInStock(!onlyInStock)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${onlyInStock ? 'bg-plum-noir' : 'bg-muted-surface'}`}
                role="switch"
                aria-checked={onlyInStock}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow-sm ring-0 transition duration-200 ease-in-out ${onlyInStock ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Reset Filters button */}
          <button
              onClick={() => {
                setShopCategory('all');
                setShopSearch('');
                setMaxPrice(100);
                setOnlyInStock(false);
              }}
              className="w-full text-center border border-border-custom hover:bg-canvas py-2 rounded text-xs font-semibold text-text-secondary hover:text-plum-noir transition-colors"
          >
            Clear Search Filters
          </button>

        </div>

        {/* Product Catalog Grid */}
        <div className="lg:col-span-3 space-y-6">

          {/* Status Bar */}
          <div className="flex justify-between items-center text-xs text-text-secondary pb-1 border-b border-border-custom/50">
            <span>Found <strong className="font-semibold text-text-primary">{filteredProducts.length}</strong> matching provisions</span>
            <span>Filtered by: <strong className="capitalize text-plum-noir">{shopCategory === 'all' ? 'All apothecary' : shopCategory}</strong></span>
          </div>

          {filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-surface border border-border-custom rounded-lg space-y-3">
                <SlidersHorizontal size={36} className="text-muted-accent mx-auto opacity-60" />
                <h3 className="font-serif text-lg font-bold text-text-primary">No botanical remedies found</h3>
                <p className="text-xs text-text-secondary max-w-xs mx-auto">
                  Try resetting your search query, increasing your price budget limit, or clearing the filter categories.
                </p>
                <button
                    onClick={() => {
                      setShopSearch('');
                      setShopCategory('all');
                      setMaxPrice(100);
                    }}
                    className="bg-plum-noir text-surface px-4 py-2 rounded text-xs"
                >
                  Reset All Filters
                </button>
              </div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map(prod => (
                    <div
                        key={prod.id}
                        className="bg-surface border border-border-custom rounded-lg p-4 flex flex-col justify-between hover:border-muted-accent transition-all group cursor-pointer"
                        onClick={() => setSelectedProduct(prod)}
                    >
                      <div className="space-y-3">
                        {/* CSS Elegant Placeholder */}
                        <div className="h-40 rounded flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundColor: prod.colorHex }}>
                          <span className="text-[11px] font-serif font-semibold italic text-plum-noir opacity-70">Apothecary Remedy</span>
                          <div className="mt-2 w-8 h-8 border border-plum-noir/20 rounded-full flex items-center justify-center text-plum-noir/60">
                            <ShoppingBag size={14} />
                          </div>
                          <span className="absolute bottom-2 right-2 text-[9px] text-text-secondary uppercase font-mono">{prod.stock}</span>
                        </div>

                        <div className="text-xs text-text-secondary font-semibold tracking-tight flex justify-between">
                          <span className="uppercase">{prod.category}</span>
                          <span>★ {prod.rating}</span>
                        </div>

                        <h3 className="font-serif font-bold text-base text-text-primary group-hover:text-plum-noir transition-colors line-clamp-1">{prod.name}</h3>
                        <p className="text-xs text-text-secondary leading-normal line-clamp-2">{prod.description}</p>
                      </div>

                      <div className="pt-3 border-t border-border-custom/60 mt-4 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                        <span className="font-mono font-bold text-plum-noir text-[15px]">${prod.price.toFixed(2)}</span>
                        <button
                            onClick={() => addToCart(prod)}
                            className="bg-plum-noir text-surface hover:bg-plum-light px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-colors"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                ))}
              </div>
          )}
        </div>

      </div>

    </div>
  );
}


