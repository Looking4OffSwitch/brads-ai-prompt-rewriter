/**
 * Application-wide constants
 * Centralized configuration values for consistency across the codebase
 */

// Input validation
export const MAX_PROMPT_LENGTH = 10000; // Maximum characters for prompt input

// Rate limiting (used in lib/rate-limit.ts)
export const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 10; // Requests per window per IP

// API configuration
export const API_TIMEOUT_MS = 30_000; // 30 second timeout for API requests

// Error messages
export const ERROR_MESSAGES = {
  MISSING_ROLE: 'Please enter a role',
  MISSING_PROMPT: 'Please enter a prompt',
  PROMPT_TOO_LONG: `Prompt is too long (max ${MAX_PROMPT_LENGTH.toLocaleString()} characters)`,
  RATE_LIMITED: 'Too many requests. Please wait 60 seconds and try again.',
  SERVICE_CONFIG_ERROR: 'Service configuration error. Please contact support.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT_ERROR: 'Request timed out. Please check your connection and retry.',
  OFFLINE_ERROR: 'You appear to be offline. Please check your internet connection.',
  STREAM_ERROR: 'Failed to read response stream',
  NO_RESULT: 'No optimization was generated. Try rephrasing your prompt.',
} as const;

// UI configuration
export const AUTO_COPY_DELAY_MS = 2000; // How long to show copy confirmation
export const RESULT_PANEL_MIN_HEIGHT = 200; // Minimum height in pixels
export const RESULT_PANEL_MAX_HEIGHT = 600; // Maximum height in pixels
