import { Check } from 'lucide-react';

// Predefined color themes
export const COLOR_THEMES = [
  { name: 'Forest Green', value: '#2e5023', light: '#ecfdf3' },
  { name: 'Ocean Blue', value: '#0369a1', light: '#e0f2fe' },
  { name: 'Royal Purple', value: '#7c3aed', light: '#f3e8ff' },
  { name: 'Sunset Orange', value: '#ea580c', light: '#ffedd5' },
  { name: 'Ruby Red', value: '#dc2626', light: '#fee2e2' },
  { name: 'Amber Gold', value: '#d97706', light: '#fef3c7' },
  { name: 'Emerald', value: '#059669', light: '#d1fae5' },
  { name: 'Sky Blue', value: '#0284c7', light: '#e0f2fe' },
  { name: 'Pink Rose', value: '#db2777', light: '#fce7f3' },
  { name: 'Indigo', value: '#4f46e5', light: '#e0e7ff' },
  { name: 'Teal', value: '#0d9488', light: '#ccfbf1' },
  { name: 'Slate Gray', value: '#475569', light: '#f1f5f9' },
];

export default function ColorPicker({ selectedColor, onColorChange, label = 'Choose Color' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="grid grid-cols-4 gap-2">
        {COLOR_THEMES.slice(0, 8).map((theme) => (
          <button
            key={theme.value}
            type="button"
            onClick={() => onColorChange(theme.value)}
            className="group relative"
            title={theme.name}
          >
            <div
              className={`w-full h-11 rounded-lg transition-all ${
                selectedColor === theme.value
                  ? 'ring-2 ring-offset-2 ring-gray-900'
                  : 'hover:scale-105 hover:shadow-md border-2 border-gray-200'
              }`}
              style={{ backgroundColor: theme.value }}
            >
              {selectedColor === theme.value && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white drop-shadow-lg" strokeWidth={3} />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
