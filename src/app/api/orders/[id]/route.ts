import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firestore';
import { getCached, setCached, invalidateCache } from '../../../../lib/cache';
import { verifyStaffAuth } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cacheKey = `order_${id}`;
    const cached = getCached<any>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, order: cached, source: 'cache' });
    }

    const orderRef = db.collection('orders').doc(id);
    const doc = await orderRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = doc.data();
    setCached(cacheKey, orderData, 2000); // 2 second cache for single order polling

    return NextResponse.json({ success: true, order: orderData, source: 'firestore' });
  } catch (err: any) {
    console.error('Error fetching order:', err);
    return NextResponse.json({ error: 'Failed to fetch order', details: err?.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await req.json();

    const orderRef = db.collection('orders').doc(id);
    const doc = await orderRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const currentOrder = doc.data();

    // Customers may ONLY accept or cancel an order during AWAITING_CUSTOMER_APPROVAL
    const isStaff = verifyStaffAuth(req);
    if (!isStaff) {
      const allowedCustomerStatuses = ['CONFIRMED', 'CANCELLED'];
      const isCustomerSurgeReply = 
        currentOrder?.status === 'AWAITING_CUSTOMER_APPROVAL' &&
        allowedCustomerStatuses.includes(updates.status) &&
        Object.keys(updates).length === 1;

      if (!isCustomerSurgeReply) {
        return NextResponse.json({ error: 'Unauthorized: Staff PIN required to modify kitchen order' }, { status: 401 });
      }
    }

    await orderRef.update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await orderRef.get();
    const updatedData = updatedDoc.data();

    // Invalidate caches
    invalidateCache(`order_${id}`);
    invalidateCache('grb_recent_orders');

    return NextResponse.json({ success: true, order: updatedData });
  } catch (err: any) {
    console.error('Error updating order:', err);
    return NextResponse.json({ error: 'Failed to update order', details: err?.message }, { status: 500 });
  }
}
