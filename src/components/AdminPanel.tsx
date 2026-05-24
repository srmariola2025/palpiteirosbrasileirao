import React, { useState, useEffect } from "react";
import { AlertTriangle, Undo2, Calendar, Settings, Check, Clock, HelpCircle } from "lucide-react";

interface AdminPanelProps {
  simulatedTime: string; // ISO datetime-local value (format: YYYY-MM-DDTHH:MM)
  onChangeSimulatedTime: (value: string) => void;
  onQuickTravel: (preset: "before" | "mid" | "after" | "real") => void;
  realTimeFormatted: string;
  simulatedActive: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  simulatedTime,
  onChangeSimulatedTime,
  onQuickTravel,
  realTimeFormatted,
  simulatedActive
}) => {
  // Use a local state for the input field to prevent mobile keyboards/wheels from lagging
  const [localTime, setLocalTime] = useState(simulatedTime);
  const [showHelp, setShowHelp] = useState(false);

  // Sync state if simulatedTime changes from prop (e.g., via quick travel presets)
  useEffect(() => {
    setLocalTime(simulatedTime);
  }, [simulatedTime]);

  const handleApplyClick = () => {
    onChangeSimulatedTime(localTime);
  };

  return (
    <div id="admin-simulation-panel" className="bg-neutral-950 text-amber-400 border-b-4 border-yellow-500 font-mono text-xs select-none">
      {/* Visual warning diagonal stripes */}
      <div className="h-2 bg-repeating-linear bg-[linear-gradient(45deg,#f59e0b_25%,#1c1917_25%,#1c1917_50%,#f59e0b_50%,#f59e0b_75%,#1c1917_75%,#1c1917)] bg-[size:20px_20px]" />
      
      <div className="p-4 space-y-4">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-2">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-yellow-500 animate-spin-slow shrink-0" />
            <span className="font-bold tracking-widest text-sm uppercase text-yellow-500">
              MODO TESTE & SIMULAÇÃO
            </span>
          </div>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1 bg-neutral-900 border border-neutral-700 hover:border-yellow-500 text-neutral-300 hover:text-yellow-400 px-2.5 py-1 text-[10px] font-bold uppercase transition-all cursor-pointer rounded"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showHelp ? "Ocultar Ajuda" : "Ajuda / Easter Eggs"}</span>
          </button>
        </div>

        {/* Dynamic Help details */}
        {showHelp && (
          <div className="p-3 bg-neutral-900 border border-yellow-600/50 text-neutral-200 text-[11px] leading-relaxed rounded space-y-2">
            <p className="font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1">
              ✨ Guia de Testes & Easter Eggs:
            </p>
            <ul className="list-disc list-inside space-y-1 text-neutral-300 pl-1">
              <li>
                <strong className="text-white">Troféu Secreto:</strong> Clicando 10 vezes no Troféu amarelado lá no topo você ativa/desativa este painel.
              </li>
              <li>
                <strong className="text-white">Surpresinha Secreta:</strong> Clique <span className="underline decoration-yellow-500 font-bold text-yellow-400">10 vezes</span> seguidas no botão <span className="text-white bg-neutral-800 px-1 py-0.5 rounded border border-neutral-700">Recomeçar / Limpar tudo</span> lá embaixo para forçar a abertura do modal da Surpresinha Inteligente!
              </li>
              <li>
                <strong className="text-white">Simulação de Datas:</strong> Escolha qualquer horário ou use os botões rápidos de viagem temporal. As travas de jogos abertos ou bloqueados responderão imediatamente para você testar como fica a tela!
              </li>
            </ul>
          </div>
        )}

        {/* Simulation Status Display */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-neutral-900/80 p-3 border border-neutral-800 rounded">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${simulatedActive ? 'bg-green-500 animate-pulse' : 'bg-neutral-500'}`} />
            <div>
              <p className="font-bold uppercase text-[10px] tracking-wider text-neutral-400">STATUS DA SIMULAÇÃO:</p>
              <p className="text-xs font-black uppercase text-white tracking-wide">
                {simulatedActive ? "🟢 ATIVA: USANDO HORÁRIO SIMULADO" : "⚪ DESATIVADA: USANDO HORA REAL DO CELULAR"}
              </p>
            </div>
          </div>
          
          {simulatedActive && (
            <button
              onClick={() => onQuickTravel("real")}
              className="bg-red-950/80 hover:bg-red-900/90 text-red-200 border-2 border-red-800 hover:border-red-600 px-3 py-1.5 rounded transition-all font-sans font-bold text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer self-start sm:self-center"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Desativar e usar Hora Real</span>
            </button>
          )}
        </div>

        {/* Main Controls Splitter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Hour Input Block */}
          <div className="lg:col-span-5 space-y-1.5">
            <label className="block text-neutral-400 text-[10px] uppercase font-bold tracking-wider">
              ⏱️ 1. Escolher Data/Hora (Fuso de Brasília):
            </label>
            <div className="flex items-stretch gap-1">
              <input
                type="datetime-local"
                value={localTime}
                onChange={(e) => setLocalTime(e.target.value)}
                id="admin-datetime-input"
                className="bg-neutral-900 border-2 border-neutral-700 text-amber-300 rounded px-3 py-2 w-full focus:outline-none focus:border-yellow-500 cursor-pointer font-bold text-xs"
              />
              <button
                onClick={handleApplyClick}
                id="btn-apply-custom-time"
                className="bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-sans font-black px-4 rounded transition-all flex items-center gap-1.5 cursor-pointer text-xs uppercase shrink-0 border-2 border-yellow-500 active:scale-95"
                title="Aplicar hora digitada"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar</span>
              </button>
            </div>
            <p className="text-[9px] text-neutral-500 italic">
              *Selecione o dia/hora e depois clique no botão "APLICAR" para efetivar a simulação no volante.
            </p>
          </div>

          {/* Quick presets list */}
          <div className="lg:col-span-7 space-y-1.5">
            <span className="block text-neutral-400 text-[10px] uppercase font-bold tracking-wider">
              🚅 2. Viagem Rápida Temporal (Atalhos Prontos):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => onQuickTravel("before")}
                id="btn-time-before"
                className={`bg-neutral-900 hover:bg-neutral-800 border rounded p-2 flex flex-col items-start gap-1 transition-all cursor-pointer text-left ${localTime.startsWith("2026-05-10") && simulatedActive ? 'border-green-500 bg-green-950/20' : 'border-neutral-800'}`}
              >
                <div className="flex items-center gap-1 text-green-400 font-bold">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-black uppercase">Antes dos Jogos</span>
                </div>
                <span className="text-[8px] text-neutral-500 leading-none">Todos os palpites abertos e editáveis</span>
              </button>
              
              <button
                onClick={() => onQuickTravel("mid")}
                id="btn-time-mid"
                className={`bg-neutral-900 hover:bg-neutral-800 border rounded p-2 flex flex-col items-start gap-1 transition-all cursor-pointer text-left ${localTime.startsWith("2026-05-21") && simulatedActive ? 'border-sky-500 bg-sky-950/20' : 'border-neutral-800'}`}
              >
                <div className="flex items-center gap-1 text-sky-400 font-bold">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-black uppercase">Meio da Rodada</span>
                </div>
                <span className="text-[8px] text-neutral-500 leading-none">Alguns jogos iniciam travados</span>
              </button>

              <button
                onClick={() => onQuickTravel("after")}
                id="btn-time-after"
                className={`bg-neutral-900 hover:bg-neutral-800 border rounded p-2 flex flex-col items-start gap-1 transition-all cursor-pointer text-left ${localTime.startsWith("2026-06-16") && simulatedActive ? 'border-yellow-500 bg-yellow-950/20' : 'border-neutral-800'}`}
              >
                <div className="flex items-center gap-1 text-yellow-500 font-bold">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-black uppercase">Depois de Tudo</span>
                </div>
                <span className="text-[8px] text-neutral-500 leading-none">Todos os jogos encerrados/travados</span>
              </button>
            </div>
          </div>

        </div>

        {/* Informative footer */}
        <div className="flex items-start gap-2 bg-neutral-950/40 p-2.5 border border-neutral-900 rounded-none">
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5 animate-pulse" />
          <p className="text-[9px] text-neutral-400 leading-tight">
            Seja mudando pelo calendário ou pelos botões rápidos de atalho, todos os palpites se ajustam imediatamente. O horário do sistema atual de verdade é: <span className="text-white underline">{realTimeFormatted}</span>.
          </p>
        </div>
      </div>
    </div>
  );
};
