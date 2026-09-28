export interface SkuCostItem {
  sku: string;
  cost: number;
}

export type SkuCostMap = Record<string, number>;

export interface ColumnDefinition {
  id: string;
  label: string;
  aliases: string[];
  description: string;
  formula: string;
  required: boolean;
  type: 'date' | 'number' | 'string';
  columnGroup?: string; // e.g., 'Payment Details', 'Transaction Summary', 'Marketplace Fees', 'Order Details'
  standardColumnLetter?: string; // e.g., 'A', 'C', 'D', 'H', 'BG'
}

export interface WorkbookSheetRecord {
  name: string;
  headers: string[];
  rows: any[][];
  count: number;
}

export type AllWorkbookSheetsData = Record<string, WorkbookSheetRecord>;

export interface MatchedColumn {
  defId: string;
  sourceColumnIndex: number;
  sourceColumnLetter: string; // e.g., 'A', 'B', 'C', 'D'
  sourceHeaderName: string;
  matchType: 'exact' | 'alias' | 'fuzzy' | 'manual';
  confidence: number;
  sampleValues: (string | number)[];
}

export type ColumnMappingState = Record<string, MatchedColumn>;

export interface RawRow {
  __rowNum: number;
  [key: string]: any;
}

export interface StandardReconRecord {
  id: string;
  rowNum: number;
  paymentDate?: string; // YYYY-MM-DD
  orderDate?: string;
  dispatchDate?: string;
  orderId: string;
  orderItemId: string;
  sku: string;
  productTitle?: string;
  fsn?: string;
  quantity: number;
  saleAmount: number; // Customer price paid / Order amount
  bankSettlementValue: number; // Net amount deposited to bank
  returnType: 'Delivered' | 'Customer Return' | 'Courier Return' | 'Replacement' | 'Cancellation' | 'Other';
  rawStatus: string;
  marketplaceFee: number;
  commission: number;
  fixedFee: number;
  collectionFee: number;
  shippingFee: number;
  reverseShippingFee: number;
  pickAndPackFee: number;
  taxes: number; // GST on marketplace fees
  tds: number; // 194-O
  tcs: number; // GST TCS
  compensation: number; // SPF claim / waivers
  neftId?: string;
  neftType?: string;
  // Flipkart specific columns from official report
  totalOfferAmount?: number;
  customerAddOns?: number;
  refundAmount?: number;
  inputGstTcsCredits?: number;
  incomeTaxCreditsTds?: number;
  shopsyOrder?: string;
  itemReturnStatus?: string;
  fulfilmentType?: string;
  shippingZone?: string;
  deadWeight?: number;
  chargeableWeightSlab?: string;
  invoiceId?: string;
  invoiceDate?: string;
  raw: Record<string, any>;
  // Cost & Profitability fields
  unitCost: number;
  totalCostOfGoods: number; // unitCost * quantity (for delivered units)
  netProfit: number; // bankSettlementValue - totalCostOfGoods
}

export interface SkuSummary {
  sku: string;
  productTitle: string;
  totalOrders: number; // Transaction / order line count
  totalUnits: number; // Real Order Quantity SUM from Column BH ("Quantity") in Orders sheet
  orderQuantity?: number; // Alias for totalUnits (Column BH)
  deliveredUnits: number; // Delivered units (Column BH)
  customerReturnsUnits?: number; // Customer returned units (Column BH)
  courierReturnsUnits?: number; // Courier returned units (Column BH)
  grossSales: number;
  netSettlement: number;
  customerReturnsCount: number;
  customerReturnsValue: number;
  courierReturnsCount: number;
  courierReturnsCost: number;
  totalFees: number;
  commission: number;
  shippingFees: number;
  reverseShippingFees: number;
  fixedFees: number;
  collectionFees: number;
  taxes: number;
  tdsTcs: number;
  compensations: number;
  effectiveRealizationPercent: number; // (netSettlement / grossSales) * 100
  customerReturnRate: number; // (customerReturns / totalUnits or totalOrders) * 100
  courierReturnRate: number; // (courierReturns / totalUnits or totalOrders) * 100
  // Cost & Profit fields
  unitCost: number;
  hasCostConfigured: boolean;
  totalCostOfGoodsSold: number;
  netProfit: number; // netSettlement - totalCostOfGoodsSold
  netProfitMarginPercent: number; // (netProfit / grossSales) * 100
  roiPercent: number; // (netProfit / totalCostOfGoodsSold) * 100
}

