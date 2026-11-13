/* Regras de cálculo do sistema de estoque.
   Funções puras: não tocam em tela nem em banco. Funcionam no navegador (Calc) e no Node (testes).

   Convenções das movimentações:
   - quantidade é sempre positiva, exceto em "ajuste", que pode ser negativa.
   - preco_venda e custo_unitario são valores por unidade.
   - comissao, taxa_fixa, adicional_cpf, frete, embalagem e imposto são totais da linha.
   - Na "entrada", frete é o frete do lote inteiro e entra no custo médio.
   - Na "venda", custo_unitario guarda o custo médio da hora da venda, para o lucro antigo não mudar. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const num = v => (v === null || v === undefined || v === '' || isNaN(Number(v))) ? 0 : Number(v);
  const r2 = n => Math.round((num(n) + Number.EPSILON) * 100) / 100 + 0;
  const temValor = v => v !== null && v !== undefined && v !== '';

  /* ---------- datas ('AAAA-MM-DD') ---------- */
  const pad = n => String(n).padStart(2, '0');
  const fmtData = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseData = s => { const [a, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(a, m - 1, d); };
  const hoje = () => fmtData(new Date());
  const addDias = (s, n) => { const d = parseData(s); d.setDate(d.getDate() + n); return fmtData(d); };
  const diffDias = (a, b) => Math.round((parseData(b) - parseData(a)) / 86400000);
  const inicioMes = s => String(s).slice(0, 8) + '01';
  const fimMes = s => { const d = parseData(s); return fmtData(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
  const diasNoMes = s => parseData(fimMes(s)).getDate();
  const mesAnterior = s => { const d = parseData(inicioMes(s)); d.setMonth(d.getMonth() - 1); return fmtData(d); };
  const diaSemana = s => parseData(s).getDay();

  /* ---------- taxas ---------- */
  // Acha a faixa de preço do canal. Devolve null se o preço não cabe em nenhuma faixa cadastrada.
  function acharFaixa(faixas, canalId, preco) {
    const lista = faixas.filter(f => f.canal_id === canalId).sort((a, b) => num(a.preco_de) - num(b.preco_de));
    let achada = null;
    for (const f of lista) if (preco >= num(f.preco_de) - 1e-9) achada = f;
    if (!achada) return null;
    if (temValor(achada.preco_ate) && preco >= r2(num(achada.preco_ate) + 0.01) - 1e-9) return null;
    return achada;
  }

  const embalagemDe = (produto, cfg) =>
    temValor(produto && produto.embalagem) ? num(produto.embalagem) : num(cfg && cfg.embalagem_padrao);

  // Taxas de uma venda (totais da linha), a partir da faixa, da configuração e do produto.
  function taxasVenda({ preco, qtd = 1, faixa, cfg = {}, produto = {} }) {
    const bruto = num(preco) * qtd;
    const comissao = r2(bruto * (faixa ? num(faixa.comissao_pct) : 0) / 100);
    const taxa_fixa = r2((faixa ? num(faixa.taxa_fixa) : 0) * qtd);
    const adicional_cpf = cfg.tipo_vendedor === 'CNPJ' ? 0 : r2(num(cfg.adicional_cpf) * qtd);
    const embalagem = r2(embalagemDe(produto, cfg) * qtd);
    const imposto = r2(bruto * num(cfg.imposto_pct) / 100);
    return { comissao, taxa_fixa, adicional_cpf, embalagem, imposto };
  }

  /* ---------- lucro por movimentação ---------- */
  const taxasDe = m => num(m.comissao) + num(m.taxa_fixa) + num(m.adicional_cpf) + num(m.frete) + num(m.embalagem) + num(m.imposto);

  // Lucro = qtd × (preço − custo) − comissão − taxa fixa − CPF − frete − embalagem − imposto
  function lucroLinha(m) {
    return r2(num(m.quantidade) * (num(m.preco_venda) - num(m.custo_unitario)) - taxasDe(m));
  }
  // Venda soma o lucro. Devolução desfaz a venda. Perda é prejuízo do custo. Entrada e ajuste não mexem no lucro.
  function lucroMov(m) {
    if (m.tipo === 'venda') return lucroLinha(m);
    if (m.tipo === 'devolucao') return r2(-lucroLinha(m));
    if (m.tipo === 'perda') return r2(-num(m.quantidade) * num(m.custo_unitario));
    return 0;
  }
  function receitaMov(m) {
    if (m.tipo === 'venda') return num(m.preco_venda) * num(m.quantidade);
    if (m.tipo === 'devolucao') return -num(m.preco_venda) * num(m.quantidade);
    return 0;
  }
  function deltaEstoque(m) {
    const q = num(m.quantidade);
    if (m.tipo === 'entrada' || m.tipo === 'devolucao') return q;
    if (m.tipo === 'venda' || m.tipo === 'perda') return -q;
    return q; // ajuste (com sinal)
  }

  const margem = (lucro, receita) => receita > 0 ? lucro / receita : null;
  const retorno = (lucro, custo) => custo > 0 ? lucro / custo : null;

  /* ---------- estoque e custo médio ---------- */
  const ordemMov = (a, b) =>
    String(a.data).localeCompare(String(b.data)) || String(a.criado_em || '').localeCompare(String(b.criado_em || ''));

  // Custo médio ponderado das entradas (com o frete do lote). Sem entrada, usa o custo estimado do produto.
  function custoMedio(produto, movsProduto) {
    let qtd = 0, total = 0;
    for (const m of movsProduto) {
      if (m.tipo !== 'entrada') continue;
      qtd += num(m.quantidade);
      total += num(m.quantidade) * num(m.custo_unitario) + num(m.frete);
    }
    if (qtd > 0) return Math.round(total / qtd * 10000) / 10000;
    return num(produto && produto.custo_estimado);
  }

  function estoqueEm(movsProduto, data) {
    let q = 0;
    for (const m of movsProduto) if (!data || m.data <= data) q += deltaEstoque(m);
    return q;
  }

  // Resumo por produto: estoque, custo médio, valor em estoque, última venda, primeira entrada.
  function indexar(produtos, movs) {
    const porProd = {};
    for (const m of movs) (porProd[m.produto_id] || (porProd[m.produto_id] = [])).push(m);
    const out = {};
    for (const p of produtos) {
      const ms = (porProd[p.id] || []).slice().sort(ordemMov);
      const estoque = estoqueEm(ms);
      const custo = custoMedio(p, ms);
      let ultimaVenda = null, primeiraEntrada = null;
      for (const m of ms) {
        if (m.tipo === 'venda') ultimaVenda = m.data;
        if (m.tipo === 'entrada' && !primeiraEntrada) primeiraEntrada = m.data;
      }
      out[p.id] = { estoque, custoMedio: custo, valorEstoque: Math.max(estoque, 0) * custo, ultimaVenda, primeiraEntrada, movs: ms };
    }
    return out;
  }

  // Unidades vendidas por dia nos últimos N dias (vendas menos devoluções)
  function ritmoDiario(movsProduto, ate, dias = 30) {
    const de = addDias(ate, -(dias - 1));
    let u = 0;
    for (const m of movsProduto) {
      if (m.data < de || m.data > ate) continue;
      if (m.tipo === 'venda') u += num(m.quantidade);
      if (m.tipo === 'devolucao') u -= num(m.quantidade);
    }
    return Math.max(u, 0) / dias;
  }

  /* ---------- simulador de preço ---------- */
  // Lucro de uma venda a um dado preço, em um canal.
  function lucroPreco({ preco, custo, qtd = 1, canalId, faixas, cfg, embalagem }) {
    const faixa = acharFaixa(faixas, canalId, preco);
    const t = taxasVenda({ preco, qtd, faixa, cfg, produto: { embalagem } });
    const lucro = r2(qtd * (preco - custo) - t.comissao - t.taxa_fixa - t.adicional_cpf - t.embalagem - t.imposto);
    return Object.assign({ preco, faixa, semFaixa: !faixa, lucro,
      margem: preco > 0 ? lucro / (preco * qtd) : 0, retorno: retorno(lucro, custo * qtd) }, t);
  }

  // Menor preço (em centavos) que entrega a margem desejada (m em %, ex.: 30) no canal.
  // lucro = P(1 − comissão − imposto) − (custo + fixa + CPF + embalagem); margem = lucro / P
  function precoPorMargem({ custo, margem: mPct, canalId, faixas, cfg, embalagem }) {
    const m = num(mPct) / 100;
    const bandas = faixas.filter(f => f.canal_id === canalId).sort((a, b) => num(a.preco_de) - num(b.preco_de));
    const emb = embalagemDe({ embalagem }, cfg);
    const cpf = cfg.tipo_vendedor === 'CNPJ' ? 0 : num(cfg.adicional_cpf);
    const imp = num(cfg.imposto_pct) / 100;
    const resolver = (pct, fixa) => {
      const den = 1 - pct / 100 - imp - m;
      return den <= 1e-9 ? null : (custo + fixa + cpf + emb) / den;
    };
    const candidatos = [];
    if (!bandas.length) { const p = resolver(0, 0); if (p !== null) candidatos.push(p); }
    for (const b of bandas) {
      let p = resolver(num(b.comissao_pct), num(b.taxa_fixa));
      if (p === null) continue;
      p = Math.max(p, num(b.preco_de));
      if (temValor(b.preco_ate) && p > num(b.preco_ate) + 1e-9) continue;
      candidatos.push(p);
    }
    candidatos.sort((a, b) => a - b);
    const ceil2 = p => Math.ceil(p * 100 - 1e-6) / 100;
    for (const c of candidatos) {
      // Os centavos das taxas são arredondados, então o preço exato às vezes fica um triz abaixo da margem.
      // Sobe de centavo em centavo (até R$ 0,50) antes de desistir desta faixa.
      let preco = ceil2(c), res = null;
      for (let k = 0; k < 50; k++, preco = r2(preco + 0.01)) {
        res = lucroPreco({ preco, custo, canalId, faixas, cfg, embalagem });
        if (res.margem >= m - 1e-9) break;
      }
      if (res.margem >= m - 1e-9) {
        // sugestão de vitrine: próximo preço terminado em ,90 que ainda cumpre a margem
        let vitrine = null;
        for (let n = Math.floor(preco) + (preco <= Math.floor(preco) + 0.9 ? 0 : 1), i = 0; i < 4; n++, i++) {
          const v = n + 0.9;
          if (v < preco) continue;
          if (lucroPreco({ preco: v, custo, canalId, faixas, cfg, embalagem }).margem >= m - 1e-9) { vitrine = r2(v); break; }
        }
        return Object.assign(res, { vitrine });
      }
    }
    return { preco: null, motivo: candidatos.length ? 'sem_faixa' : (bandas.length ? 'sem_faixa' : 'impossivel') };
  }

  /* ---------- períodos e filtros do painel ---------- */
  function periodo(chave, ref, de, ate) {
    const h = ref || hoje();
    switch (chave) {
      case 'hoje': return { chave, de: h, ate: h, rotulo: 'Hoje' };
      case '7d': return { chave, de: addDias(h, -6), ate: h, rotulo: 'Últimos 7 dias' };
      case '30d': return { chave, de: addDias(h, -29), ate: h, rotulo: 'Últimos 30 dias' };
      case 'mes': return { chave, de: inicioMes(h), ate: h, rotulo: 'Este mês' };
      case 'mesant': { const a = mesAnterior(h); return { chave, de: a, ate: fimMes(a), rotulo: 'Mês anterior' }; }
      case 'custom': return { chave, de: de || addDias(h, -29), ate: ate || h, rotulo: 'Período escolhido' };
      default: return { chave: 'tudo', de: null, ate: null, rotulo: 'Todo o período' };
    }
  }
  function anterior(p) {
    if (!p || !p.de) return null;
    if (p.chave === 'mes') {
      const m0 = mesAnterior(p.de), n = diffDias(p.de, p.ate), fim = addDias(m0, n), lim = fimMes(m0);
      return { de: m0, ate: fim > lim ? lim : fim };
    }
    if (p.chave === 'mesant') { const a = mesAnterior(p.de); return { de: a, ate: fimMes(a) }; }
    const n = diffDias(p.de, p.ate) + 1;
    return { de: addDias(p.de, -n), ate: addDias(p.de, -1) };
  }
  const variacao = (atual, ant) => (ant === null || ant === undefined || Math.abs(ant) < 1e-9) ? null : (atual - ant) / Math.abs(ant);

  function filtrar(movs, f, prodPorId) {
    return movs.filter(m => {
      if (f.de && m.data < f.de) return false;
      if (f.ate && m.data > f.ate) return false;
      if (f.categoriaId) {
        const p = prodPorId[m.produto_id];
        const cat = p ? (p.categoria_id || null) : null;
        if (f.categoriaId === 'sem' ? cat !== null : cat !== f.categoriaId) return false;
      }
      if (f.canalId && m.canal_id !== f.canalId) return false;
      return true;
    });
  }

  /* ---------- indicadores ---------- */
  function resumo(movs) {
    const r = { receita: 0, custo: 0, comissao: 0, taxa_fixa: 0, adicional_cpf: 0, frete: 0, embalagem: 0, imposto: 0,
      lucro: 0, lucroVendas: 0, perdas: 0, vendas: 0, unidades: 0, devolucoes: 0, devolvidas: 0, perdidas: 0, comprado: 0 };
    for (const m of movs) {
      const q = num(m.quantidade);
      r.lucro += lucroMov(m);
      if (m.tipo === 'venda' || m.tipo === 'devolucao') {
        const s = m.tipo === 'venda' ? 1 : -1;
        r.receita += s * num(m.preco_venda) * q;
        r.custo += s * q * num(m.custo_unitario);
        for (const k of ['comissao', 'taxa_fixa', 'adicional_cpf', 'frete', 'embalagem', 'imposto']) r[k] += s * num(m[k]);
        if (s === 1) { r.vendas++; r.unidades += q; } else { r.devolucoes++; r.devolvidas += q; }
      } else if (m.tipo === 'perda') {
        r.perdas += q * num(m.custo_unitario); r.perdidas += q;
      } else if (m.tipo === 'entrada') {
        r.comprado += q * num(m.custo_unitario) + num(m.frete);
      }
    }
    for (const k of Object.keys(r)) r[k] = r2(r[k]);
    r.lucroVendas = r2(r.lucro + r.perdas);
    r.margem = margem(r.lucro, r.receita);
    r.ticket = r.vendas ? r.receita / r.vendas : null;
    r.taxas = r2(r.comissao + r.taxa_fixa + r.adicional_cpf);
    return r;
  }

  // Agrupa movimentações por uma chave e devolve o resumo de cada grupo (maior lucro primeiro).
  function agruparResumo(movs, chaveFn) {
    const g = new Map();
    for (const m of movs) {
      const k = chaveFn(m);
      if (k === undefined) continue;
      if (!g.has(k)) g.set(k, []);
      g.get(k).push(m);
    }
    return [...g.entries()].map(([chave, ms]) => Object.assign({ chave, movs: ms }, resumo(ms)))
      .sort((a, b) => b.lucro - a.lucro);
  }

  // Série por dia (ou por mês quando o período é longo)
  function serie(movs, de, ate) {
    const datas = movs.map(m => m.data).sort();
    const ini = de || datas[0] || hoje(), fim = ate || hoje();
    const porMes = diffDias(ini, fim) > 92;
    const chaveDe = d => porMes ? d.slice(0, 7) : d;
    const mapa = new Map();
    for (let d = ini; d <= fim; d = addDias(d, 1)) { if (!mapa.has(chaveDe(d))) mapa.set(chaveDe(d), { rotulo: chaveDe(d), lucro: 0, receita: 0 }); }
    for (const m of movs) {
      const o = mapa.get(chaveDe(m.data));
      if (!o) continue;
      o.lucro += lucroMov(m); o.receita += receitaMov(m);
    }
    return { porMes, pontos: [...mapa.values()].map(o => ({ rotulo: o.rotulo, lucro: r2(o.lucro), receita: r2(o.receita) })) };
  }

  // Curva ABC: A até 80% do lucro, B até 95%, C o resto
  function curvaABC(linhas) { // linhas: [{..., lucro}]
    const ord = linhas.slice().sort((a, b) => b.lucro - a.lucro);
    const total = ord.reduce((s, l) => s + Math.max(l.lucro, 0), 0);
    let acum = 0;
    return ord.map(l => {
      const antes = total > 0 ? acum / total : 1;
      acum += Math.max(l.lucro, 0);
      const classe = l.lucro <= 0 ? 'C' : antes < 0.8 ? 'A' : antes < 0.95 ? 'B' : 'C';
      return Object.assign({}, l, { acumulado: total > 0 ? acum / total : 1, classe });
    });
  }

  // Retorno por lote: consome cada lote na ordem em que entrou (PEPS) e soma o caixa líquido das vendas.
  function lotes(produtos, movs) {
    const nomes = Object.fromEntries(produtos.map(p => [p.id, p]));
    const porProd = {};
    for (const m of movs) (porProd[m.produto_id] || (porProd[m.produto_id] = [])).push(m);
    const res = [];
    for (const pid of Object.keys(porProd)) {
      if (!nomes[pid]) continue;
      const fila = [];
      let ultimo = -1;
      for (const m of porProd[pid].slice().sort(ordemMov)) {
        const q = num(m.quantidade);
        if (m.tipo === 'entrada') {
          const L = { produto_id: pid, data: m.data, qtd: q, restante: q, vendidas: 0, recebido: 0, pagoEm: null,
            custoTotal: r2(q * num(m.custo_unitario) + num(m.frete)), movId: m.id };
          fila.push(L); res.push(L);
        } else if (m.tipo === 'venda' || m.tipo === 'perda' || (m.tipo === 'ajuste' && q < 0)) {
          const total = Math.abs(q);
          let falta = total;
          const caixa = m.tipo === 'venda' ? num(m.preco_venda) * q - taxasDe(m) : 0;
          for (let i = 0; i < fila.length && falta > 0; i++) {
            const L = fila[i];
            if (L.restante <= 0) continue;
            const t = Math.min(L.restante, falta);
            L.restante -= t; falta -= t; ultimo = i;
            if (m.tipo === 'venda') {
              L.vendidas += t; L.recebido += caixa * t / total;
              if (L.pagoEm === null && L.recebido >= L.custoTotal - 1e-9) L.pagoEm = m.data;
            }
          }
        } else if (m.tipo === 'devolucao' && fila.length) {
          const L = fila[ultimo >= 0 ? ultimo : 0];
          L.restante += q; L.vendidas -= q; L.recebido -= num(m.preco_venda) * q - taxasDe(m);
        }
      }
    }
    return res.map(L => Object.assign(L, {
      recebido: r2(L.recebido),
      pct: L.custoTotal > 0 ? L.recebido / L.custoTotal : null,
      dias: L.pagoEm ? diffDias(L.data, L.pagoEm) : null,
      resultado: r2(L.recebido - L.custoTotal)
    })).sort((a, b) => b.data.localeCompare(a.data));
  }

  // Ponto de equilíbrio e projeção do mês
  function equilibrio({ movsMes, fixos, hojeStr }) {
    const r = resumo(movsMes);
    const dia = parseData(hojeStr).getDate(), dias = diasNoMes(hojeStr);
    const lucroPorVenda = r.vendas ? r.lucroVendas / r.vendas : null;
    const necessarias = lucroPorVenda && lucroPorVenda > 0 ? Math.ceil(fixos / lucroPorVenda) : null;
    return {
      fixos: r2(fixos), lucro: r.lucro, vendas: r.vendas, lucroPorVenda,
      necessarias, faltam: necessarias === null ? null : Math.max(necessarias - r.vendas, 0),
      resultado: r2(r.lucro - fixos),
      dia, dias, projecao: dia > 0 ? r2(r.lucro / dia * dias) : 0,
      projecaoResultado: dia > 0 ? r2(r.lucro / dia * dias - fixos) : 0
    };
  }

  return { num, r2, hoje, addDias, diffDias, inicioMes, fimMes, diasNoMes, mesAnterior, diaSemana, parseData, fmtData,
    acharFaixa, taxasVenda, taxasDe, lucroLinha, lucroMov, receitaMov, deltaEstoque, margem, retorno,
    custoMedio, estoqueEm, indexar, ritmoDiario, lucroPreco, precoPorMargem,
    periodo, anterior, variacao, filtrar, resumo, agruparResumo, serie, curvaABC, lotes, equilibrio, ordemMov, embalagemDe };
});
