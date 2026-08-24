import React from 'react';
import { ShieldAlert, AlertTriangle, Clock, CheckSquare, Sparkles, Info } from 'lucide-react';

interface SynthesizedIntelligenceCardProps {
  summary?: string | null;
  compact?: boolean;
}

export interface ParsedIntelligence {
  suggestedSeverity?: string;
  suggestedCategory?: string;
  estimatedResolutionHours?: number;
  slaBreachRiskPct?: number;
  actionPlan?: string[];
  rationale?: string;
  isMock?: boolean;
  rawText?: string;
}

export function parseIntelligenceSummary(summary?: string | null): ParsedIntelligence | null {
  if (!summary || typeof summary !== 'string' || summary.trim() === '') {
    return null;
  }

  const trimmed = summary.trim();

  // Try parsing JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const isMock =
        Boolean(parsed.rationale?.toLowerCase().includes('mock')) ||
        Boolean(parsed.rationale?.toLowerCase().includes('simulated'));

      return {
        suggestedSeverity: parsed.suggestedSeverity,
        suggestedCategory: parsed.suggestedCategory,
        estimatedResolutionHours: parsed.estimatedResolutionHours,
        slaBreachRiskPct: parsed.slaBreachRiskPct,
        actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan : [],
        rationale: parsed.rationale,
        isMock,
      };
    } catch {
      // JSON parse failed, fall through to raw string
    }
  }

  // Fallback for plain text / markdown summaries
  const isMock = trimmed.toLowerCase().includes('mock');
  return {
    rawText: trimmed,
    isMock,
  };
}

export const SynthesizedIntelligenceCard: React.FC<SynthesizedIntelligenceCardProps> = ({
  summary,
  compact = false,
}) => {
  const parsed = parseIntelligenceSummary(summary);

  if (!parsed) {
    return (
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 italic">
        Awaiting agentic pipeline completion...
      </div>
    );
  }

  // Compact Mode (used in card lists / grid previews)
  if (compact) {
    if (parsed.rawText) {
      return <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">{parsed.rawText}</p>;
    }

    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {parsed.suggestedSeverity && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                parsed.suggestedSeverity === 'CRITICAL'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : parsed.suggestedSeverity === 'HIGH'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-teal-50 text-teal-700 border-teal-200'
              }`}
            >
              {parsed.suggestedSeverity} Risk
            </span>
          )}
          {parsed.suggestedCategory && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {parsed.suggestedCategory}
            </span>
          )}
          {parsed.isMock && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
              ⚡ Simulated AI
            </span>
          )}
        </div>
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {parsed.rationale || (parsed.actionPlan && parsed.actionPlan[0]) || 'AI Operational Risk Evaluation complete.'}
        </p>
      </div>
    );
  }

  // Full Detailed Card (used in inspection modal & reports)
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4.5 shadow-xs space-y-3.5">
      {/* Header with Title & Simulated Flag */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
            Synthesized Inspection Intelligence
          </span>
        </div>

        {parsed.isMock && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
            <Info className="w-3 h-3 text-amber-600" />
            <span>Simulated Reasoning (Mock Provider)</span>
          </div>
        )}
      </div>

      {parsed.rawText ? (
        <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
          {parsed.rawText}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Metadata Badges & Risk KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Severity Pill */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Risk Classification
              </span>
              <div className="flex items-center gap-1.5">
                {parsed.suggestedSeverity === 'CRITICAL' ? (
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
                <span
                  className={`text-xs font-black uppercase ${
                    parsed.suggestedSeverity === 'CRITICAL'
                      ? 'text-rose-700'
                      : parsed.suggestedSeverity === 'HIGH'
                      ? 'text-amber-700'
                      : 'text-teal-700'
                  }`}
                >
                  {parsed.suggestedSeverity || 'EVALUATED'}
                </span>
              </div>
            </div>

            {/* SLA Breach Risk Meter */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span>SLA Breach Risk</span>
                <span className="font-mono text-slate-800 font-bold">{parsed.slaBreachRiskPct || 0}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (parsed.slaBreachRiskPct || 0) > 40 ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, parsed.slaBreachRiskPct || 0)}%` }}
                />
              </div>
            </div>

            {/* Estimated Resolution */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Est. Resolution
              </span>
              <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-xs">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>{parsed.estimatedResolutionHours || 2} Hours</span>
              </div>
            </div>
          </div>

          {/* Operational Rationale */}
          {parsed.rationale && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">
                Engineering Rationale
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-normal">
                {parsed.rationale}
              </p>
            </div>
          )}

          {/* Recommended Action Plan */}
          {parsed.actionPlan && parsed.actionPlan.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-teal-600" /> Action Plan Checklist
              </span>
              <ul className="space-y-1.5 pl-1">
                {parsed.actionPlan.map((action, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-slate-800 flex items-start gap-2 bg-slate-50 p-2 rounded-md border border-slate-200/80"
                  >
                    <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-tight">{action.replace(/^\d+\.\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
