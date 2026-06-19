import { useState } from 'react';
import { ShoppingBag, ArrowRight, Heart, Sparkles, MapPin, Clock, Search } from 'lucide-react';
import { categories, foodItems } from './data';
import { SearchBar } from './components/SearchBar';
import { FoodGrid } from './components/FoodGrid';
import { SupportChat } from './components/SupportChat';
import { CartItem, FoodItem } from './types';
import { CartDrawer } from './components/CartDrawer';

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Filter food items based on category selection AND text search query
  const filteredFoodItems = foodItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.restaurant.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  // Cart operations
  const handleAddToCart = (item: FoodItem) => {
    setCartItems(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item, quantity: 1 }];
    });
    // Optional: Open the drawer automatically when adding for an interactive feel
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCartItems(prev => {
      return prev.map(c => {
        if (c.item.id === itemId) {
          const newQty = c.quantity + delta;
          return { ...c, quantity: newQty < 1 ? 1 : newQty };
        }
        return c;
      });
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems(prev => prev.filter(c => c.item.id !== itemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const totalCartCount = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 select-none">
      {/* Navigation Headers */}
      <nav className="bg-white/85 backdrop-blur-md border-b border-slate-100 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🍔</span>
          <h1 className="text-2xl font-black text-orange-500 tracking-tight">
            Food<span className="text-slate-800">Fix</span>
          </h1>
        </div>

        {/* Delivery Details indicator */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-100 px-3.5 py-1.5 rounded-full text-slate-600 font-bold text-xs">
          <MapPin size={14} className="text-orange-500" />
          <span>Deliver to: <b>University Avenue, CA</b></span>
        </div>

        {/* Toolbar with Cart */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsCartOpen(true)}
            id="view-cart-button"
            className="bg-slate-950 hover:bg-slate-800 text-white rounded-full px-5 py-2.5 flex items-center gap-2.5 shadow-md hover:shadow-orange-100 active:scale-95 transition-all text-xs font-bold cursor-pointer relative"
          >
            <ShoppingBag size={16} />
            <span className="hidden sm:inline">My Cart</span>
            {totalCartCount > 0 && (
              <span className="bg-orange-500 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] absolute -top-1.5 -right-1.5 animate-bounce">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Hero Header Area */}
      <header className="relative pt-16 pb-12 bg-gradient-to-b from-orange-50/60 to-white text-center px-4 overflow-hidden border-b border-orange-100/30">
        <div className="absolute top-1/2 left-10 text-orange-100 text-[10rem] select-none -translate-y-1/2 font-extrabold stroke-1 pointer-events-none opacity-20">
          DELICIOUS
        </div>
        <div className="absolute top-1/2 right-10 text-orange-100 text-[10rem] select-none -translate-y-1/2 font-extrabold stroke-1 pointer-events-none opacity-20">
          FAST
        </div>

        {/* Marketing Badge */}
        <div className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 font-bold text-[10px] tracking-wider uppercase px-3 py-1 rounded-full mb-4">
          <Sparkles size={11} className="animate-spin" />
          <span>Double Quick Deliveries At Your Doorstep</span>
        </div>

        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-2xl mx-auto mb-6">
          Hungry? <span className="text-orange-500">We've got you covered.</span>
        </h2>
        
        {/* State Linked Search Bar */}
        <div className="max-w-2xl mx-auto">
          <SearchBar value={searchTerm} onChange={setSearchTerm} />
        </div>

        {/* Clear query indicator */}
        {searchTerm && (
          <p className="text-xs text-slate-400 font-medium mt-3">
            Showing results matching "<span className="text-orange-500 font-bold">{searchTerm}</span>"
            <button 
              onClick={() => setSearchTerm('')} 
              className="ml-2 underline hover:text-slate-600 font-bold"
            >
              Clear
            </button>
          </p>
        )}
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-8 space-y-12">
        
        {/* Categories Filtering Section */}
        <section className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Discover Cuisine Categories</h3>
            {selectedCategory && (
              <button 
                onClick={() => setSelectedCategory(null)}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x">
            {categories.map(c => {
              const isSelected = selectedCategory === c.name;
              return (
                <button 
                  key={c.id} 
                  onClick={() => setSelectedCategory(isSelected ? null : c.name)}
                  className={`flex flex-col items-center justify-center gap-2 min-w-[5.5rem] bg-white p-4 rounded-2xl border transition-all cursor-pointer snap-start ${
                    isSelected 
                      ? 'border-orange-500 bg-orange-50/50 shadow-md ring-2 ring-orange-500/10 -translate-y-1 scale-102' 
                      : 'border-slate-100 hover:border-orange-200 hover:shadow-xs active:scale-98'
                  }`}
                >
                  <span className="text-3.5xl filter drop-shadow-sm">{c.icon}</span>
                  <span className={`font-bold text-xs select-none ${isSelected ? 'text-orange-600' : 'text-slate-600'}`}>
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Food Grid Display Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-center bg-slate-100/40 p-4 rounded-2xl border border-slate-200/50">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-orange-500"></span>
              <h3 className="text-lg font-bold text-slate-800">
                {selectedCategory ? `${selectedCategory} Specials` : "Popular dishes near you"}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-bold">{filteredFoodItems.length} items available</span>
          </div>

          {filteredFoodItems.length > 0 ? (
            <FoodGrid items={filteredFoodItems} onAddToCart={handleAddToCart} />
          ) : (
            /* Empty Search/Filter State */
            <div className="py-16 text-center bg-white rounded-3xl border border-slate-100 shadow-xs max-w-xl mx-auto flex flex-col items-center justify-center p-8 space-y-4">
              <span className="text-5xl">🌮🛑</span>
              <h4 className="text-lg font-bold text-slate-800">No dishes match your preferences</h4>
              <p className="text-slate-400 text-xs max-w-sm">
                We couldn't locate any meals in the database matching "{searchTerm || selectedCategory}". Reset search or try selecting a different category.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory(null);
                }}
                className="bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Persistent Support Chat Widget */}
      <SupportChat />

      {/* Cart Drawer Canvas Sidebar */}
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
      />
    </div>
  );
}
