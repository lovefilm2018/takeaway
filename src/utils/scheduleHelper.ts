import { RestaurantSettings, WeeklySchedule, DayShift } from '../types/domain';

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  monday: {
    isOpen: true,
    isSplitShift: false,
    openTime1: '17:00',
    closeTime1: '23:00',
  },
  tuesday: {
    isOpen: false, // Traditional UK Chinese takeaway closed day
    isSplitShift: false,
    openTime1: '17:00',
    closeTime1: '23:00',
  },
  wednesday: {
    isOpen: true,
    isSplitShift: false,
    openTime1: '17:00',
    closeTime1: '23:00',
  },
  thursday: {
    isOpen: true,
    isSplitShift: false,
    openTime1: '17:00',
    closeTime1: '23:00',
  },
  friday: {
    isOpen: true,
    isSplitShift: true, // Split shift: Lunch + Evening
    openTime1: '12:00',
    closeTime1: '14:30',
    openTime2: '17:00',
    closeTime2: '23:30',
  },
  saturday: {
    isOpen: true,
    isSplitShift: true, // Split shift: Lunch + Evening
    openTime1: '12:00',
    closeTime1: '14:30',
    openTime2: '17:00',
    closeTime2: '23:30',
  },
  sunday: {
    isOpen: true,
    isSplitShift: false,
    openTime1: '17:00',
    closeTime1: '23:00',
  },
};

export const DEFAULT_RESTAURANT_SETTINGS: RestaurantSettings = {
  id: 'golden-rice-bowl-001',
  name: 'The Golden Rice Bowl',
  schedule: DEFAULT_WEEKLY_SCHEDULE,
  autoOpenMode: true, // Default to auto-open by schedule
  manualIsOpen: true, // When in manual mode, default open
  emergencyNotice: '',
  phoneLandline: '01435 862342',
  baseCollectionEtaMinutes: 20,
  baseDeliveryEtaMinutes: 40,
};

const DAY_KEYS: (keyof WeeklySchedule)[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export interface StoreStatusResult {
  isOpen: boolean;
  reason: string;
  nextOpeningText: string;
  isAutoMode: boolean;
  manualOverrideActive: boolean;
}

export function evaluateStoreStatus(
  settings: RestaurantSettings = DEFAULT_RESTAURANT_SETTINGS,
  date = new Date()
): StoreStatusResult {
  const isAutoMode = settings.autoOpenMode !== false;

  // 1. If manual mode: strict staff toggle controls everything
  if (!isAutoMode) {
    return {
      isOpen: settings.manualIsOpen,
      reason: settings.manualIsOpen 
        ? 'Open (Manual Control Enabled)' 
        : 'Closed (Staff Manual Switch is OFF)',
      nextOpeningText: settings.manualIsOpen ? 'Now Open' : 'Staff have temporarily closed the store',
      isAutoMode: false,
      manualOverrideActive: false,
    };
  }

  // 2. In Auto Mode: staff can still force-close for early closures or emergencies
  if (settings.manualIsOpen === false) {
    return {
      isOpen: false,
      reason: settings.emergencyNotice || 'Closed Early (Staff Manual Override)',
      nextOpeningText: 'Staff closed the store early today',
      isAutoMode: true,
      manualOverrideActive: true,
    };
  }

  // 3. Auto Mode evaluation based on weekly schedule
  const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const currentKey = DAY_KEYS[dayIndex];
  const shift = settings.schedule[currentKey];

  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  if (!shift || !shift.isOpen) {
    const nextText = findNextOpening(settings.schedule, dayIndex, currentMinutes);
    return {
      isOpen: false,
      reason: `Closed on ${DAY_NAMES[dayIndex]}s`,
      nextOpeningText: nextText,
      isAutoMode: true,
      manualOverrideActive: false,
    };
  }

  // Check Shift 1
  const s1Open = shift.openTime1 ? timeToMinutes(shift.openTime1) : 0;
  const s1Close = shift.closeTime1 ? timeToMinutes(shift.closeTime1) : 0;
  const inShift1 = currentMinutes >= s1Open && currentMinutes < s1Close;

  // Check Shift 2 if split
  let inShift2 = false;
  if (shift.isSplitShift && shift.openTime2 && shift.closeTime2) {
    const s2Open = timeToMinutes(shift.openTime2);
    const s2Close = timeToMinutes(shift.closeTime2);
    inShift2 = currentMinutes >= s2Open && currentMinutes < s2Close;
  }

  if (inShift1 || inShift2) {
    return {
      isOpen: true,
      reason: 'Open for orders according to schedule',
      nextOpeningText: 'Open now',
      isAutoMode: true,
      manualOverrideActive: false,
    };
  }

  const nextText = findNextOpening(settings.schedule, dayIndex, currentMinutes);
  return {
    isOpen: false,
    reason: 'Currently outside scheduled ordering hours',
    nextOpeningText: nextText,
    isAutoMode: true,
    manualOverrideActive: false,
  };
}

function findNextOpening(schedule: WeeklySchedule, currentDayIdx: number, currentMinutes: number): string {
  // Check if opening later today
  const todayKey = DAY_KEYS[currentDayIdx];
  const todayShift = schedule[todayKey];
  if (todayShift?.isOpen) {
    const s1Open = todayShift.openTime1 ? timeToMinutes(todayShift.openTime1) : 0;
    if (currentMinutes < s1Open) {
      return `Opens today at ${todayShift.openTime1}`;
    }
    if (todayShift.isSplitShift && todayShift.openTime2) {
      const s2Open = timeToMinutes(todayShift.openTime2);
      if (currentMinutes < s2Open) {
        return `Opens today at ${todayShift.openTime2} (Evening)`;
      }
    }
  }

  // Search upcoming days (up to 7 days)
  for (let offset = 1; offset <= 7; offset++) {
    const nextIdx = (currentDayIdx + offset) % 7;
    const nextKey = DAY_KEYS[nextIdx];
    const nextShift = schedule[nextKey];
    if (nextShift?.isOpen) {
      const openTime = nextShift.openTime1 || (nextShift.isSplitShift ? nextShift.openTime2 : '17:00');
      const dayWord = offset === 1 ? 'tomorrow' : `on ${DAY_NAMES[nextIdx]}`;
      return `Opens ${dayWord} at ${openTime}`;
    }
  }

  return 'Check opening schedule';
}
