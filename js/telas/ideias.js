/* Ideias de produtos: candidatos para ampliar o catálogo, com lucro simulado nos seus canais.
   Os custos são estimativas sem cotação. "Adicionar" cria o produto como inativo, com ilustração provisória. */
Telas.ideias = (function () {
  'use strict';
  const { h, ic, moeda, pct } = UI;
  const S = Dados.S;
  let filtro = '';

  const jaTem = i => S.produtos.find(p => p.nome.trim().toLowerCase() === i.nome.toLowerCase());
  // Lucro em cada canal seu; devolve o melhor
  function melhorCanal(i) {
    const cfg = Dados.cfg();
    const res = Dados.canaisOrdenados().filter(c => S.faixas_taxa.some(f => f.canal_id === c.id && Number(f.comissao_pct) > 0))
      .map(c => ({ c, r: Calc.lucroPreco({ preco: i.preco, custo: i.custo, canalId: c.id, faixas: S.faixas_taxa, cfg, embalagem: i.emb }) }))
      .filter(x => !x.r.semFaixa).sort((a, b) => b.r.lucro - a.r.lucro);
    return res[0] || null;
  }

  function render() {
    const mercados = [...new Set(DadosCrescer.ideias.map(i => i.mercado))];
    const min = Dados.cfg().margem_minima_pct / 100;
    const lista = DadosCrescer.ideias.filter(i => !filtro || i.mercado === filtro).map(i => ({ i, m: melhorCanal(i) }))
      .sort((a, b) => (b.m ? b.m.r.lucro : -1e9) - (a.m ? a.m.r.lucro : -1e9));
    return h`${UI.cabecalho({ titulo: 'Ideias de produtos', sub: 'Candidatos para ampliar o catálogo' })}
      <div class="aviso-caixa">Os custos são <b>estimativas sem cotação</b> e os preços são sugestões. Servem para comparar ideias, não para decidir a compra. Antes de comprar, peça cotação e confira o preço praticado nos anúncios. Pesquisa de ${DadosCrescer.DATA}.</div>
      ${UI.chips([{ v: '', t: 'Todos' }, ...mercados.map(m => ({ v: m, t: m }))], filtro, 'id.filtro')}
      <div class="ideias-grade" style="margin-top:10px">${lista.map(({ i, m }) => {
        const tem = jaTem(i), cat = S.categorias.find(c => c.nome === i.cat);
        return h`<section class="card"><div class="ideia-topo">${UI.miniatura({ nome: i.nome, foto: DadosFotos[i.foto] ? `img/produtos/${i.foto}.jpg` : 'emoji:' + i.emoji, categoria_id: cat ? cat.id : null }, S.categorias)}
          <div style="min-width:0;flex:1"><b style="display:block;line-height:1.25">${i.nome}</b><small>${i.mercado} · custo estimado ${moeda(i.custo)} · venda sugerida ${moeda(i.preco)}</small></div></div>
          ${m ? h`<div class="dupla" style="margin-top:6px"><div class="dado"><div class="rot">Lucro por venda</div><div class="val ${m.r.lucro < 0 ? 'neg' : 'pos'}">${moeda(m.r.lucro)}</div><small>${pct(m.r.margem, 1)} de margem${m.r.margem < min ? ', abaixo do seu mínimo' : ''}</small></div>
            <div class="dado"><div class="rot">Melhor canal seu</div><div class="val" style="font-size:1rem">${m.c.nome}</div><small>retorno de ${pct(m.r.retorno)} sobre o custo</small></div></div>`
            : h`<p class="mudo" style="margin-top:8px;font-size:.85rem">Cadastre canais com taxas para ver o lucro simulado.</p>`}
          <ul class="lista-pontos"><li><b>Por que:</b> ${i.porque}</li><li><b>Atenção:</b> ${i.risco}</li></ul>
          ${tem ? h`<a class="btn sec peq bloco" style="margin-top:12px" href="#/estoque/${tem.id}">${ic('ok')} Já está no cadastro</a>`
            : h`<button type="button" class="btn primario peq bloco" style="margin-top:12px" data-acao="id.adicionar" data-nome="${i.nome}">${ic('mais')} Adicionar como candidato</button>`}</section>`;
      })}</div>
      <p class="mudo" style="margin:14px 4px;font-size:.82rem">As fotos são de licença livre (Wikimedia Commons e Openverse), com o autor creditado na ficha de cada produto. Algumas são ilustrativas: mostram o tipo de produto, não o item do fornecedor. Quando o produto chegar, troque pela sua foto.</p>`;
  }

  UI.acoes['id.filtro'] = d => { filtro = d.v; App.atualizar(); };
  UI.acoes['id.adicionar'] = (d, el) => UI.ocupado(el, async () => {
    const i = DadosCrescer.ideias.find(x => x.nome === d.nome);
    let cat = S.categorias.find(c => c.nome === i.cat);
    if (!cat) cat = await Dados.inserir('categorias', { nome: i.cat, cor: '#2fc98e', ordem: S.categorias.length });
    await Dados.inserir('produtos', { nome: i.nome, categoria_id: cat.id, custo_estimado: i.custo, preco_venda: i.preco, embalagem: i.emb, ativo: false, foto: DadosFotos[i.foto] ? `img/produtos/${i.foto}.jpg` : 'emoji:' + i.emoji,
      observacoes: `Ideia da pesquisa de ${DadosCrescer.DATA}. Custo estimado, sem cotação. ${i.porque} Atenção: ${i.risco}` });
    App.atualizar(); UI.aviso('Adicionado ao estoque como candidato (inativo)');
  });

  return { render };
})();
