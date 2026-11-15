// The HUD's one design language, shared by the GIT and CTX rows.

export const LABEL = '#8E949C'
export const FIGURE = '#F1F2F4'
export const DIM = '#6B717A'
export const SEG_EMPTY = '#1B1E23'
export const SEG_EMPTY_EDGE = '#262A31'

/** The label column ("GIT", "CTX"): desktop in cells (a Box width is cells, ~9 px each). */
export const LABEL_W = 4
/** The same column on the terminal. */
export const LABEL_CELLS = 4

/** Desktop: the content column's width in px (CTX's boxes plus its figure), the divider spans it. */
export const CONTENT_W = 236

/** The 10 px HUD type, as the SVGs draw it. */
export const FONT = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
export const FONT_PX = 10
/** One monospace character at 10 px. */
export const CHAR_W = 6.02

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
