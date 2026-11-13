/* Painel: cartões de resumo, gráficos e alertas. Cada cartão abre o detalhamento daquele dado.
   Tudo filtrável por período, categoria e canal, e comparado com o período anterior. */
Telas.painel = (function () {
  'use strict';
  const { h, ic, moeda, moeda0, pct, inteiro, decimal } = UI;
  const S = Dados.S;
  const F = { periodo: '30d', de: null, ate: null, categoria: null, canal: null };
  let ultimo = null;

  const CATALOGO = [
    { id: 'lucro', titulo: 'Lucro', desc: 'Lucro do período e para onde foi cada real', padrao: true },
    { id: 'faturamento', titulo: 'Faturamento', desc: 'Quanto entrou em vendas', padrao: true },
    { id: 'margem', titulo: 'Margem', desc: 'Margem por produto e alerta de margem baixa', padrao: true },
    { id: 'vendas', titulo: 'Vendas', desc: 'Quantidade, por dia da semana e por canal', padrao: true },
    { id: 'estoque', titulo: 'Estoque', desc: 'Dinheiro parado e dias de cobertura', padrao: true },
    { id: 'reposicao', titulo: 'Reposição', desc: 'Produtos abaixo do mínimo, com sugestão de compra', padrao: true },
    { id: 'parados', titulo: 'Produtos parados', desc: 'Sem venda há muito tempo e o dinheiro preso', padrao: true },
    { id: 'equilibrio', titulo: 'Ponto de equilíbrio', desc: 'Vendas que faltam para cobrir os custos fixos', padrao: true },
    { id: 'projecao', titulo: 'Projeção do mês', desc: 'Lucro estimado mantendo o ritmo atual', padrao: false },
    { id: 'abc', titulo: 'Curva ABC', desc: 'Quais produtos geram 80% do lucro', padrao: false },
    { id: 'lotes', titulo: 'Retorno por lote', desc: 'Quanto cada compra já devolveu e em quantos dias se pagou', padrao: false },
    { id: 'giro', titulo: 'Giro', desc: 'Giro e dias de cobertura por produto e categoria', padrao: false },
    { id: 'taxas', titulo: 'Peso das taxas', desc: 'Quanto do faturamento fica com cada plataforma', padrao: false },
    { id: 'perdas', titulo: 'Devoluções e perdas', desc: 'Taxa por produto e por canal, e o custo', padrao: false },
    { id: 'preco', titulo: 'Preço praticado', desc: 'Preço médio vendido contra o sugerido', padrao: false },
    { id: 'catcanal', titulo: 'Categoria × canal', desc: 'Onde cada categoria vende melhor', padrao: false },
    { id: 'melhordia', titulo: 'Melhor dia da semana', desc: 'Em que dia as vendas rendem mais', padrao: false }
  ];
  const info = id => CATALOGO.find(c => c.id === id);

  // Cartões na ordem e com a visibilidade escolhidas em Ajustes > Painel
  function cartoesConfig() {
    const salvo = Array.isArray(Dados.cfg().painel_cartoes) ? Dados.cfg().painel_cartoes : [];
    const out = [];
    for (const s of salvo) { const c = info(s.id); if (c && !out.find(o => o.id === c.id)) out.push(Object.assign({}, c, { v: !!s.v })); }
    for (const c of CATALOGO) if (!out.find(o => o.id === c.id)) out.push(Object.assign({}, c, { v: c.padrao }));
    return out;
  }

  /* ───────── Contexto: tudo o que as contas precisam, calculado uma vez ───────── */
  function ctx() {
    const cfg = Dados.cfg(), hoje = Calc.hoje();
    const prod = Object.fromEntries(S.produtos.map(p => [p.id, p]));
    const per = Calc.periodo(F.periodo, hoje, F.de, F.ate);
    const filtro = { categoriaId: F.categoria, canalId: F.canal };
    const movs = Calc.filtrar(S.movimentacoes, Object.assign({ de: per.de, ate: per.ate }, filtro), prod);
    const ant = Calc.anterior(per);
    const movsAnt = ant ? Calc.filtrar(S.movimentacoes, Object.assign({}, filtro, ant), prod) : null;
    const idx = Calc.indexar(S.produtos, S.movimentacoes);
    const noEscopo = p => !F.categoria || (F.categoria === 'sem' ? !p.categoria_id : p.categoria_id === F.categoria);
    return { cfg, hoje, prod, per, ant, movs, movsAnt, R: Calc.resumo(movs), Ra: movsAnt ? Calc.resumo(movsAnt) : null, idx,
      escopo: S.produtos.filter(p => p.ativo && noEscopo(p)), noEscopo,
      vp: movs.filter(m => m.tipo === 'venda' || m.tipo === 'devolucao' || m.tipo === 'perda'),
      vd: movs.filter(m => m.tipo === 'venda' || m.tipo === 'devolucao') };
  }
  const nomeProd = (c, id) => (c.prod[id] || {}).nome || '—';
  const linkProd = (c, id) => h`<a href="#/estoque/${id}">${nomeProd(c, id)}</a>`;
  const nomeCat = id => id === 'sem' ? 'Sem categoria' : ((S.categorias.find(x => x.id === id) || {}).nome || '—');
  const corCat = id => (S.categorias.find(x => x.id === id) || {}).cor;
  const nomeCanal = id => id === 'sem' ? 'Sem canal' : ((S.canais.find(x => x.id === id) || {}).nome || '—');
  const nomeForn = id => (S.fornecedores.find(x => x.id === id) || {}).nome;
  const catDe = (c, m) => (c.prod[m.produto_id] || {}).categoria_id || 'sem';
  const ritmo = (c, p) => Calc.ritmoDiario(c.idx[p.id].movs, c.hoje, 30);

  function variacao(atual, ant, inverso) {
    const v = Calc.variacao(atual, ant);
    if (v === null) return null;
    const bom = inverso ? v <= 0 : v >= 0;
    return h`<span class="${bom ? 'pos' : 'neg'}">${UI.sinal(v)}</span> sobre o período anterior`;
  }

  /* ───────── Contas de cada cartão ───────── */
  function calcReposicao(c) {
    return c.escopo.map(p => ({ p, i: c.idx[p.id], min: Telas.estoque.minimoDe(p) })).filter(x => x.i.estoque <= x.min)
      .map(x => { const r = ritmo(c, x.p); return Object.assign(x, { ritmo: r, sugerida: Math.max(x.min * 2 - x.i.estoque, Math.ceil(r * 30) - x.i.estoque, 1) }); })
      .sort((a, b) => a.i.estoque - b.i.estoque);
  }
  function calcParados(c) {
    const lim = c.cfg.dias_parado;
    return c.escopo.map(p => { const i = c.idx[p.id], desde = i.ultimaVenda || i.primeiraEntrada;
      return { p, i, desde, dias: desde ? Calc.diffDias(desde, c.hoje) : null, nunca: !i.ultimaVenda }; })
      .filter(x => x.i.estoque > 0 && x.dias !== null && x.dias >= lim).sort((a, b) => b.i.valorEstoque - a.i.valorEstoque);
  }
  function calcEquilibrio(c) {
    const ini = Calc.inicioMes(c.hoje);
    const movsMes = S.movimentacoes.filter(m => m.data >= ini && m.data <= c.hoje);
    const fixos = S.custos_fixos.filter(x => x.mes === ini).reduce((s, x) => s + Number(x.valor), 0);
    return Calc.equilibrio({ movsMes, fixos, hojeStr: c.hoje });
  }
  function calcMargens(c) {
    const min = c.cfg.margem_minima_pct / 100;
    return Calc.agruparResumo(c.vp.filter(m => m.tipo !== 'perda'), m => m.produto_id).filter(g => g.receita > 0)
      .map(g => Object.assign(g, { abaixo: g.margem !== null && g.margem < min - 1e-9 })).sort((a, b) => b.margem - a.margem);
  }
  function calcGiro(c) {
    const de = c.per.de || (c.movs.map(m => m.data).sort()[0]) || c.hoje, ate = c.per.ate || c.hoje;
    return c.escopo.map(p => {
      const ms = c.idx[p.id].movs, vend = ms.filter(m => m.data >= de && m.data <= ate);
      const un = vend.reduce((s, m) => s + (m.tipo === 'venda' ? m.quantidade : m.tipo === 'devolucao' ? -m.quantidade : 0), 0);
      const medio = (Calc.estoqueEm(ms, Calc.addDias(de, -1)) + Calc.estoqueEm(ms, ate)) / 2;
      const r = ritmo(c, p);
      return { p, un, medio, giro: medio > 0 ? un / medio : null, cobertura: r > 0 ? c.idx[p.id].estoque / r : null, estoque: c.idx[p.id].estoque };
    });
  }
  const cartoes = {
    lucro: c => ({ valor: moeda(c.R.lucro), sub: variacao(c.R.lucro, c.Ra && c.Ra.lucro) }),
    faturamento: c => ({ valor: moeda(c.R.receita), sub: variacao(c.R.receita, c.Ra && c.Ra.receita) }),
    margem: c => ({ valor: pct(c.R.margem, 1), sub: c.R.margem === null ? '' : (c.R.margem * 100 < c.cfg.margem_minima_pct ? h`<span class="neg">abaixo do mínimo de ${decimal(c.cfg.margem_minima_pct, 0)}%</span>` : h`<span class="pos">acima do mínimo de ${decimal(c.cfg.margem_minima_pct, 0)}%</span>`) }),
    vendas: c => ({ valor: inteiro(c.R.vendas), sub: variacao(c.R.vendas, c.Ra && c.Ra.vendas) || `${inteiro(c.R.unidades)} unidades` }),
    estoque: c => { const v = c.escopo.reduce((s, p) => s + c.idx[p.id].valorEstoque, 0), u = c.escopo.reduce((s, p) => s + Math.max(c.idx[p.id].estoque, 0), 0); return { valor: moeda0(v), sub: `${inteiro(u)} itens em estoque` }; },
    reposicao: c => { const n = calcReposicao(c).length; return { valor: n ? `${n} produto${n === 1 ? '' : 's'}` : 'Tudo certo', sub: n ? h`<span class="aviso-txt">abaixo do mínimo</span>` : 'nada abaixo do mínimo' }; },
    parados: c => { const l = calcParados(c); return { valor: l.length ? moeda0(l.reduce((s, x) => s + x.i.valorEstoque, 0)) : 'Nenhum', sub: l.length ? `${l.length} produto${l.length === 1 ? '' : 's'} sem venda há ${c.cfg.dias_parado}+ dias` : `sem venda há ${c.cfg.dias_parado}+ dias` }; },
    equilibrio: c => { const e = calcEquilibrio(c); return { valor: e.fixos === 0 ? 'Sem custos' : e.resultado >= 0 ? 'Coberto' : (e.faltam === null ? 'Sem lucro' : `Faltam ${e.faltam}`), sub: e.fixos === 0 ? 'cadastre os custos fixos' : e.resultado >= 0 ? `sobram ${moeda(e.resultado)} no mês` : `vendas para cobrir ${moeda0(e.fixos)}` }; },
    projecao: c => { const e = calcEquilibrio(c); return { valor: moeda0(e.projecao), sub: `lucro estimado no mês (dia ${e.dia} de ${e.dias})` }; },
    abc: c => { const l = Calc.curvaABC(Calc.agruparResumo(c.vp.filter(m => m.tipo !== 'perda'), m => m.produto_id)); const a = l.filter(x => x.classe === 'A').length; return { valor: `${a} produto${a === 1 ? '' : 's'} A`, sub: 'geram 80% do lucro' }; },
    lotes: c => { const ls = Calc.lotes(S.produtos, S.movimentacoes).filter(l => c.noEscopo(c.prod[l.produto_id])); const pagos = ls.filter(l => l.dias !== null); return { valor: `${pagos.length} de ${ls.length}`, sub: 'lotes já pagos' }; },
    giro: c => { const g = calcGiro(c).filter(x => x.giro !== null); const m = g.length ? g.reduce((s, x) => s + x.giro, 0) / g.length : null; return { valor: m === null ? '—' : decimal(m, 1) + 'x', sub: 'giro médio no período' }; },
    taxas: c => ({ valor: c.R.receita > 0 ? pct(c.R.taxas / c.R.receita, 1) : '—', sub: `${moeda(c.R.taxas)} para as plataformas` }),
    perdas: c => { const d = custoDevolucoes(c); return { valor: moeda(c.R.perdas + d), sub: `${c.R.devolucoes} devoluç${c.R.devolucoes === 1 ? 'ão' : 'ões'} · ${c.R.perdidas} perda${c.R.perdidas === 1 ? '' : 's'}` }; },
    preco: c => { const l = calcPreco(c).filter(x => x.dif !== null); const m = l.length ? l.reduce((s, x) => s + x.dif, 0) / l.length : null; return { valor: m === null ? '—' : UI.sinal(m, 1), sub: 'preço médio vs. sugerido' }; },
    catcanal: c => { const g = Calc.agruparResumo(c.vd, m => catDe(c, m) + '|' + (m.canal_id || 'sem')); if (!g.length) return { valor: '—', sub: 'sem vendas no período' }; const [cat, can] = g[0].chave.split('|'); return { valor: `${nomeCat(cat)} × ${nomeCanal(can)}`, sub: 'combinação de maior lucro' }; },
    melhordia: c => { const g = Calc.agruparResumo(c.vd.filter(m => m.tipo === 'venda'), m => Calc.diaSemana(m.data)); return g.length ? { valor: UI.DIAS[g[0].chave], sub: `${moeda(g[0].lucro)} de lucro nesse dia` } : { valor: '—', sub: 'sem vendas no período' }; }
  };
  const custoDevolucoes = c => -c.movs.filter(m => m.tipo === 'devolucao').reduce((s, m) => s + Calc.lucroMov(m), 0);
  function calcPreco(c) {
    return Calc.agruparResumo(c.movs.filter(m => m.tipo === 'venda'), m => m.produto_id).map(g => {
      const bruto = g.movs.reduce((s, m) => s + m.preco_venda * m.quantidade, 0), un = g.movs.reduce((s, m) => s + m.quantidade, 0), med = un ? bruto / un : null;
      const sug = (c.prod[g.chave] || {}).preco_venda;
      return { id: g.chave, un, medio: med, sugerido: sug ? Number(sug) : null, dif: med !== null && sug ? (med - sug) / sug : null };
    });
  }

  /* ───────── Filtros ───────── */
  function barraFiltros() {
    const cats = Dados.catsOrdenadas(), canais = Dados.canaisOrdenados();
    const semCat = S.produtos.some(p => !p.categoria_id);
    const per = [{ v: 'hoje', t: 'Hoje' }, { v: '7d', t: '7 dias' }, { v: '30d', t: '30 dias' }, { v: 'mes', t: 'Este mês' }, { v: 'mesant', t: 'Mês anterior' }, { v: 'tudo', t: 'Tudo' }, { v: 'custom', t: F.periodo === 'custom' ? `${UI.dataCurta(F.de)} a ${UI.dataCurta(F.ate)}` : 'Datas…' }];
    return h`<div class="filtros">
      ${UI.chips(per, F.periodo, 'pn.periodo')}
      ${UI.chips([{ v: '', t: 'Todas as categorias' }, ...cats.map(c => ({ v: c.id, t: c.nome, cor: c.cor })), ...(semCat ? [{ v: 'sem', t: 'Sem categoria' }] : [])], F.categoria || '', 'pn.categoria')}
      ${canais.length > 1 ? UI.chips([{ v: '', t: 'Todos os canais' }, ...canais.map(c => ({ v: c.id, t: c.nome }))], F.canal || '', 'pn.canal') : ''}</div>`;
  }
  UI.acoes['pn.periodo'] = d => {
    if (d.v !== 'custom') { F.periodo = d.v; App.atualizar(); return; }
    const p = Calc.periodo('30d');
    UI.folha({ titulo: 'Escolher período', corpo: h`<form data-form="pn.datas">
      <div class="grade2">${UI.campo('De', 'de', { tipo: 'date', valor: F.de || p.de })}${UI.campo('Até', 'ate', { tipo: 'date', valor: F.ate || p.ate })}</div>
      <div class="botoes"><button type="button" class="btn sec" data-acao="folha.fechar">Cancelar</button><button class="btn primario" type="submit">Aplicar</button></div></form>` });
  };
  UI.aoEnviar['pn.datas'] = (f, d) => {
    const de = d.get('de'), ate = d.get('ate');
    if (!de || !ate || de > ate) { UI.aviso('Confira as datas: a inicial vem antes da final.', 'erro'); return; }
    F.periodo = 'custom'; F.de = de; F.ate = ate; UI.fecharTodas(); App.atualizar();
  };
  UI.acoes['pn.categoria'] = d => { F.categoria = d.v || null; App.atualizar(); };
  UI.acoes['pn.canal'] = d => { F.canal = d.v || null; App.atualizar(); };

  /* ───────── Tela inicial ───────── */
  function inicio() {
    const c = ultimo = ctx();
    if (!S.produtos.length) return h`${UI.cabecalho({ titulo: 'Como está o negócio', sub: UI.mesAno(c.hoje) })}
      <div class="card">${UI.vazio('Ainda não há produtos. Comece pela carga inicial da pesquisa ou cadastre o primeiro produto.', h`<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <a class="btn primario" href="#/ajustes/dados">Carga inicial</a><a class="btn sec" href="#/estoque">Cadastrar produto</a></div>`)}</div>`;
    const lista = cartoesConfig().filter(x => x.v);
    const serie = Calc.serie(c.movs, c.per.de, c.per.ate).pontos.slice(-14);
    const maxS = Math.max(...serie.map(p => Math.abs(p.lucro)), 1);
    return h`${UI.cabecalho({ titulo: 'Como está o negócio', sub: `${c.per.rotulo}${c.per.de ? ` · ${UI.dataCurta(c.per.de)} a ${UI.dataCurta(c.per.ate)}` : ''}` })}
      ${barraFiltros()}
      <div class="cartoes" style="margin-top:12px">${lista.map((x, i) => {
        const v = cartoes[x.id](c), grande = i === 0;
        return h`<a class="tile${grande ? ' largo' : ''}" href="#/painel/${x.id}"><div class="rot"><span>${x.titulo}</span>${ic('seta')}</div><div class="val">${v.valor}</div>
          ${v.sub ? h`<div class="var">${v.sub}</div>` : ''}
          ${grande && x.id === 'lucro' && serie.length > 1 ? h`<div class="mini-barras" aria-hidden="true">${serie.map(p => h`<i style="height:${Math.max(Math.abs(p.lucro) / maxS * 100, 4).toFixed(0)}%${p.lucro < 0 ? ';background:var(--neg)' : ''}"></i>`)}</div>` : ''}</a>`;
      })}${lista.length ? '' : UI.vazio('Todos os cartões estão escondidos. Escolha quais mostrar em Ajustes > Painel.')}</div>
      ${UI.secao('Lucro e faturamento por dia', h`<div class="card"><div class="grafico-caixa"><canvas id="g-home" aria-label="Gráfico de lucro e faturamento por dia"></canvas></div></div>`)}
      <div class="dois-cols">
        ${UI.secao('Lucro por categoria', h`<div class="card">${barrasCat(c)}</div>`)}
        ${UI.secao('Lucro por canal', h`<div class="card">${barrasCanal(c)}</div>`)}</div>
      ${alertas(c)}`;
  }
  function barrasCat(c, campo = 'lucro') {
    const g = Calc.agruparResumo(c.vp, m => catDe(c, m)).sort((a, b) => b[campo] - a[campo]);
    return UI.barras(g.map(x => ({ rotulo: nomeCat(x.chave), valor: x[campo], texto: moeda(x[campo]), sub: x.margem !== null && campo === 'lucro' ? pct(x.margem) + ' margem' : '', cor: corCat(x.chave), acao: 'pn.categoria', dados: x.chave === 'sem' ? 'sem' : x.chave })));
  }
  function barrasCanal(c, campo = 'lucro') {
    const g = Calc.agruparResumo(c.vd, m => m.canal_id || 'sem').sort((a, b) => b[campo] - a[campo]);
    return UI.barras(g.map(x => ({ rotulo: nomeCanal(x.chave), valor: x[campo], texto: moeda(x[campo]), sub: `${x.vendas} venda${x.vendas === 1 ? '' : 's'}`, acao: 'pn.canal', dados: x.chave === 'sem' ? '' : x.chave })));
  }
  function alertas(c) {
    const itens = [];
    for (const x of calcReposicao(c).slice(0, 4)) itens.push({ p: x.p, txt: x.i.estoque <= 0 ? 'Acabou' : `Restam ${x.i.estoque} unidade${x.i.estoque === 1 ? '' : 's'}`, pil: 'Repor', ordem: 1 });
    for (const x of calcParados(c).slice(0, 3)) itens.push({ p: x.p, txt: `Sem vender há ${x.dias} dias · ${moeda0(x.i.valorEstoque)} parados`, pil: 'Parado', ordem: 2 });
    const min = c.cfg.margem_minima_pct / 100;
    for (const p of c.escopo) { const l = Telas.estoque.lucroEstimado(p, c.idx[p.id]); if (l && l.margem < min - 1e-9) itens.push({ p, txt: `Margem de ${pct(l.margem, 1)} no canal padrão (mínimo ${decimal(c.cfg.margem_minima_pct, 0)}%)`, pil: 'Margem', ordem: 3 }); }
    if (!itens.length) return UI.secao('Precisa de atenção', h`<div class="card">${UI.vazio('Nada pedindo atenção agora.')}</div>`);
    return UI.secao('Precisa de atenção', h`<div class="card lista">${itens.sort((a, b) => a.ordem - b.ordem).slice(0, 8).map(i => h`<a class="linha" href="#/estoque/${i.p.id}">${UI.miniatura(i.p, S.categorias)}
      <div class="meio"><b>${i.p.nome}</b><span>${i.txt}</span></div><span class="pilula">${i.pil}</span></a>`)}</div>`);
  }

  /* ───────── Detalhamento de cada cartão ───────── */
  const CORES_FATIA = ['#7a6bff', '#ff8a5c', '#ffb155', '#e0566b', '#18a8ff', '#8a8fa8', '#c47bff'];
  function paraOndeFoi(c) {
    const R = c.R;
    if (R.receita <= 0) return UI.vazio('Sem vendas no período.');
    const partes = [['Custo do produto', R.custo], ['Comissão', R.comissao], ['Taxa fixa', R.taxa_fixa], ['Adicional CPF', R.adicional_cpf], ['Frete', R.frete], ['Embalagem', R.embalagem], ['Imposto', R.imposto]].filter(p => Math.abs(p[1]) > 0.004);
    const lucroV = R.lucroVendas;
    return h`<div class="empilhada">${partes.map((p, i) => h`<span style="width:${Math.max(p[1] / R.receita * 100, 0).toFixed(2)}%;background:${CORES_FATIA[i % CORES_FATIA.length]}" title="${p[0]}"></span>`)}<span style="width:${Math.max(lucroV / R.receita * 100, 0).toFixed(2)}%;background:var(--pos)" title="Lucro"></span></div>
      <div class="legenda">${partes.map((p, i) => h`<span><i class="bolinha" style="background:${CORES_FATIA[i % CORES_FATIA.length]}"></i> ${p[0]}</span><span class="r">${moeda(p[1])}</span><span class="r mudo">${pct(p[1] / R.receita, 1)}</span>`)}
        <span><i class="bolinha" style="background:var(--pos)"></i> <b>Lucro das vendas</b></span><span class="r"><b>${moeda(lucroV)}</b></span><span class="r mudo">${pct(lucroV / R.receita, 1)}</span></div>
      ${R.perdas > 0 ? h`<small style="display:block;margin-top:10px">As perdas de ${moeda(R.perdas)} ficam fora desta conta e já foram descontadas do lucro.</small>` : ''}`;
  }
  const grafico = id => h`<div class="card"><div class="grafico-caixa"><canvas id="${id}"></canvas></div></div>`;
  const grande = (valor, sub) => h`<div class="card"><div class="numerao">${valor}</div>${sub ? h`<div class="mudo" style="margin-top:4px;font-size:.88rem">${sub}</div>` : ''}</div>`;

  const detalhes = {
    lucro: c => h`${grande(moeda(c.R.lucro), variacao(c.R.lucro, c.Ra && c.Ra.lucro))}
      ${UI.secao('Evolução por dia', grafico('g-detalhe'))}
      ${UI.secao('Para onde foi cada real', h`<div class="card">${paraOndeFoi(c)}</div>`)}
      <div class="dois-cols">${UI.secao('Por categoria', h`<div class="card">${barrasCat(c)}</div>`)}${UI.secao('Por canal', h`<div class="card">${barrasCanal(c)}</div>`)}</div>
      ${UI.secao('Por produto', h`<div class="card">${UI.barras(Calc.agruparResumo(c.vp, m => m.produto_id).slice(0, 12).map(x => ({ rotulo: nomeProd(c, x.chave), valor: x.lucro, texto: moeda(x.lucro), sub: x.margem !== null ? pct(x.margem) + ' margem' : '', acao: 'pn.ir', dados: '#/estoque/' + x.chave })))}</div>`)}`,
    faturamento: c => h`${grande(moeda(c.R.receita), variacao(c.R.receita, c.Ra && c.Ra.receita))}
      <div class="card" style="margin-top:10px"><div class="dupla"><div class="dado"><div class="rot">Vendas</div><div class="val">${inteiro(c.R.vendas)}</div></div><div class="dado"><div class="rot">Ticket médio</div><div class="val">${moeda(c.R.ticket)}</div></div></div></div>
      ${UI.secao('Evolução por dia', grafico('g-detalhe'))}
      <div class="dois-cols">${UI.secao('Por categoria', h`<div class="card">${barrasCat(c, 'receita')}</div>`)}${UI.secao('Por canal', h`<div class="card">${barrasCanal(c, 'receita')}</div>`)}</div>`,
    margem: c => {
      const l = calcMargens(c), min = c.cfg.margem_minima_pct;
      return h`${grande(pct(c.R.margem, 1), `Margem mínima desejada: ${decimal(min, 0)}%`)}
        ${UI.secao('Margem por produto', h`<div class="card">${UI.tabela([{ t: 'Produto' }, { t: 'Receita', cls: 'r' }, { t: 'Lucro', cls: 'r' }, { t: 'Margem', cls: 'r' }],
          l.map(g => [linkProd(c, g.chave), moeda(g.receita), moeda(g.lucro), h`<b class="${g.abaixo ? 'neg' : 'pos'}">${pct(g.margem, 1)}</b>`]), 'Sem vendas no período.')}</div>`)}
        ${l.some(g => g.abaixo) ? UI.secao('Abaixo da margem mínima', h`<div class="card lista">${l.filter(g => g.abaixo).map(g => h`<a class="linha" href="#/estoque/${g.chave}"><div class="meio"><b>${nomeProd(c, g.chave)}</b><span>Margem de ${pct(g.margem, 1)}, ${decimal(min - g.margem * 100, 1)} pontos abaixo</span></div><span class="pilula neg">${pct(g.margem, 1)}</span></a>`)}</div>`) : ''}`;
    },
    vendas: c => {
      const dias = Calc.agruparResumo(c.movs.filter(m => m.tipo === 'venda'), m => Calc.diaSemana(m.data));
      const porDia = [0, 1, 2, 3, 4, 5, 6].map(d => { const g = dias.find(x => x.chave === d); return { rotulo: UI.DIAS[d], valor: g ? g.vendas : 0, texto: String(g ? g.vendas : 0) }; });
      const ultimas = c.movs.filter(m => m.tipo === 'venda').sort((a, b) => Calc.ordemMov(b, a)).slice(0, 40);
      return h`${grande(inteiro(c.R.vendas), `${inteiro(c.R.unidades)} unidades${c.R.devolucoes ? ` · ${c.R.devolucoes} devolução(ões)` : ''}`)}
        <div class="dois-cols">${UI.secao('Por dia da semana', h`<div class="card">${UI.barras(porDia)}</div>`)}${UI.secao('Por canal', h`<div class="card">${barrasCanal(c, 'receita')}</div>`)}</div>
        ${UI.secao('Últimas vendas', h`<div class="card">${UI.tabela([{ t: 'Data' }, { t: 'Produto' }, { t: 'Canal' }, { t: 'Qtd', cls: 'r' }, { t: 'Preço', cls: 'r' }, { t: 'Lucro', cls: 'r' }],
          ultimas.map(m => [UI.dataCurta(m.data), linkProd(c, m.produto_id), nomeCanal(m.canal_id || 'sem'), m.quantidade, moeda(m.preco_venda), h`<span class="${Calc.lucroMov(m) < 0 ? 'neg' : 'pos'}">${moeda(Calc.lucroMov(m))}</span>`]), 'Sem vendas no período.')}</div>`)}`;
    },
    estoque: c => {
      const total = c.escopo.reduce((s, p) => s + c.idx[p.id].valorEstoque, 0), un = c.escopo.reduce((s, p) => s + Math.max(c.idx[p.id].estoque, 0), 0);
      const porCat = new Map();
      for (const p of c.escopo) { const k = p.categoria_id || 'sem'; porCat.set(k, (porCat.get(k) || 0) + c.idx[p.id].valorEstoque); }
      const g = calcGiro(c).sort((a, b) => c.idx[b.p.id].valorEstoque - c.idx[a.p.id].valorEstoque);
      return h`${grande(moeda(total), `${inteiro(un)} itens parados em estoque, ao custo médio`)}
        ${UI.secao('Dinheiro em estoque por categoria', h`<div class="card">${UI.barras([...porCat.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ rotulo: nomeCat(k), valor: v, texto: moeda(v), cor: corCat(k), acao: 'pn.categoria', dados: k })))}</div>`)}
        ${UI.secao('Dias de cobertura por produto', h`<div class="card">${UI.tabela([{ t: 'Produto' }, { t: 'Qtd', cls: 'r' }, { t: 'Custo médio', cls: 'r' }, { t: 'Valor', cls: 'r' }, { t: 'Cobertura', cls: 'r' }],
          g.map(x => [linkProd(c, x.p.id), x.estoque, moeda(c.idx[x.p.id].custoMedio), moeda(c.idx[x.p.id].valorEstoque), x.cobertura === null ? h`<small>sem vendas</small>` : `${Math.round(x.cobertura)} dias`]), 'Nenhum produto ativo.')}
          <small style="display:block;margin-top:8px">Cobertura: quanto tempo o estoque dura no ritmo de vendas dos últimos 30 dias.</small></div>`)}`;
    },
    reposicao: c => {
      const l = calcReposicao(c);
      const forn = p => nomeForn(p.fornecedor_id) || (() => { const k = S.fornecedor_produtos.filter(x => x.produto_id === p.id && x.preco !== null).sort((a, b) => a.preco - b.preco)[0]; return k ? nomeForn(k.fornecedor_id) : null; })() || '—';
      return h`${grande(l.length ? `${l.length} produto${l.length === 1 ? '' : 's'}` : 'Tudo certo', 'abaixo do estoque mínimo')}
        ${UI.secao('O que comprar', h`<div class="card">${UI.tabela([{ t: 'Produto' }, { t: 'Estoque', cls: 'r' }, { t: 'Mín.', cls: 'r' }, { t: 'Sugerido', cls: 'r' }, { t: 'Fornecedor' }, { t: '' }],
          l.map(x => [linkProd(c, x.p.id), h`<b class="${x.i.estoque <= 0 ? 'neg' : 'aviso-txt'}">${x.i.estoque}</b>`, x.min, h`<b>${x.sugerida}</b>`, forn(x.p),
            h`<button type="button" class="btn peq" data-acao="lancar.abrir" data-produto="${x.p.id}" data-tipo="entrada">Entrada</button>`]), 'Nenhum produto abaixo do mínimo.')}
          <small style="display:block;margin-top:8px">Sugestão: o maior entre repor até o dobro do mínimo e cobrir 30 dias no ritmo atual.</small></div>`)}`;
    },
    parados: c => {
      const l = calcParados(c);
      return h`${grande(moeda(l.reduce((s, x) => s + x.i.valorEstoque, 0)), `preso em ${l.length} produto${l.length === 1 ? '' : 's'} sem venda há ${c.cfg.dias_parado}+ dias`)}
        ${UI.secao('Produtos parados', h`<div class="card">${UI.tabela([{ t: 'Produto' }, { t: 'Qtd', cls: 'r' }, { t: 'Sem vender', cls: 'r' }, { t: 'Dinheiro preso', cls: 'r' }],
          l.map(x => [linkProd(c, x.p.id), x.i.estoque, x.nunca ? `${x.dias} dias (nunca vendeu)` : `${x.dias} dias`, h`<b>${moeda(x.i.valorEstoque)}</b>`]), 'Nenhum produto parado.')}</div>`)}`;
    },
    equilibrio: c => {
      const e = calcEquilibrio(c), meta = c.cfg.meta_lucro_mes;
      return h`<div class="aviso-caixa">Este cálculo olha o mês inteiro e não usa os filtros de período, categoria e canal.</div>
        ${grande(e.fixos === 0 ? 'Sem custos fixos' : e.resultado >= 0 ? 'Custos cobertos' : (e.faltam === null ? 'Sem lucro ainda' : `Faltam ${e.faltam} vendas`), `${UI.mesAno(c.hoje)}`)}
        <div class="card" style="margin-top:10px"><div class="dupla">
          <div class="dado"><div class="rot">Custos fixos do mês</div><div class="val">${moeda(e.fixos)}</div></div>
          <div class="dado"><div class="rot">Lucro até hoje</div><div class="val">${moeda(e.lucro)}</div></div>
          <div class="dado"><div class="rot">Resultado (lucro − custos)</div><div class="val ${e.resultado < 0 ? 'neg' : 'pos'}">${moeda(e.resultado)}</div></div>
          <div class="dado"><div class="rot">Lucro médio por venda</div><div class="val">${moeda(e.lucroPorVenda)}</div></div>
          <div class="dado"><div class="rot">Vendas feitas</div><div class="val">${e.vendas}</div></div>
          <div class="dado"><div class="rot">Vendas para empatar</div><div class="val">${e.necessarias === null ? '—' : e.necessarias}</div></div></div>
          ${e.fixos > 0 ? h`<div class="barra-trilho" style="margin-top:8px"><span class="barra-preench" style="width:${Math.min(Math.max(e.lucro / e.fixos, 0), 1) * 100}%"></span></div><small>${pct(Math.max(e.lucro, 0) / e.fixos)} dos custos fixos cobertos</small>` : h`<small>Cadastre os custos fixos em Ajustes > Custos padrão.</small>`}</div>
        ${meta > 0 ? UI.secao('Meta de lucro do mês', h`<div class="card"><b>${moeda(e.lucro)}</b> de ${moeda(meta)}<div class="barra-trilho" style="margin-top:8px"><span class="barra-preench" style="width:${Math.min(Math.max(e.lucro / meta, 0), 1) * 100}%"></span></div><small>${pct(Math.max(e.lucro, 0) / meta)} da meta</small></div>`) : ''}`;
    },
    projecao: c => {
      const e = calcEquilibrio(c), meta = c.cfg.meta_lucro_mes;
      return h`<div class="aviso-caixa">Este cálculo olha o mês inteiro e não usa os filtros de período, categoria e canal.</div>
        ${grande(moeda(e.projecao), `lucro estimado para ${UI.mesAno(c.hoje)}, mantendo o ritmo (dia ${e.dia} de ${e.dias})`)}
        <div class="card" style="margin-top:10px"><div class="dupla">
          <div class="dado"><div class="rot">Lucro até hoje</div><div class="val">${moeda(e.lucro)}</div></div>
          <div class="dado"><div class="rot">Projeção após custos fixos</div><div class="val ${e.projecaoResultado < 0 ? 'neg' : 'pos'}">${moeda(e.projecaoResultado)}</div></div>
          ${meta > 0 ? h`<div class="dado"><div class="rot">Meta do mês</div><div class="val">${moeda(meta)}</div></div><div class="dado"><div class="rot">Projeção vs. meta</div><div class="val ${e.projecao >= meta ? 'pos' : 'neg'}">${pct(e.projecao / meta)}</div></div>` : ''}</div></div>
        <small class="mudo" style="display:block;margin:10px 4px">Conta simples: lucro até hoje ÷ dias passados × dias do mês. Vendas costumam variar ao longo do mês.</small>`;
    },
    abc: c => {
      const l = Calc.curvaABC(Calc.agruparResumo(c.vp.filter(m => m.tipo !== 'perda'), m => m.produto_id));
      const a = l.filter(x => x.classe === 'A').length;
      return h`${grande(`${a} produto${a === 1 ? '' : 's'} na classe A`, 'A: até 80% do lucro · B: até 95% · C: o restante')}
        ${UI.secao('Curva ABC por lucro', h`<div class="card">${UI.tabela([{ t: 'Classe', cls: 'c' }, { t: 'Produto' }, { t: 'Lucro', cls: 'r' }, { t: 'Acumulado', cls: 'r' }],
          l.map(x => [h`<span class="pilula ${x.classe === 'A' ? 'ok' : x.classe === 'B' ? '' : 'neutra'}">${x.classe}</span>`, linkProd(c, x.chave), moeda(x.lucro), pct(x.acumulado)]), 'Sem vendas no período.')}</div>`)}`;
    },
    lotes: c => {
      const ls = Calc.lotes(S.produtos, S.movimentacoes).filter(l => c.noEscopo(c.prod[l.produto_id]));
      const pagos = ls.filter(l => l.dias !== null);
      return h`${grande(`${pagos.length} de ${ls.length} lotes pagos`, pagos.length ? `Prazo médio para se pagar: ${decimal(pagos.reduce((s, l) => s + l.dias, 0) / pagos.length, 0)} dias` : 'Nenhum lote se pagou ainda')}
        ${UI.secao('Cada compra', h`<div class="card">${UI.tabela([{ t: 'Data' }, { t: 'Produto' }, { t: 'Qtd', cls: 'r' }, { t: 'Investido', cls: 'r' }, { t: 'Vendidas', cls: 'r' }, { t: 'Já devolveu', cls: 'r' }, { t: 'Situação' }],
          ls.map(l => [UI.dataCurta(l.data), linkProd(c, l.produto_id), l.qtd, moeda(l.custoTotal), l.vendidas, h`${moeda(l.recebido)} <small>(${pct(l.pct)})</small>`,
            l.dias !== null ? h`<span class="pilula ok">pago em ${l.dias} dia${l.dias === 1 ? '' : 's'}</span>` : h`<span class="pilula neutra">em andamento</span>`]), 'Nenhuma entrada de lote registrada.')}
          <small style="display:block;margin-top:8px">Cada venda consome primeiro o lote mais antigo. "Já devolveu" é o que sobrou das vendas depois de taxas, frete, embalagem e imposto. O lote se paga quando isso passa do que foi investido.</small></div>`)}`;
    },
    giro: c => {
      const g = calcGiro(c), porCat = new Map();
      for (const x of g) { const k = x.p.categoria_id || 'sem', o = porCat.get(k) || { un: 0, medio: 0 }; o.un += x.un; o.medio += x.medio; porCat.set(k, o); }
      return h`${grande(`${g.filter(x => x.giro !== null).length ? decimal(g.filter(x => x.giro !== null).reduce((s, x) => s + x.giro, 0) / g.filter(x => x.giro !== null).length, 1) + 'x' : '—'}`, 'giro médio: unidades vendidas ÷ estoque médio, no período')}
        ${UI.secao('Por categoria', h`<div class="card">${UI.tabela([{ t: 'Categoria' }, { t: 'Vendidas', cls: 'r' }, { t: 'Estoque médio', cls: 'r' }, { t: 'Giro', cls: 'r' }],
          [...porCat.entries()].map(([k, o]) => [nomeCat(k), o.un, decimal(o.medio, 1), o.medio > 0 ? decimal(o.un / o.medio, 1) + 'x' : '—']), 'Sem dados.')}</div>`)}
        ${UI.secao('Por produto', h`<div class="card">${UI.tabela([{ t: 'Produto' }, { t: 'Vendidas', cls: 'r' }, { t: 'Giro', cls: 'r' }, { t: 'Cobertura', cls: 'r' }],
          g.sort((a, b) => (b.giro || 0) - (a.giro || 0)).map(x => [linkProd(c, x.p.id), x.un, x.giro === null ? '—' : decimal(x.giro, 1) + 'x', x.cobertura === null ? '—' : `${Math.round(x.cobertura)} dias`]), 'Nenhum produto ativo.')}</div>`)}`;
    },
    taxas: c => {
      const por = Calc.agruparResumo(c.vd, m => m.canal_id || 'sem');
      return h`${grande(c.R.receita > 0 ? pct(c.R.taxas / c.R.receita, 1) : '—', `do faturamento fica com as plataformas (${moeda(c.R.taxas)})`)}
        ${UI.secao('Por canal', h`<div class="card">${UI.tabela([{ t: 'Canal' }, { t: 'Faturamento', cls: 'r' }, { t: 'Comissão', cls: 'r' }, { t: 'Taxa fixa', cls: 'r' }, { t: 'CPF', cls: 'r' }, { t: '% do fat.', cls: 'r' }],
          por.map(g => [nomeCanal(g.chave), moeda(g.receita), moeda(g.comissao), moeda(g.taxa_fixa), moeda(g.adicional_cpf), h`<b>${g.receita > 0 ? pct(g.taxas / g.receita, 1) : '—'}</b>`]), 'Sem vendas no período.')}</div>`)}
        ${UI.secao('Outros custos da venda', h`<div class="card lista">${[['Frete', c.R.frete], ['Embalagem', c.R.embalagem], ['Imposto', c.R.imposto]].map(([t, v]) => h`<div class="linha"><div class="meio"><b>${t}</b></div><div class="fim">${moeda(v)}${c.R.receita > 0 ? h`<small>${pct(v / c.R.receita, 1)}</small>` : ''}</div></div>`)}</div>`)}`;
    },
    perdas: c => {
      const prods = Calc.agruparResumo(c.vp, m => m.produto_id);
      const canais = Calc.agruparResumo(c.vd, m => m.canal_id || 'sem');
      const dev = custoDevolucoes(c);
      return h`${grande(moeda(c.R.perdas + dev), `custo de perdas (${moeda(c.R.perdas)}) e devoluções (${moeda(dev)})`)}
        ${UI.secao('Por produto', h`<div class="card">${UI.tabela([{ t: 'Produto' }, { t: 'Vendidas', cls: 'r' }, { t: 'Devolvidas', cls: 'r' }, { t: 'Taxa', cls: 'r' }, { t: 'Perdidas', cls: 'r' }, { t: 'Custo', cls: 'r' }],
          prods.filter(g => g.devolvidas || g.perdidas).map(g => { const dv = -g.movs.filter(m => m.tipo === 'devolucao').reduce((s, m) => s + Calc.lucroMov(m), 0);
            return [linkProd(c, g.chave), g.unidades, g.devolvidas, g.unidades ? pct(g.devolvidas / g.unidades, 1) : '—', g.perdidas, h`<b class="neg">${moeda(g.perdas + dv)}</b>`]; }), 'Nenhuma devolução ou perda no período.')}</div>`)}
        ${UI.secao('Por canal', h`<div class="card">${UI.tabela([{ t: 'Canal' }, { t: 'Vendas', cls: 'r' }, { t: 'Devoluções', cls: 'r' }, { t: 'Taxa', cls: 'r' }],
          canais.map(g => [nomeCanal(g.chave), g.vendas, g.devolucoes, g.vendas ? pct(g.devolucoes / g.vendas, 1) : '—']), 'Sem vendas no período.')}
          <small style="display:block;margin-top:8px">Perdas não têm canal, por isso aparecem só na tabela por produto.</small></div>`)}`;
    },
    preco: c => {
      const l = calcPreco(c).sort((a, b) => (a.dif === null) - (b.dif === null) || a.dif - b.dif);
      return h`${grande('Preço praticado', 'média do que foi cobrado contra o preço sugerido de cada produto')}
        ${UI.secao('Por produto', h`<div class="card">${UI.tabela([{ t: 'Produto' }, { t: 'Vendidas', cls: 'r' }, { t: 'Preço médio', cls: 'r' }, { t: 'Sugerido', cls: 'r' }, { t: 'Diferença', cls: 'r' }],
          l.map(x => [linkProd(c, x.id), x.un, moeda(x.medio), moeda(x.sugerido), x.dif === null ? '—' : h`<b class="${x.dif < -0.005 ? 'neg' : x.dif > 0.005 ? 'pos' : ''}">${UI.sinal(x.dif, 1)}</b>`]), 'Sem vendas no período.')}</div>`)}`;
    },
    catcanal: c => {
      const cats = [...new Set(c.vd.map(m => catDe(c, m)))], cans = [...new Set(c.vd.map(m => m.canal_id || 'sem'))];
      const cel = (k, n) => { const g = Calc.resumo(c.vd.filter(m => catDe(c, m) === k && (m.canal_id || 'sem') === n)); return g.vendas || g.devolucoes ? h`<b class="${g.lucro < 0 ? 'neg' : 'pos'}">${moeda(g.lucro)}</b><br><small>${g.margem === null ? '—' : pct(g.margem)}</small>` : h`<span class="mudo">—</span>`; };
      return h`${grande('Categoria × canal', 'lucro e margem de cada combinação, no período')}
        ${UI.secao('Onde cada categoria vende melhor', h`<div class="card matriz">${UI.tabela([{ t: 'Categoria' }, ...cans.map(n => ({ t: nomeCanal(n), cls: 'r' }))], cats.map(k => [nomeCat(k), ...cans.map(n => cel(k, n))]), 'Sem vendas no período.')}</div>`)}`;
    },
    melhordia: c => {
      const g = Calc.agruparResumo(c.movs.filter(m => m.tipo === 'venda'), m => Calc.diaSemana(m.data));
      const lista = [0, 1, 2, 3, 4, 5, 6].map(d => { const x = g.find(i => i.chave === d); return { d, vendas: x ? x.vendas : 0, receita: x ? x.receita : 0, lucro: x ? x.lucro : 0 }; });
      const melhor = g[0];
      return h`${grande(melhor ? UI.DIAS[melhor.chave] : '—', melhor ? `${moeda(melhor.lucro)} de lucro em ${melhor.vendas} venda${melhor.vendas === 1 ? '' : 's'}` : 'Sem vendas no período')}
        ${UI.secao('Lucro por dia da semana', h`<div class="card">${UI.barras(lista.map(x => ({ rotulo: UI.DIAS[x.d], valor: x.lucro, texto: moeda(x.lucro), sub: `${x.vendas} venda${x.vendas === 1 ? '' : 's'}` })))}</div>`)}`;
    }
  };
  UI.acoes['pn.ir'] = d => { location.hash = d.v; };

  function detalhe(id) {
    const x = info(id);
    if (!x) return h`${UI.cabecalho({ titulo: 'Painel', voltar: '#/painel' })}${UI.vazio('Indicador não encontrado.')}`;
    const c = ultimo = ctx();
    const filtros = [F.categoria ? nomeCat(F.categoria) : null, F.canal ? nomeCanal(F.canal) : null].filter(Boolean);
    return h`${UI.cabecalho({ titulo: x.titulo, voltar: '#/painel', sub: `${c.per.rotulo}${filtros.length ? ' · ' + filtros.join(' · ') : ''}` })}
      ${barraFiltros()}<div style="margin-top:14px">${detalhes[id](c)}</div>`;
  }

  /* ───────── Gráficos ───────── */
  function desenhar(id) {
    const c = ultimo; if (!c) return;
    const s = Calc.serie(c.movs, c.per.de, c.per.ate);
    const rotulos = s.pontos.map(p => s.porMes ? p.rotulo.slice(5, 7) + '/' + p.rotulo.slice(2, 4) : UI.dataCurta(p.rotulo));
    const eixoY = { grid: { color: UI.cor('--linha') }, ticks: { callback: v => 'R$ ' + v } };
    const base = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: id === 'g-home', labels: { boxWidth: 10 } }, tooltip: { callbacks: { label: t => `${t.dataset.label}: ${moeda(t.parsed.y)}` } } },
      scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: eixoY } };
    const dsLucro = { type: 'bar', label: 'Lucro', data: s.pontos.map(p => p.lucro), backgroundColor: s.pontos.map(p => p.lucro < 0 ? UI.cor('--neg') : UI.cor('--g2')), borderRadius: 4, order: 2 };
    const dsReceita = { type: 'line', label: 'Faturamento', data: s.pontos.map(p => p.receita), borderColor: UI.cor('--g1'), backgroundColor: UI.cor('--g1'), tension: .3, pointRadius: 0, borderWidth: 2, order: 1 };
    const el = document.getElementById(id);
    const detalheId = location.hash.split('/')[2];
    const datasets = id === 'g-home' ? [dsLucro, dsReceita] : detalheId === 'faturamento' ? [dsReceita] : [dsLucro];
    UI.grafico(el, { type: 'bar', data: { labels: rotulos, datasets }, options: base });
  }

  function depois(arg) { desenhar(arg ? 'g-detalhe' : 'g-home'); }

  return { render: arg => arg ? detalhe(arg) : inicio(), depois, cartoesConfig, CATALOGO };
})();
