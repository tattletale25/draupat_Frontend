import { hashSeed, mulberry32 } from './utils';

/** Deterministic inline-SVG "product photo" stand-in — real product images
 * come from product_daily_snapshot.image_url once the backend is wired up
 * (see API_CONTRACT.md), but nothing in this sandbox has network access to
 * fetch or hotlink real photos. Same seed always renders the same image, so
 * a given SKU's card doesn't jitter between renders. */
export function placeholderProductImage(seed: string, colorHex: string): string {
  const rand = mulberry32(hashSeed(seed));
  const rotate = Math.round(rand() * 360);
  const scale = 0.72 + rand() * 0.2;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>
    <rect width='160' height='160' rx='16' fill='${colorHex}' fill-opacity='0.12'/>
    <g transform='translate(80 80) rotate(${rotate}) scale(${scale.toFixed(2)})' fill='none' stroke='${colorHex}' stroke-width='4' stroke-linejoin='round' stroke-linecap='round'>
      <path d='M-28 -14 L0 -32 L28 -14 L16 30 L-16 30 Z'/>
      <path d='M-28 -14 L28 -14 M-16 30 L0 -14 L16 30'/>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
