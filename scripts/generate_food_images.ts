/**
 * Pollinations AI Food Photography Generator for The Golden Rice Bowl
 * Uses Pollinations Flux model to generate photorealistic British Chinese takeaway food photos.
 */

import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      process.env[k.trim()] = v.join('=').trim();
    }
  }
}

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'images', 'dishes');

export interface DishPrompt {
  code: string;
  name: string;
  category: string;
  prompt: string;
}

export const DISH_PROMPTS: DishPrompt[] = [
  // Starters
  {
    code: '1',
    name: "House Mixed Hors D'oeuvres (For Two)",
    category: 'Starters',
    prompt: 'Platter of British Chinese takeaway hors doeuvres, prawn toast, barbecue spare ribs, crispy fried seaweed, mini spring rolls and crispy wontons, appetizing food photography, warm lighting',
  },
  {
    code: '2',
    name: 'Sesame Prawns on Toast',
    category: 'Starters',
    prompt: 'Crispy golden Chinese sesame prawn toast triangles with sweet chilli dip, authentic UK Chinese takeaway starter, professional food photography',
  },
  {
    code: '3',
    name: 'Crispy Seaweed',
    category: 'Starters',
    prompt: 'Crispy fried shredded Chinese seaweed topped with grated savoury fish seasoning powder, authentic British Chinese takeaway, food photography',
  },
  {
    code: 'G2',
    name: 'Salt & Pepper King Prawns',
    category: 'Starters',
    prompt: 'Crispy wok fried salt and pepper king prawns with finely sliced red chillies, spring onions and garlic, Chinese takeaway, appetizing food photography',
  },
  {
    code: 'G4',
    name: 'Peking Style Ribs',
    category: 'Starters',
    prompt: 'Glazed sticky barbecue spare ribs in rich red sweet Peking barbecue sauce with sesame seeds, UK Chinese takeaway, macro food photography',
  },
  {
    code: 'G5',
    name: 'Salt & Pepper Spare Ribs',
    category: 'Starters',
    prompt: 'Crispy salt and pepper pork spare ribs tossed with fresh chilli rings, crushed garlic, and spring onion, authentic Chinese takeaway, food photography',
  },
  {
    code: 'G6',
    name: 'Chicken Satay on Skewers',
    category: 'Starters',
    prompt: 'Grilled chicken skewers smothered in thick peanut satay sauce with chopped spring onions, authentic UK takeaway food photography',
  },
  {
    code: 'G91',
    name: 'Crispy Duck Pancake Rolls',
    category: 'Starters',
    prompt: 'Crispy golden fried duck spring rolls served with rich hoi sin dipping sauce, fresh cucumber batons, Chinese takeaway food photography',
  },
  {
    code: 'T1',
    name: 'Salt & Pepper Chicken',
    category: 'Starters',
    prompt: 'Golden crispy shredded salt and pepper chicken bites with diced fresh chillies, white onions and spring onions, UK Chinese takeaway food photography',
  },
  {
    code: 'T2',
    name: 'Salt & Pepper Squid',
    category: 'Starters',
    prompt: 'Crispy deep fried salt and pepper squid rings and tentacles tossed with diced fresh chillies, garlic, and scallions, food photography',
  },
  {
    code: 'T3',
    name: 'Salt & Pepper Chips',
    category: 'Starters',
    prompt: 'British Chinese takeaway salt and pepper chips tossed in a wok with onions, red peppers, garlic and fresh sliced chillies, food photography',
  },
  {
    code: 'T10',
    name: 'Pan Fried Dumplings',
    category: 'Starters',
    prompt: 'Golden crispy-bottomed Chinese pan fried dumplings potstickers with savoury meat filling and ginger soy dipping sauce, food photography',
  },

  // Soups
  {
    code: '4',
    name: 'Wun Tun Soup',
    category: 'Soup',
    prompt: 'Steaming clear Chinese wonton soup bowl with plump wonton dumplings, sliced spring onions and tender greens, authentic food photography',
  },
  {
    code: '6',
    name: 'Chicken & Sweet Corn Soup',
    category: 'Soup',
    prompt: 'Silky Chinese sweetcorn soup with shredded chicken breast and delicate egg flower ribbons in a ceramic bowl, food photography',
  },
  {
    code: 'G7',
    name: 'Peking Hot & Sour Soup',
    category: 'Soup',
    prompt: 'Authentic Peking hot and sour soup with shredded bamboo shoots, wood ear mushrooms, tofu strips and chilli oil drops, food photography',
  },

  // Rice Dishes
  {
    code: '8',
    name: 'House Special Mixed Rice',
    category: 'Rice Dishes',
    prompt: 'House special Chinese mixed rice topped with slices of roast char siu pork, succulent chicken breast, king prawns and rich savoury gravy, food photography',
  },
  {
    code: '9',
    name: 'Special Fried Rice',
    category: 'Rice Dishes',
    prompt: 'Authentic British Chinese special fried rice wok tossed with diced char siu pork, small prawns, green peas and egg, food photography',
  },
  {
    code: '10',
    name: 'Singapore Fried Rice',
    category: 'Rice Dishes',
    prompt: 'Spicy yellow Singapore fried rice tossed with curry spices, prawns, shredded roast pork, egg and fresh chilli peppers, food photography',
  },
  {
    code: '11',
    name: 'King Prawn Fried Rice',
    category: 'Rice Dishes',
    prompt: 'Fluffy egg fried rice wok fried with plump juicy pink king prawns, sweet green peas and spring onions, food photography',
  },
  {
    code: '12',
    name: 'Chicken Fried Rice',
    category: 'Rice Dishes',
    prompt: 'Fragrant golden egg fried rice tossed with tender shredded chicken pieces and scallions, classic UK Chinese takeaway, food photography',
  },
  {
    code: '16',
    name: 'Roast Duck & Barbecued Pork with Rice',
    category: 'Rice Dishes',
    prompt: 'Cantonese roast combo plate of crispy skin roast duck and glossy red barbecued char siu pork over jasmine rice with bok choy and sweet soy sauce, food photography',
  },
  {
    code: '17',
    name: 'Egg Fried Rice',
    category: 'Rice Dishes',
    prompt: 'Classic golden egg fried rice with glistening grains, scrambled egg ribbons and fresh green spring onions, UK takeaway food photography',
  },

  // Chow Mein & Noodles
  {
    code: '22',
    name: 'House Special Chow Mein',
    category: 'Chow Mein & Noodles',
    prompt: 'House special chow mein noodles topped with mixed king prawns, chicken, roast pork and stir fried Chinese vegetables in rich savoury brown sauce, food photography',
  },
  {
    code: '23',
    name: 'King Prawn Chow Mein',
    category: 'Chow Mein & Noodles',
    prompt: 'Wok tossed egg noodles with plump king prawns, crunchy bean sprouts, spring onions and dark soy sauce, British Chinese takeaway food photography',
  },
  {
    code: '25',
    name: 'Special Chow Mein',
    category: 'Chow Mein & Noodles',
    prompt: 'Special chow mein egg noodles stir fried with sliced char siu pork, chicken, shrimp, beansprouts and scallions, food photography',
  },
  {
    code: '27',
    name: 'Beef Chow Mein',
    category: 'Chow Mein & Noodles',
    prompt: 'Wok fried chow mein noodles with tender marinated sliced beef, bean sprouts, sliced onions and dark savoury soy sauce, food photography',
  },
  {
    code: 'G31',
    name: 'Singapore Vermicelli Noodles',
    category: 'Chow Mein & Noodles',
    prompt: 'Spicy Singapore rice vermicelli noodles tossed in fragrant yellow madras curry powder with shrimp, shredded pork, egg, peppers and sesame seeds, food photography',
  },
  {
    code: '33',
    name: 'Chicken Chow Mein',
    category: 'Chow Mein & Noodles',
    prompt: 'Classic UK takeaway chicken chow mein with soft yellow noodles, tender chicken strips, beansprouts and spring onions in savoury soy sauce, food photography',
  },
  {
    code: '34',
    name: 'Plain Chow Mein',
    category: 'Chow Mein & Noodles',
    prompt: 'Stir fried egg noodles with crunchy beansprouts, sliced white onions and spring onions in light and dark soy sauce, food photography',
  },

  // Sweet & Sour
  {
    code: '36',
    name: 'Sweet & Sour Pork Balls',
    category: 'Sweet & Sour Dishes',
    prompt: 'Twelve crispy golden battered pork balls served with a tub of glowing red translucent sweet and sour sauce, UK Chinese takeaway food photography',
  },
  {
    code: '37',
    name: 'Sweet & Sour Chicken Balls',
    category: 'Sweet & Sour Dishes',
    prompt: 'Crispy round Chinese battered chicken balls with bright red sweet and sour dipping sauce, authentic UK Chinese takeaway, food photography',
  },
  {
    code: '40',
    name: 'Sweet & Sour Pork (Peking Style)',
    category: 'Sweet & Sour Dishes',
    prompt: 'Crispy battered pork pieces wok tossed in tangy Cantonese sweet and sour sauce with pineapple chunks, bell peppers and onions, food photography',
  },
  {
    code: '42',
    name: 'Sweet & Sour Chicken (Peking Style)',
    category: 'Sweet & Sour Dishes',
    prompt: 'Cantonese sweet and sour chicken Hong Kong style with glossy tangy sauce, pineapple pieces, green peppers and red onions, food photography',
  },

  // Curry Dishes
  {
    code: '48',
    name: 'Special Curry',
    category: 'Curry Dishes',
    prompt: 'British Chinese takeaway special mixed curry with chicken, beef, king prawns, sliced onions and peas in fragrant golden Chinese takeaway curry sauce, food photography',
  },
  {
    code: '49',
    name: 'King Prawn Curry',
    category: 'Curry Dishes',
    prompt: 'Succulent king prawns simmered in warm golden Chinese takeaway curry sauce with chunky white onions and green peas, food photography',
  },
  {
    code: '50',
    name: 'Chicken Curry',
    category: 'Curry Dishes',
    prompt: 'Classic British Chinese chicken curry with sliced chicken breast, chunky onions, peas, rich fragrant yellow-brown curry sauce, food photography',
  },
  {
    code: '52',
    name: 'Beef Curry',
    category: 'Curry Dishes',
    prompt: 'Tender sliced beef simmered in authentic Chinese takeaway golden curry gravy with sweet onions and peas, appetizing food photography',
  },

  // Duck Dishes
  {
    code: '91',
    name: 'Crispy Aromatic Duck',
    category: 'Duck Dishes',
    prompt: 'Crispy shredded aromatic duck on Chinese platter with steamed pancakes, cucumber, and hoi sin sauce, high quality food photography',
  },
  {
    code: '84',
    name: 'Duck with Mushrooms',
    category: 'Duck Dishes',
    prompt: 'Sliced roasted duck breast stir fried with button mushrooms and Chinese greens in rich savoury oyster gravy, food photography',
  },
  {
    code: 'G85',
    name: 'Duck with Mushrooms in Black Bean Sauce',
    category: 'Duck Dishes',
    prompt: 'Tender roast duck breast stir fried with mushrooms, green peppers and garlic in glossy pungent black bean sauce, food photography',
  },

  // Beef Dishes
  {
    code: '106',
    name: 'Crispy Shredded Chilli Beef',
    category: 'Beef Dishes',
    prompt: 'Crispy shredded beef in sweet and spicy chilli sauce with red peppers and carrot strips, in a sleek food container, authentic British Chinese takeaway, food photography',
  },
  {
    code: '93',
    name: 'Beef with Mushrooms in Black Bean Sauce',
    category: 'Beef Dishes',
    prompt: 'Tender sliced beef tossed in sizzling black bean and garlic sauce with mushrooms, green bell peppers and onions, food photography',
  },
  {
    code: '98',
    name: 'Beef with Ginger & Spring Onions',
    category: 'Beef Dishes',
    prompt: 'Thinly sliced flank steak wok fried with fresh aromatic ginger matchsticks and charred spring onions in light savoury sauce, food photography',
  },
  {
    code: '100',
    name: 'Beef in Satay Sauce',
    category: 'Beef Dishes',
    prompt: 'Tender marinated beef strips in rich nutty Indonesian satay peanut sauce with stir fried onions and peppers, food photography',
  },

  // Chicken Dishes
  {
    code: '108',
    name: 'Chicken with Mushrooms in Black Bean Sauce',
    category: 'Chicken Dishes',
    prompt: 'Sliced chicken breast stir fried with button mushrooms, green peppers and onions in dark savory Chinese fermented black bean sauce, food photography',
  },
  {
    code: '114',
    name: 'Lemon Chicken',
    category: 'Chicken Dishes',
    prompt: 'Crispy golden battered chicken breast cut into tender slices and drizzled with glossy bright yellow translucent lemon sauce, lemon slice garnish, food photography',
  },
  {
    code: '115',
    name: 'Chicken with Ginger & Spring Onions',
    category: 'Chicken Dishes',
    prompt: 'Tender chicken breast slices wok stir-fried with ginger slices and crisp spring onions in a clear savoury sauce, food photography',
  },
  {
    code: '123',
    name: 'Chicken in Satay Sauce',
    category: 'Chicken Dishes',
    prompt: 'Chicken breast slices in fragrant rich peanut satay sauce with pineapple chunks, onions and peppers, UK Chinese takeaway food photography',
  },

  // Sides & Sauces
  {
    code: '148',
    name: 'Pancake Roll',
    category: 'Sides & Sauces',
    prompt: 'Large golden crispy British Chinese pancake spring roll cut in half showing steaming savoury bean sprout and roast pork filling, food photography',
  },
  {
    code: 'G148',
    name: 'Mini Vegetable Rolls',
    category: 'Sides & Sauces',
    prompt: 'Ten crispy mini vegetarian spring rolls piled on a plate with sweet chilli dipping sauce, food photography',
  },
  {
    code: '149',
    name: 'Prawn Crackers',
    category: 'Sides & Sauces',
    prompt: 'Bag of fresh crispy white and pink Chinese prawn crackers kerupuk, light and airy texture, takeaway food photography',
  },
  {
    code: '150',
    name: 'Chips',
    category: 'Sides & Sauces',
    prompt: 'Golden crispy thick cut Chinese takeaway chips in a takeaway foil carton, steam rising, food photography',
  },
  {
    code: '152',
    name: 'Chips in Curried Sauce',
    category: 'Sides & Sauces',
    prompt: 'Golden hot chips generously smothered in rich thick British Chinese curry sauce, authentic takeaway, food photography',
  },

  // Set Dinners
  {
    code: 'Z1',
    name: 'Value Meal Z1',
    category: 'Value Set Meals (£10.80)',
    prompt: 'Takeaway combo meal with crispy sweet and sour chicken balls, cup of red sauce and fluffy egg fried rice, food photography',
  },
  {
    code: 'B',
    name: 'Set Dinner B (For Two Persons)',
    category: 'Special Set Dinners',
    prompt: 'Feast banquet spread of British Chinese takeaway dishes, sweet and sour chicken balls, beef in black bean, crispy spring rolls and egg fried rice, food photography',
  },

  // Missing Dishes Batch
  {
    code: 'G3',
    name: 'Spiced Smoky Shredded Chicken',
    category: 'Starters',
    prompt: 'Crispy shredded spiced smoked chicken strips with chilli flakes and spring onions, Chinese takeaway, appetizing food photography',
  },
  {
    code: 'T5',
    name: 'Butterfly Prawns (8)',
    category: 'Starters',
    prompt: 'Golden crispy breaded butterfly king prawns on a plate with sweet and sour dip, takeaway food photography',
  },
  {
    code: '5',
    name: 'Crab Meat & Sweet Corn Soup',
    category: 'Soup',
    prompt: 'Bowl of comforting Chinese takeaway crab meat and sweet corn soup with egg ribbons, steaming hot, food photography',
  },
  {
    code: '14',
    name: 'Roast Duck with Rice',
    category: 'Rice Dishes',
    prompt: 'Sliced Chinese roast duck with crispy skin served over steamed jasmine rice with rich soy duck gravy, takeaway food photography',
  },
  {
    code: '15',
    name: 'Barbecued Pork with Rice',
    category: 'Rice Dishes',
    prompt: 'Chinese char siu roast barbecued pork slices served over white steamed rice with green pak choi, takeaway food photography',
  },
  {
    code: '18',
    name: 'Plain Boiled Rice',
    category: 'Rice Dishes',
    prompt: 'Bowl of fluffy steaming plain white jasmine boiled rice, Chinese takeaway side, clean food photography',
  },
  {
    code: '31',
    name: 'Singapore Chow Mein',
    category: 'Chow Mein & Noodles',
    prompt: 'Spicy wok fried Singapore chow mein noodles with thin rice vermicelli noodles, chicken, char siu pork, prawns, egg and curry spices, takeaway food photography',
  },
  {
    code: 'G37',
    name: 'Sweet & Sour Mixed Balls',
    category: 'Sweet & Sour Dishes',
    prompt: 'Crispy battered golden sweet and sour mixed balls of king prawn and chicken in a takeaway container with bright sweet and sour sauce dip, food photography',
  },
  {
    code: '47',
    name: 'Duck Curry',
    category: 'Curry Dishes',
    prompt: 'British Chinese takeaway duck curry in a rich yellow curry sauce with sliced onions, peas and mushrooms, food photography',
  },
  {
    code: '57',
    name: 'Curry Sauce Tub',
    category: 'Curry Dishes',
    prompt: 'Plastic takeaway tub of steaming hot thick British Chinese chip shop curry sauce, smooth golden sauce, food photography',
  },
  {
    code: 'Z3',
    name: 'Value Meal Z3',
    category: 'Value Set Meals (£10.80)',
    prompt: 'Takeaway combo meal box with sweet and sour pork balls, egg fried rice and prawn crackers, food photography',
  },
  {
    code: 'Z4',
    name: 'Value Meal Z4',
    category: 'Value Set Meals (£10.80)',
    prompt: 'Chinese takeaway set combo with beef in black bean sauce and egg fried rice in split container, food photography',
  },
  {
    code: 'Z6',
    name: 'Value Meal Z6',
    category: 'Value Set Meals (£10.80)',
    prompt: 'Chinese takeaway single combo meal with chicken in oyster sauce and soft chow mein noodles, food photography',
  },
  {
    code: 'A',
    name: 'Set Dinner A (For One Person)',
    category: 'Special Set Dinners',
    prompt: 'Single person British Chinese feast with sweet and sour chicken, beef with mushrooms, crispy spring roll and egg fried rice, food photography',
  },
  {
    code: 'C',
    name: 'Set Dinner C (For Three Persons)',
    category: 'Special Set Dinners',
    prompt: 'Grand British Chinese family feast for three persons, crispy aromatic duck with pancakes, king prawn curry, sweet and sour pork, beef chow mein and special fried rice, banquet table food photography',
  },
  {
    code: 'D2',
    name: 'Set Dinner D2 (For Four Persons)',
    category: 'Special Set Dinners',
    prompt: 'Magnificent British Chinese takeaway feast for four people, platters of barbecue ribs, crispy duck, chicken in black bean, crispy beef, yeung chow fried rice, food photography',
  },
];

