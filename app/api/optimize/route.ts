import { NextRequest, NextResponse } from 'next/server';
import { anthropic, MODEL, MAX_TOKENS } from '@/lib/anthropic';
import { OPTIMIZER_SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompts';
import { isRateLimited } from '@/lib/rate-limit';
import { MAX_PROMPT_LENGTH, ERROR_MESSAGES } from '@/lib/constants';
import { generateRequestId, logInfo, logWarn, logError, logTiming } from '@/lib/logger';
import { sanitizeInput, isValidUtf8, getClientIp } from '@/lib/validation';
import { getAuthenticatedUser } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/optimize
 * Optimizes a prompt using Claude with streaming response
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Get authenticated user from session
  const session = getAuthenticatedUser(req);
  const username = session?.username || 'unknown';
  const displayName = session?.displayName || username;

  try {
    // Parse request body
    const body = await req.json();
    let { role, prompt } = body;

    // Validate input types
    if (!role || typeof role !== 'string' || role.trim().length === 0) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.MISSING_ROLE },
        { status: 400 }
      );
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.MISSING_PROMPT },
        { status: 400 }
      );
    }

    // Validate length before sanitization
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.PROMPT_TOO_LONG },
        { status: 400 }
      );
    }

    // Validate UTF-8 encoding
    if (!isValidUtf8(role) || !isValidUtf8(prompt)) {
      return NextResponse.json(
        { error: 'Invalid character encoding' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    role = sanitizeInput(role);
    prompt = sanitizeInput(prompt);

    // Re-validate after sanitization
    if (role.trim().length === 0 || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Input contains only invalid characters' },
        { status: 400 }
      );
    }

    // Build the user message that will be sent to the API
    const userMessage = buildUserPrompt(role, prompt);

    // Log the full prompt for auditing and debugging
    logInfo('Received optimization request', {
      requestId,
      username,
      displayName,
      role: role,
      prompt: prompt,
      roleLength: role.length,
      promptLength: prompt.length,
      userMessage: userMessage, // Log the exact message sent to API
    });

    // Rate limiting with proper IP detection
    const ip = getClientIp(req.headers);

    if (isRateLimited(ip)) {
      logWarn('Rate limit exceeded', { requestId, username, displayName, ip });
      return NextResponse.json(
        { error: ERROR_MESSAGES.RATE_LIMITED },
        { status: 429 }
      );
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      logError('ANTHROPIC_API_KEY is not configured', undefined, { requestId, username });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVICE_CONFIG_ERROR },
        { status: 500 }
      );
    }

    // Log start of streaming
    logInfo('Starting Anthropic API stream', {
      requestId,
      username,
      displayName,
      ip,
      model: MODEL,
    });

    // Create the streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const streamStartTime = Date.now();
        let tokenCount = 0;
        let optimizedOutput = ''; // Accumulate the full output for logging

        try {
          // Call Anthropic API with streaming
          const messageStream = await anthropic.messages.create({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: OPTIMIZER_SYSTEM_PROMPT,
            messages: [
              {
                role: 'user',
                content: userMessage,
              },
            ],
            stream: true,
          });

          // Process the stream
          for await (const event of messageStream) {
            // Handle content block deltas (the actual text)
            if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                const text = event.delta.text;
                optimizedOutput += text; // Accumulate for logging
                tokenCount += text.length; // Rough approximation
                const sseData = `data: ${JSON.stringify({ text })}\n\n`;
                controller.enqueue(encoder.encode(sseData));
              }
            }

            // Handle stream end
            if (event.type === 'message_stop') {
              const streamDuration = Date.now() - streamStartTime;

              // Log the complete optimized output and original input for comparison
              logInfo('Optimization completed', {
                requestId,
                username,
                displayName,
                ip,
                userPrompt: prompt, // Original user prompt
                userRole: role, // Original user role
                llmResponse: optimizedOutput, // Complete LLM response
                approximateTokens: tokenCount,
                streamDuration,
              });

              logTiming('Anthropic API stream', streamDuration, {
                requestId,
                username,
                displayName,
                ip,
                approximateTokens: tokenCount,
              });
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }
          }

          // Fallback close if message_stop wasn't received
          const streamDuration = Date.now() - streamStartTime;
          logWarn('Stream ended without message_stop event', {
            requestId,
            username,
            displayName,
            ip,
            optimizedOutput: optimizedOutput, // Log output even in fallback case
            streamDuration,
          });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error: any) {
          logError('Anthropic API error', error, { requestId, username, displayName, ip });

          // Send error through the stream
          const errorMessage = error.message || 'An unexpected error occurred';
          const sseError = `data: ${JSON.stringify({ error: errorMessage })}\n\n`;
          controller.enqueue(encoder.encode(sseError));
          controller.close();
        }
      },
    });

    // Return the stream with appropriate headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    logError('Request handling error', error, { requestId, username });
    return NextResponse.json(
      { error: ERROR_MESSAGES.GENERIC_ERROR },
      { status: 500 }
    );
  } finally {
    const totalDuration = Date.now() - startTime;
    logTiming('Total request', totalDuration, { requestId, username });
  }
}
