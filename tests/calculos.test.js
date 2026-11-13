// Rodar com: node tests/calculos.test.js
const assert = require('assert');
const C = require('../js/calculos.js');

let ok = 0;
const t = (nome, fn) => { try { fn(); ok++; console.log('  ok   ' + nome); } catch (e) { console.log('  FALHOU ' + nome + '\n         ' + e.message); process.exitCode = 1; } };
const perto = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) <= tol, `esperado ${b}, veio ${a}`);

const faixas = [
  { canal_id: 'sh', preco_de: 0, preco_ate: 79.99, comissao_pct: 20, taxa_fixa: 4.5 },
  { canal_id: 'sh', preco_de: 80, preco_ate: 99.99, comissao_pct: 14, taxa_fixa: 16 },
  { canal_id: 'sh', preco_de: 100, preco_ate: 199.99, comissao_pct: 14, taxa_fixa: 20 },
  { canal_id: 'ml', preco_de: 0, preco_ate: 78.99, comissao_pct: 12, taxa_fixa: 6 },
  { canal_id: 'ml', preco_de: 79, preco_ate: null, comissao_pct: 12, taxa_fixa: 0 }
];
const cfg = { embalagem_padrao: 1.5, imposto_pct: 0, adicional_cpf: 3, tipo_vendedor: 'CPF' };

console.log('Faixas');
t('preço 79,90 cai na faixa 1', () => assert.strictEqual(C.acharFaixa(faixas, 'sh', 79.9).preco_de, 0));
t('preço 80 cai na faixa 2', () => assert.strictEqual(C.acharFaixa(faixas, 'sh', 80).preco_de, 80));
t('preço 150 cai na faixa 3', () => assert.strictEqual(C.acharFaixa(faixas, 'sh', 150).preco_de, 100));
t('preço 200 não tem faixa cadastrada', () => assert.strictEqual(C.acharFaixa(faixas, 'sh', 200), null));
t('faixa sem teto vale para qualquer preço', () => assert.strictEqual(C.acharFaixa(faixas, 'ml', 5000).preco_de, 79));

console.log('Lucro por venda (tabela da pesquisa, Shopee, CPF)');
const casos = [
  ['Capa pet 79,90', 79.9, 26.99, 2, 27.43, 0.34],
  ['Capa pet 59,90', 59.9, 26.99, 2, 11.43, 0.19],
  ['Capa de chave kit 2', 49.9, 16, 1, 15.42, 0.31],
  ['Capa de chave 1 un.', 29.9, 8, 1, 7.42, 0.25],
  ['Balaclava kit 5', 59.9, 27.65, 2, 10.77, 0.18],
  ['Balaclava kit 3', 34.9, 16.59, 1.5, 2.33, 0.07],
  ['Rede 1 un.', 16.99, 7.1, 1, -2.01, null],
  ['Rede kit 3', 39.9, 21.3, 1.5, 1.62, 0.04]
];
for (const [nome, preco, custo, emb, lucro, marg] of casos) {
  t(nome, () => {
    const r = C.lucroPreco({ preco, custo, canalId: 'sh', faixas, cfg, embalagem: emb });
    perto(r.lucro, lucro);
    if (marg !== null) perto(r.margem, marg, 0.006);
  });
}

console.log('Lucro por movimentação');
const venda = { tipo: 'venda', quantidade: 2, preco_venda: 79.9, custo_unitario: 26.99, comissao: 31.96, taxa_fixa: 9, adicional_cpf: 6, frete: 0, embalagem: 4, imposto: 0 };
t('venda de 2 unidades', () => perto(C.lucroMov(venda), 54.86));
t('devolução com tudo estornado desfaz a venda', () => perto(C.lucroMov(Object.assign({}, venda, { tipo: 'devolucao' })), -54.86));
t('perda custa o custo das unidades', () => perto(C.lucroMov({ tipo: 'perda', quantidade: 3, custo_unitario: 10 }), -30));
t('entrada e ajuste não mexem no lucro', () => { assert.strictEqual(C.lucroMov({ tipo: 'entrada', quantidade: 5, custo_unitario: 9 }), 0); assert.strictEqual(C.lucroMov({ tipo: 'ajuste', quantidade: -1 }), 0); });

