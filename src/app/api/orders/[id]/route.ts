import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firestore';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderRef = db.collection('orders').doc(id);
    const doc = await orderRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: doc.data() });
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

    await orderRef.update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await orderRef.get();
    return NextResponse.json({ success: true, order: updatedDoc.data() });
  } catch (err: any) {
    console.error('Error updating order:', err);
    return NextResponse.json({ error: 'Failed to update order', details: err?.message }, { status: 500 });
  }
}
