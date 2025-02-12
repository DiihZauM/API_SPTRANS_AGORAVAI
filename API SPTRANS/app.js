require("dotenv").config
const express = require("express");


const app = express();
const PORT = 3000;
const API_URL = "https://api.olhovivo.sptrans.com.br/v2.1";
const TOKEN = process.env.sptrans_token; 
let cookies= "";

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

async function obterPrevisao(pontoParada) {
  try {
      await autenticar();

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
       JSON.stringify(data, null, 2);

      
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
    
    const resultado = {
        py,
        px,
        linhas: linhas.map(linha => {
            const veiculos = linha.vs?.slice(0, 3).map(veiculo => ({
                numero: veiculo.p || "N/A",
                chegada: calcularTempoChegada(veiculo.t) // 🔥 Agora exibe só a "chegada"
            })) || [];
    
            return {
                c: linha.c,
                lt: linha.sl === 2 ? linha.lt1 : linha.lt0,
                veiculos: veiculos.length > 0 ? veiculos : [{ numero: "N/A", chegada: "N/A" }]
            };
        })
    };
    
    // 🔥 Exibe o JSON formatado corretamente
    console.log("🚍 Dados filtrados (Final):", JSON.stringify(resultado, null, 2));
    
    return resultado;



  } catch (error) {
      console.error("Erro ao obter previsão:", error.message);
      return null;
  }
}

obterPrevisao(660010587);


app.get("/paradas", async (req, res) => {
    try {
        const termosBusca = req.query.termosBusca;
        console.log(cookies);

        if (!termosBusca) {
            return res.status(400).json({ erro: "Termos de busca são necessários" });
        }

        // Chama a API SPTrans para buscar paradas
        const response = await fetch(
            `${API_URL}/Parada/Buscar?termosBusca=${encodeURIComponent(termosBusca)}`,
            {
                method: "GET",
                headers: {
                    "Cookie": cookies
                }
            }
        );

        if (!response.ok) {
            const errorMsg = `Erro na requisição: ${response.status} ${response.statusText}`;
            console.error(errorMsg);
            return res.status(500).json({ erro: errorMsg });
        }

        const data = await response.json();
        console.log("Dados recebidos da SPTrans:", data);

        if (!data || data.length === 0) {
            return res.status(404).json({ erro: "Nenhuma parada encontrada" });
        }

        // Exibe as paradas com nome, latitude e longitude
        const paradas = data.map(parada => ({
            nome: parada.nome,
            latitude: parada.latitude,
            longitude: parada.longitude
        }));

        res.json(paradas);
    } catch (error) {
        console.error("Erro ao buscar paradas:", error.message);
        res.status(500).json({ erro: "Erro ao buscar paradas" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});