console.log('Estoque e custo médio');
const prod = { id: 'p1', custo_estimado: 5 };
const movs = [
  { id: 'a', produto_id: 'p1', tipo: 'entrada', quantidade: 10, custo_unitario: 20, frete: 0, data: '2026-11-01' },
  { id: 'b', produto_id: 'p1', tipo: 'entrada', quantidade: 10, custo_unitario: 30, frete: 20, data: '2026-11-05' },
  { id: 'c', produto_id: 'p1', tipo: 'venda', quantidade: 4, preco_venda: 60, custo_unitario: 26, data: '2026-11-06' },
  { id: 'd', produto_id: 'p1', tipo: 'perda', quantidade: 1, custo_unitario: 26, data: '2026-11-07' },
  { id: 'e', produto_id: 'p1', tipo: 'devolucao', quantidade: 1, preco_venda: 60, custo_unitario: 26, data: '2026-11-08' },
  { id: 'f', produto_id: 'p1', tipo: 'ajuste', quantidade: -2, data: '2026-11-09' }
];
t('custo médio ponderado com frete do lote', () => perto(C.custoMedio(prod, movs), 26)); // (10×20 + 10×30 + 20 de frete) ÷ 20
t('estoque = soma das movimentações', () => assert.strictEqual(C.indexar([prod], movs)[prod.id].estoque, 10 + 10 - 4 - 1 + 1 - 2));
t('sem entradas usa o custo estimado', () => assert.strictEqual(C.custoMedio(prod, []), 5));
t('estoque numa data passada', () => assert.strictEqual(C.estoqueEm(movs, '2026-11-05'), 20));

console.log('Simulador: preço pela margem');
t('margem de 30% fecha em cada canal', () => {
  for (const canalId of ['sh', 'ml']) {
    const r = C.precoPorMargem({ custo: 26.99, margem: 30, canalId, faixas, cfg, embalagem: 2 });
    assert.ok(r.preco, 'sem preço em ' + canalId);
    assert.ok(r.margem >= 0.3 - 1e-9, `margem ${r.margem}`);
    // um centavo a menos não pode atingir a margem na mesma faixa
    const menos = C.lucroPreco({ preco: r.preco - 0.01, custo: 26.99, canalId, faixas, cfg, embalagem: 2 });
    assert.ok(menos.margem < 0.3, 'não é o menor preço');
  }
});
t('escolhe a faixa mais barata que fecha a margem (Shopee, 30%, custo 26,99 → perto de R$ 73, não R$ 85)', () => {
  const r = C.precoPorMargem({ custo: 26.99, margem: 30, canalId: 'sh', faixas, cfg, embalagem: 2 });
  assert.ok(r.preco >= 72.98 && r.preco <= 73.05, `preço ${r.preco}`);
});
t('preço de vitrine termina em ,90 e cumpre a margem', () => {
  const r = C.precoPorMargem({ custo: 26.99, margem: 30, canalId: 'sh', faixas, cfg, embalagem: 2 });
  assert.ok(Math.abs((r.vitrine * 10) % 10 - 9) < 1e-6, String(r.vitrine));
  assert.ok(C.lucroPreco({ preco: r.vitrine, custo: 26.99, canalId: 'sh', faixas, cfg, embalagem: 2 }).margem >= 0.3 - 1e-9);
});
t('margem impossível é avisada', () => assert.strictEqual(C.precoPorMargem({ custo: 10, margem: 90, canalId: 'sh', faixas, cfg }).preco, null));
t('canal sem faixa usa só custos', () => perto(C.precoPorMargem({ custo: 10, margem: 20, canalId: 'outro', faixas, cfg: { embalagem_padrao: 0, adicional_cpf: 0, tipo_vendedor: 'CNPJ' } }).preco, 12.5));
t('CNPJ não paga o adicional de CPF', () => {
  const cpf = C.lucroPreco({ preco: 79.9, custo: 26.99, canalId: 'sh', faixas, cfg, embalagem: 2 }).lucro;
  const cnpj = C.lucroPreco({ preco: 79.9, custo: 26.99, canalId: 'sh', faixas, cfg: Object.assign({}, cfg, { tipo_vendedor: 'CNPJ' }), embalagem: 2 }).lucro;
  perto(cnpj - cpf, 3);
});

