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

## 3. Technology Stack & Architectural Baseline (Post-Research Blueprint)

- **Frontend & App Engine:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide icons.
- **Data & Real-Time Sync:**
  - Relational System of Record: PostgreSQL (Cloud SQL / Supabase) with Row-Level Security (`tenant_id`).
  - Active Orders Bus: Firebase Cloud Firestore (`active_orders/{tenant_id}/orders/{order_id}`) for 25–50ms push updates and IndexedDB offline persistence.
- **Hardware & Printing Architecture:**
  - Kitchen Pass: Sunmi NT311 / Star TSP143IV 80mm IP52 greaseproof cloud printer connected via Ethernet/MQTT. Native GB18030 Chinese font support for bilingual wok tickets.
  - Front Counter: Dedicated tablet or Sunmi V2s Plus wrapped in Capacitor.js with screen wake lock and persistent 105dB looping audio chimes.
- **Payment Infrastructure:** Stripe Connect Direct Charges on connected accounts (`application_fee_amount: 5%`, takeaway as legal Merchant of Record).
- **Compliance Engines:**
  - UK Distance Selling Regulations 2014 & Natasha's Law: 14 mandatory EU/UK allergen disclosures and checkout declaration gate.
  - HMRC VAT Notice 709/1 & 701/14: 20% standard rate hot food vs 0% zero rate qualifying cold items.
  - PECR Regulation 22(3): Soft opt-in marketing opt-out checkbox at checkout.
- **AI Culinary Photography:** Pollinations.ai `flux` model pipeline (`scripts/generate_food_images.ts`) with disk-level caching in `public/images/dishes/`.

---

## 4. Implemented Routes & Application Structure

- `/`: Customer-facing mobile-first ordering storefront (The Golden Rice Bowl) with category pill bar, instant dish code search, bottom-sheet side add-ons, smart cart upsell recommendations, live order tracking with prominent kitchen review progress, and closed-store order prevention.
- `/kitchen`: Tablet-optimized Kitchen & Staff Pass Terminal with persistent audio chimes, audio unlock banner, two-tier ETA buttons (15m–40m auto-confirm, 60m–3h peak surge), custom ETA slider/increment modal, 90-second surge customer confirmation handshake, 80mm ESC/POS thermal ticket previewer, and instant "86" out-of-stock toggles.
- `/admin`: Restaurant Management Portal with master store status switch (OPEN/CLOSED), operating mode selector (Auto-Open by schedule vs Manual daily control), 7-day schedule matrix with 1x daily or 2x daily split shift support (Lunch & Evening), custom emergency notice banner, inline dish price editing, photo replacement, and custom dish creator.
- `/api/orders`: Live Cloud Firestore order bus (GET recent orders, POST new orders).
- `/api/orders/[id]`: Single-order polling and state transition patch endpoint (GET status, PATCH status/ETA/surge timers).
- `/api/restaurant`: Live restaurant configuration endpoint (GET/PATCH opening hours, autoOpenMode, manualIsOpen, emergencyNotice, menuOverrides, and customDishes in Cloud Firestore).
- `src/data/goldenRiceBowlMenu.ts`: Complete transcribed takeaway catalog with 71 dishes across all 16 categories with authentic dish codes (`#1` to `#158`, `#Z1`–`#Z10`, Set Dinners `A`–`D3`), prices, and bilingual Chinese names.
- `public/images/dishes/`: 100% photorealistic image coverage (71 of 71 dishes) generated via Pollinations Flux AI model.

---

## 5. Live Production Infrastructure & Current Build Status

- **GCP Project:** `takeaway-platform-prod` (Project Number: `751524926590`, Region: `europe-west2` London)
- **Billing Tier:** Blaze Plan
- **Production URL:** `https://takeaway-751524926590.europe-west2.run.app`
- **Kitchen Portal URL:** `https://takeaway-751524926590.europe-west2.run.app/kitchen`
- **Restaurant Admin URL:** `https://takeaway-751524926590.europe-west2.run.app/admin`
- **Active Container Revision:** `takeaway-00006-6hh` (serving 100% of traffic)

### Completed Milestones:
1. **Architectural Deep Research:** Master blueprint synthesized from the 40-page Gemini Argon Deep Research report.
2. **Menu Ingestion & 100% Dish Photography:** Transcribed all 16 categories of The Golden Rice Bowl menu catalog. Generated and linked 71 high-definition dish photos covering 100% of the active menu.
3. **Customer Storefront (`/`):** Mobile-first Next.js 15 PWA with sticky category pills, instant dish-code search, bottom-sheet side add-ons, smart cart upsell recommendations, and Natasha's Law allergen gate.
4. **Kitchen Tablet Portal (`/kitchen`):** High-contrast tablet UI with looping Web Audio chime, audio unlock banner, two-tier ETA buttons (15m–40m auto-confirm, 60m–3h surge), custom ETA slider/increment modal (15-240m), and 80mm ESC/POS thermal ticket previewer.
5. **Surge ETA Customer Handshake (90s Countdown):** Real-time multi-device sync between customer phone and kitchen tablet. When kitchen sets >45m wait time, customer is prompted with a 90s confirmation modal (`Accept` or `Cancel`, auto-accepting at 0s so customers keep their place in the queue).
6. **Prominent Customer Confirmation Waiting Screen:** Displays bold *"Please wait whilst the restaurant confirms your order and wait time"* status banner with animated spinner while kitchen terminal chimes.
7. **Restaurant Admin Portal (`/admin`):** Complete management portal allowing partner restaurants to set opening hours (single shift or lunch/evening split shifts), auto-open vs manual daily open mode, instant emergency closures, inline dish price editing in £.pp, photo changes, and new dish creation.
8. **Live Firestore Order & Config Bus:** Cross-device sync powered by native Google Cloud Firestore in `europe-west2`.
9. **Containerization & GCP Cloud Run Deployment:** Multi-stage Docker container deployed to Google Cloud Run in `europe-west2` on revision `takeaway-00005-tw6`.

### Next Session Immediate Objectives (Resume Here):
1. **Stripe Connect Direct Charges:** Implement test mode Stripe Elements (Apple Pay, Google Pay, standard card processing) with 5% application fee routed to platform account.
2. **Hardware Printing Pipeline:** Connect Sunmi / Star 80mm ESC/POS cloud printer over WebSocket/MQTT for automated kitchen pass ticket printing upon order acceptance.
3. **Custom Domain Mapping:** Map `orders.goldenricebowl.co.uk` to Cloud Run via Google Cloud DNS.


