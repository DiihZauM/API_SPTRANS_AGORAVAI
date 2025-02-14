const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const Stop = require('./models/stopModel');
const stopRoutes = require('./routes/stopRoutes');

// Inicializando o aplicativo Express
const app = express();
const port = 3000;

// Middleware para permitir requisições JSON
app.use(express.json());

// Conectando ao MongoDB
mongoose.connect('mongodb://localhost:27017/transport', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Conectado ao MongoDB"))
    .catch((err) => console.error("Erro ao conectar:", err));

// Definindo rotas
app.use('/api/stops', stopRoutes);

// Função para importar dados do arquivo stops.txt para o banco de dados
async function importarDados() {
    fs.readFile('stops.txt', 'utf8', async (err, data) => {
        if (err) {
            console.error("Erro ao ler o arquivo:", err);
            return;
        }

        const linhas = data.split('\n');
        const novosDados = [];

        for (const linha of linhas) {
            const campos = linha.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (campos && campos.length === 5) {
                const [stop_id, stop_name, stop_desc, stop_lat, stop_lon] = campos.map(campo => campo.replace(/"/g, '').trim());
                novosDados.push({
                    stop_id, stop_name, stop_desc, 
                    stop_lat: parseFloat(stop_lat), 
                    stop_lon: parseFloat(stop_lon)
                });
            }
        }

        try {
            await Stop.deleteMany({});
            console.log("Todos os documentos antigos foram excluídos.");
            await Stop.insertMany(novosDados);
            console.log("Novos dados inseridos com sucesso!");
        } catch (err) {
            console.error("Erro ao importar dados:", err);
        }
    });
}

// Chama a função para importar dados ao iniciar o servidor
importarDados();

// Iniciando o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
