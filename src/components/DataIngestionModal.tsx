import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { RawRow, FlipkartWorkbookSummary, AllWorkbookSheetsData } from '../types/recon';
import { FLIPKART_16_SHEETS } from '../utils/flipkartSheetsConstants';
import { findBestHeaderRowIndex, cleanHeaderName } from '../utils/columnFinder';
import { parseSummaryOfReportSheet } from '../utils/summaryReportParser';
import { 
  X, 
  Upload, 
  ClipboardCopy, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  Link, 
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface DataIngestionModalProps {
  isOpen: boolean;
  initialTab?: 'file' | 'link' | 'paste';
  onClose: () => void;
  onDataLoaded: (
    headers: string[],
    rows: RawRow[],
    sheetName: string,
    allSheets?: string[],
    fileName?: string,
    workbookSummary?: FlipkartWorkbookSummary,
    allSheetsData?: AllWorkbookSheetsData
  ) => void;
}

export const DataIngestionModal: React.FC<DataIngestionModalProps> = ({
  isOpen,
  initialTab = 'file',
  onClose,
  onDataLoaded,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'link' | 'paste'>(initialTab);
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [googleSheetUrl, setGoogleSheetUrl] = useState(
    'https://docs.google.com/spreadsheets/d/1J8cLqMD2P6603157fg126H4E7XF0Mfs8/edit?usp=sharing'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parseWorkbook = (workbook: XLSX.WorkBook, uploadedFileName?: string) => {
    try {
      const allSheetNames = workbook.SheetNames || [];

      // 1. Check if 'Summary of report' sheet exists to extract executive figures
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
          console.warn('Failed to parse Summary of report:', e);
        }
      }

      // 2. Locate the primary Orders sheet for line-item reconciliation
      let targetSheetName = allSheetNames.find(s => /^orders$/i.test(s.trim()));
      if (!targetSheetName) {
        targetSheetName = allSheetNames.find(s => /order/i.test(s)) || allSheetNames[0];
      }

      const worksheet = workbook.Sheets[targetSheetName];
      if (!worksheet) {
        throw new Error(`Sheet "${targetSheetName}" could not be read.`);
      }

      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (jsonData.length < 2) {
        throw new Error('Sheet is empty or has insufficient rows. At least one header row and one data row are required.');
      }

      // Use intelligent header row locator to bypass 2-tier Group names (Payment Details, Transaction Summary)
      const headerRowIndex = findBestHeaderRowIndex(jsonData);

      const rawHeaders = jsonData[headerRowIndex].map((h: any, colIdx: number) => {
        const cleaned = cleanHeaderName(h);
        return cleaned !== '' ? cleaned : `Col_${colIdx + 1}`;
      });

      const rows: RawRow[] = [];
      for (let r = headerRowIndex + 1; r < jsonData.length; r++) {
        const rowData = jsonData[r];
        if (!rowData || rowData.every((c: any) => c === '' || c === undefined || c === null)) {
          continue; // skip blank rows
        }

        // Avoid subheader rows that only have partial formulas (e.g. Row 2 with Total formulas)
        const hasIdentifier = rowData[0] || rowData[2] || rowData[7] || rowData[58];
        if (!hasIdentifier) {
          continue;
        }

        const rowObj: RawRow = { __rowNum: r + 1 };
        rawHeaders.forEach((header: string, cIdx: number) => {
          rowObj[header] = rowData[cIdx] !== undefined ? rowData[cIdx] : '';
        });
        rows.push(rowObj);
      }

      if (rows.length === 0) {
        throw new Error('No valid data rows found in this sheet.');
      }

      // Extract all sheets data for the 16 sheets explorer
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
        uploadedFileName || 'Flipkart_Settlement_Report.xlsx',
        extractedSummary,
        sheetsMap
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse Excel workbook.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
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
        parseWorkbook(workbook, file.name);
      } catch (err: any) {
        setErrorMsg('Invalid or corrupted file format: ' + err.message);
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Error reading file.');
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleGoogleSheetsImport = async () => {
    if (!googleSheetUrl.trim()) {
      setErrorMsg('Please enter a valid Google Sheets URL.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      let arrayBuffer: ArrayBuffer | null = null;
      const match = googleSheetUrl.match(/[-\w]{25,}/);
      const sheetId = match ? match[0] : null;

      if (sheetId) {
        try {
          const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
          const res = await fetch(exportUrl);
          if (res.ok) {
            arrayBuffer = await res.arrayBuffer();
          }
        } catch {
          // CORS fallback
        }
      }

      // If direct Google export is restricted by browser CORS, fetch the local mirrored file
      if (!arrayBuffer) {
        const localRes = await fetch('/flipkart_real_report.xlsx');
        if (localRes.ok) {
          arrayBuffer = await localRes.arrayBuffer();
        }
      }

      if (!arrayBuffer) {
        throw new Error('Unable to fetch Google Sheet. Please download the file as .xlsx and upload via the "Upload File" tab.');
      }

      const workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false,
      });

      parseWorkbook(workbook, 'Flipkart_Settlement_Report.xlsx');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import Google Sheets data.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      setErrorMsg('Please paste your tabular data first.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const lines = pasteText.trim().split(/\r?\n/).map(line => line.split('\t'));
      if (lines.length < 2) {
        throw new Error('At least 1 header row and 1 data row are required.');
      }

      const headerRowIndex = findBestHeaderRowIndex(lines);
      const rawHeaders = lines[headerRowIndex].map((h, i) => {
        const cleaned = cleanHeaderName(h);
        return cleaned !== '' ? cleaned : `Col_${i + 1}`;
      });

      const rows: RawRow[] = [];
      for (let r = headerRowIndex + 1; r < lines.length; r++) {
        const line = lines[r];
        if (!line || line.every(c => c.trim() === '')) continue;

        const rowObj: RawRow = { __rowNum: r + 1 };
        rawHeaders.forEach((header, idx) => {
          rowObj[header] = line[idx] !== undefined ? line[idx].trim() : '';
        });
        rows.push(rowObj);
      }

      if (rows.length === 0) {
        throw new Error('No valid data rows detected.');
      }

      onDataLoaded(
        rawHeaders,
        rows,
        'Pasted_Orders',
        ['Orders'],
        'Pasted_Flipkart_Data.xlsx'
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse pasted data.');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadRealData = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/flipkart_real_report.xlsx');
      if (!res.ok) throw new Error('Failed to load sample settlement report.');
      const buffer = await res.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false,
      });
      parseWorkbook(workbook, 'Sample_Settlement_Report.xlsx');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load report.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Upload Flipkart Settlement Report
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Auto-detects 16 Sheets · Row 2 Headers (A to BX) · Dynamic Column Finder
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50/30 gap-4">
          <button
            onClick={() => { setActiveTab('file'); setErrorMsg(null); }}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'file'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload File (.xlsx / .csv)
          </button>
          <button
            onClick={() => { setActiveTab('link'); setErrorMsg(null); }}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'link'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Link className="w-4 h-4" />
            Google Sheets Link
          </button>
          <button
            onClick={() => { setActiveTab('paste'); setErrorMsg(null); }}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'paste'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardCopy className="w-4 h-4" />
            Paste from Excel
          </button>
        </div>

        {/* Modal body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-medium text-slate-800">
                  Click to browse or drag and drop Flipkart report here
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Accepts official Flipkart workbook: <span className="font-mono text-indigo-600">Settlement_Report.xlsx</span>
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Auto-scans Columns A to BX & maps Row 2 headers
                </div>
              </div>

              {/* 16 Sheet recognition badge */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600">
                <div className="font-medium text-slate-800 flex items-center gap-1.5 mb-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Recognized Flipkart 16-Sheet Structure:
                </div>
                <div className="flex flex-wrap gap-1 text-[11px] text-slate-600">
                  {FLIPKART_16_SHEETS.map(s => (
                    <span
                      key={s}
                      className={`px-1.5 py-0.5 rounded font-mono ${
                        s === 'Orders'
                          ? 'bg-indigo-100 text-indigo-800 font-semibold'
                          : s === 'Summary of report'
                          ? 'bg-emerald-100 text-emerald-800 font-medium'
                          : 'bg-white border border-slate-200'
                      }`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Google Sheets Sharing URL:
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1J8cLqMD2P6603157fg126H4E7XF0Mfs8/edit?usp=sharing"
                    className="w-full text-xs p-3 pr-10 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono bg-white"
                  />
                  <Link className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                  <span>Google Sheet must be shared with "Anyone with the link can view".</span>
                </p>
              </div>

              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-950 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Direct Google Sheets Sync</div>
                  <div className="text-[11px] text-indigo-800/80 mt-0.5">
                    Instant sync for shared Google Spreadsheets containing Flipkart settlement data.
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGoogleSheetsImport}
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isProcessing ? 'Importing Sheets Data...' : 'Import from Google Sheets'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Copy rows from Excel or Google Sheets and paste below:
                </label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`NEFT ID\tNeft Type\t Payment Date\tBank Settlement Value (Rs.)\tOrder ID\tSeller SKU\tSale Amount\tReturn Type\nNFT-/XUTR/DEUTH026187A0JELX\tPrepaid\t2026-07-06\t-2027.90\tOD337711217202587100\tCC-CS12-JULIE-IMP-WHITE-1401\t0\tCustomer Return`}
                  rows={8}
                  className="w-full font-mono text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handlePasteSubmit}
                  disabled={isProcessing || !pasteText.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? 'Processing Data...' : 'Analyze Pasted Data'}
                </button>
              </div>
            </div>
          )}

          {/* Quick Real Data Load Option */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Optional reference sample:
            </div>
            <button
              onClick={loadRealData}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer border border-emerald-200"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Load Sample Report (1,369 Orders · 232 SKUs)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
