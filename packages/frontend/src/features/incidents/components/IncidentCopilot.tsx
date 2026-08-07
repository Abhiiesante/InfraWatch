import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface IncidentCopilotProps {
  incidentId: number;
}

export const IncidentCopilot = ({ incidentId }: IncidentCopilotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startAnalysis = async () => {
    if (isAnalyzing) return;
    
    setIsOpen(true);
    setIsAnalyzing(true);
    setContent('');
    setError(null);
    
    abortControllerRef.current = new AbortController();

    try {
      const API_URL = (import.meta as any).env.VITE_API_URL || '/api';
      // In a real app with auth, you'd include the JWT token here
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/copilot/incident/${incidentId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to start analysis');
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // SSE data chunks come in as: data: {...}\n\n
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') {
              break;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                setContent(prev => prev + data.text);
              }
              if (data.error) {
                setError(data.error);
              }
            } catch (e) {
              // Ignore partial JSON parse errors
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'An error occurred during analysis');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const stopAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAnalyzing(false);
  };

  const closeCopilot = () => {
    stopAnalysis();
    setIsOpen(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return stopAnalysis;
  }, []);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={startAnalysis}
        className={twMerge(
          "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
          "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg",
          "dark:bg-indigo-500 dark:hover:bg-indigo-400"
        )}
      >
        <Sparkles className="w-4 h-4" />
        <span>AI Assist 🪄</span>
      </button>

      {/* Floating Side Drawer */}
      <div 
        className={clsx(
          "fixed top-0 right-0 h-full w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-5 h-5" />
            <h2 className="font-semibold text-lg">InfraWatch Copilot</h2>
          </div>
          <button 
            onClick={closeCopilot}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!content && !error && isAnalyzing && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="animate-pulse">Analyzing incident context...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-lg flex items-start gap-3 text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {content && (
            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
          
          {content && isAnalyzing && (
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Generating...
            </div>
          )}
        </div>
        
        {isAnalyzing && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
             <button 
                onClick={stopAnalysis}
                className="w-full py-2 px-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors font-medium text-sm"
              >
                Stop Generating
              </button>
          </div>
        )}
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 dark:bg-slate-900/50 backdrop-blur-sm z-40"
          onClick={closeCopilot}
        />
      )}
    </>
  );
};
