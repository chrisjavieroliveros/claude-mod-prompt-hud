import type { EngineInterface } from 'claude-code'

import type { GitChange } from '../types'
import { currentGit, gitIsOpen, toggleGit } from './git'

export { registerGit } from './git'

// The GIT row, above CTX. Closed:
//   ▸ GIT  main · 14 staged · 0 changes
// Open (a press on the row toggles), the same lists as the editor's Source Control view:
//   ▾ GIT  main · 14 staged · 0 changes
//     STAGED CHANGES 14
//     M  DawntidePlains.unity  Assets/_Game/Planets/...
//     CHANGES 0

const LABEL = '#8E949C'
const DIR = '#6B717A'

/** Most rows one list shows before "+N more" (the band scrolls past its own height anyway). */
export const LIST_MAX = 40

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
  return at < 0 ? { name: path, dir: '' } : { name: path.slice(at + 1), dir: p.slice(0, at) }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** The GIT rows for the band, or null outside a git repo / before the first read. */
export async function gitRows($: EngineInterface, e: RenderEvent) {
  const git = await currentGit($)
  if (git === null) return null
  const open = await gitIsOpen($)
  const { Box, Text, Button } = $.ui.resolve(e)
  const total = git.staged.length + git.changes.length

  const summary =
    total === 0
      ? 'clean'
      : `${plural(git.staged.length, 'staged', 'staged')} · ${plural(git.changes.length, 'change', 'changes')}`

  const header = (
    <Button key="git-toggle" plain onPress={() => void toggleGit($)}>
      <Text color={LABEL}>{open ? '▾ ' : '▸ '}</Text>
      <Text bold color={LABEL}>
        GIT
      </Text>
      <Text>
        {'  '}
        {git.branch || 'HEAD'}
      </Text>
      <Text dimColor>
        {' · '}
        {summary}
      </Text>
    </Button>
  )

  if (!open) return header

  const list = (title: string, items: GitChange[], keyPrefix: string) => {
    const shown = items.slice(0, LIST_MAX)
    return (
      <Box flexDirection="column" gap={0} key={keyPrefix}>
        <Text>
          <Text bold color={LABEL}>
            {title}
          </Text>
          <Text dimColor> {items.length}</Text>
        </Text>
        {shown.map(c => {
          const { name, dir } = split(c.path)
          return (
            <Text key={`${keyPrefix}:${c.path}`} wrap="truncate-end">
              <Text bold color={codeColor(c.code)}>
                {c.code}
              </Text>
              <Text>
                {'  '}
                {name}
              </Text>
              {dir ? <Text color={DIR}>{`  ${dir}`}</Text> : null}
            </Text>
          )
        })}
        {items.length > shown.length ? <Text dimColor>{`+${items.length - shown.length} more`}</Text> : null}
      </Box>
    )
  }

  return (
    <Box flexDirection="column" gap={0}>
      {header}
      <Box flexDirection="column" gap={0} paddingLeft={2}>
        {list('STAGED CHANGES', git.staged, 'staged')}
        {list('CHANGES', git.changes, 'changes')}
      </Box>
    </Box>
  )
}
