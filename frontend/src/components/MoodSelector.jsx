import { useState } from 'react';

const MOODS = [
  { value: 'Happy', emoji: '😊' },
  { value: 'Neutral', emoji: '😐' },
  { value: 'Sad', emoji: '😢' },
  { value: 'Energized', emoji: '⚡' },
  { value: 'Thoughtful', emoji: '🤔' }
];

export function MoodSelector({ selectedMood, onMoodSelect }) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        How are you feeling?
      </label>
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            type="button"
            onClick={() => onMoodSelect(mood.value)}
            className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 active:scale-95 min-w-[70px] sm:min-w-[80px] ${
              selectedMood === mood.value
                ? 'border-ll-600 bg-ll-50 shadow-md ring-2 ring-ll-200'
                : 'border-gray-200 hover:border-ll-300 hover:bg-gray-50'
            }`}
            aria-label={`Select ${mood.value} mood`}
            aria-pressed={selectedMood === mood.value}
          >
            <span className="text-2xl sm:text-3xl mb-1">{mood.emoji}</span>
            <span className="text-xs font-medium text-gray-700">{mood.value}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
