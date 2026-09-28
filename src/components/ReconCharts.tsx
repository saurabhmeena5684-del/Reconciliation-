import React from 'react';
import { ReconAggregate, SkuSummary, StandardReconRecord, ColumnMappingState } from '../types/recon';
import { formatCompactINR, formatINR } from '../utils/reconciliationEngine';
import { BarChart3, PieChart, TrendingUp } from 'lucide-react';
import { SourceIndicator } from './SourceIndicator';

interface ReconChartsProps {
  aggregates: ReconAggregate;
  skuSummaries: SkuSummary[];
  records: StandardReconRecord[];
  columnMappings: ColumnMappingState;
  onOpenMetricInfo: (defId: string) => void;
}

export const ReconCharts: React.FC<ReconChartsProps> = ({
  aggregates,
  skuSummaries,
  records,
  columnMappings,
  onOpenMetricInfo,
}) => {
  // 1. Fee Distribution Breakdown (Waterfall / Bar)
  const feeCategories = [
    { label: 'Net Bank Payout', amount: Math.max(0, aggregates.totalSettlementReceived), color: 'bg-emerald-500', defId: 'bankSettlementValue' },
    { label: 'Commission Fee', amount: aggregates.commissionTotal, color: 'bg-indigo-500', defId: 'commission' },
    { label: 'Forward Shipping', amount: aggregates.shippingFeesTotal, color: 'bg-blue-500', defId: 'shippingFee' },
    { label: 'Reverse RTO Freight', amount: aggregates.reverseShippingFeesTotal, color: 'bg-amber-500', defId: 'reverseShippingFee' },
    { label: 'Fixed & Collection', amount: aggregates.fixedFeesTotal + aggregates.collectionFeesTotal, color: 'bg-slate-400', defId: 'fixedFee' },
    { label: 'Taxes & TDS', amount: aggregates.taxesTotal + aggregates.tdsTotal + aggregates.tcsTotal, color: 'bg-rose-400', defId: 'taxes' },
  ];

  const totalFeeSum = feeCategories.reduce((acc, c) => acc + Math.max(0, c.amount), 0) || 1;

  // 2. Daily Timeline Settlement Payout Trend (Last 10 days)
  const dailyMap = new Map<string, number>();
  records.forEach(r => {
    if (r.paymentDate) {
      dailyMap.set(r.paymentDate, (dailyMap.get(r.paymentDate) || 0) + r.bankSettlementValue);
    }
  });

  const sortedDates = Array.from(dailyMap.keys()).sort();
  const recentDates = sortedDates.slice(-10); // up to 10 points
  const maxDayAmount = Math.max(...recentDates.map(d => dailyMap.get(d) || 0), 100);

  // 3. Top SKUs by Return Rate
  const skusWithReturns = skuSummaries
    .filter(s => s.totalOrders >= 2)
    .sort((a, b) => (b.customerReturnRate + b.courierReturnRate) - (a.customerReturnRate + a.courierReturnRate))
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Chart 1: Revenue vs Deductions Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900">
                Gross Sales Value Realization
              </h4>
            </div>
            <SourceIndicator
              defId="bankSettlementValue"
              matchedCol={columnMappings['bankSettlementValue']}
              onClick={onOpenMetricInfo}
            />
          </div>

          <div className="mt-4 space-y-3">
            {/* Proportion Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100">
              {feeCategories.map(cat => {
                const pct = Math.max(0, (cat.amount / totalFeeSum) * 100);
                if (pct <= 0) return null;
                return (
                  <div
                    key={cat.label}
                    style={{ width: `${pct}%` }}
                    className={`${cat.color} h-full transition-all`}
                    title={`${cat.label}: ${pct.toFixed(1)}%`}
                  />
                );
              })}
            </div>

            {/* Legend & Breakdown values */}
            <div className="pt-2 space-y-2">
              {feeCategories.map(cat => {
                const pct = Math.round((Math.max(0, cat.amount) / totalFeeSum) * 100);
                return (
                  <div key={cat.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                      <span className="text-slate-600">{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-900 font-semibold tabular-nums">
                        {formatINR(cat.amount)}
                      </span>
                      <span className="font-mono text-slate-400 text-[11px] w-8 text-right tabular-nums">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-3 mt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Net Realized in Bank:</span>
          <strong className="text-emerald-700 font-mono text-xs">
            {aggregates.effectiveSettlementRate}%
          </strong>
        </div>
      </div>

      {/* Chart 2: Daily Settlement Payout Trend */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-900">
                Daily Payout Settlement Flow (INR)
              </h4>
            </div>
            <SourceIndicator
              defId="paymentDate"
              matchedCol={columnMappings['paymentDate']}
              onClick={onOpenMetricInfo}
            />
          </div>

          <div className="mt-4">
            {recentDates.length > 0 ? (
              <div className="h-44 flex items-end gap-2 pt-6 pb-2 px-1 border-b border-slate-200">
                {recentDates.map(date => {
                  const val = dailyMap.get(date) || 0;
                  const heightPct = Math.max(10, Math.min(100, Math.round((val / maxDayAmount) * 100)));
                  const dayLabel = date.slice(5); // MM-DD

                  return (
                    <div
                      key={date}
                      className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                    >
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-mono py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap z-10">
                        {date}: {formatINR(val)}
                      </div>
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-sm transition-all group-hover:brightness-90 ${
                          val >= 0 ? 'bg-indigo-500' : 'bg-rose-500'
                        }`}
                      />
                      <span className="text-[10px] font-mono text-slate-400 rotate-45 origin-left pt-1">
                        {dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                No settlement data found in the selected date range.
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 mt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Date Range:</span>
          <span className="font-mono text-slate-700">
            {aggregates.startDate || 'N/A'} &rarr; {aggregates.endDate || 'N/A'}
          </span>
        </div>
      </div>

      {/* Chart 3: Top SKUs by Return Rate */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-600" />
              <h4 className="text-xs font-bold text-slate-900">
                High Return Risk SKUs (Cust + RTO)
              </h4>
            </div>
            <SourceIndicator
              defId="returnType"
              matchedCol={columnMappings['returnType']}
              onClick={onOpenMetricInfo}
            />
          </div>

          <div className="mt-4 space-y-3">
            {skusWithReturns.map(sku => {
              const totalReturnRate = Math.min(100, sku.customerReturnRate + sku.courierReturnRate);
              return (
                <div key={sku.sku} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-medium text-slate-800 truncate max-w-[170px]" title={sku.sku}>
                      {sku.sku}
                    </span>
                    <span className="font-mono text-rose-700 font-bold tabular-nums">
                      {totalReturnRate.toFixed(1)}% ({sku.customerReturnsCount + sku.courierReturnsCount} ret / {sku.totalUnits} qty)
                    </span>
                  </div>
                  {/* Segmented bar: customer vs courier */}
                  <div className="w-full h-2 rounded-full bg-slate-100 flex overflow-hidden">
                    <div
                      style={{ width: `${sku.customerReturnRate}%` }}
                      className="bg-rose-500 h-full"
                      title={`Customer Returns: ${sku.customerReturnRate}%`}
                    />
                    <div
                      style={{ width: `${sku.courierReturnRate}%` }}
                      className="bg-amber-500 h-full"
                      title={`Courier RTO: ${sku.courierReturnRate}%`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Cust: {sku.customerReturnRate}%</span>
                    <span>RTO: {sku.courierReturnRate}%</span>
                  </div>
                </div>
              );
            })}

            {skusWithReturns.length === 0 && (
              <p className="text-xs text-slate-400 py-6 text-center">
                No high return SKUs recorded.
              </p>
            )}
          </div>
        </div>

        <div className="pt-3 mt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Customer
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block ml-1" /> Courier RTO
          </span>
          <span className="text-slate-600 font-medium">Reversal Alert</span>
        </div>
      </div>
    </div>
  );
};
