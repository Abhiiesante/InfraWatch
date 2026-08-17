import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InspectionCopilotProps {
  inspectionId: number;
}

export const InspectionCopilot = ({ inspectionId }: InspectionCopilotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startAnalysis = async () => {
    if (isAnalyzing) return;
    
    setIsOpen(true);
    setIsAnalyzing(true);
    setContent('');
    setError(null);
    setIsSimulated(false);
    
    abortControllerRef.current = new AbortController();

    try {
      const API_URL = (import.meta as any).env.VITE_API_URL || '/api';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/copilot/inspection/${inspectionId}/analyze`, {
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

      let currentEvent = 'message';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.replace('event: ', '').trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') {
              break;
            }
            try {
              const data = JSON.parse(dataStr);
              if (currentEvent === 'metadata') {
                if (data.simulated) setIsSimulated(true);
              } else {
                if (data.text) {
                  setContent(prev => prev + data.text);
                }
                if (data.error) {
                  setError(data.error);
                }
              }
            } catch (e) {
              // Ignore partial JSON parse errors
            }
            currentEvent = 'message'; // reset
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

  useEffect(() => {
    return stopAnalysis;
  }, []);

  return (
    <>
      <button
        onClick={startAnalysis}
        className={twMerge(
          "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
          "bg-[rgba(127,184,176,0.85)] hover:bg-indigo-700 text-slate-800  hover:shadow-lg",
          "dark:bg-[rgba(127,184,176,0.12)]0"
        )}
      >
        <Sparkles className="w-4 h-4" />
        <span>Summarize Inspection 🪄</span>
      </button>

      <div 
        className={clsx(
          "fixed top-0 right-0 h-full w-full max-w-md glass-panel/80 backdrop-blur-xl border-l border-[rgba(255,255,255,0.80)] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col border-b border-[rgba(255,255,255,0.80)] bg-[rgba(255,255,255,0.55)]">
          {isSimulated && (
            <div className="bg-amber-500/90 text-black text-[10px] font-bold px-4 py-1.5 flex justify-center tracking-wide">
              ⚠ SIMULATED — NO AI CONNECTED (GEMINI_API_KEY missing)
            </div>
          )}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2 text-[#7FB8B0]">
              <Sparkles className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Inspection Copilot</h2>
            </div>
            <button 
              onClick={closeCopilot}
              className="p-2 text-slate-800/70 hover:text-slate-800 transition-colors rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!content && !error && isAnalyzing && (
            <div className="flex flex-col items-center justify-center h-full text-slate-800/70 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
              <p className="animate-pulse">Analyzing inspection context...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-rose-700">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {content && (
            <div className="prose prose-sm prose-slate max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
          
          {content && isAnalyzing && (
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[rgba(127,184,176,0.12)]0"></span>
              </span>
              Generating...
            </div>
          )}
        </div>
        
        {isAnalyzing && (
          <div className="p-4 bg-transparent border-t border-[rgba(255,255,255,0.80)]">
             <button 
                onClick={stopAnalysis}
                className="w-full py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors font-medium text-sm"
              >
                Stop Generating
              </button>
          </div>
        )}
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
          onClick={closeCopilot}
        />
      )}
    </>
  );
};
