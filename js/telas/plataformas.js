/* Plataformas: onde vender cada produto considerando as taxas, e guia de cada plataforma.
   Usa as faixas da pesquisa (DadosCrescer), inclusive de plataformas que você ainda não cadastrou como canal. */
Telas.plataformas = (function () {
  'use strict';
  const { h, ic, moeda, pct } = UI;
  const S = Dados.S;
  const st = { produtoId: '', custo: '', preco: '' };

  const faixasGuia = () => DadosCrescer.plataformas.flatMap(p => p.faixas.map(f => ({ canal_id: p.id, preco_de: f.de, preco_ate: f.ate, comissao_pct: f.pct, taxa_fixa: f.fixa })));
  const canalDe = p => S.canais.find(c => c.nome.toLowerCase() === p.nome.toLowerCase());
  // O adicional de CPF da pesquisa é só da Shopee; nas outras a conta ignora
  function ranking(custo, preco, emb) {
    const cfg = Dados.cfg(), fx = faixasGuia();
    return DadosCrescer.plataformas.map(p => ({ p, r: Calc.lucroPreco({ preco, custo, canalId: p.id, faixas: fx, embalagem: emb,
      cfg: p.id === 'shopee' ? cfg : Object.assign({}, cfg, { adicional_cpf: 0 }) }) })).sort((a, b) => b.r.lucro - a.r.lucro);
  }
  const custoDe = (p, idx) => idx[p.id].custoMedio || Number(p.custo_estimado) || 0;

  function render() {
    const cfg = Dados.cfg(), idx = Calc.indexar(S.produtos, S.movimentacoes);
    const prods = S.produtos.filter(p => p.preco_venda && custoDe(p, idx) > 0).sort((a, b) => (b.ativo - a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR'));
    return h`${UI.cabecalho({ titulo: 'Plataformas', sub: 'Onde vender, considerando as taxas' })}
      <div class="aviso-caixa">Taxas pesquisadas em ${DadosCrescer.DATA} em guias de terceiros, que divergem entre si. Onde havia intervalo usei o meio. <b>Confirme na central do vendedor</b> antes de precificar. A conta não inclui frete, anúncios pagos nem devoluções.</div>
      ${cfg.tipo_vendedor === 'CPF' && Number(cfg.adicional_cpf) > 0 ? h`<div class="info-caixa"><b>Sobre o adicional de CPF de ${moeda(cfg.adicional_cpf)}:</b> segundo a pesquisa, a Shopee só cobra os R$ 3 a mais de vendedor pessoa física com mais de 450 pedidos em 90 dias. Quem está começando não paga. Hoje o sistema desconta esse valor de todas as vendas, em todos os canais.
        <button type="button" class="btn peq" style="margin-top:8px" data-acao="plat.zerarCpf">Zerar o adicional de CPF</button></div>` : ''}
      ${UI.secao('Indicação para um produto', h`<form class="card" data-form="plat.nada">
        ${UI.selecao('Produto', 'produto', [{ v: '', t: 'Digitar à mão' }, ...prods.map(p => ({ v: p.id, t: p.nome + (p.ativo ? '' : ' (inativo)') }))], st.produtoId, { extra: 'data-muda="plat.produto"' })}
        <div class="grade2">${UI.campo('Custo (R$)', 'custo', { dec: true, valor: st.custo, extra: 'data-digitar="plat.calc"' })}${UI.campo('Preço de venda (R$)', 'preco', { dec: true, valor: st.preco, extra: 'data-digitar="plat.calc"' })}</div>
        <div id="plat-res">${resultado()}</div></form>`)}
      ${UI.secao('Melhor plataforma para cada produto', h`<div class="card">${UI.tabela([{ t: 'Produto' }, { t: 'Preço', cls: 'r' }, { t: 'Melhor (aceita CPF)' }, { t: 'Lucro', cls: 'r' }, { t: 'Shopee', cls: 'r' }],
        prods.map(p => { const rk = ranking(custoDe(p, idx), Number(p.preco_venda), p.embalagem), m = rk.find(x => /Aceita CPF/.test(x.p.cnpj) && x.p.id !== 'direta'), sh = rk.find(x => x.p.id === 'shopee');
          return [h`<a href="#/estoque/${p.id}">${p.nome}</a>`, moeda(p.preco_venda), m.p.nome, h`<b class="${m.r.lucro < 0 ? 'neg' : 'pos'}">${moeda(m.r.lucro)}</b>`, h`<span class="${sh.r.lucro < 0 ? 'neg' : ''}">${moeda(sh.r.lucro)}</span>`]; }),
        'Cadastre produtos com custo e preço para ver a indicação.')}
        <small style="display:block;margin-top:8px">Considera só plataformas que aceitam vender como pessoa física, sem contar a venda direta. No Mercado Livre, a partir de R$ 79, ainda falta descontar a sua parte do frete grátis: o lucro real é menor que o mostrado. Custo médio das entradas ou, sem entrada, o custo estimado.</small></div>`)}
      ${UI.secao('Regras práticas', h`<div class="card"><ul class="lista-pontos" style="margin:0">
        <li><b>Até R$ 49:</b> TikTok Shop (10% + R$ 4) e Shopee (20% + R$ 4,50) cobram taxa fixa que pesa. Venda em kit para subir o preço.</li>
        <li><b>R$ 50 a R$ 79:</b> TikTok Shop tem a menor taxa (6% + R$ 6). Na Shopee ainda são 20%.</li>
        <li><b>R$ 80 a R$ 99:</b> evite a Shopee (taxa fixa salta para R$ 16). Mercado Livre Clássico não tem custo fixo a partir de R$ 79, mas o frete grátis passa a ser seu.</li>
        <li><b>R$ 100 ou mais:</b> a Shopee volta a ser competitiva (14%). Kits acima de R$ 100 rendem mais que o item avulso.</li>
        <li><b>Cliente que já comprou:</b> venda direta, sem comissão.</li></ul></div>`)}
      ${UI.secao('Guia das plataformas', h`<div class="ideias-grade">${DadosCrescer.plataformas.map(p => { const c = canalDe(p);
        return h`<section class="card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><h3 style="font-size:1.05rem">${p.nome}</h3><span class="pilula ${/Aceita CPF/.test(p.cnpj) ? 'ok' : /Exige|Costuma/.test(p.cnpj) ? 'neg' : 'neutra'}">${p.cnpj}</span></div>
          <p style="margin:6px 0;font-weight:600;font-size:.9rem">${p.resumo}</p><p class="mudo" style="font-size:.85rem">${p.perfil}</p>
          <ul class="lista-pontos">${p.forte.map(x => h`<li><span class="pos">+</span> ${x}</li>`)}${p.cuidado.map(x => h`<li><span class="aviso-txt">!</span> ${x}</li>`)}</ul>
          <button type="button" class="btn ${c ? 'sec' : 'primario'} peq bloco" style="margin-top:12px" data-acao="plat.canal" data-id="${p.id}">${c ? 'Trocar as taxas do meu canal pelas da pesquisa' : h`${ic('mais')} Adicionar aos meus canais`}</button></section>`; })}</div>`)}
      ${UI.secao('Fontes', h`<div class="card lista">${DadosCrescer.fontes.map(([t, u]) => h`<a class="linha" href="${u}" target="_blank" rel="noopener"><div class="meio"><b style="white-space:normal">${t}</b></div>${ic('link', 'seta')}</a>`)}</div>`)}`;
  }

  function resultado() {
    const custo = UI.numero(st.custo), preco = UI.numero(st.preco);
    if (custo === null || !preco) return h`<p class="mudo" style="font-size:.88rem">Escolha um produto ou informe custo e preço.</p>`;
    const p = S.produtos.find(x => x.id === st.produtoId), rk = ranking(custo, preco, p ? p.embalagem : null);
    return UI.tabela([{ t: 'Plataforma' }, { t: 'Taxas', cls: 'r' }, { t: 'Lucro', cls: 'r' }, { t: 'Margem', cls: 'r' }],
      rk.map((x, i) => [h`${x.p.nome}${i === 0 ? h` <span class="pilula ok">melhor</span>` : ''}<br><small>${x.p.cnpj}${x.p.nota(preco) ? h` · <span class="aviso-txt">${x.p.nota(preco)}</span>` : ''}</small>`, moeda(x.r.comissao + x.r.taxa_fixa + x.r.adicional_cpf),
        h`<b class="${x.r.lucro < 0 ? 'neg' : 'pos'}">${moeda(x.r.lucro)}</b>`, pct(x.r.margem, 1)]));
  }
  const ler = () => { const f = document.querySelector('[data-form="plat.nada"]'); if (f) { st.custo = f.elements.custo.value; st.preco = f.elements.preco.value; } };
  UI.aoDigitar['plat.calc'] = () => { ler(); const el = document.getElementById('plat-res'); if (el) UI.render(el, resultado()); };
  UI.aoMudar['plat.produto'] = el => {
    st.produtoId = el.value;
    const p = S.produtos.find(x => x.id === el.value);
    if (p) { const idx = Calc.indexar([p], S.movimentacoes.filter(m => m.produto_id === p.id)); st.custo = UI.campoMoeda(custoDe(p, idx)); st.preco = UI.campoMoeda(p.preco_venda); }
    App.atualizar();
  };
  UI.acoes['plat.zerarCpf'] = async (d, el) => {
    if (!(await UI.confirmar({ titulo: 'Zerar o adicional de CPF', texto: 'O sistema deixa de descontar o adicional nas próximas vendas e nas simulações. As vendas já lançadas não mudam. Você pode voltar o valor em Ajustes > Custos padrão.', ok: 'Zerar' }))) return;
    await UI.ocupado(el, async () => { await Dados.salvarConfig({ adicional_cpf: 0 }); App.atualizar(); UI.aviso('Adicional de CPF zerado'); });
  };
  UI.acoes['plat.canal'] = async (d, el) => {
    const p = DadosCrescer.plataformas.find(x => x.id === d.id), c = canalDe(p);
    if (c && !(await UI.confirmar({ titulo: `Trocar as taxas de ${c.nome}`, texto: 'As faixas de taxa atuais deste canal são apagadas e entram as da pesquisa. As vendas já lançadas não mudam.', ok: 'Trocar' }))) return;
    await UI.ocupado(el, async () => {
      let canal = c;
      if (canal) for (const f of S.faixas_taxa.filter(x => x.canal_id === canal.id)) await Dados.remover('faixas_taxa', f.id);
      else canal = await Dados.inserir('canais', { nome: p.nome, ordem: S.canais.length });
      await Dados.inserirVarios('faixas_taxa', p.faixas.map(f => ({ canal_id: canal.id, preco_de: f.de, preco_ate: f.ate, comissao_pct: f.pct, taxa_fixa: f.fixa,
        observacao: `Pesquisa de ${DadosCrescer.DATA}. ${p.resumo}. Confirmar na central do vendedor.` })));
      App.atualizar(); UI.aviso(c ? 'Taxas atualizadas' : `${p.nome} adicionado aos seus canais`);
    });
  };

  return { render };
})();
