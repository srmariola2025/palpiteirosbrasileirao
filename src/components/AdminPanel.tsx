import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  Undo2, 
  Calendar, 
  Settings, 
  Check, 
  Clock, 
  HelpCircle, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Save, 
  Wifi, 
  Eye, 
  EyeOff,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Match } from "../types";
import { OFFICIAL_ROUNDS } from "../data/officialRounds";

interface AdminPanelProps {
  activeRound: number;
  matches: Match[]; // Partidas da rodada selecionada
  onUpdateMatchTime: (matchId: string, newDate: string, newTime: string) => void;
  onResetAllMatches: () => void;
  onSyncAPI: (roundNum: number, syncedMatches: Match[]) => void;
  onChangeActiveRound: (roundNum: number) => void;
  onClose: () => void;

  // Firebase Auth & Cloud Sync Support
  currentUser: any;
  isAdminLogged: boolean;
  firebaseRoundsEmpty: boolean;
  onLoginWithGoogle: () => Promise<void>;
  onLogout: () => Promise<void>;
  onBootstrapFirebase: () => Promise<void>;
  isFirebaseLoading: boolean;

  onSyncAllRounds: (onProgress: (status: string) => void) => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  activeRound,
  matches,
  onUpdateMatchTime,
  onResetAllMatches,
  onSyncAPI,
  onChangeActiveRound,
  onClose,

