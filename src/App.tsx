import { useState, useEffect, useRef, FormEvent } from "react";
import { 
  RotateCcw, 
  Send, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  X, 
  AlertTriangle, 
  Clipboard, 
  FileCheck,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Info
} from "lucide-react";
import { brasileiraoMockData, round17Matches, round18Matches, getMatchesForRound } from "./data/mockSoccerData";
import { Match, UserPrediction, BetSlipSubmission } from "./types";
import { TrophyHeader } from "./components/TrophyHeader";
import { AdminPanel } from "./components/AdminPanel";
import { MatchRow } from "./components/MatchRow";
import { SecretModal } from "./components/SecretModal";
import { RecentSlips } from "./components/RecentSlips";

// Firebase Integration imports
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./lib/firebase";
import { 
  fetchAllRoundsFromFirestore, 
  saveRoundToFirestore, 
  checkIfUserIsAdmin, 
  bootstrapAdminEmail, 
  bootstrapRoundsToFirestore 
} from "./lib/firebaseStore";

// Default team emojis mappings for standard displays
const TEAM_EMOJIS: Record<string, string> = {
  "Flamengo": "🦅",
  "Palmeiras": "🐷",
  "Corinthians": "🦅",
  "São Paulo": "🇾🇪",
  "Atlético-MG": "🐔",
  "Cruzeiro": "🦊",
  "Grêmio": "🇪🇪",
  "Internacional": "🇦🇹",
  "Botafogo": "⭐️",
  "Fluminense": "🇮🇹",
  "Vasco da Gama": "⚓",
  "Santos": "🐳",
  "Bahia": "🔵",
  "Vitória": "🦁",
  "Athletico-PR": "🌪️",
  "Coritiba": "🟢",
  "Chapecoense": "🏹",
  "Remo": "⚓",
  "Mirassol": "🟡",
  "RB Bragantino": "🐂"
};

