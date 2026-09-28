import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  RawRow, 
  FilterState, 
  ColumnMappingState, 
  StandardReconRecord, 
  SkuCostMap, 
  FlipkartWorkbookSummary, 
  AllWorkbookSheetsData 
} from './types/recon';
import {
  detectColumnMappings,
  mapRowsToStandardRecords,
  indexToExcelCol,
  findBestHeaderRowIndex,
  cleanHeaderName,
} from './utils/columnFinder';
import { FLIPKART_16_SHEETS } from './utils/flipkartSheetsConstants';
import realReportJson from './data/realFlipkartReportData.json';
import { parseSummaryOfReportSheet } from './utils/summaryReportParser';
import {
  computeAggregates,
  computeSkuSummaries,
  filterRecords,
} from './utils/reconciliationEngine';

import { Header } from './components/Header';
import { HowToProvideDataGuide } from './components/HowToProvideDataGuide';
import { DateSkuFilterBar } from './components/DateSkuFilterBar';
import { KpiGrid } from './components/KpiGrid';
import { ReconCharts } from './components/ReconCharts';
import { SkuAnalysisTable } from './components/SkuAnalysisTable';
import { PivotBuilder } from './components/PivotBuilder';
import { ColumnMappingDrawer } from './components/ColumnMappingDrawer';
import { MetricInfoModal } from './components/MetricInfoModal';
import { DataIngestionModal } from './components/DataIngestionModal';
import { CostUploadModal } from './components/CostUploadModal';
import { ExecutiveSummaryView } from './components/ExecutiveSummaryView';
import { WorkbookSheetsExplorer } from './components/WorkbookSheetsExplorer';
import { EmptyUploadState } from './components/EmptyUploadState';

