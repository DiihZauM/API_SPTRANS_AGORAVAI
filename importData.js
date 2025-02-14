const mongoose = require('mongoose');
const fs = require('fs');
const Stop = require('./stopModel'); // O modelo que criamos para os pontos de parada

// Conectando ao MongoDB (substitua pela URL do seu MongoDB, se necessário)
mongoose.connect('mongodb://localhost:27017/transport', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Conectado ao MongoDB"))
    .catch((err) => console.error("Erro ao conectar:", err));

// Função para ler o arquivo e inserir ou atualizar os dados
async function importarDados() {
    // Lendo o arquivo TXT
    fs.readFile('stops.txt', 'utf8', async (err, data) => {
        if (err) {
            console.error("Erro ao ler o arquivo:", err);
            return;
        }

        // Dividindo os dados por linha
        const linhas = data.split('\n');
        
        // Para cada linha, processa e insere ou atualiza no MongoDB
        for (const linha of linhas) {
            // Expressão regular para lidar com campos entre aspas e separação por vírgulas
            const campos = linha.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);

            if (campos && campos.length === 5) {
                const [stop_id, stop_name, stop_desc, stop_lat, stop_lon] = campos.map(campo => campo.replace(/"/g, '').trim());

                // Criando o objeto para o novo ponto de parada
                const novaParada = {
                    stop_id: stop_id,
                    stop_name: stop_name,
                    stop_desc: stop_desc,
                    stop_lat: parseFloat(stop_lat),
                    stop_lon: parseFloat(stop_lon)
                };

                // Atualizando o documento se já existir, caso contrário, inserindo
                try {
                    await Stop.updateOne(
                        { stop_id: stop_id }, // Critério de pesquisa (pelo stop_id)
                        { $set: novaParada }, // Atualizando ou inserindo os novos dados
                        { upsert: true } // Se não encontrar, vai inserir o novo documento
                    );
                    console.log(`Ponto de parada ${stop_name} atualizado ou inserido com sucesso!`);
                } catch (err) {
                    console.error('Erro ao inserir ou atualizar dado:', err);
                }
            } else {
                console.error('Formato de linha inválido:', linha);
            }
        }
    });
}

// Chamando a função para importar os dados
importarDados();
