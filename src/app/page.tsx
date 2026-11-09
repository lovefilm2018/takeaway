'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, 
  Search, 
  MapPin, 
  Phone, 
  Clock, 
  Flame, 
  AlertCircle, 
  Check, 
  X, 
  Plus, 
  Minus, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { 
  GOLDEN_RICE_BOWL_RESTAURANT, 
  GOLDEN_RICE_BOWL_MENU, 
  MENU_CATEGORIES 
} from '../data/goldenRiceBowlMenu';
import { MenuItem, OrderItem, Order } from '../types/domain';
import { getSmartUpsellSuggestions } from '../utils/smartUpsellEngine';

// Categories considered "Wet / Saucy Mains" that typically require rice or chips
const SAUCY_MAIN_CATEGORIES = new Set([
  'Curry Dishes',
  'Sweet & Sour Dishes',
  'Chop Suey Dishes',
  'King Prawn Dishes',
  'Duck Dishes',
  'Beef Dishes',
  'Chicken Dishes',
  'Pork Dishes',
]);

interface SideOption {
  dishCode: string;
  name: string;
  pricePence: number;
  badge?: string;
}

const AVAILABLE_SIDES: SideOption[] = [
  { dishCode: '17', name: 'Egg Fried Rice (#17)', pricePence: 360, badge: 'Popular' },
  { dishCode: '18', name: 'Plain Boiled Rice (#18)', pricePence: 330 },
  { dishCode: '150', name: 'Chips (#150)', pricePence: 300 },
  { dishCode: 'T3', name: 'Salt & Pepper Chips (#T3)', pricePence: 480, badge: 'Spicy' },
  { dishCode: '34', name: 'Plain Chow Mein (#34)', pricePence: 450 },
];

