import { OrderItem, MenuItem } from '../types/domain';
import { GOLDEN_RICE_BOWL_MENU } from '../data/goldenRiceBowlMenu';

export interface SmartUpsellItem {
  dish: MenuItem;
  reason: string;
  badgeText: string;
}

// Categories considered "Wet / Saucy Mains" that typically require rice or chips
const SAUCY_MAIN_CATEGORIES = new Set([
  'Curry Dishes',
  'Sweet & Sour Dishes',
  'Chop Suey Dishes',
  'King Prawn Dishes',
  'Beef Dishes',
  'Chicken Dishes',
  'Pork Dishes',
]);

// Categories or dish codes considered "Carb Bases"
const CARB_DISH_CODES = new Set([
  '17', // Egg Fried Rice
  '18', // Plain Boiled Rice
  '8',  // House Special Mixed Rice
  '9',  // Special Fried Rice
  '10', // Singapore Fried Rice
  '11', // King Prawn Fried Rice
  '12', // Chicken Fried Rice
  '14', // Roast Duck with Rice
  '15', // Barbecued Pork with Rice
  '16', // Roast Duck & Char Siu Rice
  '22', // House Special Chow Mein
  '23', // King Prawn Chow Mein
  '25', // Special Chow Mein
  '27', // Beef Chow Mein
  '31', // Singapore Chow Mein
  'G31',// Singapore Vermicelli
  '33', // Chicken Chow Mein
  '34', // Plain Chow Mein
  '150',// Chips
  'T3', // Salt & Pepper Chips
]);

// Categories considered "Starters / Appetisers"
const STARTER_CATEGORIES = new Set(['Starters', 'Soup']);

// Quick dish lookup map by dishCode
const MENU_BY_CODE = new Map<string, MenuItem>();
for (const dish of GOLDEN_RICE_BOWL_MENU) {
  MENU_BY_CODE.set(dish.dishCode, dish);
}

/**
 * Evaluates the current cart and returns 1 to 2 tailored, high-converting upsell suggestions.
 * Executes deterministically in <1ms without any external network latency.
 */
