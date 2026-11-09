/**
 * Scans public/images/dishes/ and cleanly links available images
 * into src/data/goldenRiceBowlMenu.ts without duplicate properties.
 */

import fs from 'fs';
import path from 'path';

const MENU_FILE = path.join(process.cwd(), 'src', 'data', 'goldenRiceBowlMenu.ts');
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'dishes');

export function syncDishImages() {
  if (!fs.existsSync(IMAGES_DIR)) return;

  const existingImages = new Set(
    fs.readdirSync(IMAGES_DIR)
      .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
      .map(f => path.parse(f).name)
  );

  console.log(`Found ${existingImages.size} dish images on disk.`);

  let content = fs.readFileSync(MENU_FILE, 'utf8');

  // Split into chunks by dish object boundary
  // Each dish starts with "  {\n    id: "
  const parts = content.split(/(?=\n\s*\{\s*\n\s*id:\s*['"])/g);

  let updatedCount = 0;
  const processedParts = parts.map(part => {
    const codeMatch = part.match(/dishCode:\s*['"]([^'"]+)['"]/);
    if (!codeMatch) return part;

    const code = codeMatch[1];
    if (existingImages.has(code) && !part.includes('imageUrl:')) {
      // Insert imageUrl right after dishCode line
      const updated = part.replace(
        /(dishCode:\s*['"][^'"]+['"],\s*\n)/,
        `$1    imageUrl: '/images/dishes/${code}.jpg',\n`
      );
      updatedCount++;
      return updated;
    }
    return part;
  });

  fs.writeFileSync(MENU_FILE, processedParts.join(''), 'utf8');
  console.log(`Successfully linked images for ${updatedCount} dishes!`);
}

syncDishImages();
