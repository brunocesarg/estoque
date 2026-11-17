/* Estoque: lista de produtos, ficha do produto e cadastro. */
Telas.estoque = (function () {
  'use strict';
  const { h, ic, moeda, pct, inteiro, campo, selecao } = UI;
  const S = Dados.S;
  const TIPOS = { entrada: 'Entrada', venda: 'Venda', devolucao: 'Devolução', perda: 'Perda', ajuste: 'Ajuste' };
  const lerVista = () => { try { return localStorage.getItem('vista_estoque') || 'grade'; } catch (e) { return 'grade'; } };
  const f = { busca: '', categoria: 'todas', inativos: false, vista: lerVista() };
  let formFoto = { blob: null, remover: false, url: null };

  const nomeCat = id => { const c = S.categorias.find(x => x.id === id); return c ? c.nome : null; };
  const nomeForn = id => { const x = S.fornecedores.find(i => i.id === id); return x ? x.nome : null; };
  const nomeCanal = id => { const x = S.canais.find(i => i.id === id); return x ? x.nome : null; };
  const minimoDe = p => p.estoque_minimo !== null && p.estoque_minimo !== undefined ? p.estoque_minimo : Dados.cfg().estoque_minimo_padrao;
  const canalPadrao = () => Dados.cfg().canal_padrao_id || (Dados.canaisOrdenados()[0] || {}).id;

  // Lucro estimado de uma venda no canal padrão, com o custo médio e o preço sugerido
  function lucroEstimado(p, info, canalId = canalPadrao()) {
    const custo = info ? info.custoMedio : Number(p.custo_estimado) || 0;
    if (!p.preco_venda || !canalId) return null;
    return Calc.lucroPreco({ preco: Number(p.preco_venda), custo, canalId, faixas: S.faixas_taxa, cfg: Dados.cfg(), embalagem: p.embalagem });
  }

  /* ───────── Lista ───────── */
  function lista() {
    const idx = Calc.indexar(S.produtos, S.movimentacoes);
    const ativos = S.produtos.filter(p => p.ativo);
    const unidades = ativos.reduce((s, p) => s + Math.max(idx[p.id].estoque, 0), 0);
    const valor = ativos.reduce((s, p) => s + idx[p.id].valorEstoque, 0);
    const cats = Dados.catsOrdenadas();
    const inativosN = S.produtos.length - ativos.length;
    return h`${UI.cabecalho({ titulo: 'Estoque', acoes: h`<button type="button" class="btn primario peq" data-acao="est.novo">${ic('mais')} Produto</button>` })}
      <div class="resumo-topo"><span>${inteiro(unidades)} itens · ${moeda(valor)} em estoque</span></div>
      <div class="busca">${ic('busca')}<input type="search" placeholder="Buscar produto" value="${f.busca}" data-digitar="est.busca" aria-label="Buscar produto"></div>
      <div class="chips" id="est-cats">${catChips(cats)}</div>
      <div style="display:flex;align-items:center;gap:12px;margin:6px 0 12px;justify-content:space-between">
        ${UI.seg('vista', [{ v: 'grade', t: 'Grade' }, { v: 'lista', t: 'Lista' }], f.vista, 'est.vista')}
        ${inativosN ? h`<small>${ativos.length} ativos · ${inativosN} candidatos</small>` : ''}</div>
      <div id="est-itens">${itens(idx)}</div>`;
  }
  function catChips(cats) {
    return h`<button type="button" class="chip${f.categoria === 'todas' ? ' sel' : ''}" data-acao="est.cat" data-v="todas">Todos</button>
      ${cats.map(c => h`<button type="button" class="chip${f.categoria === c.id ? ' sel' : ''}" data-acao="est.cat" data-v="${c.id}"><i class="bolinha" style="background:${c.cor}"></i>${c.nome}</button>`)}
      <button type="button" class="chip nova" data-acao="est.novaCat">+ Nova</button>`;
  }
  function filtrados(idx) {
    const q = f.busca.trim().toLowerCase();
    return S.produtos.filter(p => (f.categoria === 'todas' || p.categoria_id === f.categoria)
      && (!q || (p.nome + ' ' + (p.codigo || '')).toLowerCase().includes(q)))
      .sort((a, b) => (b.ativo - a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  function itens(idx) {
    const todos = filtrados(idx), at = todos.filter(p => p.ativo), cand = todos.filter(p => !p.ativo);
    if (!todos.length || !cand.length) return grupo(todos, idx);
    return h`${at.length ? grupo(at, idx) : h`<div class="info-caixa">Nenhum produto ativo ainda. Um candidato vira ativo sozinho quando você lança a primeira <b>Entrada</b> de compra.</div>`}
      ${UI.secao(`Candidatos (${cand.length})`, grupo(cand, idx), h`<small>da pesquisa de mercado, ainda sem compra</small>`)}`;
  }
  function grupo(ps, idx) {
    const cats = S.categorias;
    if (!ps.length) return UI.vazio(S.produtos.length ? 'Nenhum produto neste filtro.' : 'Nenhum produto cadastrado ainda.',
      S.produtos.length ? '' : h`<button type="button" class="btn primario" data-acao="est.novo">${ic('mais')} Cadastrar produto</button>`);
    if (f.vista === 'lista') {
      return h`<div class="card" style="padding:6px 10px">${UI.tabela(
        [{ t: 'Produto' }, { t: 'Qtd', cls: 'r' }, { t: 'Lucro', cls: 'r' }, { t: 'Margem', cls: 'r' }],
        ps.map(p => { const i = idx[p.id], l = lucroEstimado(p, i), baixo = p.ativo && i.estoque <= minimoDe(p);
          return [h`<a href="#/estoque/${p.id}" style="display:flex;align-items:center;gap:8px;min-width:0">${UI.miniatura(p, cats, 'peq')}<span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${p.nome}${p.ativo ? '' : h` <span class="pilula neutra">inativo</span>`}</span></a>`,
            h`<b class="${baixo ? 'aviso-txt' : ''}">${inteiro(i.estoque)}</b>`,
            l ? h`<span class="${l.lucro < 0 ? 'neg' : 'pos'}">${moeda(l.lucro)}</span>` : '—', l ? pct(l.margem) : '—']; }))}</div>`;
    }
    return h`<div class="grade-prod">${ps.map(p => {
      const i = idx[p.id], l = lucroEstimado(p, i), baixo = p.ativo && i.estoque <= minimoDe(p);
      return h`<a class="pcard" href="#/estoque/${p.id}"><div class="foto">${UI.miniatura(p, cats)}<span class="qtd${i.estoque <= 0 ? ' zero' : baixo ? ' baixo' : ''}">${inteiro(i.estoque)}</span></div>
        <b>${p.nome}</b>${l ? h`<span class="lucro${l.lucro < 0 ? ' neg' : ''}">${moeda(l.lucro)} de lucro</span>` : h`<span class="lucro" style="color:var(--txt3)">sem preço</span>`}
        ${p.ativo ? '' : h`<span class="pilula neutra">inativo</span>`}</a>`;
    })}</div>`;
  }
  const redesenhar = () => { const el = document.getElementById('est-itens'); if (el) UI.render(el, itens(Calc.indexar(S.produtos, S.movimentacoes))); };
  UI.aoDigitar['est.busca'] = el => { f.busca = el.value; redesenhar(); };
  UI.acoes['est.cat'] = d => { f.categoria = d.v; App.atualizar(); };
  UI.acoes['est.vista'] = d => { f.vista = d.v; try { localStorage.setItem('vista_estoque', d.v); } catch (e) { /* ok */ } App.atualizar(); };
  UI.aoMudar['est.inativos'] = el => { f.inativos = el.checked; App.atualizar(); };
  UI.acoes['est.novaCat'] = () => UI.folha({ titulo: 'Nova categoria', corpo: h`<form data-form="est.novaCat"><div style="display:flex;gap:10px;align-items:flex-end">
    <label class="campo" style="flex:1;margin:0"><span>Nome</span><input type="text" name="nome" required placeholder="Ex.: Casa"></label>
    <input type="color" name="cor" class="cor-input" value="#2fc98e" style="height:46px;width:52px" aria-label="Cor"></div>
    <div class="botoes"><button type="button" class="btn sec" data-acao="folha.fechar">Cancelar</button><button class="btn primario" type="submit">Criar</button></div></form>` });
  UI.aoEnviar['est.novaCat'] = async (form, d) => {
    try { const c = await Dados.inserir('categorias', { nome: String(d.get('nome')).trim(), cor: d.get('cor'), ordem: S.categorias.length }); f.categoria = c.id; UI.fecharTodas(); App.atualizar(); }
    catch (e) { UI.erro(e); }
  };

  /* ───────── Ficha do produto ───────── */
  function ficha(id) {
    const p = S.produtos.find(x => x.id === id);
    if (!p) return h`${UI.cabecalho({ titulo: 'Produto', voltar: '#/estoque' })}${UI.vazio('Produto não encontrado.')}`;
    const idx = Calc.indexar([p], S.movimentacoes.filter(m => m.produto_id === p.id))[p.id];
    const cfg = Dados.cfg(), cats = S.categorias;
    const baixo = p.ativo && idx.estoque <= minimoDe(p);
    const canais = Dados.canaisOrdenados();
    const cotacoes = S.fornecedor_produtos.filter(c => c.produto_id === p.id && c.preco !== null).sort((a, b) => a.preco - b.preco);
    const movs = idx.movs.slice().reverse().slice(0, 20);
    const linhasCanal = p.preco_venda ? canais.map(c => ({ c, r: Calc.lucroPreco({ preco: Number(p.preco_venda), custo: idx.custoMedio, canalId: c.id, faixas: S.faixas_taxa, cfg, embalagem: p.embalagem }) })) : [];
    return h`${UI.cabecalho({ titulo: p.nome, voltar: '#/estoque', sub: [nomeCat(p.categoria_id), p.codigo].filter(Boolean).join(' · '),
      acoes: h`<button type="button" class="btn-icone" data-acao="est.editar" data-id="${p.id}" aria-label="Editar">${ic('editar')}</button>` })}
      ${UI.miniatura(p, cats, 'grande')}
      ${creditoFoto(p)}
      ${p.ativo ? '' : h`<div class="aviso-caixa" style="margin-top:12px">Produto inativo (candidato). Não aparece nos alertas do painel. Ative ao fazer a primeira compra.</div>`}
      <div class="card" style="margin-top:12px"><div class="dupla">
        <div class="dado"><div class="rot">Em estoque</div><div class="val ${idx.estoque <= 0 ? 'neg' : baixo ? 'aviso-txt' : ''}">${inteiro(idx.estoque)}</div><small>mínimo ${minimoDe(p)}</small></div>
        <div class="dado"><div class="rot">Custo médio</div><div class="val">${moeda(idx.custoMedio)}</div><small>${idx.primeiraEntrada ? 'das entradas' : 'estimado'}</small></div>
        <div class="dado"><div class="rot">Valor em estoque</div><div class="val">${moeda(idx.valorEstoque)}</div></div>
        <div class="dado"><div class="rot">Preço sugerido</div><div class="val">${moeda(p.preco_venda)}</div></div></div>
        <div class="botoes" style="margin-top:8px"><button type="button" class="btn sec" data-acao="lancar.abrir" data-produto="${p.id}" data-tipo="entrada">Entrada</button>
        <button type="button" class="btn primario" data-acao="lancar.abrir" data-produto="${p.id}" data-tipo="venda">Venda</button></div></div>
      ${UI.secao('Lucro por canal', p.preco_venda ? h`<div class="card">${UI.tabela(
        [{ t: 'Canal' }, { t: 'Taxas', cls: 'r' }, { t: 'Lucro', cls: 'r' }, { t: 'Margem', cls: 'r' }],
        linhasCanal.map(({ c, r }) => [c.name || c.nome, r.semFaixa ? h`<span class="pilula">sem faixa</span>` : moeda(r.comissao + r.taxa_fixa + r.adicional_cpf), h`<b class="${r.lucro < 0 ? 'neg' : 'pos'}">${moeda(r.lucro)}</b>`, pct(r.margem)]))}
        <small style="display:block;margin-top:8px">Vendendo a ${moeda(p.preco_venda)}, com o custo médio atual, embalagem ${moeda(Calc.embalagemDe(p, cfg))}${cfg.tipo_vendedor === 'CPF' ? ` e adicional de CPF de ${moeda(cfg.adicional_cpf)}` : ''}.</small></div>`
        : h`<div class="card">${UI.vazio('Defina um preço de venda sugerido para ver o lucro em cada canal.', h`<button type="button" class="btn sec peq" data-acao="est.editar" data-id="${p.id}">Editar produto</button>`)}</div>`)}
      ${UI.secao('Preço cotado por fornecedor', h`<div class="card">${cotacoes.length ? UI.tabela(
        [{ t: 'Fornecedor' }, { t: 'Preço', cls: 'r' }, { t: 'Mín.', cls: 'r' }, { t: 'Data', cls: 'r' }],
        cotacoes.map((c, i) => [h`<a href="#/fornecedores/${c.fornecedor_id}">${nomeForn(c.fornecedor_id) || '—'}</a>${i === 0 && cotacoes.length > 1 ? h` <span class="pilula ok">menor</span>` : ''}`, h`<b>${moeda(c.preco)}</b>`, c.qtd_minima || '—', UI.dataCurta(c.data_cotacao)]))
        : UI.vazio('Nenhuma cotação ligada a este produto. Cadastre na ficha do fornecedor.')}</div>`)}
      ${UI.secao('Últimos lançamentos', h`<div class="card lista">${movs.length ? movs.map(m => linhaMov(m)) : UI.vazio('Nenhum lançamento ainda.')}</div>`)}
      <div style="margin-top:24px;text-align:center"><button type="button" class="btn-texto neg" data-acao="est.excluir" data-id="${p.id}">Excluir produto</button></div>`;
  }
  function creditoFoto(p) {
    const m = p.foto && p.foto.match(/^img\/produtos\/(.+)\.jpg$/), c = m && DadosFotos[m[1]];
    if (!c) return '';
    return h`<small style="display:block;margin:6px 4px 0">${c.ilustrativa ? 'Foto ilustrativa (não é o item do fornecedor)' : 'Foto de referência'}: <a href="${c.pagina}" target="_blank" rel="noopener" style="text-decoration:underline">${c.autor}</a>, ${c.licenca}. Troque pela sua em Editar.</small>`;
  }
  function linhaMov(m) {
    const lucro = Calc.lucroMov(m), q = Calc.deltaEstoque(m);
    const detalhe = [nomeCanal(m.canal_id), m.tipo === 'entrada' ? nomeForn(m.fornecedor_id) : null, m.observacao].filter(Boolean).join(' · ');
    return h`<div class="linha"><div class="meio"><b>${TIPOS[m.tipo]} · ${q > 0 ? '+' : '−'}${Math.abs(q)}</b><span>${UI.dataBR(m.data)}${detalhe ? ' · ' + detalhe : ''}</span></div>
      <div class="fim">${m.tipo === 'entrada' ? moeda(m.quantidade * m.custo_unitario + Number(m.frete || 0)) : (m.tipo === 'ajuste' ? '' : h`<span class="${lucro < 0 ? 'neg' : lucro > 0 ? 'pos' : ''}">${moeda(lucro)}</span>`)}
      ${m.tipo === 'venda' ? h`<small>${moeda(m.preco_venda)} un.</small>` : ''}</div>
      <button type="button" class="btn-icone" style="width:34px;height:34px" data-acao="est.apagarMov" data-id="${m.id}" aria-label="Apagar lançamento">${ic('lixo')}</button></div>`;
  }
  UI.acoes['est.apagarMov'] = async d => {
    if (await UI.confirmar({ titulo: 'Apagar lançamento', texto: 'Apagar este lançamento? O estoque e o custo médio são recalculados.', ok: 'Apagar', perigo: true }))
      try { await Dados.remover('movimentacoes', d.id); App.atualizar(); UI.aviso('Lançamento apagado'); } catch (e) { UI.erro(e); }
  };
  UI.acoes['est.excluir'] = async d => {
    const p = S.produtos.find(x => x.id === d.id), n = S.movimentacoes.filter(m => m.produto_id === p.id).length;
    const ok = await UI.confirmar({ titulo: 'Excluir produto', ok: 'Excluir', perigo: true,
      texto: `Excluir "${p.nome}"?${n ? ` Isso apaga também ${n} lançamento${n === 1 ? '' : 's'} e muda o histórico do painel. Se só quer tirar do estoque, desative o produto em vez de excluir.` : ''} Não dá para desfazer.` });
    if (!ok) return;
    try { if (p.foto) await Dados.removerFoto(p.foto); await Dados.remover('produtos', p.id); location.hash = '#/estoque'; UI.aviso('Produto excluído'); } catch (e) { UI.erro(e); }
  };

  /* ───────── Cadastro e edição ───────── */
  function formProduto(p) {
    formFoto = { blob: null, remover: false, url: null };
    const cfg = Dados.cfg(), cats = Dados.catsOrdenadas();
    const opcCat = [{ v: '', t: 'Sem categoria' }, ...cats.map(c => ({ v: c.id, t: c.nome })), { v: '__nova__', t: '+ Criar nova categoria…' }];
    const forns = [{ v: '', t: 'Sem fornecedor' }, ...S.fornecedores.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(x => ({ v: x.id, t: x.nome }))];
    const inicial = p ? p.categoria_id : (f.categoria !== 'todas' ? f.categoria : '');
    UI.folha({ titulo: p ? 'Editar produto' : 'Novo produto', largo: true, corpo: h`<form data-form="est.salvar">
      <input type="hidden" name="id" value="${p ? p.id : ''}">
      <div class="foto-edit"><div id="foto-prev">${UI.miniatura(p, S.categorias)}</div>
        <div class="foto-botoes">
          <label class="btn sec peq">${ic('camera')} Tirar foto<input type="file" accept="image/*" capture="environment" hidden data-muda="est.foto"></label>
          <label class="btn sec peq">Escolher da galeria<input type="file" accept="image/*" hidden data-muda="est.foto"></label>
          ${p && p.foto ? h`<button type="button" class="btn sec peq" data-acao="est.fotoRemover">Tirar foto</button>` : ''}</div></div>
      ${campo('Nome', 'nome', { req: true, valor: p ? p.nome : '', ph: 'Ex.: Capa pet para banco de carro' })}
      <div class="grade2">${campo('Código', 'codigo', { valor: p ? p.codigo : '', ph: 'Opcional' })}
        ${selecao('Categoria', 'categoria_id', opcCat, inicial, { extra: 'data-muda="est.cat-form"' })}</div>
      <div id="nova-cat" hidden><div style="display:flex;gap:10px;align-items:flex-end"><label class="campo" style="flex:1;margin:0 0 12px"><span>Nome da nova categoria</span><input type="text" name="nova_cat" placeholder="Ex.: Casa"></label>
        <input type="color" name="nova_cor" class="cor-input" value="#2fc98e" style="height:46px;width:52px;margin-bottom:12px" aria-label="Cor"></div></div>
      ${selecao('Fornecedor', 'fornecedor_id', forns, p ? p.fornecedor_id : '')}
      <div class="grade2">${campo('Preço de venda sugerido (R$)', 'preco_venda', { dec: true, valor: UI.campoNum(p ? p.preco_venda : '') })}
        ${campo('Custo estimado (R$)', 'custo_estimado', { dec: true, valor: UI.campoNum(p ? p.custo_estimado : ''), dica: 'Usado até a primeira entrada de lote.' })}</div>
      <div class="grade2">${campo('Estoque mínimo', 'estoque_minimo', { dec: true, valor: p && p.estoque_minimo !== null ? p.estoque_minimo : '', ph: `Padrão: ${cfg.estoque_minimo_padrao}` })}
        ${campo('Embalagem por item (R$)', 'embalagem', { dec: true, valor: UI.campoNum(p ? p.embalagem : ''), ph: `Padrão: ${UI.campoNum(cfg.embalagem_padrao)}` })}</div>
      ${UI.areaTexto('Observações', 'observacoes', p ? p.observacoes : '')}
      ${UI.interruptor('ativo', p ? p.ativo : true, 'Produto ativo')}
      <small class="mudo">Desative para guardar um candidato sem contar nos alertas.</small>
      <div class="botoes"><button type="button" class="btn sec" data-acao="folha.fechar">Cancelar</button><button class="btn primario" type="submit">Salvar</button></div></form>` });
  }
  UI.acoes['est.novo'] = () => formProduto(null);
  UI.acoes['est.editar'] = d => formProduto(S.produtos.find(x => x.id === d.id));
  UI.aoMudar['est.cat-form'] = el => { const box = document.getElementById('nova-cat'); if (box) box.hidden = el.value !== '__nova__'; };
  UI.aoMudar['est.foto'] = async el => {
    const arq = el.files && el.files[0];
    if (!arq) return;
    try {
      formFoto.blob = await UI.comprimirFoto(arq); formFoto.remover = false;
      if (formFoto.url) URL.revokeObjectURL(formFoto.url);
      formFoto.url = URL.createObjectURL(formFoto.blob);
      document.getElementById('foto-prev').innerHTML = `<div class="thumb"><img src="${formFoto.url}" alt=""></div>`;
      UI.aviso(`Foto pronta (${Math.round(formFoto.blob.size / 1024)} KB)`);
    } catch (e) { UI.erro(e); }
    el.value = '';
  };
  UI.acoes['est.fotoRemover'] = () => {
    formFoto = { blob: null, remover: true, url: null };
    document.getElementById('foto-prev').innerHTML = '<div class="thumb"><span>—</span></div>';
  };
  UI.aoEnviar['est.salvar'] = async (form, d) => {
    await UI.ocupado(form.querySelector('button[type=submit]'), async () => {
      const id = d.get('id'), antigo = id ? S.produtos.find(x => x.id === id) : null;
      let categoria_id = d.get('categoria_id') || null;
      if (categoria_id === '__nova__') {
        const nome = String(d.get('nova_cat') || '').trim();
        if (!nome) throw new Error('Escreva o nome da nova categoria.');
        categoria_id = (await Dados.inserir('categorias', { nome, cor: d.get('nova_cor'), ordem: S.categorias.length })).id;
      }
      const num = k => UI.numero(d.get(k));
      const dados = { nome: String(d.get('nome')).trim(), codigo: d.get('codigo'), categoria_id, fornecedor_id: d.get('fornecedor_id') || null,
        preco_venda: num('preco_venda'), custo_estimado: num('custo_estimado'), embalagem: num('embalagem'),
        estoque_minimo: num('estoque_minimo') === null ? null : Math.round(num('estoque_minimo')),
        observacoes: d.get('observacoes'), ativo: d.get('ativo') === 'on' };
      if (!dados.nome) throw new Error('O nome é obrigatório.');
      if (formFoto.blob) dados.foto = await Dados.enviarFoto(formFoto.blob, antigo && antigo.foto);
      else if (formFoto.remover && antigo && antigo.foto) { await Dados.removerFoto(antigo.foto); dados.foto = null; }
      const salvo = id ? await Dados.atualizar('produtos', id, dados) : await Dados.inserir('produtos', dados);
      await Dados.prepararFotos();
      UI.fecharTodas();
      if (!id) location.hash = '#/estoque/' + salvo.id; else App.atualizar();
      UI.aviso(id ? 'Produto salvo' : 'Produto cadastrado');
    });
  };

  return { render: arg => arg ? ficha(arg) : lista(), TIPOS, lucroEstimado, minimoDe, nomeCat, nomeForn, nomeCanal, canalPadrao };
})();
