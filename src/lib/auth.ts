/**
 * Takeaway Security & Authentication Guard
 * Protects Kitchen and Admin management portals with Staff PIN (9119).
 */

import { NextRequest } from 'next/server';

export const STAFF_PIN = process.env.TAKEAWAY_STAFF_PIN || '9119';

export function verifyStaffAuth(req: NextRequest): boolean {
  // 1. Check custom Authorization or X-Staff-PIN header
  const headerPin = req.headers.get('x-staff-pin') || req.headers.get('x-admin-pin');
  if (headerPin && headerPin.trim() === STAFF_PIN) {
    return true;
  }

  // 2. Check Bearer Token
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === STAFF_PIN) return true;
  }

  // 3. Check secure cookie
  const cookiePin = req.cookies.get('grb_staff_pin')?.value;
  if (cookiePin && cookiePin.trim() === STAFF_PIN) {
    return true;
  }

  return false;
}
