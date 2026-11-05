import type { CommandKind } from './types'

export const LEVEL1_AVAILABLE_COMMANDS: readonly CommandKind[] = ['ps', 'run']

export const LEVEL2_AVAILABLE_COMMANDS: readonly CommandKind[] = [
  'ps',
  'run',
  'images',
  'history',
  'build',
]

export const DEFAULT_SUPPORTED_COMMANDS = LEVEL1_AVAILABLE_COMMANDS

export const ALL_COMMANDS = LEVEL2_AVAILABLE_COMMANDS
