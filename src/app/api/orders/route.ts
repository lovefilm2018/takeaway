import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firestore';
import { getCached, setCached, invalidateCache } from '../../../lib/cache';
import { verifyStaffAuth } from '../../../lib/auth';
import { Order } from '../../../types/domain';

export const dynamic = 'force-dynamic';

const ORDERS_CACHE_KEY = 'grb_recent_orders';
const ORDERS_CACHE_TTL_MS = 2500; // 2.5 second server cache collapses repeated kitchen polling

export async function GET(req: NextRequest) {
  // Protect staff order feed from unauthenticated public scrapers
  if (!verifyStaffAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized: Staff PIN required' }, { status: 401 });
  }

  try {
    const cached = getCached<Order[]>(ORDERS_CACHE_KEY);
    if (cached) {
      return NextResponse.json({ orders: cached, source: 'cache' });
    }

    const snapshot = await db
      .collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();

    const orders = snapshot.docs.map((doc) => doc.data() as Order);
    setCached(ORDERS_CACHE_KEY, orders, ORDERS_CACHE_TTL_MS);

    return NextResponse.json({ orders, source: 'firestore' });
  } catch (err: any) {
    console.error('Error fetching orders from Firestore:', err);
    return NextResponse.json({ error: 'Failed to fetch orders', details: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const order = (await req.json()) as Order;

    if (!order.id || !order.customer?.name || !order.items || !Array.isArray(order.items) || order.items.length === 0) {
      return NextResponse.json({ error: 'Invalid order payload' }, { status: 400 });
    }

    // Server-side calculation & sanitization
    const sanitizedOrder: Order = {
      ...order,
      status: 'RECEIVED',
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const orderRef = db.collection('orders').doc(order.id);
    
    // Prevent malicious overwriting of existing orders
    const existing = await orderRef.get();
    if (existing.exists) {
      return NextResponse.json({ error: 'Order ID already exists' }, { status: 409 });
    }

    await orderRef.set(sanitizedOrder);
    
    // Invalidate server cache so kitchen receives new orders instantly
    invalidateCache(ORDERS_CACHE_KEY);

    return NextResponse.json({ success: true, order: sanitizedOrder });
  } catch (err: any) {
    console.error('Error creating order in Firestore:', err);
    return NextResponse.json({ error: 'Failed to save order', details: err?.message }, { status: 500 });
  }
}
