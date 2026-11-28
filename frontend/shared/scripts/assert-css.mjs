// Build guard: fail the build if Tailwind utilities are missing from the
// emitted CSS. Catches the silent Tailwind v4 auto-detection failure that
// shipped all four frontends unstyled on 2026-11-28.
// Usage: node assert-css.mjs <distDir>
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] || 'dist';
const assetsDir = join(dist, 'assets');
const cssFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.css'));
if (cssFiles.length === 0) {
  console.error(`assert-css: no CSS file found in ${assetsDir}`);
  process.exit(1);
}
const css = cssFiles.map((f) => readFileSync(join(assetsDir, f), 'utf8')).join('\n');
const sentinels = ['.flex', '.items-center', '.justify-between', '.grid', '.gap-', '.rounded', '.font-semibold', '.text-sm', '.px-', '.py-'];
const missing = sentinels.filter((s) => !css.includes(s));
if (!['.sm\\:', '.md\\:', '.lg\\:'].some((v) => css.includes(v))) missing.push('responsive variants (.sm:/.md:/.lg:)');
if (missing.length > 0) {
  console.error(`assert-css: FAIL — built CSS (${css.length} bytes) is missing utility selectors: ${missing.join(', ')}`);
  console.error('Tailwind content sources are broken. Check the @source directives in src/index.css.');
  process.exit(1);
}
console.log(`assert-css: OK — ${cssFiles.join(', ')} (${css.length} bytes) contains the utility layer.`);
