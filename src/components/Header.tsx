import React from 'react';
import { Upload, ChevronDown, Coins, FileSpreadsheet, PackageCheck, Layers, RotateCcw } from 'lucide-react';

interface HeaderProps {
  activeTab: 'executive' | 'dashboard' | 'sku' | 'sheets' | 'pivot' | 'columns';
  onTabChange: (tab: 'executive' | 'dashboard' | 'sku' | 'sheets' | 'pivot' | 'columns') => void;
  selectedMarketplace: string;
  onMarketplaceChange: (m: string) => void;
  onOpenUpload: () => void;
  onOpenCostUpload: () => void;
  onResetData?: () => void;
  totalRecordsCount: number;
  sheetName?: string;
  fileName?: string;
  configuredCostCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  selectedMarketplace,
  onMarketplaceChange,
  onOpenUpload,
  onOpenCostUpload,
  onResetData,
  totalRecordsCount,
  sheetName,
  fileName,
  configuredCostCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Wordmark & File/Sheet Context */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              onClick={e => {
                e.preventDefault();
                onTabChange(totalRecordsCount > 0 ? 'dashboard' : 'executive');
              }}
              className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
                RP
              </div>
              <span>ReconPulse</span>
            </a>
            <span className="hidden sm:inline text-xs text-slate-400">/</span>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Flipkart Engine</span>
              {totalRecordsCount > 0 ? (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px] font-medium border border-indigo-100">
                    {sheetName ? `Sheet: ${sheetName}` : `${totalRecordsCount} Orders`}
                  </span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200">
                    No Report Loaded
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Zone 2: Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
            <button
              onClick={() => onTabChange('executive')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'executive'
                  ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              Summary of Report
            </button>
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Orders Reconciliation
            </button>
            <button
              onClick={() => onTabChange('sku')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'sku'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              SKU Profit / Loss
            </button>
            <button
              onClick={() => onTabChange('sheets')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'sheets'
                  ? 'bg-amber-50 text-amber-800 font-bold border border-amber-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              16 Sheets Explorer
            </button>
            <button
              onClick={() => onTabChange('pivot')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'pivot'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Excel Pivot
            </button>
            <button
              onClick={() => onTabChange('columns')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'columns'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Column Mapper
            </button>
          </nav>

          {/* Zone 3: Actions (Upload Settlement & Upload Cost Sheet) */}
          <div className="flex items-center gap-2">
            {/* Marketplace dropdown */}
            <div className="relative hidden lg:block">
              <select
                value={selectedMarketplace}
                onChange={e => onMarketplaceChange(e.target.value)}
                className="text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg py-1.5 pl-2.5 pr-8 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                <option value="flipkart">Flipkart (Active)</option>
                <option value="amazon" disabled>Amazon (Roadmap)</option>
                <option value="myntra" disabled>Myntra (Roadmap)</option>
                <option value="tatacliq" disabled>Tata CLiQ (Roadmap)</option>
                <option value="ajio" disabled>AJIO (Roadmap)</option>
                <option value="nykaa" disabled>Nykaa (Roadmap)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Upload Cost Sheet Button */}
            <button
              onClick={onOpenCostUpload}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer ${
                configuredCostCount > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>
                {configuredCostCount > 0 ? `Cost Sheet (${configuredCostCount} SKUs)` : 'Cost Sheet'}
              </span>
            </button>

            {/* Upload Settlement Button */}
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload Settlement</span>
              <span className="sm:hidden">Report</span>
            </button>

            {/* Clear / Reset Data Button (shown when data is loaded) */}
            {totalRecordsCount > 0 && onResetData && (
              <button
                onClick={onResetData}
                title="Wipe current data & start fresh"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Data</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
