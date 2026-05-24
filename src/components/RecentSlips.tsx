import React, { useState } from "react";
import { History, Eye, Trash2, CalendarRange, KeyRound, ChevronDown, ChevronUp, Share2 } from "lucide-react";
import { BetSlipSubmission } from "../types";

interface RecentSlipsProps {
  slips: BetSlipSubmission[];
  onDeleteSlip: (code: string) => void;
  onRestoreSlip: (slip: BetSlipSubmission) => void;
  onShareWhatsAppAgain: (slip: BetSlipSubmission) => void;
}

export const RecentSlips: React.FC<RecentSlipsProps> = ({
  slips,
  onDeleteSlip,
  onRestoreSlip,
  onShareWhatsAppAgain
}) => {
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const toggleExpand = (code: string) => {
    setExpandedCode(expandedCode === code ? null : code);
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoStr;
    }
  };

  const displayedSlips = slips.slice(0, 3);

  if (displayedSlips.length === 0) {
    return (
      <div className="border-2 border-dashed border-neutral-400 bg-amber-50/20 rounded-none p-6 text-center select-none font-mono text-xs text-neutral-500">
        <History className="w-6 h-6 mx-auto mb-2 text-neutral-450" />
        <p>Ainda não há palpites gravados.</p>
        <p className="text-[10px] text-neutral-400/80 mt-1 font-bold">PREENCHA UM VOLANTE E ENVIE SEU PALPITE PARA SALVAR NO HISTÓRICO LOCAL!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 border-b-2 border-neutral-900 pb-2">
        <History className="w-4 h-4 text-neutral-900" />
        <h3 className="font-sans font-black text-sm text-neutral-900 uppercase tracking-widest">
          Meus Palpites Recentes
        </h3>
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {displayedSlips.map((slip) => {
          return (
            <div
              key={slip.ticketCode}
              id={`recent-slip-${slip.ticketCode}`}
              className="border-2 border-neutral-900 rounded-none bg-white/70 transition-all shadow-[3px_3px_0px_#000000] hover:bg-neutral-100 opacity-95 hover:opacity-100"
            >
              {/* Slip Header Box */}
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] font-black text-neutral-500">
                    <KeyRound className="w-3 h-3 text-neutral-600" />
                    <span className="text-neutral-950 bg-amber-300 px-1.5 py-0.5 border border-neutral-900 rounded-none">
                      {slip.ticketCode}
                    </span>
                    <span className="text-[9px] text-neutral-400 font-bold">
                      • {formatDate(slip.submittedAt)}
                    </span>
                  </div>
                  
                  <p className="font-sans font-black text-xs text-neutral-900 mt-1 truncate uppercase tracking-tight">
                    👤 Por: {slip.fullName}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 select-none">
                  {/* Share button */}
                  <button
                    onClick={() => onShareWhatsAppAgain(slip)}
                    className="p-1.5 hover:bg-green-150 text-green-900 hover:text-green-950 border-2 border-neutral-900 cursor-pointer transition-colors"
                    title="Reenviar ao WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Restore as current */}
                  <button
                    onClick={() => onRestoreSlip(slip)}
                    className="p-1.5 hover:bg-blue-150 text-blue-905 hover:text-blue-950 border-2 border-neutral-900 cursor-pointer transition-colors"
                    title="Editar estes palpites no volante"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