export default function StorefrontPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>(MENU_CATEGORIES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<'COLLECTION' | 'DELIVERY'>('COLLECTION');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeModalItem, setActiveModalItem] = useState<MenuItem | null>(null);

  // Modal customization state
  const [selectedSize, setSelectedSize] = useState<'REGULAR' | 'LARGE'>('REGULAR');
  const [selectedSide, setSelectedSide] = useState<SideOption | null>(null);
  const [spicePreference, setSpicePreference] = useState<'Standard' | 'Mild' | 'Extra Hot' | 'No Chilli'>('Standard');
  const [cookingNotes, setCookingNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  // Checkout form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [hasAllergies, setHasAllergies] = useState(false);
  const [allergyDetails, setAllergyDetails] = useState('');
  const [optOutMarketing, setOptOutMarketing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<Order | null>(null);

  // Load cart and customer details from localStorage if present
  useEffect(() => {
    try {
      const savedCustomer = localStorage.getItem('grb_customer');
      if (savedCustomer) {
        const parsed = JSON.parse(savedCustomer);
        setCustomerName(parsed.name || '');
        setCustomerPhone(parsed.phone || '');
        setCustomerEmail(parsed.email || '');
        setDeliveryAddress(parsed.address || '');
      }
    } catch {}
  }, []);

  // Filtered menu items
  const filteredMenu = useMemo(() => {
    if (!searchQuery.trim()) return GOLDEN_RICE_BOWL_MENU;
    const q = searchQuery.toLowerCase().trim();
    return GOLDEN_RICE_BOWL_MENU.filter((item) => {
      const matchCode = item.dishCode.toLowerCase() === q || item.dishCode.toLowerCase().includes(q);
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      return matchCode || matchName || matchDesc || matchCategory;
    });
  }, [searchQuery]);

  // Group items by category for layout
  const categorizedItems = useMemo(() => {
    const grouped: Record<string, MenuItem[]> = {};
    for (const cat of MENU_CATEGORIES) {
      grouped[cat] = filteredMenu.filter((i) => i.category === cat);
    }
    return grouped;
  }, [filteredMenu]);

  // Cart math
  const cartSubtotalPence = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.lineTotalPence, 0);
  }, [cart]);

  const deliveryFeePence = fulfillmentType === 'DELIVERY' ? 150 : 0;
  const cartTotalPence = cartSubtotalPence + deliveryFeePence;

  // Smart upsell suggestions evaluated against cart in <1ms
  const upsellSuggestions = useMemo(() => {
    return getSmartUpsellSuggestions(
      cart,
      allergyDetails ? [allergyDetails] : [],
      hasAllergies
    );
  }, [cart, allergyDetails, hasAllergies]);

  // Fast direct 1-tap add for items that do not require side selection or portion sizing
  const handleDirectAddToCart = (item: MenuItem) => {
    const newItem: OrderItem = {
      id: `${item.id}-${Date.now()}`,
      menuItemId: item.id,
      dishCode: item.dishCode,
      name: item.name,
      chineseName: item.chineseName,
      quantity: 1,
      unitPricePence: item.basePricePence,
      modifiers: [],
      lineTotalPence: item.basePricePence,
      allergens: item.allergens,
    };

    setCart((prev) => {
      // If exact dish is already in cart, bump quantity
      const existingIdx = prev.findIndex(
        (ci) => ci.dishCode === item.dishCode && (!ci.modifiers || ci.modifiers.length === 0) && !ci.specialInstructions && !ci.size
      );
      if (existingIdx > -1) {
        const copy = [...prev];
        const target = copy[existingIdx];
        copy[existingIdx] = {
          ...target,
          quantity: target.quantity + 1,
          lineTotalPence: target.unitPricePence * (target.quantity + 1),
        };
        return copy;
      }
      return [...prev, newItem];
    });

    showToast(`Added #${item.dishCode} ${item.name} to order`);
  };

  // Determine whether item needs modal or 1-tap add
  const handleItemClick = (item: MenuItem) => {
    const isSaucyMain = SAUCY_MAIN_CATEGORIES.has(item.category) && item.dishCode !== '91';
    const hasMultipleSizes = Boolean(item.largePricePence);
    const isAromaticDuck = item.dishCode === '91';

    if (isSaucyMain || hasMultipleSizes || isAromaticDuck) {
      setActiveModalItem(item);
      setSelectedSize('REGULAR');
      setSelectedSide(null);
      setSpicePreference(
        item.spicyLevel && item.spicyLevel > 0
          ? item.spicyLevel === 1
            ? 'Mild'
            : item.spicyLevel === 2
            ? 'Standard'
            : 'Extra Hot'
          : 'Standard'
      );
      setCookingNotes('');
    } else {
      // Direct 1-tap add!
      handleDirectAddToCart(item);
    }
  };

  const handleAddToCart = () => {
    if (!activeModalItem) return;

    const basePrice =
      selectedSize === 'LARGE' && activeModalItem.largePricePence
        ? activeModalItem.largePricePence
        : activeModalItem.basePricePence;

    const modifiers = [];
    if (activeModalItem.spicyLevel && activeModalItem.spicyLevel > 0 && spicePreference !== 'Standard') {
      modifiers.push({
        groupId: 'spice',
        groupName: 'Spice Level',
        optionId: spicePreference.toLowerCase().replace(/\s+/g, '-'),
        optionName: spicePreference,
        priceDeltaPence: 0,
      });
    }

    const mainItem: OrderItem = {
      id: `${activeModalItem.id}-${Date.now()}`,
      menuItemId: activeModalItem.id,
      dishCode: activeModalItem.dishCode,
      name: activeModalItem.name,
      chineseName: activeModalItem.chineseName,
      quantity: 1,
      size: activeModalItem.largePricePence ? selectedSize : undefined,
      unitPricePence: basePrice,
      modifiers,
      lineTotalPence: basePrice,
      allergens: activeModalItem.allergens,
      specialInstructions: cookingNotes.trim() ? cookingNotes.trim() : undefined,
    };

    const newItems: OrderItem[] = [mainItem];
    let toastSummary = `Added #${activeModalItem.dishCode} ${activeModalItem.name}`;

    // If customer selected an optional side, add as a separate independent line item
    if (selectedSide) {
      const sideDish = GOLDEN_RICE_BOWL_MENU.find((d) => d.dishCode === selectedSide.dishCode);
      const sideItem: OrderItem = {
        id: `side-${selectedSide.dishCode}-${Date.now()}`,
        menuItemId: sideDish?.id || `side-${selectedSide.dishCode}`,
        dishCode: selectedSide.dishCode,
        name: sideDish?.name || selectedSide.name,
        chineseName: sideDish?.chineseName,
        quantity: 1,
        unitPricePence: selectedSide.pricePence,
        modifiers: [],
        lineTotalPence: selectedSide.pricePence,
        allergens: sideDish?.allergens || [],
      };
      newItems.push(sideItem);
      toastSummary = `Added ${activeModalItem.name} + ${sideItem.name}`;
    }

    setCart((prev) => [...prev, ...newItems]);
    setActiveModalItem(null);
    showToast(toastSummary);
  };

  const updateItemQty = (index: number, delta: number) => {
    setCart((prev) => {
      const copy = [...prev];
      const target = copy[index];
      const newQty = target.quantity + delta;
      if (newQty <= 0) {
        copy.splice(index, 1);
      } else {
        copy[index] = {
          ...target,
          quantity: newQty,
          lineTotalPence: target.unitPricePence * newQty,
        };
      }
      return copy;
    });
  };

  const handlePlaceOrder = () => {
    if (!customerName || !customerPhone) {
      alert('Please provide your name and UK mobile number.');
      return;
    }
    if (fulfillmentType === 'DELIVERY' && !deliveryAddress) {
      alert('Please enter your delivery address in Heathfield.');
      return;
    }

    // Save customer memory
    localStorage.setItem(
      'grb_customer',
      JSON.stringify({
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        address: deliveryAddress,
      })
    );

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      tenantId: GOLDEN_RICE_BOWL_RESTAURANT.id,
      displayNumber: `#${Math.floor(100 + Math.random() * 900)}`,
      status: 'RECEIVED',
      fulfillmentType,
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        deliveryAddress: fulfillmentType === 'DELIVERY' ? {
          line1: deliveryAddress,
          town: 'Heathfield',
          postcode: 'TN21 8DS',
        } : undefined,
      },
      allergyDeclaration: {
        hasAllergies,
        allergens: hasAllergies ? ['PEANUTS', 'GLUTEN'] : [],
        notes: allergyDetails,
      },
      items: cart,
      subtotalPence: cartSubtotalPence,
      deliveryFeePence,
      tipPence: 0,
      totalPence: cartTotalPence,
      createdAt: new Date().toISOString(),
    };

    // Save to shared localStorage so Kitchen view receives it in real-time
    const existingOrders = JSON.parse(localStorage.getItem('grb_orders_bus') || '[]');
    localStorage.setItem('grb_orders_bus', JSON.stringify([newOrder, ...existingOrders]));

    // Dispatch custom storage event for same-window updates
    window.dispatchEvent(new Event('grb_new_order'));

    setOrderSuccess(newOrder);
    setCart([]);
    setIsCartOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-900 pb-28">
      {/* ================= FLOATING TOAST FEEDBACK ================= */}
      {toastMessage && (
        <div className="fixed top-16 inset-x-4 max-w-sm mx-auto z-50 bg-stone-900/95 text-white backdrop-blur px-4 py-2.5 rounded-xl shadow-xl border border-gold-500/30 flex items-center gap-2.5 text-xs font-semibold animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* ================= HEADER BRANDING ================= */}
      <header className="bg-gradient-to-r from-imperial-900 via-imperial-800 to-imperial-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gold-500/20 border border-gold-500/40 flex items-center justify-center font-bold text-gold-200 text-lg sm:text-xl shadow-inner">
                金
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  THE GOLDEN RICE BOWL
                  <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-300 border border-gold-400/30">
                    Heathfield
                  </span>
                </h1>
                <p className="text-xs text-stone-300 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-gold-400" />
                  Upper Station Road, TN21 8DS
                  <span className="hidden sm:inline text-stone-400">·</span>
                  <Phone className="w-3.5 h-3.5 text-gold-400 ml-1 hidden sm:inline" />
                  <span className="hidden sm:inline">01435 862342</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link 
                href="/kitchen" 
                target="_blank"
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-900/60 hover:bg-stone-900 text-gold-300 border border-gold-500/30 flex items-center gap-1 transition-colors"
                title="Open Kitchen Management Tablet"
              >
                <span>Kitchen Screen</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Fulfillment Toggle (Collection vs Delivery) */}
          <div className="mt-3 pt-3 border-t border-imperial-700/60 flex items-center justify-between gap-2">
            <div className="inline-flex p-1 rounded-xl bg-imperial-950/60 border border-imperial-700/40">
              <button
                onClick={() => setFulfillmentType('COLLECTION')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  fulfillmentType === 'COLLECTION'
                    ? 'bg-gold-500 text-stone-950 shadow-sm'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                Collection · 15–20m
              </button>
              <button
                onClick={() => setFulfillmentType('DELIVERY')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  fulfillmentType === 'DELIVERY'
                    ? 'bg-gold-500 text-stone-950 shadow-sm'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                Delivery · 35–45m (£1.50)
              </button>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-xs text-stone-300 flex items-center gap-1 justify-end">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-emerald-300">Open Now:</span> 5:00 PM – 10:00 PM
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ================= ALLERGEN & TRUST BANNER ================= */}
      <section className="bg-amber-50/80 border-b border-amber-200/60 text-amber-950 text-xs px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Food Allergens Notice:</strong> If anyone has an allergy or intolerance, please declare it at checkout or call us directly.
            </span>
          </div>
          <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300/50 shrink-0">
            FSA Rating: 5/5
          </span>
        </div>
      </section>

      {/* ================= SEARCH & CATEGORY BAR ================= */}
      <div className="sticky top-[108px] sm:top-[124px] z-20 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-stone-200/80 py-2.5 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          {/* Instant Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by dish number (#42, G3) or item name (Curry, Chow Mein)..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-imperial-700/20 focus:border-imperial-700 shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Horizontal Scrolling Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {MENU_CATEGORIES.map((cat) => {
              const count = categorizedItems[cat]?.length || 0;
              if (count === 0 && searchQuery) return null;
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    const el = document.getElementById(`cat-${cat}`);
                    if (el) {
                      const offset = 180;
                      const bodyRect = document.body.getBoundingClientRect().top;
                      const elementRect = el.getBoundingClientRect().top;
                      const elementPosition = elementRect - bodyRect;
                      window.scrollTo({
                        top: elementPosition - offset,
                        behavior: 'smooth',
                      });
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-imperial-800 text-white shadow-sm'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-imperial-950 text-gold-300' : 'bg-stone-200 text-stone-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= MENU ITEMS LIST ================= */}
      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-10">
        {MENU_CATEGORIES.map((category) => {
          const items = categorizedItems[category];
          if (!items || items.length === 0) return null;

          return (
            <section key={category} id={`cat-${category}`} className="space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-imperial-800"></span>
                  {category}
                </h2>
                <span className="text-xs font-medium text-stone-500">
                  {items.length} dishes
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 hover:border-gold-500/50 hover:shadow-md transition-all flex flex-col justify-between group relative"
                  >
                    <div>
                      {/* Top Code & Tags */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-black text-xs font-mono border border-stone-200">
                          #{item.dishCode}
                        </span>

                        <div className="flex items-center gap-1">
                          {item.spicyLevel && item.spicyLevel > 0 && (
                            <span className="inline-flex items-center text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                              <Flame className="w-3 h-3 mr-0.5 fill-red-500 text-red-500" />
                              {item.spicyLevel === 1 ? 'Mild' : item.spicyLevel === 2 ? 'Medium' : 'Hot'}
                            </span>
                          )}
                          {item.containsNuts && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Nuts 🥜
                            </span>
                          )}
                          {item.isVegetarian && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Veg 🥬
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Image Thumbnail if available */}
                      {item.imageUrl && (
                        <div className="relative w-full h-36 mb-2.5 rounded-xl overflow-hidden bg-stone-100 shadow-inner">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-stone-900/80 backdrop-blur-sm text-[10px] font-bold text-gold-300">
                            Chef Special
                          </span>
                        </div>
                      )}

                      {/* Dish Name & Chinese translation */}
                      <div className="flex items-baseline gap-2">
                        <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-snug group-hover:text-imperial-800 transition-colors">
                          {item.name}
                        </h3>
                        {item.chineseName && (
                          <span className="text-xs font-semibold text-stone-400 font-serif">
                            {item.chineseName}
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {/* Allergens badges */}
                      {item.allergens.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.allergens.map((alg) => (
                            <span key={alg} className="text-[9px] uppercase font-semibold text-stone-400 bg-stone-50 px-1 rounded border border-stone-200">
                              {alg}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Pricing & Add Action */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      <div>
                        <span className="font-black text-stone-900 text-base">
                          £{(item.basePricePence / 100).toFixed(2)}
                        </span>
                        {item.largePricePence && (
                          <span className="text-xs text-stone-500 ml-1.5">
                            / Large £{(item.largePricePence / 100).toFixed(2)}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleItemClick(item)}
                        className="px-3.5 py-1.5 rounded-xl bg-imperial-800 hover:bg-imperial-900 active:scale-95 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {/* ================= DISH CUSTOMIZATION MODAL ================= */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl border border-stone-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-mono text-xs font-bold">
                  #{activeModalItem.dishCode}
                </span>
                <h3 className="font-bold text-stone-900 text-base sm:text-lg mt-1">
                  {activeModalItem.name}
                </h3>
                {activeModalItem.chineseName && (
                  <p className="text-xs text-stone-500 font-serif">
                    {activeModalItem.chineseName}
                  </p>
                )}
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* Size Selection (if applicable) */}
              {activeModalItem.largePricePence && (
                <div>
                  <label className="font-bold text-stone-900 block mb-2">
                    Select Portion Size
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSize('REGULAR')}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                        selectedSize === 'REGULAR'
                          ? 'border-imperial-800 bg-imperial-50/50 text-imperial-950 font-bold'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <span>Regular Portion</span>
                      <span>£{(activeModalItem.basePricePence / 100).toFixed(2)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSize('LARGE')}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                        selectedSize === 'LARGE'
                          ? 'border-imperial-800 bg-imperial-50/50 text-imperial-950 font-bold'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <span>Large Portion</span>
                      <span>£{(activeModalItem.largePricePence / 100).toFixed(2)}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Aromatic Duck (#91) Portion Selection */}
              {activeModalItem.dishCode === '91' && (
                <div>
                  <label className="font-bold text-stone-900 block mb-2">
                    Select Duck Portion
                  </label>
                  <p className="text-stone-500 text-xs mb-2">
                    Served with warm steamed pancakes, cucumber, spring onions & hoi sin sauce.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Quarter Duck', pricePence: 1180 },
                      { label: 'Half Duck', pricePence: 2180 },
                      { label: 'Whole Duck', pricePence: 3900 },
                    ].map((duckPortion) => (
                      <button
                        key={duckPortion.label}
                        type="button"
                        onClick={() => setSelectedSize(duckPortion.label === 'Quarter Duck' ? 'REGULAR' : 'LARGE')}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-between transition-all ${
                          (selectedSize === 'REGULAR' && duckPortion.label === 'Quarter Duck') ||
                          (selectedSize === 'LARGE' && duckPortion.label !== 'Quarter Duck')
                            ? 'border-imperial-800 bg-imperial-50 text-imperial-950 font-bold ring-1 ring-imperial-800/30'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <span className="text-xs">{duckPortion.label}</span>
                        <span className="font-bold text-stone-900 text-xs mt-1">
                          £{(duckPortion.pricePence / 100).toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Side Selection (Only for Wet / Saucy Main Dishes) */}
              {SAUCY_MAIN_CATEGORIES.has(activeModalItem.category) && activeModalItem.dishCode !== '91' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-stone-900 block text-xs sm:text-sm">
                      Add a freshly cooked side?
                    </label>
                    <span className="text-[10px] text-stone-400 font-semibold">Optional</span>
                  </div>
                  <p className="text-stone-500 text-xs mb-2.5">
                    Traditional British Chinese takeaway mains do not include rice or chips.
                  </p>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedSide(null)}
                      className={`w-full p-2.5 rounded-xl border text-xs text-left flex items-center justify-between transition-all ${
                        selectedSide === null
                          ? 'border-imperial-800 bg-imperial-50 text-imperial-950 font-bold ring-1 ring-imperial-800/30'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <span>No Side (Main Dish Only)</span>
                      <span className="text-stone-500">£0.00</span>
                    </button>
                    {AVAILABLE_SIDES.map((side) => (
                      <button
                        key={side.dishCode}
                        type="button"
                        onClick={() => setSelectedSide(side)}
                        className={`w-full p-2.5 rounded-xl border text-xs text-left flex items-center justify-between transition-all ${
                          selectedSide?.dishCode === side.dishCode
                            ? 'border-imperial-800 bg-imperial-50 text-imperial-950 font-bold ring-1 ring-imperial-800/30'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{side.name}</span>
                          {side.badge && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              {side.badge}
                            </span>
                          )}
                        </div>
                        <span>+£{(side.pricePence / 100).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Spice Adjustment (Only shown for dishes with spicyLevel > 0) */}
              {activeModalItem.spicyLevel && activeModalItem.spicyLevel > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-stone-900 block text-xs sm:text-sm">
                      Spice Level Preference
                    </label>
                    <span className="text-[10px] text-red-600 font-semibold flex items-center gap-0.5">
                      <Flame className="w-3 h-3 fill-red-500" />
                      Spicy Dish
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-xs text-center">
                    {(['Mild', 'Standard', 'Extra Hot', 'No Chilli'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSpicePreference(lvl)}
                        className={`p-2 rounded-lg border font-semibold transition-all ${
                          spicePreference === lvl
                            ? 'border-imperial-800 bg-imperial-800 text-white'
                            : 'border-stone-200 hover:border-stone-300 text-stone-700'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Cooking preference note */}
              <div>
                <label className="font-bold text-stone-900 block mb-1">
                  Kitchen Preference Note
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={cookingNotes}
                  onChange={(e) => setCookingNotes(e.target.value)}
                  placeholder="e.g. No spring onions, extra crispy (No allergies here)"
                  className="w-full p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-imperial-700/20 text-xs"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  For allergies, please declare in the checkout allergy gate below.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-100 flex items-center justify-between bg-stone-50 rounded-b-2xl">
              <div>
                <span className="text-xs text-stone-500 block">Total</span>
                <span className="font-black text-stone-900 text-base">
                  £{(
                    ((selectedSize === 'LARGE' && activeModalItem.largePricePence
                      ? activeModalItem.largePricePence
                      : activeModalItem.basePricePence) +
                      (selectedSide ? selectedSide.pricePence : 0)) /
                    100
                  ).toFixed(2)}
                </span>
                {selectedSide && (
                  <span className="text-[10px] text-stone-500 block">
                    + 1x {selectedSide.name}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="px-6 py-2.5 rounded-xl bg-imperial-800 hover:bg-imperial-900 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
              >
                {selectedSide ? 'Add 2 Items to Order' : 'Add to Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FLOATING CART BAR ================= */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-4 max-w-xl mx-auto z-40 animate-slide-up">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-imperial-900 via-imperial-800 to-imperial-900 text-white shadow-xl border border-gold-500/40 flex items-center justify-between active:scale-98 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gold-500 text-stone-950 font-bold flex items-center justify-center text-sm shadow">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </div>
              <div className="text-left">
                <span className="text-xs text-gold-300 font-semibold block">
                  View Your Basket · {fulfillmentType}
                </span>
                <span className="text-sm font-black text-white">
                  £{(cartTotalPence / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-gold-200">
              <span>Checkout</span>
              <ArrowRight className="w-4 h-4 text-gold-400" />
            </div>
          </button>
        </div>
      )}

      {/* ================= CART & CHECKOUT DRAWER ================= */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-imperial-800" />
                <h3 className="font-bold text-stone-900 text-base">
                  Your Order ({cart.reduce((a, b) => a + b.quantity, 0)} items)
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Line Items */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div className="space-y-3">
                {cart.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-stone-200/80 bg-stone-50/50 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-stone-900">
                        <span className="font-mono text-imperial-800">#{item.dishCode}</span>
                        <span>{item.name}</span>
                        {item.size && (
                          <span className="text-[10px] text-stone-500 font-normal">
                            ({item.size})
                          </span>
                        )}
                      </div>

                      {item.modifiers.length > 0 && (
                        <p className="text-[11px] text-stone-600 mt-0.5">
                          + {item.modifiers.map((m) => m.optionName).join(', ')}
                        </p>
                      )}

                      {item.specialInstructions && (
                        <p className="text-[11px] text-amber-800 mt-0.5 italic">
                          "{item.specialInstructions}"
                        </p>
                      )}

                      <span className="font-bold text-stone-900 mt-1 block">
                        £{(item.lineTotalPence / 100).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-stone-200 shadow-sm">
                      <button
                        onClick={() => updateItemQty(idx, -1)}
                        className="text-stone-500 hover:text-stone-900"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-stone-900 w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateItemQty(idx, 1)}
                        className="text-stone-500 hover:text-stone-900"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Smart "Did You Forget?" Recommendations */}
              {upsellSuggestions.length > 0 && (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider">
                      Did you forget?
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {upsellSuggestions.map((s) => (
                      <div
                        key={s.dish.id}
                        className="p-2.5 rounded-xl bg-white border border-stone-200/90 shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-bold text-imperial-800 bg-imperial-50 px-1.5 py-0.5 rounded border border-imperial-200">
                              {s.badgeText}
                            </span>
                            <span className="font-black text-stone-900 text-xs">
                              £{(s.dish.basePricePence / 100).toFixed(2)}
                            </span>
                          </div>
                          <div className="font-bold text-stone-900 text-xs leading-snug">
                            #{s.dish.dishCode} {s.dish.name}
                          </div>
                          <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">
                            {s.reason}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDirectAddToCart(s.dish)}
                          className="mt-2.5 w-full py-1.5 rounded-lg bg-imperial-800 hover:bg-imperial-900 active:scale-95 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add for £{(s.dish.basePricePence / 100).toFixed(2)}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checkout Customer Fields */}
              <div className="pt-4 border-t border-stone-200 space-y-3">
                <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider text-stone-500">
                  Contact & Details
                </h4>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Alex Poxon"
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-imperial-700/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    UK Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 07700 900123"
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-imperial-700/20"
                  />
                </div>

                {fulfillmentType === 'DELIVERY' && (
                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      Delivery Address in Heathfield *
                    </label>
                    <textarea
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="House number, street name & postcode (e.g. 14 High St, TN21 8AA)"
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-imperial-700/20"
                    />
                  </div>
                )}

                {/* Mandatory Allergy Declaration Gate */}
                <div className="p-3 rounded-xl bg-red-50 border border-red-200/80 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="font-bold text-red-950 text-xs">
                      Allergy Declaration
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-red-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasAllergies}
                      onChange={(e) => setHasAllergies(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span>Does anyone eating have an allergy or food intolerance?</span>
                  </label>

                  {hasAllergies && (
                    <input
                      type="text"
                      value={allergyDetails}
                      onChange={(e) => setAllergyDetails(e.target.value)}
                      placeholder="Please specify exact allergies (e.g. Peanuts, Gluten)..."
                      className="w-full p-2 bg-white rounded-lg border border-red-300 text-xs focus:ring-2 focus:ring-red-500"
                    />
                  )}
                </div>

                {/* PECR Soft Opt-In Checkbox */}
                <label className="flex items-start gap-2 text-[11px] text-stone-500 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={optOutMarketing}
                    onChange={(e) => setOptOutMarketing(e.target.checked)}
                    className="mt-0.5 rounded text-imperial-800"
                  />
                  <span>
                    Tick here if you do <strong>not</strong> want to receive occasional discount codes and menu specials from The Golden Rice Bowl by SMS/email.
                  </span>
                </label>
              </div>
            </div>

            {/* Drawer Footer & Payment Action */}
            <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 space-y-3">
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-900">
                    £{(cartSubtotalPence / 100).toFixed(2)}
                  </span>
                </div>
                {fulfillmentType === 'DELIVERY' && (
                  <div className="flex justify-between">
                    <span>Delivery Fee (Zone A)</span>
                    <span className="font-semibold text-stone-900">£1.50</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-stone-200 text-sm font-black text-stone-900">
                  <span>Total Amount</span>
                  <span>£{(cartTotalPence / 100).toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-transform"
              >
                <span>Place Order & Pay (£{(cartTotalPence / 100).toFixed(2)})</span>
              </button>

              <p className="text-[10px] text-stone-400 text-center">
                Powered by Takeaway Lite · Encrypted Stripe Payment
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= ORDER SUCCESS CONFIRMATION MODAL ================= */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 text-center space-y-4 shadow-2xl border border-stone-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-mono font-bold text-imperial-800 bg-imperial-50 px-2.5 py-1 rounded-full border border-imperial-200">
                Order {orderSuccess.displayNumber}
              </span>
              <h3 className="text-xl font-black text-stone-900 mt-2">
                Order Sent to Kitchen!
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                The Golden Rice Bowl kitchen has received your order. The staff terminal is currently chiming.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-left text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-stone-900">
                <span>Fulfillment:</span>
                <span className="text-imperial-800 uppercase">{orderSuccess.fulfillmentType}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Estimated Ready:</span>
                <span className="font-semibold text-stone-900">
                  {orderSuccess.fulfillmentType === 'COLLECTION' ? '15–20 minutes' : '35–45 minutes'}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Total Paid:</span>
                <span className="font-semibold text-stone-900">
                  £{(orderSuccess.totalPence / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href="/kitchen"
                target="_blank"
                className="w-full py-3 rounded-xl bg-imperial-800 hover:bg-imperial-900 text-white font-bold text-xs block"
              >
                Open Kitchen Tablet Screen (See incoming ticket)
              </Link>
              <button
                onClick={() => setOrderSuccess(null)}
                className="w-full py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 text-xs font-semibold"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
