/* Planejamento: metas de lucro por mês, semestre e ano, ritmo necessário, limite do MEI e marcos do plano.
   As metas ficam nas preferências compartilhadas (os dois veem as mesmas). */
Telas.planejamento = (function () {
  'use strict';
  const { h, ic, moeda, moeda0, pct } = UI;
  const S = Dados.S;
  let ano = Number(Calc.hoje().slice(0, 4)), modo = 'sazonal';

  const SAZONAL = [0.9, 0.8, 0.9, 0.9, 1.0, 1.0, 0.9, 1.0, 1.0, 1.0, 1.4, 1.5]; // novembro (Black Friday) e dezembro (Natal) mais fortes
  const ym = (a, m) => `${a}-${String(m).padStart(2, '0')}`;
  const metas = () => Dados.prefs().metas || {};
  // Meta de um mês: a do planejamento ou, se não houver, a meta padrão dos Ajustes
  function metaMes(chave) {
    const v = metas()[chave];
    return v !== undefined && v !== null ? Number(v) : (Number(Dados.cfg().meta_lucro_mes) || 0);
  }
  const temMeta = chave => metas()[chave] !== undefined && metas()[chave] !== null;
  function realizado(a, m) {
    const de = ym(a, m) + '-01', ate = Calc.fimMes(de);
    return Calc.resumo(S.movimentacoes.filter(x => x.data >= de && x.data <= ate));
  }

  function render() {
    const hoje = Calc.hoje(), anoAtual = Number(hoje.slice(0, 4)), mesAtual = Number(hoje.slice(5, 7));
    const linhas = [];
    let semMeta = 0, semReal = 0, anoMeta = 0, anoReal = 0, anoFat = 0;
    for (let m = 1; m <= 12; m++) {
      const chave = ym(ano, m), r = realizado(ano, m), meta = metaMes(chave);
      const futuro = ano > anoAtual || (ano === anoAtual && m > mesAtual), atual = ano === anoAtual && m === mesAtual;
      semMeta += meta; semReal += r.lucro; anoMeta += meta; anoReal += r.lucro; anoFat += r.receita;
      linhas.push(h`<tr class="${atual ? 'atual' : ''}"><td style="text-transform:capitalize">${UI.MESES_LONGOS[m - 1]}${atual ? h` <span class="pilula ok">agora</span>` : ''}</td>
        <td class="r"><input class="meta-input" type="text" inputmode="decimal" value="${temMeta(chave) ? UI.campoNum(metas()[chave]) : ''}" placeholder="${meta ? UI.campoNum(meta) : '0'}" data-muda="pl.meta" data-ym="${chave}" aria-label="Meta de ${UI.MESES_LONGOS[m - 1]}"></td>
        <td class="r">${futuro ? h`<span class="mudo">—</span>` : h`<span class="${r.lucro < 0 ? 'neg' : ''}">${moeda0(r.lucro)}</span>`}</td>
        <td class="r">${futuro || !meta ? h`<span class="mudo">—</span>` : h`<b class="${r.lucro >= meta ? 'pos' : ''}">${pct(Math.max(r.lucro, 0) / meta)}</b>`}</td></tr>`);
      if (m === 6 || m === 12) {
        linhas.push(h`<tr class="sub"><td>${m === 6 ? '1º' : '2º'} semestre</td><td class="r">${moeda0(semMeta)}</td><td class="r">${moeda0(semReal)}</td><td class="r">${semMeta ? pct(Math.max(semReal, 0) / semMeta) : '—'}</td></tr>`);
        semMeta = 0; semReal = 0;
      }
    }
    linhas.push(h`<tr class="sub"><td>Ano de ${ano}</td><td class="r">${moeda0(anoMeta)}</td><td class="r">${moeda0(anoReal)}</td><td class="r">${anoMeta ? pct(Math.max(anoReal, 0) / anoMeta) : '—'}</td></tr>`);

    return h`${UI.cabecalho({ titulo: 'Planejamento', sub: 'Metas de lucro por mês, semestre e ano' })}
      <div class="card"><div class="mes-nav" style="margin:0"><button type="button" class="btn-icone" data-acao="pl.ano" data-dir="-1" aria-label="Ano anterior">${ic('voltar')}</button><b style="font-size:1.2rem">${ano}</b>
        <button type="button" class="btn-icone" data-acao="pl.ano" data-dir="1" aria-label="Próximo ano" style="transform:scaleX(-1)">${ic('voltar')}</button></div></div>
      ${ano === anoAtual ? esteMes(hoje, mesAtual) : ''}
      ${UI.secao('Meta anual', h`<form class="card" data-form="pl.distribuir">
        ${UI.campo(`Quanto quer lucrar em ${ano} (R$)`, 'anual', { dec: true, valor: anoMeta ? UI.campoNum(Math.round(anoMeta)) : '', ph: 'Ex.: 12000' })}
        <div class="campo"><span>Como dividir</span>${UI.seg('modo', [{ v: 'igual', t: 'Igual' }, { v: 'crescente', t: 'Crescente' }, { v: 'sazonal', t: 'Sazonal' }], modo, 'pl.modo')}
          <small>${{ igual: 'O mesmo valor em todos os meses.', crescente: 'Cada mês um pouco maior que o anterior, para quem está começando.', sazonal: 'Novembro (Black Friday) e dezembro (Natal) mais fortes; fevereiro mais fraco.' }[modo]}</small></div>
        <button class="btn primario bloco" type="submit">Dividir pelos meses</button>
        <small style="display:block;margin-top:8px">${ano === anoAtual ? 'Os meses que já passaram ficam com o lucro que tiveram. O que falta para a meta anual é dividido de agora até dezembro.' : 'Divide a meta pelos 12 meses.'} Depois você pode ajustar cada mês na tabela.</small></form>`)}
      ${UI.secao('Mês a mês', h`<div class="card">${h`<div class="tab-wrap"><table class="tab"><thead><tr><th>Mês</th><th class="r">Meta de lucro</th><th class="r">Realizado</th><th class="r">%</th></tr></thead><tbody>${linhas}</tbody></table></div>`}
        <small style="display:block;margin-top:8px">Mês sem valor usa a meta padrão dos Ajustes${Number(Dados.cfg().meta_lucro_mes) ? ` (${moeda0(Dados.cfg().meta_lucro_mes)})` : ' (hoje zerada)'}. Lucro aqui já desconta perdas e devoluções, mas não os custos fixos.</small></div>`)}
      ${mei(anoFat, hoje, anoAtual)}
      ${UI.secao('Próximos passos para crescer', h`<div class="card">${marcosHtml()}</div>`)}`;
  }

  function esteMes(hoje, mesAtual) {
    const chave = hoje.slice(0, 7), meta = metaMes(chave), r = realizado(ano, mesAtual);
    if (!meta) return h`<div class="info-caixa" style="margin-top:10px">Este mês ainda não tem meta. Defina a meta anual abaixo ou digite o valor do mês na tabela.</div>`;
    const dia = Number(hoje.slice(8, 10)), dias = Calc.diasNoMes(hoje), restam = dias - dia + 1, falta = Math.max(meta - r.lucro, 0);
    const ult = Calc.resumo(S.movimentacoes.filter(x => x.data >= Calc.addDias(hoje, -29) && x.data <= hoje));
    const porVenda = ult.vendas ? ult.lucroVendas / ult.vendas : null;
    const vendasDia = porVenda && porVenda > 0 ? falta / restam / porVenda : null;
    return UI.secao(`Este mês: ${UI.mesAno(hoje)}`, h`<div class="card"><div class="dupla">
      <div class="dado"><div class="rot">Meta</div><div class="val">${moeda(meta)}</div></div>
      <div class="dado"><div class="rot">Lucro até hoje</div><div class="val ${r.lucro >= meta ? 'pos' : ''}">${moeda(r.lucro)}</div></div>
      <div class="dado"><div class="rot">Falta</div><div class="val">${falta ? moeda(falta) : 'Meta batida'}</div></div>
      <div class="dado"><div class="rot">Precisa por dia</div><div class="val">${falta ? moeda(falta / restam) : '—'}</div><small>${restam} dia${restam === 1 ? '' : 's'} restante${restam === 1 ? '' : 's'}</small></div></div>
      <div class="barra-trilho" style="margin-top:8px"><span class="barra-preench" style="width:${Math.min(Math.max(r.lucro / meta, 0), 1) * 100}%"></span></div>
      <small>${pct(Math.max(r.lucro, 0) / meta)} da meta${falta && vendasDia !== null ? ` · no seu lucro médio de ${moeda(porVenda)} por venda (últimos 30 dias), são cerca de ${UI.decimal(vendasDia, 1)} vendas por dia` : ''}${falta && vendasDia === null ? ' · sem vendas recentes para estimar quantas vendas por dia' : ''}</small></div>`);
  }

  function mei(fat, hoje, anoAtual) {
    const limite = Number(Dados.prefs().limiteMei) || DadosCrescer.LIMITE_MEI;
    const diaDoAno = ano === anoAtual ? Calc.diffDias(`${ano}-01-01`, hoje) + 1 : (ano < anoAtual ? 365 : 0);
    const proj = diaDoAno > 0 && ano === anoAtual ? fat / diaDoAno * 365 : fat;
    return UI.secao('Limite do MEI', h`<div class="card"><div class="dupla">
      <div class="dado"><div class="rot">Faturamento em ${ano}</div><div class="val">${moeda(fat)}</div></div>
      <div class="dado"><div class="rot">Projeção para o ano</div><div class="val ${proj > limite ? 'neg' : ''}">${moeda0(proj)}</div></div></div>
      <div class="barra-trilho" style="margin-top:6px"><span class="barra-preench${fat > limite ? ' neg' : ''}" style="width:${Math.min(fat / limite, 1) * 100}%"></span></div>
      <small>${pct(fat / limite, 1)} do limite de ${moeda0(limite)} por ano (média de ${moeda0(limite / 12)} por mês).</small>
      ${proj > limite ? h`<div class="aviso-caixa" style="margin:10px 0 0">No ritmo atual o faturamento passa do limite do MEI. Converse com um contador antes de chegar lá.</div>` : ''}
      <ul class="lista-pontos"><li>O limite conta o <b>faturamento</b> (tudo o que foi vendido), não o lucro.</li>
        <li>No ano em que o MEI é aberto, o limite é proporcional: ${moeda0(limite / 12)} por mês de atividade.</li>
        <li>A guia mensal (DAS) do comércio em 2026 é de cerca de ${moeda(DadosCrescer.DAS_MEI)}. Cadastre em Ajustes > Custos padrão como custo fixo.</li>
        <li>Valores da pesquisa de ${DadosCrescer.DATA}. Há projetos para aumentar o limite: confirme no Portal do Empreendedor.</li></ul>
      <form data-form="pl.limite" style="display:flex;gap:8px;align-items:flex-end;margin-top:10px"><label class="campo" style="flex:1;margin:0"><span>Limite anual usado na conta (R$)</span><input type="text" inputmode="decimal" name="limite" value="${UI.campoNum(limite)}"></label><button class="btn sec" type="submit">Salvar</button></form></div>`);
  }

  function marcosHtml() {
    const feitos = Dados.prefs().marcos || {}, n = DadosCrescer.marcos.filter(m => feitos[m.id]).length;
    return h`<small style="display:block;margin-bottom:6px">${n} de ${DadosCrescer.marcos.length} concluídos. Marque conforme avançar: os dois veem a mesma lista.</small>
      ${DadosCrescer.marcos.map(m => h`<label class="marco${feitos[m.id] ? ' feito' : ''}"><input type="checkbox" ${feitos[m.id] ? 'checked' : ''} data-muda="pl.marco" data-id="${m.id}"><div><b>${m.t}</b><span>${m.d}</span></div></label>`)}`;
  }

  const salvar = async (patch, msg) => { try { await Dados.salvarPrefs(patch); App.atualizar(); if (msg) UI.aviso(msg); } catch (e) { UI.erro(e); } };
  UI.acoes['pl.ano'] = d => { ano += Number(d.dir); App.atualizar(); };
  UI.acoes['pl.modo'] = d => { modo = d.v; App.atualizar(); };
  UI.aoMudar['pl.meta'] = el => {
    const v = UI.numero(el.value), novo = Object.assign({}, metas());
    if (v === null) delete novo[el.dataset.ym]; else novo[el.dataset.ym] = Math.max(v, 0);
    salvar({ metas: novo }, 'Meta salva');
  };
  UI.aoMudar['pl.marco'] = el => salvar({ marcos: Object.assign({}, Dados.prefs().marcos || {}, { [el.dataset.id]: el.checked }) });
  UI.aoEnviar['pl.limite'] = (f, d) => { const v = UI.numero(d.get('limite')); if (!v || v <= 0) return UI.aviso('Informe um valor maior que zero.', 'erro'); salvar({ limiteMei: v }, 'Limite salvo'); };
  UI.aoEnviar['pl.distribuir'] = (f, d) => {
    const anual = UI.numero(d.get('anual'));
    if (!anual || anual <= 0) return UI.aviso('Informe quanto quer lucrar no ano.', 'erro');
    const hoje = Calc.hoje(), anoAtual = Number(hoje.slice(0, 4)), mesAtual = Number(hoje.slice(5, 7));
    const inicio = ano === anoAtual ? mesAtual : 1;
    if (ano < anoAtual) return UI.aviso('Esse ano já terminou.', 'erro');
    let jaFeito = 0;
    for (let m = 1; m < inicio; m++) jaFeito += realizado(ano, m).lucro;
    const resto = anual - jaFeito;
    if (resto <= 0) return UI.aviso('O lucro dos meses que passaram já cobre essa meta. Informe um valor maior.', 'erro');
    const meses = []; for (let m = inicio; m <= 12; m++) meses.push(m);
    const peso = (m, i) => modo === 'igual' ? 1 : modo === 'crescente' ? 1 + 0.12 * i : SAZONAL[m - 1];
    const soma = meses.reduce((s, m, i) => s + peso(m, i), 0);
    const novo = Object.assign({}, metas());
    let acumulado = 0;
    meses.forEach((m, i) => { const v = i === meses.length - 1 ? Math.round(resto - acumulado) : Math.round(resto * peso(m, i) / soma / 10) * 10; acumulado += v; novo[ym(ano, m)] = Math.max(v, 0); });
    salvar({ metas: novo }, 'Metas divididas pelos meses');
  };

  return { render, metaMes };
})();
