import React from 'react';
import { FlipkartWorkbookSummary, ReconAggregate, ColumnMappingState } from '../types/recon';
import { formatINR } from '../utils/reconciliationEngine';
import { SourceIndicator } from './SourceIndicator';
import { 
  Building2, 
  Receipt, 
  TrendingDown, 
  ShieldCheck, 
  Megaphone, 
  Layers, 
  CheckCircle2, 
  FileSpreadsheet,
  Calendar,
  PackageCheck
} from 'lucide-react';

interface ExecutiveSummaryViewProps {
  summary?: FlipkartWorkbookSummary;
  reconAggregate: ReconAggregate;
  columnMappings: ColumnMappingState;
  onOpenMetricInfo: (defId: string) => void;
  fileName?: string;
  allSheets?: string[];
  activeSheet: string;
  onSelectSheet?: (sheet: string) => void;
}

export const ExecutiveSummaryView: React.FC<ExecutiveSummaryViewProps> = ({
  summary,
  reconAggregate,
  columnMappings,
  onOpenMetricInfo,
  fileName,
  allSheets = [],
  activeSheet,
  onSelectSheet,
}) => {
  // Use parsed executive figures if present, otherwise compute from orders aggregate
  const netBankSettlement = summary?.netBankSettlementA !== undefined 
    ? summary.netBankSettlementA 
    : reconAggregate.totalSettlementReceived;

  const inputGstCredits = summary?.inputGstTcsCreditsB !== undefined 
    ? summary.inputGstTcsCreditsB 
    : reconAggregate.taxesTotal + reconAggregate.tcsTotal;

  const ordersGrossSales = summary?.ordersGrossSales !== undefined 
    ? summary.ordersGrossSales 
    : reconAggregate.grossSales;

  const returnsReversal = summary?.returnsReversal !== undefined 
    ? summary.returnsReversal 
    : -reconAggregate.customerReturnsAmount;

  const mpFees = summary?.ordersMarketplaceFees !== undefined 
    ? summary.ordersMarketplaceFees 
    : -reconAggregate.totalMarketplaceFees;

  const taxes = summary?.ordersTaxes !== undefined 
    ? summary.ordersTaxes 
    : -reconAggregate.taxesTotal;

  const spf = summary?.protectionFundTotal !== undefined 
    ? summary.protectionFundTotal 
    : reconAggregate.compensationsTotal;

  const adsFees = summary?.adsFees !== undefined ? summary.adsFees : 0;
  const servicesFees = summary?.servicesFeesTotal !== undefined ? summary.servicesFeesTotal : adsFees;

  const ordersSettled = summary?.ordersAmountSettled !== undefined 
    ? summary.ordersAmountSettled 
    : (ordersGrossSales + returnsReversal + mpFees + taxes + (summary?.offerAmount || 0));

  const totalSaleOrders = summary?.saleOrdersCount || reconAggregate.deliveredOrdersCount;
  const totalReturns = summary?.returnsCount || (reconAggregate.customerReturnsCount + reconAggregate.courierReturnsCount);

  return (
    <div className="space-y-6">
      {/* Workbook Metadata & Sheets Navigator */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                Flipkart Settlement Report
              </span>
              {summary?.paymentDuration && (
                <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {summary.paymentDuration}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1 font-mono">
              {fileName || 'Settlement Workbook'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Delivered Orders</div>
              <div className="text-sm font-bold text-slate-800 font-mono">{totalSaleOrders.toLocaleString('en-IN')}</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-right">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Returns</div>
              <div className="text-sm font-bold text-rose-600 font-mono">{totalReturns.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        {/* 16 Sheet selector pill bar */}
        {allSheets.length > 0 && (
          <div className="pt-4">
            <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Detected Sheets in Workbook ({allSheets.length}):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allSheets.map(s => {
                const isSelected = activeSheet.toLowerCase() === s.toLowerCase();
                const isOrders = /^orders$/i.test(s);
                const isSummary = /summary/i.test(s);
                return (
                  <button
                    key={s}
                    onClick={() => onSelectSheet && onSelectSheet(s)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-mono transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : isOrders
                        ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                        : isSummary
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {isOrders && <PackageCheck className="w-3 h-3" />}
                    {isSummary && <FileSpreadsheet className="w-3 h-3" />}
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Top 2 Primary Bank Figures (A & B) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Net Bank Settlement (A) */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-400" />
              Net Bank Settlement (A)
            </span>
            <span className="bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded text-[11px] font-mono">
              Final Payout Deposited
            </span>
          </div>
          <div className="text-3xl font-extrabold font-mono tracking-tight text-white mb-2">
            {formatINR(netBankSettlement)}
          </div>
          <p className="text-xs text-indigo-200/80 leading-relaxed">
            This is the net amount credited by Flipkart into your bank account after deducting returns reversal, marketplace fees, taxes, and advertising deductions.
          </p>
        </div>

        {/* Input GST + TCS Credits (B) */}
        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-400" />
              Input GST + TCS Credits (B)
            </span>
            <span className="bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded text-[11px] font-mono">
              Eligible for ITC in GSTR-2B
            </span>
          </div>
          <div className="text-3xl font-extrabold font-mono tracking-tight text-emerald-300 mb-2">
            {formatINR(inputGstCredits)}
          </div>
          <p className="text-xs text-emerald-200/80 leading-relaxed">
            This amount is eligible for Input Tax Credit during GSTR filing: 18% GST on marketplace charges + 1% GST TCS (Section 52).
          </p>
        </div>
      </div>

      {/* Official Flipkart Line Item Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Flipkart Settlement Summary Statement (Official Breakdown)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Sheet: "Summary of report"
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-6">Line Item / Sub-Head</th>
                <th className="py-3 px-6 text-right">Amount Settled (₹)</th>
                <th className="py-3 px-6 text-right">Break-up L1 (₹)</th>
                <th className="py-3 px-6 text-right">Break-up L2 (₹)</th>
                <th className="py-3 px-6">Remarks & Formula Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {summary?.tableRows && summary.tableRows.length > 0 ? (
                summary.tableRows.map((tr, idx) => {
                  const isMainItem = !!tr.lineItem;
                  const isL1 = !!tr.breakupL1;
                  const isL2 = !!tr.breakupL2;
                  const isNetSettlement = tr.lineItem?.includes('Net Bank Settlement');
                  const isInputGst = tr.lineItem?.includes('Input GST');

                  return (
                    <tr
                      key={idx}
                      className={`transition-colors ${
                        isNetSettlement
                          ? 'bg-indigo-50/90 font-bold text-indigo-950 border-t-2 border-indigo-200'
                          : isInputGst
                          ? 'bg-emerald-50/80 font-bold text-emerald-950'
                          : isMainItem
                          ? 'bg-slate-50/70 font-bold text-slate-900 border-t border-slate-200'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className={`py-2.5 px-6 ${isL2 ? 'pl-14 text-[11px] text-slate-500' : isL1 ? 'pl-8 font-medium text-slate-800' : 'text-slate-900'}`}>
                        {tr.lineItem || tr.breakupL1 || tr.breakupL2}
                      </td>
                      <td className={`py-2.5 px-6 text-right font-mono ${isNetSettlement ? 'text-indigo-900 font-extrabold text-sm' : 'text-slate-800 font-semibold'}`}>
                        {tr.amountSettled !== undefined ? formatINR(tr.amountSettled) : '-'}
                      </td>
                      <td className="py-2.5 px-6 text-right font-mono text-slate-700">
                        {tr.breakupL1Amount !== undefined ? formatINR(tr.breakupL1Amount) : '-'}
                      </td>
                      <td className="py-2.5 px-6 text-right font-mono text-slate-600 text-[11px]">
                        {tr.breakupL2Amount !== undefined ? formatINR(tr.breakupL2Amount) : '-'}
                      </td>
                      <td className="py-2.5 px-6 text-slate-500 text-[11px] max-w-md">
                        {tr.remarks || '-'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <>
                  {/* 1. Orders Section */}
                  <tr className="bg-slate-50/50 font-bold text-slate-900">
                    <td className="py-3 px-6 flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-indigo-600" />
                      Orders
                      <SourceIndicator
                        defId="bankSettlementValue"
                        matchedCol={columnMappings.bankSettlementValue}
                        onOpenModal={onOpenMetricInfo}
                      />
                    </td>
                    <td className="py-3 px-6 text-right font-mono text-indigo-700">
                      {formatINR(ordersSettled)}
                    </td>
                    <td className="py-3 px-6 text-right">-</td>
                    <td className="py-3 px-6 text-right">-</td>
                    <td className="py-3 px-6 text-slate-500 text-[11px]">
                      Net orders settlement: Sales + Reversals + Fees + Taxes
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-6 pl-12">
                      Sales Amount
                      <SourceIndicator
                        defId="saleAmount"
                        matchedCol={columnMappings.saleAmount}
                        onOpenModal={onOpenMetricInfo}
                      />
                    </td>
                    <td className="py-2.5 px-6 text-right">-</td>
                    <td className="py-2.5 px-6 text-right font-mono text-emerald-700">
                      {formatINR(ordersGrossSales)}
                    </td>
                    <td className="py-2.5 px-6 text-right">-</td>
                    <td className="py-2.5 px-6 text-slate-500 text-[11px]">
                      Customer payments including customer shipping fee
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-6 pl-12 text-rose-700 flex items-center gap-1.5">
                      Returns Reversal
                      <SourceIndicator
                        defId="refund"
                        matchedCol={columnMappings.refund}
                        onOpenModal={onOpenMetricInfo}
                      />
                    </td>
                    <td className="py-2.5 px-6 text-right">-</td>
                    <td className="py-2.5 px-6 text-right font-mono text-rose-600">
                      {formatINR(returnsReversal)}
                    </td>
                    <td className="py-2.5 px-6 text-right">-</td>
                    <td className="py-2.5 px-6 text-slate-500 text-[11px]">
                      Customer sale amounts reversed due to customer returns
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-6 pl-12">
                      Offer Amount
                      <SourceIndicator
                        defId="totalOfferAmount"
                        matchedCol={columnMappings.totalOfferAmount}
                        onOpenModal={onOpenMetricInfo}
                      />
                    </td>
                    <td className="py-2.5 px-6 text-right">-</td>
                    <td className="py-2.5 px-6 text-right font-mono text-slate-700">
                      {formatINR(summary?.offerAmount || 0)}
                    </td>
                    <td className="py-2.5 px-6 text-right">-</td>
                    <td className="py-2.5 px-6 text-slate-500 text-[11px]">
                      Discounts offered to customers on sale value
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-6 pl-12">
                      Customer Add-Ons Amount
                      <SourceIndicator
                        defId="customerAddOns"
                        matchedCol={columnMappings.customerAddOns}
                        onOpenModal={onOpenMetricInfo}
                      />
                    </td>
                    <td className="py-2.5 px-6 text-right">-</td>
                    <td className="py-2.5 px-6 text-right font-mono text-slate-700">
                      {formatINR(summary?.customerAddOns || 0)}
                    </td>
                    <td className="py-2.5 px-6 text-right">-</td>
                    <td className="py-2.5 px-6 text-slate-500 text-[11px]">
                      Additional convenience fees like faster delivery / CoD
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-6 pl-12 text-rose-700">
                      Marketplace Fees
                      <SourceIndicator
                        defId="marketplaceFee"
                        matchedCol={columnMappings.marketplaceFee}
                        onOpenModal={onOpenMetricInfo}
                      />
                    </td>
                    <td className="py-2.5 px-6 text-right">-</td>
                    <td className="py-2.5 px-6 text-right font-mono text-rose-600">
                      {formatINR(mpFees)}
                    </td>
                    <td className="py-2.5 px-6 text-right">-</td>
                    <td className="py-2.5 px-6 text-slate-500 text-[11px]">
                      Sum of Commission, Fixed, Shipping, Reverse Shipping, Collection fees
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-6 pl-12 text-rose-700">
                      Taxes (GST on MP Fees)
                      <SourceIndicator
                        defId="taxes"
                        matchedCol={columnMappings.taxes}
                        onOpenModal={onOpenMetricInfo}
                      />
                    </td>
                    <td className="py-2.5 px-6 text-right">-</td>
                    <td className="py-2.5 px-6 text-right font-mono text-rose-600">
                      {formatINR(taxes)}
                    </td>
                    <td className="py-2.5 px-6 text-right">-</td>
                    <td className="py-2.5 px-6 text-slate-500 text-[11px]">
                      18% GST charged on marketplace fees
                    </td>
                  </tr>

                  {/* 2. Protection Fund (SPF) */}
                  <tr className="bg-slate-50/50 font-bold text-slate-900">
                    <td className="py-3 px-6 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Protection Fund (SPF)
                      <SourceIndicator
                        defId="compensation"
                        matchedCol={columnMappings.compensation}
                        onOpenModal={onOpenMetricInfo}
                      />
                    </td>
                    <td className="py-3 px-6 text-right font-mono text-emerald-700">
                      {formatINR(spf)}
                    </td>
                    <td className="py-3 px-6 text-right">-</td>
                    <td className="py-3 px-6 text-right">-</td>
                    <td className="py-3 px-6 text-slate-500 text-[11px]">
                      Approved SPF amount towards damaged/lost claims
                    </td>
                  </tr>

                  {/* 3. Services Fees / Ads */}
                  <tr className="bg-slate-50/50 font-bold text-slate-900">
                    <td className="py-3 px-6 flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-amber-600" />
                      Services Fees (Ads, Storage, Recall)
                    </td>
                    <td className="py-3 px-6 text-right font-mono text-rose-600">
                      {formatINR(servicesFees)}
                    </td>
                    <td className="py-3 px-6 text-right">-</td>
                    <td className="py-3 px-6 text-right">-</td>
                    <td className="py-3 px-6 text-slate-500 text-[11px]">
                      Flipkart Advertising wallet deductions and FBF storage fees
                    </td>
                  </tr>
                  {adsFees !== 0 && (
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-6 pl-12 text-rose-700">
                        Ads Fees
                      </td>
                      <td className="py-2.5 px-6 text-right">-</td>
                      <td className="py-2.5 px-6 text-right font-mono text-rose-600">
                        {formatINR(adsFees)}
                      </td>
                      <td className="py-2.5 px-6 text-right">-</td>
                      <td className="py-2.5 px-6 text-slate-500 text-[11px]">
                        Wallet top-ups or postpaid advertising spend on Flipkart Ads
                      </td>
                    </tr>
                  )}

                  {/* Final Net Bank Settlement Row */}
                  <tr className="bg-indigo-50/80 font-bold text-slate-900 border-t-2 border-indigo-200">
                    <td className="py-4 px-6 text-sm text-indigo-950 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-indigo-700" />
                      Net Bank Settlement (A)
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-base font-extrabold text-indigo-900">
                      {formatINR(netBankSettlement)}
                    </td>
                    <td className="py-4 px-6 text-right">-</td>
                    <td className="py-4 px-6 text-right">-</td>
                    <td className="py-4 px-6 text-indigo-800 text-xs font-semibold">
                      Orders ({formatINR(ordersSettled)}) + SPF ({formatINR(spf)}) + Services ({formatINR(servicesFees)})
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
