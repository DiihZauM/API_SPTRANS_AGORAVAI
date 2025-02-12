// Importando dependências
const express = require("express");
const cors = require("cors");

require("dotenv").config();

const app = express();
const PORT = 3000;
const API_URL = "https://api.olhovivo.sptrans.com.br/v2.1";
const TOKEN = process.env.sptrans_token ; // Substitua com seu token válido
let cookies = "";

// Configurando CORS para permitir requisições de qualquer origem
app.use(cors()); // Permitir requisições de qualquer origem

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

// Inicializando o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