export default function App() {
  // Main dataset state - starts completely EMPTY on every load/refresh as requested by user
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [sheetName, setSheetName] = useState<string>('');
  const [allSheets, setAllSheets] = useState<string[]>([]);
  const [allSheetsData, setAllSheetsData] = useState<AllWorkbookSheetsData>({});
  const [selectedExplorerSheet, setSelectedExplorerSheet] = useState<string>('Orders');
  const [fileName, setFileName] = useState<string>('');
  const [workbookSummary, setWorkbookSummary] = useState<FlipkartWorkbookSummary | undefined>(undefined);
  const [columnMappings, setColumnMappings] = useState<ColumnMappingState>({});

  // Cost Sheet State - starts empty until user uploads their cost sheet
  const [skuCostMap, setSkuCostMap] = useState<SkuCostMap>({});

  // UI state
  const [activeTab, setActiveTab] = useState<'executive' | 'dashboard' | 'sku' | 'sheets' | 'pivot' | 'columns'>('dashboard');
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('flipkart');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [uploadInitialTab, setUploadInitialTab] = useState<'file' | 'link' | 'paste'>('file');
  const [inspectMetricId, setInspectMetricId] = useState<string | null>(null);

  // Filters state with advanced Excel parameters & Net Profit filter
  const [filters, setFilters] = useState<FilterState>({
    marketplace: 'flipkart',
    dateRangeType: 'paymentDate',
    startDate: '',
    endDate: '',
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

  // When data is uploaded or loaded
  const handleDataLoaded = (
    newHeaders: string[],
    newRows: RawRow[],
    newSheetName: string,
    newAllSheets?: string[],
    newFileName?: string,
    newSummary?: FlipkartWorkbookSummary,
    newAllSheetsData?: AllWorkbookSheetsData
  ) => {
    setHeaders(newHeaders);
    setRawRows(newRows);
    setSheetName(newSheetName);
    if (newAllSheets && newAllSheets.length > 0) setAllSheets(newAllSheets);
    if (newFileName) setFileName(newFileName);
    if (newSummary) setWorkbookSummary(newSummary);
    if (newAllSheetsData && Object.keys(newAllSheetsData).length > 0) setAllSheetsData(newAllSheetsData);

    const newMappings = detectColumnMappings(newHeaders);
    setColumnMappings(newMappings);

    // Switch to executive view if summary is detected, otherwise dashboard
    if (newSummary) {
      setActiveTab('executive');
    } else {
      setActiveTab('dashboard');
    }

    // Reset filter bounds to the new data
    setFilters(prev => ({
      ...prev,
      startDate: '',
      endDate: '',
      selectedSku: 'all',
      returnTypeFilter: 'all',
      searchQuery: '',
      payoutFilter: 'all',
      salesRangeMin: '',
      salesRangeMax: '',
      settlementRangeMin: '',
      settlementRangeMax: '',
      profitFilter: 'all',
    }));
  };

  // Completely wipe data and reset tool to clean initial state
  const handleClearData = () => {
    setHeaders([]);
    setRawRows([]);
    setSheetName('');
    setAllSheets([]);
    setAllSheetsData({});
    setSelectedExplorerSheet('Orders');
    setFileName('');
    setWorkbookSummary(undefined);
    setColumnMappings({});
    setSkuCostMap({});
    setActiveTab('dashboard');
    setFilters({
      marketplace: 'flipkart',
      dateRangeType: 'paymentDate',
      startDate: '',
      endDate: '',
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

  // Optional preview: only loaded when user explicitly clicks "Load Sample Report"
  const handleLoadSampleReport = () => {
    const mappings = detectColumnMappings(realReportJson.headers);
    const summary = parseSummaryOfReportSheet(realReportJson.summaryData as any[][]);
    setHeaders(realReportJson.headers);
    setRawRows(realReportJson.rows as RawRow[]);
    setSheetName('Orders');
    setAllSheets(realReportJson.allSheets);
    setFileName('Sample_Flipkart_Settlement_Report.xlsx');
    setWorkbookSummary(summary);
    setAllSheetsData(realReportJson.allSheetsData as unknown as AllWorkbookSheetsData);
    setColumnMappings(mappings);
    setActiveTab('executive');
  };

  const handleOpenUploadModal = (tab: 'file' | 'link' | 'paste' = 'file') => {
    setUploadInitialTab(tab);
    setIsUploadModalOpen(true);
  };

  // Convert raw rows into standard records with cost mapping attached
  const standardRecords: StandardReconRecord[] = useMemo(() => {
    if (rawRows.length === 0 || headers.length === 0) return [];
    return mapRowsToStandardRecords(rawRows, columnMappings, headers, skuCostMap);
  }, [rawRows, columnMappings, headers, skuCostMap]);

  // Compute available dates range
  const { minDetectedDate, maxDetectedDate } = useMemo(() => {
    let minD = '';
    let maxD = '';
    for (const r of standardRecords) {
      const d = filters.dateRangeType === 'paymentDate' ? r.paymentDate : r.orderDate;
      if (d) {
        if (!minD || d < minD) minD = d;
        if (!maxD || d > maxD) maxD = d;
      }
    }
    return { minDetectedDate: minD, maxDetectedDate: maxD };
  }, [standardRecords, filters.dateRangeType]);

  // Apply filters
  const filteredRecords = useMemo(() => {
    return filterRecords(standardRecords, filters);
  }, [standardRecords, filters]);

  // Calculate aggregates
  const aggregates = useMemo(() => {
    return computeAggregates(filteredRecords);
  }, [filteredRecords]);

  // Calculate SKU summaries for filtered and full dataset
  const skuSummaries = useMemo(() => {
    return computeSkuSummaries(filteredRecords);
  }, [filteredRecords]);

  const fullSkuSummaries = useMemo(() => {
    return computeSkuSummaries(standardRecords);
  }, [standardRecords]);

  // List of unique SKUs across the dataset
  const availableSkus = useMemo(() => {
    return fullSkuSummaries.map(s => s.sku);
  }, [fullSkuSummaries]);

  // Handle manual column mapping override
  const handleUpdateMapping = (defId: string, colIndex: number) => {
    if (colIndex < 0 || colIndex >= headers.length) {
      setColumnMappings(prev => {
        const next = { ...prev };
        delete next[defId];
        return next;
      });
      return;
    }

    const headerName = headers[colIndex];
    setColumnMappings(prev => ({
      ...prev,
      [defId]: {
        defId,
        sourceColumnIndex: colIndex,
        sourceColumnLetter: indexToExcelCol(colIndex),
        sourceHeaderName: headerName,
        matchType: 'manual',
        confidence: 1.0,
        sampleValues: rawRows.slice(0, 5).map(r => r[headerName]),
      },
    }));
  };

  const handleSelectSheetFromSummary = (sheet: string) => {
    if (/^orders$/i.test(sheet)) {
      setSheetName(sheet);
      setActiveTab('dashboard');
    } else if (/summary/i.test(sheet)) {
      setSheetName(sheet);
      setActiveTab('executive');
    } else {
      setSelectedExplorerSheet(sheet);
      setActiveTab('sheets');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Header Navigation */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedMarketplace={selectedMarketplace}
        onMarketplaceChange={setSelectedMarketplace}
        onOpenUpload={() => handleOpenUploadModal('file')}
        onOpenCostUpload={() => setIsCostModalOpen(true)}
        onResetData={handleClearData}
        totalRecordsCount={standardRecords.length}
        sheetName={sheetName}
        fileName={fileName}
        configuredCostCount={Object.keys(skuCostMap).length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* If no data has been uploaded yet, render the clean Empty / Upload screen */}
        {standardRecords.length === 0 && !workbookSummary ? (
          <EmptyUploadState
            onDataLoaded={handleDataLoaded}
            onOpenCostUpload={() => setIsCostModalOpen(true)}
            onOpenPasteModal={() => handleOpenUploadModal('paste')}
            onLoadSampleReport={handleLoadSampleReport}
          />
        ) : (
          <>
            {/* Step-by-Step Data Guide */}
            <HowToProvideDataGuide
              onOpenUploadModal={handleOpenUploadModal}
              onOpenCostUpload={() => setIsCostModalOpen(true)}
              hasCostConfigured={Object.keys(skuCostMap).length > 0}
            />

            {/* Global Filter Bar (shown on Dashboard, SKU, and Pivot tabs) */}
            {(activeTab === 'dashboard' || activeTab === 'sku' || activeTab === 'pivot') && (
              <DateSkuFilterBar
                filters={filters}
                onFilterChange={newF => setFilters(prev => ({ ...prev, ...newF }))}
                skuList={fullSkuSummaries}
                columnMappings={columnMappings}
                minDetectedDate={minDetectedDate}
                maxDetectedDate={maxDetectedDate}
                onOpenMetricInfo={defId => setInspectMetricId(defId)}
                onOpenCostUpload={() => setIsCostModalOpen(true)}
                hasCostConfigured={Object.keys(skuCostMap).length > 0}
              />
            )}

        {/* Active Focus Alert if a single SKU is selected */}
        {filters.selectedSku !== 'all' && (activeTab === 'dashboard' || activeTab === 'sku') && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-950">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Single SKU Filter Active:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200 font-bold">
                {filters.selectedSku}
              </span>
              <span>Showing specific settlement, product cost, profit/loss, and returns for this SKU only.</span>
            </div>
            <button
              onClick={() => setFilters(prev => ({ ...prev, selectedSku: 'all' }))}
              className="text-indigo-600 hover:text-indigo-900 font-semibold underline underline-offset-2 cursor-pointer"
            >
              Reset to Total Sales (All SKUs)
            </button>
          </div>
        )}

        {/* 1. Summary of Report Tab (Official 16-sheet executive statement) */}
        {activeTab === 'executive' && (
          <ExecutiveSummaryView
            summary={workbookSummary}
            reconAggregate={aggregates}
            columnMappings={columnMappings}
            onOpenMetricInfo={defId => setInspectMetricId(defId)}
            fileName={fileName}
            allSheets={allSheets}
            activeSheet={sheetName}
            onSelectSheet={handleSelectSheetFromSummary}
          />
        )}

        {/* 2. Dashboard & Line-Item Orders Reconciliation Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards Grid with '!' Formula & Source Indicators (including Net Profit / Loss) */}
            <KpiGrid
              aggregates={aggregates}
              columnMappings={columnMappings}
              onOpenMetricInfo={defId => setInspectMetricId(defId)}
              onOpenCostUpload={() => setIsCostModalOpen(true)}
            />

            {/* Visual Minimal Purposeful Charts */}
            <ReconCharts
              aggregates={aggregates}
              skuSummaries={skuSummaries}
              records={filteredRecords}
              columnMappings={columnMappings}
              onOpenMetricInfo={defId => setInspectMetricId(defId)}
            />

            {/* SKU Table Preview with Cost & Profit */}
            <SkuAnalysisTable
              skuSummaries={skuSummaries}
              columnMappings={columnMappings}
              selectedSku={filters.selectedSku}
              onSelectSku={sku => setFilters(prev => ({ ...prev, selectedSku: sku }))}
              onOpenMetricInfo={defId => setInspectMetricId(defId)}
              onOpenCostUpload={() => setIsCostModalOpen(true)}
            />
          </div>
        )}

        {/* 3. SKU Level Breakdown Tab */}
        {activeTab === 'sku' && (
          <div className="space-y-6">
            <SkuAnalysisTable
              skuSummaries={skuSummaries}
              columnMappings={columnMappings}
              selectedSku={filters.selectedSku}
              onSelectSku={sku => setFilters(prev => ({ ...prev, selectedSku: sku }))}
              onOpenMetricInfo={defId => setInspectMetricId(defId)}
              onOpenCostUpload={() => setIsCostModalOpen(true)}
            />
          </div>
        )}

        {/* 4. 16 Sheets Explorer Tab (Browse Ads, GST_Details, Non_Order_SPF, etc.) */}
        {activeTab === 'sheets' && (
          <WorkbookSheetsExplorer
            allSheetsData={allSheetsData}
            activeSheet={selectedExplorerSheet}
            onSelectSheet={setSelectedExplorerSheet}
            onNavigateToOrders={() => setActiveTab('dashboard')}
            onNavigateToSku={() => setActiveTab('sku')}
          />
        )}

        {/* 5. Excel Pivot Builder Tab */}
        {activeTab === 'pivot' && (
          <div className="space-y-6">
            <PivotBuilder
              records={filteredRecords}
              columnMappings={columnMappings}
              onOpenMetricInfo={defId => setInspectMetricId(defId)}
            />
          </div>
        )}

        {/* 6. Column Mapper & Auditor Tab */}
        {activeTab === 'columns' && (
          <div className="space-y-6">
            <ColumnMappingDrawer
              mappings={columnMappings}
              allHeaders={headers}
              onUpdateMapping={handleUpdateMapping}
              onOpenMetricInfo={defId => setInspectMetricId(defId)}
            />
          </div>
        )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">ReconPulse Engine</span>
            <span>·</span>
            <span>Zero-Assumption Formula Driven Reconciliation & Cost Profit Analysis</span>
            <span>·</span>
            <span>Flipkart 16-Sheet Official Workbook Compatible</span>
          </div>
          <div>
            100% Client-Side Processing · Confidential Data Privacy Maintained
          </div>
        </div>
      </footer>

      {/* Formula & Source Column Inspector Modal ('!') */}
      {inspectMetricId && (
        <MetricInfoModal
          defId={inspectMetricId}
          matchedCol={columnMappings[inspectMetricId]}
          allHeaders={headers}
          isOpen={true}
          onClose={() => setInspectMetricId(null)}
          onUpdateMapping={handleUpdateMapping}
        />
      )}

      {/* Upload & Paste Flipkart Settlement Modal */}
      <DataIngestionModal
        isOpen={isUploadModalOpen}
        initialTab={uploadInitialTab}
        onClose={() => setIsUploadModalOpen(false)}
        onDataLoaded={handleDataLoaded}
      />

      {/* Dedicated 2-Column SKU "Cost" Sheet Upload Modal */}
      <CostUploadModal
        isOpen={isCostModalOpen}
        onClose={() => setIsCostModalOpen(false)}
        currentCostMap={skuCostMap}
        onSaveCostMap={(newMap) => setSkuCostMap(newMap)}
        availableSkus={availableSkus}
      />
    </div>
  );
}
