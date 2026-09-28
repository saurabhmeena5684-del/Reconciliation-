import React, { useState } from 'react';
import { SkuSummary, ColumnMappingState } from '../types/recon';
import { formatINR } from '../utils/reconciliationEngine';
import { ArrowUpDown, Download, Search, Coins, TrendingUp, TrendingDown } from 'lucide-react';
import { SourceIndicator } from './SourceIndicator';

interface SkuAnalysisTableProps {
  skuSummaries: SkuSummary[];
  columnMappings: ColumnMappingState;
  onSelectSku: (sku: string) => void;
  selectedSku: string;
  onOpenMetricInfo: (defId: string) => void;
  onOpenCostUpload: () => void;
}

type SortField = 
  | 'sku' 
  | 'totalUnits'
  | 'totalOrders' 
  | 'grossSales' 
  | 'netSettlement' 
  | 'unitCost'
  | 'totalCostOfGoodsSold'
  | 'netProfit'
  | 'effectiveRealizationPercent' 
  | 'customerReturnRate' 
  | 'courierReturnRate' 
  | 'totalFees';

export const SkuAnalysisTable: React.FC<SkuAnalysisTableProps> = ({
  skuSummaries,
  columnMappings,
  onSelectSku,
  selectedSku,
  onOpenMetricInfo,
  onOpenCostUpload,
}) => {
  const [sortField, setSortField] = useState<SortField>('netProfit');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterText, setFilterText] = useState('');
  
  // Quick return rate and profitability threshold filters
  const [rateFilter, setRateFilter] = useState<'all' | 'profitable' | 'loss' | 'highCustReturn' | 'highRto'>('all');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending for numbers
    }
  };

  const filtered = skuSummaries.filter(s => {
    const matchesSearch =
      s.sku.toLowerCase().includes(filterText.toLowerCase()) ||
      s.productTitle.toLowerCase().includes(filterText.toLowerCase());
    if (!matchesSearch) return false;

    if (rateFilter === 'profitable' && s.netProfit <= 0) return false;
    if (rateFilter === 'loss' && s.netProfit >= 0) return false;
    if (rateFilter === 'highCustReturn' && s.customerReturnRate < 10) return false;
    if (rateFilter === 'highRto' && s.courierReturnRate < 10) return false;

    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
  });

  const exportCsv = () => {
    const headers = [
      'SKU',
      'Product Title',
      'Unit Landed Cost (INR)',
      'Total Product Cost (INR)',
      'Net Bank Settlement (INR)',
      'Net Profit / Loss (INR)',
      'Profit Margin %',
      'Order Qty (Col BH Quantity)',
      'Order Lines (Count)',
      'Gross Sales (INR)',
      'Realization %',
      'Customer Returns Count',
      'Customer Return Rate %',
      'Courier Returns Count',
      'Courier Return Rate %',
      'Total Fees (INR)',
    ];

    const rows = sorted.map(s => [
      `"${s.sku.replace(/"/g, '""')}"`,
      `"${s.productTitle.replace(/"/g, '""')}"`,
      s.unitCost,
      s.totalCostOfGoodsSold,
      s.netSettlement,
      s.netProfit,
      s.netProfitMarginPercent,
      s.totalUnits,
      s.totalOrders,
      s.grossSales,
      s.effectiveRealizationPercent,
      s.customerReturnsCount,
      s.customerReturnRate,
      s.courierReturnsCount,
      s.courierReturnRate,
      s.totalFees,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SKU_Profitability_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table header bar */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              SKU Level Settlement & Net Profit / Loss Matrix
            </h3>
            <SourceIndicator
              defId="netProfit"
              matchedCol={columnMappings['netProfit']}
              onClick={onOpenMetricInfo}
            />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Formula: <strong>Net Settlement - Product Cost = Net Profit/Loss</strong> · <strong>Order Qty</strong> = Summed from Column BH (<em>Quantity</em>) in Orders sheet
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Threshold Filter Dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 font-medium">Filter:</span>
            <select
              value={rateFilter}
              onChange={e => setRateFilter(e.target.value as any)}
              className="py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800"
            >
              <option value="all">All SKUs</option>
              <option value="profitable">Profitable SKUs (Net &gt; ₹0)</option>
              <option value="loss">Loss-Making SKUs (Net &lt; ₹0)</option>
              <option value="highCustReturn">High Customer Return (&gt;10%)</option>
              <option value="highRto">High Courier RTO (&gt;10%)</option>
            </select>
          </div>

          {/* Search box inside table */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search SKU..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="py-1.5 pl-8 pr-3 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 w-36"
            />
          </div>

          {/* Cost Sheet Button */}
          <button
            onClick={onOpenCostUpload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-lg shadow-xs transition-colors"
          >
            <Coins className="w-3.5 h-3.5 text-emerald-600" />
            <span>Manage Cost Sheet</span>
          </button>

          {/* Export button */}
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-semibold select-none">
              <th
                onClick={() => handleSort('sku')}
                className="py-3 px-4 cursor-pointer hover:text-indigo-600 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Seller SKU & Title</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('unitCost')}
                className="py-3 px-3 text-right cursor-pointer hover:text-emerald-700 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Unit Cost</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('netSettlement')}
                className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600 transition-colors bg-indigo-50/30 text-indigo-950"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Bank Payout</span>
                  <ArrowUpDown className="w-3 h-3 text-indigo-600" />
                </div>
              </th>
              <th
                onClick={() => handleSort('netProfit')}
                className="py-3 px-3 text-right cursor-pointer hover:text-emerald-700 transition-colors bg-emerald-50/40 text-emerald-950"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Net Profit / Loss</span>
                  <ArrowUpDown className="w-3 h-3 text-emerald-600" />
                </div>
              </th>
              <th
                onClick={() => handleSort('effectiveRealizationPercent')}
                className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Margin %</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('totalUnits')}
                className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600 transition-colors bg-indigo-50/20"
                title="Real Order Quantity from Column BH (Quantity) in Orders sheet"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Order Qty (Col BH)</span>
                  <ArrowUpDown className="w-3 h-3 text-indigo-600" />
                </div>
              </th>
              <th
                onClick={() => handleSort('customerReturnRate')}
                className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Cust Ret %</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('courierReturnRate')}
                className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>RTO %</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map(s => {
              const isSelected = selectedSku === s.sku;
              const hasCost = s.unitCost > 0;
              const isProfit = s.netProfit >= 0;

              return (
                <tr
                  key={s.sku}
                  className={`hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-indigo-50/60 font-medium' : ''
                  }`}
                >
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-mono font-bold text-slate-900 truncate">
                      {s.sku}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate" title={s.productTitle}>
                      {s.productTitle}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                    {hasCost ? (
                      <span className="font-semibold text-slate-800">₹{s.unitCost}</span>
                    ) : (
                      <button
                        onClick={onOpenCostUpload}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Set Cost
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-indigo-900 bg-indigo-50/10">
                    {formatINR(s.netSettlement)}
                  </td>
                  <td className={`py-3 px-3 text-right font-mono tabular-nums font-bold ${
                    hasCost
                      ? isProfit
                        ? 'text-emerald-700 bg-emerald-50/30'
                        : 'text-rose-600 bg-rose-50/30'
                      : 'text-slate-400'
                  }`}>
                    {hasCost ? (
                      <div className="flex items-center justify-end gap-1">
                        {isProfit ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-rose-600" />}
                        <span>{formatINR(s.netProfit)}</span>
                      </div>
                    ) : (
                      <span>Need Cost</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {hasCost ? (
                      <span className={`font-semibold ${isProfit ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {s.netProfitMarginPercent}%
                      </span>
                    ) : (
                      <span className="text-slate-400">&mdash;</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums bg-indigo-50/10">
                    <div className="font-bold text-slate-900 text-xs">{s.totalUnits}</div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      {s.totalOrders} {s.totalOrders === 1 ? 'order' : 'orders'}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    <span className={s.customerReturnRate > 15 ? 'text-rose-600 font-semibold' : 'text-slate-700'}>
                      {s.customerReturnRate}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    <span className={s.courierReturnRate > 15 ? 'text-amber-700 font-semibold' : 'text-slate-700'}>
                      {s.courierReturnRate}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => onSelectSku(isSelected ? 'all' : s.sku)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? 'Focused' : 'Filter SKU'}
                    </button>
                  </td>
                </tr>
              );
            })}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                  No SKUs match the selected filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
