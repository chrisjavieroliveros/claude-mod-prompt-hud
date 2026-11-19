// The model's avatar: a 7×7 block monogram (Haiku H, Sonnet S, Opus O, Fable F) in the model's
// colour, from the "Model avatars — block monograms" design, at its 20 px size: a dark rounded
// tile with a faint ring in the model's colour, the letter's cells lit, the rest a dim tint.

export type ModelLook = { name: string; letter: 'H' | 'S' | 'O' | 'F'; color: string }

const LOOKS: ModelLook[] = [
  { name: 'Haiku', letter: 'H', color: '#8FA3B8' },
  { name: 'Sonnet', letter: 'S', color: '#4CC38A' },
  { name: 'Opus', letter: 'O', color: '#E3B341' },
  { name: 'Fable', letter: 'F', color: '#E5573F' },
]

const GLYPHS: Record<ModelLook['letter'], string[]> = {
  H: ['X...X', 'X...X', 'XXXXX', 'X...X', 'X...X'],
  S: ['.XXXX', 'X....', '.XXX.', '....X', 'XXXX.'],
  O: ['.XXX.', 'X...X', 'X...X', 'X...X', '.XXX.'],
  F: ['XXXXX', 'X....', 'XXXX.', 'X....', 'X....'],
}

/** "claude-opus-5-5", "Opus 5.5", "opus[1m]" -> Opus; a model none of the four -> null. */
export const lookFor = (model: string): ModelLook | null =>
  LOOKS.find(l => model.toLowerCase().includes(l.name.toLowerCase())) ?? null

/** The tile's size in px. */
export const AVATAR_PX = 20

/** The tile as SVG, with the design's 20 px values: pad 2, gap 1, square cells, corner 4. */
export function avatarSvg(look: ModelLook, size = AVATAR_PX): string {
  const pad = Math.max(2, Math.round(size * 0.1))
  const gap = Math.max(1, Math.round(size * 0.022))
  const radius = Math.round(size * 0.22)
  const cell = (size - pad * 2 - gap * 6) / 7
  const rows = GLYPHS[look.letter]
  const lit: string[] = []
  const dim: string[] = []
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 7; x++) {
      const on = y > 0 && y < 6 && x > 0 && x < 6 && rows[y - 1]!.charAt(x - 1) === 'X'
      const r = `<rect x="${+(pad + x * (cell + gap)).toFixed(2)}" y="${+(pad + y * (cell + gap)).toFixed(2)}" width="${+cell.toFixed(2)}" height="${+cell.toFixed(2)}"/>`
      ;(on ? lit : dim).push(r)
    }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<rect x="0.5" y="0.5" width="${size - 1}" height="${size - 1}" rx="${radius - 0.5}" fill="#121418" stroke="${look.color}" stroke-opacity="0.25"/>` +
    `<g fill="${look.color}" fill-opacity="0.08">${dim.join('')}</g>` +
    `<g fill="${look.color}">${lit.join('')}</g>` +
    `</svg>`
  )
}
