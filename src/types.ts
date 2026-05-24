// Representa um confronto da rodada do Brasileirão
export interface Match {
  id: string;
  date: string;       // Formato: "YYYY-MM-DD"
  time: string;       // Formato brasileiro: "HH:MM" (Horário de Brasília)
  team1: string;      // Nome do Clube Mandante (Ex: "Flamengo")
  team2: string;      // Nome do Clube Visitante (Ex: "Palmeiras")
  stadium?: string;   // Opcional: Estádio/Arena onde ocorrerá o jogo
  roundName?: string; // Nome da rodada (Ex: "Rodada 1")
  probHome?: number;  // Probabilidade de vitória do mandante (%)
  probDraw?: number;  // Probabilidade de empate (%)
  probAway?: number;  // Probabilidade de vitória do visitante (%)
}

// Representa a coleção da rodada ativa
export interface CompetitionData {
  competition: string; // Ex: "Campeonato Brasileiro - Série A"
  round: string;       // Ex: "38ª Rodada"
  matches: Match[];
}

// Palpites individuais preenchidos
export interface UserPrediction {
  matchId: string;
  score1: string; // Placar Mandante (Mantenha tipo String para inputs vazios/flexíveis)
  score2: string; // Placar Visitante
}

// Histórico de Bilhetes emitidos e gravados no LocalStorage
export interface BetSlipSubmission {
  fullName: string;
  predictions: UserPrediction[];
  submittedAt: string; // Data e Hora da gravação (ISO)
  ticketCode: string;  // ID autêntico gerado eletronicamente (Checksum)
}
