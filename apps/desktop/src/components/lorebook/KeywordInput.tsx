import { useState, type KeyboardEvent } from 'react';

interface KeywordInputProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}

export function KeywordInput({ keywords, onChange }: KeywordInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addKeyword = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      onChange([...keywords, trimmed]);
      setInputValue('');
    }
  };

  const removeKeyword = (keyword: string) => {
    onChange(keywords.filter((k) => k !== keyword));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    } else if (e.key === 'Backspace' && !inputValue && keywords.length > 0) {
      removeKeyword(keywords[keywords.length - 1]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-surface-300 mb-1.5">
        Keywords
      </label>
      <div className="flex flex-wrap gap-2 p-2 bg-surface-800 border border-surface-600 rounded-lg min-h-[42px]">
        {keywords.map((keyword) => (
          <span
            key={keyword}
            className="inline-flex items-center gap-1 px-2 py-1 bg-primary-600/20 text-primary-400 rounded text-sm"
          >
            {keyword}
            <button
              onClick={() => removeKeyword(keyword)}
              className="hover:text-primary-200"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addKeyword}
          placeholder={keywords.length === 0 ? 'Type and press Enter to add...' : ''}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-surface-100 placeholder-surface-500 text-sm"
        />
      </div>
      <p className="mt-1 text-xs text-surface-500">
        Press Enter to add keywords. Entry triggers when any keyword is found in conversation.
      </p>
    </div>
  );
}
