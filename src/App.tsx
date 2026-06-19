import React, { useState, useEffect } from 'react';
import { ShoppingBag, ArrowRight, Heart, Sparkles, MapPin, Clock, Search, LogOut } from 'lucide-react';
import { categories, foodItems } from './data';
import { SearchBar } from './components/SearchBar';
import { FoodGrid } from './components/FoodGrid';
import { SupportChat } from './components/SupportChat';
import { CartItem, FoodItem } from './types';
import { CartDrawer } from './components/CartDrawer';
import { supabase, isSupabaseConfigured } from './supabase';
import { User } from '@supabase/supabase-js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [loginSent, setLoginSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [pastedLink, setPastedLink] = useState('');
  const [pastedLinkError, setPastedLinkError] = useState('');

  // Handle Supabase auth state changes and initial session check
  useEffect(() => {
    const checkUser = async () => {
      try {
        if (!isSupabaseConfigured) {
          setAuthLoading(false);
          return;
        }

        // Check if there is a hash parameter in the CURRENT URL containing access_token
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
          const params = new URLSearchParams(hash.replace('#', '?'));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken) {
            console.log('[Supabase Auth] Exchanging hash fragment for active session...');
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
          }
        }

        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          console.log('[Supabase Auth] No active session. Signing in anonymously...');
          const { data: anonymousData, error: anonymousError } = await supabase.auth.signInAnonymously();
          if (anonymousError) {
            console.error('[Supabase Auth] Error signing in anonymously:', anonymousError);
          } else if (anonymousData?.user) {
            setUser(anonymousData.user);
          }
        }
      } catch (err) {
        console.error('Error getting user:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    checkUser();

    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase environment variables are not configured. Go to Settings and define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.");
      }

      const redirectUrl = window.location.origin;
      console.log(`[Supabase Auth] Requesting sign-in page with redirect to: ${redirectUrl}`);

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl,
        }
      });

      if (error) throw error;
      setLoginSent(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while sending the login link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyPastedUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const link = pastedLink.trim();
    if (!link) return;

    setPastedLinkError('');
    setIsSubmitting(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase is not configured.");
      }

      // Check if it's a URL or text containing access_token
      if (link.includes('access_token=')) {
        const hashPart = link.includes('#') ? link.split('#')[1] : (link.includes('?') ? link.split('?')[1] : link);
        const params = new URLSearchParams(hashPart);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          if (error) throw error;
          setPastedLink('');
          setPastedLinkError('');
          return;
        }
      }

      // Check if it's the magical activation URL from email containing "token=" (token_hash)
      if (link.includes('token=')) {
        const queryPart = link.includes('?') ? link.split('?')[1] : link;
        const params = new URLSearchParams(queryPart);
        const tokenHash = params.get('token');
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink',
          });
          if (error) throw error;
          setPastedLink('');
          setPastedLinkError('');
          return;
        }
      }

      // Fallback: Check if it's a raw Token
      if (link.length > 50) {
        const { error } = await supabase.auth.setSession({
          access_token: link,
          refresh_token: '',
        });
        if (!error) {
          setPastedLink('');
          setPastedLinkError('');
          return;
        }
      }

      throw new Error("Could not find a valid authentication token. Please copy & paste the absolute full verification URL sent to your inbox, or the full loaded URL (containing #access_token) from your browser address bar.");
    } catch (err: any) {
      setPastedLinkError(err.message || 'Verification of pasted link failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      setUser(null);
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center select-none">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-4xl animate-bounce">🍔</span>
          <p className="text-sm font-bold text-slate-500 animate-pulse">Initializing FoodFix security...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 select-none">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
          <span className="text-5xl mb-3 inline-block animate-bounce">🍔</span>
          <h1 className="text-3xl font-black text-orange-500 tracking-tight">
            Food<span className="text-slate-800">Fix</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Your personal AI customer support & meal ordering assistant
          </p>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-xs rounded-3xl border border-slate-100 flex flex-col gap-6">
            {!isSupabaseConfigured && (
              <div className="bg-amber-50 border border-amber-250/50 rounded-2xl p-4 text-xs text-amber-800 space-y-2">
                <p className="font-bold">⚠️ Supabase config required</p>
                <p className="leading-relaxed">
                  To test real magic links, please use the <b>Settings</b> menu in the workspace to set the following environment variables:
                </p>
                <ul className="list-disc pl-4 space-y-1 font-mono text-[10px]">
                  <li>VITE_SUPABASE_URL</li>
                  <li>VITE_SUPABASE_ANON_KEY</li>
                </ul>
              </div>
            )}

            {loginSent ? (
              <div className="text-center py-4 space-y-4 animate-fadeIn">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500 text-2xl">
                  ✉️
                </div>
                <h3 className="text-md font-bold text-slate-900">Check your email for the login link</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  We sent a magical sign-in link to <b className="text-slate-800">{email}</b>.
                </p>

                <div className="border-t border-slate-100 pt-4 mt-2">
                  <form onSubmit={handleVerifyPastedUrl} className="space-y-3">
                    <label className="block text-[11px] font-bold text-slate-550 text-left uppercase tracking-wider">
                      Iframe Bypass Helper
                    </label>
                    <p className="text-[10px] text-slate-400 text-left leading-normal">
                      Click the link in your email first. If it opens in a new tab but doesn't log you in here, <b>copy the URL from your browser's address bar</b> (containing the login token) and paste it below:
                    </p>
                    <input
                      type="text"
                      placeholder="Paste the full magic link or redirected URL here..."
                      value={pastedLink}
                      onChange={(e) => setPastedLink(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-sans shadow-xs bg-slate-50 text-slate-700"
                      disabled={isSubmitting}
                    />

                    {pastedLinkError && (
                      <p className="text-left text-[11px] text-red-650 font-medium leading-normal bg-red-50 p-2.5 rounded-lg border border-red-100">
                        {pastedLinkError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || !pastedLink.trim()}
                      className="w-full text-xs bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-all shadow-sm"
                    >
                      {isSubmitting ? "Verifying..." : "Confirm Login Link & Open App"}
                    </button>
                  </form>
                </div>

                <div className="pt-2 text-center">
                  <button
                    onClick={() => {
                      setLoginSent(false);
                      setPastedLinkError('');
                      setPastedLink('');
                    }}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
                  >
                    Change email address
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm transition-all shadow-xs"
                    disabled={isSubmitting}
                  />
                </div>

                {errorMsg && (
                  <div className="bg-red-50 border border-red-200/50 rounded-xl p-3.5 text-xs text-red-650 font-medium leading-relaxed">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm py-3.5 px-4 rounded-xl cursor-pointer shadow-md hover:shadow-orange-100 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? "Sending..." : "Send login link"}
                </button>
              </form>
            )}

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div id="demo-separator-line" className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
                <span className="bg-white px-3.5 text-slate-400">Or bypass rate-limits</span>
              </div>
            </div>

            <button
              type="button"
              id="demo-login-btn"
              onClick={() => {
                setUser({
                  id: 'demo-guest-user',
                  email: 'guest@foodfix.com',
                  aud: 'authenticated',
                  role: 'authenticated',
                  created_at: new Date().toISOString(),
                  app_metadata: {},
                  user_metadata: {},
                } as any);
              }}
              className="w-full bg-slate-100 hover:bg-slate-200/80 text-slate-750 font-extrabold text-xs py-3.5 px-4 rounded-xl cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-2 border border-slate-200/60 shadow-sm"
            >
              <span>🚀</span> Explore as Guest (Demo mode)
            </button>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Toolbar with Cart & Active Session */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-end">
          {user && (
            <div className="hidden sm:block text-right leading-tight max-w-[150px] md:max-w-xs">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Session</p>
              <p className="text-xs text-slate-600 font-medium truncate">
                Logged in as <b className="text-slate-800">{user.email}</b>
              </p>
            </div>
          )}

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

          {user && (
            <button 
              onClick={handleLogout}
              className="bg-red-500/10 hover:bg-red-50 text-red-600 hover:text-red-700 border border-red-200/50 rounded-full px-4 py-2 flex items-center gap-1.5 transition-all active:scale-95 text-xs font-extrabold cursor-pointer"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          )}
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
      <SupportChat user={user} />

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
