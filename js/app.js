/* Casca do app: login, navegação, rotas e carga dos dados. As telas ficam em js/telas/. */
const App = (function () {
  'use strict';
  const { h, ic } = UI;
  const raiz = () => document.getElementById('app');
  let logado = false, rotaAtual = '';

  const ITENS_NAV = [
    { id: 'painel', rotulo: 'Painel', icone: 'painel' },
    { id: 'estoque', rotulo: 'Estoque', icone: 'estoque' },
    { id: 'simulador', rotulo: 'Simular', icone: 'simular' },
    { id: 'ajustes', rotulo: 'Ajustes', icone: 'ajustes' }
  ];
  const ITENS_LATERAL = [
    { id: 'painel', rotulo: 'Painel', icone: 'painel' },
    { id: 'estoque', rotulo: 'Estoque', icone: 'estoque' },
    { id: 'simulador', rotulo: 'Simulador de preço', icone: 'simular' },
    { id: 'fornecedores', rotulo: 'Fornecedores', icone: 'fornecedores' },
    { id: 'ajustes', rotulo: 'Ajustes', icone: 'ajustes' }
  ];

  /* ───────── Login ───────── */
  function mostrarLogin(mensagem) {
    logado = false;
    UI.fecharTodas();
    UI.render(raiz(), h`<div class="login"><div class="card login-card">
      <img class="logo" src="icones/icone.svg" alt="">
      <h1>Estoque</h1>
      <p class="sub">${Dados.demo ? 'Modo demonstração' : 'Entre para ver o estoque'}</p>
      ${Dados.demo ? h`<div class="info-caixa">Os dados desta demonstração ficam só neste navegador. Para ligar o banco de verdade, preencha <b>js/config.js</b> com a URL e a chave pública do Supabase.</div>` : ''}
      <form data-form="login" novalidate>
        ${Dados.demo ? '' : h`${UI.campo('E-mail', 'email', { tipo: 'email', req: true, extra: 'autocomplete="username" autocapitalize="none" autocorrect="off"' })}
        ${UI.campo('Senha', 'senha', { tipo: 'password', req: true, extra: 'autocomplete="current-password"' })}`}
        <p class="erro-form" id="login-erro" role="alert">${mensagem || ''}</p>
        <button class="btn primario bloco" type="submit">${Dados.demo ? 'Entrar na demonstração' : 'Entrar'}</button>
      </form></div></div>`);
  }
  UI.aoEnviar.login = async (form, dados) => {
    const btn = form.querySelector('button[type=submit]'), erro = document.getElementById('login-erro');
    erro.textContent = '';
    const email = dados.get('email'), senha = dados.get('senha');
    if (!Dados.demo && (!email || !senha)) { erro.textContent = 'Preencha o e-mail e a senha.'; return; }
    btn.disabled = true; btn.classList.add('carregando');
    try {
      await Dados.entrar(email, senha);
      await abrirApp();
    } catch (e) {
      erro.textContent = Dados.traduzir(e);
      btn.disabled = false; btn.classList.remove('carregando');
    }
  };

  /* ───────── Casca ───────── */
  function montarCasca() {
    UI.render(raiz(), h`
      ${Dados.demo ? h`<div class="demo-faixa">MODO DEMONSTRAÇÃO · dados só neste navegador</div>` : ''}
      <div class="shell">
        <aside class="lateral" aria-label="Menu">
          <div class="marca"><img src="icones/icone.svg" alt="">Estoque</div>
          ${ITENS_LATERAL.map(i => h`<a href="#/${i.id}" data-rota="${i.id}">${ic(i.icone)}${i.rotulo}</a>`)}
          <span class="espaco"></span>
          <button type="button" class="btn primario" data-acao="lancar.abrir">${ic('mais')} Lançar</button>
          <button type="button" class="item" data-acao="app.atualizar">${ic('ok')} Atualizar dados</button>
        </aside>
        <main class="principal" id="tela" tabindex="-1"></main>
      </div>
      <nav class="nav" aria-label="Navegação">
        ${ITENS_NAV.map(i => h`<a href="#/${i.id}" data-rota="${i.id}">${ic(i.icone)}${i.rotulo}</a>`)}
      </nav>
      <button type="button" class="fab" data-acao="lancar.abrir" aria-label="Lançar movimentação">${ic('mais')}</button>`);
  }

  /* ───────── Rotas ───────── */
  function rotear(manterRolagem) {
    if (!logado) return;
    const hash = location.hash.replace(/^#/, '') || '/painel';
    const m = hash.match(/^\/([a-z]+)(?:\/([\w-]+))?/);
    const id = m && Telas[m[1]] && Telas[m[1]].render ? m[1] : 'painel';
    const arg = m && m[1] === id ? m[2] : undefined;
    const tela = Telas[id];
    const rolagem = window.scrollY;
    UI.limparGraficos();
    const alvo = document.getElementById('tela');
    if (!alvo) return;
    try {
      UI.render(alvo, tela.render(arg));
      if (tela.depois) tela.depois(arg);
    } catch (e) {
      console.error(e);
      UI.render(alvo, h`<div class="card"><p class="neg"><b>Não consegui montar esta tela.</b></p><p class="mudo">${e.message}</p>
        <a class="btn peq" style="margin-top:12px" href="#/painel">Ir para o painel</a></div>`);
    }
    document.querySelectorAll('[data-rota]').forEach(a => a.classList.toggle('on', a.dataset.rota === id));
    const chave = id + '/' + (arg || '');
    if (!manterRolagem && chave !== rotaAtual) window.scrollTo(0, 0);
    else if (manterRolagem) window.scrollTo(0, rolagem);
    rotaAtual = chave;
  }
  window.addEventListener('hashchange', () => rotear(false));
  const atualizar = () => rotear(true);

  /* ───────── Abrir o app ───────── */
  async function abrirApp() {
    UI.render(raiz(), h`<div class="login"><p class="mudo">Carregando…</p></div>`);
    try {
      await Dados.carregarTudo();
    } catch (e) {
      UI.render(raiz(), h`<div class="login"><div class="card login-card"><h1>Não foi possível carregar</h1>
        <p class="sub" style="margin:10px 0 16px">${Dados.traduzir(e)}</p>
        <p class="info-caixa">Se acabou de criar o projeto, confira se o arquivo <b>supabase/01-esquema.sql</b> foi executado.</p>
        <button class="btn primario bloco" data-acao="app.recarregar">Tentar de novo</button>
        <button class="btn sec bloco" style="margin-top:8px" data-acao="app.sair">Sair</button></div></div>`);
      logado = true; // permite o botão sair
      return;
    }
    logado = true;
    montarCasca();
    if (!location.hash) location.hash = '#/painel';
    rotear(false);
  }

  UI.acoes['app.recarregar'] = () => location.reload();
  UI.acoes['app.sair'] = async () => {
    try { await Dados.sair(); } catch (e) { /* sai mesmo assim */ }
    location.hash = '';
    mostrarLogin();
  };
  UI.acoes['app.atualizar'] = async (d, el) => {
    await UI.ocupado(el, async () => { await Dados.carregarTudo(); atualizar(); UI.aviso('Dados atualizados'); });
  };
  UI.acoes['lancar.abrir'] = (d) => Telas.lancar.abrir({ produtoId: d.produto, tipo: d.tipo });

  // Ao voltar para o app, pega o que o outro celular lançou
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || !logado || Dados.idadeCarga() < 45000) return;
    try { await Dados.carregarTudo(); atualizar(); } catch (e) { /* tenta na próxima */ }
  });

  async function iniciar() {
    Tema.aplicar();
    let usuario = null;
    try { usuario = await Dados.iniciar(); }
    catch (e) { UI.render(raiz(), h`<div class="login"><div class="card login-card"><h1>Erro</h1><p class="sub">${e.message}</p></div></div>`); return; }
    Dados.aoMudarSessao(() => { if (logado) mostrarLogin('A sessão terminou. Entre de novo.'); });
    if (usuario) await abrirApp(); else mostrarLogin();
  }

  return { iniciar, atualizar, rotear, mostrarLogin };
})();

window.addEventListener('DOMContentLoaded', () => App.iniciar());
