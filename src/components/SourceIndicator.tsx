import React, { useState } from 'react';
import { MatchedColumn, ColumnDefinition } from '../types/recon';
import { FLIPKART_COLUMN_DEFINITIONS } from '../utils/columnFinder';

interface SourceIndicatorProps {
  defId: string;
  matchedCol?: MatchedColumn;
  onClick?: (defId: string) => void;
  onOpenModal?: (defId: string) => void;
  className?: string;
}

export const SourceIndicator: React.FC<SourceIndicatorProps> = ({
  defId,
  matchedCol,
  onClick,
  onOpenModal,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const def: ColumnDefinition | undefined = FLIPKART_COLUMN_DEFINITIONS.find(d => d.id === defId);

  const handleClick = (id: string) => {
    if (onClick) onClick(id);
    else if (onOpenModal) onOpenModal(id);
  };

  const colLetter = matchedCol ? matchedCol.sourceColumnLetter : '?';
  const headerName = matchedCol ? matchedCol.sourceHeaderName : 'Not detected';
  const formulaBrief = def?.formula || 'Formula-driven calculation';

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleClick(defId);
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={`Data source for ${def?.label || defId}`}
        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] transition-all transform hover:scale-110 active:scale-95 shadow-xs ${
          matchedCol
            ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200'
            : 'bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white border border-amber-200'
        } ${className}`}
      >
        !
      </button>

      {/* Hover Tooltip showing precise source & formula snippet */}
      {showTooltip && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-slate-900 text-white rounded-lg shadow-xl text-left z-50 pointer-events-none text-xs border border-slate-700 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-1.5">
            <span className="font-semibold text-indigo-300 text-[11px] truncate">
              {def?.label || defId}
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 bg-indigo-950 text-indigo-200 rounded border border-indigo-700">
              Col {colLetter}
            </span>
          </div>

          <div className="space-y-1 text-[11px] text-slate-300">
            <div>
              <span className="text-slate-400">Excel Header: </span>
              <span className="font-mono text-white font-medium">"{headerName}"</span>
            </div>
            <div>
              <span className="text-slate-400">Calculation: </span>
              <span className="text-slate-200 font-sans line-clamp-2">{formulaBrief}</span>
            </div>
          </div>

          <div className="mt-2 pt-1 border-t border-slate-800 text-[10px] text-indigo-400 flex items-center justify-between">
            <span>Click '!' to inspect or remap</span>
            <span className="font-mono font-bold">&rarr;</span>
          </div>

          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};
