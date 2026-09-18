/**
 * Jogodromo - servidor intermediario so para o agente de IA
 * ==================================================================
 * Guarda sua chave de API em segredo e repassa os pedidos do agente
 * de chat pra IA. Sem banco de dados, sem contas - isso ja ficou
 * com o Firebase. Esse worker faz uma coisa só: proteger sua chave.
 *
 * COMO PUBLICAR (uns 5 minutos, gratuito):
 *  1. Va em dash.cloudflare.com -> "Compute" -> "Workers e Paginas"
 *  2. "Criar" -> "Criar Worker" -> de um nome (ex: jogodromo-agente)
 *     -> "Implantar" com o codigo padrao
 *  3. "Editar codigo" -> apague tudo -> cole o conteudo deste arquivo
 *     -> "Implantar" de novo
 *  4. Nas configuracoes do worker -> "Variaveis e Secrets" -> "Adicionar"
 *     Nome: ANTHROPIC_API_KEY | Valor: sua chave da API (marque como Secret)
 *  5. Copie a URL do worker (tipo https://jogodromo-agente.SEUNOME.workers.dev)
 *     e me manda aqui - eu configuro o Jogodromo pra usar ela
 *
 * Dica: em "Seguranca" -> "Limitacao de taxa", vale criar uma regra
 * limitando pedidos por minuto pra esse worker, pra ninguem abusar
 * do endereco e gastar seu saldo a toa.
 */

function corsHeaders(){
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // aceita tanto a raiz quanto /agent, pra funcionar com qualquer versao do Jogodromo
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Metodo nao permitido' }), {
        status: 405,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    if (!env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Chave de API nao configurada no worker' }), {
        status: 500,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = await request.text();
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: body,
      });
      const data = await res.text();
      return new Response(data, {
        status: res.status,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Erro no proxy: ' + err.message }), {
        status: 500,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }
  },
};
