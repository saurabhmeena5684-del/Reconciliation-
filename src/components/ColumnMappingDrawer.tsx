import React from 'react';
import { ColumnMappingState, ColumnDefinition } from '../types/recon';
import { FLIPKART_COLUMN_DEFINITIONS, indexToExcelCol } from '../utils/columnFinder';
import { CheckCircle2, AlertCircle, RefreshCw, Table, HelpCircle, Layers } from 'lucide-react';

interface ColumnMappingDrawerProps {
  mappings: ColumnMappingState;
  allHeaders: string[];
  onUpdateMapping: (defId: string, newHeaderIndex: number) => void;
  onOpenMetricInfo: (defId: string) => void;
}

export const ColumnMappingDrawer: React.FC<ColumnMappingDrawerProps> = ({
  mappings,
  allHeaders,
  onUpdateMapping,
  onOpenMetricInfo,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Table className="w-5 h-5 text-indigo-600" />
              <span>Smart Column Finder & Header Mapper</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Flipkart report formats can vary in column positioning across versions. ReconPulse uses a dynamic multi-alias locator to map required financial fields automatically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200 font-mono">
              {Object.keys(mappings).length} / {FLIPKART_COLUMN_DEFINITIONS.length} Mapped
            </span>
          </div>
        </div>
      </div>

      {/* Mapping Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <th className="py-3 px-4">Flipkart Standard Metric</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Excel Col Position</th>
              <th className="py-3 px-4">Matched Header Name</th>
              <th className="py-3 px-4">Sample Values from Sheet</th>
              <th className="py-3 px-3">Remap Column</th>
              <th className="py-3 px-3 text-center">Formula (!)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {FLIPKART_COLUMN_DEFINITIONS.map(def => {
              const matched = mappings[def.id];
              const isFound = !!matched;

              return (
                <tr key={def.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">
                      {def.label}
                    </div>
                    <div className="text-[11px] text-slate-500 leading-tight">
                      {def.description}
                    </div>
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap">
                    {isFound ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Found
                      </span>
                    ) : def.required ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <AlertCircle className="w-3 h-3" />
                        Missing Required
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Optional (0)
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono tabular-nums">
                    {matched ? (
                      <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-900 rounded font-bold border border-indigo-200 text-xs">
                        Col {matched.sourceColumnLetter} <span className="text-[10px] text-indigo-500 font-normal">(#{matched.sourceColumnIndex + 1})</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">&mdash;</span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-mono font-medium text-slate-800">
                    {matched ? (
                      `"${matched.sourceHeaderName}"`
                    ) : (
                      <span className="text-slate-400 italic">Not matched</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {matched && matched.sampleValues.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {matched.sampleValues.map((val, i) => (
                          <span
                            key={i}
                            className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 truncate max-w-[120px]"
                            title={String(val)}
                          >
                            {String(val)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">&mdash;</span>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    <select
                      value={matched ? matched.sourceColumnIndex : ''}
                      onChange={e => {
                        const val = e.target.value;
                        if (val !== '') {
                          onUpdateMapping(def.id, parseInt(val, 10));
                        }
                      }}
                      className="text-xs font-mono py-1 px-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 w-44"
                    >
                      <option value="">-- Choose Column --</option>
                      {allHeaders.map((header, idx) => (
                        <option key={idx} value={idx}>
                          Col {indexToExcelCol(idx)}: {header}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => onOpenMetricInfo(def.id)}
                      title={`Inspect formula and details for ${def.label}`}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs transition-colors"
                    >
                      !
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
