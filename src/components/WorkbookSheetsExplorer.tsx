import React, { useState, useMemo } from 'react';
import { AllWorkbookSheetsData, FlipkartWorkbookSummary, ColumnMappingState } from '../types/recon';
import { formatINR } from '../utils/reconciliationEngine';
import { indexToExcelCol } from '../utils/columnFinder';
import { 
  FileSpreadsheet, 
  Search, 
  Download, 
  ArrowUpDown, 
  Layers, 
  Megaphone, 
  Receipt, 
  PackageCheck, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface WorkbookSheetsExplorerProps {
  allSheetsData: AllWorkbookSheetsData;
  activeSheet: string;
  onSelectSheet: (sheetName: string) => void;
  onNavigateToOrders: () => void;
  onNavigateToSku: () => void;
}

export const WorkbookSheetsExplorer: React.FC<WorkbookSheetsExplorerProps> = ({
  allSheetsData,
  activeSheet,
  onSelectSheet,
  onNavigateToOrders,
  onNavigateToSku,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const currentSheet = allSheetsData[activeSheet] || {
    name: activeSheet,
    headers: [],
    rows: [],
    count: 0,
  };

  // Filter rows based on search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return currentSheet.rows;
    const q = searchQuery.toLowerCase();
    return currentSheet.rows.filter(row => {
      if (!Array.isArray(row)) return false;
      return row.some(cell => String(cell || '').toLowerCase().includes(q));
    });
  }, [currentSheet.rows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Compute summary stats if viewing Ads or GST_Details
  const sheetStats = useMemo(() => {
    if (/^ads$/i.test(activeSheet)) {
      let totalRedeem = 0;
      let totalGst = 0;
      currentSheet.rows.forEach(r => {
        const val = parseFloat(String(r[6] || 0)); // Col G
        const gst = parseFloat(String(r[10] || 0)); // Col K
        if (!isNaN(val)) totalRedeem += val;
        if (!isNaN(gst)) totalGst += gst;
      });
      return { totalRedeem, totalGst };
    }
    if (/^gst_details$/i.test(activeSheet)) {
      let totalGstAmount = 0;
      currentSheet.rows.forEach(r => {
        const amt = parseFloat(String(r[16] || 0)); // Col Q
        if (!isNaN(amt)) totalGstAmount += amt;
      });
      return { totalGstAmount };
    }
    return null;
  }, [activeSheet, currentSheet.rows]);

  const handleDownloadCsv = () => {
    if (currentSheet.headers.length === 0) return;
    const headerLine = currentSheet.headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
    const rowLines = filteredRows.map(row => 
      currentSheet.headers.map((_, i) => `"${String(row[i] || '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headerLine, ...rowLines].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeSheet}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sheetKeys = Object.keys(allSheetsData);

  return (
    <div className="space-y-6">
      {/* 16 Sheet Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Flipkart Workbook Sheets ({sheetKeys.length})
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Click any sheet to inspect its raw table and transactions
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {sheetKeys.map(name => {
            const sheet = allSheetsData[name];
            const isSelected = name.toLowerCase() === activeSheet.toLowerCase();
            const isOrders = /^orders$/i.test(name);
            const isAds = /^ads$/i.test(name);
            const isGst = /^gst_details$/i.test(name);
            const isSummary = /summary/i.test(name);

            return (
              <button
                key={name}
                onClick={() => {
                  onSelectSheet(name);
                  setCurrentPage(1);
                  setSearchQuery('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : isOrders
                    ? 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                    : isAds
                    ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                    : isGst
                    ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    : isSummary
                    ? 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {isOrders && <PackageCheck className="w-3.5 h-3.5" />}
                {isAds && <Megaphone className="w-3.5 h-3.5" />}
                {isGst && <Receipt className="w-3.5 h-3.5" />}
                {isSummary && <FileSpreadsheet className="w-3.5 h-3.5" />}
                <span>{name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700 font-semibold'
                }`}>
                  {sheet.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Special Quick Action Banner if on 'Orders' sheet */}
      {/^orders$/i.test(activeSheet) && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                Primary Orders Reconciliation Sheet ({currentSheet.count.toLocaleString('en-IN')} Orders)
              </div>
              <p className="text-xs text-slate-600">
                Columns A to BX auto-mapped. View SKU-level profitability, formula inspector, and return analysis in dedicated views.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onNavigateToOrders}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              Reconciliation Dashboard
            </button>
            <button
              onClick={onNavigateToSku}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              SKU Profit / Loss
            </button>
          </div>
        </div>
      )}

      {/* Special Highlights for 'Ads' sheet */}
      {sheetStats && 'totalRedeem' in sheetStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1">
              <Megaphone className="w-4 h-4 text-amber-600" />
              Total Wallet Redemption on Flipkart Ads
            </div>
            <div className="text-2xl font-bold font-mono text-rose-600">
              {formatINR(sheetStats.totalRedeem || 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Deducted across {currentSheet.count} advertising transactions
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1">
              <Receipt className="w-4 h-4 text-emerald-600" />
              18% GST on Ads Fees
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-700">
              {formatINR(sheetStats.totalGst || 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Eligible for Input Tax Credit in monthly GSTR-2B filing
            </div>
          </div>
        </div>
      )}

      {/* Special Highlights for 'GST_Details' sheet */}
      {sheetStats && 'totalGstAmount' in sheetStats && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-indigo-600" />
              Total GST Amount on Marketplace Fees ({currentSheet.count.toLocaleString('en-IN')} Lines)
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {formatINR(sheetStats.totalGstAmount || 0)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Line-by-line CGST, SGST, IGST breakdown across Commission, Shipping, Fixed, and Collection fees
            </div>
          </div>
          <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3 max-w-sm">
            <div className="font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              GSTR-2B Reconciliation Ready
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">
              Filter by Fee Name or Order Item ID to match your monthly GST portal invoice statements.
            </div>
          </div>
        </div>
      )}

      {/* Sheet Table Viewer */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Table controls */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={`Search in "${activeSheet}"...`}
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <span className="text-xs text-slate-500 font-mono shrink-0">
              Showing {filteredRows.length} of {currentSheet.count} rows
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export Sheet CSV
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-12 text-slate-400 text-center font-mono">#</th>
                {currentSheet.headers.map((h, i) => (
                  <th key={i} className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <span className="text-indigo-600 font-bold bg-indigo-50 px-1 py-0.2 rounded border border-indigo-100">
                        {indexToExcelCol(i)}
                      </span>
                      <span>{h}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-xs">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(1, currentSheet.headers.length + 1)}
                    className="py-12 text-center text-slate-400"
                  >
                    No rows found in this sheet.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, rIdx) => {
                  const globalRowIdx = (currentPage - 1) * pageSize + rIdx + 1;
                  return (
                    <tr key={rIdx} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {globalRowIdx}
                      </td>
                      {currentSheet.headers.map((_, cIdx) => {
                        const cellVal = row[cIdx];
                        const displayVal = cellVal !== undefined && cellVal !== null ? String(cellVal) : '';
                        const isNumber = !isNaN(parseFloat(displayVal)) && isFinite(Number(displayVal)) && displayVal.trim() !== '';
                        const isNegative = isNumber && parseFloat(displayVal) < 0;

                        return (
                          <td
                            key={cIdx}
                            className={`py-2 px-3 whitespace-nowrap text-[11px] ${
                              isNegative ? 'text-rose-600 font-semibold' : ''
                            }`}
                          >
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Page <span className="font-semibold text-slate-800">{currentPage}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalPages}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
