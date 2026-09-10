export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'system'

export interface ConsoleMessage {
  id: number
  level: ConsoleLevel
  text: string
}

export const RUNNER_MESSAGE_SOURCE = 'mini-replit-runner'

export interface RunnerPostMessage {
  source: typeof RUNNER_MESSAGE_SOURCE
  level: Exclude<ConsoleLevel, 'system'>
  text: string
}
