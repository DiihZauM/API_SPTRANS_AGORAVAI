// Importando dependências
const express = require("express");
const cors = require("cors");
const path = require('path');

require("dotenv").config();

const app = express();
const PORT = 3000;
const API_URL = "https://api.olhovivo.sptrans.com.br/v2.1";
const TOKEN = process.env.sptrans_token; // Substitua com seu token válido
let cookies = "";

// Configurando CORS para permitir requisições de qualquer origem
app.use(cors()); // Permitir requisições de qualquer origem

app.use(express.static(path.join(__dirname, 'public')));

// Rota para servir o HTML principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'proximos_onibus.html'));
});

// Função de autenticação
async function autenticar() {
    try {
        const response = await fetch(`${API_URL}/Login/Autenticar?token=${TOKEN}`, {
            method: "POST",
            credentials: "include"
        });

        cookies = response.headers.get("set-cookie");
        const isAuthenticated = await response.json();

        if (isAuthenticated) {
            console.log("Autenticado com sucesso!");
        } else {
            console.log("Falha na autenticação.");
        }
    } catch (error) {
        console.error("Erro na autenticação:", error.message);
    }
}

// Função para buscar paradas por nome de rua
app.get("/paradas", async (req, res) => {
    try {
        const nomeRua = req.query.nomeRua;
        console.log("Buscando paradas para a rua:", nomeRua); // Verifique no backend se o nome da rua está correto

        if (!nomeRua) {
            return res.status(400).json({ erro: "Nome da rua não fornecido." });
        }

        await autenticar();
        const response = await fetch(
            `${API_URL}/Parada/Buscar?termosBusca=${encodeURIComponent(nomeRua)}`, {
                method: "GET",
                headers: {
                    "Cookie": cookies
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Erro ao buscar paradas: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Dados das paradas:", data); // Exibir dados recebidos

        res.json(data);
    } catch (error) {
        console.error("Erro ao buscar paradas:", error.message);
        res.status(500).json({ erro: "Erro ao buscar paradas." });
    }
});

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
  
        return diffMinutos > 0 ? `${diffMinutos} min` : "agora";
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

// Inicializando o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
