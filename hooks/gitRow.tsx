import type { EngineInterface } from 'claude-code'

import type { GitChange, GitStatus } from '../types'
import { currentGit, gitIsOpen, toggleGit } from './git'
import {
  CHAR_W,
  CONTENT_W,
  DIM,
  esc,
  FIGURE,
  FONT,
  FONT_PX,
  LABEL,
  LABEL_CELLS,
  LABEL_W,
  SEG_EMPTY_EDGE,
} from './style'

export { registerGit } from './git'

// The GIT row, above CTX, in the same grid: the label column, then 10 px type drawn as SVG
// (as CTX draws its boxes), then a chevron that opens the lists:
//   GIT  main · 14 staged · 2 changes  ▸
//        STAGED 14
//        M DawntidePlains.unity  …/Zones/DawntidePlains
//        CHANGES 2
//        U Staging/

/** Most rows one list shows before "+N more" (the band scrolls past its own height anyway). */
export const LIST_MAX = 40

const ROW_H = 14
const HEAD_H = 14
const BASE = 10 // baseline in a row
const CODE_W = 11 // the status letter's column, px
/** The divider: label column (~36 px) + gap + content column, faded at both ends. */
const LINE_W = 44 + CONTENT_W

/** VS Code's Source Control letter colours. */
export const codeColor = (code: string) =>
  code === 'M' || code === 'T'
    ? '#E2C08D'
    : code === 'A' || code === 'U' || code === 'R' || code === 'C'
      ? '#73C991'
      : code === 'D'
        ? '#C74E39'
        : '#E4676B'

type RenderEvent = Parameters<EngineInterface['ui']['resolve']>[0]

const split = (path: string) => {
  const p = path.replace(/\/$/, '')
  const at = p.lastIndexOf('/')
  return at < 0 ? { name: path, dir: '' } : { name: path.slice(at + 1) + (path.endsWith('/') ? '/' : ''), dir: p.slice(0, at) }
}

const cutEnd = (s: string, n: number) => (s.length <= n ? s : n <= 1 ? '…' : `${s.slice(0, n - 1)}…`)
const cutStart = (s: string, n: number) => (s.length <= n ? s : n <= 1 ? '' : `…${s.slice(s.length - n + 1)}`)

/** "14 staged · 2 changes", or "clean". */
const counts = (git: GitStatus) =>
  git.staged.length + git.changes.length === 0
    ? null
    : { staged: git.staged.length, changes: git.changes.length }

