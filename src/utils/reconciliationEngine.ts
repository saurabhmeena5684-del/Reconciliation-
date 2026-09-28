import { FilterState, ReconAggregate, SkuSummary, StandardReconRecord } from '../types/recon';

// Filter records based on active user filters
export function filterRecords(records: StandardReconRecord[], filters: FilterState): StandardReconRecord[] {
  const filtered = records.filter(record => {
    // 1. Date range filter
    const targetDate = filters.dateRangeType === 'paymentDate' ? record.paymentDate : record.orderDate;
    if (targetDate) {
      if (filters.startDate && targetDate < filters.startDate) return false;
      if (filters.endDate && targetDate > filters.endDate) return false;
    }

    // 2. SKU filter
    if (filters.selectedSku && filters.selectedSku !== 'all') {
      if (record.sku !== filters.selectedSku) return false;
    }

    // 3. Return type / Status filter
    if (filters.returnTypeFilter && filters.returnTypeFilter !== 'all') {
      if (record.returnType !== filters.returnTypeFilter) return false;
    }

    // 4. Payout status filter (Positive vs Negative / Loss-making order payouts)
    if (filters.payoutFilter === 'positive' && record.bankSettlementValue <= 0) return false;
    if (filters.payoutFilter === 'negative' && record.bankSettlementValue >= 0) return false;
    if (filters.payoutFilter === 'zero' && record.bankSettlementValue !== 0) return false;

    // 5. Net Profit / Loss filter
    if (filters.profitFilter === 'profitOnly' && record.netProfit <= 0) return false;
    if (filters.profitFilter === 'lossOnly' && record.netProfit >= 0) return false;

    // 6. Sales Amount Range Min/Max
    if (filters.salesRangeMin && filters.salesRangeMin.trim() !== '') {
      const min = parseFloat(filters.salesRangeMin);
      if (!isNaN(min) && record.saleAmount < min) return false;
    }
    if (filters.salesRangeMax && filters.salesRangeMax.trim() !== '') {
      const max = parseFloat(filters.salesRangeMax);
      if (!isNaN(max) && record.saleAmount > max) return false;
    }

    // 7. Bank Settlement Range Min/Max
    if (filters.settlementRangeMin && filters.settlementRangeMin.trim() !== '') {
      const min = parseFloat(filters.settlementRangeMin);
      if (!isNaN(min) && record.bankSettlementValue < min) return false;
    }
    if (filters.settlementRangeMax && filters.settlementRangeMax.trim() !== '') {
      const max = parseFloat(filters.settlementRangeMax);
      if (!isNaN(max) && record.bankSettlementValue > max) return false;
    }

    // 8. Search query (Order ID, Item ID, SKU, NEFT)
    if (filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase().trim();
      const match =
        record.orderId.toLowerCase().includes(q) ||
        record.orderItemId.toLowerCase().includes(q) ||
        record.sku.toLowerCase().includes(q) ||
        (record.neftId && record.neftId.toLowerCase().includes(q)) ||
        (record.productTitle && record.productTitle.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  // Apply sorting
  return filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case 'dateAsc':
        return (a.paymentDate || '').localeCompare(b.paymentDate || '');
      case 'dateDesc':
        return (b.paymentDate || '').localeCompare(a.paymentDate || '');
      case 'settlementDesc':
        return b.bankSettlementValue - a.bankSettlementValue;
      case 'settlementAsc':
        return a.bankSettlementValue - b.bankSettlementValue;
      case 'salesDesc':
        return b.saleAmount - a.saleAmount;
      case 'profitDesc':
        return b.netProfit - a.netProfit;
      case 'profitAsc':
        return a.netProfit - b.netProfit;
      case 'skuAsc':
        return a.sku.localeCompare(b.sku);
      default:
        return 0;
    }
  });
}

// Compute high-level financial reconciliation aggregates (Strict Formula-Driven)
export function computeAggregates(records: StandardReconRecord[]): ReconAggregate {
  let grossSales = 0;
  let totalSettlementReceived = 0;
  let totalUnitsSold = 0;

  let deliveredOrdersCount = 0;
  let deliveredUnitsCount = 0;
  let deliveredSalesValue = 0;

  let customerReturnsCount = 0;
  let customerReturnsUnits = 0;
  let customerReturnsAmount = 0;

  let courierReturnsCount = 0;
  let courierReturnsUnits = 0;
  let courierReturnsImpact = 0;

  let cancellationsCount = 0;

  let commissionTotal = 0;
  let fixedFeesTotal = 0;
  let collectionFeesTotal = 0;
  let shippingFeesTotal = 0;
  let reverseShippingFeesTotal = 0;
  let pickPackFeesTotal = 0;
  let taxesTotal = 0;
  let tdsTotal = 0;
  let tcsTotal = 0;
  let compensationsTotal = 0;

  let negativePayoutOrdersCount = 0;
  let negativePayoutAmount = 0;

  let totalCostOfGoodsSold = 0;
  let skusWithCostSet = new Set<string>();

  const skuSet = new Set<string>();
  const orderItemSet = new Set<string>();

  let minDate: string | undefined = undefined;
  let maxDate: string | undefined = undefined;

  for (const r of records) {
    if (r.sku) skuSet.add(r.sku);
    orderItemSet.add(r.orderItemId);

    if (r.paymentDate) {
      if (!minDate || r.paymentDate < minDate) minDate = r.paymentDate;
      if (!maxDate || r.paymentDate > maxDate) maxDate = r.paymentDate;
    }

    grossSales += r.saleAmount;
    totalSettlementReceived += r.bankSettlementValue;
    totalUnitsSold += r.quantity;

    if (r.unitCost > 0) {
      skusWithCostSet.add(r.sku);
      totalCostOfGoodsSold += r.totalCostOfGoods;
    }

    if (r.returnType === 'Customer Return') {
      customerReturnsCount += 1;
      customerReturnsUnits += r.quantity;
      customerReturnsAmount += Math.abs(r.bankSettlementValue);
    } else if (r.returnType === 'Courier Return') {
      courierReturnsCount += 1;
      courierReturnsUnits += r.quantity;
      courierReturnsImpact += (r.shippingFee + r.reverseShippingFee);
    } else if (r.returnType === 'Cancellation') {
      cancellationsCount += 1;
    } else {
      deliveredOrdersCount += 1;
      deliveredUnitsCount += r.quantity;
      deliveredSalesValue += r.saleAmount;
    }

    commissionTotal += r.commission;
    fixedFeesTotal += r.fixedFee;
    collectionFeesTotal += r.collectionFee;
    shippingFeesTotal += r.shippingFee;
    reverseShippingFeesTotal += r.reverseShippingFee;
    pickPackFeesTotal += r.pickAndPackFee;
    taxesTotal += r.taxes;
    tdsTotal += r.tds;
    tcsTotal += r.tcs;
    compensationsTotal += r.compensation;

    // Check for negative settlement on this line item
    if (r.bankSettlementValue < 0) {
      negativePayoutOrdersCount += 1;
      negativePayoutAmount += Math.abs(r.bankSettlementValue);
    }
  }

  const totalMarketplaceFees =
    commissionTotal +
    fixedFeesTotal +
    collectionFeesTotal +
    shippingFeesTotal +
    reverseShippingFeesTotal +
    pickPackFeesTotal;

  // Realization % = (Net Settlement Received / Gross Sales) * 100
  const effectiveSettlementRate = grossSales > 0 ? (totalSettlementReceived / grossSales) * 100 : 0;

  // Net Profit = Settlement Received - Landed Cost of Goods Sold
  const totalNetProfit = Math.round((totalSettlementReceived - totalCostOfGoodsSold) * 100) / 100;
  const netProfitMarginPercent = grossSales > 0 ? (totalNetProfit / grossSales) * 100 : 0;
  const costCoverageRatio = totalCostOfGoodsSold > 0 ? totalSettlementReceived / totalCostOfGoodsSold : 0;

  return {
    totalRecords: records.length,
    totalOrders: orderItemSet.size,
    totalUnitsSold,
    deliveredUnitsCount,
    customerReturnsUnits,
    courierReturnsUnits,
    grossSales: Math.round(grossSales * 100) / 100,
    totalSettlementReceived: Math.round(totalSettlementReceived * 100) / 100,
    deliveredOrdersCount,
    deliveredSalesValue: Math.round(deliveredSalesValue * 100) / 100,
    customerReturnsCount,
    customerReturnsAmount: Math.round(customerReturnsAmount * 100) / 100,
    courierReturnsCount,
    courierReturnsImpact: Math.round(courierReturnsImpact * 100) / 100,
    cancellationsCount,
    totalMarketplaceFees: Math.round(totalMarketplaceFees * 100) / 100,
    commissionTotal: Math.round(commissionTotal * 100) / 100,
    fixedFeesTotal: Math.round(fixedFeesTotal * 100) / 100,
    collectionFeesTotal: Math.round(collectionFeesTotal * 100) / 100,
    shippingFeesTotal: Math.round(shippingFeesTotal * 100) / 100,
    reverseShippingFeesTotal: Math.round(reverseShippingFeesTotal * 100) / 100,
    pickPackFeesTotal: Math.round(pickPackFeesTotal * 100) / 100,
    taxesTotal: Math.round(taxesTotal * 100) / 100,
    tdsTotal: Math.round(tdsTotal * 100) / 100,
    tcsTotal: Math.round(tcsTotal * 100) / 100,
    compensationsTotal: Math.round(compensationsTotal * 100) / 100,
    effectiveSettlementRate: Math.round(effectiveSettlementRate * 10) / 10,
    negativePayoutOrdersCount,
    negativePayoutAmount: Math.round(negativePayoutAmount * 100) / 100,
    startDate: minDate,
    endDate: maxDate,
    uniqueSkusCount: skuSet.size,
    totalCostOfGoodsSold: Math.round(totalCostOfGoodsSold * 100) / 100,
    totalNetProfit,
    netProfitMarginPercent: Math.round(netProfitMarginPercent * 10) / 10,
    costCoverageRatio: Math.round(costCoverageRatio * 100) / 100,
    skusWithCostCount: skusWithCostSet.size,
  };
}

// Compute SKU-level detailed summaries
export function computeSkuSummaries(records: StandardReconRecord[]): SkuSummary[] {
  const map = new Map<string, {
    sku: string;
    productTitle: string;
    totalOrders: number;
    totalUnits: number;
    grossSales: number;
    netSettlement: number;
    customerReturnsCount: number;
    customerReturnsUnits: number;
    customerReturnsValue: number;
    courierReturnsCount: number;
    courierReturnsUnits: number;
    courierReturnsCost: number;
    commission: number;
    shippingFees: number;
    reverseShippingFees: number;
    fixedFees: number;
    collectionFees: number;
    taxes: number;
    tdsTcs: number;
    compensations: number;
    unitCost: number;
    totalCostOfGoodsSold: number;
    deliveredUnits: number;
  }>();

  for (const r of records) {
    let item = map.get(r.sku);
    if (!item) {
      item = {
        sku: r.sku,
        productTitle: r.productTitle || r.sku,
        totalOrders: 0,
        totalUnits: 0,
        grossSales: 0,
        netSettlement: 0,
        customerReturnsCount: 0,
        customerReturnsUnits: 0,
        customerReturnsValue: 0,
        courierReturnsCount: 0,
        courierReturnsUnits: 0,
        courierReturnsCost: 0,
        commission: 0,
        shippingFees: 0,
        reverseShippingFees: 0,
        fixedFees: 0,
        collectionFees: 0,
        taxes: 0,
        tdsTcs: 0,
        compensations: 0,
        unitCost: r.unitCost || 0,
        totalCostOfGoodsSold: 0,
        deliveredUnits: 0,
      };
      map.set(r.sku, item);
    }

    if (r.unitCost > 0) {
      item.unitCost = r.unitCost;
    }

    item.totalOrders += 1;
    item.totalUnits += r.quantity;
    item.grossSales += r.saleAmount;
    item.netSettlement += r.bankSettlementValue;

    if (r.returnType === 'Delivered') {
      item.deliveredUnits += r.quantity;
      item.totalCostOfGoodsSold += (item.unitCost * r.quantity);
    }

    if (r.returnType === 'Customer Return') {
      item.customerReturnsCount += 1;
      item.customerReturnsUnits += r.quantity;
      item.customerReturnsValue += Math.abs(r.bankSettlementValue);
    } else if (r.returnType === 'Courier Return') {
      item.courierReturnsCount += 1;
      item.courierReturnsUnits += r.quantity;
      item.courierReturnsCost += (r.shippingFee + r.reverseShippingFee);
    }

    item.commission += r.commission;
    item.shippingFees += r.shippingFee;
    item.reverseShippingFees += r.reverseShippingFee;
    item.fixedFees += r.fixedFee;
    item.collectionFees += r.collectionFee;
    item.taxes += r.taxes;
    item.tdsTcs += (r.tds + r.tcs);
    item.compensations += r.compensation;
  }

  const summaries: SkuSummary[] = [];

  map.forEach(val => {
    const totalFees =
      val.commission +
      val.shippingFees +
      val.reverseShippingFees +
      val.fixedFees +
      val.collectionFees;

    const effectiveRealizationPercent =
      val.grossSales > 0 ? (val.netSettlement / val.grossSales) * 100 : 0;

    const customerReturnRate =
      val.totalUnits > 0 
        ? (val.customerReturnsUnits / val.totalUnits) * 100 
        : (val.totalOrders > 0 ? (val.customerReturnsCount / val.totalOrders) * 100 : 0);

    const courierReturnRate =
      val.totalUnits > 0 
        ? (val.courierReturnsUnits / val.totalUnits) * 100 
        : (val.totalOrders > 0 ? (val.courierReturnsCount / val.totalOrders) * 100 : 0);

    // Recalculate total cost based on final unitCost
    const totalCostOfGoodsSold = val.unitCost > 0 ? val.unitCost * val.deliveredUnits : 0;
    const netProfit = Math.round((val.netSettlement - totalCostOfGoodsSold) * 100) / 100;
    const netProfitMarginPercent = val.grossSales > 0 ? (netProfit / val.grossSales) * 100 : 0;
    const roiPercent = totalCostOfGoodsSold > 0 ? (netProfit / totalCostOfGoodsSold) * 100 : 0;

    summaries.push({
      sku: val.sku,
      productTitle: val.productTitle,
      totalOrders: val.totalOrders,
      totalUnits: val.totalUnits,
      orderQuantity: val.totalUnits,
      deliveredUnits: val.deliveredUnits,
      customerReturnsUnits: val.customerReturnsUnits,
      courierReturnsUnits: val.courierReturnsUnits,
      grossSales: Math.round(val.grossSales * 100) / 100,
      netSettlement: Math.round(val.netSettlement * 100) / 100,
      customerReturnsCount: val.customerReturnsCount,
      customerReturnsValue: Math.round(val.customerReturnsValue * 100) / 100,
      courierReturnsCount: val.courierReturnsCount,
      courierReturnsCost: Math.round(val.courierReturnsCost * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      commission: Math.round(val.commission * 100) / 100,
      shippingFees: Math.round(val.shippingFees * 100) / 100,
      reverseShippingFees: Math.round(val.reverseShippingFees * 100) / 100,
      fixedFees: Math.round(val.fixedFees * 100) / 100,
      collectionFees: Math.round(val.collectionFees * 100) / 100,
      taxes: Math.round(val.taxes * 100) / 100,
      tdsTcs: Math.round(val.tdsTcs * 100) / 100,
      compensations: Math.round(val.compensations * 100) / 100,
      effectiveRealizationPercent: Math.round(effectiveRealizationPercent * 10) / 10,
      customerReturnRate: Math.round(customerReturnRate * 10) / 10,
      courierReturnRate: Math.round(courierReturnRate * 10) / 10,
      unitCost: val.unitCost,
      hasCostConfigured: val.unitCost > 0,
      totalCostOfGoodsSold: Math.round(totalCostOfGoodsSold * 100) / 100,
      netProfit,
      netProfitMarginPercent: Math.round(netProfitMarginPercent * 10) / 10,
      roiPercent: Math.round(roiPercent * 10) / 10,
    });
  });

  // Sort by highest net settlement by default
  return summaries.sort((a, b) => b.netSettlement - a.netSettlement);
}

// Pivot grouping generator
export interface PivotRow {
  groupKey: string;
  orderCount: number;
  totalUnits: number; // Sum of Column BH ("Quantity")
  grossSales: number;
  netSettlement: number;
  returnsCount: number;
  totalFees: number;
  taxes: number;
  effectiveRate: number;
  totalCost: number;
  netProfit: number;
}

export function computePivotData(
  records: StandardReconRecord[],
  groupByField: 'sku' | 'paymentDate' | 'month' | 'returnType' | 'orderId'
): PivotRow[] {
  const map = new Map<string, {
    count: number;
    units: number;
    gross: number;
    net: number;
    returns: number;
    fees: number;
    taxes: number;
    cost: number;
    profit: number;
  }>();

  for (const r of records) {
    let key = 'Other';

    if (groupByField === 'sku') {
      key = r.sku || 'Unknown SKU';
    } else if (groupByField === 'paymentDate') {
      key = r.paymentDate || 'No Payment Date';
    } else if (groupByField === 'month') {
      key = r.paymentDate ? r.paymentDate.slice(0, 7) : 'Unknown Month';
    } else if (groupByField === 'returnType') {
      key = r.returnType;
    } else if (groupByField === 'orderId') {
      key = r.orderId;
    }

    let item = map.get(key);
    if (!item) {
      item = { count: 0, units: 0, gross: 0, net: 0, returns: 0, fees: 0, taxes: 0, cost: 0, profit: 0 };
      map.set(key, item);
    }

    item.count += 1;
    item.units += r.quantity;
    item.gross += r.saleAmount;
    item.net += r.bankSettlementValue;
    if (r.returnType === 'Customer Return' || r.returnType === 'Courier Return') {
      item.returns += 1;
    }
    item.fees += (r.commission + r.fixedFee + r.collectionFee + r.shippingFee + r.reverseShippingFee);
    item.taxes += (r.taxes + r.tds + r.tcs);
    item.cost += r.totalCostOfGoods;
    item.profit += r.netProfit;
  }

  const result: PivotRow[] = [];
  map.forEach((val, groupKey) => {
    const effectiveRate = val.gross > 0 ? (val.net / val.gross) * 100 : 0;
    result.push({
      groupKey,
      orderCount: val.count,
      totalUnits: val.units,
      grossSales: Math.round(val.gross * 100) / 100,
      netSettlement: Math.round(val.net * 100) / 100,
      returnsCount: val.returns,
      totalFees: Math.round(val.fees * 100) / 100,
      taxes: Math.round(val.taxes * 100) / 100,
      effectiveRate: Math.round(effectiveRate * 10) / 10,
      totalCost: Math.round(val.cost * 100) / 100,
      netProfit: Math.round(val.profit * 100) / 100,
    });
  });

  return result.sort((a, b) => b.netSettlement - a.netSettlement);
}

// Format Indian Currency (e.g. ₹1,24,500.00)
export function formatINR(val: number): string {
  const isNegative = val < 0;
  const absVal = Math.abs(val);

  const formatted = absVal.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (isNegative ? '-₹' : '₹') + formatted;
}

// Compact currency formatting for charts/cards
export function formatCompactINR(val: number): string {
  const isNeg = val < 0;
  const abs = Math.abs(val);
  let formatted = '';
  if (abs >= 10000000) {
    formatted = `${(abs / 10000000).toFixed(2)} Cr`;
  } else if (abs >= 100000) {
    formatted = `${(abs / 100000).toFixed(2)} L`;
  } else if (abs >= 1000) {
    formatted = `${(abs / 1000).toFixed(1)}k`;
  } else {
    formatted = abs.toFixed(2);
  }
  return (isNeg ? '-₹' : '₹') + formatted;
}
