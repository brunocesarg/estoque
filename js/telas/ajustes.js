/* Ajustes: a central de controle. Tudo o que é personalizável fica aqui. */
Telas.ajustes = (function () {
  'use strict';
  const { h, ic, moeda, campo, selecao } = UI;
  const S = Dados.S;
  let mesCustos = Calc.inicioMes(Calc.hoje());

  const SECOES = [
    { id: 'aparencia', t: 'Aparência', d: 'Tema, tamanho do texto e modo leve', i: 'ajustes' },
    { id: 'categorias', t: 'Categorias', d: 'Criar, renomear, cor, ordem e excluir', i: 'estoque' },
    { id: 'canais', t: 'Canais e taxas', d: 'Canais de venda e faixas de comissão', i: 'simular' },
    { id: 'custos', t: 'Custos padrão', d: 'Embalagem, imposto, CPF ou CNPJ, custos fixos do mês', i: 'painel' },
    { id: 'metas', t: 'Metas e alertas', d: 'Margem mínima, estoque mínimo, produto parado, meta do mês', i: 'alerta' },
    { id: 'painel', t: 'Painel', d: 'Quais cartões aparecem e em que ordem', i: 'grade' },
    { id: 'dicas', t: 'Dicas de mercado', d: 'O que os dados dizem e o que fazer', i: 'ok', href: '#/dicas' },
    { id: 'planejamento', t: 'Planejamento de metas', d: 'Metas por mês, semestre e ano', i: 'painel', href: '#/planejamento' },
    { id: 'ideias', t: 'Ideias de produtos', d: 'Candidatos para ampliar o catálogo', i: 'estoque', href: '#/ideias' },
    { id: 'plataformas', t: 'Plataformas', d: 'Onde vender, considerando as taxas', i: 'simular', href: '#/plataformas' },
    { id: 'fornecedores', t: 'Fornecedores', d: 'Abrir a lista de fornecedores', i: 'fornecedores', href: '#/fornecedores' },
    { id: 'dados', t: 'Dados', d: 'Exportar tudo em planilha e carga inicial', i: 'copiar' },
    { id: 'conta', t: 'Conta', d: 'Trocar senha e sair', i: 'sair' }
  ];

  const voltar = '#/ajustes';
  const cab = (t, sub) => UI.cabecalho({ titulo: t, sub, voltar });
  const salvarOk = async (fn, msg = 'Salvo') => { try { await fn(); UI.aviso(msg); } catch (e) { UI.erro(e); } };
  const num = v => UI.numero(v);

  /* ───────── Lista de seções ───────── */
  function indice() {
    return h`${UI.cabecalho({ titulo: 'Ajustes', sub: 'Central de controle' })}
      <div class="card lista">${SECOES.map(s => h`<a class="linha" href="${s.href || '#/ajustes/' + s.id}">
        <span class="btn-icone">${ic(s.i)}</span><div class="meio"><b>${s.t}</b><span>${s.d}</span></div>${ic('seta', 'seta')}</a>`)}</div>`;
  }

  /* ───────── Aparência ───────── */
  const MINIS = {
    a: '<i style="left:8px;top:8px;width:54%;height:30px;background:rgba(255,255,255,.18)"></i><i style="right:8px;top:30px;width:40%;height:44px;background:rgba(122,107,255,.7)"></i><i style="left:8px;bottom:8px;right:8px;height:16px;border-radius:10px;background:rgba(255,255,255,.2)"></i>',
    b: '<i style="left:8px;top:8px;width:54%;height:30px;background:rgba(255,255,255,.8)"></i><i style="right:8px;top:30px;width:40%;height:44px;background:rgba(255,255,255,.7)"></i><i style="left:8px;bottom:8px;right:8px;height:16px;border-radius:10px;background:#fff"></i>',
    c: '<i style="left:8px;top:8px;width:54%;height:30px;background:#212327;border:1px solid #2e3035"></i><i style="right:8px;top:30px;width:40%;height:44px;background:#212327;border:1px solid #2e3035"></i><i style="left:8px;bottom:8px;right:8px;height:16px;border-radius:10px;background:#2b2d32"></i><i style="left:14px;top:14px;width:20px;height:5px;background:#4cd787"></i>',
    auto: '<i style="left:8px;top:8px;width:30%;height:30px;background:rgba(255,255,255,.8)"></i><i style="right:8px;top:30px;width:30%;height:44px;background:rgba(122,107,255,.7)"></i>'
  };
  const DESC_TEMA = { a: 'Noturno, com vidro e cores suaves', b: 'Claro, com vidro fosco', c: 'Sóbrio e denso, com tabelas', auto: 'Claro de dia, noturno à noite' };
  function aparencia() {
    const { tema, texto, leve } = Tema.ler();
    return h`${cab('Aparência', 'A escolha vale só para este aparelho')}
      ${UI.secao('Tema', h`<div class="temas">${Object.entries(Tema.TEMAS).map(([k, nome]) => h`
        <button type="button" class="tema-op${tema === k ? ' sel' : ''}" data-acao="aj.tema" data-v="${k}">
          <div class="mini mini-${k}">${UI.raw(MINIS[k])}</div><b>${k === 'auto' ? nome : k.toUpperCase() + ' · ' + nome}</b><small>${DESC_TEMA[k]}</small></button>`)}</div>`)}
      ${UI.secao('Tamanho do texto', h`<div class="card">${UI.seg('texto', [{ v: 'p', t: 'Pequeno' }, { v: 'm', t: 'Médio' }, { v: 'g', t: 'Grande' }], texto, 'aj.texto')}</div>`)}
      ${UI.secao('Modo leve', h`<div class="card"><p class="mudo" style="margin-bottom:10px;font-size:.85rem">Troca o vidro por cor sólida e tira as animações. No automático, liga sozinho se o aparelho pedir menos transparência ou movimento.</p>
        ${UI.seg('leve', [{ v: 'auto', t: 'Automático' }, { v: '1', t: 'Ligado' }, { v: '0', t: 'Desligado' }], leve, 'aj.leve')}</div>`)}`;
  }
  UI.acoes['aj.tema'] = d => { Tema.gravar('tema', d.v); App.atualizar(); };
  UI.acoes['aj.texto'] = d => { Tema.gravar('texto', d.v); App.atualizar(); };
  UI.acoes['aj.leve'] = d => { Tema.gravar('leve', d.v); App.atualizar(); };

  /* ───────── Categorias ───────── */
  function categorias() {
    const cats = Dados.catsOrdenadas();
    return h`${cab('Categorias', 'Livres: crie as que quiser')}
      <div class="card">${cats.length ? cats.map((c, i) => {
        const n = S.produtos.filter(p => p.categoria_id === c.id).length;
        return h`<div class="ordem-linha">
          <input type="color" class="cor-input" value="${c.cor}" data-muda="cat.cor" data-id="${c.id}" aria-label="Cor de ${c.nome}">
          <div class="nome"><input type="text" value="${c.nome}" data-muda="cat.nome" data-id="${c.id}" aria-label="Nome da categoria" style="min-height:38px;padding:6px 10px"><small>${n} produto${n === 1 ? '' : 's'}</small></div>
          <button type="button" class="btn-icone" data-acao="cat.mover" data-id="${c.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir"><svg class="ico" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg></button>
          <button type="button" class="btn-icone" data-acao="cat.mover" data-id="${c.id}" data-dir="1" ${i === cats.length - 1 ? 'disabled' : ''} aria-label="Descer"><svg class="ico" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>
          <button type="button" class="btn-icone" data-acao="cat.excluir" data-id="${c.id}" aria-label="Excluir">${ic('lixo')}</button></div>`;
      }) : UI.vazio('Nenhuma categoria ainda.')}</div>
      ${UI.secao('Nova categoria', h`<form class="card" data-form="cat.nova"><div style="display:flex;gap:10px;align-items:flex-end">
        <label class="campo" style="flex:1;margin:0"><span>Nome</span><input type="text" name="nome" required placeholder="Ex.: Casa"></label>
        <input type="color" name="cor" class="cor-input" value="${sugerirCor(cats.length)}" style="height:46px;width:52px" aria-label="Cor">
        <button class="btn primario" type="submit">Criar</button></div></form>`)}`;
  }
  const PALETA = ['#7a6bff', '#18a8ff', '#ff5fa2', '#2fc98e', '#ffb155', '#e0566b', '#8a8fa8'];
  const sugerirCor = i => PALETA[i % PALETA.length];
  UI.aoMudar['cat.nome'] = el => salvarOk(async () => {
    const nome = el.value.trim();
    if (!nome) { App.atualizar(); throw new Error('O nome não pode ficar vazio.'); }
    await Dados.atualizar('categorias', el.dataset.id, { nome });
  });
  UI.aoMudar['cat.cor'] = el => salvarOk(() => Dados.atualizar('categorias', el.dataset.id, { cor: el.value }));
  UI.aoEnviar['cat.nova'] = (f, d) => salvarOk(async () => {
    await Dados.inserir('categorias', { nome: String(d.get('nome')).trim(), cor: d.get('cor'), ordem: S.categorias.length });
    App.atualizar();
  }, 'Categoria criada');
  UI.acoes['cat.mover'] = (d) => salvarOk(async () => {
    const lista = Dados.catsOrdenadas(), i = lista.findIndex(c => c.id === d.id), j = i + Number(d.dir);
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    for (const [k, c] of lista.entries()) if (c.ordem !== k) await Dados.atualizar('categorias', c.id, { ordem: k });
    App.atualizar();
  }, 'Ordem salva');
  UI.acoes['cat.excluir'] = async (d) => {
    const c = S.categorias.find(x => x.id === d.id);
    const prods = S.produtos.filter(p => p.categoria_id === c.id);
    if (!prods.length) {
      if (await UI.confirmar({ titulo: 'Excluir categoria', texto: `Excluir "${c.nome}"?`, ok: 'Excluir', perigo: true })) {
        await salvarOk(async () => { await Dados.remover('categorias', c.id); App.atualizar(); }, 'Categoria excluída');
      }
      return;
    }
    const outras = Dados.catsOrdenadas().filter(x => x.id !== c.id);
    UI.folha({ titulo: `Excluir "${c.nome}"`, corpo: h`<form data-form="cat.excluirMover">
      <p class="texto-folha" style="margin-bottom:12px">Há ${prods.length} produto${prods.length === 1 ? '' : 's'} nesta categoria. Escolha para onde movê-los antes de excluir.</p>
      <input type="hidden" name="id" value="${c.id}">
      ${selecao('Mover os produtos para', 'destino', [...outras.map(o => ({ v: o.id, t: o.nome })), { v: '', t: 'Sem categoria' }], outras[0] ? outras[0].id : '')}
      <div class="botoes"><button type="button" class="btn sec" data-acao="folha.fechar">Cancelar</button><button type="submit" class="btn perigo">Mover e excluir</button></div></form>` });
  };
  UI.aoEnviar['cat.excluirMover'] = (f, d) => salvarOk(async () => {
    const id = d.get('id'), destino = d.get('destino') || null;
    for (const p of S.produtos.filter(x => x.categoria_id === id)) await Dados.atualizar('produtos', p.id, { categoria_id: destino });
    await Dados.remover('categorias', id);
    UI.fecharTodas(); App.atualizar();
  }, 'Categoria excluída');

  /* ───────── Canais e taxas ───────── */
  const descFaixa = f => `${f.preco_de > 0 || f.preco_ate ? `${moeda(f.preco_de)} ${f.preco_ate !== null && f.preco_ate !== undefined ? 'a ' + moeda(f.preco_ate) : 'ou mais'}` : 'Qualquer preço'} · ${UI.decimal(f.comissao_pct, 1)}%${f.taxa_fixa > 0 ? ' + ' + moeda(f.taxa_fixa) : ''}`;
  function canais() {
    const cs = Dados.canaisOrdenados(), c0 = Dados.cfg();
    return h`${cab('Canais e taxas', 'Onde você vende e quanto cada um cobra')}
      <div class="aviso-caixa">Os valores iniciais vêm da pesquisa de 13/11/2026. Confira nos sites oficiais (Central do Vendedor) antes de confiar nos lucros.</div>
      ${cs.map(c => {
        const fx = S.faixas_taxa.filter(f => f.canal_id === c.id).sort((a, b) => a.preco_de - b.preco_de);
        return h`<section class="card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <h3 style="flex:1;font-size:1.05rem">${c.nome}${c0.canal_padrao_id === c.id ? h` <span class="pilula ok">padrão</span>` : ''}</h3>
          <button type="button" class="btn-icone" data-acao="canal.editar" data-id="${c.id}" aria-label="Renomear">${ic('editar')}</button>
          <button type="button" class="btn-icone" data-acao="canal.excluir" data-id="${c.id}" aria-label="Excluir">${ic('lixo')}</button></div>
          ${fx.length ? fx.map(f => h`<button type="button" class="linha" data-acao="faixa.editar" data-id="${f.id}"><div class="meio"><b>${descFaixa(f)}</b>${f.observacao ? h`<span>${f.observacao}</span>` : ''}</div>${ic('seta', 'seta')}</button>`)
            : h`<p class="mudo" style="padding:8px 0;font-size:.85rem">Sem faixas: este canal não cobra nada nos cálculos.</p>`}
          <button type="button" class="btn sec peq" style="margin-top:10px" data-acao="faixa.nova" data-canal="${c.id}">${ic('mais')} Faixa de preço</button></section>`;
      })}
      <div style="margin-top:14px"><button type="button" class="btn primario bloco" data-acao="canal.novo">${ic('mais')} Novo canal</button></div>
      ${cs.length ? UI.secao('Canal padrão', h`<form class="card" data-form="canal.padrao"><p class="mudo" style="margin-bottom:10px;font-size:.85rem">Usado para estimar o lucro por venda na lista do estoque.</p>
        ${selecao('Canal', 'canal', cs.map(c => ({ v: c.id, t: c.nome })), c0.canal_padrao_id)}<button class="btn primario bloco" type="submit">Salvar</button></form>`) : ''}`;
  }
  UI.aoEnviar['canal.padrao'] = (f, d) => salvarOk(async () => { await Dados.salvarConfig({ canal_padrao_id: d.get('canal') }); App.atualizar(); });
  UI.acoes['canal.novo'] = () => UI.folha({ titulo: 'Novo canal', corpo: h`<form data-form="canal.salvar">${campo('Nome do canal', 'nome', { req: true, ph: 'Ex.: Amazon' })}
    <div class="botoes"><button type="button" class="btn sec" data-acao="folha.fechar">Cancelar</button><button class="btn primario" type="submit">Criar</button></div></form>` });
  UI.acoes['canal.editar'] = d => { const c = S.canais.find(x => x.id === d.id);
    UI.folha({ titulo: 'Renomear canal', corpo: h`<form data-form="canal.salvar"><input type="hidden" name="id" value="${c.id}">${campo('Nome do canal', 'nome', { req: true, valor: c.nome })}
    <div class="botoes"><button type="button" class="btn sec" data-acao="folha.fechar">Cancelar</button><button class="btn primario" type="submit">Salvar</button></div></form>` }); };
  UI.aoEnviar['canal.salvar'] = (f, d) => salvarOk(async () => {
    const nome = String(d.get('nome')).trim(), id = d.get('id');
    if (id) await Dados.atualizar('canais', id, { nome });
    else { const novo = await Dados.inserir('canais', { nome, ordem: S.canais.length }); if (!Dados.cfg().canal_padrao_id) await Dados.salvarConfig({ canal_padrao_id: novo.id }); }
    UI.fecharTodas(); App.atualizar();
  });
  UI.acoes['canal.excluir'] = async d => {
    const c = S.canais.find(x => x.id === d.id), usos = S.movimentacoes.filter(m => m.canal_id === c.id).length;
    const ok = await UI.confirmar({ titulo: 'Excluir canal', ok: 'Excluir', perigo: true,
      texto: `Excluir "${c.nome}" e as faixas de taxa dele?${usos ? ` ${usos} lançamento${usos === 1 ? '' : 's'} ficará${usos === 1 ? '' : 'ão'} sem canal.` : ''}` });
    if (ok) await salvarOk(async () => { await Dados.remover('canais', c.id); App.atualizar(); }, 'Canal excluído');
  };
  function formFaixa(f, canalId) {
    UI.folha({ titulo: f ? 'Editar faixa' : 'Nova faixa', corpo: h`<form data-form="faixa.salvar">
      <input type="hidden" name="id" value="${f ? f.id : ''}"><input type="hidden" name="canal_id" value="${canalId}">
      <div class="grade2">${campo('Preço de (R$)', 'de', { dec: true, req: true, valor: UI.campoNum(f ? f.preco_de : 0) })}
      ${campo('Preço até (R$)', 'ate', { dec: true, valor: UI.campoNum(f ? f.preco_ate : ''), dica: 'Vazio = sem limite' })}</div>
      <div class="grade2">${campo('Comissão (%)', 'pct', { dec: true, req: true, valor: UI.campoNum(f ? f.comissao_pct : '') })}
      ${campo('Taxa fixa por item (R$)', 'fixa', { dec: true, valor: UI.campoNum(f ? f.taxa_fixa : 0) })}</div>
      ${UI.areaTexto('Observação', 'obs', f ? f.observacao : '')}
      <div class="botoes">${f ? h`<button type="button" class="btn sec neg" data-acao="faixa.excluir" data-id="${f.id}">Excluir</button>` : ''}<button class="btn primario" type="submit">Salvar</button></div></form>` });
  }
  UI.acoes['faixa.nova'] = d => formFaixa(null, d.canal);
  UI.acoes['faixa.editar'] = d => { const f = S.faixas_taxa.find(x => x.id === d.id); formFaixa(f, f.canal_id); };
  UI.aoEnviar['faixa.salvar'] = (f, d) => salvarOk(async () => {
    const dados = { canal_id: d.get('canal_id'), preco_de: num(d.get('de')) ?? 0, preco_ate: num(d.get('ate')), comissao_pct: num(d.get('pct')) ?? 0,
      taxa_fixa: num(d.get('fixa')) ?? 0, observacao: d.get('obs') };
    if (dados.preco_ate !== null && dados.preco_ate < dados.preco_de) throw new Error('O preço final precisa ser maior que o inicial.');
    if (d.get('id')) await Dados.atualizar('faixas_taxa', d.get('id'), dados); else await Dados.inserir('faixas_taxa', dados);
    UI.fecharTodas(); App.atualizar();
  });
  UI.acoes['faixa.excluir'] = async d => {
    if (await UI.confirmar({ titulo: 'Excluir faixa', texto: 'Excluir esta faixa de taxa?', ok: 'Excluir', perigo: true }))
      await salvarOk(async () => { await Dados.remover('faixas_taxa', d.id); UI.fecharTodas(); App.atualizar(); }, 'Faixa excluída');
  };

  /* ───────── Custos padrão ───────── */
  function custos() {
    const c = Dados.cfg();
    const fixos = S.custos_fixos.filter(x => x.mes === mesCustos);
    const total = fixos.reduce((s, x) => s + Number(x.valor), 0);
    return h`${cab('Custos padrão', 'Entram nos cálculos de lucro')}
      <form class="card" data-form="custos">
        ${campo('Embalagem padrão por item (R$)', 'emb', { dec: true, valor: UI.campoNum(c.embalagem_padrao), dica: 'Cada produto pode ter a sua própria embalagem na ficha dele.' })}
        ${campo('Imposto sobre a venda (%)', 'imp', { dec: true, valor: UI.campoNum(c.imposto_pct), dica: 'Deixe 0 se ainda não calcula imposto.' })}
        <div class="campo"><span>Você vende como</span>${UI.seg('tipo', [{ v: 'CPF', t: 'CPF' }, { v: 'CNPJ', t: 'CNPJ' }], c.tipo_vendedor, 'custos.tipo')}<input type="hidden" name="tipo" value="${c.tipo_vendedor}"></div>
        ${campo('Adicional por item para vendedor CPF (R$)', 'cpf', { dec: true, valor: UI.campoNum(c.adicional_cpf), dica: 'A pesquisa indicou R$ 3 na Shopee, mas as fontes divergem. Confirmar na Central do Vendedor.' })}
        <button class="btn primario bloco" type="submit">Salvar</button></form>
      ${UI.secao('Custos fixos do mês', h`<div class="card">
        <div class="mes-nav"><button type="button" class="btn-icone" data-acao="fixo.mes" data-dir="-1" aria-label="Mês anterior">${ic('voltar')}</button><b>${UI.mesAno(mesCustos)}</b>
          <button type="button" class="btn-icone" data-acao="fixo.mes" data-dir="1" aria-label="Próximo mês" style="transform:scaleX(-1)">${ic('voltar')}</button></div>
        ${fixos.length ? fixos.map(x => h`<button type="button" class="linha" data-acao="fixo.editar" data-id="${x.id}"><div class="meio"><b>${x.descricao}</b></div><div class="fim">${moeda(x.valor)}</div></button>`) : UI.vazio('Nenhum custo fixo neste mês.')}
        ${fixos.length ? h`<div class="linha"><div class="meio"><b>Total do mês</b></div><div class="fim">${moeda(total)}</div></div>` : ''}
        <div class="botoes"><button type="button" class="btn sec" data-acao="fixo.copiar">Copiar do mês anterior</button><button type="button" class="btn primario" data-acao="fixo.novo">${ic('mais')} Custo</button></div></div>`)}`;
  }
  UI.acoes['custos.tipo'] = (d, el) => { el.closest('.seg').querySelectorAll('button').forEach(b => b.classList.toggle('sel', b === el)); document.querySelector('input[name=tipo]').value = d.v; };
  UI.aoEnviar.custos = (f, d) => salvarOk(() => Dados.salvarConfig({ embalagem_padrao: num(d.get('emb')) ?? 0, imposto_pct: num(d.get('imp')) ?? 0,
    tipo_vendedor: d.get('tipo'), adicional_cpf: num(d.get('cpf')) ?? 0 }));
  UI.acoes['fixo.mes'] = d => { const dt = Calc.parseData(mesCustos); dt.setMonth(dt.getMonth() + Number(d.dir)); mesCustos = Calc.fmtData(dt); App.atualizar(); };
  function formFixo(x) {
    UI.folha({ titulo: x ? 'Editar custo fixo' : 'Novo custo fixo', corpo: h`<form data-form="fixo.salvar"><input type="hidden" name="id" value="${x ? x.id : ''}">
      ${campo('Descrição', 'descricao', { req: true, valor: x ? x.descricao : '', ph: 'MEI, anúncios, embalagens em lote…' })}
      ${campo('Valor (R$)', 'valor', { dec: true, req: true, valor: UI.campoNum(x ? x.valor : '') })}
      <div class="botoes">${x ? h`<button type="button" class="btn sec neg" data-acao="fixo.excluir" data-id="${x.id}">Excluir</button>` : ''}<button class="btn primario" type="submit">Salvar</button></div></form>` });
  }
  UI.acoes['fixo.novo'] = () => formFixo(null);
  UI.acoes['fixo.editar'] = d => formFixo(S.custos_fixos.find(x => x.id === d.id));
  UI.aoEnviar['fixo.salvar'] = (f, d) => salvarOk(async () => {
    const dados = { descricao: String(d.get('descricao')).trim(), valor: num(d.get('valor')) ?? 0, mes: mesCustos };
    if (d.get('id')) await Dados.atualizar('custos_fixos', d.get('id'), dados); else await Dados.inserir('custos_fixos', dados);
    UI.fecharTodas(); App.atualizar();
  });
  UI.acoes['fixo.excluir'] = d => salvarOk(async () => { await Dados.remover('custos_fixos', d.id); UI.fecharTodas(); App.atualizar(); }, 'Custo excluído');
  UI.acoes['fixo.copiar'] = () => salvarOk(async () => {
    const ant = Calc.mesAnterior(mesCustos), origem = S.custos_fixos.filter(x => x.mes === ant);
    if (!origem.length) throw new Error('O mês anterior não tem custos fixos.');
    const ja = new Set(S.custos_fixos.filter(x => x.mes === mesCustos).map(x => x.descricao));
    const novos = origem.filter(x => !ja.has(x.descricao)).map(x => ({ descricao: x.descricao, valor: x.valor, mes: mesCustos }));
    if (!novos.length) throw new Error('Esses custos já estão neste mês.');
    await Dados.inserirVarios('custos_fixos', novos); App.atualizar();
  }, 'Custos copiados');

  /* ───────── Metas e alertas ───────── */
  function metas() {
    const c = Dados.cfg();
    return h`${cab('Metas e alertas')}
      <form class="card" data-form="metas">
        ${campo('Margem mínima desejada (%)', 'margem', { dec: true, valor: UI.campoNum(c.margem_minima_pct), dica: 'Produtos abaixo disso aparecem como alerta no painel.' })}
        ${campo('Estoque mínimo padrão (unidades)', 'minimo', { dec: true, valor: c.estoque_minimo_padrao, dica: 'Vale para o produto que não tem mínimo próprio.' })}
        ${campo('Dias sem vender para considerar parado', 'dias', { dec: true, valor: c.dias_parado })}
        ${campo('Meta de lucro do mês (R$)', 'meta', { dec: true, valor: UI.campoNum(c.meta_lucro_mes), dica: 'Vale para os meses sem meta própria no planejamento. Deixe 0 para não usar.' })}
        <button class="btn primario bloco" type="submit">Salvar</button></form>`;
  }
  UI.aoEnviar.metas = (f, d) => salvarOk(() => Dados.salvarConfig({ margem_minima_pct: num(d.get('margem')) ?? 0, estoque_minimo_padrao: Math.round(num(d.get('minimo')) ?? 0),
    dias_parado: Math.max(1, Math.round(num(d.get('dias')) ?? 30)), meta_lucro_mes: num(d.get('meta')) ?? 0 }));

  /* ───────── Painel (cartões) ───────── */
  function painel() {
    const lista = Telas.painel.cartoesConfig();
    return h`${cab('Painel', 'Escolha os cartões da tela inicial e a ordem')}
      <div class="card">${lista.map((c, i) => h`<div class="ordem-linha">
        <input type="checkbox" class="int" ${c.v ? 'checked' : ''} data-muda="pn.ver" data-id="${c.id}" aria-label="Mostrar ${c.titulo}">
        <div class="nome">${c.titulo}<small>${c.desc}</small></div>
        <button type="button" class="btn-icone" data-acao="pn.mover" data-id="${c.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir"><svg class="ico" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg></button>
        <button type="button" class="btn-icone" data-acao="pn.mover" data-id="${c.id}" data-dir="1" ${i === lista.length - 1 ? 'disabled' : ''} aria-label="Descer"><svg class="ico" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button></div>`)}</div>
      <p class="mudo" style="margin:10px 4px;font-size:.82rem">Os cartões escondidos continuam acessíveis: o painel não mostra, mas a conta segue sendo feita.</p>
      <button type="button" class="btn sec bloco" data-acao="pn.padrao">Restaurar o padrão</button>`;
  }
  const salvarPainel = lista => Dados.salvarPrefs({ cartoes: lista.map(c => ({ id: c.id, v: c.v })) });
  UI.aoMudar['pn.ver'] = el => salvarOk(async () => { const l = Telas.painel.cartoesConfig(); l.find(c => c.id === el.dataset.id).v = el.checked; await salvarPainel(l); });
  UI.acoes['pn.mover'] = d => salvarOk(async () => {
    const l = Telas.painel.cartoesConfig(), i = l.findIndex(c => c.id === d.id), j = i + Number(d.dir);
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]]; await salvarPainel(l); App.atualizar();
  }, 'Ordem salva');
  UI.acoes['pn.padrao'] = () => salvarOk(async () => { await Dados.salvarPrefs({ cartoes: null }); App.atualizar(); }, 'Padrão restaurado');

  /* ───────── Dados ───────── */
  function dados() {
    const vazio = !S.produtos.length && !S.fornecedores.length;
    return h`${cab('Dados')}
      ${UI.secao('Exportar', h`<div class="card"><p class="mudo" style="margin-bottom:12px;font-size:.88rem">Baixa tudo em uma planilha (.xlsx), uma aba por assunto. Serve de cópia de segurança: vale fazer uma por mês.</p>
        <button type="button" class="btn primario bloco" data-acao="dados.exportar">Baixar planilha</button></div>`)}
      ${UI.secao('Carga inicial', h`<div class="card"><p class="mudo" style="margin-bottom:12px;font-size:.88rem">Cadastra categorias, canais com as faixas de taxa, os 9 fornecedores e os produtos candidatos da pesquisa de 13/11/2026 (produtos entram inativos, só para simular).
        ${vazio ? '' : ' Só funciona com o cadastro vazio, e já existem produtos ou fornecedores aqui.'}</p>
        <button type="button" class="btn ${vazio ? 'primario' : 'sec'} bloco" data-acao="dados.semear" ${vazio ? '' : 'disabled'}>Carregar dados da pesquisa</button></div>`)}
      ${UI.secao('Resumo', h`<div class="card lista">${[['Produtos', S.produtos.length], ['Fornecedores', S.fornecedores.length], ['Lançamentos', S.movimentacoes.length], ['Categorias', S.categorias.length]]
        .map(([t, n]) => h`<div class="linha"><div class="meio"><b>${t}</b></div><div class="fim">${UI.inteiro(n)}</div></div>`)}</div>`)}
      ${Dados.demo ? UI.secao('Demonstração', h`<div class="card"><p class="mudo" style="margin-bottom:12px;font-size:.88rem">Apaga tudo o que você mexeu e volta aos dados de exemplo.</p>
        <button type="button" class="btn perigo bloco" data-acao="dados.reiniciar">Reiniciar demonstração</button></div>`) : ''}`;
  }
  UI.acoes['dados.semear'] = (d, el) => UI.ocupado(el, async () => { await Dados.semear(); await Dados.importarCatalogo(); App.atualizar(); UI.aviso('Dados da pesquisa carregados'); });
  UI.acoes['dados.reiniciar'] = async (d, el) => {
    if (await UI.confirmar({ titulo: 'Reiniciar demonstração', texto: 'Apagar os dados desta demonstração e começar de novo?', ok: 'Reiniciar', perigo: true }))
      await UI.ocupado(el, async () => { await Dados.reiniciarDemo(); App.atualizar(); UI.aviso('Demonstração reiniciada'); });
  };
  function carregarScript(src) {
    return new Promise((ok, no) => {
      if (window.XLSX) return ok();
      const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Não foi possível carregar o gerador de planilha. Verifique a internet.'));
      document.head.appendChild(s);
    });
  }
  UI.acoes['dados.exportar'] = (d, el) => UI.ocupado(el, async () => {
    await carregarScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    const nome = (lista, id) => { const x = lista.find(i => i.id === id); return x ? x.nome : ''; };
    const idx = Calc.indexar(S.produtos, S.movimentacoes);
    const aba = {
      Produtos: S.produtos.map(p => ({ Produto: p.nome, Código: p.codigo, Categoria: nome(S.categorias, p.categoria_id), Fornecedor: nome(S.fornecedores, p.fornecedor_id), Ativo: p.ativo ? 'sim' : 'não',
        Estoque: idx[p.id].estoque, 'Custo médio': Number(idx[p.id].custoMedio.toFixed(2)), 'Preço sugerido': p.preco_venda, 'Estoque mínimo': p.estoque_minimo, Embalagem: p.embalagem, Observações: p.observacoes })),
      Lançamentos: S.movimentacoes.slice().sort(Calc.ordemMov).map(m => { const p = S.produtos.find(x => x.id === m.produto_id);
        return { Data: m.data, Tipo: m.tipo, Produto: p ? p.nome : '', Quantidade: m.quantidade, 'Custo unitário': m.custo_unitario, Canal: nome(S.canais, m.canal_id), Fornecedor: nome(S.fornecedores, m.fornecedor_id),
          'Preço de venda': m.preco_venda, Comissão: m.comissao, 'Taxa fixa': m.taxa_fixa, 'Adicional CPF': m.adicional_cpf, Frete: m.frete, Embalagem: m.embalagem, Imposto: m.imposto, Lucro: Calc.lucroMov(m), Observação: m.observacao }; }),
      Fornecedores: S.fornecedores.map(f => ({ Nome: f.nome, Site: f.site, Contato: f.contato, Tipo: f.tipo, Cidade: f.cidade, Estado: f.estado, 'Região ou polo': f.regiao, 'Pedido mínimo': f.pedido_minimo,
        'Aceita CPF': f.aceita_cpf, 'Emite nota': f.emite_nota, Avaliação: f.avaliacao, Etiquetas: S.etiquetas_fornecedor.filter(e => e.fornecedor_id === f.id).map(e => e.etiqueta).join(', '), Observações: f.observacoes })),
      Cotações: S.fornecedor_produtos.map(c => ({ Fornecedor: nome(S.fornecedores, c.fornecedor_id), Produto: c.descricao, Preço: c.preco, 'Qtd mínima': c.qtd_minima, 'Data da cotação': c.data_cotacao, Observação: c.observacao })),
      Categorias: S.categorias.map(c => ({ Nome: c.nome, Cor: c.cor })),
      Taxas: S.faixas_taxa.map(f => ({ Canal: nome(S.canais, f.canal_id), 'Preço de': f.preco_de, 'Preço até': f.preco_ate, 'Comissão %': f.comissao_pct, 'Taxa fixa': f.taxa_fixa, Observação: f.observacao })),
      'Custos fixos': S.custos_fixos.map(c => ({ Mês: c.mes.slice(0, 7), Descrição: c.descricao, Valor: c.valor }))
    };
    const wb = XLSX.utils.book_new();
    for (const [n, linhas] of Object.entries(aba)) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas.length ? linhas : [{ vazio: '' }]), n);
    XLSX.writeFile(wb, `estoque-${Calc.hoje()}.xlsx`);
    UI.aviso('Planilha baixada');
  });

  /* ───────── Conta ───────── */
  function conta() {
    return h`${cab('Conta')}
      ${Dados.demo ? h`<div class="info-caixa">Na demonstração não há conta. Com o Supabase ligado, a troca de senha aparece aqui.</div>` : h`
      ${UI.secao('Trocar senha', h`<form class="card" data-form="conta.senha" autocomplete="off">
        ${campo('Nova senha', 'nova', { tipo: 'password', req: true, extra: 'autocomplete="new-password" minlength="6"' })}
        ${campo('Repita a nova senha', 'repete', { tipo: 'password', req: true, extra: 'autocomplete="new-password" minlength="6"' })}
        <button class="btn primario bloco" type="submit">Trocar senha</button></form>`)}`}
      ${UI.secao('Sessão', h`<div class="card"><button type="button" class="btn sec bloco" data-acao="app.sair">${ic('sair')} Sair</button></div>`)}`;
  }
  UI.aoEnviar['conta.senha'] = (f, d) => salvarOk(async () => {
    if (d.get('nova') !== d.get('repete')) throw new Error('As senhas não são iguais.');
    await Dados.trocarSenha(d.get('nova')); f.reset();
  }, 'Senha trocada');

  const VIEWS = { aparencia, categorias, canais, custos, metas, painel, dados, conta };
  return { render: arg => (arg && VIEWS[arg]) ? VIEWS[arg]() : indice() };
})();
