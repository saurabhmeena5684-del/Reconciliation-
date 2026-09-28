import { FlipkartWorkbookSummary, SummaryTableRow } from '../types/recon';

function parseNumber(val: any): number | undefined {
  if (val == null || val === '') return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : val;
  const cleaned = String(val).replace(/[₹$,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

export function parseSummaryOfReportSheet(rows: any[][]): FlipkartWorkbookSummary {
  const summary: FlipkartWorkbookSummary = {
    tableRows: [],
  };

  let tableStarted = false;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    // Join all cells in row to inspect line item
    const fullRowText = row.map(c => String(c || '').trim()).join(' ').toLowerCase();

    // Payment Duration
    if (fullRowText.includes('payment duration')) {
      for (let c = 0; c < row.length; c++) {
        const str = String(row[c] || '').trim();
        if (/\d{4}-\d{2}-\d{2}/.test(str)) {
          summary.paymentDuration = str;
          break;
        }
      }
    }

    // # Sale Orders (Not returned)
    if (fullRowText.includes('sale orders') || fullRowText.includes('not returned')) {
      for (let c = 0; c < row.length; c++) {
        const num = parseNumber(row[c]);
        if (num !== undefined && num > 0) {
          summary.saleOrdersCount = num;
          break;
        }
      }
    }

    // # Returns
    if (fullRowText.includes('returns') && !fullRowText.includes('reversal') && !fullRowText.includes('sale orders')) {
      for (let c = 0; c < row.length; c++) {
        const num = parseNumber(row[c]);
        if (num !== undefined && num > 0) {
          summary.returnsCount = num;
          break;
        }
      }
    }

    // Check table header
    if (fullRowText.includes('line item') && fullRowText.includes('break-up l1')) {
      tableStarted = true;
      continue;
    }

    // Parse table row if table started
    if (tableStarted) {
      // Columns in row:
      // index 1: Line Item
      // index 2: Break-up L1
      // index 3: Break-up L2
      // index 4: Amount Settled (Rs.)
      // index 5: Break-up L1 (Rs.)
      // index 6: Break-up L2 (Rs.)
      // index 7: Remarks
      const col1 = row[1] ? String(row[1]).trim() : undefined;
      const col2 = row[2] ? String(row[2]).trim() : undefined;
      const col3 = row[3] ? String(row[3]).trim() : undefined;
      const col4 = parseNumber(row[4]);
      const col5 = parseNumber(row[5]);
      const col6 = parseNumber(row[6]);
      const col7 = row[7] ? String(row[7]).trim() : undefined;

      if (col1 || col2 || col3 || col4 !== undefined || col5 !== undefined || col6 !== undefined) {
        summary.tableRows?.push({
          lineItem: col1,
          breakupL1: col2,
          breakupL2: col3,
          amountSettled: col4,
          breakupL1Amount: col5,
          breakupL2Amount: col6,
          remarks: col7,
        });
      }

      // Map high-level metrics
      if (col1 === 'Orders' && col4 !== undefined) summary.ordersAmountSettled = col4;
      if (col2 === 'Sales Amount' && col5 !== undefined) summary.ordersGrossSales = col5;
      if (col2 === 'Returns Reversal' && col5 !== undefined) summary.returnsReversal = col5;
      if (col2 === 'Offer Amount' && col5 !== undefined) summary.offerAmount = col5;
      if (col2 === 'Customer Add-Ons Amount' && col5 !== undefined) summary.customerAddOns = col5;
      if (col2 === 'Marketplace Fees' && col5 !== undefined) summary.ordersMarketplaceFees = col5;
      if (col2 === 'Taxes' && col5 !== undefined) summary.ordersTaxes = col5;
      if (col1 === 'MP Fee Rebate' && col4 !== undefined) summary.mpFeeRebate = col4;
      if (col1 === 'Protection Fund (SPF)' && col4 !== undefined) summary.protectionFundTotal = col4;
      if (col2 === 'Order SPF' && col5 !== undefined) summary.orderSpf = col5;
      if (col2 === 'Non-Order SPF' && col5 !== undefined) summary.nonOrderSpf = col5;
      if (col1 === 'Services Fees' && col4 !== undefined) summary.servicesFeesTotal = col4;
      if (col2 === 'Ads Fees' && col5 !== undefined) summary.adsFees = col5;
      if (col2 === 'Storage Fees' && col5 !== undefined) summary.storageFees = col5;
      if (col2 === 'Recall Fees' && col5 !== undefined) summary.recallFees = col5;
      if (col2 === 'Taxes' && col5 !== undefined && fullRowText.includes('ads')) summary.servicesTaxes = col5;
      if (col1 === 'Fines' && col4 !== undefined) summary.finesTotal = col4;
      if (col1 === 'Net Bank Settlement (A)' && col4 !== undefined) summary.netBankSettlementA = col4;
      if (col1 === 'Input GST + TCS Credits (B)' && col4 !== undefined) summary.inputGstTcsCreditsB = col4;
    }
  }

  return summary;
}
