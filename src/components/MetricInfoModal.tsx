import React from 'react';
import { MatchedColumn, ColumnDefinition } from '../types/recon';
import { FLIPKART_COLUMN_DEFINITIONS } from '../utils/columnFinder';
import { X, CheckCircle2, AlertCircle, RefreshCw, Calculator, Table } from 'lucide-react';

interface MetricInfoModalProps {
  defId: string;
  matchedCol?: MatchedColumn;
  allHeaders: string[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateMapping: (defId: string, newHeaderIndex: number) => void;
}

export const MetricInfoModal: React.FC<MetricInfoModalProps> = ({
  defId,
  matchedCol,
  allHeaders,
  isOpen,
  onClose,
  onUpdateMapping,
}) => {
  if (!isOpen) return null;

  const def: ColumnDefinition | undefined = FLIPKART_COLUMN_DEFINITIONS.find(d => d.id === defId);
  if (!def) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs">
              !
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 leading-tight">
                {def.label}
              </h3>
              <p className="text-xs text-slate-500">Source Column & Formula Inspector</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-sm text-slate-700">
          {/* Formula Section */}
          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 mb-1.5">
              <Calculator className="w-3.5 h-3.5 text-indigo-600" />
              <span>Mathematical Formula</span>
            </div>
            <p className="font-mono text-xs text-indigo-950 bg-white p-2 rounded border border-indigo-100/80 leading-relaxed">
              {def.formula}
            </p>
            <p className="mt-2 text-xs text-slate-500 leading-normal">
              {def.description}
            </p>
          </div>

          {/* Matched Column Source */}
          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Table className="w-3.5 h-3.5 text-emerald-600" />
                <span>Detected Excel Column</span>
              </div>
              {matchedCol ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Auto-Found at Column {matchedCol.sourceColumnLetter} (Col #{matchedCol.sourceColumnIndex + 1})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <AlertCircle className="w-3 h-3" />
                  Not Detected in Current Sheet
                </span>
              )}
            </div>

            {matchedCol ? (
              <div className="bg-white p-2.5 rounded border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Header Name in Sheet:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    "{matchedCol.sourceHeaderName}"
                  </span>
                </div>
                {def.columnGroup && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Official Group in Flipkart Workbook:</span>
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {def.columnGroup} {def.standardColumnLetter ? `(Col ${def.standardColumnLetter})` : ''}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Column Position:</span>
                  <span className="font-medium text-slate-700">
                    Column <strong className="text-indigo-600 font-mono font-bold text-sm">{matchedCol.sourceColumnLetter}</strong> (Index {matchedCol.sourceColumnIndex})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Match Mode:</span>
                  <span className="capitalize text-slate-600 font-mono">
                    {matchedCol.matchType} ({Math.round(matchedCol.confidence * 100)}% match)
                  </span>
                </div>

                {matchedCol.sampleValues && matchedCol.sampleValues.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-400 block mb-1">
                      Sample Values from Uploaded Sheet:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {matchedCol.sampleValues.map((val, i) => (
                        <span
                          key={i}
                          className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200"
                        >
                          {String(val)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                This column could not be automatically located. You can manually map it from the list of sheet columns below.
              </p>
            )}
          </div>

          {/* Manual Column Re-mapping */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Change / Re-map to another column in your sheet:
            </label>
            <div className="flex items-center gap-2">
              <select
                value={matchedCol ? matchedCol.sourceColumnIndex : ''}
                onChange={e => {
                  const val = e.target.value;
                  if (val !== '') {
                    onUpdateMapping(defId, parseInt(val, 10));
                  }
                }}
                className="w-full text-xs font-mono py-2 px-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
              >
                <option value="">-- Select Sheet Column --</option>
                {allHeaders.map((header, idx) => (
                  <option key={idx} value={idx}>
                    Col {String.fromCharCode(65 + (idx % 26))} (Col #{idx + 1}): {header}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Supports older Flipkart reports where columns like "Payment Date" moved from Column C to Column D.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
