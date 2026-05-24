import React from "react";
import { Sparkles, X, Flame } from "lucide-react";

interface SecretModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export const SecretModal: React.FC<SecretModalProps> = ({ onAccept, onDecline }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs select-none animate-fade-in">
      <div 
        className="w-full max-w-sm bg-amber-50 rounded border-4 border-neutral-900 shadow-[8px_8px_0px_#141414] overflow-hidden"
        id="secret-surpresinha-modal"
      >
        {/* Zebra Stripe Header */}
        <div className="h-4 bg-repeating-linear bg-[linear-gradient(-45deg,#1c1917_25%,#eab308_25%,#eab308_50%,#1c1917_50%,#1c1917_75%,#eab308_75%,#eab308)] bg-[size:16px_16px]" />
        
        <div className="p-5 space-y-4">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border-2 border-dashed border-yellow-600 bg-yellow-100 animate-bounce">
              <Sparkles className="w-6 h-6 text-yellow-650" />
            </div>
            
            <h3 className="font-sans font-black text-xl text-neutral-900 tracking-tight uppercase leading-tight pt-1">
              🎰 Surpresinha Secreta!
            </h3>
            <p className="font-mono text-xs text-neutral-500 font-bold uppercase">
              ALGORITMO DE INTELIGÊNCIA PROBABILÍSTICA DETECTADO
            </p>
          </div>

          <div className="p-3 bg-neutral-900 text-amber-300 font-mono text-[11px] leading-relaxed rounded border border-neutral-800 shadow-inner space-y-2">
            <p className="font-bold flex items-center gap-1 text-yellow-400">
              <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" /> MODALIDADE DE LOTERIA UFMG
            </p>
            <p>
              Integrado com os cálculos probabilísticos oficiais do Departamento de Matemática da <strong className="text-white underline">UFMG</strong> (mat.ufmg.br).
            </p>
            <p className="text-neutral-400 text-[10px]">
              Cada confronto é analisado individualmente usando os percentuais de probabilidade real para a rodada atual e a prévia:
            </p>
            <ul className="list-disc list-inside text-[10px] space-y-0.5 text-neutral-300 pl-1">
              <li>🏠 Vitória do Mandante (porcentagem individualizada)</li>
              <li>🤝 Empate Técnico (porcentagem de equilíbrio da UFMG)</li>
              <li>✈️ Vitória do Visitante (porcentagem individualizada)</li>
            </ul>
            <p className="text-neutral-400 text-[10px] italic">
              *Placares gerados são ponderados de acordo com os desfechos mais frequentes do Brasileirão 2026.
            </p>
          </div>

          <p className="font-sans font-bold text-center text-xs text-neutral-700">
            Deseja que nosso algoritmo matemático preencha automaticamente as previsões abertas?
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={onAccept}
              id="btn-accept-surpresinha"
              className="bg-green-600 hover:bg-green-700 hover:scale-[1.02] text-white font-sans font-bold text-xs py-2.5 px-4 border-2 border-neutral-900 rounded cursor-pointer shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all uppercase tracking-wide"
            >
              ⚽ SIM, PREENCHER!
            </button>
            
            <button
              onClick={onDecline}
              id="btn-decline-surpresinha"
              className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-sans font-bold text-xs py-2.5 px-4 border-2 border-neutral-900 rounded cursor-pointer shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all uppercase tracking-wide"
            >
              NÃO, FECHAR
            </button>
          </div>
        </div>

        {/* Vintage serrated outline trim */}
        <div className="h-2 bg-neutral-300 border-t border-neutral-400 flex justify-between overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-neutral-950 -translate-y-[60%] shrink-0" />
          ))}
        </div>
      </div>
    </div>
  );
};
