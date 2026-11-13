/* Fornecedores: lista com agrupamentos e filtros, ficha com cotações e histórico de compras. */
Telas.fornecedores = (function () {
  'use strict';
  const { h, ic, moeda, campo, selecao } = UI;
  const S = Dados.S;
  const F = { busca: '', grupo: 'regiao', etiqueta: '', cpf: '', nota: '', minimo: '' };
  const TIPOS = { online: 'Online', loja_fisica: 'Loja física', ambos: 'Online e loja' };
  const SIM_NAO = [{ v: 'sim', t: 'Sim' }, { v: 'nao', t: 'Não' }, { v: 'desconhecido', t: 'Não sei' }];
  const PERGUNTAS = `Olá! Tenho interesse em comprar para revenda. Pode me ajudar com algumas informações?
1. Vende para CPF ou só para CNPJ?
2. Qual o pedido mínimo e a quantidade mínima por item?
3. Qual o preço por faixa de quantidade?
4. Qual o frete para a nossa cidade?
5. Emite nota fiscal? Como funciona a troca de produto com defeito?`;

  const etiquetasDe = id => S.etiquetas_fornecedor.filter(e => e.fornecedor_id === id);
  const urlSite = s => /^https?:\/\//i.test(s) ? s : 'https://' + s;
  const telefone = c => { if (!c || c.includes('@')) return null; const d = c.replace(/\D/g, ''); return d.length >= 10 ? (d.length <= 11 ? '55' + d : d) : null; };
  const pilulaSN = (v, rotulo) => v === 'sim' ? h`<span class="pilula ok">${rotulo} ✓</span>` : v === 'nao' ? h`<span class="pilula neg">${rotulo} ✗</span>` : h`<span class="pilula neutra">${rotulo} ?</span>`;
  const estrelas = n => n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '';

  /* ───────── Lista ───────── */
  function filtrar() {
    const q = F.busca.trim().toLowerCase(), min = UI.numero(F.minimo);
    return S.fornecedores.filter(f => {
      if (q && !(f.nome + ' ' + (f.regiao || '') + ' ' + (f.cidade || '') + ' ' + (f.observacoes || '') + ' ' + S.fornecedor_produtos.filter(c => c.fornecedor_id === f.id).map(c => c.descricao).join(' ')).toLowerCase().includes(q)) return false;
      if (F.etiqueta && !etiquetasDe(f.id).some(e => e.etiqueta === F.etiqueta)) return false;
      if (F.cpf && f.aceita_cpf !== F.cpf) return false;
      if (F.nota && f.emite_nota !== F.nota) return false;
      if (min !== null && (f.pedido_minimo == null || f.pedido_minimo > min)) return false;
      return true;
    }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  function grupos(lista) {
    const mapa = new Map(), add = (k, f) => { if (!mapa.has(k)) mapa.set(k, []); mapa.get(k).push(f); };
    for (const f of lista) {
      if (F.grupo === 'lugar') add(f.cidade ? `${f.cidade}${f.estado ? ' / ' + f.estado : ''}` : 'Sem local informado', f);
      else if (F.grupo === 'regiao') add(f.regiao || 'Sem região ou polo', f);
      else if (F.grupo === 'produto') {
        const nomes = [...new Set(S.fornecedor_produtos.filter(c => c.fornecedor_id === f.id).map(c => {
          const p = S.produtos.find(x => x.id === c.produto_id); return (p ? p.nome : c.descricao).trim(); }))];
        if (!nomes.length) add('Sem produtos cotados', f); else nomes.forEach(n => add(n, f));
      } else add('', f);
    }
    const fim = ['Sem local informado', 'Sem região ou polo', 'Sem produtos cotados'];
    return [...mapa.entries()].sort((a, b) => (fim.includes(a[0]) - fim.includes(b[0])) || a[0].localeCompare(b[0], 'pt-BR'));
  }
  function linhaForn(f) {
    const cots = S.fornecedor_produtos.filter(c => c.fornecedor_id === f.id).length;
    const meta = [TIPOS[f.tipo], f.pedido_minimo ? `mínimo ${moeda(f.pedido_minimo)}` : 'mínimo não informado', cots ? `${cots} cotaç${cots === 1 ? 'ão' : 'ões'}` : null].filter(Boolean).join(' · ');
    return h`<a class="linha" href="#/fornecedores/${f.id}"><span class="thumb" style="background:linear-gradient(135deg,#8a8fa8,#8a8fa899)"><span>${f.nome.charAt(0).toUpperCase()}</span></span>
      <div class="meio"><b>${f.nome}</b><span>${meta}</span></div>
      <div class="fim" style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">${pilulaSN(f.aceita_cpf, 'CPF')}${f.avaliacao ? h`<small class="aviso-txt">${estrelas(f.avaliacao)}</small>` : ''}</div></a>`;
  }
  function itens() {
    const lista = filtrar();
    if (!S.fornecedores.length) return UI.vazio('Nenhum fornecedor cadastrado ainda.', h`<button type="button" class="btn primario" data-acao="forn.novo">${ic('mais')} Cadastrar fornecedor</button>`);
    if (!lista.length) return UI.vazio('Nenhum fornecedor com esses filtros.');
    return h`${grupos(lista).map(([nome, fs]) => h`<section class="secao" style="margin-top:14px">${nome ? h`<div class="secao-topo"><h2>${nome}</h2><small>${fs.length}</small></div>` : ''}
      <div class="card lista">${fs.map(linhaForn)}</div></section>`)}`;
  }
  function lista() {
    const tags = [...new Set(S.etiquetas_fornecedor.map(e => e.etiqueta))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return h`${UI.cabecalho({ titulo: 'Fornecedores', voltar: '#/ajustes', acoes: h`<button type="button" class="btn primario peq" data-acao="forn.novo">${ic('mais')} Fornecedor</button>` })}
      <div class="busca">${ic('busca')}<input type="search" placeholder="Buscar por nome, lugar ou produto" value="${F.busca}" data-digitar="forn.busca" aria-label="Buscar fornecedor"></div>
      <div class="campo" style="margin-bottom:10px"><span>Agrupar por</span>${UI.seg('grupo', [{ v: 'regiao', t: 'Região' }, { v: 'lugar', t: 'Lugar' }, { v: 'produto', t: 'Produto' }, { v: 'nenhum', t: 'Lista' }], F.grupo, 'forn.grupo')}</div>
      ${tags.length ? UI.chips([{ v: '', t: 'Todas as etiquetas' }, ...tags.map(t => ({ v: t, t }))], F.etiqueta, 'forn.etiqueta') : ''}
      <div class="grade3" style="margin-top:10px">
        ${selecao('Aceita CPF', 'cpf', [{ v: '', t: 'Todos' }, ...SIM_NAO], F.cpf, { extra: 'data-muda="forn.filtro"' })}
        ${selecao('Emite nota', 'nota', [{ v: '', t: 'Todos' }, ...SIM_NAO], F.nota, { extra: 'data-muda="forn.filtro"' })}
        ${campo('Mínimo até (R$)', 'minimo', { dec: true, valor: F.minimo, ph: 'Qualquer', extra: 'data-digitar="forn.minimo"' })}</div>
      <div id="forn-itens">${itens()}</div>`;
  }
  const redesenhar = () => { const el = document.getElementById('forn-itens'); if (el) UI.render(el, itens()); };
  UI.aoDigitar['forn.busca'] = el => { F.busca = el.value; redesenhar(); };
  UI.aoDigitar['forn.minimo'] = el => { F.minimo = el.value; redesenhar(); };
  UI.acoes['forn.grupo'] = d => { F.grupo = d.v; App.atualizar(); };
  UI.acoes['forn.etiqueta'] = d => { F.etiqueta = d.v; App.atualizar(); };
  UI.aoMudar['forn.filtro'] = el => { F[el.name] = el.value; redesenhar(); };

  /* ───────── Ficha ───────── */
  function ficha(id) {
    const f = S.fornecedores.find(x => x.id === id);
    if (!f) return h`${UI.cabecalho({ titulo: 'Fornecedor', voltar: '#/fornecedores' })}${UI.vazio('Fornecedor não encontrado.')}`;
    const tel = telefone(f.contato), cots = S.fornecedor_produtos.filter(c => c.fornecedor_id === f.id).sort((a, b) => b.data_cotacao.localeCompare(a.data_cotacao));
    const compras = S.movimentacoes.filter(m => m.tipo === 'entrada' && m.fornecedor_id === f.id).sort((a, b) => Calc.ordemMov(b, a));
    const totalCompras = compras.reduce((s, m) => s + m.quantidade * m.custo_unitario + Number(m.frete || 0), 0);
    const tags = etiquetasDe(f.id);
    const local = [f.cidade, f.estado].filter(Boolean).join(' / ');
    const linha = (rot, v) => v ? h`<div class="linha"><div class="meio"><span>${rot}</span><b style="white-space:normal">${v}</b></div></div>` : '';
    return h`${UI.cabecalho({ titulo: f.nome, voltar: '#/fornecedores', sub: [TIPOS[f.tipo], local, f.regiao].filter(Boolean).join(' · '),
      acoes: h`<button type="button" class="btn-icone" data-acao="forn.editar" data-id="${f.id}" aria-label="Editar">${ic('editar')}</button>` })}
      <div class="botoes" style="margin:0 0 12px;flex-wrap:wrap">
        ${tel ? h`<a class="btn primario" href="https://wa.me/${tel}" target="_blank" rel="noopener">${ic('whats')} WhatsApp</a>` : ''}
        ${f.site ? h`<a class="btn sec" href="${urlSite(f.site)}" target="_blank" rel="noopener">${ic('link')} Abrir site</a>` : ''}
        <button type="button" class="btn sec" data-acao="forn.perguntas" ${tel ? `data-tel="${tel}"` : ''}>${ic('copiar')} Perguntas</button></div>
      <div class="card lista">
        ${linha('Contato', f.contato)}${linha('Pedido mínimo', f.pedido_minimo ? moeda(f.pedido_minimo) : 'Não informado')}
        <div class="linha"><div class="meio"><span>Aceita CPF · Emite nota</span><b style="white-space:normal;display:flex;gap:6px;margin-top:3px">${pilulaSN(f.aceita_cpf, 'CPF')}${pilulaSN(f.emite_nota, 'Nota fiscal')}</b></div></div>
        ${f.avaliacao ? linha('Avaliação', estrelas(f.avaliacao)) : ''}${linha('Observações', f.observacoes)}</div>
      ${UI.secao('Etiquetas', h`<div class="card"><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:${tags.length ? 12 : 0}px">${tags.map(t => h`<span class="chip">${t.etiqueta}<button type="button" class="btn-texto neg" style="padding:0 0 0 4px" data-acao="forn.etiquetaX" data-id="${t.id}" aria-label="Remover ${t.etiqueta}">✕</button></span>`)}</div>
        <form data-form="forn.etiqueta" style="display:flex;gap:8px"><input type="hidden" name="forn" value="${f.id}"><input type="text" name="etiqueta" placeholder="Nova etiqueta (ex.: moto, entrega rápida)" required maxlength="30" aria-label="Nova etiqueta"><button class="btn primario peq" type="submit">Adicionar</button></form></div>`)}
      ${UI.secao('Produtos e preços cotados', h`<div class="card">${cots.length ? UI.tabela([{ t: 'Produto' }, { t: 'Preço', cls: 'r' }, { t: 'Mín.', cls: 'r' }, { t: 'Cotado em', cls: 'r' }],
        cots.map(c => { const p = S.produtos.find(x => x.id === c.produto_id);
          return [h`<button type="button" class="btn-texto" style="text-align:left;color:inherit" data-acao="cot.editar" data-id="${c.id}">${c.descricao}</button>${p ? h` <a href="#/estoque/${p.id}" class="pilula neutra">${p.nome}</a>` : ''}${c.observacao ? h`<br><small>${c.observacao}</small>` : ''}`, h`<b>${moeda(c.preco)}</b>`, c.qtd_minima || '—', UI.dataCurta(c.data_cotacao)]; }))
        : UI.vazio('Nenhuma cotação ainda.')}
        <button type="button" class="btn sec peq" style="margin-top:12px" data-acao="cot.nova" data-forn="${f.id}">${ic('mais')} Cotação</button></div>`)}
      ${UI.secao('Compras feitas com este fornecedor', h`<div class="card">${compras.length ? h`${UI.tabela([{ t: 'Data' }, { t: 'Produto' }, { t: 'Qtd', cls: 'r' }, { t: 'Custo un.', cls: 'r' }, { t: 'Total', cls: 'r' }],
        compras.map(m => [UI.dataCurta(m.data), h`<a href="#/estoque/${m.produto_id}">${(S.produtos.find(p => p.id === m.produto_id) || {}).nome || '—'}</a>`, m.quantidade, moeda(m.custo_unitario), moeda(m.quantidade * m.custo_unitario + Number(m.frete || 0))]))}
        <div class="linha" style="margin-top:6px"><div class="meio"><b>Total comprado</b></div><div class="fim">${moeda(totalCompras)}</div></div>` : UI.vazio('Nenhuma compra registrada. As entradas de lote com este fornecedor aparecem aqui.')}</div>`)}
      <div style="margin-top:24px;text-align:center"><button type="button" class="btn-texto neg" data-acao="forn.excluir" data-id="${f.id}">Excluir fornecedor</button></div>`;
  }
  UI.acoes['forn.perguntas'] = async d => {
    try { await navigator.clipboard.writeText(PERGUNTAS); UI.aviso('Perguntas copiadas. É só colar na conversa.'); }
    catch (e) {
      const t = document.createElement('textarea'); t.value = PERGUNTAS; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); UI.aviso('Perguntas copiadas. É só colar na conversa.'); } catch (e2) { UI.aviso('Não consegui copiar.', 'erro'); }
      t.remove();
    }
  };
  UI.aoEnviar['forn.etiqueta'] = async (form, d) => {
    const et = String(d.get('etiqueta')).trim().toLowerCase(), id = d.get('forn');
    if (!et) return;
    if (etiquetasDe(id).some(e => e.etiqueta === et)) { UI.aviso('Essa etiqueta já está aqui.', 'erro'); return; }
    try { await Dados.inserir('etiquetas_fornecedor', { fornecedor_id: id, etiqueta: et }); App.atualizar(); } catch (e) { UI.erro(e); }
  };
  UI.acoes['forn.etiquetaX'] = async d => { try { await Dados.remover('etiquetas_fornecedor', d.id); App.atualizar(); } catch (e) { UI.erro(e); } };
  UI.acoes['forn.excluir'] = async d => {
    const f = S.fornecedores.find(x => x.id === d.id), n = S.movimentacoes.filter(m => m.fornecedor_id === f.id).length;
    if (await UI.confirmar({ titulo: 'Excluir fornecedor', ok: 'Excluir', perigo: true,
      texto: `Excluir "${f.nome}" e as cotações dele?${n ? ` ${n} compra${n === 1 ? '' : 's'} registrada${n === 1 ? '' : 's'} continuará${n === 1 ? '' : 'ão'} no histórico, sem fornecedor.` : ''}` }))
      try { await Dados.remover('fornecedores', f.id); location.hash = '#/fornecedores'; UI.aviso('Fornecedor excluído'); } catch (e) { UI.erro(e); }
  };

  /* ───────── Cadastro do fornecedor ───────── */
  function formForn(f) {
    const regioes = [...new Set(S.fornecedores.map(x => x.regiao).filter(Boolean))];
    UI.folha({ titulo: f ? 'Editar fornecedor' : 'Novo fornecedor', largo: true, corpo: h`<form data-form="forn.salvar">
      <input type="hidden" name="id" value="${f ? f.id : ''}">
      ${campo('Nome', 'nome', { req: true, valor: f ? f.nome : '' })}
      <div class="grade2">${campo('Site', 'site', { valor: f ? f.site : '', ph: 'exemplo.com.br' })}${campo('Contato', 'contato', { valor: f ? f.contato : '', ph: 'WhatsApp ou e-mail' })}</div>
      ${selecao('Tipo', 'tipo', Object.entries(TIPOS).map(([v, t]) => ({ v, t })), f ? f.tipo : 'online')}
      <div class="grade3">${campo('Cidade', 'cidade', { valor: f ? f.cidade : '' })}${campo('Estado (UF)', 'estado', { valor: f ? f.estado : '', extra: 'maxlength="2" autocapitalize="characters"' })}
        <label class="campo"><span>Região ou polo</span><input type="text" name="regiao" value="${f && f.regiao ? f.regiao : ''}" list="lista-regioes" placeholder="25 de Março, Brás, Online…"><datalist id="lista-regioes">${regioes.map(r => h`<option value="${r}">`)}</datalist></label></div>
      <div class="grade2">${campo('Pedido mínimo (R$)', 'pedido_minimo', { dec: true, valor: UI.campoNum(f ? f.pedido_minimo : '') })}
        ${selecao('Avaliação', 'avaliacao', [{ v: '', t: 'Sem avaliação' }, ...[1, 2, 3, 4, 5].map(n => ({ v: n, t: '★'.repeat(n) }))], f ? f.avaliacao : '')}</div>
      <div class="grade2">${selecao('Aceita CPF', 'aceita_cpf', SIM_NAO, f ? f.aceita_cpf : 'desconhecido')}${selecao('Emite nota fiscal', 'emite_nota', SIM_NAO, f ? f.emite_nota : 'desconhecido')}</div>
      ${UI.areaTexto('Observações', 'observacoes', f ? f.observacoes : '', 'Antes de pagar: conferir CNPJ, reputação (Reclame Aqui) e pedir nota fiscal.')}
      <div class="botoes"><button type="button" class="btn sec" data-acao="folha.fechar">Cancelar</button><button class="btn primario" type="submit">Salvar</button></div></form>` });
  }
  UI.acoes['forn.novo'] = () => formForn(null);
  UI.acoes['forn.editar'] = d => formForn(S.fornecedores.find(x => x.id === d.id));
  UI.aoEnviar['forn.salvar'] = async (form, d) => {
    await UI.ocupado(form.querySelector('button[type=submit]'), async () => {
      const dados = { nome: String(d.get('nome')).trim(), site: String(d.get('site')).trim(), contato: String(d.get('contato')).trim(), tipo: d.get('tipo'),
        cidade: d.get('cidade'), estado: String(d.get('estado')).toUpperCase(), regiao: String(d.get('regiao')).trim(), pedido_minimo: UI.numero(d.get('pedido_minimo')),
        aceita_cpf: d.get('aceita_cpf'), emite_nota: d.get('emite_nota'), avaliacao: d.get('avaliacao') ? Number(d.get('avaliacao')) : null, observacoes: d.get('observacoes') };
      if (!dados.nome) throw new Error('O nome é obrigatório.');
      const id = d.get('id'), salvo = id ? await Dados.atualizar('fornecedores', id, dados) : await Dados.inserir('fornecedores', dados);
      UI.fecharTodas();
      if (!id) location.hash = '#/fornecedores/' + salvo.id; else App.atualizar();
      UI.aviso('Fornecedor salvo');
    });
  };

  /* ───────── Cotações ───────── */
  function formCot(c, fornId) {
    const prods = S.produtos.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    UI.folha({ titulo: c ? 'Editar cotação' : 'Nova cotação', corpo: h`<form data-form="cot.salvar">
      <input type="hidden" name="id" value="${c ? c.id : ''}"><input type="hidden" name="forn" value="${fornId}">
      ${selecao('Produto cadastrado (opcional)', 'produto_id', [{ v: '', t: 'Nenhum, é um tipo de produto' }, ...prods.map(p => ({ v: p.id, t: p.nome }))], c ? c.produto_id : '', { extra: 'data-muda="cot.produto"' })}
      ${campo('Descrição', 'descricao', { req: true, valor: c ? c.descricao : '', ph: 'Produto ou tipo de produto cotado' })}
      <div class="grade3">${campo('Preço (R$)', 'preco', { dec: true, valor: UI.campoNum(c ? c.preco : '') })}${campo('Qtd mínima', 'qtd_minima', { dec: true, valor: c && c.qtd_minima ? c.qtd_minima : '' })}
        ${campo('Cotado em', 'data_cotacao', { tipo: 'date', valor: c ? c.data_cotacao : Calc.hoje() })}</div>
      ${UI.areaTexto('Observação', 'observacao', c ? c.observacao : '', 'Ex.: preço de 3 a 23 unidades')}
      <div class="botoes">${c ? h`<button type="button" class="btn sec neg" data-acao="cot.excluir" data-id="${c.id}">Excluir</button>` : ''}<button class="btn primario" type="submit">Salvar</button></div></form>` });
  }
  UI.acoes['cot.nova'] = d => formCot(null, d.forn);
  UI.acoes['cot.editar'] = d => { const c = S.fornecedor_produtos.find(x => x.id === d.id); formCot(c, c.fornecedor_id); };
  UI.aoMudar['cot.produto'] = el => { const p = S.produtos.find(x => x.id === el.value), desc = el.form.elements.descricao; if (p && !desc.value.trim()) desc.value = p.nome; };
  UI.aoEnviar['cot.salvar'] = async (form, d) => {
    await UI.ocupado(form.querySelector('button[type=submit]'), async () => {
      const dados = { fornecedor_id: d.get('forn'), produto_id: d.get('produto_id') || null, descricao: String(d.get('descricao')).trim(), preco: UI.numero(d.get('preco')),
        qtd_minima: UI.numero(d.get('qtd_minima')) === null ? null : Math.round(UI.numero(d.get('qtd_minima'))), data_cotacao: d.get('data_cotacao') || Calc.hoje(), observacao: d.get('observacao') };
      if (!dados.descricao) throw new Error('Descreva o produto cotado.');
      if (d.get('id')) await Dados.atualizar('fornecedor_produtos', d.get('id'), dados); else await Dados.inserir('fornecedor_produtos', dados);
      UI.fecharTodas(); App.atualizar(); UI.aviso('Cotação salva');
    });
  };
  UI.acoes['cot.excluir'] = async d => { try { await Dados.remover('fornecedor_produtos', d.id); UI.fecharTodas(); App.atualizar(); UI.aviso('Cotação excluída'); } catch (e) { UI.erro(e); } };

  return { render: arg => arg ? ficha(arg) : lista() };
})();
