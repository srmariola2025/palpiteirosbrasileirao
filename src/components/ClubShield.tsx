import React, { useState } from "react";

interface ClubShieldProps {
  teamName: string;
  className?: string;
}

// Slugs matching the paladarnegro.net/escudoteca/brasil/seriea/png/ filenames
const CLUB_SLUGS: Record<string, string> = {
  "Flamengo": "flamengo",
  "Palmeiras": "palmeiras",
  "Corinthians": "corinthians",
  "São Paulo": "saopaulo",
  "Atlético-MG": "atlmineiro",
  "Cruzeiro": "cruzeiro",
  "Grêmio": "gremio",
  "Internacional": "internacional",
  "Botafogo": "botafogo",
  "Fluminense": "fluminense",
  "Vasco da Gama": "vasco",
  "Santos": "santos",
  "Bahia": "bahia",
  "Vitória": "vitoria",
  "Athletico-PR": "atlparanaense",
  "Coritiba": "coritiba",
  "Chapecoense": "chapecoense",
  "Remo": "remo",
  "Mirassol": "mirassol",
  "RB Bragantino": "rbbragantino"
};

// Colors matching each traditional club for robust aesthetic fallback
const CLUB_COLORS: Record<string, { bg: string; text: string; border: string; initial: string; symbol?: string }> = {
  "Flamengo": { bg: "bg-red-650", text: "text-white", border: "border-black", initial: "F" },
  "Palmeiras": { bg: "bg-green-700", text: "text-white", border: "border-green-800", initial: "P" },
  "Corinthians": { bg: "bg-white", text: "text-neutral-900", border: "border-neutral-900", initial: "C" },
  "São Paulo": { bg: "bg-red-600", text: "text-white", border: "border-black", initial: "SP" },
  "Atlético-MG": { bg: "bg-neutral-900", text: "text-white", border: "border-neutral-700", initial: "A" },
  "Cruzeiro": { bg: "bg-blue-600", text: "text-white", border: "border-blue-700", initial: "C", symbol: "★" },
  "Grêmio": { bg: "bg-sky-500", text: "text-white", border: "border-neutral-900", initial: "G" },
  "Internacional": { bg: "bg-red-600", text: "text-white", border: "border-red-750", initial: "I" },
  "Botafogo": { bg: "bg-neutral-950", text: "text-white", border: "border-neutral-800", initial: "B", symbol: "★" },
  "Fluminense": { bg: "bg-amber-800", text: "text-green-200", border: "border-emerald-950", initial: "F" },
  "Vasco da Gama": { bg: "bg-neutral-900", text: "text-white", border: "border-white/20", initial: "V", symbol: "✙" },
  "Santos": { bg: "bg-white", text: "text-neutral-850", border: "border-neutral-400", initial: "S" },
  "Bahia": { bg: "bg-blue-500", text: "text-white", border: "border-red-500", initial: "B" },
  "Vitória": { bg: "bg-red-650", text: "text-black", border: "border-red-800", initial: "V" },
  "Athletico-PR": { bg: "bg-red-600", text: "text-black", border: "border-black", initial: "CAP" },
  "Coritiba": { bg: "bg-green-750", text: "text-white", border: "border-green-900", initial: "C" },
  "Chapecoense": { bg: "bg-emerald-700", text: "text-white", border: "border-emerald-800", initial: "ACF" },
  "Remo": { bg: "bg-[#001e44]", text: "text-white", border: "border-[#002b5c]", initial: "CR" },
  "Mirassol": { bg: "bg-yellow-400", text: "text-green-800", border: "border-green-700", initial: "M" },
  "RB Bragantino": { bg: "bg-white", text: "text-red-600", border: "border-neutral-300", initial: "RBB" }
};

export const ClubShield: React.FC<ClubShieldProps> = ({ teamName, className = "" }) => {
  const [hasError, setHasError] = useState(false);
  const slug = CLUB_SLUGS[teamName] || teamName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const imageUrl = `https://paladarnegro.net/escudoteca/brasil/seriea/png/${slug}.png`;
  
  const design = CLUB_COLORS[teamName] || { 
    bg: "bg-neutral-400", 
    text: "text-neutral-800", 
    border: "border-neutral-500", 
    initial: teamName.slice(0, 2).toUpperCase(),
    symbol: ""
  };

  if (hasError) {
    return (
      <div 
        className={`w-7 h-7 rounded-full border flex items-center justify-center font-sans font-black text-[10px] select-none shadow-[1px_1px_0px_#000000] relative overflow-hidden shrink-0 ${design.bg} ${design.text} ${design.border} ${className}`}
        title={`${teamName} (Escudo Geométrico Brasileirão)`}
      >
        <span className="relative z-10 leading-none">{design.symbol || design.initial}</span>
        {/* Underlay decoration patterns to look extremely aesthetic as fallback */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-black/10 pointer-events-none" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={`${teamName} Club Badge`}
      onError={() => {
        // Fallback elegantly to retro mathematical fallback design instead of standard broken crop image
        setHasError(true);
      }}
      referrerPolicy="no-referrer"
      className={`w-7 h-7 object-contain inline-block shrink-0 transition-opacity select-none ${className}`}
    />
  );
};
