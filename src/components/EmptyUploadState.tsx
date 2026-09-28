import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  Coins, 
  ClipboardCopy, 
  ShieldCheck, 
  RotateCcw,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { RawRow, FlipkartWorkbookSummary, AllWorkbookSheetsData } from '../types/recon';
import { findBestHeaderRowIndex, cleanHeaderName } from '../utils/columnFinder';
import { parseSummaryOfReportSheet } from '../utils/summaryReportParser';

interface EmptyUploadStateProps {
  onDataLoaded: (
    headers: string[],
    rows: RawRow[],
    sheetName: string,
    allSheets?: string[],
    fileName?: string,
    workbookSummary?: FlipkartWorkbookSummary,
    allSheetsData?: AllWorkbookSheetsData
  ) => void;
  onOpenCostUpload: () => void;
  onOpenPasteModal: () => void;
  onLoadSampleReport?: () => void;
}

export const EmptyUploadState: React.FC<EmptyUploadStateProps> = ({
  onDataLoaded,
  onOpenCostUpload,
  onOpenPasteModal,
  onLoadSampleReport,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processWorkbook = (workbook: XLSX.WorkBook, uploadedFileName: string) => {
    try {
      const allSheetNames = workbook.SheetNames || [];
      if (allSheetNames.length === 0) {
        throw new Error('No sheets found in workbook.');
      }

      // 1. Check if 'Summary of report' sheet exists
      let extractedSummary: FlipkartWorkbookSummary | undefined;
      const summarySheetName = allSheetNames.find(s => /summary/i.test(s));
      if (summarySheetName && workbook.Sheets[summarySheetName]) {
        try {
          const summaryData: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[summarySheetName], {
            header: 1,
            defval: '',
          });
          extractedSummary = parseSummaryOfReportSheet(summaryData);
        } catch (e) {
          console.warn('Summary parsing warning:', e);
        }
      }

      // 2. Locate Orders sheet
      let targetSheetName = allSheetNames.find(s => /^orders$/i.test(s.trim()));
      if (!targetSheetName) {
        targetSheetName = allSheetNames.find(s => /order/i.test(s)) || allSheetNames[0];
      }

      const worksheet = workbook.Sheets[targetSheetName];
      if (!worksheet) {
        throw new Error(`Unable to read sheet "${targetSheetName}".`);
      }

      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (jsonData.length < 2) {
        throw new Error('The workbook sheet is empty or contains insufficient data rows.');
      }

      const headerRowIndex = findBestHeaderRowIndex(jsonData);
      const rawHeaders = jsonData[headerRowIndex].map((h: any, colIdx: number) => {
        const cleaned = cleanHeaderName(h);
        return cleaned !== '' ? cleaned : `Col_${colIdx + 1}`;
      });

      const rows: RawRow[] = [];
      for (let r = headerRowIndex + 1; r < jsonData.length; r++) {
        const rowData = jsonData[r];
        if (!rowData || rowData.every((c: any) => c === '' || c === undefined || c === null)) continue;
        const hasIdentifier = rowData[0] || rowData[2] || rowData[7] || rowData[58];
        if (!hasIdentifier) continue;

        const rowObj: RawRow = { __rowNum: r + 1 };
        rawHeaders.forEach((header: string, cIdx: number) => {
          rowObj[header] = rowData[cIdx] !== undefined ? rowData[cIdx] : '';
        });
        rows.push(rowObj);
      }

      if (rows.length === 0) {
        throw new Error('No valid order rows found. Please upload an official Flipkart settlement workbook.');
      }

      // 3. Extract all workbook sheets
      const sheetsMap: AllWorkbookSheetsData = {};
      for (const name of allSheetNames) {
        const ws = workbook.Sheets[name];
        if (!ws) continue;
        const d: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (d.length > 0) {
          const hIdx = findBestHeaderRowIndex(d);
          const sHeaders = (d[hIdx] || []).map((h, i) => cleanHeaderName(h) || `Col_${i + 1}`);
          const sRows = d.slice(hIdx + 1);
          sheetsMap[name] = {
            name,
            headers: sHeaders,
            rows: sRows,
            count: sRows.length,
          };
        }
      }

      onDataLoaded(
        rawHeaders,
        rows,
        targetSheetName,
        allSheetNames,
        uploadedFileName,
        extractedSummary,
        sheetsMap
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while processing the workbook.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFile = (file: File) => {
    setIsProcessing(true);
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, {
          type: 'binary',
          cellDates: true,
          cellNF: false,
          cellText: false,
        });
        processWorkbook(workbook, file.name);
      } catch (err: any) {
        setErrorMsg('File read error: ' + (err.message || 'Corrupt or unsupported format'));
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg('An unexpected error occurred while reading the file.');
      setIsProcessing(false);
    };
    reader.readAsBinaryString(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-8 py-4">
      {/* Hero Welcome / Upload Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs max-w-4xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zero Preloaded Data · 100% In-Memory Fresh Session</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Upload Flipkart Settlement Report
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Drop your official Flipkart Settlement Excel workbook (<code className="font-mono text-indigo-600 font-semibold">.xlsx</code>) here. ReconPulse will instantly reconcile Net Bank Settlement, all 16 sheets, Column BH ordered quantities, and unit-level SKU profit and loss.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Upload Error</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-600 bg-indigo-50/60 scale-[1.01]'
              : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md mb-4 group-hover:scale-105 transition-transform">
            {isProcessing ? (
              <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {isProcessing ? 'Processing Excel Workbook...' : 'Drag and drop your file here, or click to browse'}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Supports official Flipkart 16-Sheet settlement reports (<code className="font-mono text-slate-700">.xlsx</code>)
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-xs hover:bg-indigo-700 transition-colors">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Select Settlement Excel File</span>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 pt-6 border-t border-slate-100">
          <button
            onClick={onOpenPasteModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <ClipboardCopy className="w-4 h-4 text-slate-600" />
            <span>Paste Data from Clipboard</span>
          </button>

          <button
            onClick={onOpenCostUpload}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
          >
            <Coins className="w-4 h-4 text-emerald-600" />
            <span>Upload 2-Column "Cost" Sheet (SKU + Cost)</span>
          </button>

          {onLoadSampleReport && (
            <button
              onClick={onLoadSampleReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-indigo-600 underline underline-offset-4 transition-colors cursor-pointer"
            >
              <span>Load sample report for preview (Optional)</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Step Workflow Card */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center mb-3">
            1
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">Upload Settlement</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Upload your official 16-sheet settlement report downloaded from the Flipkart Seller Portal. Automatic Column BH mapping and bank payout matching.
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center mb-3">
            2
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">Add Product Cost</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Upload an optional 2-column cost sheet (Col A = SKU, Col B = Cost) to calculate exact gross profit and net margins for every SKU.
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center mb-3">
            3
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">Private & In-Memory</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            All data is processed strictly in-memory in your browser. Refreshing the browser instantly clears all data for a completely clean session.
          </p>
        </div>
      </div>

      {/* Privacy Banner */}
      <div className="max-w-4xl mx-auto text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>100% Client-Side In-Memory Processing · Zero Cloud Storage · Private & Confidential</span>
      </div>
    </div>
  );
};
