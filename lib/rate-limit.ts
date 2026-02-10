/**
 * Simple in-memory rate limiter using sliding window algorithm
 *
 * IMPORTANT: This rate limiter uses in-memory storage and is suitable for:
 * - Local development
 * - Single-instance deployments
 * - Light traffic scenarios
 *
 * LIMITATION: In serverless environments (Vercel, AWS Lambda, etc.), each
 * function invocation may have its own memory space, making this rate limiter
 * less effective. For production serverless deployments with strict rate limiting
 * requirements, consider using:
 * - Vercel KV (Redis)
 * - Upstash Redis
 * - DynamoDB with TTL
 * - Other distributed storage solutions
 */

// Map: IP address → array of request timestamps
const requests = new Map<string, number[]>();

// Rate limit configuration
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute per IP

// Cleanup configuration
const MAX_IPS_IN_MEMORY = 10000; // Prevent unbounded memory growth
const CLEANUP_BATCH_SIZE = 1000; // Clean up in batches

/**
 * Performs on-demand cleanup of old entries to prevent memory leaks
 * This replaces the problematic setInterval approach that doesn't work well in serverless
 */
function cleanupOldEntries(): void {
  const now = Date.now();
  let cleaned = 0;

  // If we're over the limit, do aggressive cleanup
  if (requests.size > MAX_IPS_IN_MEMORY) {
    for (const [ip, timestamps] of requests.entries()) {
      const recent = timestamps.filter(t => now - t < WINDOW_MS);
      if (recent.length === 0) {
        requests.delete(ip);
        cleaned++;
      } else {
        requests.set(ip, recent);
      }

      // Stop after cleaning a batch to avoid blocking
      if (cleaned >= CLEANUP_BATCH_SIZE) {
        break;
      }
    }
  }
}

/**
 * Check if an IP address has exceeded the rate limit
 * @param ip - The IP address to check
 * @returns true if rate limited, false if allowed
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = requests.get(ip) || [];

  // Remove timestamps outside the sliding window
  const recentTimestamps = timestamps.filter(t => now - t < WINDOW_MS);

  // Check if limit exceeded
  if (recentTimestamps.length >= MAX_REQUESTS) {
    return true;
  }

  // Record this request
  recentTimestamps.push(now);
  requests.set(ip, recentTimestamps);

  // Perform periodic cleanup on-demand (every ~10% of requests)
  if (Math.random() < 0.1) {
    cleanupOldEntries();
  }

  return false;
}

/**
 * Get the number of requests remaining for an IP
 * Useful for providing feedback to users
 * @param ip - The IP address to check
 * @returns Number of requests remaining in the current window
 */
export function getRemainingRequests(ip: string): number {
  const now = Date.now();
  const timestamps = requests.get(ip) || [];
  const recentTimestamps = timestamps.filter(t => now - t < WINDOW_MS);
  return Math.max(0, MAX_REQUESTS - recentTimestamps.length);
}
