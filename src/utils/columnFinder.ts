import { ColumnDefinition, MatchedColumn, ColumnMappingState, RawRow, StandardReconRecord } from '../types/recon';

// Convert zero-indexed column number to Excel column letter (0 -> A, 1 -> B, 26 -> AA)
export function indexToExcelCol(index: number): string {
  let col = '';
  let temp = index;
  while (temp >= 0) {
    col = String.fromCharCode((temp % 26) + 65) + col;
    temp = Math.floor(temp / 26) - 1;
  }
  return col;
}

// Clean and normalize header strings from Flipkart (handles multiline labels, formulas, brackets, (Rs.))
export function cleanHeaderName(header: any): string {
  if (header == null) return '';
  let str = String(header)
    .replace(/[\r\n]+/g, ' ') // replace line breaks with space
    .replace(/\s+/g, ' ')     // collapse multiple spaces into single space
    .trim();
  return str;
}

// Normalize for matching: removes punctuation, formulas, currency tags
export function normalizeForSearch(header: string): string {
  return cleanHeaderName(header)
    .toLowerCase()
    .replace(/=\s*sum\s*\([^)]*\)/gi, '') // strip "= SUM(J:R)"
    .replace(/\[[^\]]*\]/g, '')           // strip "[GST+TCS]"
    .replace(/\(rs\.?\)/gi, '')          // strip "(Rs.)"
    .replace(/[^a-z0-9]/g, ' ')          // non-alphanumeric to space
    .replace(/\s+/g, ' ')
    .trim();
}

