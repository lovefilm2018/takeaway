# GEMINI.md — Takeaway Platform Specification

> **Operational Partnership Rules:** All AI agents operating in this workspace (Antigravity CLI or Gemini CLI) must strictly adhere to the operational rules, pre-deployment summaries, and instant audit logging defined in [AGENTS.md](AGENTS.md).

---

## 1. Project Overview & Business Mission

- **Project Name:** Takeaway
- **Tagline:** Direct-to-consumer online takeaway ordering platform built for independent restaurants.
- **Repository:** `https://github.com/lovefilm2018/takeaway.git`
- **Core Market Disruption:**
  - Traditional aggregators (Just Eat, Deliveroo, UberEats) charge predatory commissions ranging from 15% to 30%+ on every order, squeezing razor-thin restaurant profit margins and disconnecting restaurants from their customer relationships.
  - **Takeaway Proposition:** We build and host dedicated, high-performance, branded ordering web applications tailored specifically for each partner restaurant, charging only ~**5% commission** (a 66%+ cost reduction compared to Just Eat).
- **Inaugural Client & Pilot Deployment:**
  - A local independent Chinese takeaway currently operating with zero digital ordering infrastructure (relying solely on paper menus, cash/counter card machines, and phone calls).
  - The pilot will prove the end-to-end model: digitized menu structure, seamless customer mobile ordering, and zero-friction kitchen order acceptance.

---

## 2. Core Functional Pillars (Dual-Frontend Architecture)

### 2.1 Customer-Facing Web App (Mobile-First PWA)
- **Menu Experience:**
  - High-performance, categorized menu navigation (e.g. Appetisers, Soups, Sweet & Sour, Curry Dishes, Chow Mein, Fried Rice, Chef Specials, Set Dinners).
  - Multi-level dish customization: dish modifiers (e.g. protein choice: Chicken, Beef, King Prawn, Tofu), spice levels, allergy warnings, and special preparation notes.
  - Search and dietary filters (Vegetarian, Vegan, Gluten-Free, Halal).
- **Fulfillment Selection:**
  - Collection (Takeaway pickup) or Home Delivery.
  - Delivery qualification: Postcode / distance validation with configurable delivery fees and minimum order amounts.
  - ASAP ordering or pre-order scheduling for later in the evening.
- **Checkout & Payments:**
  - Zero-friction checkout: Apple Pay, Google Pay, and standard Credit/Debit card processing via Stripe.
  - Optional guest checkout (no mandatory account creation hurdle) with saved phone/address memory via localStorage / cookies.
- **Live Order Tracking:**
  - Real-time order tracking status screen:
    `Received` ➔ `Confirmed with Estimated Time (e.g. 25-35 mins)` ➔ `In Kitchen` ➔ `Ready for Pickup / Out for Delivery` ➔ `Completed`.
  - Automated SMS / WhatsApp / email notification hooks upon order confirmation and dispatch.

### 2.2 Kitchen & Restaurant Staff Management Portal (Tablet-Optimized)
- **Real-Time Order Feed:**
  - Immediate audio-visual alerts (persistent audio chime that loops until a staff member acknowledges the order, preventing missed orders during rush hours).
  - Large, high-contrast order cards displaying order ID, collection/delivery type, customer address, phone number, itemized dishes with highlighted modifications, and payment status.
- **One-Tap Order Acceptance:**
  - Quick-select estimated completion time buttons (e.g. `15 min`, `25 min`, `40 min`, `60 min`, or manual entry).
  - Reject order capability with pre-set customer reasons (e.g. "Kitchen at capacity", "Out of delivery radius", "Item unavailable").
- **Live Kitchen Operations:**
  - Ticket progression: Move orders from "Preparing" to "Ready for Collection" or "Dispatched with Driver".
  - One-tap "86" / Item Availability toggle: Instantly mark out-of-stock ingredients or dishes to remove them from customer view.
  - "Kitchen Busy / Pause Orders" emergency toggle: Temporarily adds buffer time or suspends new orders during extreme kitchen surges.
- **Thermal Printer & Hardware Integration:**
  - Direct integration options for ESC/POS thermal receipt printers (Bluetooth, USB, or Network/Ethernet) to print kitchen tickets and customer receipts automatically upon order acceptance.

---

## 3. Technology Stack & Architectural Considerations (Subject to Research Phase)

- **Frontend Framework Candidates:** Next.js (App Router), React + Vite (PWA), or Vue / Nuxt.
- **Backend / Real-Time Layer Candidates:**
  - Firebase (Firestore Realtime listeners, Firebase Auth, Cloud Functions)
  - Supabase (PostgreSQL with real-time subscriptions, Row-Level Security, Edge Functions)
  - Node.js / Fastify / Express with WebSockets
- **Payment Infrastructure:** Stripe Connect (or standard Stripe Checkout / Elements) to cleanly handle platform fees and direct payout splits.
- **Printing Engine:** Web Print API / ESC/POS over Bluetooth / Cloud Print microservice for receipt printers (e.g. Epson TM-T20 / Sunmi Android POS terminals).

---

## 4. Immediate Next Steps & Research Phase

1. **Deep Research Formulation:** Formulate a comprehensive research brief for Gemini Deep Research covering:
   - Modern architecture patterns for independent multi-tenant / white-label restaurant ordering apps.
   - Hardware receipt printing integrations in modern web apps and PWAs.
   - Low-latency real-time synchronization between customer ordering and kitchen tablets.
   - Stripe fee splitting models (Stripe Connect Direct vs Destination charges for 5% platform margin).
   - Regulatory requirements for food allergen disclosures (Natasha's Law in the UK) and VAT compliance.
2. **Technical Scaffolding:** Establish repository foundation, schemas, and UI design mockups.
