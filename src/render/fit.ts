/* Keynote shrinks overflowing placeholder text; CSS, pptx text boxes without
   autofit and Keynote text items do not. One heuristic, shared by every
   painter, so all four formats agree on the size. Helvetica Neue metrics
   measured on the reference deck: a 62-glyph Helvetica Neue Medium headline
   spans 0.44em per glyph; 0.46 keeps a safety margin. Line height 1.15em. */
export const AVG_GLYPH_EM = 0.46;
export const LINE_HEIGHT_EM = 1.15;

const wrappedLines = (chars: number, sizePt: number, widthPt: number): number =>
  Math.max(1, Math.ceil((chars * sizePt * AVG_GLYPH_EM) / widthPt));

export interface FitBox {
  readonly widthPt: number;
  readonly heightPt: number;
  readonly sizePt: number;
  readonly minPt: number;
}

/** Largest size (stepping down by 2pt) at which `text` fits the box, never below `minPt`. */
export const fittedSizePt = (text: string, box: FitBox): number => {
  for (let size = box.sizePt; size > box.minPt; size -= 2) {
    if (wrappedLines(text.length, size, box.widthPt) * size * LINE_HEIGHT_EM <= box.heightPt) return size;
  }
  return box.minPt;
};
