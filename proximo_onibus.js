// Importando pacotes necessários
require('dotenv').config(".env");
const express = require('express');
const cors = require('cors');
 // Para fazer requisições HTTP para a API da SPTrans

const app = express();
const PORT = 3000;
const API_URL = "https://api.olhovivo.sptrans.com.br/v2.1";
const TOKEN = process.env.sptrans_token;  // Substitua pelo seu token
let cookies = "";

// Habilitar CORS para aceitar requisições do frontend (qualquer origem por enquanto)
app.use(cors());

// Função para autenticação na API SPTrans
async function autenticar() {
  const response = await fetch(`${API_URL}/Login/Autenticar?token=${TOKEN}`, {
    method: "POST",
    credentials: "include",
  });

  cookies = response.headers.get("set-cookie");
  
  const isAuthenticated = await response.json();
  if (isAuthenticated) {
    console.log("Autenticado com sucesso!");
  } else {
    console.log("Falha na autenticação.");
  }
}

// Função para obter a previsão dos próximos ônibus
async function obterPrevisao(pontoParada) {
  try {
    await autenticar();  // Autenticar primeiro
    
    // Fazendo a requisição para obter a previsão dos ônibus
    const response = await fetch(`${API_URL}/Previsao/Parada?codigoParada=${pontoParada}`, {
      method: "GET",
      headers: {
        "Cookie": cookies
      }
    });

    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
    }

    let data = await response.json();

    // Verificando se a estrutura dos dados é válida
    if (!data || !data.p || !data.p.l) {
      console.error("❌ Erro: Estrutura do JSON inválida");
      return null;
    }

    const { py, px, l: linhas } = data.p;

    const calcularTempoChegada = (horario) => {
      if (!horario) return "Sem previsão";

      const agora = new Date();
      const [horas, minutos] = horario.split(":").map(Number);
      const horarioPrevisto = new Date(agora);
      horarioPrevisto.setHours(horas, minutos, 0, 0);

      const diffMs = horarioPrevisto - agora;
      const diffMinutos = Math.round(diffMs / 60000); // Converte ms para minutos

      return diffMinutos > 0 ? `${diffMinutos} min` : "Chegando agora";
    };

    // Montando o resultado
    const resultado = {
      py,
      px,
      linhas: linhas.map(linha => {
        const veiculos = linha.vs?.slice(0, 3).map(veiculo => ({
          numero: veiculo.p || "N/A",
          chegada: calcularTempoChegada(veiculo.t)
        })) || [];

        return {
          c: linha.c,
          lt: linha.sl === 2 ? linha.lt1 : linha.lt0,
          veiculos: veiculos.length > 0 ? veiculos : [{ numero: "N/A", chegada: "N/A" }]
        };
      })
    };

    return resultado;

  } catch (error) {
    console.error("Erro ao obter previsão:", error.message);
    return null;
  }
}

// Endpoint para obter a previsão dos ônibus
app.get('/proximos-onibus', async (req, res) => {
  const { paradaId } = req.query;

  if (!paradaId) {
    return res.status(400).json({ erro: "O código da parada é obrigatório!" });
  }

  try {
    const previsao = await obterPrevisao(paradaId);
    if (!previsao) {
      return res.status(500).json({ erro: "Erro ao obter previsão de ônibus." });
    }
    res.json(previsao);
  } catch (error) {
    console.error("Erro no endpoint /proximos-onibus:", error.message);
    res.status(500).json({ erro: "Erro ao buscar os próximos ônibus." });
  }
});

// Configurando a aplicação para rodar na porta 3000
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
