export type UkAllergenCode =
  | 'CELERY'
  | 'GLUTEN'
  | 'CRUSTACEANS'
  | 'EGGS'
  | 'FISH'
  | 'LUPIN'
  | 'MILK'
  | 'MOLLUSCS'
  | 'MUSTARD'
  | 'NUTS'
  | 'PEANUTS'
  | 'SESAME'
  | 'SOYA'
  | 'SULPHITES';

export type UkVatRateType = 'STANDARD_20' | 'ZERO_0' | 'OUTSIDE_SCOPE';

export type OrderStatus =
  | 'AWAITING_PAYMENT'
  | 'RECEIVED'              // Paid; alert chime loops on kitchen terminal
  | 'AWAITING_CUSTOMER_APPROVAL' // Surge ETA (>45m) offered; 90s customer confirmation window
  | 'CONFIRMED'             // Kitchen accepted with ETA (+15m, +25m, +40m, +60m, etc.)
  | 'COOKING'               // In prep at wok station
  | 'READY_FOR_COLLECTION'  // Bagged and waiting at counter
  | 'OUT_FOR_DELIVERY'      // Driver scanned receipt QR code
  | 'COMPLETED'             // Handed to customer
  | 'CANCELLED';

export type KitchenThrottleMode = 'NORMAL' | 'BUSY_PLUS_20M' | 'PAUSED';

export interface DayShift {
  isOpen: boolean;
  isSplitShift?: boolean;
  openTime1?: string;  // e.g. "12:00"
  closeTime1?: string; // e.g. "14:30"
  openTime2?: string;  // e.g. "17:00"
  closeTime2?: string; // e.g. "23:00"
}

export interface WeeklySchedule {
  monday: DayShift;
  tuesday: DayShift;
  wednesday: DayShift;
  thursday: DayShift;
  friday: DayShift;
  saturday: DayShift;
  sunday: DayShift;
}

export interface RestaurantSettings {
  id: string;
  name: string;
  schedule: WeeklySchedule;
  autoOpenMode: boolean; // true = auto-open based on schedule; false = manual control only
  manualIsOpen: boolean; // manual toggle
  emergencyNotice?: string;
  phoneLandline: string;
  baseCollectionEtaMinutes: number;
  baseDeliveryEtaMinutes: number;
}

export interface DeliveryZoneTier {
  id: string;
  name: string;
  maxRadiusMiles: number;
  deliveryFeePence: number;
  minOrderValuePence: number;
  disableDuringBusyMode: boolean;
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  customDomain: string;
  tagline: string;
  phoneLandline: string;
  address: {
    line1: string;
    area: string;
    town: string;
    county: string;
    postcode: string;
    latitude: number;
    longitude: number;
  };
  openingHours: {
    days: string;
    hours: string;
    closedDays: string[];
  };
  branding: {
    primaryColor: string;
    accentColor: string;
    logoUrl?: string;
  };
  fhrsRating: {
    score: number;
    badgeUrl: string;
  };
  operations: {
    throttleMode: KitchenThrottleMode;
    baseCollectionEtaMinutes: number;
    baseDeliveryEtaMinutes: number;
    deliveryZones: DeliveryZoneTier[];
  };
}

export interface ModifierOption {
  id: string;
  name: string;
  chineseName?: string;
  priceDeltaPence: number;
  allergens: UkAllergenCode[];
  isSoldOutToday?: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelections: number; // 0 = optional, 1 = required
  maxSelections: number; // 1 = single choice, >1 = multi-select
  options: ModifierOption[];
}

export interface MenuItem {
  id: string;
  dishCode: string;          // e.g. "42", "G3", "T1", "Z1"
  name: string;              // e.g. "Crispy Shredded Beef with Chilli"
  chineseName?: string;      // e.g. "干牛丝"
  description?: string;
  category: string;
  basePricePence: number;    // In GBP pence, e.g. 810 = £8.10
  largePricePence?: number;  // For items with Regular / Large sizes
  imageUrl?: string;
  spicyLevel?: 0 | 1 | 2 | 3;
  containsNuts?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  allergens: UkAllergenCode[];
  modifierGroups?: ModifierGroup[];
  isSoldOutToday?: boolean;
}

export interface OrderItemModifierSelection {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDeltaPence: number;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  dishCode: string;
  name: string;
  chineseName?: string;
  quantity: number;
  size?: 'REGULAR' | 'LARGE';
  unitPricePence: number;
  modifiers: OrderItemModifierSelection[];
  lineTotalPence: number;
  allergens: UkAllergenCode[];
  specialInstructions?: string;
}

export interface Order {
  id: string;
  tenantId: string;
  displayNumber: string; // e.g. "#104"
  status: OrderStatus;
  fulfillmentType: 'DELIVERY' | 'COLLECTION';
  customer: {
    name: string;
    phone: string;
    email: string;
    deliveryAddress?: {
      line1: string;
      line2?: string;
      town: string;
      postcode: string;
      driverNotes?: string;
    };
  };
  allergyDeclaration?: {
    hasAllergies: boolean;
    allergens: UkAllergenCode[];
    notes?: string;
  };
  items: OrderItem[];
  subtotalPence: number;
  deliveryFeePence: number;
  tipPence: number;
  totalPence: number;
  estimatedReadyAt?: string; // ISO string
  surgeEtaMinutes?: number;
  surgeRequestedAt?: string;
  surgeExpiresAt?: string;
  createdAt: string;
  driverDispatchToken?: string;
}
