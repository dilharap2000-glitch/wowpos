import React, { useEffect, useRef } from 'react';
import { X, Download, Printer, QrCode, Dumbbell } from 'lucide-react';
import { renderBarcodeSvg, downloadBarcodePng, printBarcodeCard } from '../lib/barcode-generator.ts';
import { Member } from '../types.ts';
import { useBusiness } from '../context/BusinessContext.tsx';

interface BarcodeModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({
  member,
  isOpen,
  onClose,
}) => {
  const { business } = useBusiness();
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (isOpen && member && svgRef.current) {
      renderBarcodeSvg(svgRef.current, member.barcode || member.memberNumber);
    }
  }, [isOpen, member]);

  if (!isOpen || !member) return null;

  const handleDownload = () => {
    downloadBarcodePng(svgRef.current, `barcode_${member.memberNumber}_${member.fullName.replace(/\s+/g, '_')}`);
  };

  const handlePrint = () => {
    printBarcodeCard(member.barcode || member.memberNumber, member.fullName, business.gymName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div
        id="barcode-modal"
        className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-[#FACC15]" />
            <h3 className="text-sm font-black italic text-white uppercase tracking-wider">
              Member Barcode Sticker
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Card Preview */}
        <div className="p-6 sm:p-8 flex flex-col items-center">
          <div
            id="barcode-card-container"
            className="bg-white rounded-3xl p-6 border-2 border-dashed border-gray-300 shadow-xl flex flex-col items-center justify-center text-center w-full max-w-xs"
          >
            <div className="flex items-center gap-1.5 text-black font-black text-xs uppercase tracking-widest mb-1">
              {business.logo ? (
                <img src={business.logo} alt="Logo" className="w-4 h-4 object-contain rounded" />
              ) : (
                <Dumbbell className="w-3.5 h-3.5 text-[#FACC15]" />
              )}
              <span>{business.gymName.toUpperCase()}</span>
            </div>
            <p className="text-sm font-bold text-gray-800 mb-2 truncate max-w-full">
              {member.fullName}
            </p>

            {/* SVG Barcode rendered via JsBarcode */}
            <svg ref={svgRef} className="max-w-full h-auto" />

            <p className="text-[10px] font-mono text-gray-500 mt-1">
              Scan at reception turnstile
            </p>
          </div>

          <div className="w-full mt-6 grid grid-cols-2 gap-3">
            <button
              id="btn-download-barcode-png"
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-black uppercase tracking-wider transition-colors"
            >
              <Download className="w-4 h-4 text-[#FACC15]" />
              <span>Download PNG</span>
            </button>

            <button
              id="btn-print-barcode"
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-[#FACC15] hover:bg-yellow-300 text-black text-xs font-black uppercase tracking-widest shadow-md shadow-[#FACC15]/20 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Print Sticker</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
