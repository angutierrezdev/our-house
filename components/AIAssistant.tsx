import React, { useState } from 'react';
import { generateChoreSuggestions } from '../services/geminiService';
import { Loader2, Plus } from 'lucide-react';

interface AIAssistantProps {
  onSelect: (chore: { title: string, frequency: string }) => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ onSelect }) => {
  const [context, setContext] = useState('');
  const [suggestions, setSuggestions] = useState<{ title: string, frequency: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!context.trim()) return;
    setLoading(true);
    try {
      const results = await generateChoreSuggestions(context);
      setSuggestions(results);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 mb-4">
      <p className="text-xs text-purple-800 mb-2 font-medium">Describe your household (e.g., "couple with a cat", "family of 5")</p>
      <div className="flex gap-2">
        <input 
          type="text" 
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Enter details..."
          className="flex-1 text-sm px-2 py-1.5 border border-purple-200 rounded focus:outline-none focus:border-purple-400"
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
        />
        <button 
          onClick={handleGenerate}
          disabled={loading || !context}
          className="bg-purple-600 text-white text-xs px-3 py-1.5 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(s)}
              className="w-full text-left flex items-center justify-between p-2 hover:bg-purple-100 rounded group transition-colors"
            >
              <span className="text-sm text-gray-800 font-medium">{s.title}</span>
              <span className="text-xs text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200 group-hover:border-purple-200">
                {s.frequency}
              </span>
              <Plus className="w-3 h-3 text-purple-600 opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIAssistant;