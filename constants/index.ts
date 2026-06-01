// ─── Google Sheets ───────────────────────────────────────────────
export const SHEET_ID = '1CVvkZMdjxXG8fBdRJskg3g5fsXMmuzfG6bHdR5WWn9k';

export const SHEET_NAMES = {
  PROJECTS:      'Projects',
  WORKERS:       'Workers',
  EQUIPMENT:     'Equipment',
  BUDGET:        'Budget',
  SCHEDULE:      'Schedule',
  EVM:           'EVM',
  ISSUES:        'Issues',
  DAILY_REPORTS: 'Daily Reports',
} as const;

// ─── Colors ──────────────────────────────────────────────────────
export const COLORS = {
  black:       '#111111',
  darkGray:    '#333333',
  midGray:     '#888888',
  lightGray:   '#f5f5f3',
  border:      '#e0e0e0',
  white:       '#ffffff',
  background:  '#f5f5f3',

  green:       '#1D9E75',
  greenLight:  '#e1f5ee',
  greenDark:   '#0f6e56',

  red:         '#e53935',
  redLight:    '#fce8e8',
  redDark:     '#8b1f1f',

  blue:        '#1a4b8a',
  blueLight:   '#e4edf9',

  yellow:      '#7a4500',
  yellowLight: '#fff3e0',
} as const;

// ─── Typography ──────────────────────────────────────────────────
export const FONT = {
  regular: 'System',
  size: {
    xs:  10,
    sm:  12,
    md:  14,
    lg:  16,
    xl:  20,
    xxl: 26,
  },
} as const;

// ─── Status helpers ──────────────────────────────────────────────
export const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  'On Track':    { bg: COLORS.greenLight,  text: COLORS.greenDark },
  'Active':      { bg: COLORS.blueLight,   text: COLORS.blue },
  'Delayed':     { bg: COLORS.redLight,    text: COLORS.redDark },
  'Done':        { bg: COLORS.greenLight,  text: COLORS.greenDark },
  'In Progress': { bg: COLORS.blueLight,   text: COLORS.blue },
  'Not Started': { bg: COLORS.lightGray,   text: COLORS.midGray },
  'Maintenance': { bg: COLORS.yellowLight, text: COLORS.yellow },
  'Open':        { bg: COLORS.redLight,    text: COLORS.redDark },
  'Resolved':    { bg: COLORS.greenLight,  text: COLORS.greenDark },
};

export const PRIORITY_COLOR: Record<string, { bg: string; text: string }> = {
  'High':   { bg: COLORS.redLight,    text: COLORS.redDark },
  'Medium': { bg: COLORS.yellowLight, text: COLORS.yellow },
  'Low':    { bg: COLORS.greenLight,  text: COLORS.greenDark },
};