export const FLIPKART_COLUMN_DEFINITIONS: ColumnDefinition[] = [
  {
    id: 'paymentDate',
    label: 'Payment Date',
    description: 'The date on which Flipkart released or settled the payout into your bank account (NEFT).',
    formula: 'Exact date from "Payment Date" column. Found dynamically across column C, D, or any shifted position.',
    aliases: [
      'payment date',
      'paymentdate',
      'payout date',
      'settlement date',
      'bank payment date',
      'bank settlement date',
      'order payment date',
      'date of payment',
      'txn date',
      'transaction date',
    ],
    required: true,
    type: 'date',
  },
  {
    id: 'orderDate',
    label: 'Order Date',
    description: 'The date when the customer placed the order on Flipkart.',
    formula: 'Order placement timestamp. Used for order timeline tracking and order-date based reconciliation.',
    aliases: [
      'order date',
      'orderdate',
      'order placed date',
      'order created date',
      'purchase date',
    ],
    required: false,
    type: 'date',
  },
  {
    id: 'orderId',
    label: 'Order ID',
    description: 'Flipkart customer order identifier (OD...).',
    formula: 'Primary order grouping key.',
    aliases: [
      'order id',
      'order_id',
      'orderid',
      'customer order id',
      'order number',
    ],
    required: true,
    type: 'string',
  },
  {
    id: 'orderItemId',
    label: 'Order Item ID',
    description: 'Sub-item identifier for unique line items inside an order.',
    formula: 'Line-item level primary key for precise 1-to-1 order line reconciliation.',
    aliases: [
      'order item id',
      'order_item_id',
      'item id',
      'orderitemid',
      'sub order id',
    ],
    required: true,
    type: 'string',
  },
  {
    id: 'sku',
    label: 'Seller SKU',
    description: 'Your merchant SKU code assigned to the product.',
    formula: 'Fundamental grouping key for SKU-level profitability, returns, and settlement aggregation.',
    aliases: [
      'seller sku',
      'sku',
      'merchant sku',
      'sku id',
      'product sku',
      'seller_sku',
      'item sku',
      'fsn',
    ],
    required: true,
    type: 'string',
  },
  {
    id: 'productTitle',
    label: 'Product Title',
    description: 'Title or name of the catalog product on Flipkart.',
    formula: 'Catalog description for readable SKU tables.',
    aliases: [
      'product name',
      'product title',
      'title',
      'description',
      'item description',
      'product description',
      'product sub category',
      'sub category',
    ],
    required: false,
    type: 'string',
  },
  {
    id: 'quantity',
    label: 'Quantity (Order Qty - Col BH)',
    description: 'Actual ordered quantity of units from Column BH ("Quantity") in Flipkart Orders Sheet.',
    formula: 'SUM(Quantity from Column BH in Orders sheet). True ordered unit quantity, not row count.',
    aliases: [
      'quantity',
      'qty',
      'order quantity',
      'order qty',
      'ordered quantity',
      'ordered qty',
      'units',
      'item count',
      'total quantity',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'saleAmount',
    label: 'Sale Amount / Customer Paid',
    description: 'Gross price collected from the customer including taxes and discounts.',
    formula: 'Gross Sales value. Formula: SUM(Sale Amount / Total Offer Amount).',
    aliases: [
      'sale amount',
      'sale amount rs',
      'total offer amount',
      'customer paid',
      'order value',
      'gross sales',
      'invoice amount',
      'buyer price',
      'item price',
      'total price',
    ],
    required: true,
    type: 'number',
  },
  {
    id: 'totalOfferAmount',
    label: 'Total Offer Amount',
    description: 'Discount or offer amount applied on the customer sale.',
    formula: 'Direct extraction from "Total Offer Amount (Rs.)".',
    aliases: [
      'total offer amount',
      'total offer amount rs',
      'offer amount',
      'offer amount rs',
      'customer discount',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'bankSettlementValue',
    label: 'Bank Settlement Value (Net Payout)',
    description: 'Actual money transferred to or recovered from seller bank account for this line item.',
    formula: 'Net Settlement formula: Gross Sales - Total Marketplace Fees - Taxes (GST on fees) - TDS - TCS + Compensations.',
    aliases: [
      'bank settlement value rs sum j r',
      'bank settlement value rs',
      'bank settlement value',
      'settlement value rs',
      'settlement value',
      'settlement amount',
      'net settlement',
      'bank payout',
      'net amount',
      'total settlement',
      'payout value',
      'transfer amount',
      'net payable',
      'total bank settlement',
    ],
    required: true,
    type: 'number',
  },
  {
    id: 'returnType',
    label: 'Return Type / Order Status',
    description: 'Status indicating Delivered, Customer Return (post delivery), or Courier Return (RTO in-transit).',
    formula: 'Categorization rule: If status contains "Customer Return", classified as Customer Return. If "Courier Return" or "RTO", classified as Courier Return. Otherwise Delivered/Cancelled.',
    aliases: [
      'return type',
      'return type order status',
      'item return status',
      'order status',
      'status',
      'return status',
      'transaction type',
      'delivery status',
      'type of return',
      'sub status',
    ],
    required: false,
    type: 'string',
  },
  {
    id: 'marketplaceFee',
    label: 'Total Marketplace Fee',
    description: 'Total fee charged by Flipkart before taxes (Commission + Shipping + Fixed + Collection).',
    formula: 'SUM(Marketplace Fee) or SUM(Commission + Fixed + Collection + Shipping + Reverse Shipping + PickPack).',
    aliases: [
      'marketplace fee rs sum v ai',
      'marketplace fee rs',
      'marketplace fee',
      'total marketplace fee',
      'total fee',
      'flipkart fee',
      'total deduction',
      'fee amount',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'commission',
    label: 'Commission',
    description: 'Marketplace platform commission percentage charged on sale value.',
    formula: 'SUM(Commission (Rs.)).',
    aliases: [
      'commission rs',
      'commission',
      'commission amount',
      'referral fee',
      'platform commission',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'fixedFee',
    label: 'Fixed Closing Fee',
    description: 'Flat closing fee per order item depending on price slab.',
    formula: 'SUM(Fixed Fee (Rs.)).',
    aliases: [
      'fixed fee rs',
      'fixed fee',
      'closing fee',
      'fixed charges',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'collectionFee',
    label: 'Payment Collection Fee',
    description: 'Payment gateway / COD collection fee charged by Flipkart.',
    formula: 'SUM(Collection Fee (Rs.)).',
    aliases: [
      'collection fee rs',
      'collection fee',
      'payment gateway fee',
      'pg fee',
      'cod fee',
      'payment collection fee',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'shippingFee',
    label: 'Forward Shipping Fee',
    description: 'Logistics freight charges for delivering product to customer.',
    formula: 'SUM(Forward Shipping Fee (Rs.)).',
    aliases: [
      'shipping fee rs',
      'shipping fee',
      'forward shipping fee',
      'freight fee',
      'delivery fee',
      'logistics fee',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'reverseShippingFee',
    label: 'Reverse Shipping Fee (Return Courier)',
    description: 'Freight deducted by Flipkart when customer returns product or order is RTO.',
    formula: 'SUM(Reverse Shipping Fee (Rs.)). High impact on return loss.',
    aliases: [
      'reverse shipping fee rs',
      'reverse shipping fee',
      'reverse shipping',
      'reverse logistics fee',
      'return shipping',
      'rto fee',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'pickAndPackFee',
    label: 'Pick & Pack Fee',
    description: 'Fulfilment handling and warehouse pick-and-pack fee.',
    formula: 'SUM(Pick And Pack Fee (Rs.)).',
    aliases: [
      'pick and pack fee rs',
      'pick and pack fee',
      'pick & pack fee',
      'pick pack fee',
      'fulfillment fee',
      'handling fee',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'customerAddOns',
    label: 'Customer Add-ons Amount',
    description: 'Amount paid by customer for additional convenience like faster delivery, CoD payment, etc.',
    formula: 'Direct extraction from "Customer Add-ons Amount (Rs.)".',
    aliases: [
      'customer add ons amount rs',
      'customer add ons amount',
      'customer add ons',
      'add ons amount',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'taxes',
    label: 'GST on Marketplace Fees (Taxes)',
    description: '18% GST charged by Flipkart on Commission, Shipping, Fixed, and Collection fees.',
    formula: 'SUM(GST on MP Fees / Taxes). Eligible for Input Tax Credit (ITC) during GST return filing.',
    aliases: [
      'gst on mp fees rs',
      'gst on mp fees',
      'taxes rs',
      'taxes',
      'tax',
      'gst on fees',
      'total gst',
      'service tax',
      'gst amount',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'tds',
    label: 'TDS (Income Tax u/s 194-O)',
    description: 'TDS deducted at 0.1% / 1% under Income Tax Section 194-O, reflected in 26AS/AIS.',
    formula: 'SUM(TDS (Rs.) / Income Tax Credits). Claimable in annual ITR filing.',
    aliases: [
      'tds rs',
      'tds',
      'tds u s 194 o',
      'income tax credits rs tds',
      'income tax credits',
      'tds 194o',
      'tds section 194 o',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'tcs',
    label: 'TCS (GST Section 52)',
    description: 'Tax Collected at Source (1% GST TCS) deposited to government by Flipkart.',
    formula: 'SUM(TCS (Rs.) / Input GST + TCS Credits). Claimable in monthly GST portal cash ledger.',
    aliases: [
      'tcs rs',
      'tcs',
      'gst tcs',
      'tcs recovery',
      'tcs amount',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'inputGstTcsCredits',
    label: 'Input GST + TCS Credits',
    description: 'Total tax credits eligible for claiming in GSTR-2B and GST portal.',
    formula: 'SUM("Input GST + TCS Credits (Rs.) [GST+TCS]").',
    aliases: [
      'input gst tcs credits rs gst tcs',
      'input gst tcs credits rs',
      'input gst tcs credits',
      'input tax credit',
      'itc credits',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'refund',
    label: 'Refund Amount',
    description: 'Amount reversed/refunded to customer for returned items.',
    formula: 'SUM(Refund (Rs.)). Reverses customer sale value.',
    aliases: [
      'refund rs',
      'refund',
      'returns reversal',
      'refund amount',
      'customer refund',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'compensation',
    label: 'Seller Protection / Compensation (SPF)',
    description: 'Reimbursement or waiver credited by Flipkart for lost/damaged returns.',
    formula: 'SUM(Protection Fund / SPF Claims). Added to net settlement.',
    aliases: [
      'protection fund rs',
      'protection fund',
      'seller protection fund',
      'spf',
      'compensation',
      'reimbursement',
      'claim amount',
      'spf claim',
      'order spf',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'neftId',
    label: 'NEFT ID / Transaction Ref',
    description: 'Bank payment NEFT reference code corresponding to the settlement payout.',
    formula: 'Bank transaction reference matching your bank account statement.',
    aliases: [
      'neft id',
      'neft no',
      'neft reference',
      'utr number',
      'bank ref no',
      'payout id',
    ],
    required: false,
    type: 'string',
  },
  {
    id: 'neftType',
    label: 'NEFT Type',
    description: 'Type of settlement transaction (Prepaid, Postpaid, Adjustment).',
    formula: 'Direct extraction from "Neft Type".',
    aliases: [
      'neft type',
      'settlement type',
      'payout type',
    ],
    required: false,
    type: 'string',
  },
  {
    id: 'shopsyOrder',
    label: 'Shopsy Order Flag',
    description: 'Indicates whether the order originated from Flipkart Shopsy app.',
    formula: 'Direct extraction from "Shopsy Order" column (True/False).',
    aliases: [
      'shopsy order',
      'shopsy',
      'is shopsy',
    ],
    required: false,
    type: 'string',
  },
  {
    id: 'fulfilmentType',
    label: 'Fulfilment Type',
    description: 'Flipkart Fulfilment (FBF / Smart) vs Non-FBF (Seller Fulfilled).',
    formula: 'Direct extraction from "Fulfilment Type".',
    aliases: [
      'fulfilment type',
      'fulfillment type',
      'fulfillment',
    ],
    required: false,
    type: 'string',
  },
  {
    id: 'shippingZone',
    label: 'Shipping Zone',
    description: 'Logistics delivery distance zone (Local, Zonal, National, Special).',
    formula: 'Direct extraction from "Shipping Zone".',
    aliases: [
      'shipping zone',
      'zone',
      'delivery zone',
    ],
    required: false,
    type: 'string',
  },
  {
    id: 'deadWeight',
    label: 'Dead Weight (kgs)',
    description: 'Physical package weight in kilograms used for freight slab calculation.',
    formula: 'Direct extraction from "Dead Weight (kgs)".',
    aliases: [
      'dead weight kgs',
      'dead weight',
      'weight kgs',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'invoiceId',
    label: 'Buyer Invoice ID',
    description: 'Tax Invoice ID generated for the buyer sale.',
    formula: 'Direct extraction from "Invoice ID".',
    aliases: [
      'invoice id',
      'buyer invoice id',
      'invoice number',
    ],
    required: false,
    type: 'string',
  },
  {
    id: 'unitCost',
    label: 'Landed Unit Purchase Cost',
    description: 'Your purchase or manufacturing cost per unit from the uploaded "cost" sheet.',
    formula: 'LOOKUP from Cost Sheet: costSheet[SKU] * Delivered Units.',
    aliases: [
      'cost',
      'unit cost',
      'purchase cost',
      'buying price',
      'landed cost',
      'cogs',
    ],
    required: false,
    type: 'number',
  },
  {
    id: 'netProfit',
    label: 'Net Realized Profit / Loss',
    description: 'Final net profit earned after Flipkart settlement minus product purchase cost.',
    formula: 'Net Settlement Received - Total Product Cost (COGS) - Uncompensated Customer Return Product Loss.',
    aliases: [
      'net profit',
      'profit',
      'net margin',
      'pnl',
      'profit loss',
    ],
    required: false,
    type: 'number',
  },
];

// Scan rows 0 to 5 of an Excel sheet array to find the row that has the actual column headers
export function findBestHeaderRowIndex(rows: any[][]): number {
  if (!rows || rows.length === 0) return 0;

  let bestIndex = 0;
  let maxScore = -1;

  const coreKeywords = [
    'neft id',
    'order id',
    'payment date',
    'seller sku',
    'bank settlement value',
    'sale amount',
    'order item id',
    'marketplace fee',
    'return type',
    'commission',
    'taxes',
  ];

  for (let r = 0; r < Math.min(rows.length, 6); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    let score = 0;
    const seenColNames = new Set<string>();

    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim();
      if (!cell) continue;

      const norm = normalizeForSearch(cell);
      for (const kw of coreKeywords) {
        if (norm.includes(kw) && !seenColNames.has(kw)) {
          score += 5;
          seenColNames.add(kw);
        }
      }

      // Bonus if contains exact patterns
      if (/neft\s*id/i.test(cell)) score += 10;
      if (/order\s*id/i.test(cell)) score += 10;
      if (/payment\s*date/i.test(cell)) score += 10;
      if (/seller\s*sku/i.test(cell)) score += 10;
      if (/bank\s*settlement/i.test(cell)) score += 10;
      if (/order\s*item\s*id/i.test(cell)) score += 8;
    }

    if (score > maxScore) {
      maxScore = score;
      bestIndex = r;
    }
  }

  return bestIndex;
}

// Automatically detect which header in the uploaded file corresponds to which standard Flipkart column definition
export function detectColumnMappings(headers: string[]): ColumnMappingState {
  const mappings: ColumnMappingState = {};
  const cleanedHeaders = headers.map(cleanHeaderName);
  const normalizedHeaders = cleanedHeaders.map(normalizeForSearch);

  for (const def of FLIPKART_COLUMN_DEFINITIONS) {
    let bestMatch: MatchedColumn | null = null;
    let highestConfidence = 0;

    for (let i = 0; i < headers.length; i++) {
      const originalHeader = headers[i] || '';
      const cleaned = cleanedHeaders[i];
      const norm = normalizedHeaders[i];

      if (!norm) continue;

      // Safeguard: Never match "No Cost EMI" or fee reimbursement columns to unit purchase cost
      if (def.id === 'unitCost' && (norm.includes('emi') || norm.includes('reimbursement') || norm.includes('fee'))) {
        continue;
      }

      // 1. Exact match on normalized label
      const normLabel = normalizeForSearch(def.label);
      if (norm === normLabel) {
        bestMatch = {
          defId: def.id,
          sourceColumnIndex: i,
          sourceColumnLetter: indexToExcelCol(i),
          sourceHeaderName: originalHeader,
          matchType: 'exact',
          confidence: 1.0,
          sampleValues: [],
        };
        highestConfidence = 1.0;
        break;
      }

      // 2. Exact match against known aliases
      for (const alias of def.aliases) {
        const normAlias = normalizeForSearch(alias);
        if (norm === normAlias) {
          bestMatch = {
            defId: def.id,
            sourceColumnIndex: i,
            sourceColumnLetter: indexToExcelCol(i),
            sourceHeaderName: originalHeader,
            matchType: 'alias',
            confidence: 0.98,
            sampleValues: [],
          };
          highestConfidence = 0.98;
          break;
        }
      }
      if (highestConfidence >= 0.98) break;

      // 3. Substring / Inclusion match
      for (const alias of def.aliases) {
        const normAlias = normalizeForSearch(alias);
        if (normAlias.length > 3 && (norm.includes(normAlias) || normAlias.includes(norm))) {
          const confidence = 0.85;
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestMatch = {
              defId: def.id,
              sourceColumnIndex: i,
              sourceColumnLetter: indexToExcelCol(i),
              sourceHeaderName: originalHeader,
              matchType: 'fuzzy',
              confidence,
              sampleValues: [],
            };
          }
        }
      }
    }

    if (bestMatch) {
      mappings[def.id] = bestMatch;
    }
  }

  return mappings;
}

// Parse string/number into sanitized float
function parseMoney(val: any): number {
  if (val == null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[₹$,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Parse date into standard YYYY-MM-DD
function parseStandardDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel serial date format (days since Dec 30, 1899)
    try {
      const utcDays = Math.floor(val - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      if (!isNaN(dateInfo.getTime())) {
        return dateInfo.toISOString().split('T')[0];
      }
    } catch {
      // ignore
    }
  }

  const str = String(val).trim();
  if (!str) return '';

  // Handle DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // Handle YYYY-MM-DD
  const yyyymmdd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (yyyymmdd) {
    const year = yyyymmdd[1];
    const month = yyyymmdd[2].padStart(2, '0');
    const day = yyyymmdd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Standard JS Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return str;
}

// Standardize raw rows into structured reconciliation records
export function mapRowsToStandardRecords(
  rawRows: RawRow[],
  mappings: ColumnMappingState,
  headers: string[],
  costMap: Record<string, number> = {}
): StandardReconRecord[] {
  return rawRows.map((row, idx) => {
    const getVal = (defId: string): any => {
      const mapping = mappings[defId];
      if (!mapping) return undefined;
      const headerName = headers[mapping.sourceColumnIndex];
      return row[headerName] !== undefined ? row[headerName] : row[mapping.sourceColumnIndex];
    };

    const paymentDateRaw = getVal('paymentDate');
    const orderDateRaw = getVal('orderDate');
    const dispatchDateRaw = getVal('dispatchDate');
    const orderId = String(getVal('orderId') || `ORD-${idx + 1}`).trim();
    const orderItemId = String(getVal('orderItemId') || `ITEM-${idx + 1}`).trim();
    const sku = String(getVal('sku') || 'UNKNOWN-SKU').trim();
    const productTitle = getVal('productTitle') ? String(getVal('productTitle')) : undefined;
    
    // Safely extract ordered quantity from Column BH ("Quantity") in Flipkart Orders sheet
    let rawQuantity = getVal('quantity');
    if (rawQuantity === undefined || rawQuantity === null || rawQuantity === '') {
      // Fallback check: directly from row keys matching Quantity or Column BH (index 59)
      rawQuantity = row['Quantity'] ?? row['quantity'] ?? row['Qty'] ?? row['qty'] ?? row[59];
    }
    let quantity = 1;
    if (rawQuantity !== undefined && rawQuantity !== null && String(rawQuantity).trim() !== '') {
      const parsedQ = parseInt(String(rawQuantity).replace(/[^\d]/g, ''), 10);
      if (!isNaN(parsedQ) && parsedQ >= 0) {
        quantity = parsedQ;
      }
    }

    const saleAmount = parseMoney(getVal('saleAmount'));
    const totalOfferAmount = parseMoney(getVal('totalOfferAmount'));
    const customerAddOns = parseMoney(getVal('customerAddOns'));
    const bankSettlementValue = parseMoney(getVal('bankSettlementValue'));
    const marketplaceFee = parseMoney(getVal('marketplaceFee'));
    const commission = parseMoney(getVal('commission'));
    const fixedFee = parseMoney(getVal('fixedFee'));
    const collectionFee = parseMoney(getVal('collectionFee'));
    const shippingFee = parseMoney(getVal('shippingFee'));
    const reverseShippingFee = parseMoney(getVal('reverseShippingFee'));
    const pickAndPackFee = parseMoney(getVal('pickAndPackFee'));
    const taxes = parseMoney(getVal('taxes'));
    const tds = parseMoney(getVal('tds'));
    const tcs = parseMoney(getVal('tcs'));
    const inputGstTcsCredits = parseMoney(getVal('inputGstTcsCredits'));
    const refundAmount = parseMoney(getVal('refund'));
    const compensation = parseMoney(getVal('compensation'));
    const neftId = getVal('neftId') ? String(getVal('neftId')) : undefined;
    const neftType = getVal('neftType') ? String(getVal('neftType')) : undefined;
    const shopsyOrder = getVal('shopsyOrder') ? String(getVal('shopsyOrder')) : undefined;
    const fulfilmentType = getVal('fulfilmentType') ? String(getVal('fulfilmentType')) : undefined;
    const shippingZone = getVal('shippingZone') ? String(getVal('shippingZone')) : undefined;
    const deadWeight = parseMoney(getVal('deadWeight'));
    const invoiceId = getVal('invoiceId') ? String(getVal('invoiceId')) : undefined;
    const invoiceDate = getVal('invoiceDate') ? parseStandardDate(getVal('invoiceDate')) : undefined;

    // Detect return type with high fidelity
    const rawStatus = String(getVal('returnType') || '').trim();
    const lowerStatus = rawStatus.toLowerCase();

    let returnType: StandardReconRecord['returnType'] = 'Delivered';
    if (lowerStatus.includes('customer return') || lowerStatus.includes('customer_return') || lowerStatus.includes('buyer return')) {
      returnType = 'Customer Return';
    } else if (lowerStatus.includes('courier return') || lowerStatus.includes('courier_return') || lowerStatus.includes('rto') || lowerStatus.includes('undelivered')) {
      returnType = 'Courier Return';
    } else if (lowerStatus.includes('cancel')) {
      returnType = 'Cancellation';
    } else if (lowerStatus.includes('replace')) {
      returnType = 'Replacement';
    } else if (refundAmount > 0 && bankSettlementValue <= 0) {
      returnType = 'Customer Return';
    } else if (reverseShippingFee > 0 && saleAmount <= 0) {
      returnType = 'Courier Return';
    }

    // Cost & Profit calculations
    const unitCost = costMap[sku] !== undefined ? costMap[sku] : 0;
    let totalCostOfGoods = 0;
    let netProfit = 0;

    if (returnType === 'Delivered') {
      totalCostOfGoods = unitCost * quantity;
      netProfit = bankSettlementValue - totalCostOfGoods;
    } else if (returnType === 'Customer Return') {
      // If customer returned, seller incurs payout deduction + possible damaged unit cost if not SPF compensated
      totalCostOfGoods = compensation > 0 ? 0 : unitCost * quantity;
      netProfit = bankSettlementValue - totalCostOfGoods;
    } else if (returnType === 'Courier Return') {
      // In Courier RTO, unit returns intact to seller inventory (no goods cost lost)
      totalCostOfGoods = 0;
      netProfit = bankSettlementValue; // usually negative reverse shipping fee
    } else {
      totalCostOfGoods = 0;
      netProfit = bankSettlementValue;
    }

    return {
      id: `${orderId}_${orderItemId}_${idx}`,
      rowNum: idx + 1,
      paymentDate: parseStandardDate(paymentDateRaw),
      orderDate: parseStandardDate(orderDateRaw),
      dispatchDate: parseStandardDate(dispatchDateRaw),
      orderId,
      orderItemId,
      sku,
      productTitle,
      quantity,
      saleAmount,
      totalOfferAmount,
      customerAddOns,
      bankSettlementValue,
      returnType,
      rawStatus: rawStatus || returnType,
      marketplaceFee,
      commission,
      fixedFee,
      collectionFee,
      shippingFee,
      reverseShippingFee,
      pickAndPackFee,
      taxes,
      tds,
      tcs,
      inputGstTcsCredits,
      refundAmount,
      compensation,
      neftId,
      neftType,
      shopsyOrder,
      fulfilmentType,
      shippingZone,
      deadWeight,
      invoiceId,
      invoiceDate,
      raw: row,
      unitCost,
      totalCostOfGoods,
      netProfit,
    };
  });
}
