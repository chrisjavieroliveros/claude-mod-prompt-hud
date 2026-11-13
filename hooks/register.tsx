import type { Register } from 'claude-code'

import { currentFill, registerContext } from './context'

// One slim row above the prompt, once a reply has landed:
//   CTX  ■■■■■■■■■■■□□□□□□□□□  213k
// 20 boxes over a fixed 400k scale (not the model's window), coloured by tokens used; the only
// figure is the tokens. Whatever band another mod beneath draws stays above it; a survey takes the band.

const LABEL = '#8E949C'
const FIGURE = '#F1F2F4'
const SEG_EMPTY = '#1B1E23'
const SEG_EMPTY_EDGE = '#262A31'

/** The boxes' full scale, in tokens: 20 lit boxes = 400k, whatever the model's window. */
export const SCALE = 400_000

// 20 square boxes, 8 px, 2 px apart.
const SEGMENTS = 20
const SEG_W = 8
const SEG_GAP = 2
const BAR_H = 8
const BAR_W = SEGMENTS * (SEG_W + SEG_GAP) - SEG_GAP
const PAD = 2 // room for the glow
const SVG_W = BAR_W + PAD * 2
const SVG_H = BAR_H + PAD * 2
const LABEL_W = 4 // desktop, in cells (a Box width is cells, ~9 px each)
const LABEL_CELLS = 4 // terminal

/** Healthy up to 200k, filling up past 200k, high past 250k, critical past 330k. */
export const levelFor = (tokens: number) =>
  tokens > 330_000
    ? { name: 'critical', color: '#B4231F' }
    : tokens > 250_000
      ? { name: 'high', color: '#FF5A2C' }
      : tokens > 200_000
        ? { name: 'filling up', color: '#F28A3A' }
        : { name: 'healthy', color: '#3FBF4F' }

/** 84321 -> "84k", 1000000 -> "1M", 950 -> "950". */
export const short = (n: number) => {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}

/** Share of the 400k scale, 0-1. */
const share = (tokens: number) => Math.max(0, Math.min(1, tokens / SCALE))

export const register: Register = on => {
  registerContext(on)

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const f = await currentFill($)
    if (f === null) return next(e)

    // Whatever the mods beneath draw stays on top; this row sits closest to the prompt.
    const below = await next(e)
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const level = levelFor(f.tokens)
    let row

    if ('Svg' in ui) {
      const Svg = ui.Svg
      row = (
        <Box flexDirection="row" alignItems="center" gap="md">
          <Box width={LABEL_W} flexShrink={0}>
            <Text size="footnote" weight="bold" color={LABEL}>
              CTX
            </Text>
          </Box>
          <Box flexShrink={0}>
            <Svg
              source={boxesSvg(share(f.tokens), level.color)}
              width={SVG_W}
              height={SVG_H}
              alt={`Context ${short(f.tokens)} tokens (${level.name})`}
            />
          </Box>
          <Text size="footnote" weight="bold" mono tabular color={FIGURE}>
            {short(f.tokens)}
          </Text>
        </Box>
      )
    } else {
      // Terminal: the same row in cells.
      const lit = Math.round(share(f.tokens) * SEGMENTS)
      row = (
        <Box flexDirection="row" gap={1}>
          <Text bold color={LABEL}>
            {'CTX'.padEnd(LABEL_CELLS)}
          </Text>
          <Text>
            <Text color={level.color}>{'■'.repeat(lit)}</Text>
            <Text color={SEG_EMPTY_EDGE}>{'■'.repeat(SEGMENTS - lit)}</Text>
          </Text>
          <Text bold>{short(f.tokens)}</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column" gap={0}>
        {below}
        <Box flexDirection="column" paddingX="sm">
          {row}
        </Box>
      </Box>
    )
  })
}

/** The boxes: lit ones in the level's colour with a soft glow, the one the fill ends in part-lit inside an outline. */
function boxesSvg(fraction: number, color: string): string {
  const exact = fraction * SEGMENTS
  const full = Math.floor(exact)
  const part = exact - full
  const lit: string[] = []
  const dark: string[] = []

  for (let i = 0; i < SEGMENTS; i++) {
    const x = PAD + i * (SEG_W + SEG_GAP)
    if (i < full) {
      lit.push(`<rect x="${x}" y="${PAD}" width="${SEG_W}" height="${BAR_H}" rx="1.5"/>`)
    } else if (i === full && part > 0.05) {
      const w = Math.max(1, Math.round(part * SEG_W * 10) / 10)
      dark.push(
        `<rect x="${x + 0.5}" y="${PAD + 0.5}" width="${SEG_W - 1}" height="${BAR_H - 1}" rx="1.5" fill="${SEG_EMPTY}" stroke="${color}" stroke-opacity="0.85"/>` +
          `<rect x="${x}" y="${PAD}" width="${w}" height="${BAR_H}" rx="1" fill="${color}"/>`,
      )
    } else {
      dark.push(
        `<rect x="${x + 0.5}" y="${PAD + 0.5}" width="${SEG_W - 1}" height="${BAR_H - 1}" rx="1.5" fill="${SEG_EMPTY}" stroke="${SEG_EMPTY_EDGE}"/>`,
      )
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}">` +
    `<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%">` +
    `<feGaussianBlur in="SourceGraphic" stdDeviation="1.1" result="b"/>` +
    `<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` +
    dark.join('') +
    `<g fill="${color}" filter="url(#glow)" opacity="0.95">${lit.join('')}</g>` +
    `</svg>`
  )
}
