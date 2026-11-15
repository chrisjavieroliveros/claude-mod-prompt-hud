export type Fill = {
  /** Input tokens the last response was answered over. */
  tokens: number
}

export type GitChange = {
  /** Repo-relative path, forward slashes. */
  path: string
  /** M modified, A added, D deleted, R renamed, C copied, T type, U untracked, ! conflict. */
  code: string
}

export type GitStatus = {
  /** Current branch ('' when git didn't say). */
  branch: string
  /** In the index (Staged Changes). */
  staged: GitChange[]
  /** In the working tree, untracked included (Changes). */
  changes: GitChange[]
}

declare module 'claude-code' {
  interface PluginState {
    'prompt-hud': { fill: Fill | null; git: GitStatus | null; gitOpen: boolean }
  }
}
