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
  ArrowLeft,
  Receipt,
  Utensils,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Timer,
  CheckCircle2,
  Bell,
  Bike
} from 'lucide-react';
import { 
  GOLDEN_RICE_BOWL_RESTAURANT, 
  GOLDEN_RICE_BOWL_MENU, 
  MENU_CATEGORIES 
} from '../data/goldenRiceBowlMenu';
import { MenuItem, OrderItem, Order, OrderStatus } from '../types/domain';
import { getSmartUpsellSuggestions } from '../utils/smartUpsellEngine';
import { StoreStatusResult } from '../utils/scheduleHelper';

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

interface DuckPortionOption {
  id: 'Quarter' | 'Half' | 'Whole';
  label: string;
  detail: string;
  pancakes: string;
  pricePence: number;
}

const DUCK_PORTIONS: DuckPortionOption[] = [
  { id: 'Quarter', label: 'Quarter Duck (1/4)', detail: 'With 6 pancakes, salad & sauce', pancakes: '6 Pancakes', pricePence: 1180 },
  { id: 'Half', label: 'Half Duck (1/2)', detail: 'With 12 pancakes, salad & sauce', pancakes: '12 Pancakes', pricePence: 2250 },
  { id: 'Whole', label: 'Whole Duck', detail: 'With 24 pancakes, salad & sauce', pancakes: '24 Pancakes', pricePence: 3900 },
];

interface RecentOrderSummary {
  id: string;
  displayNumber: string;
  createdAt: string;
  fulfillmentType: 'DELIVERY' | 'COLLECTION';
  totalPence: number;
  status: OrderStatus;
  estimatedReadyAt?: string;
  surgeEtaMinutes?: number;
  itemCount: number;
  itemSummary: string;
}

const formatReadyTime = (iso?: string) => {
  if (!iso) return '20–30 mins';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '20–30 mins';
  }
};

const playOrderReadyChime = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
};

