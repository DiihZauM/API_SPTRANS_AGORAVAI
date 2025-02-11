require('dotenv').config

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

const resultado = {
    py,
    px,
    linhas: linhas.map(linha => {
        console.log(`🔍 Linha ${linha.c} - Veículos recebidos:`, JSON.stringify(linha.vs, null, 2)); 

        const primeiroVeiculo = linha.vs?.[0] ?? null; 

        const objLinha = {
            c: linha.c,
            lt: linha.sl === 2 ? linha.lt1 : linha.lt0,
            veiculo: primeiroVeiculo
                ? {
                    p: primeiroVeiculo.p || "N/A",
                    t: primeiroVeiculo.t || "Sem previsão"
                }
                : { p: "N/A", t: "Sem veículos disponíveis" }
        };

        console.log(`✅ Linha Processada (${linha.c}):`, JSON.stringify(objLinha, null, 2)); 

        return objLinha;
    })
};


console.log("🚍 Dados filtrados (Final):", JSON.stringify(resultado, null, 2));

return resultado;
      


    console.log("🚍 Dados filtrados:", resultado);
    return resultado;

  } catch (error) {
      console.error("Erro ao obter previsão:", error.message);
      return null;
  }
}

obterPrevisao(120015817);