async function generateDishImages() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const apiKey = process.env.POLLINATIONS_API_KEY || '';
  console.log(`Starting image generation for ${DISH_PROMPTS.length} dishes... (API key: ${apiKey ? 'Configured' : 'Missing'})`);

  let generatedCount = 0;
  let skippedCount = 0;

  for (const dish of DISH_PROMPTS) {
    const filename = `${dish.code}.jpg`;
    const destPath = path.join(OUTPUT_DIR, filename);

    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
      console.log(`[Skip] #${dish.code} (${dish.name}) already exists`);
      skippedCount++;
      continue;
    }

    console.log(`[Generating ${generatedCount + 1}] #${dish.code}: ${dish.name}...`);
    const encodedPrompt = encodeURIComponent(dish.prompt);
    const targetUrl = apiKey
      ? `https://gen.pollinations.ai/image/${encodedPrompt}?key=${apiKey}&model=flux&width=800&height=600&nologo=true`
      : `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true`;

    const start = Date.now();
    try {
      const res = await fetch(targetUrl);
      if (!res.ok) {
        console.error(`  ❌ Failed #${dish.code}: HTTP ${res.status}`);
        continue;
      }
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength < 500) {
        console.error(`  ❌ Failed #${dish.code}: response too small (${buffer.byteLength} bytes)`);
        continue;
      }
      fs.writeFileSync(destPath, Buffer.from(buffer));
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  ✓ Saved #${dish.code} -> public/images/dishes/${filename} (${(buffer.byteLength / 1024).toFixed(0)} KB in ${elapsed}s)`);
      generatedCount++;
    } catch (err) {
      console.error(`  ❌ Error generating #${dish.code}:`, err);
    }
  }

  console.log(`\nImage Generation Run Complete! Generated: ${generatedCount}, Skipped: ${skippedCount}, Total Catalogued: ${DISH_PROMPTS.length}`);
}

generateDishImages();
