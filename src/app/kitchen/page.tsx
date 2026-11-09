'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  Clock, 
  Printer, 
  CheckCircle2, 
  Flame, 
  AlertTriangle, 
  Ban, 
  UtensilsCrossed, 
  ShoppingBag, 
  Bike, 
  Phone, 
  X, 
  RefreshCw,
  QrCode,
  SlidersHorizontal,
  ChevronLeft,
  Timer,
  Check,
  AlertCircle
} from 'lucide-react';
import { GOLDEN_RICE_BOWL_RESTAURANT, GOLDEN_RICE_BOWL_MENU } from '../../data/goldenRiceBowlMenu';
import { Order, OrderStatus, KitchenThrottleMode } from '../../types/domain';

export default function KitchenPortalPage() {
  const [pinAuthenticated, setPinAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [throttleMode, setThrottleMode] = useState<KitchenThrottleMode>('NORMAL');
  const [isStockDrawerOpen, setIsStockDrawerOpen] = useState(false);
  const [soldOutDishCodes, setSoldOutDishCodes] = useState<string[]>([]);
  const [selectedTicketForPrint, setSelectedTicketForPrint] = useState<Order | null>(null);
  const [customEtaOrder, setCustomEtaOrder] = useState<Order | null>(null);
  const [customMinutesInput, setCustomMinutesInput] = useState<number>(90);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isPolling, setIsPolling] = useState(false);

  // Check stored PIN on load
  useEffect(() => {
    try {
      const saved = localStorage.getItem('grb_staff_pin');
      if (saved === '9119') {
        setPinAuthenticated(true);
      }
    } catch {}
  }, []);

  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput.trim() === '9119') {
      try {
        localStorage.setItem('grb_staff_pin', '9119');
        document.cookie = 'grb_staff_pin=9119; path=/; max-age=2592000; SameSite=Lax';
      } catch {}
      setPinAuthenticated(true);
      setPinError(false);
      unlockAudioContext();
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  // Keep live 1-second ticker for surge countdowns
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Unlock Web Audio context on user gesture
  const unlockAudioContext = () => {
    try {
      const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      setAudioContext(ctx);
      setAudioUnlocked(true);
    } catch {}
  };

  // Load orders from live Cloud Firestore API + localStorage cache fallback
  const loadOrders = async () => {
    // Pause background polling if tab is hidden
    if (typeof document !== 'undefined' && document.hidden) return;
    setIsPolling(true);
    try {
      const pin = localStorage.getItem('grb_staff_pin') || '9119';
      const res = await fetch('/api/orders', { 
        cache: 'no-store',
        headers: { 'X-Staff-PIN': pin }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.orders && Array.isArray(data.orders)) {
          setOrders(data.orders);
          setLastSyncTime(new Date());
          localStorage.setItem('grb_orders_bus', JSON.stringify(data.orders));
          setIsPolling(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Network issue fetching cloud orders, using local cache:', err);
    }

    try {
      const localData = localStorage.getItem('grb_orders_bus');
      if (localData) {
        setOrders(JSON.parse(localData));
      }
    } catch {}
    setIsPolling(false);
  };

  useEffect(() => {
    loadOrders();
    const handleStorage = () => loadOrders();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('grb_new_order', handleStorage);

    // Fast periodic poll every 2.5 seconds for instant multi-device sync
    const interval = setInterval(loadOrders, 2500);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('grb_new_order', handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Web Audio synthesizer for persistent looping kitchen alert chime
  const playKitchenChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioContext) setAudioContext(ctx);
      if (ctx.state === 'suspended') return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Note A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3); // Note A4
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  };

  // Play pleasant single ding when customer accepts a surge wait time
  const playAcceptedDing = () => {
    if (!soundEnabled) return;
    try {
      const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioContext) setAudioContext(ctx);
      if (ctx.state === 'suspended') return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.2); // C6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  };

  // Filter orders by domain status
  const unacknowledgedOrders = orders.filter((o) => o.status === 'RECEIVED');
  const surgePendingOrders = orders.filter((o) => o.status === 'AWAITING_CUSTOMER_APPROVAL');
  const actionRequiredOrders = [...unacknowledgedOrders, ...surgePendingOrders];
  const confirmedOrders = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'COOKING');
  const readyOrders = orders.filter((o) => o.status === 'READY_FOR_COLLECTION' || o.status === 'OUT_FOR_DELIVERY');

  // Looping chime only for unacknowledged 'RECEIVED' orders
  useEffect(() => {
    if (unacknowledgedOrders.length > 0 && soundEnabled && audioUnlocked) {
      playKitchenChime();
      const chimeTimer = setInterval(playKitchenChime, 3500);
      return () => clearInterval(chimeTimer);
    }
  }, [unacknowledgedOrders.length, soundEnabled, audioUnlocked]);

  // Order state transitions with live Cloud Firestore sync
  const updateOrderFields = async (orderId: string, updates: Partial<Order>) => {
    setOrders((prev) => {
      const updated = prev.map((ord) => {
        if (ord.id === orderId) {
          return { ...ord, ...updates };
        }
        return ord;
      });
      localStorage.setItem('grb_orders_bus', JSON.stringify(updated));
      return updated;
    });

    try {
      const pin = localStorage.getItem('grb_staff_pin') || '9119';
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Staff-PIN': pin,
        },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Failed to sync order update to cloud:', err);
    }
  };

  // Kitchen accept button handler:
  // <= 45m: Auto confirm immediately
  // > 45m: Trigger 90s Customer Surge Handshake
  const handleKitchenAccept = async (orderId: string, minutes: number) => {
    const isSurge = minutes > 45;
    const now = new Date();
    const estimatedReadyAt = new Date(now.getTime() + minutes * 60000).toISOString();

    if (isSurge) {
      const surgeRequestedAt = now.toISOString();
      const surgeExpiresAt = new Date(now.getTime() + 90000).toISOString(); // 90 seconds window
      await updateOrderFields(orderId, {
        status: 'AWAITING_CUSTOMER_APPROVAL',
        surgeEtaMinutes: minutes,
        estimatedReadyAt,
        surgeRequestedAt,
        surgeExpiresAt,
      });
    } else {
      await updateOrderFields(orderId, {
        status: 'CONFIRMED',
        estimatedReadyAt,
      });
      const ord = orders.find((o) => o.id === orderId);
      if (ord) setSelectedTicketForPrint(ord);
    }
  };

  // 86 Out of stock toggles
  const toggle86Dish = (code: string) => {
    setSoldOutDishCodes((prev) => 
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  return (
    <div 
      className="min-h-screen bg-stone-900 text-stone-100 flex flex-col font-sans select-none"
      onClick={unlockAudioContext}
    >
      {/* ================= PIN SECURITY GATE ================= */}
      {!pinAuthenticated && (
        <div className="fixed inset-0 z-50 bg-stone-950 flex flex-col items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white mb-1">Kitchen Pass Security</h2>
            <p className="text-xs text-stone-400 mb-6">Enter 4-Digit Staff PIN to unlock live order terminal</p>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoFocus
                placeholder="• • • •"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                className={`w-full py-4 text-center tracking-[0.5em] text-2xl font-black rounded-2xl border bg-stone-950 text-white placeholder-stone-600 focus:outline-none ${
                  pinError ? 'border-red-500 bg-red-950/20 text-red-300' : 'border-stone-700 focus:border-amber-500'
                }`}
              />

              {pinError && (
                <p className="text-xs text-red-400 font-bold">Incorrect PIN. Please re-enter.</p>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-sm transition-colors shadow-lg"
              >
                Unlock Terminal
              </button>
            </form>

            <p className="text-[11px] text-stone-500 mt-6">
              Default pilot PIN: <span className="font-mono text-stone-400 font-bold">9119</span>
            </p>
          </div>
        </div>
      )}

      {/* ================= AUDIO UNLOCK BANNER IF SUSPENDED ================= */}
      {!audioUnlocked && (
        <div 
          onClick={unlockAudioContext}
          className="bg-amber-500 hover:bg-amber-400 text-stone-950 px-4 py-2 text-center text-xs font-black cursor-pointer shadow-lg flex items-center justify-center gap-2"
        >
          <Volume2 className="w-4 h-4 animate-bounce" />
          <span>TAP ANYWHERE ON SCREEN TO ACTIVATE 105dB KITCHEN CHIME ALERTS</span>
        </div>
      )}

      {/* ================= TOP TABLET CONTROL BAR ================= */}
      <header className="bg-stone-950 border-b border-stone-800 px-4 py-3 flex items-center justify-between shadow-lg sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 flex items-center gap-1.5 text-xs font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Storefront</span>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <h1 className="font-black text-white text-base sm:text-lg tracking-tight">
                GOLDEN RICE BOWL · PASS TERMINAL
              </h1>
            </div>
            <p className="text-[11px] text-stone-400 flex items-center gap-2">
              <span>Heathfield Station</span>
              <span>•</span>
              <span className="text-emerald-400 font-mono">
                Cloud Sync: {Math.max(0, Math.round((currentTime - lastSyncTime.getTime()) / 1000))}s ago
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Audio Chime Mute/Unmute */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              unlockAudioContext();
              setSoundEnabled(!soundEnabled);
            }}
            className={`p-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-colors ${
              soundEnabled
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : 'bg-red-950/60 border-red-500/50 text-red-300'
            }`}
            title="Toggle Kitchen Alert Chime"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Chime ON' : 'Chime MUTED'}</span>
          </button>

          {/* Surge Mode / Throttle Switch */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (throttleMode === 'NORMAL') setThrottleMode('BUSY_PLUS_20M');
              else if (throttleMode === 'BUSY_PLUS_20M') setThrottleMode('PAUSED');
              else setThrottleMode('NORMAL');
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-colors ${
              throttleMode === 'NORMAL'
                ? 'bg-stone-800 border-stone-700 text-stone-200'
                : throttleMode === 'BUSY_PLUS_20M'
                ? 'bg-amber-950 border-amber-500 text-amber-300'
                : 'bg-red-950 border-red-500 text-red-300 animate-pulse'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {throttleMode === 'NORMAL' ? 'Normal Pace' : throttleMode === 'BUSY_PLUS_20M' ? 'Kitchen Busy (+20m)' : 'Orders Paused'}
            </span>
          </button>

          {/* "86" Stock Manager */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsStockDrawerOpen(true);
            }}
            className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5"
          >
            <Ban className="w-3.5 h-3.5 text-red-400" />
            <span>86 Stock ({soldOutDishCodes.length})</span>
          </button>

          {/* Admin Settings Link */}
          <Link
            href="/admin"
            target="_blank"
            className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-xs font-bold flex items-center gap-1"
            title="Open Restaurant Admin Portal"
          >
            <span>Admin</span>
          </Link>
        </div>
      </header>

      {/* ================= ORDER FEED COLUMNS ================= */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-x-hidden">
        {/* ================= COLUMN 1: NEW & AWAITING SURGE APPROVAL ================= */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${unacknowledgedOrders.length > 0 ? 'bg-amber-500 animate-ping' : 'bg-amber-500'}`}></span>
              <h2 className="font-black text-amber-400 text-sm uppercase tracking-wider">
                1. Action Required ({actionRequiredOrders.length})
              </h2>
            </div>
            {actionRequiredOrders.length > 0 && (
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full animate-pulse">
                {unacknowledgedOrders.length} NEW · {surgePendingOrders.length} SURGE PENDING
              </span>
            )}
          </div>

          {actionRequiredOrders.length === 0 ? (
            <div className="flex-1 min-h-[220px] rounded-2xl border-2 border-dashed border-stone-800 flex flex-col items-center justify-center text-stone-500 p-6 text-center">
              <UtensilsCrossed className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs font-bold">No unconfirmed orders</p>
              <p className="text-[11px] mt-1 text-stone-600">
                New orders placed in the Storefront appear here in real time.
              </p>
            </div>
          ) : (
            actionRequiredOrders.map((ord) => {
              const isSurgePending = ord.status === 'AWAITING_CUSTOMER_APPROVAL';
              const secondsLeft = ord.surgeExpiresAt 
                ? Math.max(0, Math.ceil((new Date(ord.surgeExpiresAt).getTime() - currentTime) / 1000))
                : 0;

              return (
                <div
                  key={ord.id}
                  className={`bg-stone-950 rounded-2xl shadow-2xl p-4 space-y-3 relative overflow-hidden transition-all ${
                    isSurgePending
                      ? 'border-2 border-amber-400 ring-2 ring-amber-500/30'
                      : 'border-2 border-amber-500/80 animate-pulse-glow'
                  }`}
                >
                  {/* SURGE HANDSHAKE STATUS BAR */}
                  {isSurgePending && (
                    <div className="bg-amber-950/80 border border-amber-500/60 rounded-xl p-2.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-black text-amber-300">
                        <span className="flex items-center gap-1.5">
                          <Timer className="w-4 h-4 animate-spin" />
                          SURGE ETA OFFERED: {ord.surgeEtaMinutes} MINS
                        </span>
                        <span className="font-mono text-white bg-amber-600 px-2 py-0.5 rounded-md text-[11px]">
                          {secondsLeft}s left
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-200/90 leading-tight">
                        Waiting for customer to confirm wait time on mobile. Auto-confirms at 0s.
                      </p>
                      {/* Animated Progress Bar */}
                      <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-400 h-full transition-all duration-1000 ease-linear"
                          style={{ width: `${Math.min(100, (secondsLeft / 90) * 100)}%` }}
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            playAcceptedDing();
                            updateOrderFields(ord.id, { status: 'CONFIRMED' });
                            setSelectedTicketForPrint(ord);
                          }}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Customer Phoned / Force Accept
                        </button>
                        <button
                          onClick={() => updateOrderFields(ord.id, { status: 'CANCELLED' })}
                          className="px-2.5 py-1.5 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 rounded-lg font-bold text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Header with Display ID & Delivery/Collection */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-2xl font-black text-white font-mono tracking-tight">
                        {ord.displayNumber}
                      </span>
                      <span className="text-xs text-stone-400 ml-2 font-semibold">
                        {ord.customer.name}
                      </span>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                        ord.fulfillmentType === 'DELIVERY'
                          ? 'bg-blue-950 text-blue-300 border border-blue-500/50'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                      }`}
                    >
                      {ord.fulfillmentType === 'DELIVERY' ? <Bike className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                      {ord.fulfillmentType}
                    </span>
                  </div>

                  {/* High Contrast Red Allergy Warning Banner */}
                  {ord.allergyDeclaration?.hasAllergies && (
                    <div className="p-2.5 rounded-xl bg-red-600 text-white font-black text-xs flex items-center gap-2 shadow">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <div>
                        <p className="uppercase tracking-wider">!! ALLERGY ALERT !!</p>
                        <p className="text-[11px] font-normal leading-tight">
                          {ord.allergyDeclaration.notes || 'Allergy declared by customer.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Delivery Address Note if Delivery */}
                  {ord.fulfillmentType === 'DELIVERY' && ord.customer.deliveryAddress && (
                    <div className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-300">
                      <p className="font-semibold text-white">
                        {ord.customer.deliveryAddress.line1}, {ord.customer.deliveryAddress.postcode}
                      </p>
                      {ord.customer.deliveryAddress.driverNotes && (
                        <p className="text-[11px] text-amber-300 italic mt-0.5">
                          Note: {ord.customer.deliveryAddress.driverNotes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Line Items */}
                  <div className="space-y-2 pt-1 border-t border-stone-800/80">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between text-xs py-1 border-b border-stone-900 last:border-none">
                        <div className="flex-1">
                          <div className="flex items-baseline gap-1.5 font-black text-white">
                            <span className="text-amber-400 font-mono text-sm">{item.quantity}x</span>
                            <span className="text-stone-400 font-mono text-xs">#{item.dishCode}</span>
                            <span className="text-sm">{item.name}</span>
                            {item.chineseName && (
                              <span className="text-stone-400 text-xs font-serif font-normal">
                                {item.chineseName}
                              </span>
                            )}
                          </div>

                          {item.modifiers && item.modifiers.length > 0 && (
                            <p className="text-[11px] text-amber-300 font-bold ml-6 mt-0.5">
                              + {item.modifiers.map((m) => m.optionName).join(', ')}
                            </p>
                          )}

                          {item.specialInstructions && (
                            <p className="text-[11px] text-stone-400 italic ml-6 mt-0.5">
                              "{item.specialInstructions}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ETA Accept Control Panel (Only if unacknowledged) */}
                  {!isSurgePending && (
                    <div className="pt-2 border-t border-stone-800 space-y-2.5">
                      {/* Standard Normal ETAs */}
                      <div>
                        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wide mb-1 flex justify-between">
                          <span>Standard Wait (Immediate Auto-Confirm):</span>
                          <span className="text-emerald-400 font-mono">≤45 mins</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[15, 25, 40].map((mins) => (
                            <button
                              key={mins}
                              onClick={() => handleKitchenAccept(ord.id, mins)}
                              className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs shadow flex flex-col items-center justify-center transition-all"
                            >
                              <span className="text-sm font-mono">{mins}m</span>
                              <span className="text-[9px] font-normal opacity-85">Instant Accept</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Extended Surge ETAs with 90s Customer Handshake */}
                      <div>
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mb-1 flex justify-between">
                          <span>Peak Surge Wait (Customer 90s Approval):</span>
                          <span className="text-amber-400 font-mono">&gt;45 mins</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[
                            { label: '60m', mins: 60 },
                            { label: '75m', mins: 75 },
                            { label: '90m', mins: 90 },
                            { label: '2 hrs', mins: 120 },
                            { label: '3 hrs', mins: 180 },
                          ].map((tier) => (
                            <button
                              key={tier.mins}
                              onClick={() => handleKitchenAccept(ord.id, tier.mins)}
                              className="py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-stone-950 font-black text-xs shadow flex flex-col items-center justify-center transition-all"
                            >
                              <span className="font-mono text-xs">{tier.label}</span>
                              <span className="text-[8px] font-bold uppercase opacity-90">Surge</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Time & Rejection */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            setCustomEtaOrder(ord);
                            setCustomMinutesInput(90);
                          }}
                          className="flex-1 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-stone-700"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Custom Time...</span>
                        </button>
                        <button
                          onClick={() => setSelectedTicketForPrint(ord)}
                          className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center justify-center gap-1.5"
                          title="Preview Ticket"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateOrderFields(ord.id, { status: 'CANCELLED' })}
                          className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800/50 text-red-300 text-xs font-bold"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ================= COLUMN 2: IN KITCHEN / COOKING ================= */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <h2 className="font-black text-blue-400 text-sm uppercase tracking-wider">
                2. Cooking at Wok Station ({confirmedOrders.length})
              </h2>
            </div>
          </div>

          {confirmedOrders.length === 0 ? (
            <div className="flex-1 min-h-[220px] rounded-2xl border-2 border-dashed border-stone-800 flex flex-col items-center justify-center text-stone-500 p-6 text-center">
              <Flame className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs font-bold">Wok stations clear</p>
            </div>
          ) : (
            confirmedOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-stone-950 rounded-2xl border border-stone-800 p-4 space-y-3 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xl font-black text-white font-mono">
                      {ord.displayNumber}
                    </span>
                    <span className="text-xs text-stone-400 ml-2 font-semibold">
                      {ord.customer.name}
                    </span>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-950 text-blue-300 border border-blue-500/40">
                    {ord.fulfillmentType}
                  </span>
                </div>

                {/* Line Items */}
                <div className="space-y-1.5 pt-1 border-t border-stone-800 text-xs">
                  {ord.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between font-bold text-stone-200">
                      <span>
                        <span className="text-amber-400 mr-1.5">{item.quantity}x</span>
                        #{item.dishCode} {item.name}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedTicketForPrint(ord)}
                    className="p-2 rounded-xl bg-stone-800 text-stone-300 hover:text-white"
                    title="Reprint 80mm Docket"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      const next = ord.fulfillmentType === 'DELIVERY' 
                        ? 'OUT_FOR_DELIVERY' 
                        : 'READY_FOR_COLLECTION';
                      updateOrderFields(ord.id, { status: next });
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {ord.fulfillmentType === 'DELIVERY' ? 'Ready for Driver' : 'Ready at Counter'}
                    </span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ================= COLUMN 3: READY / DISPATCHED ================= */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <h2 className="font-black text-emerald-400 text-sm uppercase tracking-wider">
                3. Ready for Handover ({readyOrders.length})
              </h2>
            </div>
          </div>

          {readyOrders.length === 0 ? (
            <div className="flex-1 min-h-[220px] rounded-2xl border-2 border-dashed border-stone-800 flex flex-col items-center justify-center text-stone-500 p-6 text-center">
              <ShoppingBag className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs font-bold">No orders awaiting pickup</p>
            </div>
          ) : (
            readyOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-stone-950 rounded-2xl border border-stone-800 p-4 space-y-3 opacity-90"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xl font-black text-white font-mono">
                      {ord.displayNumber}
                    </span>
                    <span className="text-xs text-stone-400 ml-2 font-semibold">
                      {ord.customer.name} ({ord.customer.phone})
                    </span>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                    {ord.status === 'OUT_FOR_DELIVERY' ? 'With Driver' : 'At Counter'}
                  </span>
                </div>

                <div className="text-xs text-stone-400">
                  <span>Total Items: {ord.items.reduce((a, b) => a + b.quantity, 0)}</span>
                  <span className="ml-2 font-bold text-white">£{(ord.totalPence / 100).toFixed(2)}</span>
                </div>

                <button
                  onClick={() => updateOrderFields(ord.id, { status: 'COMPLETED' })}
                  className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Mark Completed & Handed Over</span>
                </button>
              </div>
            ))
          )}
        </div>
      </main>

      {/* ================= CUSTOM ETA INPUT MODAL ================= */}
      {customEtaOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-700 max-w-sm w-full rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  Set Custom Wait Time ({customEtaOrder.displayNumber})
                </h3>
              </div>
              <button
                onClick={() => setCustomEtaOrder(null)}
                className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-400">
              Enter preparation time in minutes for large banquet or surge orders:
            </p>

            <div className="text-center py-2">
              <div className="text-4xl font-black font-mono text-amber-400">
                {customMinutesInput} <span className="text-lg text-stone-400 font-sans">mins</span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                ({(customMinutesInput / 60).toFixed(1)} hours)
              </p>
            </div>

            {/* Quick Increment Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[+15, +30, +60, +120].map((delta) => (
                <button
                  key={delta}
                  onClick={() => setCustomMinutesInput((prev) => Math.max(15, Math.min(300, prev + delta)))}
                  className="py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200"
                >
                  +{delta}m
                </button>
              ))}
            </div>

            {/* Slider */}
            <input
              type="range"
              min={15}
              max={240}
              step={5}
              value={customMinutesInput}
              onChange={(e) => setCustomMinutesInput(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />

            <div className="flex gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setCustomEtaOrder(null)}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleKitchenAccept(customEtaOrder.id, customMinutesInput);
                  setCustomEtaOrder(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow"
              >
                Send {customMinutesInput}m to Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 80MM RECEIPT PRINT PREVIEW MODAL ================= */}
      {selectedTicketForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-700 max-w-2xl w-full rounded-3xl p-5 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-gold-400" />
                <h3 className="font-bold text-white text-base">
                  80mm ESC/POS Thermal Receipt Simulation ({selectedTicketForPrint.displayNumber})
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicketForPrint(null)}
                className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto p-1 flex-1 text-xs">
              {/* Kitchen Pass Docket (For Wok Chef) */}
              <div className="bg-white text-black p-4 rounded-xl shadow font-mono text-[11px] leading-tight space-y-2 border border-stone-300">
                <div className="text-center font-bold pb-2 border-b-2 border-dashed border-black">
                  <p className="text-xl font-black">{selectedTicketForPrint.fulfillmentType}</p>
                  <p className="text-3xl font-black tracking-wider">{selectedTicketForPrint.displayNumber}</p>
                  <p className="text-xs">PROMISED READY: {selectedTicketForPrint.surgeEtaMinutes ? `${selectedTicketForPrint.surgeEtaMinutes} MINS` : 'ASAP'}</p>
                </div>

                {selectedTicketForPrint.allergyDeclaration?.hasAllergies && (
                  <div className="bg-black text-white p-2 font-black text-center text-xs">
                    !! ALLERGY ALERT !!<br />
                    {selectedTicketForPrint.allergyDeclaration.notes || 'DECLARED'}
                  </div>
                )}

                <div className="space-y-2 py-2 border-b-2 border-dashed border-black">
                  {selectedTicketForPrint.items.map((it, idx) => (
                    <div key={idx}>
                      <p className="font-black text-sm">
                        {it.quantity}x [#{it.dishCode}] {it.name} {it.chineseName}
                      </p>
                      {it.modifiers && it.modifiers.map((m, mIdx) => (
                        <p key={mIdx} className="font-bold pl-3">
                          + {m.optionName.toUpperCase()}
                        </p>
                      ))}
                      {it.specialInstructions && (
                        <p className="italic pl-3 text-[10px]">
                          NOTE: {it.specialInstructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between font-bold pt-1">
                  <span>TOTAL ITEMS:</span>
                  <span>{selectedTicketForPrint.items.reduce((a, b) => a + b.quantity, 0)}</span>
                </div>
                <p className="text-center text-[9px] pt-1 text-gray-500">
                  --- KITCHEN PASS COPY ---
                </p>
              </div>

              {/* Customer Bag Copy (With VAT and QR Code) */}
              <div className="bg-white text-black p-4 rounded-xl shadow font-mono text-[11px] leading-tight space-y-2 border border-stone-300">
                <div className="text-center border-b border-dashed border-black pb-2">
                  <p className="font-black text-sm">THE GOLDEN RICE BOWL</p>
                  <p className="text-[10px]">Upper Station Road, Heathfield</p>
                  <p className="text-[10px]">Tel: 01435 862342 · TN21 8DS</p>
                  <p className="text-xs font-bold mt-1">ORDER {selectedTicketForPrint.displayNumber} ({selectedTicketForPrint.fulfillmentType})</p>
                </div>

                <div className="text-[10px] space-y-0.5 border-b border-dashed border-black pb-1">
                  <p>Customer: {selectedTicketForPrint.customer.name}</p>
                  <p>Phone: {selectedTicketForPrint.customer.phone}</p>
                  {selectedTicketForPrint.customer.deliveryAddress && (
                    <p>Address: {selectedTicketForPrint.customer.deliveryAddress.line1}, {selectedTicketForPrint.customer.deliveryAddress.postcode}</p>
                  )}
                </div>

                <div className="space-y-1 py-1 border-b border-dashed border-black">
                  {selectedTicketForPrint.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{it.quantity}x #{it.dishCode} {it.name}</span>
                      <span>£{(it.lineTotalPence / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-0.5 font-bold pt-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>£{(selectedTicketForPrint.subtotalPence / 100).toFixed(2)}</span>
                  </div>
                  {selectedTicketForPrint.deliveryFeePence > 0 && (
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>£{(selectedTicketForPrint.deliveryFeePence / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-black pt-1 border-t border-black">
                    <span>TOTAL PAID:</span>
                    <span>£{(selectedTicketForPrint.totalPence / 100).toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-[9px] text-gray-600 pt-1 border-t border-dashed border-black">
                  <p>UK Simplified VAT Breakdown (Notice 709/1):</p>
                  <p>Standard Rate 20% Included: £{((selectedTicketForPrint.totalPence / 6) / 100).toFixed(2)}</p>
                  <p>Payment: Online Card (Stripe Direct)</p>
                </div>

                <div className="flex flex-col items-center justify-center pt-2">
                  <div className="w-16 h-16 border-2 border-black flex items-center justify-center text-[9px] font-bold">
                    [DISPATCH QR]
                  </div>
                  <p className="text-[8px] text-gray-500 mt-1">Driver Scan for Google Maps Navigation</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-800">
              <button
                onClick={() => setSelectedTicketForPrint(null)}
                className="px-5 py-2 rounded-xl bg-gold-600 hover:bg-gold-500 text-stone-950 font-bold text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 86 STOCK DRAWER ================= */}
      {isStockDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-stone-900 border-l border-stone-800 h-full flex flex-col p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-400" />
                <h3 className="font-bold text-white text-base">
                  Instant "86" Stock Toggles
                </h3>
              </div>
              <button
                onClick={() => setIsStockDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-400 my-3">
              Tap any dish to mark it <strong>SOLD OUT</strong> for today. It will immediately be disabled on customer phones.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {GOLDEN_RICE_BOWL_MENU.map((item) => {
                const isSoldOut = soldOutDishCodes.includes(item.dishCode);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle86Dish(item.dishCode)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-colors ${
                      isSoldOut
                        ? 'bg-red-950/60 border-red-500/80 text-red-200'
                        : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <div>
                      <span className="font-mono font-bold mr-1.5 text-stone-400">
                        #{item.dishCode}
                      </span>
                      <span className="font-semibold">{item.name}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isSoldOut ? 'bg-red-500 text-white' : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {isSoldOut ? 'SOLD OUT' : 'Available'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-stone-800">
              <button
                onClick={() => setIsStockDrawerOpen(false)}
                className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
