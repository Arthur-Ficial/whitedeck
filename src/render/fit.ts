/* Keynote shrinks overflowing placeholder text; CSS, pptx text boxes without
   autofit and Keynote text items do not. One heuristic, shared by every
   painter, so all four formats agree on the size. Helvetica Neue metrics
   measured on the reference deck: a 62-glyph Helvetica Neue Medium headline
   spans 0.44em per glyph; 0.48 keeps a safety margin (Chrome's Helvetica Neue
   Medium runs slightly wider than the Keynote export). Line height 1.15em. */
export const AVG_GLYPH_EM = 0.48;
export const LINE_HEIGHT_EM = 1.15;

const wrappedLines = (chars: number, sizePt: number, widthPt: number): number =>
  Math.max(1, Math.ceil((chars * sizePt * AVG_GLYPH_EM) / widthPt));

export interface FitBox {
  readonly widthPt: number;
  readonly heightPt: number;
  readonly sizePt: number;
  readonly minPt: number;
}

export interface NoteGroup {
  readonly header: string;
  readonly lines: readonly string[];
}

/** Height in pt of heading + bullet groups at `sizePt` (bullets wrap at width - 1em indent). */
export const notesHeightPt = (groups: readonly NoteGroup[], widthPt: number, sizePt: number, gapPt: number): number => {
  const line = sizePt * LINE_HEIGHT_EM;
  let paragraphs = 0;
  let height = 0;
  for (const g of groups) {
    height += wrappedLines(g.header.length, sizePt, widthPt) * line;
    paragraphs += 1;
    for (const l of g.lines) {
      height += wrappedLines(l.length, sizePt, widthPt - sizePt) * line;
      paragraphs += 1;
    }
  }
  return height + Math.max(paragraphs - 1, 0) * gapPt;
};

/** Largest size (stepping down by 2pt) at which the notes block fits `heightPt`, never below `minPt`. */
export const fittedNotesSizePt = (groups: readonly NoteGroup[], box: FitBox, gapPt: number): number => {
  for (let size = box.sizePt; size > box.minPt; size -= 2) {
    if (notesHeightPt(groups, box.widthPt, size, gapPt) <= box.heightPt) return size;
  }
  return box.minPt;
};

/** Largest size (stepping down by 2pt) at which `text` fits the box, never below `minPt`. */
export const fittedSizePt = (text: string, box: FitBox): number => {
  for (let size = box.sizePt; size > box.minPt; size -= 2) {
    if (wrappedLines(text.length, size, box.widthPt) * size * LINE_HEIGHT_EM <= box.heightPt) return size;
  }
  return box.minPt;
};
