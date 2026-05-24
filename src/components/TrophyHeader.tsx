import React, { useState, useEffect } from "react";
import { Trophy, Clock } from "lucide-react";

interface TrophyHeaderProps {
  onTrophyClick: () => void;
  clickCount: number;
  simulatedTimeActive: boolean;
  formattedTime: string;
  nextMatchCountdown?: string;
  nextMatchLabel?: string;
}

export const TrophyHeader: React.FC<TrophyHeaderProps> = ({
  onTrophyClick,
  clickCount,
  simulatedTimeActive,
  formattedTime,
  nextMatchCountdown,
  nextMatchLabel
}) => {
  return (
    <header className="relative border-b-2 border-neutral-900 bg-[#f2ede4] p-5 select-none text-neutral-900">
      {/* Decorative background security grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#171717_1.5px,transparent_1.5px)] [background-size:10px_10px]"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
        
        {/* Left column titles */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-wider text-neutral-500 uppercase">
              CÓDIGO OPERACIONAL: 55-BR-2026
            </span>
            
            {/* Secret interactive trophy trigger cleanly embedded near code - completely discrete for security */}
            <button
              onClick={onTrophyClick}
              id="retro-trophy-trigger"
              className="relative inline-flex items-center justify-center p-1 rounded bg-yellow-400 border border-neutral-900 cursor-pointer text-neutral-900 transition-all"
              title="Volante Oficial"
            >
              <Trophy className="w-3 h-3" />
            </button>
          </div>

          <h1 className="text-2xl md:text-3.5xl font-extrabold leading-tight italic uppercase tracking-tighter text-neutral-900 mt-1">
            Palpiteiros <span className="text-green-800">Brasileirão 2026</span>
          </h1>
          
          <p className="text-[11px] font-sans font-bold text-neutral-600 uppercase tracking-widest mt-0.5">
            ★ ELITE DO FUTEBOL NACIONAL ★
          </p>
        </div>

        {/* Right column with Rodada Badge */}
        <div className="text-left md:text-right flex md:flex-col items-start md:items-end justify-between w-full md:w-auto border-t md:border-t-0 border-neutral-300 pt-3 md:pt-0">
          <div>
            <div className="bg-neutral-900 text-amber-300 px-3 py-1 text-lg font-black tracking-tight mb-1 inline-block md:block font-mono">
              17ª <span className="text-xs font-sans uppercase">RODADA</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
              ESTADO: {simulatedTimeActive ? "TESTE ATIVO" : "ATIVO"}
            </div>
          </div>
        </div>

      </div>

      {/* Sub-Header Technical Bar with Validation Clock */}
      <div className="flex flex-col gap-2 mt-4 pt-3 border-t-2 border-dashed border-neutral-400 text-xs font-mono font-bold text-neutral-600">
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1.5">
          <span>VOLANTE ATUAL</span>
          
          <div className="flex items-center gap-1.5 text-neutral-900 bg-neutral-200/80 px-2 py-0.5 border border-neutral-400 rounded">
            <Clock className="w-3 h-3 text-neutral-700" />
            <span>
              {simulatedTimeActive ? "🕒 SIMULAÇÃO: " : "🕒 BRT: "}
              {formattedTime}
            </span>
          </div>
        </div>

        {nextMatchLabel && nextMatchCountdown && (
          <div className="flex items-center justify-between bg-red-50 border border-red-550 text-red-700 px-3 py-1.5 rounded text-[11px] select-none animate-pulse">
            <div className="flex items-center gap-1.5 truncate">
              <span className="inline-block w-2 h-2 rounded-full bg-red-650" />
              <span className="font-sans font-bold uppercase truncate">⏱️ Palpites fecham em ({nextMatchLabel}):</span>
            </div>
            <span className="font-extrabold font-mono text-[12px] bg-red-200/80 text-red-900 px-1.5 py-0.5 rounded shrink-0">{nextMatchCountdown}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-1.5">
          <a
            href="https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-a/2026"
            target="_blank"
            rel="noopener noreferrer"
            id="btn-tabela-cbf"
            className="flex items-center justify-center gap-1.5 bg-green-50 hover:bg-green-150 text-green-800 font-sans font-extrabold text-[11px] py-2 px-3 border border-green-600 rounded cursor-pointer transition-colors text-center uppercase shadow-sm active:translate-y-0.5"
          >
            📊 Tabela
          </a>
          <a
            href="https://www.mat.ufmg.br/futebol/tabela-de-probabilidades_seriea/"
            target="_blank"
            rel="noopener noreferrer"
            id="btn-estatisticas-ufmg"
            className="flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-150 text-blue-800 font-sans font-extrabold text-[11px] py-2 px-3 border border-blue-600 rounded cursor-pointer transition-colors text-center uppercase shadow-sm active:translate-y-0.5"
          >
            📈 Estatísticas
          </a>
        </div>
      </div>
    </header>
  );
};
