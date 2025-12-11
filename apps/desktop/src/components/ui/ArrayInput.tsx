import { useState, KeyboardEvent } from 'react';
import { Input } from './Input';
import { Button } from './Button';

interface ArrayInputProps {
    label: string;
    placeholder?: string;
    values: string[];
    onChange: (values: string[]) => void;
    maxItems?: number;
}

export function ArrayInput({
    label,
    placeholder = 'Add item...',
    values,
    onChange,
    maxItems = 20
}: ArrayInputProps) {
    const [inputValue, setInputValue] = useState('');

    const handleAdd = () => {
        const trimmed = inputValue.trim();
        if (trimmed && !values.includes(trimmed) && values.length < maxItems) {
            onChange([...values, trimmed]);
            setInputValue('');
        }
    };

    const handleRemove = (item: string) => {
        onChange(values.filter((v) => v !== item));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
                {label}
            </label>
            <div className="flex gap-2 mb-2">
                <Input
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <Button
                    variant="secondary"
                    onClick={handleAdd}
                    disabled={values.length >= maxItems}
                >
                    Add
                </Button>
            </div>
            {values.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {values.map((item) => (
                        <span
                            key={item}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium"
                        >
                            {item}
                            <button
                                onClick={() => handleRemove(item)}
                                className="text-amber-600 hover:text-amber-800 transition-colors ml-1"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                    ))}
                </div>
            )}
            {values.length >= maxItems && (
                <p className="text-xs text-surface-500 mt-1">Maximum of {maxItems} items reached</p>
            )}
        </div>
    );
}
