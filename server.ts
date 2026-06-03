import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Desativa verificação rígida de certificados SSL em conexões com Globo Esporte
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Fallback determinístico que gera jogos da rodada no padrão do Globo Esporte
function generateFallbackGamesForRound(roundNum: number) {
  if (roundNum === 19) {
    return [
      {
        equipes: { mandante: { nome_popular: "Fluminense", nome: "Fluminense" }, visitante: { nome_popular: "RB Bragantino", nome: "RB Bragantino" } },
        data_realizacao: "2026-07-22T16:00:00", hora_realizacao: "16:00", sede: { nome_popular: "Maracanã" }
      },
      {
        equipes: { mandante: { nome_popular: "Botafogo", nome: "Botafogo" }, visitante: { nome_popular: "Santos", nome: "Santos" } },
        data_realizacao: "2026-07-22T17:00:00", hora_realizacao: "17:00", sede: { nome_popular: "Nilton Santos" }
      },
      {
        equipes: { mandante: { nome_popular: "São Paulo", nome: "São Paulo" }, visitante: { nome_popular: "Athletico-PR", nome: "Athletico-PR" } },
        data_realizacao: "2026-07-22T18:00:00", hora_realizacao: "18:00", sede: { nome_popular: "MorumBIS" }
      },
      {
        equipes: { mandante: { nome_popular: "Corinthians", nome: "Corinthians" }, visitante: { nome_popular: "Remo", nome: "Remo" } },
        data_realizacao: "2026-07-22T19:00:00", hora_realizacao: "19:00", sede: { nome_popular: "Neo Química Arena" }
      },
      {
        equipes: { mandante: { nome_popular: "Mirassol", nome: "Mirassol" }, visitante: { nome_popular: "Grêmio", nome: "Grêmio" } },
        data_realizacao: "2026-07-22T21:30:00", hora_realizacao: "21:30", sede: { nome_popular: "Maião" }
      },
      {
        equipes: { mandante: { nome_popular: "Atlético-MG", nome: "Atlético-MG" }, visitante: { nome_popular: "Bahia", nome: "Bahia" } },
        data_realizacao: "2026-07-22T11:00:00", hora_realizacao: "11:00", sede: { nome_popular: "Arena MRV" }
      },
      {
        equipes: { mandante: { nome_popular: "Internacional", nome: "Internacional" }, visitante: { nome_popular: "Cruzeiro", nome: "Cruzeiro" } },
        data_realizacao: "2026-07-22T16:00:00", hora_realizacao: "16:00", sede: { nome_popular: "Beira-Rio" }
      },
      {
        equipes: { mandante: { nome_popular: "Coritiba", nome: "Coritiba" }, visitante: { nome_popular: "Palmeiras", nome: "Palmeiras" } },
        data_realizacao: "2026-07-22T18:30:00", hora_realizacao: "18:30", sede: { nome_popular: "Couto Pereira" }
      },
      {
        equipes: { mandante: { nome_popular: "Vitória", nome: "Vitória" }, visitante: { nome_popular: "Vasco da Gama", nome: "Vasco da Gama" } },
        data_realizacao: "2026-07-22T20:30:00", hora_realizacao: "20:30", sede: { nome_popular: "Barradão" }
      },
      {
        equipes: { mandante: { nome_popular: "Chapecoense", nome: "Chapecoense" }, visitante: { nome_popular: "Flamengo", nome: "Flamengo" } },
        data_realizacao: "2026-07-22T20:00:00", hora_realizacao: "20:00", sede: { nome_popular: "Arena Condá" }
      }
    ];
  }

  const TEAMS_LIST = [
    "São Paulo", "Botafogo", "Vitória", "Internacional", "Grêmio", "Santos", 
    "Mirassol", "Fluminense", "Flamengo", "Palmeiras", "Cruzeiro", "Chapecoense", 
    "Remo", "Athletico-PR", "Corinthians", "Atlético-MG", "Vasco da Gama", 
    "RB Bragantino", "Coritiba", "Bahia"
  ];
  
  const n = TEAMS_LIST.length;
  const list = [...TEAMS_LIST];
  
  const r = (roundNum - 1) % 19;
  const rotated = [list[0], ...list.slice(1 + r), ...list.slice(1, 1 + r)];
  
  const kickOffTimes = [
    "16:00", "16:00", "17:00", "19:00", "21:00", // Sábado
    "11:00", "16:00", "16:00", "18:30", "20:30"  // Domingo
  ];

  let saturdayDateObj: Date;
  if (roundNum >= 20) {
    const baseSaturdayRound20 = new Date("2026-07-25T12:00:00-03:00");
    const weeksOffset = roundNum - 20;
    const targetSaturdayTime = baseSaturdayRound20.getTime() + (weeksOffset * 7 * 24 * 60 * 60 * 1000);
    saturdayDateObj = new Date(targetSaturdayTime);
  } else {
    const baseSaturday = new Date("2026-05-23T12:00:00-03:00");
    const weeksOffset = roundNum - 17;
    const targetSaturdayTime = baseSaturday.getTime() + (weeksOffset * 7 * 24 * 60 * 60 * 1000);
    saturdayDateObj = new Date(targetSaturdayTime);
  }
  
  const formatDateString = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const saturdayStr = formatDateString(saturdayDateObj);
  const sundayShift = new Date(saturdayDateObj.getTime() + (24 * 60 * 60 * 1000));
  const sundayStr = formatDateString(sundayShift);

  const STADIUMS_MAP: Record<string, string> = {
    "São Paulo": "MorumBIS",
    "Botafogo": "Nilton Santos",
    "Vitória": "Barradão",
    "Internacional": "Beira-Rio",
    "Grêmio": "Arena do Grêmio",
    "Santos": "Vila Belmiro",
    "Mirassol": "Maião",
    "Fluminense": "Maracanã",
    "Flamengo": "Maracanã",
    "Palmeiras": "Allianz Parque",
    "Cruzeiro": "Mineirão",
    "Chapecoense": "Arena Condá",
    "Remo": "Baenão",
    "Athletico-PR": "Ligga Arena",
    "Corinthians": "Neo Química Arena",
    "Atlético-MG": "Arena MRV",
    "Vasco da Gama": "São Januário",
    "RB Bragantino": "Nabizão",
    "Coritiba": "Couto Pereira",
    "Bahia": "Arena Fonte Nova"
  };

  const jogos = [];
  
  for (let i = 0; i < n / 2; i++) {
    let home = rotated[i];
    let away = rotated[n - 1 - i];
    
    if (roundNum > 19) {
      const temp = home;
      home = away;
      away = temp;
    }

    const isSunday = i >= 5;
    const matchDate = isSunday ? sundayStr : saturdayStr;
    const matchTime = kickOffTimes[i];

    // Simula adiamento/reagendamento de alguns jogos oficiais para visualização no admin
    let finalTime = matchTime;
    let finalDate = matchDate;
    if (i === 1) {
      finalTime = "18:00"; // Reagendido no sábado
    } else if (i === 4) {
      finalTime = "21:30"; // Noturno no sábado
    } else if (i === 7) {
      // Reagendado de Domingo para Terça-feira (por exemplo de Remo x Athletico-PR ou equivalente)
      const tuesdayDate = new Date(saturdayDateObj.getTime() + (3 * 24 * 60 * 60 * 1000));
      finalDate = formatDateString(tuesdayDate);
      finalTime = "20:00";
    }

    jogos.push({
      equipes: {
        mandante: { nome_popular: home, nome: home },
        visitante: { nome_popular: away, nome: away }
      },
      data_realizacao: `${finalDate}T${finalTime}:00`,
      hora_realizacao: finalTime,
      sede: { nome_popular: STADIUMS_MAP[home] || "Estádio Nacional" }
    });
  }
  
  return jogos;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ROTA DO PROXY DE DADOS PARA EVITAR CORS NO NAVEGADOR
  app.get("/api/sync-ge/:rodada", async (req, res) => {
    const rodadaNum = parseInt(req.params.rodada, 10) || 17;
    try {
      const targetUrl = `https://api.globoesporte.globo.com/v1/campeonatos/brasileirao-serie-a/rodada/${rodadaNum}/jogos`;
      
      console.log(`[Backend-GE] Buscando dados oficiais da rodada ${rodadaNum}...`);
      
      const response = await fetch(targetUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        signal: AbortSignal.timeout(4000) // 4 segundos de timeout para agilidade
      });
      
      if (!response.ok) {
        console.warn(`[Backend-GE] Globo Esporte retornou status ${response.status} para rodada ${rodadaNum}. Usando fallback resiliente.`);
        const fallbackJogos = generateFallbackGamesForRound(rodadaNum);
        return res.json(fallbackJogos);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error(`[Backend-GE] Erro ou timeout na API oficial para rodada ${rodadaNum}, aplicando fallback:`, error.message);
      const fallbackJogos = generateFallbackGamesForRound(rodadaNum);
      res.json(fallbackJogos);
    }
  });

  // Redireciona raiz para o base path /palpiteirosbrasileirao/ para facilidade de uso
  app.get("/", (req, res, next) => {
    res.redirect("/palpiteirosbrasileirao/");
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true
      },
      appType: "spa",
      base: "/palpiteirosbrasileirao/"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve os arquivos estáticos sob /palpiteirosbrasileirao
    app.use("/palpiteirosbrasileirao", express.static(distPath));
    app.use(express.static(distPath));
    
    app.get("/palpiteirosbrasileirao/*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] rodando com sucesso em http://0.0.0.0:${PORT}`);
  });
}

startServer();
