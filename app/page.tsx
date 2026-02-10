'use client';

import { useState } from 'react';
import RoleInput from '@/components/RoleInput';
import PromptTextarea from '@/components/PromptTextarea';
import OptimizeButton from '@/components/OptimizeButton';
import ResultPanel from '@/components/ResultPanel';
import CopyButton from '@/components/CopyButton';
import ErrorBanner from '@/components/ErrorBanner';
import { MAX_PROMPT_LENGTH, ERROR_MESSAGES, AUTO_COPY_DELAY_MS, API_TIMEOUT_MS } from '@/lib/constants';

export default function Home() {
  const [role, setRole] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [optimizedResult, setOptimizedResult] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showCopyToast, setShowCopyToast] = useState<boolean>(false);

  const handleOptimize = async () => {
    // Clear previous state
    setError(null);
    setOptimizedResult('');
    setIsStreaming(true);

    // Create abort controller for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, API_TIMEOUT_MS);

    try {
      // Make the request with timeout
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role, prompt }),
        signal: abortController.signal,
      });

      // Clear timeout since request succeeded
      clearTimeout(timeoutId);

      // Handle non-streaming error responses
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || ERROR_MESSAGES.GENERIC_ERROR);
        setIsStreaming(false);
        return;
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        setError(ERROR_MESSAGES.STREAM_ERROR);
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          // Process each line
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();

              // Check for completion marker
              if (data === '[DONE]') {
                setIsStreaming(false);

                // Auto-copy to clipboard
                try {
                  await navigator.clipboard.writeText(accumulated);
                  setShowCopyToast(true);
                  setTimeout(() => setShowCopyToast(false), AUTO_COPY_DELAY_MS);
                } catch (copyError) {
                  console.warn('Auto-copy failed:', copyError);
                  // Silently fail - user can still manually copy
                }
                return;
              }

              // Parse and accumulate text
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  accumulated += parsed.text;
                  setOptimizedResult(accumulated);
                } else if (parsed.error) {
                  setError(parsed.error);
                  setIsStreaming(false);
                  return;
                }
              } catch (parseError) {
                // Skip unparseable lines
                continue;
              }
            }
          }
        }

        // Fallback if [DONE] wasn't received
        setIsStreaming(false);
      } finally {
        // Always release the reader lock
        reader.releaseLock();
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Request error:', err);

      // Handle different error types
      if (err.name === 'AbortError') {
        setError(ERROR_MESSAGES.TIMEOUT_ERROR);
      } else if (!navigator.onLine) {
        setError(ERROR_MESSAGES.OFFLINE_ERROR);
      } else {
        setError(ERROR_MESSAGES.NETWORK_ERROR);
      }
      setIsStreaming(false);
    }
  };

  const canOptimize =
    role.trim().length > 0 &&
    prompt.trim().length > 0 &&
    prompt.length <= MAX_PROMPT_LENGTH &&
    !isStreaming;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🧠 AI Prompt Optimizer
          </h1>
          <p className="text-gray-600">
            Transform simple prompts into comprehensive, structured instructions for AI coding assistants
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          {/* Input Section */}
          <div className="space-y-6">
            <RoleInput
              value={role}
              onChange={setRole}
              disabled={isStreaming}
            />

            <PromptTextarea
              value={prompt}
              onChange={setPrompt}
              disabled={isStreaming}
              maxLength={MAX_PROMPT_LENGTH}
            />

            <OptimizeButton
              onClick={handleOptimize}
              disabled={!canOptimize}
              loading={isStreaming}
            />
          </div>

          {/* Results Section */}
          {(optimizedResult || isStreaming) && (
            <>
              <hr className="border-gray-200" />

              <div className="space-y-4">
                <ResultPanel
                  content={optimizedResult}
                  isStreaming={isStreaming}
                />

                {optimizedResult && !isStreaming && (
                  <div className="flex justify-end">
                    <CopyButton text={optimizedResult} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>
            Powered by Anthropic API
          </p>
        </div>

        {/* Toast Notification */}
        {showCopyToast && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up z-50">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="font-medium">Copied to clipboard!</span>
          </div>
        )}
      </div>
    </main>
  );
}
