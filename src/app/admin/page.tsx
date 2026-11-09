'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Store, 
  Clock, 
  Calendar, 
  Save, 
  Check, 
  AlertCircle, 
  UtensilsCrossed, 
  Plus, 
  Search, 
  ChevronLeft, 
  ExternalLink, 
  X, 
  Ban, 
  CheckCircle2,
  Sparkles,
  SlidersHorizontal,
  Flame,
  ArrowRight
} from 'lucide-react';
import { GOLDEN_RICE_BOWL_MENU, MENU_CATEGORIES } from '../../data/goldenRiceBowlMenu';
import { MenuItem, RestaurantSettings, WeeklySchedule, DayShift } from '../../types/domain';
import { DEFAULT_RESTAURANT_SETTINGS, StoreStatusResult, evaluateStoreStatus } from '../../utils/scheduleHelper';

const DAYS_OF_WEEK: { key: keyof WeeklySchedule; label: string; traditionalNote?: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday', traditionalNote: 'Traditional closed day' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday', traditionalNote: 'Lunch & Evening split shifts' },
  { key: 'saturday', label: 'Saturday', traditionalNote: 'Lunch & Evening split shifts' },
  { key: 'sunday', label: 'Sunday' },
];

export default function RestaurantAdminPortal() {
  const [pinAuthenticated, setPinAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'hours' | 'menu'>('hours');
  const [settings, setSettings] = useState<RestaurantSettings>(DEFAULT_RESTAURANT_SETTINGS);
  const [storeStatus, setStoreStatus] = useState<StoreStatusResult | null>(null);
  const [menuOverrides, setMenuOverrides] = useState<Record<string, Partial<MenuItem>>>({});
  const [customDishes, setCustomDishes] = useState<MenuItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  // Menu Search & Filter
  const [menuSearch, setMenuSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Add Dish Modal
  const [isAddDishModalOpen, setIsAddDishModalOpen] = useState(false);
  const [newDish, setNewDish] = useState<Partial<MenuItem>>({
    dishCode: '',
    name: '',
    chineseName: '',
    category: 'Chef Recommendations',
    basePricePence: 850,
    imageUrl: '',
    spicyLevel: 0,
    isVegetarian: false,
    allergens: [],
  });

  // Edit Image Modal
  const [editingImageDish, setEditingImageDish] = useState<MenuItem | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch live settings and overrides from Cloud Firestore
  const loadData = async () => {
    try {
      const res = await fetch('/api/restaurant', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSettings(data.settings);
        if (data.storeStatus) setStoreStatus(data.storeStatus);
        if (data.menuOverrides) setMenuOverrides(data.menuOverrides);
        if (data.customDishes) setCustomDishes(data.customDishes);
      }
    } catch (err) {
      console.warn('Using local fallback settings:', err);
      setStoreStatus(evaluateStoreStatus(settings));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Settings to Cloud Firestore
  const saveSettings = async (updatedSettings: RestaurantSettings) => {
    setIsSaving(true);
    try {
      const pin = localStorage.getItem('grb_staff_pin') || '9119';
      const res = await fetch('/api/restaurant', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Staff-PIN': pin,
        },
        body: JSON.stringify({ settings: updatedSettings }),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setStoreStatus(data.storeStatus);
        showToast('Opening hours & store settings saved live!');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      showToast('Error saving to cloud. Changes cached locally.');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Day Open/Close
  const updateDaySchedule = (dayKey: keyof WeeklySchedule, updates: Partial<DayShift>) => {
    const updatedSchedule = {
      ...settings.schedule,
      [dayKey]: {
        ...settings.schedule[dayKey],
        ...updates,
      },
    };
    setSettings((prev) => ({
      ...prev,
      schedule: updatedSchedule,
    }));
  };

  // Toggle Instant Open/Close Override
  const toggleInstantStatus = async () => {
    const newManualIsOpen = !settings.manualIsOpen;
    const updated = {
      ...settings,
      manualIsOpen: newManualIsOpen,
    };
    setSettings(updated);
    await saveSettings(updated);
  };

  // Save price or sold out override for a menu item
  const updateMenuItemOverride = async (dishCode: string, updates: Partial<MenuItem>) => {
    const updatedOverrides = {
      ...menuOverrides,
      [dishCode]: {
        ...(menuOverrides[dishCode] || {}),
        ...updates,
      },
    };
    setMenuOverrides(updatedOverrides);

    try {
      const pin = localStorage.getItem('grb_staff_pin') || '9119';
      await fetch('/api/restaurant', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Staff-PIN': pin,
        },
        body: JSON.stringify({ menuOverrides: updatedOverrides }),
      });
      showToast(`Dish #${dishCode} updated!`);
    } catch (err) {
      console.error('Error saving menu override:', err);
    }
  };

  // Add New Dish Handler
  const handleAddNewDish = async () => {
    if (!newDish.dishCode || !newDish.name || !newDish.basePricePence) {
      alert('Please enter dish code, name, and price.');
      return;
    }

    const created: MenuItem = {
      id: `custom-${Date.now()}`,
      dishCode: newDish.dishCode.toUpperCase().trim(),
      name: newDish.name.trim(),
      chineseName: newDish.chineseName?.trim() || undefined,
      category: newDish.category || 'Chef Recommendations',
      basePricePence: Number(newDish.basePricePence),
      imageUrl: newDish.imageUrl?.trim() || undefined,
      spicyLevel: newDish.spicyLevel || 0,
      isVegetarian: Boolean(newDish.isVegetarian),
      allergens: newDish.allergens || [],
    };

    const updatedCustom = [created, ...customDishes];
    setCustomDishes(updatedCustom);
    setIsAddDishModalOpen(false);

    try {
      const pin = localStorage.getItem('grb_staff_pin') || '9119';
      await fetch('/api/restaurant', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Staff-PIN': pin,
        },
        body: JSON.stringify({ customDishes: updatedCustom }),
      });
      showToast(`Added new dish #${created.dishCode}: ${created.name}!`);
    } catch (err) {
      console.error('Error saving new dish:', err);
    }
  };

  // Combined Active Menu
  const combinedMenu = [...customDishes, ...GOLDEN_RICE_BOWL_MENU].map((dish) => {
    const override = menuOverrides[dish.dishCode];
    return {
      ...dish,
      ...(override || {}),
    };
  });

  const filteredDishes = combinedMenu.filter((d) => {
    const matchesCat = selectedCategory === 'ALL' || d.category === selectedCategory;
    const q = menuSearch.toLowerCase().trim();
    const matchesSearch = !q || d.dishCode.toLowerCase().includes(q) || d.name.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col font-sans select-none pb-20">
      {/* ================= PIN SECURITY GATE ================= */}
      {!pinAuthenticated && (
        <div className="fixed inset-0 z-50 bg-stone-950 flex flex-col items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white mb-1">Restaurant Admin Security</h2>
            <p className="text-xs text-stone-400 mb-6">Enter 4-Digit PIN to manage hours, menu & prices</p>

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
                Unlock Admin Portal
              </button>
            </form>

            <p className="text-[11px] text-stone-500 mt-6">
              Default pilot PIN: <span className="font-mono text-stone-400 font-bold">9119</span>
            </p>
          </div>
        </div>
      )}

      {/* ================= FLOATING TOAST FEEDBACK ================= */}
      {toastMessage && (
        <div className="fixed top-16 inset-x-4 max-w-sm mx-auto z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= TOP HEADER CONTROL BAR ================= */}
      <header className="bg-stone-950 border-b border-stone-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center gap-1.5 text-xs font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Storefront</span>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${storeStatus?.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              <h1 className="font-black text-white text-base sm:text-lg tracking-tight">
                GOLDEN RICE BOWL · RESTAURANT ADMIN
              </h1>
            </div>
            <p className="text-[11px] text-stone-400 flex items-center gap-2">
              <span>Heathfield Branch Management</span>
              <span>•</span>
              <span className={storeStatus?.isOpen ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {storeStatus?.isOpen ? 'STORE CURRENTLY OPEN' : 'STORE CURRENTLY CLOSED'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/kitchen"
            target="_blank"
            className="px-3 py-2 rounded-xl bg-imperial-800 hover:bg-imperial-700 text-white text-xs font-bold flex items-center gap-1.5 border border-gold-500/40"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kitchen Pass</span>
          </Link>
        </div>
      </header>

      {/* ================= TABS NAVIGATION ================= */}
      <div className="bg-stone-950 border-b border-stone-800 px-4">
        <div className="max-w-5xl mx-auto flex gap-4">
          <button
            onClick={() => setActiveTab('hours')}
            className={`py-3 px-3 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'hours'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Opening Times & Operating Mode</span>
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`py-3 px-3 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'menu'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Menu & Pricing Manager ({combinedMenu.length})</span>
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ================= TAB 1: OPENING TIMES & OPERATING MODE ================= */}
        {activeTab === 'hours' && (
          <div className="space-y-6 animate-fade-in">
            {/* INSTANT STATUS & AUTO/MANUAL MODE CARD */}
            <div className="p-5 rounded-3xl bg-stone-950 border border-stone-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Store className="w-5 h-5 text-amber-400" />
                    <span>Store Status & Master Switch</span>
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Live Status: <strong className={storeStatus?.isOpen ? 'text-emerald-400' : 'text-red-400'}>
                      {storeStatus?.isOpen ? 'Accepting Orders' : 'Closed for Orders'}
                    </strong> ({storeStatus?.reason})
                  </p>
                </div>

                {/* Big Instant Master Toggle Button */}
                <button
                  onClick={toggleInstantStatus}
                  className={`px-5 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${
                    settings.manualIsOpen
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-white animate-pulse"></span>
                  <span>{settings.manualIsOpen ? 'STORE IS OPEN (TAP TO CLOSE)' : 'STORE IS CLOSED (TAP TO OPEN)'}</span>
                </button>
              </div>

              {/* OPERATING MODE SELECTOR (AUTO VS MANUAL) */}
              <div className="space-y-3 pt-1">
                <div className="text-xs font-bold text-stone-300">
                  Select How You Want The Storefront To Open & Close:
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Option A: Auto Open by Schedule */}
                  <label
                    onClick={() => {
                      const updated = { ...settings, autoOpenMode: true };
                      setSettings(updated);
                      saveSettings(updated);
                    }}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      settings.autoOpenMode
                        ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
                        : 'bg-stone-900 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="openMode"
                      checked={settings.autoOpenMode}
                      onChange={() => {}}
                      className="mt-1 accent-amber-500"
                    />
                    <div>
                      <p className="font-black text-xs text-white flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Auto-Open & Close by Schedule (Recommended)</span>
                      </p>
                      <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                        The website automatically accepts customer orders when the current time is within your opening hours schedule below. Outside these hours, orders are paused.
                      </p>
                    </div>
                  </label>

                  {/* Option B: Manual Daily Control */}
                  <label
                    onClick={() => {
                      const updated = { ...settings, autoOpenMode: false };
                      setSettings(updated);
                      saveSettings(updated);
                    }}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      !settings.autoOpenMode
                        ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
                        : 'bg-stone-900 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="openMode"
                      checked={!settings.autoOpenMode}
                      onChange={() => {}}
                      className="mt-1 accent-amber-500"
                    />
                    <div>
                      <p className="font-black text-xs text-white flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                        <span>Manual Daily Control (Staff Must Open Daily)</span>
                      </p>
                      <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                        The website stays closed each day until a staff member taps the green button to open. Perfect if your daily prep time or closing time varies.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* EMERGENCY NOTICE / CUSTOM BANNER */}
              <div className="pt-3 border-t border-stone-800 space-y-1.5">
                <label className="text-xs font-bold text-stone-300">
                  Custom Closed Notice or Announcement Banner (Optional):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.emergencyNotice || ''}
                    onChange={(e) => setSettings({ ...settings, emergencyNotice: e.target.value })}
                    placeholder="e.g. Closed early tonight at 9pm for kitchen maintenance. Open as normal tomorrow!"
                    className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => saveSettings(settings)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
                  >
                    Save Notice
                  </button>
                </div>
              </div>
            </div>

            {/* WEEKLY SCHEDULE EDITOR (MONDAY TO SUNDAY) */}
            <div className="p-5 rounded-3xl bg-stone-950 border border-stone-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-400" />
                    <span>Weekly Opening Times (Single Shift or Lunch & Evening Split)</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Configure regular operating hours. Restaurants open twice per day (e.g. Lunch 12:00–14:30 & Evening 17:00–23:00) can toggle split shift per day.
                  </p>
                </div>

                <button
                  onClick={() => saveSettings(settings)}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs shadow flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save All Hours'}</span>
                </button>
              </div>

              <div className="space-y-3">
                {DAYS_OF_WEEK.map(({ key, label, traditionalNote }) => {
                  const shift = settings.schedule[key] || { isOpen: false };

                  return (
                    <div
                      key={key}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        shift.isOpen
                          ? 'bg-stone-900 border-stone-800'
                          : 'bg-stone-950/60 border-stone-900 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Day Name & Open/Closed Checkbox */}
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <input
                            type="checkbox"
                            id={`check-${key}`}
                            checked={shift.isOpen}
                            onChange={(e) => updateDaySchedule(key, { isOpen: e.target.checked })}
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                          />
                          <label htmlFor={`check-${key}`} className="cursor-pointer">
                            <span className="font-bold text-white text-sm">{label}</span>
                            {traditionalNote && (
                              <span className="text-[10px] text-stone-500 block">
                                {traditionalNote}
                              </span>
                            )}
                          </label>
                        </div>

                        {/* Shift Times */}
                        {shift.isOpen ? (
                          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-end gap-3 text-xs">
                            {/* Split Shift Toggle */}
                            <button
                              type="button"
                              onClick={() => updateDaySchedule(key, { 
                                isSplitShift: !shift.isSplitShift,
                                ...(shift.isSplitShift ? {} : { openTime2: '17:00', closeTime2: '23:00' })
                              })}
                              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold ${
                                shift.isSplitShift
                                  ? 'bg-amber-950 text-amber-300 border-amber-600'
                                  : 'bg-stone-800 text-stone-400 border-stone-700'
                              }`}
                            >
                              {shift.isSplitShift ? 'Split Shift (2x Daily)' : 'Single Shift (1x Daily)'}
                            </button>

                            {/* Shift 1 Times */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-stone-400 font-semibold">
                                {shift.isSplitShift ? 'Lunch:' : 'Hours:'}
                              </span>
                              <input
                                type="time"
                                value={shift.openTime1 || '17:00'}
                                onChange={(e) => updateDaySchedule(key, { openTime1: e.target.value })}
                                className="bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-white font-mono"
                              />
                              <span className="text-stone-500">to</span>
                              <input
                                type="time"
                                value={shift.closeTime1 || '23:00'}
                                onChange={(e) => updateDaySchedule(key, { closeTime1: e.target.value })}
                                className="bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-white font-mono"
                              />
                            </div>

                            {/* Shift 2 Times if Split */}
                            {shift.isSplitShift && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-stone-400 font-semibold">Evening:</span>
                                <input
                                  type="time"
                                  value={shift.openTime2 || '17:00'}
                                  onChange={(e) => updateDaySchedule(key, { openTime2: e.target.value })}
                                  className="bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-white font-mono"
                                />
                                <span className="text-stone-500">to</span>
                                <input
                                  type="time"
                                  value={shift.closeTime2 || '23:30'}
                                  onChange={(e) => updateDaySchedule(key, { closeTime2: e.target.value })}
                                  className="bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-white font-mono"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-red-400 italic">
                            Closed All Day
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-end">
                <button
                  onClick={() => saveSettings(settings)}
                  disabled={isSaving}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Opening Hours to Cloud</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MENU & PRICING MANAGER ================= */}
        {activeTab === 'menu' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Toolbar: Search, Category Filter, and Add Dish */}
            <div className="p-4 rounded-3xl bg-stone-950 border border-stone-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Search dishes by code (e.g. 42) or name..."
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {MENU_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setIsAddDishModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Dish</span>
              </button>
            </div>

            {/* Dishes List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredDishes.map((dish) => {
                const isSoldOut = dish.isSoldOutToday === true;

                return (
                  <div
                    key={dish.dishCode}
                    className={`p-3.5 rounded-2xl border transition-all flex gap-3 ${
                      isSoldOut
                        ? 'bg-red-950/20 border-red-900/60 opacity-80'
                        : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-stone-900 shrink-0 border border-stone-800">
                      {dish.imageUrl ? (
                        <img
                          src={dish.imageUrl}
                          alt={dish.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-stone-600 p-1 text-center">
                          <UtensilsCrossed className="w-5 h-5 mb-1" />
                          <span className="text-[9px]">No photo</span>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setEditingImageDish(dish);
                          setCustomImageUrl(dish.imageUrl || '');
                        }}
                        className="absolute inset-0 bg-stone-950/60 hover:bg-stone-950/80 text-white opacity-0 hover:opacity-100 flex items-center justify-center text-[10px] font-bold transition-opacity"
                      >
                        Change
                      </button>
                    </div>

                    {/* Dish Info & Inline Price Editor */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-amber-400 text-xs">
                            #{dish.dishCode}
                          </span>
                          <span className="text-[10px] text-stone-500 truncate max-w-[120px]">
                            {dish.category}
                          </span>
                        </div>

                        <h4 className="font-bold text-white text-xs truncate mt-0.5">
                          {dish.name}
                        </h4>
                        {dish.chineseName && (
                          <p className="text-[10px] text-stone-400 font-serif">
                            {dish.chineseName}
                          </p>
                        )}
                      </div>

                      {/* Controls: Price input & Sold out toggle */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-900 mt-1">
                        <div className="flex items-center gap-1 text-xs font-bold text-stone-300">
                          <span>£</span>
                          <input
                            type="number"
                            step="0.05"
                            defaultValue={(dish.basePricePence / 100).toFixed(2)}
                            onBlur={(e) => {
                              const newPence = Math.round(parseFloat(e.target.value || '0') * 100);
                              if (newPence > 0 && newPence !== dish.basePricePence) {
                                updateMenuItemOverride(dish.dishCode, { basePricePence: newPence });
                              }
                            }}
                            className="w-16 bg-stone-900 border border-stone-800 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        <button
                          onClick={() => updateMenuItemOverride(dish.dishCode, { isSoldOutToday: !isSoldOut })}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                            isSoldOut
                              ? 'bg-red-950 text-red-300 border-red-800'
                              : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
                          }`}
                        >
                          {isSoldOut ? 'SOLD OUT' : 'Available'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ================= ADD NEW DISH MODAL ================= */}
      {isAddDishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-700 max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-bold text-white text-base">Add New Menu Dish</h3>
              <button
                onClick={() => setIsAddDishModalOpen(false)}
                className="w-7 h-7 rounded-full bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-stone-400 block mb-1">Dish Code (#):</label>
                  <input
                    type="text"
                    value={newDish.dishCode || ''}
                    onChange={(e) => setNewDish({ ...newDish, dishCode: e.target.value })}
                    placeholder="e.g. 159, S1"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-stone-400 block mb-1">Price (£):</label>
                  <input
                    type="number"
                    step="0.05"
                    defaultValue="8.50"
                    onChange={(e) => setNewDish({ ...newDish, basePricePence: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-400 block mb-1">Dish Name (English):</label>
                <input
                  type="text"
                  value={newDish.name || ''}
                  onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                  placeholder="e.g. Salt & Chilli Crispy Tofu"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-stone-400 block mb-1">Chinese Characters (Optional):</label>
                <input
                  type="text"
                  value={newDish.chineseName || ''}
                  onChange={(e) => setNewDish({ ...newDish, chineseName: e.target.value })}
                  placeholder="e.g. 椒盐豆腐"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-serif"
                />
              </div>

              <div>
                <label className="text-stone-400 block mb-1">Category:</label>
                <select
                  value={newDish.category || 'Chef Recommendations'}
                  onChange={(e) => setNewDish({ ...newDish, category: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white"
                >
                  {MENU_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-stone-400 block mb-1">Photo URL (Optional):</label>
                <input
                  type="text"
                  value={newDish.imageUrl || ''}
                  onChange={(e) => setNewDish({ ...newDish, imageUrl: e.target.value })}
                  placeholder="https://... or /images/dishes/..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDish.isVegetarian || false}
                    onChange={(e) => setNewDish({ ...newDish, isVegetarian: e.target.checked })}
                    className="accent-amber-500 rounded"
                  />
                  <span className="text-stone-300">Vegetarian</span>
                </label>

                <div className="flex items-center gap-1">
                  <span className="text-stone-400">Spice:</span>
                  {[0, 1, 2, 3].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setNewDish({ ...newDish, spicyLevel: lvl as any })}
                      className={`w-6 h-6 rounded text-xs font-bold ${
                        (newDish.spicyLevel || 0) === lvl
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setIsAddDishModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 text-stone-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewDish}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow"
              >
                Add Dish to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT PHOTO MODAL ================= */}
      {editingImageDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-700 max-w-sm w-full rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h3 className="font-bold text-white text-sm">
                Change Photo (#{editingImageDish.dishCode})
              </h3>
              <button
                onClick={() => setEditingImageDish(null)}
                className="w-7 h-7 rounded-full bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-stone-400 block">Enter Image URL or Path:</label>
              <input
                type="text"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="/images/dishes/... or https://..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
              />

              {customImageUrl && (
                <div className="w-full h-32 rounded-xl overflow-hidden bg-stone-950 border border-stone-800 mt-2">
                  <img
                    src={customImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => ((e.target as any).style.display = 'none')}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setEditingImageDish(null)}
                className="flex-1 py-2 rounded-xl bg-stone-800 text-stone-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateMenuItemOverride(editingImageDish.dishCode, { imageUrl: customImageUrl });
                  setEditingImageDish(null);
                }}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow"
              >
                Save Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