export function getSmartUpsellSuggestions(
  cart: OrderItem[],
  declaredAllergies: string[] = [],
  hasAllergiesDeclared: boolean = false
): SmartUpsellItem[] {
  if (!cart || cart.length === 0) return [];

  const cartCodes = new Set(cart.map((i) => i.dishCode));
  const totalCartQty = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotalPence = cart.reduce((sum, i) => sum + i.lineTotalPence, 0);

  // Check if entire basket is currently vegetarian
  const isEntireCartVeg = cart.every((cartItem) => {
    const dish = MENU_BY_CODE.get(cartItem.dishCode);
    return dish?.isVegetarian === true;
  });

  // Check if cart contains shellfish/prawns or if crustacean allergy was mentioned
  const normalizedAllergies = declaredAllergies.map((a) => a.toLowerCase());
  const hasShellfishWarning =
    normalizedAllergies.some((a) => a.includes('crustacean') || a.includes('shellfish') || a.includes('prawn') || a.includes('seafood')) ||
    (hasAllergiesDeclared && !cart.some((ci) => {
      const d = MENU_BY_CODE.get(ci.dishCode);
      return d?.allergens.includes('CRUSTACEANS');
    }));

  const hasNutWarning = normalizedAllergies.some((a) => a.includes('peanut') || a.includes('nut'));

  // Calculate culinary balance
  let saucyMainsCount = 0;
  let carbCount = 0;
  let startersCount = 0;
  let hasSauceTub = false;
  let hasDryNoodlesOrFriedRice = false;

  for (const item of cart) {
    const dish = MENU_BY_CODE.get(item.dishCode);
    if (!dish) continue;

    // Check saucy mains
    if (SAUCY_MAIN_CATEGORIES.has(dish.category) && dish.dishCode !== '91') {
      saucyMainsCount += item.quantity;
    }

    // Check carbs
    if (CARB_DISH_CODES.has(dish.dishCode) || dish.category === 'Rice Dishes' || dish.category === 'Chow Mein & Noodles') {
      carbCount += item.quantity;
    }

    // Check starters
    if (STARTER_CATEGORIES.has(dish.category)) {
      startersCount += item.quantity;
    }

    // Check sauces
    if (dish.dishCode === '57' || dish.name.toLowerCase().includes('sauce tub')) {
      hasSauceTub = true;
    }

    // Check dry noodles / rice that benefit from curry sauce
    if (['25', '27', '33', '34', '9', '12', '17', '150', 'T3', 'G31'].includes(dish.dishCode)) {
      hasDryNoodlesOrFriedRice = true;
    }
  }

  const suggestions: SmartUpsellItem[] = [];

  // ----------------------------------------------------
  // RULE 1: The "Curry Without Rice" Detector (High Priority)
  // If saucy mains outweigh carbs, customer almost certainly forgot a side!
  // ----------------------------------------------------
  if (saucyMainsCount > carbCount) {
    // Prefer Egg Fried Rice (#17)
    const eggFriedRice = MENU_BY_CODE.get('17');
    if (eggFriedRice && !cartCodes.has('17')) {
      suggestions.push({
        dish: eggFriedRice,
        reason: 'Missing a side for your curry or wok main?',
        badgeText: 'Classic Pairing',
      });
    } else {
      // Or Chips (#150)
      const chips = MENU_BY_CODE.get('150');
      if (chips && !cartCodes.has('150')) {
        suggestions.push({
          dish: chips,
          reason: 'Add a side of hot chips for your saucy main',
          badgeText: 'Popular Side',
        });
      }
    }
  }

  // ----------------------------------------------------
  // RULE 2: The Table Sharer / Starter Gap
  // If order > £14 and 0 starters are selected
  // ----------------------------------------------------
  if (startersCount === 0 && cartSubtotalPence >= 1200) {
    if (isEntireCartVeg) {
      // Strictly vegetarian starter
      const miniVegRolls = MENU_BY_CODE.get('G148');
      if (miniVegRolls && !cartCodes.has('G148')) {
        suggestions.push({
          dish: miniVegRolls,
          reason: 'Crispy table appetisers to start your meal',
          badgeText: '100% Vegetarian',
        });
      }
    } else if (!hasShellfishWarning) {
      // Classic Prawn Crackers (#149)
      const prawnCrackers = MENU_BY_CODE.get('149');
      if (prawnCrackers && !cartCodes.has('149')) {
        suggestions.push({
          dish: prawnCrackers,
          reason: 'Crispy prawn crackers to share while you wait',
          badgeText: 'Takeaway Essential',
        });
      }
    } else {
      // Non-shellfish starter (e.g. Peking Ribs or Seaweed)
      const seaweed = MENU_BY_CODE.get('3');
      if (seaweed && !cartCodes.has('3')) {
        suggestions.push({
          dish: seaweed,
          reason: 'Crispy seaweed table appetiser',
          badgeText: 'Popular Starter',
        });
      }
    }
  }

  // ----------------------------------------------------
  // RULE 3: The Chow Mein / Fried Rice Sauce Pour-Over
  // Dry noodles/rice with no sauce tub
  // ----------------------------------------------------
  if (hasDryNoodlesOrFriedRice && !hasSauceTub && suggestions.length < 2) {
    const currySauce = MENU_BY_CODE.get('57');
    if (currySauce && !cartCodes.has('57')) {
      suggestions.push({
        dish: currySauce,
        reason: 'Warm rich curry sauce to pour over noodles or rice',
        badgeText: 'Customer Favourite',
      });
    }
  }

  // ----------------------------------------------------
  // RULE 4: Single-person meal rounder
  // If only 1 main is ordered, offer a starter or crackers
  // ----------------------------------------------------
  if (suggestions.length < 2 && totalCartQty === 1 && !isEntireCartVeg && !hasShellfishWarning) {
    const prawnCrackers = MENU_BY_CODE.get('149');
    if (prawnCrackers && !cartCodes.has('149')) {
      suggestions.push({
        dish: prawnCrackers,
        reason: 'Crispy bag of fresh prawn crackers',
        badgeText: 'Great Extra',
      });
    }
  }

  // ----------------------------------------------------
  // Filter out any allergens or invalid items
  // ----------------------------------------------------
  return suggestions
    .filter((s) => {
      // Never suggest an item already in the cart
      if (cartCodes.has(s.dish.dishCode)) return false;
      // Never suggest meat/crustaceans to vegetarian basket
      if (isEntireCartVeg && !s.dish.isVegetarian) return false;
      // Never suggest nuts if nut warning
      if (hasNutWarning && s.dish.containsNuts) return false;
      // Never suggest crustaceans if shellfish warning
      if (hasShellfishWarning && s.dish.allergens.includes('CRUSTACEANS')) return false;
      return true;
    })
    .slice(0, 2); // Cap strictly at top 2 to avoid clutter
}
