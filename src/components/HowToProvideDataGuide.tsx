import React from 'react';
import { Upload, ClipboardCopy, HelpCircle, Coins } from 'lucide-react';

interface HowToProvideDataGuideProps {
  onOpenUploadModal: (tab?: 'file' | 'paste') => void;
  onOpenCostUpload: () => void;
  hasCostConfigured: boolean;
}

export const HowToProvideDataGuide: React.FC<HowToProvideDataGuideProps> = ({
  onOpenUploadModal,
  onOpenCostUpload,
  hasCostConfigured,
}) => {
  return (
    <div className="bg-white rounded-xl border border-indigo-100 shadow-xs p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700 shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Flipkart Settlement Report & Product Cost Sheet Integration
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Integrate your Flipkart settlement workbook with an optional Cost Sheet to compute true SKU-level Net Profit, Gross Margin, and ROI:
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCostUpload}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer ${
              hasCostConfigured
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>{hasCostConfigured ? 'Cost Sheet Linked' : 'Upload Cost Sheet (SKU + Cost)'}</span>
          </button>

          <button
            onClick={() => onOpenUploadModal('file')}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Settlement Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {/* Method 1: Flipkart Payment Report */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 hover:border-indigo-200 transition-colors">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-mono">1</span>
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>Flipkart Settlement Sheet</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            Upload your official Flipkart payment workbook (.xlsx, .csv). The engine automatically detects the Payment Date (Col C or D), sale amounts, marketplace fees, and bank disbursements.
          </p>
          <button
            onClick={() => onOpenUploadModal('file')}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline underline-offset-2 flex items-center gap-1"
          >
            Upload Payment File &rarr;
          </button>
        </div>

        {/* Method 2: Cost Sheet Upload */}
        <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-200/80 hover:border-emerald-300 transition-colors">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-950 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-mono">2</span>
            <Coins className="w-4 h-4 text-emerald-600" />
            <span>Product Cost Sheet (2 Columns)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            Provide a 2-column spreadsheet: <strong>Column A = Seller SKU</strong>, <strong>Column B = Unit Cost</strong>. This enables real-time unit economics and profit/loss calculation.
          </p>
          <button
            onClick={onOpenCostUpload}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2 flex items-center gap-1"
          >
            Upload Cost Sheet &rarr;
          </button>
        </div>

        {/* Method 3: Copy-Paste */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 hover:border-indigo-200 transition-colors">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 mb-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-mono">3</span>
            <ClipboardCopy className="w-4 h-4 text-slate-600" />
            <span>Direct Spreadsheet Paste</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            Alternatively, copy rows directly from Excel or Google Sheets and paste. All data remains 100% confidential and is calculated securely in your browser.
          </p>
          <button
            onClick={() => onOpenUploadModal('paste')}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline underline-offset-2 flex items-center gap-1"
          >
            Open Paste Window &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
