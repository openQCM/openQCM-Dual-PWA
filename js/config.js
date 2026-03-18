/** Constants — translated from config.py + style.py color palette. */

// Serial
export const BAUDRATE = 9600;

// QCM acquisition
export const GATE_TIME = 0.5;   // seconds between samples
export const BUFFER_SIZE = 10;  // circular buffer for moving average

// TEC temperature control
export const TEC_TEMP_MIN = 5.0;
export const TEC_TEMP_MAX = 45.0;
export const TEC_TEMP_DEFAULT = 25.0;
export const TEC_TEMP_DECIMALS = 3;

// Color palette (matches Python dark theme)
export const COLORS = {
  BG:           '#1e1e2e',
  SURFACE:      '#282838',
  BORDER:       '#3a3a4a',
  TEXT:         '#cdd6f4',
  TEXT_DIM:     '#7f849c',
  ACCENT:       '#89b4fa',
  ACCENT_HOVER: '#74c7ec',
  RED:          '#f38ba8',
  GREEN:        '#a6e3a1',
  YELLOW:       '#f9e2af',
};
