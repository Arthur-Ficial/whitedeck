import { describe, expect, it } from 'vitest';
import type { DeckSlide } from '../parse/deck.js';
import { ALL_LAYOUT_IDS, layoutOf, placeholdersByRole, WHITE } from '../theme/white.js';
import {
  canvas,
  bodyFrame,
  imageBandFrame,
  insideCanvas,
  intersects,
  picFrame,
  rectOf,
  sourceFrame,
} from './geometry.js';

const CANVAS = canvas();

/**
 * Regression guards for the three defects found in the .key output on
 * 2026-09-01: the chart painted over the headline, the unused body
 * placeholder rendered "Double-click to edit", and the source line ran off
 * the right edge of the slide.
 */
describe('picFrame', () => {
  const layoutsWithPic = ALL_LAYOUT_IDS.filter(
    (id) => placeholdersByRole(layoutOf(id), 'pic').length > 0,
  );

  it('covers every layout that has a picture placeholder', () => {
    expect(layoutsWithPic.length).toBeGreaterThan(0);
  });

  it.each(layoutsWithPic)('%s: the picture frame stays inside the canvas', (id) => {
    const layout = layoutOf(id);
    for (const ph of placeholdersByRole(layout, 'pic')) {
      expect(insideCanvas(picFrame(ph, layout))).toBe(true);
    }
  });

  it.each(layoutsWithPic)('%s: the picture frame never overlaps title or body', (id) => {
    const layout = layoutOf(id);
    const texts = layout.placeholders.filter((p) => p.role === 'title' || p.role === 'body');
    for (const ph of placeholdersByRole(layout, 'pic')) {
      const frame = picFrame(ph, layout);
      for (const t of texts) {
        expect(
          intersects(frame, rectOf(t)),
          `${id}: picture frame intersects the ${t.role} placeholder`,
        ).toBe(false);
      }
    }
  });

  it('photo-horizontal: the raw placeholder really did overlap the title', () => {
    // documents WHY this guard exists - the raw rect is still broken upstream
    const layout = layoutOf('photo-horizontal');
    const raw = rectOf(placeholdersByRole(layout, 'pic')[0]!);
    const title = rectOf(placeholdersByRole(layout, 'title')[0]!);
    expect(intersects(raw, title)).toBe(true);
    expect(raw.y).toBeLessThan(0);
    // ...and that picFrame is what repairs it
    const fixed = picFrame(placeholdersByRole(layout, 'pic')[0]!, layout);
    expect(intersects(fixed, title)).toBe(false);
    expect(fixed.y).toBeGreaterThanOrEqual(0);
  });
});

describe('sourceFrame', () => {
  it.each([...ALL_LAYOUT_IDS])('%s: the source line stays inside the canvas', (id) => {
    for (const bodyUsed of [true, false]) {
      const frame = sourceFrame(layoutOf(id), bodyUsed);
      expect(insideCanvas(frame), `${id} (bodyUsed=${bodyUsed})`).toBe(true);
      expect(frame.x + frame.w).toBeLessThanOrEqual(CANVAS.w);
    }
  });

  it.each([...ALL_LAYOUT_IDS])('%s: the source line never covers the slide number', (id) => {
    const layout = layoutOf(id);
    const num = placeholdersByRole(layout, 'sldNum')[0];
    if (num === undefined) return;
    for (const bodyUsed of [true, false]) {
      expect(intersects(sourceFrame(layout, bodyUsed), rectOf(num))).toBe(false);
    }
  });

  it('has a real width so long URLs wrap instead of running off-slide', () => {
    const frame = sourceFrame(layoutOf('photo-horizontal'), false);
    expect(frame.w).toBeGreaterThan(CANVAS.w / 2);
  });

  it('is never the old hardcoded position', () => {
    // the bug was `set position of srcItem to {133, 1020}` with no width
    const frame = sourceFrame(layoutOf('photo-horizontal'), false);
    expect(Math.round(frame.y / 12700)).not.toBe(1020);
  });

  it.each([...ALL_LAYOUT_IDS])('%s: the source sits in the LOWER half of the slide', (id) => {
    // regression: a NEGATIVE_INFINITY default collapsed y to 0 and printed the
    // source line across the top of the slide, over the chart.
    for (const bodyUsed of [true, false]) {
      const frame = sourceFrame(layoutOf(id), bodyUsed);
      expect(frame.y, `${id} (bodyUsed=${bodyUsed})`).toBeGreaterThan(CANVAS.h / 2);
    }
  });

  it.each([...ALL_LAYOUT_IDS])('%s: the source never covers the title', (id) => {
    const title = placeholdersByRole(layoutOf(id), 'title')[0];
    if (title === undefined) return;
    for (const bodyUsed of [true, false]) {
      expect(intersects(sourceFrame(layoutOf(id), bodyUsed), rectOf(title))).toBe(false);
    }
  });
});

describe('bodyFrame', () => {
  const withBody = ALL_LAYOUT_IDS.filter(
    (id) => placeholdersByRole(layoutOf(id), 'body').length > 0,
  );

  it.each(withBody)('%s: body text never runs under the source line', (id) => {
    const layout = layoutOf(id);
    expect(intersects(bodyFrame(layout, true), sourceFrame(layout, true))).toBe(false);
  });

  it.each(withBody)('%s: the shortened body still has usable height', (id) => {
    expect(bodyFrame(layoutOf(id), true).h).toBeGreaterThan(100 * 12700);
  });

  it('is untouched when the slide has no source line', () => {
    const layout = layoutOf('title-bullets');
    const body = placeholdersByRole(layout, 'body')[0]!;
    expect(bodyFrame(layout, false).h).toBe(body.hEmu);
  });
});

describe('imageBandFrame (the .key picture area)', () => {
  const imageLayouts = ['title-bullets'];

  it.each(imageLayouts)('%s: stays inside the canvas', (id) => {
    expect(insideCanvas(imageBandFrame(layoutOf(id), true))).toBe(true);
  });

  it.each(imageLayouts)('%s: never overlaps the title', (id) => {
    const title = placeholdersByRole(layoutOf(id), 'title')[0]!;
    expect(intersects(imageBandFrame(layoutOf(id), true), rectOf(title))).toBe(false);
  });

  it.each(imageLayouts)('%s: never overlaps the source line', (id) => {
    const frame = imageBandFrame(layoutOf(id), true);
    expect(intersects(frame, sourceFrame(layoutOf(id), false))).toBe(false);
  });

  it('leaves a usable area - at least a third of the slide', () => {
    const f = imageBandFrame(layoutOf('title-bullets'), true);
    expect((f.w * f.h) / (CANVAS.w * CANVAS.h)).toBeGreaterThan(0.33);
  });
});

describe('canvas', () => {
  it('matches the Keynote document whitedeck creates (1920 x 1080 pt)', () => {
    expect(Math.round(WHITE.canvas.widthEmu / 12700)).toBe(1920);
    expect(Math.round(WHITE.canvas.heightEmu / 12700)).toBe(1080);
  });
});

export const sampleSlide = (over: Partial<DeckSlide> = {}): DeckSlide =>
  ({ layout: 'photo-horizontal', bullets: [], images: [], ...over }) as DeckSlide;