export default function StorefrontPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>(MENU_CATEGORIES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<'COLLECTION' | 'DELIVERY'>('COLLECTION');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdersDrawerOpen, setIsOrdersDrawerOpen] = useState(false);
  const [activeModalItem, setActiveModalItem] = useState<MenuItem | null>(null);

  // Modal customization state
  const [selectedSize, setSelectedSize] = useState<'REGULAR' | 'LARGE'>('REGULAR');
  const [selectedDuckPortion, setSelectedDuckPortion] = useState<'Quarter' | 'Half' | 'Whole'>('Quarter');
  const [selectedSide, setSelectedSide] = useState<SideOption | null>(null);
  const [spicePreference, setSpicePreference] = useState<'Standard' | 'Mild' | 'Extra Hot' | 'No Chilli'>('Standard');
  const [cookingNotes, setCookingNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Recent orders tracking without account registration (saved locally for 24h)
  const [recentOrders, setRecentOrders] = useState<RecentOrderSummary[]>([]);

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
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // 1-second ticker for surge countdowns
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load and prune recent orders from localStorage (24h lifespan)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('grb_recent_orders');
      if (stored) {
        const parsed: RecentOrderSummary[] = JSON.parse(stored);
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const valid = parsed.filter((o) => new Date(o.createdAt).getTime() > cutoff);
        setRecentOrders(valid);
        localStorage.setItem('grb_recent_orders', JSON.stringify(valid));
      }
    } catch (e) {
      console.error('Error reading recent orders from localStorage:', e);
    }
  }, []);

  // Find currently active order (if any) among recent orders
  const activeTrackedOrder = useMemo(() => {
    return recentOrders.find(
      (o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED'
    );
  }, [recentOrders]);

  // History & Drawer navigation helpers so back button never exits web app
  const openCart = () => {
    setIsCartOpen(true);
    setIsOrdersDrawerOpen(false);
    if (typeof window !== 'undefined') {
      window.history.pushState({ drawer: 'basket' }, '', '#basket');
    }
  };

  const closeCart = () => {
    setIsCartOpen(false);
    if (typeof window !== 'undefined' && window.location.hash === '#basket') {
      window.history.back();
    }
  };

  const openOrdersDrawer = () => {
    setIsOrdersDrawerOpen(true);
    setIsCartOpen(false);
    if (typeof window !== 'undefined') {
      window.history.pushState({ drawer: 'orders' }, '', '#orders');
    }
  };

  const closeOrdersDrawer = () => {
    setIsOrdersDrawerOpen(false);
    if (typeof window !== 'undefined' && window.location.hash === '#orders') {
      window.history.back();
    }
  };

  const openActiveOrderModal = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setOrderSuccess(data.order);
          setIsOrdersDrawerOpen(false);
          setIsCartOpen(false);
          if (typeof window !== 'undefined') {
            window.history.pushState({ modal: 'order-status' }, '', '#status');
          }
        }
      }
    } catch (err) {
      console.error('Error loading order for modal:', err);
    }
  };

  const closeOrderSuccess = () => {
    setOrderSuccess(null);
    if (typeof window !== 'undefined' && window.location.hash === '#status') {
      window.history.back();
    }
  };

  const closeModal = () => {
    setActiveModalItem(null);
    if (typeof window !== 'undefined' && window.location.hash === '#customize') {
      window.history.back();
    }
  };

  // Popstate listener to handle device hardware back / gesture swipe
  useEffect(() => {
    const handlePopState = () => {
      setIsCartOpen(false);
      setIsOrdersDrawerOpen(false);
      setActiveModalItem(null);
      setOrderSuccess(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Poll active order state every 2.5s for live sync with kitchen actions
  useEffect(() => {
    const targetOrderId = orderSuccess?.id || activeTrackedOrder?.id;
    if (!targetOrderId) return;

    let isMounted = true;
    const pollOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${targetOrderId}`, { cache: 'no-store' });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.order) {
            const ord = data.order as Order;
            if (orderSuccess && orderSuccess.id === ord.id) {
              setOrderSuccess(ord);
            }
            // Update in recentOrders
            setRecentOrders((prev) => {
              const prevOrd = prev.find((o) => o.id === ord.id);
              if (prevOrd && prevOrd.status !== ord.status) {
                // If order just became ready, notify user!
                if (
                  (ord.status === 'READY_FOR_COLLECTION' || ord.status === 'OUT_FOR_DELIVERY') &&
                  prevOrd.status !== 'READY_FOR_COLLECTION' &&
                  prevOrd.status !== 'OUT_FOR_DELIVERY'
                ) {
                  playOrderReadyChime();
                  showToast(
                    `🎉 Order ${ord.displayNumber} is READY for ${ord.fulfillmentType === 'DELIVERY' ? 'delivery' : 'collection'}!`
                  );
                }
              }
              const updated = prev.map((o) =>
                o.id === ord.id
                  ? {
                      ...o,
                      status: ord.status,
                      estimatedReadyAt: ord.estimatedReadyAt,
                      surgeEtaMinutes: ord.surgeEtaMinutes,
                    }
                  : o
              );
              try {
                localStorage.setItem('grb_recent_orders', JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        }
      } catch {}
    };

    const interval = setInterval(pollOrder, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderSuccess?.id, activeTrackedOrder?.id]);

  // Customer Surge Handshake response
  const handleCustomerSurgeResponse = async (accepted: boolean) => {
    if (!orderSuccess) return;
    const newStatus: OrderStatus = accepted ? 'CONFIRMED' : 'CANCELLED';
    setOrderSuccess((prev) => prev ? { ...prev, status: newStatus } : null);
    try {
      await fetch(`/api/orders/${orderSuccess.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update surge status:', err);
    }
  };

  // Auto-accept surge wait time after 90 seconds if no response
  useEffect(() => {
    if (orderSuccess?.status !== 'AWAITING_CUSTOMER_APPROVAL' || !orderSuccess.surgeExpiresAt) return;
    const remainingMs = new Date(orderSuccess.surgeExpiresAt).getTime() - currentTime;
    if (remainingMs <= 0) {
      handleCustomerSurgeResponse(true);
    }
  }, [currentTime, orderSuccess?.status, orderSuccess?.surgeExpiresAt]);

  // Dynamic restaurant settings & menu overrides from Admin
  const [storeStatus, setStoreStatus] = useState<StoreStatusResult | null>(null);
  const [menuOverrides, setMenuOverrides] = useState<Record<string, Partial<MenuItem>>>({});
  const [customDishes, setCustomDishes] = useState<MenuItem[]>([]);
  const [emergencyNotice, setEmergencyNotice] = useState<string>('');

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const res = await fetch('/api/restaurant', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.storeStatus) setStoreStatus(data.storeStatus);
          if (data.menuOverrides) setMenuOverrides(data.menuOverrides);
          if (data.customDishes) setCustomDishes(data.customDishes);
          if (data.settings?.emergencyNotice) setEmergencyNotice(data.settings.emergencyNotice);
        }
      } catch {}
    };
    fetchRestaurant();
    const interval = setInterval(fetchRestaurant, 8000);
    return () => clearInterval(interval);
  }, []);

  // Combined menu (transcribed + new dishes + live admin price/sold-out overrides)
  const baseMenu = useMemo(() => {
    return [...customDishes, ...GOLDEN_RICE_BOWL_MENU].map((dish) => {
      const override = menuOverrides[dish.dishCode];
      return {
        ...dish,
        ...(override || {}),
      };
    });
  }, [customDishes, menuOverrides]);

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
    if (!searchQuery.trim()) return baseMenu;
    const q = searchQuery.toLowerCase().trim();
    return baseMenu.filter((item) => {
      const matchCode = item.dishCode.toLowerCase() === q || item.dishCode.toLowerCase().includes(q);
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      return matchCode || matchName || matchDesc || matchCategory;
    });
  }, [searchQuery, baseMenu]);

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
      setSelectedDuckPortion('Quarter');
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
      if (typeof window !== 'undefined') {
        window.history.pushState({ modal: 'customize' }, '', '#customize');
      }
    } else {
      // Direct 1-tap add!
      handleDirectAddToCart(item);
    }
  };

  const handleAddToCart = () => {
    if (!activeModalItem) return;

    let basePrice = activeModalItem.basePricePence;
    let sizeLabel: string | undefined = undefined;
    const modifiers = [];

    if (activeModalItem.dishCode === '91') {
      if (selectedDuckPortion === 'Whole') {
        basePrice = 3900;
        sizeLabel = 'Whole Duck';
      } else if (selectedDuckPortion === 'Half') {
        basePrice = 2250;
        sizeLabel = '1/2 Duck';
      } else {
        basePrice = 1180;
        sizeLabel = '1/4 Duck';
      }
      modifiers.push({
        groupId: 'portion',
        groupName: 'Duck Portion',
        optionId: selectedDuckPortion.toLowerCase(),
        optionName: `${selectedDuckPortion} Duck (${selectedDuckPortion === 'Quarter' ? '6 Pancakes' : selectedDuckPortion === 'Half' ? '12 Pancakes' : '24 Pancakes'})`,
        priceDeltaPence: 0,
      });
    } else if (activeModalItem.largePricePence) {
      basePrice = selectedSize === 'LARGE' ? activeModalItem.largePricePence : activeModalItem.basePricePence;
      sizeLabel = activeModalItem.dishCode === '37'
        ? (selectedSize === 'LARGE' ? '10 Balls' : '5 Balls')
        : (selectedSize === 'LARGE' ? 'Large' : 'Regular');
    }

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
      size: sizeLabel,
      unitPricePence: basePrice,
      modifiers,
      lineTotalPence: basePrice,
      allergens: activeModalItem.allergens,
      specialInstructions: cookingNotes.trim() ? cookingNotes.trim() : undefined,
    };

    const newItems: OrderItem[] = [mainItem];
    let toastSummary = `Added #${activeModalItem.dishCode} ${activeModalItem.name}${sizeLabel ? ` (${sizeLabel})` : ''}`;

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
    closeModal();
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

  const handlePlaceOrder = async () => {
    if (storeStatus && !storeStatus.isOpen) {
      alert(`The restaurant is currently closed for orders (${storeStatus.nextOpeningText}).`);
      return;
    }

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

    // Save to Cloud Firestore order bus
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });
    } catch (err) {
      console.error('Failed to broadcast order to cloud:', err);
    }

    // Save to shared localStorage bus
    const existingOrders = JSON.parse(localStorage.getItem('grb_orders_bus') || '[]');
    localStorage.setItem('grb_orders_bus', JSON.stringify([newOrder, ...existingOrders]));

    // Also persist customer recent orders list for 24h tracking (no registration needed)
    const orderSummary: RecentOrderSummary = {
      id: newOrder.id,
      displayNumber: newOrder.displayNumber,
      createdAt: newOrder.createdAt,
      fulfillmentType: newOrder.fulfillmentType,
      totalPence: newOrder.totalPence,
      status: newOrder.status,
      itemCount: cart.reduce((a, b) => a + b.quantity, 0),
      itemSummary: cart.map((it) => `${it.quantity}x ${it.name}${it.size ? ` (${it.size})` : ''}`).join(', '),
    };

    setRecentOrders((prev) => {
      const updated = [orderSummary, ...prev.filter((o) => o.id !== newOrder.id)];
      try {
        localStorage.setItem('grb_recent_orders', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Dispatch custom storage event for same-window updates
    window.dispatchEvent(new Event('grb_new_order'));

    setOrderSuccess(newOrder);
    setCart([]);
    setIsCartOpen(false);
    if (typeof window !== 'undefined') {
      window.history.pushState({ modal: 'order-status' }, '', '#status');
    }
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

            <div className="flex items-center gap-2.5">
              {/* Active live order button or My Orders button */}
              {activeTrackedOrder ? (
                <button
                  type="button"
                  onClick={() => openActiveOrderModal(activeTrackedOrder.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-bold transition-all shadow-sm"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="hidden sm:inline">
                    Order {activeTrackedOrder.displayNumber}: {
                      activeTrackedOrder.status === 'READY_FOR_COLLECTION' ? 'Ready!' :
                      activeTrackedOrder.status === 'OUT_FOR_DELIVERY' ? 'Out for Delivery!' :
                      activeTrackedOrder.status === 'COOKING' ? 'Cooking' : 'Confirmed'
                    }
                  </span>
                  <span className="sm:hidden font-mono">
                    {activeTrackedOrder.displayNumber}
                  </span>
                </button>
              ) : recentOrders.length > 0 ? (
                <button
                  type="button"
                  onClick={openOrdersDrawer}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-imperial-950/70 hover:bg-imperial-950 border border-gold-500/30 text-gold-200 text-xs font-semibold transition-all shadow-sm"
                >
                  <Receipt className="w-3.5 h-3.5 text-gold-400" />
                  <span>My Orders ({recentOrders.length})</span>
                </button>
              ) : null}

              <div className="text-right hidden sm:block">
                <span className="text-xs text-stone-300 flex items-center gap-1.5 justify-end">
                  <Clock className={`w-3.5 h-3.5 ${storeStatus?.isOpen ? 'text-emerald-400' : 'text-red-400'}`} />
                  <span className={`font-semibold ${storeStatus?.isOpen ? 'text-emerald-300' : 'text-red-300'}`}>
                    {storeStatus?.isOpen ? 'Open Now' : 'Store Closed'}
                  </span>
                  <span className="text-stone-400">· {storeStatus?.nextOpeningText || 'Heathfield'}</span>
                </span>
              </div>
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

            <div className="flex items-center gap-2 sm:hidden">
              {activeTrackedOrder ? (
                <button
                  type="button"
                  onClick={() => openActiveOrderModal(activeTrackedOrder.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>{activeTrackedOrder.displayNumber}: {activeTrackedOrder.status === 'READY_FOR_COLLECTION' ? 'Ready' : 'In Prep'}</span>
                </button>
              ) : recentOrders.length > 0 ? (
                <button
                  type="button"
                  onClick={openOrdersDrawer}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-imperial-950/60 border border-gold-500/30 text-gold-200 text-[11px] font-bold"
                >
                  <Receipt className="w-3 h-3 text-gold-400" />
                  <span>Orders ({recentOrders.length})</span>
                </button>
              ) : (
                <span className={`text-xs font-semibold ${storeStatus?.isOpen ? 'text-emerald-300' : 'text-red-300'}`}>
                  {storeStatus?.isOpen ? '● Open' : '● Closed'}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ================= STORE CLOSED BANNER ================= */}
      {storeStatus && !storeStatus.isOpen && (
        <div className="bg-red-950 border-b border-red-800 text-red-100 px-4 py-3 shadow-md animate-fade-in">
          <div className="max-w-4xl mx-auto flex items-center gap-2.5 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
            <div>
              <span className="font-black uppercase tracking-wide text-white">Restaurant Currently Closed for Orders</span>
              <p className="text-[11px] sm:text-xs text-red-200 mt-0.5">
                {emergencyNotice || storeStatus.reason} — <strong className="text-white underline decoration-amber-400">{storeStatus.nextOpeningText}</strong>. Feel free to browse our menu below!
              </p>
            </div>
          </div>
        </div>
      )}

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
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* Size Selection (Only for dishes with largePricePence that are NOT Duck 91) */}
              {activeModalItem.largePricePence && activeModalItem.dishCode !== '91' && (
                <div>
                  <label className="font-bold text-stone-900 block mb-2">
                    {activeModalItem.dishCode === '37' ? 'Select Portion (Chicken Balls)' : 'Select Portion Size'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSize('REGULAR')}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                        selectedSize === 'REGULAR'
                          ? 'border-imperial-800 bg-imperial-50/50 text-imperial-950 font-bold ring-1 ring-imperial-800/30'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <span>
                        {activeModalItem.dishCode === '37' ? 'Regular (5 Balls)' : 'Regular Portion'}
                      </span>
                      <span>£{(activeModalItem.basePricePence / 100).toFixed(2)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSize('LARGE')}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                        selectedSize === 'LARGE'
                          ? 'border-imperial-800 bg-imperial-50/50 text-imperial-950 font-bold ring-1 ring-imperial-800/30'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <span>
                        {activeModalItem.dishCode === '37' ? 'Large (10 Balls)' : 'Large Portion'}
                      </span>
                      <span>£{(activeModalItem.largePricePence / 100).toFixed(2)}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Aromatic Duck (#91) Dedicated Portion Selection */}
              {activeModalItem.dishCode === '91' && (
                <div>
                  <label className="font-bold text-stone-900 block mb-1">
                    Select Duck Portion
                  </label>
                  <p className="text-stone-500 text-xs mb-3">
                    Includes warm steamed pancakes, sliced cucumber, spring onions & rich hoi sin sauce.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {DUCK_PORTIONS.map((duckPortion) => (
                      <button
                        key={duckPortion.id}
                        type="button"
                        onClick={() => setSelectedDuckPortion(duckPortion.id)}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-between transition-all ${
                          selectedDuckPortion === duckPortion.id
                            ? 'border-imperial-800 bg-imperial-50 text-imperial-950 font-bold ring-2 ring-imperial-800/30 shadow-sm'
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <span className="text-xs font-bold leading-tight">{duckPortion.label}</span>
                        <span className="text-[10px] text-stone-500 mt-0.5">{duckPortion.pancakes}</span>
                        <span className="font-black text-stone-900 text-xs mt-2">
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
                    ((activeModalItem.dishCode === '91'
                      ? (selectedDuckPortion === 'Whole' ? 3900 : selectedDuckPortion === 'Half' ? 2250 : 1180)
                      : (selectedSize === 'LARGE' && activeModalItem.largePricePence
                          ? activeModalItem.largePricePence
                          : activeModalItem.basePricePence)) +
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

      {/* ================= FLOATING ACTIVE ORDER TRACKER PILL ================= */}
      {activeTrackedOrder && !orderSuccess && !isCartOpen && !isOrdersDrawerOpen && (
        <div className={`fixed inset-x-4 max-w-xl mx-auto z-40 animate-slide-up ${
          cart.length > 0 ? 'bottom-20' : 'bottom-4'
        }`}>
          <button
            type="button"
            onClick={() => openActiveOrderModal(activeTrackedOrder.id)}
            className="w-full p-3 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white shadow-xl border border-emerald-500/40 flex items-center justify-between transition-transform active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Order {activeTrackedOrder.displayNumber}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600/40 uppercase tracking-wider">
                    {activeTrackedOrder.status === 'READY_FOR_COLLECTION' ? 'Ready for Collection!' :
                     activeTrackedOrder.status === 'OUT_FOR_DELIVERY' ? 'Out for Delivery!' :
                     activeTrackedOrder.status === 'COOKING' ? 'Cooking at Wok' : 'Kitchen Confirmed'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-300 mt-0.5">
                  {activeTrackedOrder.estimatedReadyAt 
                    ? `Estimated: ~${formatReadyTime(activeTrackedOrder.estimatedReadyAt)}` 
                    : 'Tap to track live progress'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
              <span>Track</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* ================= FLOATING CART BAR ================= */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-4 max-w-xl mx-auto z-40 animate-slide-up">
          <button
            onClick={openCart}
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
              <button
                type="button"
                onClick={closeCart}
                className="flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-xl shadow-sm transition-all active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Menu</span>
              </button>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-imperial-800" />
                <h3 className="font-bold text-stone-900 text-sm">
                  Basket ({cart.reduce((a, b) => a + b.quantity, 0)})
                </h3>
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-600"
                aria-label="Close Basket"
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
                disabled={storeStatus?.isOpen === false}
                className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-transform ${
                  storeStatus?.isOpen === false
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white'
                }`}
              >
                <span>
                  {storeStatus?.isOpen === false
                    ? `Store Closed (${storeStatus.nextOpeningText})`
                    : `Place Order & Pay (£${(cartTotalPence / 100).toFixed(2)})`}
                </span>
              </button>

              <p className="text-[10px] text-stone-400 text-center">
                Powered by Takeaway Lite · Encrypted Stripe Payment
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= ORDER SUCCESS & LIVE STATUS TRACKING MODAL ================= */}
      {orderSuccess && (() => {
        const isSurgePending = orderSuccess.status === 'AWAITING_CUSTOMER_APPROVAL';
        const isReceived = orderSuccess.status === 'RECEIVED';
        const isCooking = orderSuccess.status === 'COOKING';
        const isConfirmed = orderSuccess.status === 'CONFIRMED';
        const isReady = orderSuccess.status === 'READY_FOR_COLLECTION' || orderSuccess.status === 'OUT_FOR_DELIVERY';
        const isCancelled = orderSuccess.status === 'CANCELLED';

        const secondsLeft = orderSuccess.surgeExpiresAt 
          ? Math.max(0, Math.ceil((new Date(orderSuccess.surgeExpiresAt).getTime() - currentTime) / 1000))
          : 0;

        const formatReadyTime = (iso?: string) => {
          if (!iso) return '20–30 mins';
          try {
            const d = new Date(iso);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch {
            return '20–30 mins';
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-sm animate-fade-in">
            <div className={`bg-white max-w-md w-full rounded-3xl p-6 text-center space-y-4 shadow-2xl border ${
              isSurgePending 
                ? 'border-amber-400 ring-4 ring-amber-400/20' 
                : isCancelled
                ? 'border-red-300'
                : 'border-stone-200'
            }`}>
              
              {/* TOP STATUS BADGE & ICON */}
              {isSurgePending ? (
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
                  <Timer className="w-8 h-8" />
                </div>
              ) : isReceived ? (
                <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner relative">
                  <Bell className="w-8 h-8 animate-wiggle" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full animate-ping"></span>
                </div>
              ) : isCooking ? (
                <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
                  <Flame className="w-8 h-8 animate-pulse" />
                </div>
              ) : isReady ? (
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  {orderSuccess.fulfillmentType === 'DELIVERY' ? <Bike className="w-8 h-8" /> : <ShoppingBag className="w-8 h-8" />}
                </div>
              ) : isCancelled ? (
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
                  <X className="w-8 h-8" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <Check className="w-8 h-8" />
                </div>
              )}

              {/* TITLE & EXPLANATION */}
              <div>
                <span className="text-xs font-mono font-bold text-imperial-800 bg-imperial-50 px-2.5 py-1 rounded-full border border-imperial-200">
                  Order {orderSuccess.displayNumber}
                </span>

                {isSurgePending ? (
                  <>
                    <h3 className="text-xl font-black text-amber-900 mt-2">
                      ⚠️ Peak Rush Wait Time Confirmation
                    </h3>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      The kitchen is currently in peak demand. Estimated preparation time is <strong className="text-amber-800 font-bold">{orderSuccess.surgeEtaMinutes} minutes</strong> (ready ~{formatReadyTime(orderSuccess.estimatedReadyAt)}).
                    </p>
                  </>
                ) : isReceived ? (
                  <>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black tracking-wide uppercase mt-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      Kitchen Review In Progress
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-stone-900 mt-3 leading-tight tracking-tight">
                      Please wait whilst the restaurant confirms your order and wait time
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                      Your order has been received by the kitchen terminal. Staff are reviewing your dishes now and assigning an accurate preparation time.
                    </p>
                    <div className="mt-3.5 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center gap-2 text-xs font-bold text-amber-800">
                      <Clock className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                      <span>The kitchen is chiming — this screen updates automatically in a few seconds...</span>
                    </div>
                  </>
                ) : isCooking ? (
                  <>
                    <h3 className="text-xl font-black text-stone-900 mt-2">
                      Cooking at Wok Station!
                    </h3>
                    <p className="text-xs text-stone-500 mt-1">
                      Your dishes are being freshly stir-fried by the chefs.
                    </p>
                  </>
                ) : isReady ? (
                  <>
                    <h3 className="text-xl font-black text-emerald-900 mt-2">
                      {orderSuccess.fulfillmentType === 'DELIVERY' ? 'Out for Delivery!' : 'Ready for Collection!'}
                    </h3>
                    <p className="text-xs text-stone-600 mt-1">
                      {orderSuccess.fulfillmentType === 'DELIVERY'
                        ? 'Our driver is on the way to your delivery address.'
                        : 'Your food is bagged at the Golden Rice Bowl counter, Heathfield.'}
                    </p>
                  </>
                ) : isCancelled ? (
                  <>
                    <h3 className="text-xl font-black text-red-700 mt-2">
                      Order Cancelled
                    </h3>
                    <p className="text-xs text-stone-500 mt-1">
                      This order was cancelled. Any pre-authorised funds have been released.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-black text-stone-900 mt-2">
                      Order Accepted & Queued!
                    </h3>
                    <p className="text-xs text-stone-500 mt-1">
                      The kitchen has scheduled your dishes for preparation.
                    </p>
                  </>
                )}
              </div>

              {/* SURGE 90-SECOND COUNTDOWN & DECISION BOX */}
              {isSurgePending && (
                <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-left space-y-3">
                  <div className="flex items-center justify-between text-xs font-black text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <Timer className="w-4 h-4 text-amber-600" />
                      Do you accept this wait time?
                    </span>
                    <span className="font-mono bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-xs">
                      {secondsLeft}s left
                    </span>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full transition-all duration-1000 ease-linear"
                      style={{ width: `${Math.min(100, (secondsLeft / 90) * 100)}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-amber-800 leading-tight">
                    Please confirm or cancel. If no response is given within {secondsLeft}s, your order will automatically proceed to hold your queue place.
                  </p>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleCustomerSurgeResponse(true)}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-transform active:scale-98 flex items-center justify-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Accept ({orderSuccess.surgeEtaMinutes}m Wait)
                    </button>
                    <button
                      onClick={() => handleCustomerSurgeResponse(false)}
                      className="px-3 py-3 bg-white border border-red-300 text-red-600 hover:bg-red-50 font-bold text-xs rounded-xl transition-colors"
                    >
                      Cancel Order
                    </button>
                  </div>
                </div>
              )}

              {/* ORDER DETAILS SUMMARY */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-left text-xs space-y-1.5">
                <div className="flex justify-between font-bold text-stone-900">
                  <span>Fulfillment:</span>
                  <span className="text-imperial-800 uppercase">{orderSuccess.fulfillmentType}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Estimated Ready:</span>
                  <span className="font-semibold text-stone-900">
                    {orderSuccess.estimatedReadyAt 
                      ? `${formatReadyTime(orderSuccess.estimatedReadyAt)} (${orderSuccess.surgeEtaMinutes || (orderSuccess.fulfillmentType === 'COLLECTION' ? 20 : 35)}m)`
                      : isReceived 
                      ? 'Kitchen setting time...'
                      : orderSuccess.fulfillmentType === 'COLLECTION' ? '15–20 minutes' : '35–45 minutes'}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Total Paid:</span>
                  <span className="font-semibold text-stone-900">
                    £{(orderSuccess.totalPence / 100).toFixed(2)}
                  </span>
                </div>
                {orderSuccess.items && (
                  <div className="pt-2 border-t border-stone-200 text-[11px] text-stone-500">
                    <span>{orderSuccess.items.reduce((a, b) => a + b.quantity, 0)} items: </span>
                    <span className="font-medium text-stone-700">
                      {orderSuccess.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={closeOrderSuccess}
                  className="w-full py-3 rounded-xl bg-imperial-800 hover:bg-imperial-900 active:scale-98 text-white font-bold text-xs transition-colors shadow-md flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Menu</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= MY ORDERS DRAWER (NO REGISTRATION REQUIRED) ================= */}
      {isOrdersDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <button
                type="button"
                onClick={closeOrdersDrawer}
                className="flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-xl shadow-sm transition-all active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Menu</span>
              </button>
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-imperial-800" />
                <h3 className="font-bold text-stone-900 text-sm">
                  My Orders (Today)
                </h3>
              </div>
              <button
                type="button"
                onClick={closeOrdersDrawer}
                className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-600"
                aria-label="Close My Orders"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">No Account Required</span>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Orders placed on this device are saved automatically for 24 hours. The kitchen updates your live food status here in real time.
                  </p>
                </div>
              </div>

              {recentOrders.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                    <Receipt className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-stone-900 text-sm">No Orders Today</h4>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">
                    When you place an order, you will be able to track live kitchen preparation and collection status right here.
                  </p>
                  <button
                    type="button"
                    onClick={closeOrdersDrawer}
                    className="mt-3 px-4 py-2 rounded-xl bg-imperial-800 hover:bg-imperial-900 text-white font-bold text-xs"
                  >
                    Browse Menu
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {recentOrders.map((ord) => {
                    const isCooking = ord.status === 'COOKING';
                    const isReady = ord.status === 'READY_FOR_COLLECTION' || ord.status === 'OUT_FOR_DELIVERY';
                    const isCompleted = ord.status === 'COMPLETED';
                    const isCancelled = ord.status === 'CANCELLED';

                    return (
                      <div
                        key={ord.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isReady
                            ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                            : isCooking
                            ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-500/20'
                            : 'bg-white border-stone-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-imperial-800 bg-imperial-50 px-2 py-0.5 rounded border border-imperial-200">
                              Order {ord.displayNumber}
                            </span>
                            <span className="text-[11px] text-stone-500">
                              {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isReady
                              ? 'bg-emerald-600 text-white animate-pulse'
                              : isCooking
                              ? 'bg-amber-600 text-white'
                              : isCancelled
                              ? 'bg-red-600 text-white'
                              : isCompleted
                              ? 'bg-stone-200 text-stone-700'
                              : 'bg-blue-600 text-white'
                          }`}>
                            {isReady
                              ? ord.fulfillmentType === 'DELIVERY' ? 'Out for Delivery' : 'Ready for Collection!'
                              : isCooking
                              ? 'Cooking at Wok'
                              : ord.status}
                          </span>
                        </div>

                        {/* Order Timeline Visualizer */}
                        <div className="py-2.5">
                          <div className="grid grid-cols-4 gap-1 text-[9px] font-bold text-center mb-1.5">
                            <span className={ord.status !== 'CANCELLED' ? 'text-imperial-900' : 'text-stone-400'}>Received</span>
                            <span className={['CONFIRMED', 'COOKING', 'READY_FOR_COLLECTION', 'OUT_FOR_DELIVERY', 'COMPLETED'].includes(ord.status) ? 'text-imperial-900' : 'text-stone-400'}>Confirmed</span>
                            <span className={['COOKING', 'READY_FOR_COLLECTION', 'OUT_FOR_DELIVERY', 'COMPLETED'].includes(ord.status) ? 'text-amber-700' : 'text-stone-400'}>Cooking</span>
                            <span className={isReady || isCompleted ? 'text-emerald-700' : 'text-stone-400'}>
                              {ord.fulfillmentType === 'DELIVERY' ? 'Out' : 'Ready'}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden flex">
                            <div className={`h-full ${ord.status !== 'CANCELLED' ? 'bg-imperial-800 w-1/4' : 'w-0'}`} />
                            <div className={`h-full ${['CONFIRMED', 'COOKING', 'READY_FOR_COLLECTION', 'OUT_FOR_DELIVERY', 'COMPLETED'].includes(ord.status) ? 'bg-imperial-800 w-1/4' : 'w-0'}`} />
                            <div className={`h-full ${['COOKING', 'READY_FOR_COLLECTION', 'OUT_FOR_DELIVERY', 'COMPLETED'].includes(ord.status) ? 'bg-amber-500 w-1/4' : 'w-0'}`} />
                            <div className={`h-full ${isReady || isCompleted ? 'bg-emerald-500 w-1/4' : 'w-0'}`} />
                          </div>
                        </div>

                        <p className="text-xs text-stone-600 line-clamp-2 mt-1">
                          {ord.itemSummary}
                        </p>

                        <div className="mt-3 pt-2.5 border-t border-stone-200/80 flex items-center justify-between">
                          <div>
                            <span className="font-black text-stone-900 text-xs block">
                              £{(ord.totalPence / 100).toFixed(2)} · {ord.fulfillmentType}
                            </span>
                            {ord.estimatedReadyAt && (
                              <span className="text-[10px] text-stone-500 block">
                                Est: ~{formatReadyTime(ord.estimatedReadyAt)}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => openActiveOrderModal(ord.id)}
                            className="px-3 py-1.5 rounded-lg bg-imperial-800 hover:bg-imperial-900 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                          >
                            <span>Live Progress</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
