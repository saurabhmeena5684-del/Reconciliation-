import React, { useState } from 'react';
import { StandardReconRecord, ColumnMappingState } from '../types/recon';
import { computePivotData, formatINR } from '../utils/reconciliationEngine';
import { Layers, Download, Search, ArrowUpDown } from 'lucide-react';
import { SourceIndicator } from './SourceIndicator';

interface PivotBuilderProps {
  records: StandardReconRecord[];
  columnMappings: ColumnMappingState;
  onOpenMetricInfo: (defId: string) => void;
}

type GroupByOption = 'sku' | 'paymentDate' | 'month' | 'returnType' | 'orderId';
type ValueMetricOption = 'netProfit' | 'netSettlement' | 'grossSales' | 'orderCount' | 'returnsCount' | 'totalFees' | 'taxes';

export const PivotBuilder: React.FC<PivotBuilderProps> = ({ 
  records, 
  columnMappings,
  onOpenMetricInfo 
}) => {
  const [groupBy, setGroupBy] = useState<GroupByOption>('sku');
  const [valueHighlight, setValueHighlight] = useState<ValueMetricOption>('netProfit');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'groupKey' | 'totalUnits' | 'orderCount' | 'grossSales' | 'netSettlement' | 'returnsCount' | 'totalFees' | 'taxes' | 'effectiveRate' | 'totalCost' | 'netProfit'>('netProfit');
  const [sortAsc, setSortAsc] = useState(false);

  const pivotRows = computePivotData(records, groupBy);

  const filtered = pivotRows.filter(r =>
    r.groupKey.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExport = () => {
    const headers = [
      'Group Key (' + groupBy + ')',
      'Order Qty (Col BH Quantity)',
      'Order Lines Count',
      'Gross Sales',
      'Net Bank Settlement',
      'Total Product Cost',
      'Net Profit / Loss',
      'Returns Count',
      'Total Fees',
      'Taxes & TDS',
      'Realization %',
    ];
    const rows = sorted.map(r => [
      `"${r.groupKey.replace(/"/g, '""')}"`,
      r.totalUnits,
      r.orderCount,
      r.grossSales,
      r.netSettlement,
      r.totalCost,
      r.netProfit,
      r.returnsCount,
      r.totalFees,
      r.taxes,
      r.effectiveRate,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Pivot_Analysis_${groupBy}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDimensionDefId = (grp: GroupByOption): string => {
    switch (grp) {
      case 'sku': return 'sku';
      case 'paymentDate': return 'paymentDate';
      case 'orderId': return 'orderId';
      case 'returnType': return 'returnType';
      case 'month': return 'paymentDate';
      default: return 'sku';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Pivot Controls Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Dimension Selector */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Rows (Group By):</span>
            </div>
            <select
              value={groupBy}
              onChange={e => setGroupBy(e.target.value as GroupByOption)}
              className="py-1.5 px-3 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-xs text-slate-800"
            >
              <option value="sku">1. Seller SKU (Single SKU & Item Profitability)</option>
              <option value="paymentDate">2. Payment Date (Settlement Day-wise Payout)</option>
              <option value="month">3. Month (Monthly Cohort Trend)</option>
              <option value="returnType">4. Return Type (Delivered vs Return Impact)</option>
              <option value="orderId">5. Order ID (Unique Order Level Drilldown)</option>
            </select>
            <SourceIndicator
              defId={getDimensionDefId(groupBy)}
              matchedCol={columnMappings[getDimensionDefId(groupBy)]}
              onClick={onOpenMetricInfo}
            />
          </div>

          {/* Metric Highlight Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-700">Values Focus:</span>
            <select
              value={valueHighlight}
              onChange={e => {
                const val = e.target.value as ValueMetricOption;
                setValueHighlight(val);
                setSortField(val as any);
              }}
              className="py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800"
            >
              <option value="netProfit">Net Profit / Loss (Bottom Line)</option>
              <option value="netSettlement">Net Bank Settlement (INR)</option>
              <option value="grossSales">Gross Sales Value (INR)</option>
              <option value="orderCount">Order Count</option>
              <option value="returnsCount">Total Returns</option>
              <option value="totalFees">Marketplace Deductions (INR)</option>
            </select>
          </div>

          <span className="text-xs text-slate-400">
            ({sorted.length} aggregated lines)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in pivot..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="py-1.5 pl-8 pr-3 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 w-40"
            />
          </div>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Pivot</span>
          </button>
        </div>
      </div>

      {/* Pivot Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-semibold select-none">
              <th
                onClick={() => handleSort('groupKey')}
                className="py-3 px-4 cursor-pointer hover:text-indigo-600 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span className="capitalize">{groupBy.replace(/([A-Z])/g, ' $1')}</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('totalUnits')}
                className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600 transition-colors bg-indigo-50/20"
                title="Total ordered units from Column BH (Quantity)"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Qty (Col BH)</span>
                  <ArrowUpDown className="w-3 h-3 text-indigo-600" />
                </div>
              </th>
              <th
                onClick={() => handleSort('grossSales')}
                className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Gross Sales</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('netSettlement')}
                className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600 transition-colors bg-indigo-50/40 text-indigo-950"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Bank Payout</span>
                  <ArrowUpDown className="w-3 h-3 text-indigo-600" />
                </div>
              </th>
              <th
                onClick={() => handleSort('totalCost')}
                className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Product Cost</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('netProfit')}
                className="py-3 px-3 text-right cursor-pointer hover:text-emerald-700 transition-colors bg-emerald-50/50 text-emerald-950 font-bold"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Net Profit / Loss</span>
                  <ArrowUpDown className="w-3 h-3 text-emerald-600" />
                </div>
              </th>
              <th
                onClick={() => handleSort('returnsCount')}
                className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Returns</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('totalFees')}
                className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Fees</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map(row => (
              <tr key={row.groupKey} className="hover:bg-slate-50 transition-colors">
                <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                  {row.groupKey}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 bg-indigo-50/10">
                  <span className="font-bold text-slate-900">{row.totalUnits}</span>
                  <span className="text-[10px] text-slate-400 block font-sans">({row.orderCount} ord)</span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                  {formatINR(row.grossSales)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-indigo-900 bg-indigo-50/20">
                  {formatINR(row.netSettlement)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                  {formatINR(row.totalCost)}
                </td>
                <td className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                  row.netProfit >= 0 ? 'text-emerald-700 bg-emerald-50/30' : 'text-rose-600 bg-rose-50/30'
                }`}>
                  {formatINR(row.netProfit)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-600">
                  {row.returnsCount}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                  {formatINR(row.totalFees)}
                </td>
              </tr>
            ))}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                  No data records available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
