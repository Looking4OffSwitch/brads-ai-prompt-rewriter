import Anthropic from '@anthropic-ai/sdk';

/**
 * Initialize the Anthropic SDK client
 * API key is loaded from the ANTHROPIC_API_KEY environment variable
 * This must only be used server-side (never in client components)
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Model to use for prompt optimization
 * claude-sonnet-4-5: Best balance of speed, quality, and cost
 */
export const MODEL = 'claude-sonnet-4-5';

/**
 * Maximum tokens for the response
 */
export const MAX_TOKENS = 16384;
