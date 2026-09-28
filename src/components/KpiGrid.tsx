import React from 'react';
import { ReconAggregate, ColumnMappingState } from '../types/recon';
import { formatINR } from '../utils/reconciliationEngine';
import { 
  AlertTriangle, 
  TrendingUp,
  Coins,
  DollarSign
} from 'lucide-react';
import { SourceIndicator } from './SourceIndicator';

interface KpiGridProps {
  aggregates: ReconAggregate;
  columnMappings: ColumnMappingState;
  onOpenMetricInfo: (defId: string) => void;
  onOpenCostUpload: () => void;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ 
  aggregates, 
  columnMappings, 
  onOpenMetricInfo,
  onOpenCostUpload,
}) => {
  const isProfitable = aggregates.totalNetProfit >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Realized Net Profit / Loss Card */}
      <div className={`rounded-xl border p-4 shadow-xs relative group transition-colors ${
        aggregates.skusWithCostCount > 0
          ? isProfitable
            ? 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-400'
            : 'bg-rose-50/50 border-rose-300 hover:border-rose-400'
          : 'bg-white border-slate-200 hover:border-indigo-300'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-emerald-600" />
            <span>Net Realized Profit / Loss</span>
          </span>
          <SourceIndicator
            defId="netProfit"
            matchedCol={columnMappings['netProfit']}
            onClick={onOpenMetricInfo}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-2xl font-bold font-mono tracking-tight ${
            aggregates.skusWithCostCount > 0
              ? isProfitable
                ? 'text-emerald-700'
                : 'text-rose-600'
              : 'text-slate-800'
          }`}>
            {formatINR(aggregates.totalNetProfit)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>
            {aggregates.skusWithCostCount > 0 ? (
              <span className="font-semibold text-slate-700">Margin: {aggregates.netProfitMarginPercent}%</span>
            ) : (
              <button
                onClick={onOpenCostUpload}
                className="text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2"
              >
                + Link Cost Sheet
              </button>
            )}
          </span>
          <span className="font-mono text-slate-600">
            {aggregates.skusWithCostCount} SKUs Cost Linked
          </span>
        </div>
      </div>

      {/* 2. Net Settlement Received (Bank) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative group hover:border-indigo-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Net Settlement Received</span>
          <SourceIndicator
            defId="bankSettlementValue"
            matchedCol={columnMappings['bankSettlementValue']}
            onClick={onOpenMetricInfo}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-indigo-900 tracking-tight">
            {formatINR(aggregates.totalSettlementReceived)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>Actual in Bank Account</span>
          <span className="font-semibold text-slate-700 font-mono">
            {aggregates.effectiveSettlementRate}% of Sales
          </span>
        </div>
      </div>

      {/* 3. Product Landed Cost (COGS) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative group hover:border-indigo-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Total Landed Product Cost</span>
          <SourceIndicator
            defId="unitCost"
            matchedCol={columnMappings['unitCost']}
            onClick={onOpenMetricInfo}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {formatINR(aggregates.totalCostOfGoodsSold)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>From "Cost" Sheet</span>
          <span className="font-mono text-slate-700" title="Delivered Units from Column BH">
            {aggregates.deliveredUnitsCount} Delivered Units
          </span>
        </div>
      </div>

      {/* 4. Gross Order Sales */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative group hover:border-indigo-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Gross Sales (Customer Paid)</span>
          <SourceIndicator
            defId="saleAmount"
            matchedCol={columnMappings['saleAmount']}
            onClick={onOpenMetricInfo}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {formatINR(aggregates.grossSales)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>Total Offer Amount</span>
          <span className="font-mono text-slate-700" title="Total Units from Column BH">
            {aggregates.totalUnitsSold} Units Sold (Col BH)
          </span>
        </div>
      </div>

      {/* 5. Customer Returns Reversal */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative group hover:border-indigo-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Customer Returns</span>
          <SourceIndicator
            defId="returnType"
            matchedCol={columnMappings['returnType']}
            onClick={onOpenMetricInfo}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-rose-600 tracking-tight">
            {aggregates.customerReturnsCount} <span className="text-xs font-sans font-normal text-slate-500">orders</span>
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>Reversal / Loss Value</span>
          <span className="font-mono text-rose-700 font-semibold">
            {formatINR(aggregates.customerReturnsAmount)}
          </span>
        </div>
      </div>

      {/* 6. Courier Returns / RTO Impact */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative group hover:border-indigo-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Courier Returns (RTO)</span>
          <SourceIndicator
            defId="reverseShippingFee"
            matchedCol={columnMappings['reverseShippingFee']}
            onClick={onOpenMetricInfo}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-amber-700 tracking-tight">
            {aggregates.courierReturnsCount} <span className="text-xs font-sans font-normal text-slate-500">orders</span>
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>Reverse Freight Impact</span>
          <span className="font-mono text-amber-800 font-semibold">
            {formatINR(aggregates.courierReturnsImpact)}
          </span>
        </div>
      </div>

      {/* 7. Total Marketplace Deductions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative group hover:border-indigo-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Marketplace Fees</span>
          <SourceIndicator
            defId="marketplaceFee"
            matchedCol={columnMappings['marketplaceFee']}
            onClick={onOpenMetricInfo}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-800 tracking-tight">
            {formatINR(aggregates.totalMarketplaceFees)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>Comm + Ship + Fixed + PG</span>
          <span className="font-mono text-slate-700">
            Comm: {formatINR(aggregates.commissionTotal)}
          </span>
        </div>
      </div>

      {/* 8. Negative Settlement Alert */}
      <div className={`rounded-xl border p-4 shadow-xs relative transition-colors ${
        aggregates.negativePayoutOrdersCount > 0 
          ? 'bg-amber-50/40 border-amber-300' 
          : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Negative Payout Lines</span>
          </span>
          <SourceIndicator
            defId="bankSettlementValue"
            matchedCol={columnMappings['bankSettlementValue']}
            onClick={onOpenMetricInfo}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-amber-900 tracking-tight">
            {aggregates.negativePayoutOrdersCount} <span className="text-xs font-sans font-normal text-slate-500">orders</span>
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>Fee exceeded settlement</span>
          <span className="font-mono text-amber-900 font-semibold">
            {formatINR(-aggregates.negativePayoutAmount)}
          </span>
        </div>
      </div>
    </div>
  );
};
