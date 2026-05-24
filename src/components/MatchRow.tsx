import React from "react";
import { Lock, Unlock } from "lucide-react";
import { Match, UserPrediction } from "../types";
import { ClubShield } from "./ClubShield";

interface MatchRowProps {
  match: Match;
  index: number;
  prediction: UserPrediction | undefined;
  onPredictionChange: (matchId: string, score1: string, score2: string) => void;
  isLocked: boolean;
  kickoffDate: Date;
  showUfmgStats?: boolean;
}

export const MatchRow: React.FC<MatchRowProps> = ({
  match,
  index,
  prediction,
  onPredictionChange,
  isLocked,
  kickoffDate,
  showUfmgStats = false
}) => {
  const score1 = prediction?.score1 || "";
  const score2 = prediction?.score2 || "";

  // Helper to format date into "DD/MM" representation
  const formatMatchDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}`;
    } catch {
      return dateStr;
    }
  };

  const handleScore1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Only allow whole numbers or empty
    if (/^\d*$/.test(val)) {
      onPredictionChange(match.id, val, score2);
    }
  };

  const handleScore2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val)) {
      onPredictionChange(match.id, score1, val);
    }
  };

  return (
    <div
      id={`match-row-${match.id}`}
      className={`relative py-2.5 px-2 sm:px-6 border-b border-neutral-200 bg-white/50 transition-all duration-305 ${
        isLocked
          ? "bg-neutral-200/50 opacity-75"
          : "hover:bg-amber-50/60"
      }`}
    >
      {/* Upper Technical Tag line */}
      <div className="flex justify-between items-center text-[10px] font-mono font-bold text-neutral-500 mb-1">
        <span className="text-neutral-900 font-extrabold bg-amber-200 px-1.5 py-0.5 border border-neutral-800 rounded scale-90 sm:scale-100 origin-left">
          JOGO {(index + 1).toString().padStart(2, "0")}
        </span>
        
        <span className="tracking-tight text-neutral-605 uppercase font-semibold text-center flex-1 mx-1 text-[9px] sm:text-xs truncate">
          {match.stadium ? match.stadium : "Estádio Geral"} • {formatMatchDate(match.date)} às {match.time}
        </span>

        {isLocked ? (
          <span className="flex items-center gap-1 text-red-600 font-bold bg-red-100 px-1 border border-red-500 rounded animate-pulse scale-90 sm:scale-100 origin-right">
            <Lock className="w-2.5 h-2.5 shrink-0 text-red-600" />
            <span>🚫 INICIADO</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-green-700 font-medium bg-green-100 px-1 border border-green-500 rounded scale-90 sm:scale-100 origin-right">
            <Unlock className="w-2.5 h-2.5 shrink-0 text-green-600" />
            <span>ABERTO</span>
          </span>
        )}
      </div>

      {/* Main Row layout - Symmetrical Geometric Balance Grid */}
      <div className="grid grid-cols-3 items-center gap-1 sm:gap-3 py-1">
        
        {/* Mandante Club info */}
        <div className="flex flex-col text-right pr-0.5 sm:pr-2">
          <span className="text-[8px] sm:text-[9px] font-mono text-neutral-400 font-bold uppercase tracking-wider block">
            MANDANTE
          </span>
          <div className="flex items-center justify-end gap-1 sm:gap-1.5 mt-0.5">
            <span className="text-[11px] sm:text-xs md:text-sm font-sans font-extrabold text-neutral-900 truncate max-w-[65px] sm:max-w-none" title={match.team1}>
              {match.team1}
            </span>
            <ClubShield teamName={match.team1} />
          </div>
        </div>

        {/* Score Inputs Box (Center) */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          {/* Input score mandante */}
          <input
            type="text"
            pattern="[0-9]*"
            inputMode="numeric"
            maxLength={2}
            value={score1}
            onChange={handleScore1Change}
            disabled={isLocked}
            placeholder="-"
            id={`input-score1-${match.id}`}
            className={`w-[40px] h-[40px] sm:w-[45px] sm:h-[45px] font-mono text-lg sm:text-xl font-black text-center border-2 border-neutral-900 rounded-none bg-white text-neutral-900 outline-none transition-all ${
              isLocked
                ? "bg-neutral-200 text-neutral-500 cursor-not-allowed border-neutral-450 select-none"
                : "focus:bg-yellow-101 focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 shadow-[2px_2px_0px_#171717]"
            }`}
          />

          {/* Separator x */}
          <span className="font-sans font-black text-xs sm:text-sm text-neutral-900 uppercase select-none">
            X
          </span>

          {/* Input score visitante */}
          <input
            type="text"
            pattern="[0-9]*"
            inputMode="numeric"
            maxLength={2}
            value={score2}
            onChange={handleScore2Change}
            disabled={isLocked}
            placeholder="-"
            id={`input-score2-${match.id}`}
            className={`w-[40px] h-[40px] sm:w-[45px] sm:h-[45px] font-mono text-lg sm:text-xl font-black text-center border-2 border-neutral-900 rounded-none bg-white text-neutral-900 outline-none transition-all ${
              isLocked
                ? "bg-neutral-200 text-neutral-500 cursor-not-allowed border-neutral-450 select-none"
                : "focus:bg-yellow-101 focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 shadow-[2px_2px_0px_#171717]"
            }`}
          />
        </div>

        {/* Visitante Club info */}
        <div className="flex flex-col text-left pl-0.5 sm:pl-2">
          <span className="text-[8px] sm:text-[9px] font-mono text-neutral-400 font-bold uppercase tracking-wider block">
            VISITANTE
          </span>
          <div className="flex items-center justify-start gap-1 sm:gap-1.5 mt-0.5">
            <ClubShield teamName={match.team2} />
            <span className="text-[11px] sm:text-xs md:text-sm font-sans font-extrabold text-neutral-900 truncate max-w-[65px] sm:max-w-none" title={match.team2}>
              {match.team2}
            </span>
          </div>
        </div>

      </div>

      {/* UFMG Probabilities bar */}
      {showUfmgStats && (match.probHome !== undefined && match.probDraw !== undefined && match.probAway !== undefined) && (
        <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 mt-1.5 text-[9px] font-mono font-bold text-neutral-500 bg-neutral-100/90 py-1 px-2 border border-neutral-200/80 rounded">
          <span className="text-neutral-500 uppercase tracking-tight flex items-center gap-1">
            📊 Probabilidades UFMG:
          </span>
          <span className="text-neutral-800">🏠 Mandante <strong className="text-emerald-700">{match.probHome}%</strong></span>
          <span className="text-neutral-300">|</span>
          <span className="text-neutral-800">🤝 Empate <strong className="text-neutral-700">{match.probDraw}%</strong></span>
          <span className="text-neutral-300">|</span>
          <span className="text-neutral-800">✈️ Visitante <strong className="text-indigo-700">{match.probAway}%</strong></span>
        </div>
      )}

      {/* Locked message cover layer tip */}
      {isLocked && (
        <div className="absolute inset-0 bg-neutral-900/[0.02] cursor-not-allowed rounded" title="Aposta bloqueada para este jogo já iniciado." />
      )}
    </div>
  );
};
