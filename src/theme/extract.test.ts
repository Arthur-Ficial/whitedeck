import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractTheme } from './extract.js';

const REFERENCE_PPTX = new URL('../../../Untitled.pptx', import.meta.url).pathname;

describe.skipIf(!existsSync(REFERENCE_PPTX))('extractTheme (requires local Keynote reference export)', () => {
  it('extracts canvas, fonts and all 12 content layouts with exact Keynote geometry', async () => {
    const theme = await extractTheme(REFERENCE_PPTX);

    expect(theme.name).toBe('white');
    expect(theme.canvas).toEqual({
      widthEmu: 24384000,
      heightEmu: 13716000,
      widthPx: 2560,
      heightPx: 1440,
    });
    expect(theme.background).toBe('#FFFFFF');

    expect(Object.keys(theme.layouts).sort()).toEqual([
      'blank',
      'bullets',
      'photo',
      'photo-3-up',
      'photo-horizontal',
      'photo-vertical',
      'quote',
      'title',
      'title-bullets',
      'title-bullets-photo',
      'title-center',
      'title-top',
    ]);

    const titleBullets = theme.layouts['title-bullets'];
    expect(titleBullets?.keynoteName).toBe('Title & Bullets');
    const tbTitle = titleBullets?.placeholders.find((p) => p.role === 'title');
    expect(tbTitle).toMatchObject({
      xEmu: 1689100,
      yEmu: 355600,
      wEmu: 21005800,
      hEmu: 2286000,
      sizePt: 112,
      font: 'Helvetica Neue Medium',
      color: '#000000',
      align: 'center',
    });
    const tbBody = titleBullets?.placeholders.find((p) => p.role === 'body');
    expect(tbBody).toMatchObject({
      xEmu: 1689100,
      yEmu: 3149600,
      wEmu: 21005800,
      hEmu: 9296400,
      sizePt: 48,
      font: 'Helvetica Neue',
      color: '#000000',
      align: 'left',
      bullet: '•',
    });

    const photoH = theme.layouts['photo-horizontal'];
    expect(photoH?.keynoteName).toBe('Photo - Horizontal');
    expect(photoH?.placeholders.find((p) => p.role === 'pic')).toMatchObject({
      xEmu: 3125968,
      yEmu: -393700,
      wEmu: 18135601,
      hEmu: 12090400,
    });
    expect(photoH?.placeholders.find((p) => p.role === 'title')).toMatchObject({
      xEmu: 635000,
      yEmu: 9512300,
      wEmu: 23114000,
      hEmu: 2006600,
    });
    const photoHBody = photoH?.placeholders.find((p) => p.role === 'body');
    expect(photoHBody?.sizePt).toBe(54);
    expect(photoHBody?.align).toBe('center');

    const quoteBodies = theme.layouts['quote']?.placeholders.filter((p) => p.role === 'body');
    expect(quoteBodies?.map((p) => p.sizePt).sort((a, b) => a - b)).toEqual([32, 48]);

    const blankRoles = theme.layouts['blank']?.placeholders.map((p) => p.role);
    expect(blankRoles).not.toContain('title');
    expect(blankRoles).not.toContain('body');
  });
});
