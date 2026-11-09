import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firestore';
import { RestaurantSettings, MenuItem } from '../../../types/domain';
import { 
  DEFAULT_RESTAURANT_SETTINGS, 
  evaluateStoreStatus 
} from '../../../utils/scheduleHelper';

export const dynamic = 'force-dynamic';

const CONFIG_DOC_ID = 'golden-rice-bowl-001';

export async function GET() {
  try {
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

    return NextResponse.json({
      success: true,
      settings,
      storeStatus,
      menuOverrides,
      customDishes,
    });
  } catch (err: any) {
    console.error('Error fetching restaurant config:', err);
    // Graceful fallback to default in-memory config if Firestore read fails
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
