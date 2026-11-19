import { expect, test } from 'claude-code/testing'

import { avatarSvg, lookFor } from '../hooks/avatar'
import { levelFor, short } from '../hooks/register'

const BAND = (surface: 'desktop' | 'terminal', hasSurvey = false) =>
  ({
    plugin: 'prompt-hud',
    component: 'AbovePrompt',
    surface,
    props: {
      hasSurvey,
      isCollapsed: false,
      isWorking: true,
      maxRows: 10,
      bodyColumns: 120,
      scroll: { offset: 0, bodyRows: 10 },
      view: {},
    },
  }) as const

const measure = (tokens: number | undefined, window = 1_000_000) =>
  ({
    context: { tokens, window, percent: tokens === undefined ? undefined : Math.round((tokens / window) * 100) },
    rateLimits: [],
    changed: ['context'],
  }) as never

type TestOn = Parameters<Extract<Parameters<typeof test>[1], (...args: never[]) => unknown>>[1]

const engine = (on: TestOn) => {
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 1_000_000 }, rateLimits: [] } }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  // Another band beneath (split-watch) stays drawn above the row.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>other band</Text>
  })
}

test('CTX shows the tokens only: no percent, no window, no Tasks row', async ($, on) => {
  engine(on)
  await $.session.measure(measure(213_000))

  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount(BAND(surface))
    expect((await ui.find({ type: 'Text', text: /^CTX/ }))?.text).toMatch(/^CTX\s*$/)
    expect((await ui.find({ type: 'Text', text: /^213k$/ }))?.text).toBe('213k')
    expect(await ui.find({ type: 'Text', text: /%|1M|Tasks/ })).toBeUndefined()
    expect((await ui.find({ type: 'Text', text: /other band/ }))?.text).toBe('other band')
    await ui.unmount()
  }
})

test('nothing before the first reply, and a survey takes the band', async ($, on) => {
  engine(on)
  let ui = await $.ui.mount(BAND('desktop'))
  expect(await ui.find({ type: 'Text', text: /CTX/ })).toBeUndefined()
  await ui.unmount()

  await $.session.measure(measure(190_000))
  ui = await $.ui.mount(BAND('desktop', true))
  expect(await ui.find({ type: 'Text', text: /CTX/ })).toBeUndefined()
  await ui.unmount()
})

test('model avatar beside CTX: a 20 px monogram tile on desktop, the letter on the terminal', async ($, on) => {
  engine(on)
  await $.session.measure(measure(120_000))
  let ui = await $.ui.mount(BAND('desktop'))
  const tile = (await ui.findAll({ type: 'Svg' })).find((el: any) => /avatar/.test(String(el.props?.alt ?? ''))) as any
  expect(tile?.props?.alt).toBe('Opus avatar')
  expect(tile?.props?.width).toBe(20)
  await ui.unmount()
  ui = await $.ui.mount(BAND('terminal'))
  expect(await ui.find({ type: 'Text', text: /^O$/ })).toBeDefined()
  await ui.unmount()
})

test('model avatar: the monogram for the four models, none for others', () => {
  expect(['claude-haiku-5-5', 'Sonnet 5.5', 'opus[1m]', 'claude-fable-5-2', 'gpt-x'].map(m => lookFor(m)?.letter ?? null)).toEqual(
    ['H', 'S', 'O', 'F', null],
  )
  const svg = avatarSvg(lookFor('opus')!)
  expect(svg).toMatch(/width="20" height="20"/)
  expect(svg.match(/<rect /g)?.length).toBe(50) // tile + 7×7 cells
})

test('levels by tokens on the 400k scale, and short figures', () => {
  expect([150_000, 220_000, 260_000, 340_000].map(t => levelFor(t).name)).toEqual(['healthy', 'filling up', 'high', 'critical'])
  expect([950, 84_321, 1_000_000, 1_500_000].map(short)).toEqual(['950', '84k', '1M', '1.5M'])
})
