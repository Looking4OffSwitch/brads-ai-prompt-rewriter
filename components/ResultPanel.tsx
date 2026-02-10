'use client';

interface ResultPanelProps {
  content: string;
  isStreaming: boolean;
}

export default function ResultPanel({ content, isStreaming }: ResultPanelProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Optimized Prompt
      </label>
      <div className="relative">
        <div
          className="w-full min-h-[200px] max-h-[600px] overflow-y-auto px-4 py-3 border border-gray-300 rounded-lg bg-white font-mono text-sm whitespace-pre-wrap"
        >
          {content || (
            <span className="text-gray-400 italic">
              Your optimized prompt will appear here...
            </span>
          )}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-blue-600 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
