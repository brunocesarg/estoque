/* Simulador de preço: custo e margem desejada (ou preço) -> preço e lucro em cada canal, lado a lado. */
Telas.simulador = (function () {
  'use strict';
  const { h, moeda, pct, campo, selecao } = UI;
  const S = Dados.S;
  const st = { produtoId: '', custo: '', emb: '', modo: 'margem', valor: '30' };

  function render() {
    const cfg = Dados.cfg();
    const prods = S.produtos.slice().sort((a, b) => (b.ativo - a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR'));
    return h`${UI.cabecalho({ titulo: 'Simulador', sub: 'Quanto cobrar em cada canal' })}
      <form class="card" data-form="sim.nada" onsubmit="return false">
        ${selecao('Produto (opcional)', 'produto', [{ v: '', t: 'Digitar à mão' }, ...prods.map(p => ({ v: p.id, t: p.nome + (p.ativo ? '' : ' (inativo)') }))], st.produtoId, { extra: 'data-muda="sim.produto"' })}
        <div class="grade2">${campo('Custo por unidade (R$)', 'custo', { dec: true, valor: st.custo, extra: 'data-digitar="sim.calc"' })}
          ${campo('Embalagem (R$)', 'emb', { dec: true, valor: st.emb, ph: `Padrão: ${UI.campoNum(cfg.embalagem_padrao)}`, extra: 'data-digitar="sim.calc"' })}</div>
        <div class="campo"><span>Calcular</span>${UI.seg('modo', [{ v: 'margem', t: 'Preço pela margem' }, { v: 'preco', t: 'Lucro pelo preço' }], st.modo, 'sim.modo')}</div>
        <div id="sim-valor">${campoValor()}</div></form>
      <div class="aviso-caixa" style="margin-top:12px">Considera ${cfg.tipo_vendedor === 'CPF' ? `adicional de CPF de ${moeda(cfg.adicional_cpf)}, ` : ''}imposto de ${UI.decimal(cfg.imposto_pct, 1)}% e as faixas de taxa de cada canal. Não inclui frete de compra do lote, anúncios pagos nem devoluções.</div>
      <div id="sim-res" class="resultados">${resultados()}</div>`;
  }
  const campoValor = () => st.modo === 'margem'
    ? campo('Margem desejada (%)', 'valor', { dec: true, valor: st.valor, extra: 'data-digitar="sim.calc"', dica: `Margem mínima definida nos Ajustes: ${UI.decimal(Dados.cfg().margem_minima_pct, 0)}%` })
    : campo('Preço de venda (R$)', 'valor', { dec: true, valor: st.valor, extra: 'data-digitar="sim.calc"' });

  function resultados() {
    const cfg = Dados.cfg(), canais = Dados.canaisOrdenados();
    const custo = UI.numero(st.custo), emb = UI.numero(st.emb), valor = UI.numero(st.valor);
    if (!canais.length) return UI.vazio('Cadastre os canais de venda em Ajustes.');
    if (custo === null || valor === null || valor <= 0) return UI.vazio(st.modo === 'margem' ? 'Informe o custo e a margem desejada.' : 'Informe o custo e o preço de venda.');
    const itens = canais.map(c => {
      const base = { custo, canalId: c.id, faixas: S.faixas_taxa, cfg, embalagem: emb };
      return { c, r: st.modo === 'margem' ? Calc.precoPorMargem(Object.assign({ margem: valor }, base)) : Calc.lucroPreco(Object.assign({ preco: valor }, base)) };
    });
    const validos = itens.filter(i => i.r.preco);
    const melhor = validos.length > 1 ? (st.modo === 'margem' ? validos.reduce((a, b) => b.r.preco < a.r.preco ? b : a) : validos.reduce((a, b) => b.r.lucro > a.r.lucro ? b : a)) : null;
    const minimo = cfg.margem_minima_pct / 100;
    return h`<div class="canais-grade">${itens.map(({ c, r }) => {
      if (!r.preco) return h`<section class="card"><h3 style="font-size:1.05rem">${c.nome}</h3><p class="mudo" style="margin-top:8px;font-size:.88rem">${r.motivo === 'impossivel'
        ? 'Margem impossível: as taxas deste canal já consomem mais do que isso.' : 'Nenhuma faixa de taxa cadastrada cobre o preço necessário. Confira as faixas deste canal em Ajustes.'}</p></section>`;
      const abaixo = r.margem < minimo - 1e-9;
      return h`<section class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 style="font-size:1.05rem">${c.nome}</h3>
        ${melhor && melhor.c === c ? h`<span class="pilula ok">${st.modo === 'margem' ? 'menor preço' : 'maior lucro'}</span>` : ''}</div>
        <div class="dupla" style="margin-top:6px"><div class="dado"><div class="rot">Preço de venda</div><div class="val numerao" style="font-size:1.7rem">${moeda(r.preco)}</div>
          ${r.vitrine && st.modo === 'margem' && r.vitrine !== r.preco ? h`<small>Vitrine: ${moeda(r.vitrine)}</small>` : ''}</div>
        <div class="dado"><div class="rot">Lucro por venda</div><div class="val ${r.lucro < 0 ? 'neg' : 'pos'}" style="font-size:1.7rem">${moeda(r.lucro)}</div>
          <small>${pct(r.margem, 1)} de margem${r.retorno !== null ? ' · retorno ' + pct(r.retorno) : ''}</small></div></div>
        ${abaixo ? h`<div class="aviso-caixa" style="margin:8px 0 0">Margem abaixo do mínimo de ${UI.decimal(cfg.margem_minima_pct, 0)}%.</div>` : ''}
        ${r.semFaixa && c.id ? h`<div class="aviso-caixa" style="margin:8px 0 0">Preço fora das faixas de taxa deste canal: taxas contadas como zero.</div>` : ''}
        <div class="legenda" style="margin-top:10px">
          ${linha('Custo do produto', custo)}${linha(`Comissão${r.faixa ? ' (' + UI.decimal(r.faixa.comissao_pct, 1) + '%)' : ''}`, r.comissao)}${linha('Taxa fixa', r.taxa_fixa)}
          ${r.adicional_cpf ? linha('Adicional CPF', r.adicional_cpf) : ''}${linha('Embalagem', r.embalagem)}${r.imposto ? linha('Imposto', r.imposto) : ''}</div>
        ${st.produtoId && st.modo === 'margem' ? h`<button type="button" class="btn sec peq bloco" style="margin-top:12px" data-acao="sim.salvarPreco" data-v="${r.vitrine || r.preco}">Usar ${moeda(r.vitrine || r.preco)} como preço sugerido do produto</button>` : ''}</section>`;
    })}</div>`;
  }
  const linha = (rot, v) => h`<span>${rot}</span><span class="r">${moeda(v)}</span><span></span>`;

  const atualizar = () => { const el = document.getElementById('sim-res'); if (el) UI.render(el, resultados()); };
  const ler = () => { const f = document.querySelector('[data-form="sim.nada"]'); if (!f) return; st.custo = f.elements.custo.value; st.emb = f.elements.emb.value; st.valor = f.elements.valor.value; };
  UI.aoDigitar['sim.calc'] = () => { ler(); atualizar(); };
  UI.acoes['sim.modo'] = d => {
    ler(); st.modo = d.v;
    const p = S.produtos.find(x => x.id === st.produtoId);
    st.valor = d.v === 'margem' ? '30' : UI.campoNum(p ? p.preco_venda : '');
    App.atualizar();
  };
  UI.aoMudar['sim.produto'] = el => {
    st.produtoId = el.value;
    const p = S.produtos.find(x => x.id === el.value);
    if (p) {
      const info = Calc.indexar([p], S.movimentacoes.filter(m => m.produto_id === p.id))[p.id];
      st.custo = UI.campoNum(info.custoMedio ? Math.round(info.custoMedio * 100) / 100 : '');
      st.emb = UI.campoNum(p.embalagem);
      if (st.modo === 'preco') st.valor = UI.campoNum(p.preco_venda);
    }
    App.atualizar();
  };
  UI.acoes['sim.salvarPreco'] = async (d, el) => {
    await UI.ocupado(el, async () => { await Dados.atualizar('produtos', st.produtoId, { preco_venda: Number(d.v) }); UI.aviso('Preço sugerido salvo no produto'); });
  };

  return { render };
})();
