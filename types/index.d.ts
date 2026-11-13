export type Fill = {
  /** Input tokens the last response was answered over. */
  tokens: number
}

declare module 'claude-code' {
  interface PluginState {
    'prompt-hud': { fill: Fill | null }
  }
}
