/**
 * Pollinations AI Dish Image Generator for Takeaway
 * Generates and caches appetizing dish photos into /public/images/dishes/
 */

import fs from 'fs';
import path from 'path';

// Load .env.local if present
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

const DISHES_TO_GENERATE = [
  {
    code: '106',
    name: 'Crispy Shredded Chilli Beef',
    prompt: 'Crispy shredded beef in sweet and spicy chilli sauce with red peppers and carrot strips, in a sleek black food container, authentic British Chinese takeaway, professional food photography, appetizing lighting',
  },
  {
    code: '37',
    name: 'Sweet & Sour Chicken Balls',
    prompt: 'Golden crispy Chinese battered chicken balls with sweet and sour dipping sauce, authentic UK Chinese takeaway, food photography',
  },
  {
    code: 'G6',
    name: 'Chicken Satay on Skewers',
    prompt: 'Grilled chicken skewers with peanut satay sauce, spring onions, food photography',
  },
  {
    code: '91',
    name: 'Crispy Aromatic Duck',
    prompt: 'Crispy shredded aromatic duck on Chinese platter with steamed pancakes, cucumber, and hoi sin sauce, high quality food photography',
  },
];

async function generateDishImages() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const apiKey = process.env.POLLINATIONS_API_KEY || '';
  console.log(`Starting image generation for ${DISHES_TO_GENERATE.length} dishes (API key configured: ${Boolean(apiKey)})...`);

  for (const dish of DISHES_TO_GENERATE) {
    const filename = `${dish.code}.jpg`;
    const destPath = path.join(OUTPUT_DIR, filename);

    if (fs.existsSync(destPath)) {
      console.log(`[Skip] Image already exists for #${dish.code}`);
      continue;
    }

    console.log(`[Generating] #${dish.code}: ${dish.name}...`);
    const encodedPrompt = encodeURIComponent(dish.prompt);
    
    const targetUrl = apiKey
      ? `https://gen.pollinations.ai/image/${encodedPrompt}?key=${apiKey}&model=flux&width=800&height=600&nologo=true`
      : `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true`;

    try {
      const res = await fetch(targetUrl);
      if (!res.ok) {
        console.error(`Failed to generate #${dish.code}: HTTP ${res.status}`);
        continue;
      }
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(buffer));
      console.log(`✓ Saved #${dish.code} -> public/images/dishes/${filename} (${buffer.byteLength} bytes)`);
    } catch (err) {
      console.error(`Error generating #${dish.code}:`, err);
    }
  }

  console.log('Image generation complete.');
}

generateDishImages();