export interface ReconAggregate {
  totalRecords: number;
  totalOrders: number;
  totalUnitsSold: number; // Sum of Column BH ("Quantity") across all lines
  deliveredUnitsCount: number; // Sum of Column BH ("Quantity") for delivered orders
  customerReturnsUnits: number; // Sum of Column BH ("Quantity") for customer returns
  courierReturnsUnits: number; // Sum of Column BH ("Quantity") for courier returns
  grossSales: number;
  totalSettlementReceived: number;
  deliveredOrdersCount: number;
  deliveredSalesValue: number;
  customerReturnsCount: number;
  customerReturnsAmount: number;
  courierReturnsCount: number;
  courierReturnsImpact: number;
  cancellationsCount: number;
  totalMarketplaceFees: number;
  commissionTotal: number;
  fixedFeesTotal: number;
  collectionFeesTotal: number;
  shippingFeesTotal: number;
  reverseShippingFeesTotal: number;
  pickPackFeesTotal: number;
  taxesTotal: number;
  tdsTotal: number;
  tcsTotal: number;
  compensationsTotal: number;
  effectiveSettlementRate: number; // percentage
  negativePayoutOrdersCount: number;
  negativePayoutAmount: number;
  startDate?: string;
  endDate?: string;
  uniqueSkusCount: number;
  // Total Cost & Profit Metrics
  totalCostOfGoodsSold: number;
  totalNetProfit: number; // totalSettlementReceived - totalCostOfGoodsSold
  netProfitMarginPercent: number; // (totalNetProfit / grossSales) * 100
  costCoverageRatio: number; // (totalSettlementReceived / totalCostOfGoodsSold)
  skusWithCostCount: number;
}

export interface SummaryTableRow {
  lineItem?: string;
  breakupL1?: string;
  breakupL2?: string;
  amountSettled?: number;
  breakupL1Amount?: number;
  breakupL2Amount?: number;
  remarks?: string;
}

// Executive Summary parsed from Flipkart "Summary of report" sheet
export interface FlipkartWorkbookSummary {
  paymentDuration?: string;
  saleOrdersCount?: number;
  returnsCount?: number;
  ordersGrossSales?: number;
  returnsReversal?: number;
  offerAmount?: number;
  customerAddOns?: number;
  ordersMarketplaceFees?: number;
  ordersTaxes?: number;
  ordersAmountSettled?: number;
  mpFeeRebate?: number;
  orderSpf?: number;
  nonOrderSpf?: number;
  protectionFundTotal?: number;
  adsFees?: number;
  storageFees?: number;
  recallFees?: number;
  servicesTaxes?: number;
  servicesFeesTotal?: number;
  finesTotal?: number;
  tcsRecovery?: number;
  tdsClaims?: number;
  netBankSettlementA?: number;
  inputGstTcsCreditsB?: number;
  tableRows?: SummaryTableRow[];
}

export interface FilterState {
  marketplace: string;
  dateRangeType: 'paymentDate' | 'orderDate';
  startDate: string;
  endDate: string;
  selectedSku: string; // 'all' or specific SKU
  returnTypeFilter: string; // 'all' | 'Delivered' | 'Customer Return' | 'Courier Return'
  searchQuery: string;
  // Advanced Excel-like filters
  payoutFilter: 'all' | 'positive' | 'negative' | 'zero';
  salesRangeMin: string;
  salesRangeMax: string;
  settlementRangeMin: string;
  settlementRangeMax: string;
  profitFilter: 'all' | 'profitOnly' | 'lossOnly';
  sortBy: 'dateDesc' | 'dateAsc' | 'settlementDesc' | 'settlementAsc' | 'salesDesc' | 'profitDesc' | 'profitAsc' | 'skuAsc';
}
