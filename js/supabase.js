/* Conexão com o Supabase, login e acesso aos dados.
   Sem URL/chave em js/config.js, o sistema abre em MODO DEMONSTRAÇÃO: os dados ficam só neste
   navegador (localStorage), com o mesmo comportamento, para testar telas antes de ligar o banco. */
const Dados = (function () {
  'use strict';
  const CFG = window.CONFIG || {};
  // Abrir o endereço com ?demo no final força o modo demonstração (para brincar sem mexer nos dados reais)
  const demo = /[?&]demo(=|&|$)/.test(location.search) || !(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  const TABELAS = ['categorias', 'canais', 'faixas_taxa', 'fornecedores', 'fornecedor_produtos',
    'etiquetas_fornecedor', 'produtos', 'movimentacoes', 'custos_fixos'];
  const CONFIG_PADRAO = { embalagem_padrao: 1.5, imposto_pct: 0, adicional_cpf: 3, tipo_vendedor: 'CPF',
    margem_minima_pct: 20, estoque_minimo_padrao: 3, dias_parado: 30, meta_lucro_mes: 0, canal_padrao_id: null, painel_cartoes: null };

  const S = { configuracoes: null };
  TABELAS.forEach(t => { S[t] = []; });
  const fotoUrls = {};
  let sb = null, backend = null, carregadoEm = 0;

  function traduzir(e) {
    const msg = String((e && (e.message || e.error_description)) || e || '');
    if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
    if (/Email not confirmed/i.test(msg)) return 'Este e-mail ainda não foi confirmado. No Supabase, abra Authentication > Users e confirme o usuário.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Sem conexão com a internet.';
    if (/JWT expired|invalid JWT/i.test(msg)) return 'A sessão expirou. Entre de novo.';
    if (/row-level security|permission denied/i.test(msg)) return 'Sem permissão. Entre de novo.';
    if (/duplicate key/i.test(msg)) return 'Já existe um registro com esse nome.';
    if (/foreign key/i.test(msg)) return 'Há registros ligados a este item.';
    if (/Password should be at least/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.';
    if (/same password|different from the old/i.test(msg)) return 'A nova senha precisa ser diferente da atual.';
    return msg || 'Algo deu errado.';
  }
  const falhar = e => { throw new Error(traduzir(e)); };

  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));

  // '' vira null; números inválidos viram null
  function limpar(obj) {
    const o = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      o[k] = (v === '' || (typeof v === 'number' && !isFinite(v))) ? null : v;
    }
    return o;
  }

  /* ───────── Backend Supabase ───────── */
  function backendSupabase() {
    if (!window.supabase) throw new Error('Não foi possível carregar a biblioteca do Supabase. Verifique a internet.');
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    return {
      async selectAll(t) {
        const todos = [], passo = 1000;
        for (let i = 0; ; i += passo) {
          const { data, error } = await sb.from(t).select('*').order('criado_em', { ascending: true }).order('id').range(i, i + passo - 1);
          if (error) falhar(error);
          todos.push(...data);
          if (data.length < passo) break;
        }
        return todos;
      },
      async insert(t, rows) {
        const { data, error } = await sb.from(t).insert(rows).select();
        if (error) falhar(error);
        return data;
      },
      async update(t, id, patch) {
        const { data, error } = await sb.from(t).update(patch).eq('id', id).select().single();
        if (error) falhar(error);
        return data;
      },
      async remove(t, id) {
        const { error } = await sb.from(t).delete().eq('id', id);
        if (error) falhar(error);
      }
    };
  }

  /* ───────── Backend de demonstração (localStorage) ───────── */
  const CHAVE_DEMO = 'estoque_demo_v1';
  const FILHOS = {
    fornecedores: [['fornecedor_produtos', 'fornecedor_id', 1], ['etiquetas_fornecedor', 'fornecedor_id', 1], ['produtos', 'fornecedor_id', 0], ['movimentacoes', 'fornecedor_id', 0]],
    produtos: [['movimentacoes', 'produto_id', 1], ['fornecedor_produtos', 'produto_id', 0]],
    categorias: [['produtos', 'categoria_id', 0]],
    canais: [['faixas_taxa', 'canal_id', 1], ['movimentacoes', 'canal_id', 0], ['configuracoes', 'canal_padrao_id', 0]]
  };
  function backendDemo() {
    const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE_DEMO)) || {}; } catch (e) { return {}; } };
    const gravar = db => {
      try { localStorage.setItem(CHAVE_DEMO, JSON.stringify(db)); }
      catch (e) { throw new Error('O armazenamento do navegador encheu. Apague fotos ou reinicie a demonstração.'); }
    };
    return {
      async selectAll(t) { return (ler()[t] || []).slice(); },
      async insert(t, rows) {
        const db = ler(); db[t] = db[t] || [];
        const novos = rows.map(r => Object.assign({ id: uuid(), criado_em: new Date().toISOString() }, r));
        db[t].push(...novos); gravar(db);
        return novos;
      },
      async update(t, id, patch) {
        const db = ler(); const lista = db[t] = db[t] || [];
        const i = lista.findIndex(r => String(r.id) === String(id));
        if (i < 0) throw new Error('Registro não encontrado.');
        lista[i] = Object.assign({}, lista[i], patch); gravar(db);
        return lista[i];
      },
      async remove(t, id) {
        const db = ler();
        db[t] = (db[t] || []).filter(r => String(r.id) !== String(id));
        for (const [filha, col, apagar] of (FILHOS[t] || [])) {
          if (apagar) db[filha] = (db[filha] || []).filter(r => r[col] !== id);
          else (db[filha] || []).forEach(r => { if (r[col] === id) r[col] = null; });
        }
        gravar(db);
      }
    };
  }

  /* ───────── Sessão ───────── */
  async function iniciar() {
    backend = demo ? backendDemo() : backendSupabase();
    if (demo) return sessionStorage.getItem('estoque_demo_logado') ? { email: 'demonstracao@local' } : null;
    const { data, error } = await sb.auth.getSession();
    if (error) return null;
    return data.session ? data.session.user : null;
  }
  async function entrar(email, senha) {
    if (demo) { sessionStorage.setItem('estoque_demo_logado', '1'); return { email: 'demonstracao@local' }; }
    const { data, error } = await sb.auth.signInWithPassword({ email: String(email).trim(), password: senha });
    if (error) falhar(error);
    return data.user;
  }
  async function sair() {
    if (demo) { sessionStorage.removeItem('estoque_demo_logado'); return; }
    await sb.auth.signOut();
  }
  async function trocarSenha(nova) {
    if (demo) return;
    const { error } = await sb.auth.updateUser({ password: nova });
    if (error) falhar(error);
  }
  function aoMudarSessao(fn) {
    if (demo || !sb) return;
    sb.auth.onAuthStateChange((evento, sessao) => { if (evento === 'SIGNED_OUT' || (evento === 'TOKEN_REFRESHED' && !sessao)) fn(); });
  }

  /* ───────── Leitura ───────── */
  async function carregarTudo() {
    if (demo) await prepararDemo();
    const [cfgs, ...listas] = await Promise.all([backend.selectAll('configuracoes'), ...TABELAS.map(t => backend.selectAll(t))]);
    S.configuracoes = cfgs[0] || null;
    TABELAS.forEach((t, i) => { S[t] = listas[i]; });
    await prepararFotos();
    carregadoEm = Date.now();
  }
  const idadeCarga = () => Date.now() - carregadoEm;
  const ordenar = lista => lista.slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  const catsOrdenadas = () => ordenar(S.categorias);
  const canaisOrdenados = () => ordenar(S.canais);
  const cfg = () => Object.assign({}, CONFIG_PADRAO, S.configuracoes || {});
  // Preferências compartilhadas (cartões do painel, metas, marcos). Ficam na coluna painel_cartoes, que é JSON livre.
  const prefs = () => { const p = cfg().painel_cartoes; return Array.isArray(p) ? { cartoes: p } : (p && typeof p === 'object' ? p : {}); };
  const salvarPrefs = patch => salvarConfig({ painel_cartoes: Object.assign({}, prefs(), patch) });
  const ehArquivo = c => !!c && !/^(data:|emoji:)/.test(c);

  async function prepararFotos() {
    const caminhos = S.produtos.map(p => p.foto).filter(ehArquivo);
    if (demo || !caminhos.length) return;
    const { data, error } = await sb.storage.from('fotos').createSignedUrls(caminhos, 3600);
    if (error) return; // sem foto não impede de usar o sistema
    data.forEach(d => { if (d.signedUrl) fotoUrls[d.path] = d.signedUrl; });
  }
  const urlFoto = caminho => !caminho || caminho.startsWith('emoji:') ? null : caminho.startsWith('data:') ? caminho : (fotoUrls[caminho] || null);

  /* ───────── Escrita ───────── */
  async function inserirVarios(t, rows) {
    const novos = await backend.insert(t, rows.map(limpar));
    S[t].push(...novos);
    return novos;
  }
  async function inserir(t, row) { return (await inserirVarios(t, [row]))[0]; }
  async function atualizar(t, id, patch) {
    const novo = await backend.update(t, id, limpar(patch));
    const i = S[t].findIndex(r => r.id === id);
    if (i >= 0) S[t][i] = novo; else S[t].push(novo);
    return novo;
  }
  // Apagar pode ter efeito em cascata no banco; por isso recarrega tudo depois.
  async function remover(t, id) {
    await backend.remove(t, id);
    await carregarTudo();
  }
  async function salvarConfig(patch) {
    patch = limpar(patch);
    if (S.configuracoes) S.configuracoes = await backend.update('configuracoes', 1, patch);
    else S.configuracoes = (await backend.insert('configuracoes', [Object.assign({ id: 1 }, patch)]))[0];
    return S.configuracoes;
  }

  /* ───────── Fotos ───────── */
  async function enviarFoto(blob, antigo) {
    if (demo) {
      return await new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => erro(new Error('Não foi possível ler a foto.')); r.readAsDataURL(blob); });
    }
    const caminho = `produtos/${uuid()}.jpg`;
    const { error } = await sb.storage.from('fotos').upload(caminho, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) falhar(error);
    const { data } = await sb.storage.from('fotos').createSignedUrl(caminho, 3600);
    if (data) fotoUrls[caminho] = data.signedUrl;
    if (ehArquivo(antigo)) sb.storage.from('fotos').remove([antigo]).catch(() => {});
    return caminho;
  }
  async function removerFoto(caminho) {
    if (!demo && ehArquivo(caminho)) await sb.storage.from('fotos').remove([caminho]);
  }

  /* ───────── Carga inicial (Fase 7) e demonstração ───────── */
  async function semear() {
    if (S.produtos.length || S.fornecedores.length) throw new Error('Já existem produtos ou fornecedores cadastrados. A carga inicial só roda com o cadastro vazio.');
    const D = DadosIniciais;
    const porNome = (lista, nome) => lista.find(x => x.nome === nome);

    const catIds = {};
    for (const [i, c] of D.categorias.entries()) {
      const ja = porNome(S.categorias, c.nome);
      catIds[c.nome] = ja ? ja.id : (await inserir('categorias', Object.assign({ ordem: i }, c))).id;
    }
    const canalIds = {};
    for (const [i, c] of D.canais.entries()) {
      const ja = porNome(S.canais, c.nome);
      canalIds[c.nome] = ja ? ja.id : (await inserir('canais', { nome: c.nome, ordem: i })).id;
    }
    const comFaixa = new Set(S.faixas_taxa.map(f => f.canal_id));
    const faixasNovas = D.faixas.filter(f => !comFaixa.has(canalIds[f.canal]))
      .map(f => ({ canal_id: canalIds[f.canal], preco_de: f.de, preco_ate: f.ate, comissao_pct: f.pct, taxa_fixa: f.fixa, observacao: f.obs }));
    if (faixasNovas.length) await inserirVarios('faixas_taxa', faixasNovas);

    const fornIds = {};
    for (const f of D.fornecedores) {
      const { etiquetas, obs, ...resto } = f;
      const novo = await inserir('fornecedores', Object.assign({}, resto, { observacoes: obs }));
      fornIds[f.nome] = novo.id;
      if (etiquetas && etiquetas.length) await inserirVarios('etiquetas_fornecedor', etiquetas.map(e => ({ fornecedor_id: novo.id, etiqueta: e })));
    }
    const prodIds = {};
    for (const p of D.produtos) {
      const novo = await inserir('produtos', { nome: p.nome, categoria_id: catIds[p.categoria] || null, fornecedor_id: fornIds[p.fornecedor] || null,
        custo_estimado: p.custo ?? null, preco_venda: p.preco ?? null, embalagem: p.emb ?? null, ativo: false, observacoes: p.obs });
      prodIds[p.nome] = novo.id;
    }
    await inserirVarios('fornecedor_produtos', D.cotacoes.map(c => ({ fornecedor_id: fornIds[c.fornecedor], produto_id: prodIds[c.produto] || null,
      descricao: c.descricao, preco: c.preco, qtd_minima: c.qtd ?? null, observacao: c.obs || null, data_cotacao: '2026-11-13' })));
    if (!cfg().canal_padrao_id) await salvarConfig({ canal_padrao_id: canalIds['Shopee'] });
    return { catIds, canalIds, fornIds, prodIds };
  }

  async function prepararDemo() {
    if (!backend || localStorage.getItem(CHAVE_DEMO)) return;
    // primeira vez: monta o cadastro inicial e algumas vendas de exemplo
    localStorage.setItem(CHAVE_DEMO, '{}');
    for (const t of TABELAS) S[t] = [];
    S.configuracoes = null;
    const ids = await semear();
    const hoje = Calc.hoje();
    const nomesAtivos = ['Capa pet para banco de carro', 'Capa de chave em silicone (kit 2)', 'Balaclava (kit 5)', 'Organizador de porta-malas'];
    for (const n of nomesAtivos) {
      const p = S.produtos.find(x => x.nome === n);
      const patch = { ativo: true, estoque_minimo: 3 };
      if (n === 'Organizador de porta-malas') Object.assign(patch, { custo_estimado: 38, preco_venda: 69.9, embalagem: 2 });
      await atualizar('produtos', p.id, patch);
    }
    const fornDoProduto = {};
    S.produtos.forEach(p => { if (p.fornecedor_id) fornDoProduto[p.nome] = p.fornecedor_id; });
    const movs = DadosIniciais.movimentosDemo({
      canais: ids.canalIds, produtos: ids.prodIds, produtoFornecedor: fornDoProduto, faixas: S.faixas_taxa,
      produtosObj: Object.fromEntries(S.produtos.map(p => [p.nome, p]))
    }, hoje, Calc, cfg());
    await inserirVarios('movimentacoes', movs);
    const mes = Calc.inicioMes(hoje);
    await inserirVarios('custos_fixos', [
      { descricao: 'MEI (guia mensal)', valor: 80, mes },
      { descricao: 'Embalagens em lote', valor: 45, mes }
    ]);
  }
  async function reiniciarDemo() {
    if (!demo) return;
    localStorage.removeItem(CHAVE_DEMO);
    await carregarTudo();
  }

  return { demo, S, TABELAS, CONFIG_PADRAO, iniciar, entrar, sair, trocarSenha, aoMudarSessao, carregarTudo, idadeCarga, cfg, prefs, salvarPrefs, catsOrdenadas, canaisOrdenados,
    inserir, inserirVarios, atualizar, remover, salvarConfig, enviarFoto, removerFoto, urlFoto, prepararFotos, semear, reiniciarDemo, traduzir };
})();
