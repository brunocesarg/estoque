/* Lançar: um botão só para entrada de lote, venda, devolução, perda e ajuste de contagem. */
Telas.lancar = (function () {
  'use strict';
  const { h, moeda, pct, campo, selecao } = UI;
  const S = Dados.S;
  const TIPOS = [{ v: 'entrada', t: 'Entrada' }, { v: 'venda', t: 'Venda' }, { v: 'devolucao', t: 'Devol.' }, { v: 'perda', t: 'Perda' }, { v: 'ajuste', t: 'Ajuste' }];
  const TAXAS = ['comissao', 'taxa_fixa', 'adicional_cpf', 'embalagem', 'imposto'];
  let L = null, folha = null;

  const ultimoCanal = () => { try { return localStorage.getItem('ultimo_canal'); } catch (e) { return null; } };
  const produtoAtual = () => S.produtos.find(p => p.id === L.produtoId) || null;
  const infoProduto = p => p ? Calc.indexar([p], S.movimentacoes.filter(m => m.produto_id === p.id))[p.id] : null;
  const form = () => folha && folha.el.querySelector('form');
  const val = (n) => { const f = form(); return f && f.elements[n] ? f.elements[n].value : ''; };
  const campoNum = n => UI.campoMoeda(n);

  function abrir({ produtoId, tipo } = {}) {
    const canais = Dados.canaisOrdenados();
    const padrao = canais.find(c => c.id === ultimoCanal()) || canais.find(c => c.id === Dados.cfg().canal_padrao_id) || canais[0];
    L = { tipo: tipo || 'venda', produtoId: produtoId || '', tocados: new Set(), quantidade: '1', data: Calc.hoje(), canal_id: padrao ? padrao.id : '', obs: '' };
    if (!S.produtos.length) { UI.aviso('Cadastre um produto antes de lançar.', 'erro'); location.hash = '#/estoque'; return; }
    if (UI.fecharTodas) UI.fecharTodas();
    folha = UI.folha({ titulo: 'Lançar', corpo: corpo() });
    recalcular();
  }

  // Guarda o que está digitado antes de redesenhar o formulário
  function coletar() {
    const f = form();
    if (!f) return;
    for (const n of ['produto_id', 'quantidade', 'data', 'canal_id', 'preco', 'custo', 'fornecedor_id', 'contagem', 'frete', 'obs'])
      if (f.elements[n]) L[n === 'produto_id' ? 'produtoId' : n] = f.elements[n].value;
    for (const n of TAXAS) if (f.elements[n] && L.tocados.has(n)) L[n] = f.elements[n].value;
  }
  const redesenhar = () => { folha.atualizar(corpo()); recalcular(); };

  function corpo() {
    const p = produtoAtual(), info = infoProduto(p), t = L.tipo, cfg = Dados.cfg();
    const lista = S.produtos.slice().sort((a, b) => (b.ativo - a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR'));
    const opProd = [{ v: '', t: 'Escolha o produto…' }, ...lista.map(x => ({ v: x.id, t: x.nome + (x.ativo ? '' : ' (inativo)') }))];
    const ehVenda = t === 'venda' || t === 'devolucao';
    if (p && ehVenda && L.preco === undefined) L.preco = campoNum(p.preco_venda);
    if (p && t === 'entrada' && L.custo === undefined) L.custo = campoNum(info.primeiraEntrada || !p.custo_estimado ? (info.custoMedio || '') : p.custo_estimado);
    if (p && t === 'entrada' && L.fornecedor_id === undefined) L.fornecedor_id = p.fornecedor_id || '';
    return h`<form data-form="lan.salvar" novalidate>
      ${UI.seg('tipo', TIPOS, t, 'lan.tipo')}
      <div style="height:14px"></div>
      ${selecao('Produto', 'produto_id', opProd, L.produtoId, { extra: 'data-muda="lan.produto"' })}
      ${p ? h`<p class="mudo" style="margin:-6px 2px 12px;font-size:.82rem">Em estoque: <b>${info.estoque}</b> · custo médio ${moeda(info.custoMedio)}</p>` : ''}
      ${t === 'ajuste' ? h`<div class="grade2">${campo('Contagem real', 'contagem', { dec: true, valor: L.contagem || '', ph: p ? String(info.estoque) : '', extra: 'data-digitar="lan.recalc"', dica: 'Quanto você contou na prateleira' })}
        ${campo('Data', 'data', { tipo: 'date', valor: L.data })}</div>`
        : h`<div class="grade2">${campo('Quantidade', 'quantidade', { dec: true, valor: L.quantidade, extra: 'data-digitar="lan.recalc"' })}${campo('Data', 'data', { tipo: 'date', valor: L.data })}</div>`}
      ${ehVenda ? vendaCampos(p, cfg, t) : ''}
      ${t === 'entrada' ? h`<div class="grade2">${campo('Custo por unidade (R$)', 'custo', { dec: true, valor: L.custo, extra: 'data-digitar="lan.recalc"' })}
        ${campo('Frete do lote (R$)', 'frete', { dec: true, valor: L.frete || '', ph: '0', extra: 'data-digitar="lan.recalc"', dica: 'Total do frete da compra' })}</div>
        ${selecao('Fornecedor', 'fornecedor_id', [{ v: '', t: 'Sem fornecedor' }, ...S.fornecedores.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(x => ({ v: x.id, t: x.nome }))], L.fornecedor_id)}` : ''}
      <div id="lan-prev"></div>
      ${campo('Observação', 'obs', { valor: L.obs, ph: 'Opcional' })}
      <p class="erro-form" id="lan-erro" role="alert"></p>
      <button class="btn primario bloco" type="submit">${{ entrada: 'Registrar entrada', venda: 'Registrar venda', devolucao: 'Registrar devolução', perda: 'Registrar perda', ajuste: 'Ajustar estoque' }[t]}</button></form>`;
  }

  function vendaCampos(p, cfg, t) {
    const canais = Dados.canaisOrdenados();
    const v = n => L[n] === undefined ? '' : L[n];
    return h`${selecao('Canal', 'canal_id', [{ v: '', t: 'Sem canal' }, ...canais.map(c => ({ v: c.id, t: c.nome }))], L.canal_id, { extra: 'data-muda="lan.recalc"' })}
      ${campo(t === 'venda' ? 'Preço de venda por unidade (R$)' : 'Valor devolvido por unidade (R$)', 'preco', { dec: true, valor: v('preco'), extra: 'data-digitar="lan.recalc"' })}
      <div id="lan-faixa"></div>
      <details class="taxas" ${L.tocados.size || L.frete ? 'open' : ''}><summary>Taxas e custos (preenchidos sozinhos, pode corrigir)</summary>
        <div class="grade2" style="margin-top:10px">
          ${campo('Comissão (R$)', 'comissao', { dec: true, valor: v('comissao'), extra: 'data-digitar="lan.manual"' })}
          ${campo('Taxa fixa (R$)', 'taxa_fixa', { dec: true, valor: v('taxa_fixa'), extra: 'data-digitar="lan.manual"' })}
          ${campo('Adicional CPF (R$)', 'adicional_cpf', { dec: true, valor: v('adicional_cpf'), extra: 'data-digitar="lan.manual"' })}
          ${campo('Embalagem (R$)', 'embalagem', { dec: true, valor: v('embalagem'), extra: 'data-digitar="lan.manual"' })}
          ${campo('Imposto (R$)', 'imposto', { dec: true, valor: v('imposto'), extra: 'data-digitar="lan.manual"' })}
          ${campo('Frete pago por você (R$)', 'frete', { dec: true, valor: v('frete'), ph: '0', extra: 'data-digitar="lan.recalc"' })}</div>
        ${t === 'devolucao' ? h`<small>Em devolução, zere o que a plataforma não devolveu (comissão, taxas). Esses valores ficam como custo da venda original.</small>` : ''}</details>`;
  }

  /* Lê o formulário atual como números */
  function ler() {
    const f = form(), n = k => UI.numero(f.elements[k] ? f.elements[k].value : '');
    return { produto: produtoAtual(), tipo: L.tipo, qtd: Math.round(n('quantidade') || 0), data: val('data'), canal_id: val('canal_id') || null,
      preco: n('preco'), custo: n('custo'), frete: n('frete') || 0, contagem: n('contagem'), fornecedor_id: val('fornecedor_id') || null, obs: val('obs').trim(),
      taxas: Object.fromEntries(TAXAS.map(k => [k, n(k) || 0])) };
  }

  // Preenche as taxas automáticas e atualiza a prévia do resultado
  function recalcular() {
    const f = form();
    if (!f) return;
    const v = ler(), p = v.produto, prev = document.getElementById('lan-prev');
    if (!prev) return;
    const info = infoProduto(p);
    if (!p) { prev.innerHTML = ''; return; }
    if (v.tipo === 'venda' || v.tipo === 'devolucao') {
      const preco = v.preco || 0, qtd = v.qtd || 1;
      const faixa = Calc.acharFaixa(S.faixas_taxa, v.canal_id, preco);
      const t = Calc.taxasVenda({ preco, qtd, faixa, cfg: Dados.cfg(), produto: p });
      for (const k of TAXAS) if (!L.tocados.has(k) && f.elements[k]) f.elements[k].value = campoNum(t[k]);
      const fx = document.getElementById('lan-faixa');
      if (fx) fx.innerHTML = (v.canal_id && preco > 0 && !faixa) ? '<div class="aviso-caixa">Este preço não cabe em nenhuma faixa de taxa do canal. Confira as faixas em Ajustes ou digite a comissão e a taxa à mão.</div>' : '';
      const taxasFinal = Object.fromEntries(TAXAS.map(k => [k, L.tocados.has(k) ? (UI.numero(f.elements[k].value) || 0) : t[k]]));
      const m = Object.assign({ tipo: 'venda', quantidade: qtd, preco_venda: preco, custo_unitario: info.custoMedio, frete: v.frete }, taxasFinal);
      const lucro = Calc.lucroLinha(m), marg = preco > 0 ? lucro / (preco * qtd) : null;
      const semCusto = !info.custoMedio ? ' Este produto ainda não tem custo: faça uma entrada ou preencha o custo estimado.' : '';
      prev.innerHTML = UI.juntar(h`<div class="info-caixa"><b>${v.tipo === 'venda' ? 'Lucro desta venda' : 'Efeito no lucro'}: <span class="${lucro < 0 ? 'neg' : 'pos'}">${moeda(v.tipo === 'venda' ? lucro : -lucro)}</span></b>
        ${v.tipo === 'venda' && marg !== null ? h` · margem ${pct(marg, 1)}` : ''}<br><small>Custo médio ${moeda(info.custoMedio)} por unidade.${semCusto}</small></div>`);
    } else if (v.tipo === 'entrada') {
      const total = (v.qtd || 0) * (v.custo || 0) + v.frete, nova = Calc.indexar([p], S.movimentacoes.filter(m => m.produto_id === p.id).concat([{ id: 'x', produto_id: p.id, tipo: 'entrada', quantidade: v.qtd || 0, custo_unitario: v.custo || 0, frete: v.frete, data: v.data }]))[p.id];
      prev.innerHTML = UI.juntar(h`<div class="info-caixa"><b>Total do lote: ${moeda(total)}</b><br><small>Custo médio passa de ${moeda(info.custoMedio)} para ${moeda(nova.custoMedio)} · estoque vai para ${nova.estoque}.</small></div>`);
    } else if (v.tipo === 'perda') {
      prev.innerHTML = UI.juntar(h`<div class="info-caixa"><b>Prejuízo: <span class="neg">${moeda((v.qtd || 0) * info.custoMedio)}</span></b><br><small>${v.qtd || 0} un. × custo médio ${moeda(info.custoMedio)}. Entra no lucro como perda.</small></div>`);
    } else {
      const dif = v.contagem === null ? null : Math.round(v.contagem) - info.estoque;
      prev.innerHTML = dif === null ? '' : UI.juntar(h`<div class="info-caixa"><b>Diferença: ${dif > 0 ? '+' : dif < 0 ? '−' : ''}${Math.abs(dif)}</b><br><small>Sistema: ${info.estoque} · contagem: ${Math.round(v.contagem)}. Ajuste não mexe no lucro.</small></div>`);
    }
  }

  UI.acoes['lan.tipo'] = d => { coletar(); L.tipo = d.v; L.preco = undefined; L.custo = undefined; redesenhar(); };
  UI.aoMudar['lan.produto'] = () => { coletar(); L.preco = undefined; L.custo = undefined; L.fornecedor_id = undefined; L.tocados.clear(); TAXAS.forEach(k => delete L[k]); redesenhar(); };
  UI.aoMudar['lan.recalc'] = () => recalcular();
  UI.aoDigitar['lan.recalc'] = () => recalcular();
  UI.aoDigitar['lan.manual'] = el => { L.tocados.add(el.name); recalcular(); };

  UI.aoEnviar['lan.salvar'] = async (f, dados, ev) => {
    const erro = document.getElementById('lan-erro'); erro.textContent = '';
    const v = ler(), p = v.produto;
    const falha = msg => { erro.textContent = msg; };
    if (!p) return falha('Escolha o produto.');
    if (!v.data) return falha('Informe a data.');
    const info = infoProduto(p);
    let linha = { produto_id: p.id, tipo: v.tipo, data: v.data, observacao: v.obs || null };
    let resumo = '';
    if (v.tipo === 'ajuste') {
      if (v.contagem === null) return falha('Informe a contagem real.');
      const dif = Math.round(v.contagem) - info.estoque;
      if (dif === 0) return falha('A contagem é igual ao estoque do sistema. Nada a ajustar.');
      linha.quantidade = dif; resumo = `Estoque ajustado para ${Math.round(v.contagem)}`;
    } else {
      if (!(v.qtd > 0)) return falha('A quantidade precisa ser maior que zero.');
      linha.quantidade = v.qtd;
      if (v.tipo === 'entrada') {
        if (v.custo === null || v.custo < 0) return falha('Informe o custo por unidade.');
        Object.assign(linha, { custo_unitario: v.custo, fornecedor_id: v.fornecedor_id, frete: v.frete });
        resumo = `Entrada de ${v.qtd} un. registrada`;
      } else if (v.tipo === 'perda') {
        if (v.qtd > info.estoque && !(await UI.confirmar({ titulo: 'Estoque insuficiente', texto: `Só há ${info.estoque} em estoque. Lançar a perda mesmo assim?`, ok: 'Lançar' }))) return;
        Object.assign(linha, { custo_unitario: info.custoMedio }); resumo = 'Perda registrada';
      } else {
        if (!(v.preco > 0)) return falha(v.tipo === 'venda' ? 'Informe o preço de venda.' : 'Informe o valor devolvido.');
        if (v.tipo === 'venda' && v.qtd > info.estoque &&
          !(await UI.confirmar({ titulo: 'Estoque insuficiente', texto: `Só há ${info.estoque} em estoque e você está vendendo ${v.qtd}. Lançar mesmo assim?`, ok: 'Lançar' }))) return;
        Object.assign(linha, { custo_unitario: info.custoMedio, canal_id: v.canal_id, preco_venda: v.preco, frete: v.frete }, v.taxas);
        const l = Calc.lucroMov(Object.assign({}, linha));
        resumo = v.tipo === 'venda' ? `Venda registrada · lucro ${moeda(l)}` : 'Devolução registrada';
        if (v.canal_id) { try { localStorage.setItem('ultimo_canal', v.canal_id); } catch (e) { /* ok */ } }
      }
    }
    await UI.ocupado(f.querySelector('button[type=submit]'), async () => {
      await Dados.inserir('movimentacoes', linha);
      if (v.tipo === 'entrada' && !p.ativo) { await Dados.atualizar('produtos', p.id, { ativo: true }); resumo += ' · produto ativado'; }
      folha.fechar(); App.atualizar(); UI.aviso(resumo);
    });
  };

  return { abrir };
})();
