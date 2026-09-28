import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { SkuCostMap } from '../types/recon';
import { X, Upload, ClipboardCopy, FileSpreadsheet, Plus, Trash2, CheckCircle2, AlertCircle, Coins } from 'lucide-react';
import { formatINR } from '../utils/reconciliationEngine';

interface CostUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCostMap: SkuCostMap;
  onSaveCostMap: (newCostMap: SkuCostMap) => void;
  availableSkus: string[];
}

export const CostUploadModal: React.FC<CostUploadModalProps> = ({
  isOpen,
  onClose,
  currentCostMap,
  onSaveCostMap,
  availableSkus,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'manual'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [manualRows, setManualRows] = useState<Array<{ sku: string; cost: string }>>(() => {
    const list = Object.entries(currentCostMap).map(([sku, cost]) => ({
      sku,
      cost: cost.toString(),
    }));
    return list.length > 0 ? list : availableSkus.slice(0, 8).map(s => ({ sku: s, cost: '0' }));
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parseCostSheet = (data: any[][], sourceName: string) => {
    if (data.length < 2) {
      throw new Error('Sheet must contain at least 1 header row and 1 data row.');
    }

    // Locate header row containing 'sku' and 'cost' / 'purchase' / 'price'
    let headerRowIdx = 0;
    let skuColIdx = -1;
    let costColIdx = -1;

    for (let r = 0; r < Math.min(data.length, 5); r++) {
      const row = data[r];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').toLowerCase().trim();
        if (/sku|item|product|seller_sku/i.test(val) && skuColIdx === -1) {
          skuColIdx = c;
        }
        if (/cost|cogs|price|purchase|buying|landed/i.test(val) && costColIdx === -1) {
          costColIdx = c;
        }
      }
      if (skuColIdx !== -1 && costColIdx !== -1) {
        headerRowIdx = r;
        break;
      }
    }

    // If headers not explicitly named, default to Col A = SKU, Col B = Cost (as specified by user!)
    if (skuColIdx === -1) skuColIdx = 0;
    if (costColIdx === -1) costColIdx = 1;

    const newMap: SkuCostMap = { ...currentCostMap };
    let count = 0;

    for (let r = headerRowIdx + 1; r < data.length; r++) {
      const row = data[r];
      if (!row) continue;
      const skuVal = String(row[skuColIdx] || '').trim();
      const costRaw = String(row[costColIdx] || '').replace(/[₹$,\s]/g, '').trim();
      const costNum = parseFloat(costRaw);

      if (skuVal && !isNaN(costNum) && costNum >= 0) {
        newMap[skuVal] = costNum;
        count++;
      }
    }

    if (count === 0) {
      throw new Error('No valid SKU and Cost pairs found. Column 1 must contain Seller SKU, and Column 2 must contain Unit Cost.');
    }

    onSaveCostMap(newMap);
    setSuccessMsg(`Successfully mapped unit costs for ${count} SKUs from "${sourceName}".`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });

        // If sheet is named 'cost', pick it, otherwise first sheet
        let targetSheet = workbook.SheetNames[0];
        for (const name of workbook.SheetNames) {
          if (/cost|price|sku/i.test(name)) {
            targetSheet = name;
            break;
          }
        }

        const ws = workbook.Sheets[targetSheet];
        const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        parseCostSheet(json, targetSheet);
      } catch (err: any) {
        setErrorMsg('Cost file parse error: ' + (err.message || ''));
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Failed to read the selected file.');
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  const handlePasteSubmit = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!pasteText.trim()) {
      setErrorMsg('Please copy 2 columns (SKU and Cost) from your spreadsheet and paste here.');
      return;
    }

    try {
      setIsProcessing(true);
      const lines = pasteText.trim().split(/\r?\n/);
      const delimiter = lines[0].includes('\t') ? '\t' : ',';

      const data: any[][] = lines.map(line => line.split(delimiter).map(c => c.trim()));
      parseCostSheet(data, 'Pasted Cost Sheet');
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to parse pasted cost data.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSave = () => {
    const newMap: SkuCostMap = { ...currentCostMap };
    let validCount = 0;

    manualRows.forEach(row => {
      const sku = row.sku.trim();
      const cost = parseFloat(row.cost.replace(/[₹$,\s]/g, ''));
      if (sku && !isNaN(cost) && cost >= 0) {
        newMap[sku] = cost;
        validCount++;
      }
    });

    onSaveCostMap(newMap);
    setSuccessMsg(`${validCount} SKUs cost saved!`);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const addManualRow = () => {
    setManualRows(prev => [...prev, { sku: '', cost: '0' }]);
  };

  const removeManualRow = (index: number) => {
    setManualRows(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Upload SKU Cost Sheet (Purchase / COGS)
              </h3>
              <p className="text-xs text-slate-500">
                2 Columns: <strong>Col A = Flipkart SKU</strong>, <strong>Col B = Cost (₹)</strong> &rarr; Calculates Net Profit/Loss
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center border-b border-slate-200 px-6 bg-white gap-2 pt-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload "Cost" Sheet (.xlsx, .csv)</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'paste'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ClipboardCopy className="w-4 h-4" />
            <span>Copy-Paste (2 Columns)</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Edit / Enter Manually</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'upload' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition-all space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {isProcessing ? 'Processing cost sheet...' : 'Click to upload your product cost spreadsheet'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Format: Sheet with 2 columns: <strong>[Seller SKU]</strong> & <strong>[Product Cost]</strong>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Copy the SKU and Cost columns from Excel (Ctrl+C) and paste below:
              </label>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="Example:&#10;Flipkart SKU	Cost&#10;CC-CS12-DIAMOND-310GL	310&#10;CCB-BUDVASE-1PC	120&#10;CC-CM6-ASIAN-MW-009	180"
                className="w-full h-44 p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <div className="flex justify-end">
                <button
                  onClick={handlePasteSubmit}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                >
                  {isProcessing ? 'Processing...' : 'Apply Cost Map'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Total {manualRows.length} SKUs configured
                </span>
                <button
                  type="button"
                  onClick={addManualRow}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded border border-emerald-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add SKU Row</span>
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                {manualRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Seller SKU"
                      value={row.sku}
                      onChange={e => {
                        const val = e.target.value;
                        setManualRows(prev => {
                          const copy = [...prev];
                          copy[idx].sku = val;
                          return copy;
                        });
                      }}
                      className="flex-1 text-xs font-mono py-1 px-2.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                    />
                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        placeholder="Cost"
                        value={row.cost}
                        onChange={e => {
                          const val = e.target.value;
                          setManualRows(prev => {
                            const copy = [...prev];
                            copy[idx].cost = val;
                            return copy;
                          });
                        }}
                        className="w-full text-xs font-mono py-1 pl-6 pr-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <button
                      onClick={() => removeManualRow(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleManualSave}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                >
                  Save Cost Values
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
