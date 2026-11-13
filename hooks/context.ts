import { atom, read, update } from 'claude-code'
import type { EngineInterface, On, SessionContextUsage } from 'claude-code'

import type { Fill } from '../types'
const fill = atom({ plugin: 'prompt-hud', key: 'fill' } as const, null)

// Follows how many tokens the context holds, for the CTX row: the status line's figure,
// pushed after every main-thread turn.

const toFill = (c: SessionContextUsage): Fill | null => (c.tokens === undefined ? null : { tokens: c.tokens })

/** The stored fill, or (after a reload, on a resumed session) the live one: it costs nothing. */
export async function currentFill($: EngineInterface): Promise<Fill | null> {
  const stored = await read($, fill)
  if (stored !== null && typeof stored.tokens === 'number') return { tokens: stored.tokens }
  const { context } = await $.session.usage()
  return toFill(context)
}

export function registerContext(on: On): void {
  // Store it, which redraws the row.
  on('session.measure', async ($, e, next) => {
    const f = toFill(e.context)
    await update($, fill, () => f)
    return next(e)
  })

  // A compaction or /clear empties the window until the next response.
  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    await update($, fill, () => null)
    return result
  }).catch(($, e, next) => next(e))
}