  currentUser,
  isAdminLogged,
  firebaseRoundsEmpty,
  onLoginWithGoogle,
  onLogout,
  onBootstrapFirebase,
  isFirebaseLoading,
  onSyncAllRounds
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showManualEditor, setShowManualEditor] = useState(false);
  const [showGeSync, setShowGeSync] = useState(true);
  
  // Custom Raw Text Sync engine
  const [rawTextToSync, setRawTextToSync] = useState("");
  const [textSyncResult, setTextSyncResult] = useState<{
    success: boolean;
    message: string;
    logs: string[];
  } | null>(null);
  const [showTextSync, setShowTextSync] = useState(false); // Default to collapsed backup

  // Globo Esporte Sync state
  const [geSyncLoading, setGeSyncLoading] = useState(false);
  const [geSyncStatus, setGeSyncStatus] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Batch Sync (R19 to R38) state
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [syncAllStatus, setSyncAllStatus] = useState<string | null>(null);

  const handleSyncAllClick = async () => {
    setSyncAllLoading(true);
    setSyncAllStatus("⏳ Iniciando sincronização em lote (Rodadas 19 a 38)...");
    try {
      await onSyncAllRounds((progressMsg: string) => {
        setSyncAllStatus(prev => {
          if (!prev) return progressMsg;
          // Limita tamanho para não sobrecarregar
          const lines = prev.split("\n");
          if (lines.length > 300) {
            return `${lines.slice(-300).join("\n")}\n${progressMsg}`;
          }
          return `${prev}\n${progressMsg}`;
        });
      });
    } catch (err: any) {
      setSyncAllStatus(prev => `${prev}\n❌ Falha na sincronização completa: ${err.message || err}`);
    } finally {
      setSyncAllLoading(false);
    }
  };

  // String normalization for robust team matching
  const normalizeTeamName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, "")     // letters/digits only
      .replace("esporteclubevitoria", "vitoria")
      .replace("gremiofbpa", "gremio")
      .replace("botafogorj", "botafogo")
      .replace("saopaulo", "saopaulo")
      .replace("redbullbragantino", "rbbragantino")
      .replace("bragantino", "rbbragantino")
      .replace("atleticoparanaense", "athleticopr")
      .replace("atleticopr", "athleticopr")
      .replace("atleticoclubemineiro", "atleticomg")
      .replace("atleticomineiro", "atleticomg")
      .replace("atleticomg", "atleticomg")
      .replace("vascodagama", "vascodagama")
      .replace("vasco", "vascodagama")
      .replace("chapecoenseaf", "chapecoense");
  };

  // Find corresponding local team mapping
  const localTeamsPool = [
    "São Paulo", "Botafogo", "Vitória", "Internacional", "Grêmio", "Santos", 
    "Mirassol", "Fluminense", "Flamengo", "Palmeiras", "Cruzeiro", "Chapecoense", 
    "Remo", "Athletico-PR", "Corinthians", "Atlético-MG", "Vasco da Gama", 
    "RB Bragantino", "Coritiba", "Bahia"
  ];

  const mapApiTeamName = (foreignName: string): string => {
    if (!foreignName || !foreignName.trim()) return "";
    const foreignNorm = normalizeTeamName(foreignName);
    if (!foreignNorm) return foreignName;
    
    // Exact mapping check
    for (const localTeam of localTeamsPool) {
      const localNorm = normalizeTeamName(localTeam);
      if (foreignNorm === localNorm) {
        return localTeam;
      }
      if (foreignNorm.length >= 3 && localNorm.length >= 3) {
        if (foreignNorm.includes(localNorm) || localNorm.includes(foreignNorm)) {
          return localTeam;
        }
      }
    }
    return foreignName;
  };

  const generateFallbackGamesForRoundClient = (roundNum: number) => {
    const roundMatches = OFFICIAL_ROUNDS[roundNum];
    if (roundMatches && roundMatches.length > 0) {
      return roundMatches.map(m => ({
        equipes: {
          mandante: { nome_popular: m.team1, nome: m.team1 },
          visitante: { nome_popular: m.team2, nome: m.team2 }
        },
        data_realizacao: `${m.date}T${m.time}:00`,
        hora_realizacao: m.time,
        sede: { nome_popular: m.stadium }
      }));
    }
    return [];
  };

  // Sincroniza partidas da rodada focada/ativa com o Globo Esporte
  const handleSyncFromGE = async () => {
    setGeSyncLoading(true);
    setGeSyncStatus("⏳ Conectando aos servidores do Globo Esporte pelo proxy...");

    try {
      const updatedMatches = [...matches];
      let matchedCount = 0;
      const logs: string[] = [];

      logs.push(`⏳ Sincronizando com ge.globo.com para a Rodada ${activeRound}...`);

      let responseData: any = null;
      try {
        const res = await fetch(`/api/sync-ge/${activeRound}`);
        if (!res.ok) {
          throw new Error(`Servidor proxy retornou erro HTTP ${res.status}`);
        }
        responseData = await res.json();
        logs.push(`✅ Conexão estabelecida com sucesso para a Rodada ${activeRound}.`);
      } catch (fetchErr: any) {
        console.warn("Proxy api unavailable, activating local client fallback scheduler:", fetchErr);
        logs.push(`⚠️ Nota: Servidor backend indisponível (HTTP ${fetchErr.message && fetchErr.message.includes("404") ? "404" : "erro de conexão"}).`);
        logs.push(`💡 Isso ocorre ao hospedar de forma estática no GitHub Pages (onde não há servidor backend).`);
        logs.push(`⚡ Executando inteligência resiliente embutida no navegador para gerar os jogos...`);
        responseData = generateFallbackGamesForRoundClient(activeRound);
        logs.push(`✅ Jogos da Rodada ${activeRound} calculados e carregados localmente.`);
      }

      let gamesList: any[] = [];
      if (Array.isArray(responseData)) {
        gamesList = responseData;
      } else if (responseData && Array.isArray(responseData.jogos)) {
        gamesList = responseData.jogos;
      } else if (responseData && typeof responseData === 'object') {
        const foundArray = Object.values(responseData).find(val => Array.isArray(val));
        if (foundArray) {
          gamesList = foundArray;
        }
      }

      if (gamesList.length === 0) {
        logs.push(`⚠️ Nenhum jogo estruturado localizado na resposta do Globo Esporte para a Rodada ${activeRound}.`);
      } else {
        logs.push(`ℹ️ Recebidos ${gamesList.length} jogos oficiais da Rodada ${activeRound}.`);

        const newSyncedMatches: Match[] = gamesList.map((g: any, index: number) => {
          let mappedHome = "";
          let mappedAway = "";
          let parsedDate = "";
          let parsedTime = "";
          let parsedStadium = "";

          if (g.team1 && g.team2) {
            mappedHome = mapApiTeamName(g.team1) || g.team1;
            mappedAway = mapApiTeamName(g.team2) || g.team2;
            parsedDate = g.date || "2026-07-25";
            parsedTime = g.time || "16:00";
            parsedStadium = g.stadium || "Estádio";
          } else {
            const mandanteName = g.equipes?.mandante?.nome_popular || g.equipes?.mandante?.nome || "";
            const visitanteName = g.equipes?.visitante?.nome_popular || g.equipes?.visitante?.nome || "";

            mappedHome = mapApiTeamName(mandanteName) || mandanteName || "Mandante";
            mappedAway = mapApiTeamName(visitanteName) || visitanteName || "Visitante";

            const rawDate = g.data_realizacao || g.data_jogo || "";
            parsedDate = rawDate.length >= 10 ? rawDate.substring(0, 10) : "2026-07-25";
            parsedTime = g.hora_realizacao || g.hora_jogo || "16:00";
            parsedStadium = g.sede?.nome_popular || g.estadio?.nome_popular || g.sede?.nome || "Estádio";
          }

          logs.push(`✓ Jogo ${index + 1}: ${mappedHome} x ${mappedAway} -> ${parsedDate.split('-').reverse().join('/')} às ${parsedTime} (${parsedStadium})`);

          return {
            id: `br2026-r${activeRound}-${index + 1}`,
            date: parsedDate,
            time: parsedTime,
            team1: mappedHome,
            team2: mappedAway,
            stadium: parsedStadium,
            roundName: `${activeRound}ª Rodada`,
            probHome: 45,
            probDraw: 30,
            probAway: 25
          };
        });

        matchedCount = newSyncedMatches.length;
        updatedMatches.length = 0;
        updatedMatches.push(...newSyncedMatches);
      }

      if (matchedCount === 0) {
        logs.push(`\n⚠️ Não sincronizou partidas da Rodada ${activeRound}. Nomes populares diferentes nas tabelas.`);
      } else {
        logs.push(`\n✨ Sucesso completo! Foram atualizados/confirmados (${matchedCount}) confrontos.`);
      }

      // Atualiza o estado das partidas da rodada correspondente no App
      onSyncAPI(activeRound, updatedMatches);
      setGeSyncStatus(logs.join("\n"));
    } catch (err: any) {
      console.error(err);
      setGeSyncStatus(`❌ Falha na comunicação / decodificação de dados: ${err.message || "Serviço indisponível"}`);
    } finally {
      setGeSyncLoading(false);
    }
  };

  // Smart text-based syncing parser that runs locally and detects postponements
  const handleSyncFromRawText = () => {
    if (!rawTextToSync.trim()) {
      setTextSyncResult({
        success: false,
        message: "⚠️ Por favor, cole o texto com as informações dos jogos primeiro!",
        logs: []
      });
      return;
    }

    const lines = rawTextToSync.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const updatedMatches = [...matches];
    let matchedCount = 0;
    const logs: string[] = [];

    const groups = [
      { name: `${activeRound}ª Rodada`, list: updatedMatches }
    ];

    groups.forEach(g => {
      g.list.forEach((match, idx) => {
        const t1Norm = normalizeTeamName(match.team1);
        const t2Norm = normalizeTeamName(match.team2);

        let matchedInWindow = false;
        let windowText = "";

        // Check matching team names on the same line
        for (let i = 0; i < lines.length; i++) {
          const lineNorm = normalizeTeamName(lines[i]);
          if (lineNorm.includes(t1Norm) && lineNorm.includes(t2Norm)) {
            matchedInWindow = true;
            const start = Math.max(0, i - 2);
            const end = Math.min(lines.length - 1, i + 2);
            windowText = lines.slice(start, end + 1).join(" ");
            break;
          }
        }

        // Check matching team names on adjacent lines if not found together
        if (!matchedInWindow) {
          for (let i = 0; i < lines.length - 1; i++) {
            const line1Norm = normalizeTeamName(lines[i]);
            const line2Norm = normalizeTeamName(lines[i+1]);
            if (
              (line1Norm.includes(t1Norm) && line2Norm.includes(t2Norm)) ||
              (line1Norm.includes(t2Norm) && line2Norm.includes(t1Norm))
            ) {
              matchedInWindow = true;
              const start = Math.max(0, i - 2);
              const end = Math.min(lines.length - 1, i + 3);
              windowText = lines.slice(start, end + 1).join(" ");
              break;
            }
          }
        }

        // If a game matches in text, extract the Date and Time near it
        if (matchedInWindow) {
          const dateRegex = /\b(0?[1-9]|[12][0-9]|3[01])[\/\.-](0?[1-9]|1[012])\b/;
          const timeRegex = /\b([01]?[0-9]|2[0-3])[:hH]([0-5][0-9])\b/;

          const dateMatch = windowText.match(dateRegex);
          const timeMatch = windowText.match(timeRegex);

          if (dateMatch && timeMatch) {
            const day = dateMatch[1].padStart(2, "0");
            const month = dateMatch[2].padStart(2, "0");
            const parsedDate = `2026-${month}-${day}`;
            
            const hours = timeMatch[1].padStart(2, "0");
            const minutes = timeMatch[2].padStart(2, "0");
            const parsedTime = `${hours}:${minutes}`;

            const isUnchanged = match.date === parsedDate && match.time === parsedTime;

            g.list[idx] = {
              ...match,
              date: parsedDate,
              time: parsedTime
            };
            matchedCount++;
            if (isUnchanged) {
              logs.push(`ℹ️ [${g.name}] Mantido: ${match.team1} x ${match.team2} -> Dia ${day}/${month} às ${hours}:${minutes}`);
            } else {
              logs.push(`✅ [${g.name}] ATUALIZADO: ${match.team1} x ${match.team2} -> Reagendado para dia ${day}/${month} às ${hours}:${minutes}`);
            }
          } else {
            logs.push(`⚠️ [${g.name}] Mapeado [${match.team1} x ${match.team2}], mas NÃO RECONHECEU a data (DD/MM) ou hora (HH:MM) nas linhas próximas.`);
          }
        }
      });
    });

    if (matchedCount > 0) {
      onSyncAPI(activeRound, updatedMatches);
      setTextSyncResult({
        success: true,
        message: `Sincronização por texto concluída! Analisou o texto e atualizou ${matchedCount} jogos da ${activeRound}ª Rodada com sucesso!`,
        logs
      });
    } else {
      setTextSyncResult({
        success: false,
        message: "⚠️ Nenhum jogo reconhecido no texto. Certifique-se de incluir adversários corretos e as datas próximos deles.",
        logs: [
          "Dica: Tente colar algo como: 'Remo x São Paulo: 31/05 às 20:30'."
        ]
      });
    }
  };

  const loadRealExample = () => {
    setRawTextToSync(
      `--- EXCLUSIVO: JOGOS ADIADOS E HORÁRIOS PARTICULARES --- \n` +
      `Novas definições oficiais:\n\n` +
      `• Arena Fonte Nova - Sábado 30/05 às 17:30\n` +
      `Bahia 1 x 0 Botafogo\n\n` +
      `• Arena do Grêmio - Sábado 30/05 às 17h30\n` +
      `Grêmio x Corinthians\n\n` +
      `• Nabizão - Domingo 31/05 às 11:00\n` +
      `RB Bragantino x Internacional\n\n` +
      `• Baenão - Domingo 31/05 às 20:30\n` +
      `Remo x São Paulo`
    );
  };

  // Helper to generate current data as Code Block
  const generateCodeBlockText = () => {
    const cleanMatches = (arr: Match[]) => {
      return arr.map(m => {
        return `  {
    id: "${m.id}",
    date: "${m.date}",
    time: "${m.time}",
    team1: "${m.team1}",
    team2: "${m.team2}",
    stadium: "${m.stadium}",
    probHome: ${m.probHome},
    probDraw: ${m.probDraw},
    probAway: ${m.probAway}
  }`;
      }).join(",\n");
    };

    return `// Tabela de partidas da ${activeRound}ª Rodada
export const round${activeRound}Matches = [
${cleanMatches(matches)}
];`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateCodeBlockText());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
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
              MODO TESTE & GESTÃO DA PLATAFORMA
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center gap-1 bg-neutral-900 border border-neutral-700 hover:border-yellow-500 text-neutral-300 hover:text-yellow-400 px-2.5 py-1 text-[10px] font-bold uppercase transition-all cursor-pointer rounded"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showHelp ? "Ocultar Ajuda" : "Ajuda / Tutorial"}</span>
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1 bg-red-950/40 border border-red-800 hover:border-red-500 text-red-350 hover:text-red-100 px-2.5 py-1 text-[10px] font-bold uppercase transition-all cursor-pointer rounded"
            >
              <span>✖ Fechar Painel</span>
            </button>
          </div>
        </div>

        {/* Dynamic Help details */}
        {showHelp && (
          <div className="p-3 bg-neutral-900 border border-yellow-600/50 text-neutral-200 text-[11px] leading-relaxed rounded space-y-2">
            <p className="font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1">
              ✨ Guia de Gestão e Horários:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-300 pl-1">
              <li>
                <strong className="text-white">Adiamento de Jogos:</strong> Você pode ajustar a data e hora de qualquer uma das 38 rodadas do campeonato manualmente na tabela de edição abaixo. Os palpites de jogos editados se ajustarão imediatamente para aceitar ou travar o envio conforme o novo horário configurado!
              </li>
              <li>
                <strong className="text-white">Sincronização Globo Esporte:</strong> Clique no botão "Sincronizar com Globo Esporte" para fazer varreduras em tempo real na API oficial do <span className="text-yellow-400 font-bold">ge.globo.com</span>. Se houver falhas ou bloqueios no serviço oficial para rodadas específicas, um mecanismo de inteligência resiliente embutido garantirá dados fidedignos de partidas de forma automática.
              </li>
            </ul>
          </div>
        )}

        {/* Firebase Authentication & Cloud Database Monitor */}
        <div className="bg-neutral-900 border border-neutral-800 rounded p-3 space-y-3 font-sans text-neutral-200">
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
            <span className="font-mono font-black text-xs text-yellow-500 uppercase flex items-center gap-1.5">
              ☁️ Sincronização em Nuvem (Firebase Firestore)
            </span>
            <span className="text-[10px] font-mono font-bold bg-neutral-950 px-2 py-0.5 border border-neutral-800 rounded text-neutral-400">
              {isFirebaseLoading ? "⏳ Carregando..." : firebaseRoundsEmpty ? "⚠️ Banco Vazio" : "✅ Banco Ativo"}
            </span>
          </div>

          <div className="space-y-2.5">
            {currentUser ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs bg-neutral-950 p-2.5 border border-neutral-800/60 rounded">
                <div className="space-y-0.5 text-left">
                  <p className="text-[10px] text-neutral-400 font-mono">CONECTADO COMO:</p>
                  <p className="font-bold text-white max-w-[280px] truncate">{currentUser.email}</p>
                  <p className={`text-[10px] font-mono font-black ${isAdminLogged ? "text-green-400 animate-pulse" : "text-red-450"}`}>
                    {isAdminLogged ? "● ADMINISTRADOR GLOBAL (GRAVAÇÃO EM NUVEM ATIVA)" : "● MODO APENAS LEITURA (SEM ACESSO ADMIN)"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-neutral-500 font-mono font-bold text-[10px] uppercase py-1.5 px-3 rounded cursor-pointer shrink-0 transition-colors"
                >
                  Sair
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs bg-neutral-950 p-2.5 border border-neutral-800/60 rounded">
                <div className="text-left space-y-0.5 md:max-w-xs">
                  <p className="font-bold text-yellow-500 flex items-center gap-1 uppercase tracking-wide">
                    ⚠️ MODO LOCAL TEMPORÁRIO
                  </p>
                  <p className="text-[10px] text-neutral-400 leading-normal">
                    Você não está logado. Alterações e sincronizações do Globo Esporte afetarão apenas o seu navegador atual. Faça login com sua conta de administrador para salvar na nuvem para todos de forma automática.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onLoginWithGoogle}
                  className="bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-sans font-black text-[10px] uppercase py-2 px-4 rounded transition-all cursor-pointer shadow-[3px_3px_0px_#262626] border border-yellow-500 flex items-center justify-center gap-1.5 shrink-0"
                >
                  Entrar como Admin
                </button>
              </div>
            )}

            {/* Bootstrap Cloud Database triggers */}
            {isAdminLogged && (
              <div className="p-2.5 bg-yellow-500/5 border border-yellow-500/20 rounded flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 text-[11px] leading-relaxed">
                <div className="text-left">
                  <p className="font-bold text-amber-400 uppercase tracking-wide">🚀 Ações de Administrador na Nuvem:</p>
                  <p className="text-neutral-300 text-[10px] leading-normal mt-0.5">
                    Se você acabou de configurar o banco do zero ou quiser reinstalar a tabela completa com as 38 rodadas padrão no Firebase Firestore, clique no botão ao lado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onBootstrapFirebase}
                  className="w-full md:w-auto bg-neutral-950 hover:bg-neutral-900 text-yellow-400 hover:text-white border border-yellow-500/50 hover:border-yellow-500 py-1.5 px-3 font-mono text-[9px] font-black tracking-wider uppercase rounded transition-all cursor-pointer shrink-0"
                >
                  Provisionar / Resetar Firebase
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 0. SECTION: SMART COPIED TEXT SYNCHRONIZER */}
        <div className="bg-neutral-900 border border-yellow-500/30 rounded p-3 space-y-3">
          <button 
            type="button"
            onClick={() => setShowTextSync(!showTextSync)}
            className="flex items-center justify-between w-full text-left font-black tracking-wider uppercase text-[10px] text-yellow-500"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
              Sincronizar por Texto Copiado (WhatsApp, Globo Esporte, etc.)
            </span>
            {showTextSync ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
          </button>

          {showTextSync && (
            <div className="pt-2 border-t border-neutral-800/80 space-y-3 font-sans">
              <p className="text-[11px] text-neutral-300 leading-normal">
                Cole abaixo qualquer texto contendo confrontos da rodada selecionada (como notícias do GloboEsporte, tabelas do Excel ou listas de WhatsApp). O sistema identificará automaticamente os times, datas e horários, atualizando as travas do site no mesmo instante!
              </p>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400">
                  <span>📝 Cole o texto dos jogos aqui:</span>
                  <button
                    type="button"
                    onClick={loadRealExample}
                    className="text-yellow-500 hover:underline cursor-pointer font-bold uppercase py-0.5 px-1 bg-yellow-500/10 rounded border border-yellow-500/20 hover:bg-yellow-500/20 text-[9px]"
                  >
                    ✨ Carregar Exemplo Prático (GE)
                  </button>
                </div>
                <textarea
                  value={rawTextToSync}
                  onChange={(e) => setRawTextToSync(e.target.value)}
                  placeholder="Exemplo: Remo vs São Paulo - Domingo 31/05 às 20:30..."
                  rows={6}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-xs text-amber-200 font-mono focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncFromRawText}
                  className="bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-mono font-black py-2 px-4 rounded transition-all cursor-pointer flex items-center gap-1.5 text-xs uppercase border border-yellow-500"
                >
                  <RefreshCw className="w-4 h-4 animate-spin-slow" />
                  <span>Sincronizar dados por Texto</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRawTextToSync("");
                    setTextSyncResult(null);
                  }}
                  className="text-neutral-400 hover:text-white font-mono hover:bg-neutral-800 px-3 py-2 rounded text-xs transition-all cursor-pointer"
                >
                  Limpar
                </button>
              </div>

              {textSyncResult && (
                <div className={`p-3 rounded border text-xs font-mono space-y-2 ${textSyncResult.success ? 'bg-green-950/30 border-green-700/50 text-green-300' : 'bg-red-950/30 border-red-700/50 text-red-300'}`}>
                  <p className="font-bold uppercase tracking-wider">{textSyncResult.success ? "✅ SUCESSO!" : "❌ VERIFIQUE O TEXTO"}</p>
                  <p>{textSyncResult.message}</p>
                  {textSyncResult.logs.length > 0 && (
                    <div className="pt-2 border-t border-neutral-800 text-[10px] space-y-1 bg-black/40 p-2 rounded max-h-40 overflow-y-auto">
                      {textSyncResult.logs.map((log, lidx) => (
                        <p key={lidx} className="leading-snug">{log}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 1. SECTION: GLOBO ESPORTE AUTOMATED SYNC */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded p-3 space-y-3">
          <button 
            type="button"
            onClick={() => setShowGeSync(!showGeSync)}
            className="flex items-center justify-between w-full text-left font-black tracking-wider uppercase text-[10px] text-neutral-300 hover:text-white"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#24f469]" />
              Sincronização Direta Globo Esporte (GE) - Automatizado
            </span>
            {showGeSync ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
          </button>

          {showGeSync && (
            <div className="pt-2 border-t border-neutral-800/80 space-y-3 font-sans">
              <p className="text-[11px] text-neutral-300 leading-normal">
                Verifique e ajuste as datas de corte das rodadas. Essa função conecta-se diretamente à base oficial do <strong className="text-[#24f469]">ge.globo.com</strong> para redefinir fusos horários, adiamentos e transferências de estádio em tempo real.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSyncFromGE}
                  disabled={geSyncLoading || syncAllLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 text-neutral-950 font-black tracking-wider uppercase py-2 px-5 rounded transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono border border-emerald-500"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${geSyncLoading ? 'animate-spin' : ''}`} />
                  <span>{geSyncLoading ? "Sincronizando..." : `Sincronizar Rodada ${activeRound}`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncAllClick}
                  disabled={geSyncLoading || syncAllLoading}
                  className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-neutral-800 text-neutral-950 font-black tracking-wider uppercase py-2 px-5 rounded transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono border border-yellow-500"
                  title="Sincroniza automaticamente todas as rodadas da 19ª à 38ª salvando no Firestore se admin estiver logado"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncAllLoading ? 'animate-spin' : ''}`} />
                  <span>{syncAllLoading ? "Sincronizando Tudo..." : "Sincronizar Tudo (19ª à 38ª)"}</span>
                </button>

                <p className="text-[9px] text-neutral-400 font-mono">
                  *Conexão em canal direto e aberto. Sem necessidade de chaves ou tokens.
                </p>
              </div>

              {geSyncStatus && (
                <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded font-mono text-[10px] text-emerald-400 select-text whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                  {geSyncStatus}
                </div>
              )}

              {syncAllStatus && (
                <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded font-mono text-[10px] text-yellow-500 select-text whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                  <div className="font-bold text-white mb-1 uppercase tracking-widest text-[9px] border-b border-neutral-800 pb-1 flex items-center justify-between">
                    <span>📋 Console de Progresso - Sincronização em Lote</span>
                    {syncAllLoading && <span className="animate-pulse text-yellow-400">EXECUTANDO...</span>}
                  </div>
                  {syncAllStatus}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. SECTION: MANUAL OVERRIDES DETAILS */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded p-3 space-y-3">
          <button 
            type="button"
            onClick={() => setShowManualEditor(!showManualEditor)}
            className="flex items-center justify-between w-full text-left font-black tracking-wider uppercase text-[10px] text-neutral-300 hover:text-white"
          >
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-yellow-400" />
              Editar Horários Manualmente (Garante controle total em jogos adiados)
            </span>
            {showManualEditor ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
          </button>

          {showManualEditor && (
            <div className="pt-2 border-t border-neutral-800/80 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] text-neutral-400 italic">
                  Abaixo você pode mudar a data de um jogo específico (Ex: Remo x São Paulo) se ele for adiado.
                </p>
                <button
                  type="button"
                  onClick={onResetAllMatches}
                  className="text-red-400 hover:text-red-300 text-[10px] uppercase font-bold border border-red-800 hover:border-red-600 rounded bg-red-950/20 px-2 py-0.5 transition-all cursor-pointer"
                >
                  ⚠️ Redefinir Datas Originais
                </button>
              </div>

              {/* SELECTED ROUND COLLAPSIBLE LIST */}
              <div className="space-y-2">
                <span className="block font-black tracking-widest text-[#24f469] text-[10px] border-b border-green-950 pb-0.5 uppercase">
                  {activeRound}ª Rodada - Jogos Disponibilizados
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono">
                  {matches.map((m) => (
                    <MatchManualRow key={m.id} match={m} onUpdate={onUpdateMatchTime} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Retro Round Selector Slider & Dropdown Widget (Admin Portal Version - Positioned at bottom) */}
        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded flex flex-col sm:flex-row gap-3 items-center justify-between font-mono select-none">
          <button
            type="button"
            onClick={() => onChangeActiveRound(Math.max(1, activeRound - 1))}
            disabled={activeRound <= 1}
            className="w-full sm:w-auto p-1.5 px-3 bg-yellow-500 text-neutral-950 font-sans font-black text-[10px] tracking-wider uppercase hover:bg-yellow-400 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center justify-center gap-1 rounded"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Anterior</span>
          </button>
          
          <div className="flex flex-wrap items-center justify-center gap-2 font-mono font-black text-xs text-yellow-500">
            <span className="text-yellow-500 animate-pulse">⚡</span>
            <span className="text-white uppercase tracking-wider text-[10px]">GERENCIAR RODADA:</span>
            <select
              value={activeRound}
              onChange={(e) => onChangeActiveRound(Number(e.target.value))}
              className="bg-neutral-950 border border-yellow-500/40 text-amber-300 font-sans font-black focus:outline-none focus:border-yellow-500 cursor-pointer text-xs py-1 px-2.5 rounded text-center"
            >
              {Array.from({ length: 38 }, (_, idx) => (
                <option key={idx + 1} value={idx + 1} className="bg-neutral-950 text-amber-300 font-mono font-bold">
                  {idx + 1}ª Rodada {idx + 1 === 17 || idx + 1 === 18 ? "(Teste Inicial)" : "(CBF)"}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => onChangeActiveRound(Math.min(38, activeRound + 1))}
            disabled={activeRound >= 38}
            className="w-full sm:w-auto p-1.5 px-3 bg-yellow-500 text-neutral-950 font-sans font-black text-[10px] tracking-wider uppercase hover:bg-yellow-400 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center justify-center gap-1 rounded"
          >
            <span>Próxima</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Informative footer */}
        <div className="flex items-start gap-2 bg-neutral-950/40 p-2.5 border border-neutral-900 rounded-none">
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5 animate-pulse" />
          <p className="text-[9px] text-neutral-400 leading-tight">
            Seja mudando pelo texto ou pela API direta com o Globo Esporte, as travas de palpites abertos ou bloqueados de todo o site respondem e se adaptam imediatamente para todos os usuários.
          </p>
        </div>
      </div>
    </div>
  );
};

// Simple row for manual game datetime adjustments
interface MatchManualRowProps {
  match: Match;
  onUpdate: (matchId: string, newDate: string, newTime: string) => void;
}

const MatchManualRow: React.FC<MatchManualRowProps> = ({ match, onUpdate }) => {
  const [localDate, setLocalDate] = useState(match.date);
  const [localTime, setLocalTime] = useState(match.time);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setLocalDate(match.date);
    setLocalTime(match.time);
  }, [match]);

  const handleApply = () => {
    onUpdate(match.id, localDate, localTime);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="bg-neutral-950/80 p-2 border border-neutral-800 rounded flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
      <div className="truncate shrink-0 w-full sm:w-40 text-left">
        <span className="font-bold text-white block text-[10px] sm:text-xs">
          {match.team1} x {match.team2}
        </span>
        <span className="text-[8px] text-neutral-500 block">
          Std: {match.stadium.split(",")[0]}
        </span>
      </div>

      <div className="flex items-center gap-1 w-full justify-end">
        <input
          type="date"
          value={localDate}
          onChange={(e) => setLocalDate(e.target.value)}
          className="bg-neutral-900 text-amber-300 font-mono text-[10px] px-1.5 py-1 rounded w-24 shrink-0 focus:outline-none focus:border-yellow-600 border border-neutral-800 focus:ring-0 cursor-pointer"
        />
        <input
          type="text"
          value={localTime}
          onChange={(e) => setLocalTime(e.target.value)}
          placeholder="HH:MM"
          maxLength={5}
          className="bg-neutral-900 text-amber-300 font-mono text-[10px] px-1 py-1 rounded w-10 shrink-0 text-center focus:outline-none focus:border-yellow-600 border border-neutral-800 focus:ring-0"
        />

        <button
          type="button"
          onClick={handleApply}
          className={`px-2 py-1 text-[9px] uppercase font-bold font-mono transition-all duration-300 rounded cursor-pointer ${
            isSaved 
              ? "bg-green-600 text-white border border-green-500" 
              : "bg-yellow-500/10 hover:bg-yellow-500 hover:text-black text-yellow-400 border border-yellow-700 hover:border-yellow-500"
          }`}
          title="Salvar alteração para este jogo"
        >
          {isSaved ? "Salvo!" : "OK"}
        </button>
      </div>
    </div>
  );
};
