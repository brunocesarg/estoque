/* Carga inicial (Fase 7), vinda de pesquisa-produtos.md (levantamento de 13/11/2026).
   Tudo aqui pode ser editado depois nas telas. Os valores das taxas precisam ser conferidos
   nos sites oficiais antes de valerem de verdade. */
const DadosIniciais = (function () {
  'use strict';
  const CONFERIR = 'Valor da pesquisa de 13/11/2026. Conferir no site oficial.';

  const categorias = [
    { nome: 'Carro', cor: '#7a6bff' },
    { nome: 'Moto', cor: '#18a8ff' },
    { nome: 'Acessórios', cor: '#ff5fa2' }
  ];

  const canais = [
    { nome: 'Shopee' },
    { nome: 'Mercado Livre Clássico' },
    { nome: 'Mercado Livre Premium' },
    { nome: 'Outro (sem taxa)' }
  ];

  // Faixas de taxa. Shopee: a pesquisa não trouxe a faixa de R$ 200 em diante (fica sem faixa até cadastrar).
  const faixas = [
    { canal: 'Shopee', de: 0, ate: 79.99, pct: 20, fixa: 4.5, obs: CONFERIR },
    { canal: 'Shopee', de: 80, ate: 99.99, pct: 14, fixa: 16, obs: CONFERIR },
    { canal: 'Shopee', de: 100, ate: 199.99, pct: 14, fixa: 20, obs: CONFERIR + ' Sem faixa cadastrada a partir de R$ 200.' },
    { canal: 'Mercado Livre Clássico', de: 0, ate: 78.99, pct: 12, fixa: 6, obs: 'Estimativa: comissão de 10% a 14%; custo fixo de R$ 5,50 a R$ 6 abaixo de R$ 79. ' + CONFERIR },
    { canal: 'Mercado Livre Clássico', de: 79, ate: null, pct: 12, fixa: 0, obs: 'Estimativa: comissão de 10% a 14%. Frete a partir de R$ 79 não incluído. ' + CONFERIR },
    { canal: 'Mercado Livre Premium', de: 0, ate: 78.99, pct: 17, fixa: 6, obs: 'Estimativa: comissão de 15% a 19%; custo fixo de R$ 5,50 a R$ 6 abaixo de R$ 79. ' + CONFERIR },
    { canal: 'Mercado Livre Premium', de: 79, ate: null, pct: 17, fixa: 0, obs: 'Estimativa: comissão de 15% a 19%. Frete a partir de R$ 79 não incluído. ' + CONFERIR },
    { canal: 'Outro (sem taxa)', de: 0, ate: null, pct: 0, fixa: 0, obs: 'Venda direta, sem comissão.' }
  ];

  const fornecedores = [
    { nome: 'Utimix Importadora', site: 'utimix.com', tipo: 'online', cidade: 'São Paulo', estado: 'SP', regiao: '25 de Março / Brás', pedido_minimo: 500,
      obs: 'Utilidades e itens da 25 de Março; tem a capa pet. Só atacado online, centro de distribuição no Brás. Não informa se aceita CPF.', etiquetas: ['carro', 'utilidades'] },
    { nome: 'Elite Distribuidora', site: 'elitedistribuidorameucatalogodigitalcom.meucatalogodigital.com', tipo: 'online', regiao: 'Online',
      obs: 'Peças e acessórios de moto. Catálogo digital; quantidade mínima por item não confirmada.', etiquetas: ['moto'] },
    { nome: 'Organibox', site: 'organibox.com.br', tipo: 'online', regiao: 'Online',
      obs: 'Organizadores e redes de porta-malas. Diz vender no atacado para revenda; pedir tabela.', etiquetas: ['carro'] },
    { nome: 'CenterKey', site: 'centerkey.com.br', tipo: 'online', regiao: 'Online',
      obs: 'Linha de chaveiro automotivo, capas de telecomando. Fonte mais direta para capa de chave.', etiquetas: ['carro', 'chaves'] },
    { nome: 'GSV Automotive', site: 'gsvautomotive.com.br', tipo: 'online', regiao: 'Online',
      obs: 'Autopeças multimarcas, capa de telecomando. Tem plano de revendedor.', etiquetas: ['carro', 'chaves'] },
    { nome: 'Grupo Gadan', tipo: 'online', pedido_minimo: 500,
      obs: 'Ferramentas, automotivo, utilidades. Orçamento feito por vendedor.', etiquetas: ['carro', 'utilidades'] },
    { nome: 'Atacado 25', site: 'atacadovintecinco.com.br', tipo: 'online', regiao: '25 de Março',
      obs: 'Kits de acessórios e eletrônicos. Pedido mínimo: a partir de 5 peças. Menor barreira de entrada.', etiquetas: ['acessórios'] },
    { nome: 'Acessórios no Atacado', site: 'acessoriosnoatacado.com.br', tipo: 'online', pedido_minimo: 450, emite_nota: 'sim',
      obs: 'Acessórios em geral. Informa que tudo sai com nota fiscal.', etiquetas: ['acessórios'] },
    { nome: 'Semaan', site: 'semaanpari.com.br', tipo: 'ambos', pedido_minimo: 700,
      obs: 'Utilidades e importados. Pedido mínimo de R$ 700 na loja e R$ 1.500 por televendas.', etiquetas: ['utilidades'] }
  ];

  // Candidatos entram inativos, com custo e preço simulados, para uso no simulador.
  const produtos = [
    { nome: 'Capa pet para banco de carro', categoria: 'Carro', fornecedor: 'Utimix Importadora', custo: 26.99, preco: 79.9, emb: 2,
      obs: 'Melhor candidato. Venda observada: R$ 34 a R$ 60 (simples) e R$ 130 a R$ 160 (mais vendida). A R$ 59,90 ainda é viável (lucro R$ 11,43, 19%).' },
    { nome: 'Capa de chave em silicone (kit 2)', categoria: 'Carro', custo: 16, preco: 49.9, emb: 1,
      obs: 'Custo estimado (R$ 8 cada), sem cotação. Pedir à CenterKey ou à GSV. Venda observada: R$ 28 a R$ 36 a unidade.' },
    { nome: 'Capa de chave em silicone (1 un.)', categoria: 'Carro', custo: 8, preco: 29.9, emb: 1,
      obs: 'Custo estimado, sem cotação.' },
    { nome: 'Balaclava (kit 5)', categoria: 'Moto', fornecedor: 'Elite Distribuidora', custo: 27.65, preco: 59.9, emb: 2,
      obs: 'R$ 5,53 cada. Viável só em kit. Venda observada: R$ 59,90 o kit de 5.' },
    { nome: 'Balaclava (kit 3)', categoria: 'Moto', fornecedor: 'Elite Distribuidora', custo: 16.59, preco: 34.9, emb: 1.5,
      obs: 'Margem fraca (7%).' },
    { nome: 'Rede elástica de capacete (1 un.)', categoria: 'Moto', fornecedor: 'Elite Distribuidora', custo: 7.1, preco: 16.99, emb: 1,
      obs: 'Dá prejuízo vendida avulsa. Descartar.' },
    { nome: 'Rede elástica de capacete (kit 3)', categoria: 'Moto', fornecedor: 'Elite Distribuidora', custo: 21.3, preco: 39.9, emb: 1.5,
      obs: 'Margem de 4%. Descartar.' },
    { nome: 'Organizador de porta-malas', categoria: 'Carro', fornecedor: 'Organibox',
      obs: 'Pedir cotação (a Organibox anuncia "a partir de R$ 59 a R$ 61", sem tabela de atacado). Venda observada: R$ 35 a R$ 80; premium R$ 120 a R$ 150.' },
    { nome: 'Capa de volante', categoria: 'Carro', custo: 10.3,
      obs: 'Custo de um kit de 15 un. a R$ 154,68 no Mercado Livre (modelo de costurar). Falta pesquisar o preço de venda.' },
    { nome: 'Capa de chuva para motoqueiro', categoria: 'Moto',
      obs: 'Pedir cotação. Preço de varejo observado: R$ 100 a R$ 160.' }
  ];

  const cotacoes = [
    { fornecedor: 'Utimix Importadora', produto: 'Capa pet para banco de carro', descricao: 'Capa pet para banco de carro', preco: 26.99, qtd: 3, obs: 'Preço de 3 a 23 unidades.' },
    { fornecedor: 'Elite Distribuidora', produto: 'Rede elástica de capacete (1 un.)', descricao: 'Rede elástica de capacete', preco: 7.1 },
    { fornecedor: 'Elite Distribuidora', produto: 'Balaclava (kit 5)', descricao: 'Balaclava (R$ 5,53 cada)', preco: 27.65, obs: 'Kit com 5 unidades.' },
    { fornecedor: 'Organibox', produto: 'Organizador de porta-malas', descricao: 'Organizador de porta-malas', preco: 59, obs: 'Preço de anúncio "a partir de R$ 59 a R$ 61". Sem tabela de atacado.' }
  ];

  /* Dados só do modo demonstração: movimentações e custos para o painel ter o que mostrar. */
  function movimentosDemo(ids, hojeStr, Calc, cfg) {
    let sem = 7;
    const rnd = () => { sem = (sem * 16807) % 2147483647; return sem / 2147483647; };
    const movs = [];
    const dia = n => Calc.addDias(hojeStr, -n);
    const ativos = [
      ['Capa pet para banco de carro', 24, 26.99, 79.9, 11],
      ['Capa de chave em silicone (kit 2)', 60, 16, 49.9, 17],
      ['Balaclava (kit 5)', 40, 27.65, 59.9, 12],
      ['Organizador de porta-malas', 18, 38, 69.9, 8]
    ];
    const canais = ids.canais;
    for (const [nome, qtdEntrada, custo, preco, vendasN] of ativos) {
      const pid = ids.produtos[nome];
      movs.push({ produto_id: pid, tipo: 'entrada', quantidade: qtdEntrada, data: dia(38), custo_unitario: custo, frete: 0, fornecedor_id: ids.produtoFornecedor[nome] || null });
      let vendidas = 0;
      for (let i = 0; i < vendasN; i++) {
        const q = 1 + (rnd() < 0.2 ? 1 : 0);
        if (vendidas + q > qtdEntrada - 2) break;
        vendidas += q;
        const canalId = rnd() < 0.65 ? canais['Shopee'] : canais['Mercado Livre Clássico'];
        const p = Math.round((preco - (rnd() < 0.3 ? 10 : 0)) * 100) / 100;
        const faixa = Calc.acharFaixa(ids.faixas, canalId, p);
        const prod = ids.produtosObj[nome];
        const t = Calc.taxasVenda({ preco: p, qtd: q, faixa, cfg, produto: prod });
        movs.push(Object.assign({ produto_id: pid, tipo: 'venda', quantidade: q, data: dia(Math.floor(rnd() * 30)), custo_unitario: custo,
          canal_id: canalId, preco_venda: p, frete: 0 }, t));
      }
    }
    // uma perda e uma devolução, para essas telas terem o que mostrar
    movs.push({ produto_id: ids.produtos['Balaclava (kit 5)'], tipo: 'perda', quantidade: 1, data: dia(9), custo_unitario: 27.65, observacao: 'Chegou rasgada' });
    return movs;
  }

  return { categorias, canais, faixas, fornecedores, produtos, cotacoes, movimentosDemo };
})();