const svgOpen = (w: number, h: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ` +
  `font-family="${FONT}" font-size="${FONT_PX}">`

/** The summary line at 10 px: branch bright, figures bright, words grey. */
function headerSvg(git: GitStatus): { source: string; width: number } {
  const branch = cutEnd(git.branch || 'HEAD', 24)
  const c = counts(git)
  const parts: [string, string, boolean][] = [[branch, FIGURE, false]]
  if (c === null) parts.push([' · ', DIM, false], ['clean', LABEL, false])
  else
    parts.push(
      [' · ', DIM, false],
      [String(c.staged), FIGURE, true],
      [' staged', LABEL, false],
      [' · ', DIM, false],
      [String(c.changes), FIGURE, true],
      [c.changes === 1 ? ' change' : ' changes', LABEL, false],
    )
  const chars = parts.reduce((n, [t]) => n + t.length, 0)
  const width = Math.ceil(chars * CHAR_W) + 2
  const spans = parts
    .map(([t, color, bold]) => `<tspan fill="${color}"${bold ? ' font-weight="700"' : ''}>${esc(t)}</tspan>`)
    .join('')
  return {
    width,
    source: `${svgOpen(width, HEAD_H)}<text x="0" y="${BASE + 1}" xml:space="preserve">${spans}</text></svg>`,
  }
}

/** Both lists at 10 px, in the content column; empty lists are left out. */
function listSvg(git: GitStatus): { source: string; height: number } {
  const maxChars = Math.floor((CONTENT_W - CODE_W) / CHAR_W)
  const out: string[] = []
  let y = 0

  const section = (title: string, items: GitChange[]) => {
    if (items.length === 0) return
    if (y > 0) y += 3
    out.push(
      `<text x="0" y="${y + BASE}" letter-spacing="0.6" font-weight="700" fill="${LABEL}">${title}` +
        `<tspan fill="${DIM}" font-weight="400" letter-spacing="0"> ${items.length}</tspan></text>`,
    )
    y += ROW_H
    for (const c of items.slice(0, LIST_MAX)) {
      const { name, dir } = split(c.path)
      const n = cutEnd(name, maxChars)
      const room = maxChars - n.length - 2
      const d = dir && room >= 4 ? cutStart(dir, room) : ''
      out.push(
        `<text x="0" y="${y + BASE}" font-weight="700" fill="${codeColor(c.code)}">${esc(c.code)}</text>` +
          `<text x="${CODE_W}" y="${y + BASE}" xml:space="preserve"><tspan fill="${FIGURE}">${esc(n)}</tspan>` +
          (d ? `<tspan fill="${DIM}">  ${esc(d)}</tspan>` : '') +
          `</text>`,
      )
      y += ROW_H
    }
    if (items.length > LIST_MAX) {
      out.push(`<text x="${CODE_W}" y="${y + BASE}" fill="${DIM}">+${items.length - LIST_MAX} more</text>`)
      y += ROW_H
    }
  }

  section('STAGED', git.staged)
  section('CHANGES', git.changes)
  const height = Math.max(ROW_H, y)
  return { height, source: `${svgOpen(CONTENT_W, height)}${out.join('')}</svg>` }
}

const lineSvg = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${LINE_W}" height="1" viewBox="0 0 ${LINE_W} 1">` +
  `<defs><linearGradient id="f" x1="0" x2="1" y1="0" y2="0">` +
  `<stop offset="0" stop-color="${SEG_EMPTY_EDGE}" stop-opacity="0.2"/>` +
  `<stop offset="0.12" stop-color="${SEG_EMPTY_EDGE}"/>` +
  `<stop offset="0.88" stop-color="${SEG_EMPTY_EDGE}"/>` +
  `<stop offset="1" stop-color="${SEG_EMPTY_EDGE}" stop-opacity="0"/>` +
  `</linearGradient></defs><rect width="${LINE_W}" height="1" fill="url(#f)"/></svg>`

/** The hairline between GIT and CTX, with a little air above and below. */
export function gitDivider($: EngineInterface, e: RenderEvent) {
  const ui = $.ui.resolve(e)
  const { Box, Text } = ui
  if (e.surface !== 'terminal' && 'Svg' in ui) {
    const Svg = ui.Svg
    return (
      <Box paddingY="xs">
        <Svg source={lineSvg()} width={LINE_W} height={1} alt="" />
      </Box>
    )
  }
  return <Text color={SEG_EMPTY_EDGE}>{'─'.repeat(LABEL_CELLS + 1 + 20 + 5)}</Text>
}

/** The GIT rows for the band, or null outside a git repo / before the first read. */
export async function gitRows($: EngineInterface, e: RenderEvent) {
  const git = await currentGit($)
  if (git === null) return null
  const c = counts(git)
  const open = c !== null && (await gitIsOpen($))
  const ui = $.ui.resolve(e)
  const { Box, Text, Button } = ui
  const chevron = open ? '▾' : '▸'
  const alt =
    c === null
      ? `Git ${git.branch}: clean`
      : `Git ${git.branch}: ${c.staged} staged, ${c.changes} ${c.changes === 1 ? 'change' : 'changes'}`

  if (e.surface !== 'terminal' && 'Svg' in ui) {
    const Svg = ui.Svg
    const head = headerSvg(git)
    const list = open ? listSvg(git) : null
    return (
      <Box flexDirection="column" gap={0}>
        <Box flexDirection="row" alignItems="center" gap="md">
          <Box width={LABEL_W} flexShrink={0}>
            <Text size="footnote" weight="bold" color={LABEL}>
              GIT
            </Text>
          </Box>
          <Box flexShrink={0}>
            <Svg source={head.source} width={head.width} height={HEAD_H} alt={alt} />
          </Box>
          {c !== null ? (
            <Button key="git-toggle" plain dimColor onPress={() => void toggleGit($)}>
              <Text size="footnote" color={LABEL}>
                {chevron}
              </Text>
            </Button>
          ) : null}
        </Box>
        {list !== null ? (
          <Box flexDirection="row" gap="md" paddingTop="xs">
            <Box width={LABEL_W} flexShrink={0} />
            <Box flexShrink={0}>
              <Svg source={list.source} width={CONTENT_W} height={list.height} alt="Git changes" />
            </Box>
          </Box>
        ) : null}
      </Box>
    )
  }

  // Terminal: the same grid in cells.
  const summary =
    c === null ? ' · clean' : ` · ${c.staged} staged · ${c.changes} ${c.changes === 1 ? 'change' : 'changes'}`
  const header = (
    <Box flexDirection="row" gap={1}>
      <Text bold color={LABEL}>
        {'GIT'.padEnd(LABEL_CELLS)}
      </Text>
      {c !== null ? (
        <Button key="git-toggle" plain onPress={() => void toggleGit($)}>
          <Text>{git.branch || 'HEAD'}</Text>
          <Text dimColor>
            {summary} {chevron}
          </Text>
        </Button>
      ) : (
        <Text>
          <Text>{git.branch || 'HEAD'}</Text>
          <Text dimColor>{summary}</Text>
        </Text>
      )}
    </Box>
  )
  if (!open) return header

  const section = (title: string, items: GitChange[]) =>
    items.length === 0 ? null : (
      <Box flexDirection="column" gap={0} key={title}>
        <Text>
          <Text bold color={LABEL}>
            {title}
          </Text>
          <Text dimColor> {items.length}</Text>
        </Text>
        {items.slice(0, LIST_MAX).map(ch => {
          const { name, dir } = split(ch.path)
          return (
            <Text key={`${title}:${ch.path}`} wrap="truncate-end">
              <Text bold color={codeColor(ch.code)}>
                {ch.code}
              </Text>
              <Text> {name}</Text>
              {dir ? <Text dimColor>{`  ${dir}`}</Text> : null}
            </Text>
          )
        })}
        {items.length > LIST_MAX ? <Text dimColor>{`+${items.length - LIST_MAX} more`}</Text> : null}
      </Box>
    )

  return (
    <Box flexDirection="column" gap={0}>
      {header}
      <Box flexDirection="column" gap={0} paddingLeft={LABEL_CELLS + 1}>
        {section('STAGED', git.staged)}
        {section('CHANGES', git.changes)}
      </Box>
    </Box>
  )
}

/** For tests and previews. */
export const svgs = { headerSvg, listSvg, lineSvg }
