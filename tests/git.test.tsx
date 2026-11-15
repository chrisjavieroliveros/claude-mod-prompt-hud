import { expect, test } from 'claude-code/testing'

import { parseStatus } from '../hooks/git'
import { svgs } from '../hooks/gitRow'

type TestOn = Parameters<Extract<Parameters<typeof test>[1], (...args: never[]) => unknown>>[1]

const stubs = (on: TestOn) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 1_000_000 }, rateLimits: [] } }))
  on('clock.every', () => ({ value: undefined as never }))
}

const start = ($: any) => $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

const BAND = (surface: 'desktop' | 'terminal') =>
  ({
    plugin: 'prompt-hud',
    component: 'AbovePrompt',
    surface,
    props: {
      hasSurvey: false,
      isCollapsed: false,
      isWorking: false,
      maxRows: 30,
      bodyColumns: 120,
      scroll: { offset: 0, bodyRows: 30 },
      view: {},
    },
  }) as const

const STATUS = [
  '## main...origin/main [ahead 1]',
  'M  Assets/_Game/Planets/Juno/Zones/DawntidePlains/DawntidePlains.unity',
  'A  Assets/_Game/Shared/Shaders/GroundTop.hlsl',
  ' M README.md',
  'MM Tools/unity.ps1',
  'R  new/name.cs',
  'old/name.cs',
  '?? Staging/',
  '',
].join('\0')

test('porcelain -z parses into staged and working-tree lists like Source Control', () => {
  const s = parseStatus(STATUS)
  expect(s.branch).toBe('main')
  expect(s.staged.map(c => `${c.code} ${c.path}`)).toEqual([
    'M Assets/_Game/Planets/Juno/Zones/DawntidePlains/DawntidePlains.unity',
    'A Assets/_Game/Shared/Shaders/GroundTop.hlsl',
    'M Tools/unity.ps1',
    'R new/name.cs',
  ])
  expect(s.changes.map(c => `${c.code} ${c.path}`)).toEqual(['M README.md', 'M Tools/unity.ps1', 'U Staging/'])
})

test('GIT row starts closed, a press opens the lists and closes them again', async ($, on) => {
  let out = STATUS
  on('process.run', () => ({ value: { exitCode: 0, stdout: out, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  stubs(on)
  await start($)

  const svgAlt = async (ui: any, re: RegExp) =>
    (await ui.findAll({ type: 'Svg' })).some((el: any) => re.test(String(el.props?.alt ?? '')))

  // Desktop: GIT label in CTX's column, the rest 10 px SVG.
  let ui = await $.ui.mount(BAND('desktop'))
  expect(await ui.find({ type: 'Text', text: /^GIT$/ })).toBeDefined()
  expect(await svgAlt(ui, /main: 4 staged, 3 changes/)).toBe(true)
  expect(await svgAlt(ui, /Git changes/)).toBe(false)
  await ui.press({ key: 'git-toggle' })
  expect(await svgAlt(ui, /Git changes/)).toBe(true)
  await ui.press({ key: 'git-toggle' })
  expect(await svgAlt(ui, /Git changes/)).toBe(false)
  await ui.unmount()

  // Terminal: the same in cells.
  ui = await $.ui.mount(BAND('terminal'))
  expect(await ui.find({ type: 'Text', text: /^GIT\s*$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /4 staged/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^STAGED$/ })).toBeUndefined()
  await ui.press({ key: 'git-toggle' })
  expect(await ui.find({ type: 'Text', text: /^STAGED$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /DawntidePlains\.unity/ })).toBeDefined()
  await ui.press({ key: 'git-toggle' })
  expect(await ui.find({ type: 'Text', text: /^STAGED$/ })).toBeUndefined()
  await ui.unmount()

  // A clean tree after a commit.
  out = '## main\0'
  await start($)
  ui = await $.ui.mount(BAND('desktop'))
  expect(await svgAlt(ui, /clean/)).toBe(true)
  expect(await ui.find({ key: 'git-toggle' })).toBeUndefined()
  await ui.unmount()
})

test('outside a git repo there is no GIT row', async ($, on) => {
  on('process.run', () => ({ value: { exitCode: 128, stdout: '', stderr: 'not a git repository', isStdoutTruncated: false, isStderrTruncated: false } }))
  stubs(on)
  await start($)
  const ui = await $.ui.mount(BAND('desktop'))
  expect(await ui.find({ type: 'Text', text: /GIT/ })).toBeUndefined()
  await ui.unmount()
})

test('the list SVG truncates long paths from the start and skips empty lists', () => {
  const { listSvg } = svgs
  const out = listSvg(parseStatus(STATUS)).source
  expect(out).toContain('STAGED')
  expect(out).toContain('DawntidePlains.unity')
  expect(out).toContain('…')
  const clean = listSvg({ branch: 'main', staged: [{ path: 'a.cs', code: 'M' }], changes: [] }).source
  expect(clean).not.toContain('CHANGES')
})
