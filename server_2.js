// Importando dependências
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const Stop = require("./stopModel");  // O modelo de paradas

require("dotenv").config();

const app = express();
const PORT = 3000;

mongoose.connect('mongodb://localhost:27017/transport', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Conectado ao MongoDB"))
    .catch((err) => console.error("❌ Erro ao conectar ao MongoDB:", err));

// Configurando CORS
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Rota para servir o HTML principal
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "proximos_onibus.html"));
});

// Função para buscar paradas por nome de rua
app.get("/paradas", async (req, res) => {
    try {
        const nomeRua = req.query.nomeRua;

        if (!nomeRua) {
            return res.status(400).json({ erro: "Nome da rua não fornecido." });
        }

        // Buscando paradas que contenham a string no nome da rua
        const paradas = await Stop.find({ stop_name: { $regex: nomeRua, $options: "i" } });

        if (paradas.length === 0) {
            return res.status(404).json({ erro: "Nenhuma parada encontrada." });
        }

        console.log("Paradas encontradas:", paradas);
        res.json(paradas);
    } catch (error) {
        console.error("❌ Erro ao buscar paradas:", error.message);
        res.status(500).json({ erro: "Erro ao buscar paradas no banco de dados." });
    }
});

// Função para autenticação com o Olho Vivo
let cookies = "";
const API_URL = "https://api.olhovivo.sptrans.com.br/v2.1";
const TOKEN = "edb459be1918b85e5aa144dd60a1f109e01c08e4372c51f9f4beaf16ceefba20";  // Substitua com seu token válido

async function autenticar() {
    try {
        const response = await fetch(`${API_URL}/Login/Autenticar?token=${TOKEN}`, {
            method: "POST",
            credentials: "include"
        });

        cookies = response.headers.get("set-cookie");
        const isAuthenticated = await response.json();

        if (isAuthenticated) {
            console.log("✅ Autenticado com sucesso!");
        } else {
            console.log("❌ Falha na autenticação.");
        }
    } catch (error) {
        console.error("❌ Erro na autenticação:", error.message);
    }
}

// Função para obter a previsão dos ônibus
async function obterPrevisao(pontoParada) {
    try {
        await autenticar();

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

        if (!data || !data.p || !data.p.l) {
            console.error("❌ Não há previsão para esse ponto.");
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
            const diffMinutos = Math.round(diffMs / 60000);  // Converte ms para minutos

            return diffMinutos > 0 ? `${diffMinutos} min` : "agora";
        };
        
        const resultado = {
            py,
            px,
            linhas: linhas.map((linha) => {
                const veiculos = linha.vs?.slice(0, 3).map((veiculo) => ({
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
        console.log(resultado);
        return resultado;
    } catch (error) {
        console.error("❌ Erro ao obter previsão:", error.message);
        return null;
    }
}

// Endpoint para obter a previsão dos próximos ônibus
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
        console.error("❌ Erro no endpoint /proximos-onibus:", error.message);
        res.status(500).json({ erro: "Erro ao buscar os próximos ônibus." });
    }
});

// Inicializando o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
