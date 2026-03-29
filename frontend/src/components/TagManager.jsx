import { useState } from 'react';

export function TagManager({ tags, onTagAdd, onTagRemove }) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const trimmedValue = inputValue.trim();
      if (trimmedValue && trimmedValue.length <= 50) {
        onTagAdd(trimmedValue);
        setInputValue('');
      }
    }
  };

  const handleRemove = (tag) => {
    onTagRemove(tag);
  };

  return (
    <div className="space-y-3">
      <label htmlFor="tag-input" className="block text-sm font-medium text-gray-700">
        Tags
      </label>
      <input
        id="tag-input"
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Add a tag and press Enter"
        maxLength={50}
        className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white"
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {tags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ll-100 text-ll-800 rounded-full text-sm font-medium transition-all hover:bg-ll-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className="ml-0.5 text-ll-600 hover:text-ll-800 focus:outline-none transition-colors hover:scale-110"
                aria-label={`Remove ${tag} tag`}
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
