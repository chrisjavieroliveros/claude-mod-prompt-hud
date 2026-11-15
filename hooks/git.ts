import { atom, read, update } from 'claude-code'
import type { EngineInterface, On, Timer } from 'claude-code'

import type { GitChange, GitStatus } from '../types'

// Follows `git status` of the session's folder for the GIT row: polled every 3 s, and again
// right after each tool call, so the list matches the editor's Source Control view. Only a
// change in the result is stored, so an idle repo never redraws the band.

const status = atom({ plugin: 'prompt-hud', key: 'git' } as const, null)
const isOpen = atom({ plugin: 'prompt-hud', key: 'gitOpen' } as const, false)

export const POLL_MS = 3000

/** `git status --porcelain=v1 -b -z` -> branch, staged and working-tree changes. */
export function parseStatus(out: string): GitStatus {
  const parts = out.split('\0')
  let branch = ''
  const staged: GitChange[] = []
  const changes: GitChange[] = []

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i] ?? ''
    if (p.length < 3) continue
    if (p.startsWith('## ')) {
      // "## main...origin/main [ahead 1]", "## No commits yet on main", "## HEAD (no branch)"
      branch = p
        .slice(3)
        .replace(/^No commits yet on /, '')
        .split('...')[0]!
        .split(' ')[0]!
      continue
    }
    const x = p[0]!
    const y = p[1]!
    const path = p.slice(3)
    // A rename or copy carries its old path as the next entry.
    if (x === 'R' || x === 'C' || y === 'R' || y === 'C') i++

    if (x === '?' && y === '?') {
      changes.push({ path, code: 'U' })
      continue
    }
    if (x === '!' && y === '!') continue
    if (x === 'U' || y === 'U' || (x === 'A' && y === 'A') || (x === 'D' && y === 'D')) {
      changes.push({ path, code: '!' }) // merge conflict
      continue
    }
    if (x !== ' ') staged.push({ path, code: x })
    if (y !== ' ') changes.push({ path, code: y })
  }

  return { branch, staged, changes }
}

const same = (a: GitStatus | null, b: GitStatus | null) => JSON.stringify(a) === JSON.stringify(b)

export async function currentGit($: EngineInterface): Promise<GitStatus | null> {
  return read($, status)
}

export async function gitIsOpen($: EngineInterface): Promise<boolean> {
  return (await read($, isOpen)) === true
}

export async function toggleGit($: EngineInterface): Promise<void> {
  await update($, isOpen, open => !open)
}

let running = false

/** Reads `git status` once; stores it only when it changed. Not a repo (or no git): null. */
export async function refreshGit($: EngineInterface): Promise<void> {
  if (running) return
  running = true
  try {
    let next: GitStatus | null = null
    try {
      const r = await $.process.run(
        ['git', '--no-optional-locks', 'status', '--porcelain=v1', '-b', '-z'],
        { timeoutMs: 15_000 },
      )
      if (r.exitCode === 0) next = parseStatus(r.stdout)
    } catch {
      next = null
    }
    const prev = await read($, status)
    if (!same(prev, next)) await update($, status, () => next)
  } finally {
    running = false
  }
}

export function registerGit(on: On): void {
  let timer: Timer | undefined

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    timer?.cancel()
    await refreshGit($)
    timer = $.clock.every(POLL_MS, () => void refreshGit($))
    return result
  })

  // A tool call (an edit, a commit, a git add) usually changes it: look straight away.
  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    void refreshGit($)
    return result
  })
}
