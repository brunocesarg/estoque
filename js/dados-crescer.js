/* Material para crescer: guia de plataformas, ideias de produtos e marcos do plano.
   Pesquisa de 16/11/2026 em guias e blogs de terceiros (não nas tabelas oficiais).
   As fontes divergem em vários pontos: tudo aqui precisa ser confirmado na central do vendedor de cada plataforma. */
const DadosCrescer = (function () {
  'use strict';
  const DATA = '16/11/2026';

  /* faixas: { de, ate (null = sem limite), pct, fixa }. Quando a fonte dá um intervalo, usei o meio. */
  const plataformas = [
    { id: 'shopee', nome: 'Shopee', cnpj: 'Aceita CPF', resumo: '20% + R$ 4,50 até R$ 79,99 · 14% + R$ 16 a R$ 26 acima',
      faixas: [{ de: 0, ate: 79.99, pct: 20, fixa: 4.5 }, { de: 80, ate: 99.99, pct: 14, fixa: 16 }, { de: 100, ate: 199.99, pct: 14, fixa: 20 }, { de: 200, ate: null, pct: 14, fixa: 26 }],
      perfil: 'Produto barato e de impulso, público que compara preço. Forte em acessórios de moto e pet.',
      forte: ['Maior volume para itens baratos', 'Aceita vender como pessoa física', 'Moto e pet aparecem entre os mais vendidos em vários estados'],
      cuidado: ['Entre R$ 80 e R$ 99,99 a taxa fixa de R$ 16 pesa muito: um item de R$ 85 paga mais taxa que um de R$ 79', 'As fontes divergem entre R$ 4,00 e R$ 4,50 na primeira faixa', 'Abaixo de R$ 8 a comissão chega a metade do preço', 'Vendedor CPF com mais de 450 pedidos em 90 dias paga R$ 3 a mais por item'] },
    { id: 'ml-classico', nome: 'Mercado Livre Clássico', cnpj: 'Aceita CPF', resumo: '10% a 14% conforme a categoria · custo fixo de R$ 5,65 a R$ 8,75 abaixo de R$ 79',
      faixas: [{ de: 0, ate: 78.99, pct: 12, fixa: 6.5 }, { de: 79, ate: null, pct: 12, fixa: 0 }],
      perfil: 'Quem busca um produto específico e paga mais por entrega rápida. Bom para ticket acima de R$ 79.',
      forte: ['A partir de R$ 79 não há custo fixo por unidade', 'Comprador menos sensível a preço', 'Acessórios automotivos e pet têm busca alta'],
      cuidado: ['A partir de R$ 79 o frete grátis é obrigatório e parte dele sai do seu bolso (não está nesta conta)', 'A comissão muda por categoria: confira a do seu produto', 'As fontes divergem sobre em qual tipo de envio o custo fixo é cobrado'] },
    { id: 'ml-premium', nome: 'Mercado Livre Premium', cnpj: 'Aceita CPF', resumo: '15% a 19% conforme a categoria · mesmo custo fixo abaixo de R$ 79',
      faixas: [{ de: 0, ate: 78.99, pct: 17, fixa: 6.5 }, { de: 79, ate: null, pct: 17, fixa: 0 }],
      perfil: 'Igual ao Clássico, com parcelamento sem juros para o comprador e mais destaque na busca.',
      forte: ['Parcelamento sem juros ajuda em itens mais caros', 'Mais exposição'], cuidado: ['Cerca de 5 pontos de comissão a mais que o Clássico: só compensa se vender mais'] },
    { id: 'tiktok', nome: 'TikTok Shop', cnpj: 'Confirmar se aceita CPF', resumo: '10% + R$ 4 abaixo de R$ 50 · 6% + R$ 6 a partir de R$ 50',
      faixas: [{ de: 0, ate: 49.99, pct: 10, fixa: 4 }, { de: 50, ate: null, pct: 6, fixa: 6 }],
      perfil: 'Produto que rende vídeo curto: antes e depois, demonstração, pet. Venda por impulso.',
      forte: ['Menor comissão desta lista para itens de R$ 50 ou mais', 'Vendedor novo pode ter 0% de comissão por 60 dias (até R$ 17 mil em vendas)', 'Capa pet e acessórios de moto demonstram bem em vídeo'],
      cuidado: ['O programa de frete grátis cobra mais 6% (não está nesta conta)', 'Afiliados, se usar, levam de 5% a 30%', 'Exige produzir vídeo com frequência'] },
    { id: 'amazon', nome: 'Amazon', cnpj: 'Confirmar se aceita CPF', resumo: '10% a 15% conforme a categoria + R$ 2 por item no plano sem mensalidade',
      faixas: [{ de: 0, ate: null, pct: 12, fixa: 2 }],
      perfil: 'Comprador que confia na entrega e paga um pouco mais. Bom para itens de R$ 40 a R$ 150.',
      forte: ['Comissão entre as mais baixas', 'Menos guerra de preço que a Shopee'], cuidado: ['Cadastro e regras de anúncio mais rígidos', 'O plano profissional tem mensalidade (cerca de R$ 19) e a logística da Amazon tem tarifa própria'] },
    { id: 'magalu', nome: 'Magalu', cnpj: 'Costuma exigir CNPJ', resumo: '13% a 20% conforme a categoria',
      faixas: [{ de: 0, ate: null, pct: 16, fixa: 0 }],
      perfil: 'Público de eletro e casa. Faz sentido depois de ter CNPJ e estoque maior.',
      forte: ['Sem mensalidade nem taxa de adesão'], cuidado: ['Uma fonte cita taxa fixa por item além da comissão', 'Comissão alta para produto barato'] },
    { id: 'shein', nome: 'Shein', cnpj: 'Exige CNPJ', resumo: '18% a 20%',
      faixas: [{ de: 0, ate: null, pct: 18, fixa: 0 }],
      perfil: 'Moda e acessórios pessoais. Pouco encaixe com automotivo.',
      forte: ['Grande público de moda'], cuidado: ['Comissão mais alta desta lista', 'Só com CNPJ'] },
    { id: 'kwai', nome: 'Kwai Shop', cnpj: 'Confirmar', resumo: '14% a 20%, sem taxa fixa (uma única fonte)',
      faixas: [{ de: 0, ate: null, pct: 17, fixa: 0 }],
      perfil: 'Vídeo curto, parecido com o TikTok, com público de cidades menores.',
      forte: ['Sem taxa fixa por item'], cuidado: ['Só achei uma fonte com esses números'] },
    { id: 'direta', nome: 'Venda direta (WhatsApp, Instagram)', cnpj: 'Aceita CPF', resumo: 'Sem comissão. Só o custo do Pix ou da maquininha',
      faixas: [{ de: 0, ate: null, pct: 0, fixa: 0 }],
      perfil: 'Cliente que já comprou de você, grupos de motoboys, vizinhança, clientes de pet shop.',
      forte: ['Fica com a margem inteira', 'Bom para recompra e para kits'], cuidado: ['Você cuida da entrega e da cobrança', 'Volume pequeno no começo'] }
  ];

  /* Ideias de produtos. Custos são ESTIMATIVAS sem cotação: servem para simular, não para decidir a compra. */
  const ideias = [
    { nome: 'Kit viagem pet (capa de banco + cinto de segurança)', cat: 'Carro', mercado: 'Pet', emoji: '🐶', custo: 31, preco: 109.9, emb: 2.5,
      porque: 'Junta a capa pet (seu melhor candidato) com o cinto. Kit passa de R$ 100, onde a Shopee cobra 14% em vez de 20%, e aumenta o lucro por pedido.', risco: 'Conferir se a taxa fixa da faixa não come o ganho: simule antes.' },
    { nome: 'Cinto de segurança pet (kit 2)', cat: 'Carro', mercado: 'Pet', emoji: '🦮', custo: 8, preco: 29.9, emb: 1,
      porque: 'Complemento natural da capa pet. Leve, pequeno, frete barato. Quem compra a capa costuma levar junto.', risco: 'Muita concorrência em preço.' },
    { nome: 'Bebedouro portátil para pet', cat: 'Acessórios', mercado: 'Pet', emoji: '💧', custo: 12, preco: 34.9, emb: 1.5,
      porque: 'Pet é categoria de recompra e de presente. Demonstra bem em vídeo curto (TikTok Shop).', risco: 'Qualidade varia muito entre fornecedores: pedir amostra.' },
    { nome: 'Tapete higiênico lavável para cães', cat: 'Acessórios', mercado: 'Pet', emoji: '🐾', custo: 20, preco: 54.9, emb: 2,
      porque: 'Substitui o descartável, então o apelo de economia vende sozinho. Ticket melhor que acessório pequeno.', risco: 'Volume maior no frete.' },
    { nome: 'Antena corta-pipa para moto', cat: 'Moto', mercado: 'Moto', emoji: '🪁', custo: 12, preco: 34.9, emb: 1.5,
      porque: 'Item de segurança conhecido entre motoboys. Acessórios de moto lideram vendas na Shopee em vários estados do Nordeste.', risco: 'Sazonal em algumas regiões (época de pipa).' },
    { nome: 'Suporte de celular para moto com carregador', cat: 'Moto', mercado: 'Moto', emoji: '📱', custo: 22, preco: 59.9, emb: 2,
      porque: 'Uso diário de entregadores, público que repõe e indica. Bom para grupo de WhatsApp de motoboys.', risco: 'Item com carregador pode precisar de homologação da Anatel: confirmar com o fornecedor.' },
    { nome: 'Trava de disco com alarme', cat: 'Moto', mercado: 'Moto', emoji: '🔒', custo: 30, preco: 84.9, emb: 2,
      porque: 'Segurança vende bem e o preço fica acima de R$ 79, faixa boa no Mercado Livre (sem custo fixo).', risco: 'Entre R$ 80 e R$ 99,99 a Shopee cobra taxa fixa de R$ 16: melhor vender no Mercado Livre ou subir para kit.' },
    { nome: 'Luva de moto com toque na tela', cat: 'Moto', mercado: 'Moto', emoji: '🧤', custo: 18, preco: 49.9, emb: 1.5,
      porque: 'Combina com a balaclava que você já cotou na Elite. Dá para montar kit inverno.', risco: 'Tamanhos geram troca e devolução.' },
    { nome: 'Kit inverno motoqueiro (balaclava kit 5 + luva)', cat: 'Moto', mercado: 'Moto', emoji: '🏍️', custo: 45.65, preco: 109.9, emb: 2.5,
      porque: 'Usa a balaclava já cotada (R$ 27,65 o kit 5). Kit acima de R$ 100 paga 14% na Shopee em vez de 20%.', risco: 'Venda concentrada no frio.' },
    { nome: 'Suporte magnético de celular para carro', cat: 'Carro', mercado: 'Carro', emoji: '🧲', custo: 8, preco: 29.9, emb: 1,
      porque: 'Barato, pequeno, giro alto. Bom produto de entrada para ganhar avaliações.', risco: 'Margem apertada: vale mais em kit com 2.' },
    { nome: 'Organizador de banco traseiro (kit 2)', cat: 'Carro', mercado: 'Carro', emoji: '🎒', custo: 18, preco: 49.9, emb: 2,
      porque: 'Público de família com criança, mesmo de quem compra capa pet. Complementa o organizador de porta-malas.', risco: 'Conferir medidas e material com amostra.' },
    { nome: 'Protetor solar retrátil para para-brisa', cat: 'Carro', mercado: 'Carro', emoji: '☀️', custo: 15, preco: 44.9, emb: 1.5,
      porque: 'Vende o ano todo no Brasil, mais no verão. Serve em qualquer carro, sem variação de modelo.', risco: 'Frágil no transporte.' },
    { nome: 'Lixeira de carro com tampa', cat: 'Carro', mercado: 'Carro', emoji: '🗑️', custo: 9, preco: 27.9, emb: 1,
      porque: 'Item de impulso, bom para completar carrinho e para kit de organização.', risco: 'Lucro baixo vendida sozinha.' },
    { nome: 'Aspirador portátil automotivo', cat: 'Carro', mercado: 'Carro', emoji: '🌀', custo: 35, preco: 99.9, emb: 2.5,
      porque: 'Ticket mais alto e apelo forte para quem tem pet no carro. Combina com a capa pet em anúncio.', risco: 'Eletrônico: mais devolução e possível exigência de certificação. A R$ 99,90 a Shopee cobra R$ 16 fixos.' },
    { nome: 'Kit organização do carro (porta-malas + banco + lixeira)', cat: 'Carro', mercado: 'Carro', emoji: '🚗', custo: 65, preco: 149.9, emb: 3,
      porque: 'Sobe o ticket para onde o Mercado Livre não cobra custo fixo. Depende da cotação do organizador (Organibox).', risco: 'Custo do organizador ainda sem cotação de atacado.' },
    { nome: 'Garrafa térmica com marcador de temperatura', cat: 'Acessórios', mercado: 'Casa e presente', emoji: '🧴', custo: 16, preco: 44.9, emb: 1.5,
      porque: 'Fora do nicho automotivo: vende como presente (Natal, amigo secreto) e ajuda a não depender de uma categoria só.', risco: 'Concorrência grande e muita variação de qualidade.' }
  ];

  const marcos = [
    { id: 'taxas', t: 'Confirmar as taxas na central do vendedor', d: 'Shopee e Mercado Livre. As fontes de terceiros divergem.' },
    { id: 'cotacao', t: 'Pedir cotação a 3 fornecedores', d: 'Use o botão "Perguntas" na ficha do fornecedor.' },
    { id: 'lote1', t: 'Comprar o primeiro lote pequeno', d: 'Um produto só, para testar anúncio, embalagem e envio.' },
    { id: 'vendas10', t: 'Fazer as 10 primeiras vendas', d: 'Prioridade: avaliações, não lucro.' },
    { id: 'kit', t: 'Montar o primeiro kit acima de R$ 100', d: 'Na Shopee a comissão cai de 20% para 14%.' },
    { id: 'canal2', t: 'Abrir o segundo canal de venda', d: 'Veja a indicação em Plataformas.' },
    { id: 'mei', t: 'Abrir o MEI', d: 'Dá nota fiscal, acesso a fornecedores que só vendem para CNPJ e a plataformas que exigem CNPJ.' },
    { id: 'produto2', t: 'Ter 3 produtos ativos vendendo', d: 'Reduz o risco de depender de um item só.' },
    { id: 'direta', t: 'Criar lista de clientes para venda direta', d: 'Recompra sem comissão.' },
    { id: 'anuncios', t: 'Testar anúncio pago com teto de gasto', d: 'Só depois de ter margem e avaliações.' }
  ];

  const fontes = [
    ['Taxas da Shopee 2026 (Kntria)', 'https://kntria.com.br/guia/taxas-da-shopee/'],
    ['Taxas Shopee 2026 (Precisão Financeira)', 'https://www.precisaofinanceira.com.br/blog/taxas-shopee-2026-comissao-frete'],
    ['Tarifas do Mercado Livre 2026 (Vendedorix)', 'https://vendedorix.com.br/blog/mercado-livre-tarifas-2026-tabela-completa'],
    ['Taxas do Mercado Livre 2026 (Nação Digital)', 'https://nacao.digital/blog/taxas-do-mercado-livre/'],
    ['Guia 2026 de comissões do TikTok Shop (oficial)', 'https://seller.tiktok.com/br/blog/guia-2026-comiss-es-e-taxas-do-tiktok-shop-explicadas/10025289/'],
    ['Guia de marketplaces do Brasil 2026 (Yav)', 'https://yav.com.br/blog/guia-marketplaces-brasil-2026/'],
    ['Comparativo de fees 2026 (GoSmarter)', 'https://gosmarter.com.br/comparativo-fees-marketplaces-mercado-livre-shopee-amazon-magalu-americanas/'],
    ['Produtos mais vendidos na Shopee em 2026 (Hunterhub)', 'https://hunterhub.com.br/blog/produtos-mais-vendidos-na-shopee/'],
    ['Limite do MEI 2026 (Contmatic)', 'https://simplifique.contmatic.com.br/blogs/mei-2026-limite-faturamento-o-que-muda']
  ];

  // Avisos que dependem do preço e que a conta não cobre
  const ML = p => p >= 79 ? 'Falta descontar o frete grátis, que a partir de R$ 79 é em parte por sua conta.' : null;
  const NOTAS = { 'ml-classico': ML, 'ml-premium': ML, tiktok: () => 'Sem o programa de frete grátis (mais 6%) e sem afiliados.',
    shopee: p => p >= 80 && p < 100 ? 'Faixa ruim: taxa fixa de R$ 16. Compare com R$ 79,90 ou com R$ 100.' : null, direta: () => 'Você cuida da entrega e da cobrança.' };
  plataformas.forEach(p => { p.nota = NOTAS[p.id] || (() => null); });

  return { DATA, plataformas, ideias, marcos, fontes, LIMITE_MEI: 81000, DAS_MEI: 82.05 };
})();
