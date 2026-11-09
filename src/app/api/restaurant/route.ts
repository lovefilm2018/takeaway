import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firestore';
import { getCached, setCached, invalidateCache } from '../../../lib/cache';
import { verifyStaffAuth } from '../../../lib/auth';
import { RestaurantSettings, MenuItem } from '../../../types/domain';
import { 
  DEFAULT_RESTAURANT_SETTINGS, 
  evaluateStoreStatus 
} from '../../../utils/scheduleHelper';

export const dynamic = 'force-dynamic';

const CONFIG_DOC_ID = 'golden-rice-bowl-001';
const RESTAURANT_CACHE_KEY = 'grb_restaurant_config';
const RESTAURANT_CACHE_TTL_MS = 15000; // 15 second cache for storefront

export async function GET() {
  try {
    const cached = getCached<any>(RESTAURANT_CACHE_KEY);
    if (cached) {
      return NextResponse.json({ ...cached, source: 'cache' });
    }

    const docRef = db.collection('restaurant_config').doc(CONFIG_DOC_ID);
    const doc = await docRef.get();

    let settings: RestaurantSettings = DEFAULT_RESTAURANT_SETTINGS;
    let menuOverrides: Record<string, Partial<MenuItem>> = {};
    let customDishes: MenuItem[] = [];

    if (doc.exists) {
      const data = doc.data();
      if (data?.settings) {
        settings = { ...DEFAULT_RESTAURANT_SETTINGS, ...data.settings };
      }
      if (data?.menuOverrides) {
        menuOverrides = data.menuOverrides;
      }
      if (data?.customDishes) {
        customDishes = data.customDishes;
      }
    }

    const storeStatus = evaluateStoreStatus(settings);
    const payload = {
      success: true,
      settings,
      storeStatus,
      menuOverrides,
      customDishes,
    };

    setCached(RESTAURANT_CACHE_KEY, payload, RESTAURANT_CACHE_TTL_MS);
    return NextResponse.json(payload);
  } catch (err: any) {
    console.error('Error fetching restaurant config:', err);
    const storeStatus = evaluateStoreStatus(DEFAULT_RESTAURANT_SETTINGS);
    return NextResponse.json({
      success: true,
      settings: DEFAULT_RESTAURANT_SETTINGS,
      storeStatus,
      menuOverrides: {},
      customDishes: [],
    });
  }
}

export async function PATCH(req: NextRequest) {
  // Enforce staff/admin PIN protection to alter restaurant configuration or prices
  if (!verifyStaffAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized: Staff/Admin PIN required' }, { status: 401 });
  }

  try {
    const payload = await req.json();
    const docRef = db.collection('restaurant_config').doc(CONFIG_DOC_ID);

    const doc = await docRef.get();
    const existing = doc.exists ? doc.data() || {} : {};

    const updatedData = {
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(updatedData, { merge: true });

    const newSettings: RestaurantSettings = updatedData.settings 
      ? { ...DEFAULT_RESTAURANT_SETTINGS, ...updatedData.settings } 
      : DEFAULT_RESTAURANT_SETTINGS;

    const storeStatus = evaluateStoreStatus(newSettings);

    // Invalidate cached config
    invalidateCache(RESTAURANT_CACHE_KEY);

    return NextResponse.json({
      success: true,
      settings: newSettings,
      storeStatus,
      menuOverrides: updatedData.menuOverrides || {},
      customDishes: updatedData.customDishes || [],
    });
  } catch (err: any) {
    console.error('Error updating restaurant config:', err);
    return NextResponse.json(
      { error: 'Failed to update restaurant settings', details: err?.message },
      { status: 500 }
    );
  }
}
