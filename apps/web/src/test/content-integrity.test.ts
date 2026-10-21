// Guards against placeholder data creeping back into the shipped site.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const WEB_ROOT = join(__dirname, '..', '..');
const SRC = join(WEB_ROOT, 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'test' ? [] : walk(full);
    return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

const files = [...walk(SRC), join(WEB_ROOT, 'index.html')];

const FORBIDDEN: [string, RegExp][] = [
  ['placeholder gym phone', /\+91 98765 43210|919876543210/],
  ['placeholder address', /Sector 18|Metro City|Commercial Belt|400705/],
  ['placeholder GSTIN', /27AAAAA0000A1Z5/],
  ['placeholder gym email', /info@rvfitnessgym\.in/],
  ['old brand spelling', /RV-Fitness|RV-FITNESS/],
  ['old plan names', /Monthly Starter|Quarterly Fit|Half-Yearly Pro|Annual Elite/],
  ['old fonts', /Bebas Neue|Oswald/],
];

describe('content integrity', () => {
  it.each(FORBIDDEN)('no %s in shipped source', (_label, pattern) => {
    const offenders = files.filter((f) => pattern.test(readFileSync(f, 'utf-8'))).map((f) => relative(WEB_ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('loads the Plus Jakarta Sans font', () => {
    const html = readFileSync(join(WEB_ROOT, 'index.html'), 'utf-8');
    expect(html).toContain('family=Plus+Jakarta+Sans');
  });

  it('uses Plus Jakarta Sans for headings and body text', async () => {
    const config = (await import('../../tailwind.config.js')).default as any;
    expect(config.theme.extend.fontFamily.heading[0]).toBe('"Plus Jakarta Sans"');
    expect(config.theme.extend.fontFamily.body[0]).toBe('"Plus Jakarta Sans"');
  });

  it('uses the gold theme colour', async () => {
    const config = (await import('../../tailwind.config.js')).default as any;
    expect(config.theme.extend.colors.gym.primary).toBe('#D4AF37');
  });
});
