'use client';

import { useEffect, useRef } from 'react';

interface PromptTextareaProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  maxLength: number;
}

export default function PromptTextarea({
  value,
  onChange,
  disabled,
  maxLength,
}: PromptTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  const isNearLimit = value.length > maxLength * 0.9;
  const isOverLimit = value.length > maxLength;

  return (
    <div className="space-y-2">
      <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
        Your Prompt
      </label>
      <textarea
        ref={textareaRef}
        id="prompt"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="How do I know if a Python package is safe to use?"
        rows={6}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
      />
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500">
          Tip: Be as specific or as general as you like
        </span>
        <span
          className={`font-medium ${
            isOverLimit
              ? 'text-red-600'
              : isNearLimit
              ? 'text-orange-600'
              : 'text-gray-500'
          }`}
        >
          {value.length} / {maxLength.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
