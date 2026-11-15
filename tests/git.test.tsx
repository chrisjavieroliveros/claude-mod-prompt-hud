import { expect, test } from 'claude-code/testing'

import { parseStatus } from '../hooks/git'

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

  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount(BAND(surface))
    expect(await ui.find({ type: 'Text', text: /^GIT$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /4 staged/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /STAGED CHANGES/ })).toBeUndefined()

    await ui.press({ key: 'git-toggle' })
    expect(await ui.find({ type: 'Text', text: /STAGED CHANGES/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /DawntidePlains\.unity/ })).toBeDefined()

    await ui.press({ key: 'git-toggle' })
    expect(await ui.find({ type: 'Text', text: /STAGED CHANGES/ })).toBeUndefined()
    await ui.unmount()
  }

  // A clean tree after a commit.
  out = '## main\0'
  await start($)
  const ui = await $.ui.mount(BAND('desktop'))
  expect(await ui.find({ type: 'Text', text: /clean/ })).toBeDefined()
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
