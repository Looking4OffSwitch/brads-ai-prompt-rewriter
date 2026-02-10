'use client';

interface RoleInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export default function RoleInput({ value, onChange, disabled }: RoleInputProps) {
  const presets = [
    'Software Engineer',
    'Senior Backend Engineer',
    'Frontend Developer',
    'Python Expert',
    'DevOps Engineer',
    'Data Scientist',
    'Technical Writer',
  ];

  return (
    <div className="space-y-2">
      <label htmlFor="role" className="block text-sm font-medium text-gray-700">
        Role / Expertise
      </label>
      <div className="space-y-2">
        <input
          id="role"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="e.g., Senior Backend Engineer, Python Expert, Data Scientist..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              disabled={disabled}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
