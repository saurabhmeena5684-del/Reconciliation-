import React, { useState } from 'react';
import { FilterState, SkuSummary, ColumnMappingState } from '../types/recon';
import { 
  Search, 
  RotateCcw, 
  SlidersHorizontal, 
  ArrowUpDown, 
  ChevronDown, 
  ChevronUp,
  Package,
  Sparkles,
  Coins
} from 'lucide-react';
import { SourceIndicator } from './SourceIndicator';

interface DateSkuFilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  skuList: SkuSummary[];
  columnMappings: ColumnMappingState;
  minDetectedDate?: string;
  maxDetectedDate?: string;
  onOpenMetricInfo: (defId: string) => void;
  onOpenCostUpload: () => void;
  hasCostConfigured: boolean;
}

export const DateSkuFilterBar: React.FC<DateSkuFilterBarProps> = ({
  filters,
  onFilterChange,
  skuList,
  columnMappings,
  minDetectedDate,
  maxDetectedDate,
  onOpenMetricInfo,
  onOpenCostUpload,
  hasCostConfigured,
}) => {
  const [showAdvancedExcelFilters, setShowAdvancedExcelFilters] = useState(false);

  const handleDatePreset = (preset: 'all' | 'last7' | 'last30' | 'thisMonth') => {
    if (preset === 'all') {
      onFilterChange({
        startDate: minDetectedDate || '',
        endDate: maxDetectedDate || '',
      });
      return;
    }

    const today = new Date();
    const endStr = today.toISOString().split('T')[0];

    if (preset === 'last7') {
      const past7 = new Date(today.getTime() - 7 * 86400000);
      onFilterChange({
        startDate: past7.toISOString().split('T')[0],
        endDate: endStr,
      });
    } else if (preset === 'last30') {
      const past30 = new Date(today.getTime() - 30 * 86400000);
      onFilterChange({
        startDate: past30.toISOString().split('T')[0],
        endDate: endStr,
      });
    } else if (preset === 'thisMonth') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      onFilterChange({
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endStr,
      });
    }
  };

  const handleReset = () => {
    onFilterChange({
      startDate: minDetectedDate || '',
      endDate: maxDetectedDate || '',
      selectedSku: 'all',
      returnTypeFilter: 'all',
      searchQuery: '',
      payoutFilter: 'all',
      salesRangeMin: '',
      salesRangeMax: '',
      settlementRangeMin: '',
      settlementRangeMax: '',
      profitFilter: 'all',
      sortBy: 'dateDesc',
    });
  };

  const activeAdvancedCount = [
    filters.payoutFilter !== 'all',
    filters.profitFilter !== 'all',
    Boolean(filters.salesRangeMin),
    Boolean(filters.salesRangeMax),
    Boolean(filters.settlementRangeMin),
    Boolean(filters.settlementRangeMax),
    filters.sortBy !== 'dateDesc',
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs mb-6 space-y-3">
      {/* Upper row: Dates & Mode & Dynamic Column Locator Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Type Selector with SourceIndicator */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => onFilterChange({ dateRangeType: 'paymentDate' })}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                filters.dateRangeType === 'paymentDate'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payment Date (Settlement)
            </button>
            <button
              onClick={() => onFilterChange({ dateRangeType: 'orderDate' })}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                filters.dateRangeType === 'orderDate'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Order Date
            </button>
          </div>

          {/* Quick info button on active date type with tooltip */}
          <SourceIndicator
            defId={filters.dateRangeType}
            matchedCol={columnMappings[filters.dateRangeType]}
            onClick={onOpenMetricInfo}
          />

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => onFilterChange({ startDate: e.target.value })}
              className="py-1 px-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => onFilterChange({ endDate: e.target.value })}
              className="py-1 px-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Date presets & Toggle Advanced Filters */}
        <div className="flex items-center gap-2 text-xs">
          <div className="hidden sm:flex items-center gap-1">
            <span className="text-slate-400 mr-1">Presets:</span>
            <button
              onClick={() => handleDatePreset('all')}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-xs transition-colors"
            >
              All Dates
            </button>
            <button
              onClick={() => handleDatePreset('last7')}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-xs transition-colors"
            >
              Last 7D
            </button>
            <button
              onClick={() => handleDatePreset('last30')}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-xs transition-colors"
            >
              Last 30D
            </button>
          </div>

          {/* Advanced Excel Filters Toggle Button */}
          <button
            onClick={() => setShowAdvancedExcelFilters(!showAdvancedExcelFilters)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
              showAdvancedExcelFilters || activeAdvancedCount > 0
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
            <span>Excel Filters</span>
            {activeAdvancedCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeAdvancedCount}
              </span>
            )}
            {showAdvancedExcelFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Middle row: Primary SKU Selector, Return Type, and Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-3">
          {/* Single SKU Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
              <Package className="w-3.5 h-3.5 text-indigo-600" />
              <span>Filter by SKU:</span>
            </div>
            <div className="flex items-center gap-1">
              <select
                value={filters.selectedSku}
                onChange={e => onFilterChange({ selectedSku: e.target.value })}
                className="py-1 px-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium max-w-[210px]"
              >
                <option value="all">All SKUs ({skuList.length} total)</option>
                {skuList.map(s => (
                  <option key={s.sku} value={s.sku}>
                    {s.sku} — Qty: {s.totalUnits} {s.totalOrders !== s.totalUnits ? `(${s.totalOrders} ord)` : ''} {s.unitCost > 0 ? `[Cost: ₹${s.unitCost}]` : ''}
                  </option>
                ))}
              </select>
              <SourceIndicator
                defId="sku"
                matchedCol={columnMappings['sku']}
                onClick={onOpenMetricInfo}
              />
            </div>
          </div>

          {/* Return Type Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Order / Return Type:</label>
            <div className="flex items-center gap-1">
              <select
                value={filters.returnTypeFilter}
                onChange={e => onFilterChange({ returnTypeFilter: e.target.value })}
                className="py-1 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
              >
                <option value="all">All Types (Delivered + Returns)</option>
                <option value="Delivered">Delivered Orders Only</option>
                <option value="Customer Return">Customer Returns Only</option>
                <option value="Courier Return">Courier Returns (RTO) Only</option>
                <option value="Cancellation">Cancellations</option>
              </select>
              <SourceIndicator
                defId="returnType"
                matchedCol={columnMappings['returnType']}
                onClick={onOpenMetricInfo}
              />
            </div>
          </div>

          {/* Quick link to configure / view costs */}
          <button
            type="button"
            onClick={onOpenCostUpload}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors"
          >
            <Coins className="w-3.5 h-3.5 text-emerald-600" />
            <span>{hasCostConfigured ? 'Cost Sheet Linked' : '+ Link Cost Sheet'}</span>
          </button>
        </div>

        {/* Search input & Reset */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Order ID, Item ID, SKU..."
              value={filters.searchQuery}
              onChange={e => onFilterChange({ searchQuery: e.target.value })}
              className="py-1 pl-8 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder:text-slate-400 w-52"
            />
          </div>

          <button
            onClick={handleReset}
            title="Reset all filters to defaults"
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Collapsible Advanced Excel Filters Drawer */}
      {showAdvancedExcelFilters && (
        <div className="pt-3 pb-1 border-t border-slate-200 mt-2 bg-slate-50/70 p-3 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold border-b border-slate-200/80 pb-2">
            <div className="flex items-center gap-1.5 text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Excel-Style Slicers & Value Condition Filters</span>
            </div>
            <span className="text-[11px] text-slate-400 font-normal">
              Mimicking Excel number filters, profit/loss slicer, and sorting rules
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            {/* 1. Net Profit / Loss Slicer */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Profit / Loss Filter:</label>
                <SourceIndicator
                  defId="netProfit"
                  matchedCol={columnMappings['netProfit']}
                  onClick={onOpenMetricInfo}
                />
              </div>
              <select
                value={filters.profitFilter}
                onChange={e => onFilterChange({ profitFilter: e.target.value as any })}
                className="w-full py-1 px-2.5 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-800"
              >
                <option value="all">All Orders (Profits & Losses)</option>
                <option value="profitOnly">In-Profit Orders (Net &gt; 0)</option>
                <option value="lossOnly">Loss-Making Orders (Net &lt; 0)</option>
              </select>
            </div>

            {/* 2. Payout Status (Positive, Negative, Zero) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Settlement Status:</label>
                <SourceIndicator
                  defId="bankSettlementValue"
                  matchedCol={columnMappings['bankSettlementValue']}
                  onClick={onOpenMetricInfo}
                />
              </div>
              <select
                value={filters.payoutFilter}
                onChange={e => onFilterChange({ payoutFilter: e.target.value as any })}
                className="w-full py-1 px-2.5 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-800"
              >
                <option value="all">All Payouts</option>
                <option value="positive">Positive Payouts (&gt; ₹0)</option>
                <option value="negative">Negative Payouts (Fee &gt; Payout)</option>
                <option value="zero">Zero Payout (Cancelled)</option>
              </select>
            </div>

            {/* 3. Order Sales Range (Min - Max) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Gross Sales Range:</label>
                <SourceIndicator
                  defId="saleAmount"
                  matchedCol={columnMappings['saleAmount']}
                  onClick={onOpenMetricInfo}
                />
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={filters.salesRangeMin}
                  onChange={e => onFilterChange({ salesRangeMin: e.target.value })}
                  className="w-1/2 py-1 px-2 bg-white border border-slate-300 rounded-md font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={filters.salesRangeMax}
                  onChange={e => onFilterChange({ salesRangeMax: e.target.value })}
                  className="w-1/2 py-1 px-2 bg-white border border-slate-300 rounded-md font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* 4. Bank Settlement Range (Min - Max) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Bank Settlement Range:</label>
                <SourceIndicator
                  defId="bankSettlementValue"
                  matchedCol={columnMappings['bankSettlementValue']}
                  onClick={onOpenMetricInfo}
                />
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={filters.settlementRangeMin}
                  onChange={e => onFilterChange({ settlementRangeMin: e.target.value })}
                  className="w-1/2 py-1 px-2 bg-white border border-slate-300 rounded-md font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={filters.settlementRangeMax}
                  onChange={e => onFilterChange({ settlementRangeMax: e.target.value })}
                  className="w-1/2 py-1 px-2 bg-white border border-slate-300 rounded-md font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* 5. Excel Sort By Order */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Excel Sorting Order:</label>
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <select
                value={filters.sortBy}
                onChange={e => onFilterChange({ sortBy: e.target.value as any })}
                className="w-full py-1 px-2.5 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-800"
              >
                <option value="dateDesc">Date: Newest First</option>
                <option value="dateAsc">Date: Oldest First</option>
                <option value="profitDesc">Net Profit: Highest First</option>
                <option value="profitAsc">Net Profit: Lowest First (Losses)</option>
                <option value="settlementDesc">Net Settlement: High to Low</option>
                <option value="settlementAsc">Net Settlement: Low to High</option>
                <option value="salesDesc">Gross Sales: High to Low</option>
                <option value="skuAsc">Seller SKU: A to Z</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