const sortMatchesChronologically = (matches: Match[]) => {
  return [...matches].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}:00-03:00`);
    const dateB = new Date(`${b.date}T${b.time}:00-03:00`);
    return dateA.getTime() - dateB.getTime();
  });
};

export default function App() {
  // Firebase configuration and load states
  const [firebaseLoading, setFirebaseLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdminLogged, setIsAdminLogged] = useState<boolean>(false);
  const [firebaseRoundsEmpty, setFirebaseRoundsEmpty] = useState<boolean>(false);

  // Estado das partidas para todas as 38 rodadas do Brasileirão 2026
  const [matchesState, setMatchesState] = useState<Record<number, Match[]>>(() => {
    const saved = localStorage.getItem("loto_matches_overrides_v3");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Object.keys(parsed).length > 0) {
          return parsed;
        }
      } catch { /* ignore */ }
    }
    const initialRounds: Record<number, Match[]> = {};
    for (let r = 1; r <= 38; r++) {
      initialRounds[r] = getMatchesForRound(r);
    }
    return initialRounds;
  });

  // Effect to load rounds dynamically from Firebase Firestore on Mount
  useEffect(() => {
    async function loadFirebaseData() {
      try {
        setFirebaseLoading(true);
        const cloudRounds = await fetchAllRoundsFromFirestore();
        if (cloudRounds) {
          // Check if cloudRounds needs correction (outdated dates or matchups)
          let needsForceUpdate = false;
          const r19 = cloudRounds[19];
          if (r19 && r19.length > 0) {
            const hasJuneDate = r19.some(m => m.date.includes("-06-"));
            const hasWrongTeam = r19[0]?.team1 !== "Fluminense" && r19[0]?.team1 !== "RB Bragantino" && r19[0]?.team2 !== "Fluminense" && r19[0]?.team2 !== "RB Bragantino";
            if (hasJuneDate || hasWrongTeam) {
              needsForceUpdate = true;
            }
          } else {
            needsForceUpdate = true;
          }

          if (needsForceUpdate) {
            console.log("Detectadas informações desatualizadas no banco para a 19ª Rodada. Corrigindo em memória...");
            for (let r = 17; r <= 38; r++) {
              cloudRounds[r] = getMatchesForRound(r);
            }
          }

          setMatchesState(cloudRounds);
          setFirebaseRoundsEmpty(false);
        } else {
          setFirebaseRoundsEmpty(true);
        }
      } catch (err) {
        console.error("Failed to load matches from Firebase:", err);
      } finally {
        setFirebaseLoading(false);
      }
    }
    loadFirebaseData();
  }, []);

  // Effect to handle Admin Authentication & Privilege Validation via Google OAuth popup
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Automatic bootstrapping for current developer email address
        if (user.email === "thiagomedeiros.info@gmail.com") {
          try {
            await bootstrapAdminEmail(user.uid, user.email);
          } catch (e) {
            console.error("Autobootstrap error:", e);
          }
        }
        const hasAdminAccess = await checkIfUserIsAdmin(user.uid);
        setIsAdminLogged(hasAdminAccess);
      } else {
        setCurrentUser(null);
        setIsAdminLogged(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Automatic database repair if Admin is logged in and there is a structural discrepancy
  useEffect(() => {
    if (isAdminLogged) {
      async function autoFixDatabase() {
        try {
          const cloudRounds = await fetchAllRoundsFromFirestore();
          if (cloudRounds) {
            const r19 = cloudRounds[19];
            let needsRepair = false;
            if (r19 && r19.length > 0) {
              const hasJuneDate = r19.some(m => m.date.includes("-06-"));
              const hasWrongTeam = r19[0]?.team1 !== "Fluminense" && r19[0]?.team1 !== "RB Bragantino" && r19[0]?.team2 !== "Fluminense" && r19[0]?.team2 !== "RB Bragantino";
              if (hasJuneDate || hasWrongTeam) {
                needsRepair = true;
              }
            } else {
              needsRepair = true;
            }

            if (needsRepair) {
              console.log("Admin detectado: Corrigindo e forçando dados de rodadas atualizados e cronologia correta no Firebase...");
              const repairedRounds: Record<number, Match[]> = { ...cloudRounds };
              for (let r = 1; r <= 38; r++) {
                repairedRounds[r] = getMatchesForRound(r);
              }
              await bootstrapRoundsToFirestore(repairedRounds);
              setMatchesState(repairedRounds);
              setFirebaseRoundsEmpty(false);
              console.log("Firebase Database corrigido com sucesso!");
            }
          }
        } catch (repairErr) {
          console.error("Failed to auto-repair Firestore database:", repairErr);
        }
      }
      autoFixDatabase();
    }
  }, [isAdminLogged]);

  const handleLoginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleBootstrapFirebase = async () => {
    try {
      setFirebaseLoading(true);
      await bootstrapRoundsToFirestore(matchesState);
      setFirebaseRoundsEmpty(false);
      alert("Sucesso: Tabela de 38 rodadas e confrontos gravada no Firebase!");
    } catch (err) {
      alert("Falha no provisionamento: " + err);
    } finally {
      setFirebaseLoading(false);
    }
  };

  const allMatchesCombined: Match[] = Object.values(matchesState).flat() as Match[];

  // Loaded state setup
  const [fullName, setFullName] = useState<string>(() => {
    return localStorage.getItem("loto_latest_name") || "";
  });

  // Estado para a rodada selecionada no visual de tickets (Padrão: 17ª Rodada)
  const [selectedRound, setSelectedRound] = useState<number>(() => {
    const saved = localStorage.getItem("loto_selected_round");
    if (saved) {
      const num = parseInt(saved, 10);
      if (num >= 1 && num <= 38) return num;
    }
    return 17; // Começa na 17ª Rodada por padrão
  });

  useEffect(() => {
    localStorage.setItem("loto_selected_round", selectedRound.toString());
  }, [selectedRound]);

  const [predictions, setPredictions] = useState<UserPrediction[]>(() => {
    let basePreds: UserPrediction[] = [];
    const savedDraft = localStorage.getItem("loto_predictions_draft");
    if (savedDraft) {
      try { basePreds = JSON.parse(savedDraft); } catch { /* ignore */ }
    }
    if (!basePreds || basePreds.length === 0) {
      try {
        const list = localStorage.getItem("loto_betslips");
        if (list) {
          const parsed = JSON.parse(list);
          if (parsed && parsed.length > 0) {
            basePreds = parsed[0].predictions;
          }
        }
      } catch { /* ignore */ }
    }

    // Determine current simulation values at initialization
    const initSimulatedActive = localStorage.getItem("loto_sim_active") === "true";
    const initSimulatedTimeStr = localStorage.getItem("loto_simulated_time");
    let initCurrentActiveTime = new Date();
    if (initSimulatedActive && initSimulatedTimeStr) {
      try {
        initCurrentActiveTime = new Date(`${initSimulatedTimeStr}:00-03:00`);
      } catch { /* ignore */ }
    }

    // Inicializa palpites para todos os 380 confrontos, preservando palpites salvos
    return allMatchesCombined.map(m => {
      const foundSaved = basePreds.find(p => p.matchId === m.id);
      return {
        matchId: m.id,
        score1: foundSaved ? foundSaved.score1 : "",
        score2: foundSaved ? foundSaved.score2 : ""
      };
    });
  });

  // Administrative / Simulator panel states
  const [showSimulator, setShowSimulator] = useState<boolean>(() => {
    return localStorage.getItem("loto_debug_active") === "true";
  });

  // Time reference states (Standard timezone calculation BRT)
  const [realTime, setRealTime] = useState<Date>(new Date());
  
  // Custom simulated datetime-local string (Brasília Time input format)
  const [simulatedTimeStr, setSimulatedTimeStr] = useState<string>(() => {
    const defaultSim = localStorage.getItem("loto_simulated_time");
    if (defaultSim) return defaultSim;
    
    // Default current BRT string
    const now = new Date();
    const brOffsetTimestamp = now.getTime() - (3 * 60 * 60 * 1000);
    return new Date(brOffsetTimestamp).toISOString().slice(0, 16);
  });

  const [simulatedActive, setSimulatedActive] = useState<boolean>(() => {
    return localStorage.getItem("loto_sim_active") === "true";
  });

  // Click counters state
  const [trophyClicks, setTrophyClicks] = useState<number>(0);
  const [cleanClicks, setCleanClicks] = useState<number>(0);
  const [showSurpresinhaModal, setShowSurpresinhaModal] = useState<boolean>(false);
  const [ufmgStatsVisible, setUfmgStatsVisible] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Custom password prompt state
  const [passwordModalOpen, setPasswordModalOpen] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Submitted slips tracking
  const [recentSlips, setRecentSlips] = useState<BetSlipSubmission[]>(() => {
    const list = localStorage.getItem("loto_betslips");
    if (list) {
      try { return JSON.parse(list); } catch { return []; }
    }
    return [];
  });

  // Compiled message cache
  const [whatsAppTextReady, setWhatsAppTextReady] = useState<string>("");
  
  // Custom local state warnings
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  // Background clock ticker (standard 1s interval)
  useEffect(() => {
    const timer = setInterval(() => {
      setRealTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync draft guesses to avoid losing user selections
  useEffect(() => {
    localStorage.setItem("loto_predictions_draft", JSON.stringify(predictions));
  }, [predictions]);

  // Sync latest name
  useEffect(() => {
    localStorage.setItem("loto_latest_name", fullName);
  }, [fullName]);

  // Active date compute logic
  const getActiveCurrentTime = (): Date => {
    if (simulatedActive) {
      try {
        // Parse simulatedTimeStr as Brasília time (-03:00)
        return new Date(`${simulatedTimeStr}:00-03:00`);
      } catch {
        return realTime;
      }
    }
    return realTime;
  };

  const currentActiveTime = getActiveCurrentTime();

  // Computa a rodada ativa dinamicamente baseado nos jogos que já aconteceram (2h de duração)
  const computeDynamicActiveRound = (): number => {
    for (let r = 1; r <= 38; r++) {
      const rMatches = matchesState[r] || [];
      if (rMatches.length === 0) continue;
      
      const isAllCompleted = rMatches.every(m => {
        const kickoff = new Date(`${m.date}T${m.time}:00-03:00`);
        const completedTime = kickoff.getTime() + (2 * 60 * 60 * 1000); // 2 horas de jogo
        return currentActiveTime.getTime() >= completedTime;
      });
      
      if (!isAllCompleted) {
        return r;
      }
    }
    return 38; // Default para a última rodada se tudo acabou
  };

  const dynamicActiveRound = computeDynamicActiveRound();
  
  // Se o painel de administrador/simulador estiver aberto, foca na rodada selecionada pelo admin.
  // Caso contrário, foca estritamente na rodada ativa calculada.
  const viewedRound = showSimulator ? selectedRound : dynamicActiveRound;

  // Find next upcoming match kickoff (for countdown display)
  const getNextKickoffDistance = () => {
    let nextMatch: Match | null = null;
    let minTimeDiff = Infinity;

    allMatchesCombined.forEach(m => {
      const kickoff = new Date(`${m.date}T${m.time}:00-03:00`);
      const diff = kickoff.getTime() - currentActiveTime.getTime();
      if (diff > 0 && diff < minTimeDiff) {
        minTimeDiff = diff;
        nextMatch = m;
      }
    });

    return { nextMatch, timeLeftMs: minTimeDiff };
  };

  const formatCountdown = (ms: number) => {
    if (ms === Infinity || isNaN(ms)) return "";
    
    const totalSecs = Math.floor(ms / 1000);
    const days = Math.floor(totalSecs / (3600 * 24));
    const hours = Math.floor((totalSecs % (3600 * 24)) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    
    return parts.join(" ");
  };

  const { nextMatch, timeLeftMs } = getNextKickoffDistance();
  const nextMatchCountdown = timeLeftMs !== Infinity ? formatCountdown(timeLeftMs) : "";
  const nextMatchLabel = nextMatch ? `${nextMatch.team1} x ${nextMatch.team2}` : "";

  // Format current BRT timestamp
  const formatTimeToShow = (d: Date): string => {
    return d.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  // Check state of each match based on Active Date
  const getMatchLockStatus = (match: Match): { isLocked: boolean; kickoff: Date } => {
    const kickoff = new Date(`${match.date}T${match.time}:00-03:00`);
    const isLocked = currentActiveTime.getTime() >= kickoff.getTime();
    return { isLocked, kickoff };
  };

  const isMatchStarted = (match: Match): boolean => {
    return getMatchLockStatus(match).isLocked;
  };

  // Determine current active main matches and round name
  const activeRoundMatches = sortMatchesChronologically(
    matchesState[viewedRound] || []
  );
  const activeRoundName = `${viewedRound}ª Rodada`;

  // Próxima rodada (se houver) para visualização opcional
  // Regra de negócio: as prévias de confrontos da próxima rodada vão aparecendo
  // conforme os jogos da rodada atual vão iniciando e fechando os palpites
  const startedCurrentRoundTeams = new Set<string>();
  const currentRoundMatches = matchesState[viewedRound] || [];
  currentRoundMatches.forEach(m => {
    if (isMatchStarted(m)) {
      startedCurrentRoundTeams.add(m.team1);
      startedCurrentRoundTeams.add(m.team2);
    }
  });

  const previewMatches = viewedRound < 38
    ? sortMatchesChronologically(matchesState[viewedRound + 1] || []).filter(m =>
        startedCurrentRoundTeams.has(m.team1) || startedCurrentRoundTeams.has(m.team2)
      )
    : [];

  // Deterministic Checksum generator (Módulo 6)
  const getDeterministicChecksum = (name: string, preds: UserPrediction[]): string => {
    const normalizedName = (name || "ANONIMO").trim().toUpperCase();
    const serializedGuesses = preds
      .map(p => `${p.matchId}:${p.score1 || "X"}-${p.score2 || "X"}`)
      .join("|");
    const combinedStr = `${normalizedName}_${serializedGuesses}`;

    // Polynomial rolling hash
    let hash1 = 5381;
    let hash2 = 17;
    for (let i = 0; i < combinedStr.length; i++) {
      const char = combinedStr.charCodeAt(i);
      hash1 = (hash1 * 33) ^ char;
      hash2 = (hash2 << 5) - hash2 + char;
      hash1 |= 0;
      hash2 |= 0;
    }

    const absHash1 = Math.abs(hash1);
    const absHash2 = Math.abs(hash2);

    const part1 = absHash1.toString(16).toUpperCase().padStart(4, "0").slice(-4);
    const part2 = absHash2.toString(16).toUpperCase().padStart(4, "0").slice(-4);

    return `BRASIL-${part1}-${part2}`;
  };

  const activeTicketCode = getDeterministicChecksum(fullName, predictions);

  // Generate CSS simulated barcode lines based on ticket hash code
  const getBarcodeBars = (code: string) => {
    const bars: { width: number; space: number }[] = [];
    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      // Generate deterministic sizes (1-4px)
      const w1 = (charCode % 4) + 1;
      const s1 = ((charCode >> 1) % 2) + 1;
      const w2 = ((charCode >> 2) % 3) + 1;
      const s2 = 1.5;
      
      bars.push({ width: w1, space: s1 });
      bars.push({ width: w2, space: s2 });
    }
    return bars;
  };

  const barcodeBars = getBarcodeBars(activeTicketCode);

  // Prediction changes
  const handlePredictionChange = (matchId: string, score1: string, score2: string) => {
    setPredictions(prev => prev.map(p => {
      if (p.matchId === matchId) {
        return { ...p, score1, score2 };
      }
      return p;
    }));
    // Reset consecutive clean clicks on active action type
    setCleanClicks(0);
    setValidationWarning(null);
  };

  // Secret simulation trigger on clicks to Trophy
  const handleTrophyClick = () => {
    // Se o simulador/painel de gestão já estiver ativo, um clique único no troféu desliga ele de forma simples
    if (showSimulator) {
      setShowSimulator(false);
      setSimulatedActive(false);
      localStorage.removeItem("loto_debug_active");
      localStorage.removeItem("loto_sim_active");
      localStorage.removeItem("loto_simulated_time");
      setTrophyClicks(0);
      return;
    }

    const nextClicks = trophyClicks + 1;
    if (nextClicks === 10) {
      setPasswordModalOpen(true);
      setPasswordInput("");
      setPasswordError(null);
      setTrophyClicks(10); // stay locked inside active debug state
    } else {
      setTrophyClicks(nextClicks);
    }
  };

  const handlePasswordSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (passwordInput === "142536") {
      setShowSimulator(true);
      localStorage.setItem("loto_debug_active", "true");
      setPasswordModalOpen(false);
    } else {
      setPasswordError("Senha incorreta! Verifique os dígitos.");
    }
  };

  const handleCancelPassword = () => {
    setPasswordModalOpen(false);
    setTrophyClicks(0);
  };

  // Administrative Preset click handlers
  const handleQuickTravel = (preset: "before" | "mid" | "after" | "real") => {
    if (preset === "real") {
      setSimulatedActive(false);
      localStorage.removeItem("loto_sim_active");
      localStorage.removeItem("loto_simulated_time");
    } else {
      let targetIso = "";
      if (preset === "before") {
        targetIso = "2026-05-10T12:00"; // Way before matches
      } else if (preset === "mid") {
        targetIso = "2026-05-21T18:00"; // Some matches in past, some in future
      } else if (preset === "after") {
        targetIso = "2026-06-16T15:00"; // All matches played (including June matches)
      }
      setSimulatedTimeStr(targetIso);
      setSimulatedActive(true);
      localStorage.setItem("loto_sim_active", "true");
      localStorage.setItem("loto_simulated_time", targetIso);
    }
  };

  const handleCustomTimeChange = (val: string) => {
    setSimulatedTimeStr(val);
    setSimulatedActive(true);
    localStorage.setItem("loto_sim_active", "true");
    localStorage.setItem("loto_simulated_time", val);
  };

  // Upgraded dynamic matches management handlers with Cloud Firestore persistence support
  const handleUpdateMatchTime = async (matchId: string, newDate: string, newTime: string) => {
    const updated = { ...matchesState };
    let affectedRoundNum = -1;
    // Encontra e atualiza a partida correspondente em qualquer rodada
    for (let r = 1; r <= 38; r++) {
      if (updated[r]) {
        const found = updated[r].some(m => m.id === matchId);
        if (found) {
          updated[r] = updated[r].map(m => m.id === matchId ? { ...m, date: newDate, time: newTime } : m);
          affectedRoundNum = r;
        }
      }
    }
    setMatchesState(updated);
    localStorage.setItem("loto_matches_overrides_v3", JSON.stringify(updated));

    // Persist modification on Firebase if administrator is currently connected
    if (isAdminLogged && affectedRoundNum !== -1) {
      try {
        await saveRoundToFirestore(affectedRoundNum, updated[affectedRoundNum]);
      } catch (err) {
        console.error("Failed to write manual schedule modification to Firebase:", err);
      }
    }
  };

  const handleResetAllMatches = async () => {
    localStorage.removeItem("loto_matches_overrides_v3");
    const initialRounds: Record<number, Match[]> = {};
    for (let r = 1; r <= 38; r++) {
      initialRounds[r] = getMatchesForRound(r);
    }
    setMatchesState(initialRounds);

    if (isAdminLogged) {
      try {
        await bootstrapRoundsToFirestore(initialRounds);
        setFirebaseRoundsEmpty(false);
      } catch (err) {
        console.error("Failed to reset all matches in Firebase:", err);
      }
    }
  };

  const handleSyncAPI = async (roundNum: number, syncedMatches: Match[]) => {
    const updated = {
      ...matchesState,
      [roundNum]: syncedMatches
    };
    setMatchesState(updated);
    localStorage.setItem("loto_matches_overrides_v3", JSON.stringify(updated));

    if (isAdminLogged) {
      try {
        await saveRoundToFirestore(roundNum, syncedMatches);
        setFirebaseRoundsEmpty(false);
      } catch (err) {
        console.error("Failed to save synchronized matches to Firebase:", err);
      }
    }
  };

  // Módulo 5: Clear Form + Surpresinha logic
  const handleClearSlip = () => {
    const nextCleans = cleanClicks + 1;
    
    // Clear scores only for OPEN/unstarted matches
    setPredictions(prev => prev.map(p => {
      const match = allMatchesCombined.find(m => m.id === p.matchId);
      if (match) {
        const { isLocked } = getMatchLockStatus(match);
        if (!isLocked) {
          return { ...p, score1: "", score2: "" };
        }
      }
      return p;
    }));

    setValidationWarning(null);
    setUfmgStatsVisible(false); // Hide statistics and return to normal

    if (nextCleans >= 10) {
      setShowSurpresinhaModal(true);
      setCleanClicks(0);
    } else {
      setCleanClicks(nextCleans);
    }
  };

  // Surpresinha solver (Probabilidades UFMG logic from https://www.mat.ufmg.br/futebol/tabela-da-proxima-rodada_seriea/)
  const drawSingleScoreHelper = (match: Match): { s1: string; s2: string } => {
    // Default probabilities if undefined (generic values)
    const pH = match.probHome !== undefined ? match.probHome : 45;
    const pD = match.probDraw !== undefined ? match.probDraw : 28;
    const pA = match.probAway !== undefined ? match.probAway : 27;

    const total = pH + pD + pA;
    const r = Math.random() * total;

    if (r < pH) {
      // Home Win (Vitória do Mandante)
      // Pick common scores for home wins: (1-0, 2-1, 2-0, 3-1, 3-2, 3-0, 4-1, 4-0) weighted
      const homeScores = [[1, 0], [1, 0], [2, 1], [2, 1], [2, 0], [3, 1], [3, 2], [3, 0], [4, 1]];
      const score = homeScores[Math.floor(Math.random() * homeScores.length)];
      return { s1: score[0].toString(), s2: score[1].toString() };
    } else if (r < pH + pD) {
      // Draw (Empate)
      // Pick common draw scores: (1-1, 0-0, 2-2, 3-3) weighted
      const drawScores = [[1, 1], [1, 1], [0, 0], [2, 2], [3, 3]];
      const score = drawScores[Math.floor(Math.random() * drawScores.length)];
      return { s1: score[0].toString(), s2: score[1].toString() };
    } else {
      // Away Win (Vitória do Visitante)
      // Pick common away scorelines: (0-1, 1-2, 0-2, 1-3, 2-3, 0-3, 1-4) weighted
      const awayScores = [[0, 1], [0, 1], [1, 2], [1, 2], [0, 2], [1, 3], [2, 3], [0, 3]];
      const score = awayScores[Math.floor(Math.random() * awayScores.length)];
      return { s1: score[0].toString(), s2: score[1].toString() };
    }
  };

  const handleApplySurpresinha = () => {
    // Fill all UNLOCKED fields
    setPredictions(prev => prev.map(p => {
      const match = allMatchesCombined.find(m => m.id === p.matchId);
      if (match) {
        const { isLocked } = getMatchLockStatus(match);
        if (!isLocked) {
          const smartDraw = drawSingleScoreHelper(match);
          return { ...p, score1: smartDraw.s1, score2: smartDraw.s2 };
        }
      }
      return p;
    }));

    setUfmgStatsVisible(true);
    setShowSurpresinhaModal(false);
    setCleanClicks(0);
  };

  // Manual Trigger for Surpresinha inside warning panel
  const handleQuickSurpresinhaFill = () => {
    // Fill only empty fields that are completely unlocked
    setPredictions(prev => prev.map(p => {
      const match = allMatchesCombined.find(m => m.id === p.matchId);
      if (match) {
        const { isLocked } = getMatchLockStatus(match);
        if (!isLocked && (p.score1 === "" || p.score2 === "")) {
          const smartDraw = drawSingleScoreHelper(match);
          return { ...p, score1: smartDraw.s1, score2: smartDraw.s2 };
        }
      }
      return p;
    }));
    setValidationWarning(null);
    setUfmgStatsVisible(true);
  };

  // Submit / Generate Slip
  const handleGenerateAndSubmit = () => {
    // 1. Check for player's name
    if (!fullName.trim()) {
      setValidationWarning("Por favor, preencha o seu nome usado nos palpiteiros para enviar os seus palpites.");
      // Scroll to name field
      const nameInput = document.getElementById("name-input-field");
      nameInput?.scrollIntoView({ behavior: "smooth" });
      nameInput?.focus();
      return;
    }

    // 2. Count empty slots on unstarted matches (active round only - optional preview matches excluded!)
    const unfilledCount = predictions.filter(p => {
      const match = activeRoundMatches.find(m => m.id === p.matchId);
      if (!match) return false;
      const { isLocked } = getMatchLockStatus(match);
      return !isLocked && (p.score1 === "" || p.score2 === "");
    }).length;

    if (unfilledCount > 0) {
      setValidationWarning(
        `Atenção: Você possui ${unfilledCount} palpite(s) em branco para jogos abertos. Deseja enviar assim mesmo ou usar nossa Surpresinha Inteligente?`
      );
      return;
    }

    // Execute submission
    executeFinalSubmission();
  };

  const executeFinalSubmission = () => {
    setValidationWarning(null);
    const code = activeTicketCode;
    const nowIso = new Date().toISOString();

    const submission: BetSlipSubmission = {
      fullName: fullName.trim(),
      predictions: [...predictions],
      submittedAt: nowIso,
      ticketCode: code
    };

    // Save in memory/recents state list without duplicates
    // Maintain only the latest 3 predictions in history
    const updatedHistory = [submission, ...recentSlips.filter(s => s.ticketCode !== code)].slice(0, 3);
    setRecentSlips(updatedHistory);
    localStorage.setItem("loto_betslips", JSON.stringify(updatedHistory));

    // Compile WhatsApp string
    const whatsappMsgText = generateWhatsAppMessageString(submission);
    setWhatsAppTextReady(whatsappMsgText);

    // Direct WhatsApp redirection
    const link = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMsgText)}`;
    window.open(link, "_blank", "noopener,noreferrer");
  };

  // Generate complete precise message string
  const generateWhatsAppMessageString = (sub: BetSlipSubmission): string => {
    const formatMatchDateForWhatsApp = (dateStr: string): string => {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
      return dateStr;
    };

    let msg = `------------------------------------------\n`;
    msg += `⚽ *PALPITE BRASILEIRÃO 2026* ⚽\n`;
    msg += `📅 *Rodada:* ${activeRoundName}\n`;
    msg += `👤 *Palpite de:* ${sub.fullName.toUpperCase()}\n`;
    msg += `------------------------------------------\n`;

    const lockedMatches: { match: typeof activeRoundMatches[0]; idx: number }[] = [];
    const openMatches: { match: typeof activeRoundMatches[0]; idx: number }[] = [];

    activeRoundMatches.forEach((match, idx) => {
      const { isLocked } = getMatchLockStatus(match);
      if (isLocked) {
        lockedMatches.push({ match, idx });
      } else {
        openMatches.push({ match, idx });
      }
    });

    lockedMatches.forEach(({ match, idx }) => {
      const dt = formatMatchDateForWhatsApp(match.date);
      msg += `🔹${String(idx + 1).padStart(2, '0')} • ${match.team1} (🚫Fechado) ${match.team2} • ${dt} ${match.time}h\n`;
    });

    if (lockedMatches.length > 0 && openMatches.length > 0) {
      msg += `------------------------------------------\n`;
    }

    openMatches.forEach(({ match, idx }) => {
      const scoreData = sub.predictions.find(p => p.matchId === match.id);
      const s1 = scoreData?.score1 !== "" ? scoreData?.score1 : "-";
      const s2 = scoreData?.score2 !== "" ? scoreData?.score2 : "-";
      const dt = formatMatchDateForWhatsApp(match.date);
      msg += `🔹${String(idx + 1).padStart(2, '0')} • ${match.team1} *${s1}* x *${s2}* ${match.team2} • ${dt} ${match.time}h\n`;
    });

    if (previewMatches.length > 0) {
      const filledPreviews = previewMatches.filter(m => {
         const pred = sub.predictions.find(p => p.matchId === m.id);
         return pred && (pred.score1 !== "" || pred.score2 !== "");
      });

      if (filledPreviews.length > 0) {
        msg += `------------------------------------------\n`;
        msg += `🔮 *PRÉVIAS DA PRÓXIMA RODADA (OPCIONAIS)*\n`;
        msg += `------------------------------------------\n`;
        filledPreviews.forEach((match) => {
          const pred = sub.predictions.find(p => p.matchId === match.id);
          const s1 = pred?.score1 !== "" ? pred?.score1 : "-";
          const s2 = pred?.score2 !== "" ? pred?.score2 : "-";
          const dt = formatMatchDateForWhatsApp(match.date);
          msg += `🔹 ${match.team1} *${s1}* x *${s2}* ${match.team2} • ${dt} ${match.time}h\n`;
        });
      }
    }

    msg += `------------------------------------------\n`;
    msg += `🗝️ *Código de Segurança:* ${sub.ticketCode}\n`;

    return msg;
  };

  // Copy details action
  const handleCopyText = () => {
    if (whatsAppTextReady) {
      navigator.clipboard.writeText(whatsAppTextReady);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    }
  };

  // History list actions
  const handleDeleteSlip = (code: string) => {
    const updated = recentSlips.filter(s => s.ticketCode !== code);
    setRecentSlips(updated);
    localStorage.setItem("loto_betslips", JSON.stringify(updated));
  };

  const handleRestoreSlip = (slip: BetSlipSubmission) => {
    // Load player name and predictions back for adjustments
    setFullName(slip.fullName);
    setPredictions(slip.predictions);
    setValidationWarning(null);
    
    // Scroll smoothly to upper card
    document.getElementById("retro-paper-slip")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleShareWhatsAppAgain = (slip: BetSlipSubmission) => {
    const text = generateWhatsAppMessageString(slip);
    const link = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(link, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-taca-brasileirao text-neutral-900 py-6 px-4 md:py-10 select-none flex flex-col items-center justify-start relative">
      {/* Visual field outline decoration */}
      <div className="absolute inset-x-0 top-0 h-4 bg-green-900/30 border-b border-white/5 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-4 bg-green-900/30 border-t border-white/5 pointer-events-none" />

      {/* Main Single-View Layout Container */}
      <div className="w-full max-w-xl mx-auto space-y-6 relative z-10">
        
        {/* Admin Secret simulation bar */}
        {showSimulator && (
          <AdminPanel
            activeRound={selectedRound}
            matches={sortMatchesChronologically(matchesState[selectedRound] || [])}
            onUpdateMatchTime={handleUpdateMatchTime}
            onResetAllMatches={handleResetAllMatches}
            onSyncAPI={handleSyncAPI}
            onChangeActiveRound={setSelectedRound}
            onClose={() => {
              setShowSimulator(false);
              setSimulatedActive(false);
              localStorage.removeItem("loto_debug_active");
              localStorage.removeItem("loto_sim_active");
              localStorage.removeItem("loto_simulated_time");
              setTrophyClicks(0);
            }}
            
            currentUser={currentUser}
            isAdminLogged={isAdminLogged}
            firebaseRoundsEmpty={firebaseRoundsEmpty}
            onLoginWithGoogle={handleLoginWithGoogle}
            onLogout={handleLogout}
            onBootstrapFirebase={handleBootstrapFirebase}
            isFirebaseLoading={firebaseLoading}
          />
        )}

        {/* Vintage Physical Ticket Body Segment */}
        <div 
          id="retro-paper-slip"
          className="relative bg-[#faf6eb] border-2 md:border-4 border-neutral-900 rounded shadow-[8px_8px_0px_#091b10] ticket-picote-top ticket-picote-bottom pt-6 pb-6"
        >
          {/* Outer retro security stamp watermark decorations */}
          <div className="absolute left-2 top-10 w-10 text-[9px] font-mono font-bold text-neutral-400 -rotate-90 select-none pointer-events-none opacity-40">
            L-BRASIL 1982
          </div>
          
          <div className="absolute right-2 top-10 w-10 text-[9px] font-mono font-bold text-neutral-400 rotate-90 select-none pointer-events-none opacity-40 text-right">
            N-38914-CA
          </div>

          {/* Core Ticket Header */}
          <TrophyHeader
            onTrophyClick={handleTrophyClick}
            clickCount={trophyClicks}
            simulatedTimeActive={simulatedActive}
            formattedTime={formatTimeToShow(currentActiveTime)}
            nextMatchCountdown={nextMatchCountdown}
            nextMatchLabel={nextMatchLabel}
            activeRoundName={activeRoundName}
          />

          {/* Main User Workspace Area */}
          <div className="p-4 space-y-5">
            
            {/* Name input block - Geometric Balance Input Field */}
            <div className="space-y-1.5 bg-[#f2ede4] p-4 border-2 border-neutral-900 rounded-none select-none">
              <label 
                htmlFor="name-input-field"
                className="block text-[10px] sm:text-xs font-mono font-black text-neutral-800 tracking-wider uppercase"
              >
                👤 NOME USADO NOS PALPITEIROS:
              </label>
              <input
                type="text"
                id="name-input-field"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setValidationWarning(null);
                }}
                maxLength={40}
                placeholder="NOME USADO NOS PALPITEIROS..."
                className="w-full bg-white border-2 border-neutral-900 rounded-none px-3 py-2.5 text-xs font-mono font-black tracking-wide uppercase text-neutral-900 placeholder-neutral-400 focus:bg-amber-50/50 focus:ring-0 focus:outline-none transition-all shadow-[3px_3px_0px_#171717]"
              />
            </div>

            {/* Match Listings - Geometric Balance Structured Form */}
            <div className="space-y-4">
              <div id="matches-slip-container" className="border-2 border-neutral-900 bg-white/60 divide-y divide-neutral-200 overflow-hidden">
                {activeRoundMatches.map((match, idx) => {
                  const { isLocked, kickoff } = getMatchLockStatus(match);
                  const pred = predictions.find(p => p.matchId === match.id);
                  
                  return (
                    <MatchRow
                      key={match.id}
                      match={match}
                      index={idx}
                      prediction={pred}
                      onPredictionChange={handlePredictionChange}
                      isLocked={isLocked}
                      kickoffDate={kickoff}
                      showUfmgStats={ufmgStatsVisible}
                    />
                  );
                })}
              </div>

              {/* Dynamic Optional next round preview section if we are in Round 17 and any games have started */}
              {previewMatches.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t-2 border-dashed border-neutral-400"></div>
                    <span className="flex-shrink mx-3 text-[10px] font-mono font-black text-[#143e24] bg-[#faf6eb] px-2 tracking-wider uppercase border border-neutral-300 py-0.5 rounded">
                      🔮 PRÉVIA DA PRÓXIMA RODADA (OPCIONAL)
                    </span>
                    <div className="flex-grow border-t-2 border-dashed border-neutral-400"></div>
                  </div>
                  
                  <p className="text-[10px] font-mono text-neutral-600 text-center leading-relaxed px-2">
                    Como os times já iniciaram suas partidas nesta rodada, você pode antecipar seus palpites para a rodada seguinte! (Opcional)
                  </p>

                  <div id="preview-matches-slip-container" className="border-2 border-neutral-900 bg-[#fbf9f4] divide-y divide-neutral-200 overflow-hidden">
                    {previewMatches.map((match, idx) => {
                      const { isLocked, kickoff } = getMatchLockStatus(match);
                      const pred = predictions.find(p => p.matchId === match.id);
                      
                      return (
                        <MatchRow
                          key={match.id}
                          match={match}
                          index={idx}
                          prediction={pred}
                          onPredictionChange={handlePredictionChange}
                          isLocked={isLocked}
                          kickoffDate={kickoff}
                          showUfmgStats={ufmgStatsVisible}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Validation & Incomplete Alerts */}
            {validationWarning && (
              <div className="p-3 bg-yellow-50 text-neutral-900 border-2 border-yellow-500 rounded space-y-2 font-mono text-xs shadow-inner">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                  <p className="font-bold">{validationWarning}</p>
                </div>
                
                {validationWarning.includes("em branco") && (
                  <div className="flex flex-wrap gap-2 pt-1.5 border-t border-dashed border-yellow-300">
                    <button
                      onClick={handleQuickSurpresinhaFill}
                      className="bg-yellow-500 hover:bg-yellow-650 hover:scale-[1.01] active:translate-y-0.5 text-neutral-950 font-sans font-bold text-[10px] uppercase py-1 px-2.5 border border-neutral-900 rounded transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3 h-3 text-neutral-950" />
                      Auto-completar vazios
                    </button>
                    
                    <button
                      onClick={executeFinalSubmission}
                      className="bg-neutral-800 hover:bg-neutral-900 hover:scale-[1.01] active:translate-y-0.5 text-white font-sans font-bold text-[10px] uppercase py-1 px-2.5 border border-neutral-900 rounded transition-all cursor-pointer"
                    >
                      Enviar com brancos ➔
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons (Surpresinha & Cleaner) - Geometric Balance flat layout */}
            <div className="flex gap-3 justify-between items-center pt-2 select-none">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearSlip}
                  id="btn-clear-slip"
                  className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2.5 border-2 border-neutral-900 shadow-[2px_2px_0px_#000000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] cursor-pointer transition-all flex items-center gap-1.5"
                  title="Limpar campos livres"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-sans font-black uppercase tracking-widest">Limpar Volante</span>
                </button>
              </div>

              {/* Instant access info */}
              <div className="hidden md:flex items-center gap-1 text-[10px] font-mono text-neutral-500 font-bold">
                <Info className="w-3.5 h-3.5 text-neutral-400" />
                <span>Os palpites salvam sozinhos ao digitar</span>
              </div>
            </div>

            {/* Submission Main CTA block */}
            <div className="border-t-2 border-dashed border-neutral-400 pt-4 mt-2">
              <button
                onClick={handleGenerateAndSubmit}
                id="btn-main-submit"
                className="w-full bg-[#143e24] hover:bg-[#143e24]/90 text-amber-300 font-sans font-black text-sm tracking-widest py-3.5 rounded-none border-2 border-neutral-900 shadow-[5px_5px_0px_#000000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000000] cursor-pointer transition-all uppercase flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Enviar palpite para o grupo</span>
              </button>
            </div>

            {/* Footer & Security - Symmetrical Geometric Balance Signatures */}
            <div className="border-t-2 border-dashed border-neutral-900 pt-5 mt-4">
              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 mb-4 select-none">
                <div className="flex flex-col text-center sm:text-left">
                  <span className="text-[10px] font-mono uppercase font-bold text-neutral-400">Assinatura Eletrônica</span>
                  <span className="text-lg md:text-xl font-black font-mono text-neutral-900 tracking-wide select-all">
                    {activeTicketCode}
                  </span>
                </div>
                
                <div className="flex flex-col items-center sm:items-end">
                  <span className="text-[10px] font-mono uppercase font-bold text-neutral-400 mb-1">Código de Autenticidade</span>
                  <div className="flex items-end justify-center h-8 bg-white p-1 border border-neutral-900 rounded-none gap-[1px] w-48 overflow-hidden select-none">
                    {barcodeBars.map((bar, i) => (
                      <div
                        key={i}
                        className="bg-neutral-950 h-full shrink-0"
                        style={{
                          width: `${bar.width + 0.5}px`,
                          marginRight: `${bar.space}px`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Elite Validation Banner */}
              <div className="bg-neutral-950 text-white p-2 flex flex-col sm:flex-row justify-center items-center gap-1.5 sm:gap-4 text-center text-xs border border-neutral-950">
                <span className="font-extrabold text-amber-300 tracking-widest">🏆 VALIDAÇÃO DE ELITE</span>
                <span className="opacity-60 text-[10px] font-mono italic">
                  SEM VALOR FINANCEIRO • ENTRETENIMENTO DE ALTA GAMA
                </span>
              </div>
            </div>

          </div>

          {/* SERRATED TRANSITION RECIPES (Inside Ticket body so layout floats perfectly) */}
          <div className="absolute top-0 inset-x-0 h-1 overflow-hidden flex justify-between pointer-events-none">
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full bg-[#143e24] -translate-y-[50%] shrink-0" />
            ))}
          </div>

          <div className="absolute bottom-0 inset-x-0 h-1 overflow-hidden flex justify-between pointer-events-none">
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full bg-[#143e24] translate-y-[50%] shrink-0" />
            ))}
          </div>



        </div>

        {/* History Pocket Panel */}
        <section id="recent-ticket-history-pock" className="p-4 bg-amber-100/10 rounded border-2 border-neutral-850/30 text-neutral-100 shadow-inner">
          <RecentSlips
            slips={recentSlips}
            onDeleteSlip={handleDeleteSlip}
            onRestoreSlip={handleRestoreSlip}
            onShareWhatsAppAgain={handleShareWhatsAppAgain}
          />
        </section>

        {/* Footer */}
        <footer className="text-center py-4 text-xs font-semibold font-mono text-neutral-400 select-none">
          © 2026 Palpiteiros do Brasileirão. | Feito por Thiago Medeiros
        </footer>

      </div>

      {/* Secret Probabilistic Lotery Modal */}
      {showSurpresinhaModal && (
        <SecretModal
          onAccept={handleApplySurpresinha}
          onDecline={() => {
            setShowSurpresinhaModal(false);
            setCleanClicks(0);
          }}
        />
      )}

      {/* Password Prompt modal for mobile-friendly and iframe bypass compatibility */}
      {passwordModalOpen && (
        <div id="password-modal" className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-2 border-yellow-500 w-full max-w-sm rounded p-5 relative shadow-[8px_8px_0px_#171717] animate-in fade-in duration-200">
            <button 
              onClick={handleCancelPassword}
              className="absolute top-3 right-3 text-neutral-400 hover:text-white transition-colors"
              aria-label="Minimizar modal"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center rounded-full text-yellow-500">
                <Lock className="w-6 h-6 animate-pulse" />
              </div>
              
              <div className="space-y-1">
                <h3 className="font-sans font-black tracking-wider uppercase text-yellow-500 text-sm">
                  PROTEGER PAINEL ADMINISTRATIVO
                </h3>
                <p className="text-[10px] sm:text-xs font-mono text-neutral-400">
                  Para habilitar o Painel de Gestão e Testes da Plataforma, digite a senha secreta de admin:
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="••••••"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value.replace(/\D/g, ""));
                      setPasswordError(null);
                    }}
                    autoFocus
                    className="w-full text-center tracking-widest bg-neutral-950 text-yellow-400 border border-neutral-700 focus:border-yellow-500 rounded p-3 font-mono text-2xl outline-none transition-colors"
                  />
                  {passwordError && (
                    <p className="text-[10px] text-red-400 font-mono font-bold animate-shake">
                      {passwordError}
                    </p>
                  )}
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelPassword}
                    className="flex-1 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs uppercase transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-sans font-black text-xs uppercase transition-all"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
