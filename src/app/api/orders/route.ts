import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firestore';
import { Order } from '../../../types/domain';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await db
      .collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const orders = snapshot.docs.map((doc) => doc.data() as Order);
    return NextResponse.json({ orders });
  } catch (err: any) {
    console.error('Error fetching orders from Firestore:', err);
    return NextResponse.json({ error: 'Failed to fetch orders', details: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const order = (await req.json()) as Order;

    if (!order.id || !order.customer?.name) {
      return NextResponse.json({ error: 'Invalid order payload' }, { status: 400 });
    }

    const orderRef = db.collection('orders').doc(order.id);
    await orderRef.set({
      ...order,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    console.error('Error creating order in Firestore:', err);
    return NextResponse.json({ error: 'Failed to save order', details: err?.message }, { status: 500 });
  }
}
