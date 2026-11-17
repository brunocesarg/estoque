/* Dicas de mercado: o que os dados dizem, o que fazer com isso, as próximas datas de venda
   e recomendações calculadas em cima do seu próprio cadastro. Cada dado traz a fonte. */
Telas.dicas = (function () {
  'use strict';
  const { h, ic, moeda, pct } = UI;
  const S = Dados.S;
  let tema = '';

  // Recomendações tiradas dos seus números (cadastro + taxas dos seus canais)
  function doSeuCadastro() {
    const cfg = Dados.cfg(), idx = Calc.indexar(S.produtos, S.movimentacoes), out = [];
    const canal = Telas.estoque.canalPadrao(), nomeCanal = Telas.estoque.nomeCanal(canal) || 'canal padrão';
    const linhas = S.produtos.filter(p => p.preco_venda).map(p => ({ p, l: Telas.estoque.lucroEstimado(p, idx[p.id]) })).filter(x => x.l && !x.l.semFaixa);
    const melhores = linhas.slice().sort((a, b) => b.l.lucro - a.l.lucro).slice(0, 3);
    if (melhores.length) out.push({ t: 'Comece por estes', d: `Maior lucro por venda no ${nomeCanal}: ${melhores.map(x => `${x.p.nome} (${moeda(x.l.lucro)})`).join('; ')}.` });
    const ruins = linhas.filter(x => x.l.margem < cfg.margem_minima_pct / 100).sort((a, b) => a.l.margem - b.l.margem).slice(0, 4);
    if (ruins.length) out.push({ t: 'Não compre ainda', d: `Abaixo da sua margem mínima de ${UI.decimal(cfg.margem_minima_pct, 0)}% no ${nomeCanal}: ${ruins.map(x => `${x.p.nome} (${pct(x.l.margem)})`).join('; ')}. Só valem em kit ou com custo menor.` });
    const faixaRuim = S.produtos.filter(p => p.preco_venda >= 80 && p.preco_venda < 100);
    if (faixaRuim.length) out.push({ t: 'Preço na faixa cara da Shopee', d: `${faixaRuim.map(p => `${p.nome} (${moeda(p.preco_venda)})`).join('; ')}. Entre R$ 80 e R$ 99,99 a taxa fixa é de R$ 16. Teste R$ 79,90 ou um kit acima de R$ 100 no Simulador.` });
    const semCotacao = S.produtos.filter(p => !S.fornecedor_produtos.some(c => c.produto_id === p.id) && !idx[p.id].primeiraEntrada).length;
    if (semCotacao) out.push({ t: 'Custos ainda estimados', d: `${semCotacao} produto${semCotacao === 1 ? '' : 's'} sem cotação de fornecedor nem compra. O lucro mostrado depende de confirmar o custo: use o botão "Perguntas" na ficha do fornecedor.` });
    if (cfg.tipo_vendedor === 'CPF' && Number(cfg.adicional_cpf) > 0) out.push({ t: 'Adicional de CPF', d: `O sistema desconta ${moeda(cfg.adicional_cpf)} por item em todas as vendas. Pela pesquisa, a Shopee só cobra isso de quem passa de 450 pedidos em 90 dias. Veja em Plataformas.` });
    const cats = new Set(S.produtos.filter(p => p.ativo).map(p => p.categoria_id));
    if (S.produtos.some(p => p.ativo) && cats.size === 1) out.push({ t: 'Uma categoria só', d: 'Todos os produtos ativos são da mesma categoria. Um segundo nicho (pet ou moto) reduz o risco de depender de um público só.' });
    return out;
  }

  function render() {
    const hoje = Calc.hoje(), temas = [...new Set(DadosCrescer.dicas.map(d => d.tema))];
    const prox = DadosCrescer.datas.filter(x => x.d >= hoje).slice(0, 6);
    const seus = doSeuCadastro();
    return h`${UI.cabecalho({ titulo: 'Dicas de mercado', sub: 'O que os dados dizem e o que fazer com isso' })}
      ${seus.length ? UI.secao('No seu cadastro', h`<div class="card lista">${seus.map(x => h`<div class="linha"><div class="meio"><b style="white-space:normal">${x.t}</b><span style="white-space:normal">${x.d}</span></div></div>`)}</div>`) : ''}
      ${UI.secao('Próximas datas de venda', h`<div class="card lista">${prox.map(x => { const dias = Calc.diffDias(hoje, x.d), prazo = dias - x.antes;
        return h`<div class="linha"><div class="meio"><b style="white-space:normal">${x.t} · ${UI.dataCurta(x.d)}</b><span style="white-space:normal">${x.o}</span></div>
          <div class="fim">${dias === 0 ? 'hoje' : `${dias} dias`}<small class="${prazo < 0 ? 'aviso-txt' : ''}">${prazo < 0 ? 'estoque já deveria estar pronto' : `preparar em ${prazo} dias`}</small></div></div>`; })}</div>`)}
      ${UI.secao('O que a pesquisa de mercado mostra', h`${UI.chips([{ v: '', t: 'Tudo' }, ...temas.map(t => ({ v: t, t }))], tema, 'dc.tema')}
        <div class="ideias-grade" style="margin-top:10px">${DadosCrescer.dicas.filter(d => !tema || d.tema === tema).map(d => h`<section class="card"><span class="pilula neutra">${d.tema}</span>
          <p style="margin:8px 0;font-size:.9rem;line-height:1.5">${d.dado}</p>
          <div class="info-caixa" style="margin:0"><b>O que fazer:</b> ${d.acao}</div>
          <a class="btn-texto" style="display:inline-block;margin-top:8px;font-size:.8rem" href="${d.fonte[1]}" target="_blank" rel="noopener">Fonte: ${d.fonte[0]}</a></section>`)}</div>`)}
      <p class="mudo" style="margin:14px 4px;font-size:.82rem">Dados de ${DadosCrescer.DATA} e do dia seguinte, de associações do setor e de guias de terceiros. Não achei dados confiáveis de margem por categoria nem de preço médio por produto: para isso, olhe os anúncios mais vendidos de cada item antes de comprar.</p>
      <div class="botoes"><a class="btn sec" href="#/ideias">Ver os candidatos</a><a class="btn sec" href="#/plataformas">Onde vender</a></div>`;
  }
  UI.acoes['dc.tema'] = d => { tema = d.v; App.atualizar(); };
  return { render };
})();
