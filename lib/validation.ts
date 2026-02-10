/**
 * Input validation and sanitization utilities
 */

/**
 * Sanitize user input by removing control characters and limiting special characters
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  // Remove control characters (except newlines and tabs)
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize whitespace (but preserve newlines)
  sanitized = sanitized.replace(/\r\n/g, '\n'); // Windows line endings
  sanitized = sanitized.replace(/\r/g, '\n'); // Old Mac line endings

  // Trim excessive consecutive whitespace (but preserve structure)
  sanitized = sanitized.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
  sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n'); // Max 3 consecutive newlines

  return sanitized.trim();
}

/**
 * Validate that a string contains only valid UTF-8 characters
 * @param input - The string to validate
 * @returns true if valid, false otherwise
 */
export function isValidUtf8(input: string): boolean {
  try {
    // Try to encode and decode the string
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const bytes = encoder.encode(input);
    decoder.decode(bytes);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract IP address from request headers, with proper precedence
 * @param headers - Request headers
 * @returns IP address or 'unknown'
 */
export function getClientIp(headers: Headers): string {
  // Vercel provides these headers in order of preference
  const forwardedFor = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const cfConnectingIp = headers.get('cf-connecting-ip'); // Cloudflare

  // x-forwarded-for can be a comma-separated list, take the first (original client)
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    if (ips[0]) {
      return ips[0];
    }
  }

  // Cloudflare's header
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Real IP header
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Validate string length is within bounds
 * @param input - The string to check
 * @param maxLength - Maximum allowed length
 * @returns true if valid, false otherwise
 */
export function isValidLength(input: string, maxLength: number): boolean {
  return input.length <= maxLength;
}
