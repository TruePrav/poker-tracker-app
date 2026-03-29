export const MAX_SEATS_PER_TABLE = 9;
export const CURRENCY_CODE = 'BBD';
export const CURRENCY_SYMBOL = '$';

export const TOURNAMENT_STATUS = {
  SETUP: 'SETUP',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  FINISHED: 'FINISHED',
} as const;

export const ENTRY_STATUS = {
  REGISTERED: 'REGISTERED',
  SEATED: 'SEATED',
  ELIMINATED: 'ELIMINATED',
  FINISHED: 'FINISHED',
} as const;

export const TRANSACTION_TYPE = {
  BUY_IN: 'BUY_IN',
  REBUY: 'REBUY',
  TOP_UP: 'TOP_UP',
  PAYOUT: 'PAYOUT',
} as const;

export const PAYOUT_PRESETS = [
  { label: 'Winner Takes All', splits: [100] },
  { label: 'Top 2 (65/35)', splits: [65, 35] },
  { label: 'Top 3 (50/30/20)', splits: [50, 30, 20] },
  { label: 'Top 3 (60/25/15)', splits: [60, 25, 15] },
  { label: 'Top 4 (45/25/18/12)', splits: [45, 25, 18, 12] },
] as const;

export const TIMER_SYNC_INTERVAL_MS = 30_000;
export const TIMER_TICK_INTERVAL_MS = 100;
