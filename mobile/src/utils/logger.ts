/**
 * Conditional logger that can be disabled in production.
 * Replaces direct console.log calls throughout the codebase.
 */

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

export const logger = {
  debug: isDev ? (...args: unknown[]) => console.log(...args) : () => {},
  info: isDev ? (...args: unknown[]) => console.info(...args) : () => {},
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
