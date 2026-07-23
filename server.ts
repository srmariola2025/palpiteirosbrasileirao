import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

import fs from "fs";

// Desativa verificação rígida de certificados SSL em conexões com Globo Esporte
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Carrega o banco oficial das rodadas do Brasileirão
let officialRoundsJson: Record<string, any[]> = {};
try {
  const jsonPath = path.join(process.cwd(), "official_rounds_data.json");
  if (fs.existsSync(jsonPath)) {
    officialRoundsJson = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  }
} catch (e) {
  console.error("Erro ao carregar official_rounds_data.json em server.ts:", e);
}

// Fallback que retorna os jogos oficiais do Globo Esporte / CBF
function generateFallbackGamesForRound(roundNum: number) {
  const roundKey = String(roundNum);
  if (officialRoundsJson[roundKey] && officialRoundsJson[roundKey].length > 0) {
    return officialRoundsJson[roundKey].map(m => ({
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
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ROTA DO PROXY DE DADOS PARA EVITAR CORS NO NAVEGADOR
  app.get("/api/sync-ge/:rodada", async (req, res) => {
    const rodadaNum = parseInt(req.params.rodada, 10) || 17;
    try {
      const targetUrl = `https://api.globoesporte.globo.com/tabela/d1a37fa4-e948-43a6-ba53-ab24ab3a45b1/fase/fase-unica-campeonato-brasileiro-2026/rodada/${rodadaNum}/jogos/`;
      
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