console.log('Indicadores');
const vendas = [
  { produto_id: 'p1', tipo: 'venda', quantidade: 1, preco_venda: 100, custo_unitario: 40, comissao: 14, taxa_fixa: 20, adicional_cpf: 3, embalagem: 2, data: '2026-11-02', canal_id: 'sh' },
  { produto_id: 'p2', tipo: 'venda', quantidade: 1, preco_venda: 50, custo_unitario: 30, comissao: 10, taxa_fixa: 4.5, adicional_cpf: 3, embalagem: 1, data: '2026-11-03', canal_id: 'ml' },
  { produto_id: 'p2', tipo: 'perda', quantidade: 1, custo_unitario: 30, data: '2026-11-04' }
];
t('resumo soma receita, taxas e lucro (com perda)', () => {
  const r = C.resumo(vendas);
  assert.strictEqual(r.receita, 150);
  assert.strictEqual(r.vendas, 2);
  perto(r.lucroVendas, 21 + 1.5);
  perto(r.lucro, 22.5 - 30);
  perto(r.taxas, 14 + 20 + 3 + 10 + 4.5 + 3);
});
t('filtro por categoria e canal', () => {
  const pp = { p1: { categoria_id: 'c1' }, p2: { categoria_id: 'c2' } };
  assert.strictEqual(C.filtrar(vendas, { categoriaId: 'c2' }, pp).length, 2);
  assert.strictEqual(C.filtrar(vendas, { canalId: 'sh' }, pp).length, 1);
  assert.strictEqual(C.filtrar(vendas, { de: '2026-11-03', ate: '2026-11-03' }, pp).length, 1);
});
t('curva ABC', () => {
  const l = C.curvaABC([{ n: 'x', lucro: 80 }, { n: 'y', lucro: 15 }, { n: 'z', lucro: 5 }, { n: 'w', lucro: -3 }]);
  assert.deepStrictEqual(l.map(i => i.classe), ['A', 'B', 'C', 'C']);
});
t('período anterior tem o mesmo tamanho', () => {
  const p = C.periodo('30d', '2026-11-30');
  assert.deepStrictEqual(C.anterior(p), { de: '2026-10-02', ate: '2026-10-31' });
});
t('mês atual compara com o mesmo trecho do mês anterior', () => {
  const p = C.periodo('mes', '2026-11-13');
  assert.deepStrictEqual(C.anterior(p), { de: '2026-10-01', ate: '2026-10-13' });
});
t('ponto de equilíbrio e projeção', () => {
  const e = C.equilibrio({ movsMes: [vendas[0], vendas[1]], fixos: 45, hojeStr: '2026-11-10' });
  perto(e.lucroPorVenda, 11.25);
  assert.strictEqual(e.necessarias, 4);
  assert.strictEqual(e.faltam, 2);
  perto(e.projecao, 22.5 / 10 * 30);
});

console.log('Retorno por lote (PEPS)');
t('lote se paga em N dias', () => {
  const ps = [{ id: 'p1' }];
  const ms = [
    { id: '1', produto_id: 'p1', tipo: 'entrada', quantidade: 2, custo_unitario: 20, frete: 0, data: '2026-11-01' },
    { id: '2', produto_id: 'p1', tipo: 'venda', quantidade: 1, preco_venda: 50, comissao: 10, data: '2026-11-03' },
    { id: '3', produto_id: 'p1', tipo: 'venda', quantidade: 1, preco_venda: 50, comissao: 10, data: '2026-11-06' }
  ];
  const [L] = C.lotes(ps, ms);
  assert.strictEqual(L.custoTotal, 40);
  perto(L.recebido, 80);
  assert.strictEqual(L.dias, 2); // já tinha devolvido 40 no dia 3, dois dias depois da entrada
});

console.log(`\n${ok} testes passaram`);
