/* Ajudas de interface: modelos HTML com escape automático, formatação, folhas (sheets),
   avisos, gráficos e tratamento de eventos por atributo (data-acao, data-digitar, data-muda, data-form). */
/* As telas se registram aqui: Telas.painel, Telas.estoque... */
const Telas = {};

const UI = (function () {
  'use strict';

  /* ───────── HTML seguro ─────────
     h`...` escapa tudo o que vem de fora. Um h`` dentro de outro h`` entra sem escapar de novo. */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
  const raw = s => new Raw(String(s));
  const juntar = v => v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(juntar).join('') : esc(v);
  function h(strings, ...vals) {
    let out = '';
    for (let i = 0; i < strings.length; i++) { out += strings[i]; if (i < vals.length) out += juntar(vals[i]); }
    return new Raw(out);
  }
  const render = (el, conteudo) => { el.innerHTML = juntar(conteudo); };

  /* ───────── Formatação ───────── */
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const moeda = n => (n === null || n === undefined || n === '' || isNaN(n)) ? '—' : brl.format(Math.round(Number(n) * 100) / 100 + 0);
  const moeda0 = n => (n === null || n === undefined || isNaN(n)) ? '—' : brl.format(Math.round(Number(n)) + 0).replace(/,00$/, '');
  const pct = (x, casas = 0) => (x === null || x === undefined || isNaN(x)) ? '—' : (x * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%';
  const inteiro = n => (n === null || n === undefined || isNaN(n)) ? '—' : Math.round(n).toLocaleString('pt-BR');
  const decimal = (n, c = 1) => (n === null || n === undefined || isNaN(n)) ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const dataBR = s => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '—';
  const dataCurta = s => s ? `${Number(s.slice(8, 10))} ${MESES[Number(s.slice(5, 7)) - 1]}` : '—';
  const mesAno = s => s ? `${MESES_LONGOS[Number(s.slice(5, 7)) - 1]} de ${s.slice(0, 4)}` : '';
  const sinal = (x, casas = 0) => x === null || x === undefined ? '' : (x >= 0 ? '+' : '−') + pct(Math.abs(x), casas);

  // Aceita "1.234,56", "1234,56" e "1234.56"
  function numero(texto) {
    if (typeof texto === 'number') return texto;
    let s = String(texto == null ? '' : texto).trim().replace(/[^\d.,\-]/g, '');
    if (!s) return null;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    return isNaN(n) ? null : n;
  }
  const campoNum = v => (v === null || v === undefined || v === '') ? '' : String(v).replace('.', ',');
  const campoMoeda = v => (v === null || v === undefined || v === '' || isNaN(v)) ? '' : Number(v).toFixed(2).replace('.', ',');

  /* ───────── Eventos por atributo ───────── */
  const acoes = {}, aoDigitar = {}, aoMudar = {}, aoEnviar = {};
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-acao]');
    if (!el) return;
    const fn = acoes[el.dataset.acao];
    if (fn) { if (el.tagName === 'A' && !el.hasAttribute('data-nativo')) e.preventDefault(); fn(el.dataset, el, e); }
  });
  document.addEventListener('input', e => {
    const el = e.target.closest('[data-digitar]');
    if (el && aoDigitar[el.dataset.digitar]) aoDigitar[el.dataset.digitar](el, e);
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-muda]');
    if (el && aoMudar[el.dataset.muda]) aoMudar[el.dataset.muda](el, e);
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-form]');
    if (!f) return;
    e.preventDefault();
    if (aoEnviar[f.dataset.form]) aoEnviar[f.dataset.form](f, new FormData(f), e);
  });

  /* ───────── Folhas (sheets) ───────── */
  const pilha = [];
  function folha({ titulo, corpo, largo = false, aoFechar }) {
    const fundo = document.createElement('div');
    fundo.className = 'folha-fundo';
    fundo.innerHTML = `<div class="folha${largo ? ' larga' : ''}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
      <div class="folha-topo"><span class="puxador"></span><h2>${esc(titulo)}</h2>
      <button type="button" class="btn-icone" data-acao="folha.fechar" aria-label="Fechar">${icone('x')}</button></div>
      <div class="folha-corpo">${juntar(corpo)}</div></div>`;
    document.getElementById('camada').appendChild(fundo);
    document.body.classList.add('travado');
    requestAnimationFrame(() => fundo.classList.add('aberta'));
    const ctl = {
      el: fundo,
      corpo: fundo.querySelector('.folha-corpo'),
      atualizar(novo) { ctl.corpo.innerHTML = juntar(novo); },
      fechar() {
        const i = pilha.indexOf(ctl);
        if (i < 0) return;
        pilha.splice(i, 1);
        fundo.classList.remove('aberta');
        setTimeout(() => fundo.remove(), 180);
        if (!pilha.length) document.body.classList.remove('travado');
        if (aoFechar) aoFechar();
      }
    };
    fundo.addEventListener('mousedown', e => { if (e.target === fundo) ctl.fechar(); });
    pilha.push(ctl);
    const primeiro = ctl.corpo.querySelector('input:not([type=hidden]),select,textarea');
    if (primeiro && matchMedia('(hover: hover)').matches) setTimeout(() => primeiro.focus(), 60);
    return ctl;
  }
  acoes['folha.fechar'] = (d, el) => { const f = el.closest('.folha-fundo'); const c = pilha.find(x => x.el === f); if (c) c.fechar(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && pilha.length) pilha[pilha.length - 1].fechar(); });
  const fecharTodas = () => pilha.slice().forEach(c => c.fechar());

  // Pergunta de confirmação. Devolve uma Promise com true ou false.
  function confirmar({ titulo, texto, ok = 'Confirmar', perigo = false }) {
    return new Promise(resolve => {
      let decidiu = false;
      const f = folha({
        titulo,
        corpo: h`<p class="texto-folha">${texto}</p>
          <div class="botoes"><button type="button" class="btn sec" data-acao="confirmar.nao">Cancelar</button>
          <button type="button" class="btn ${perigo ? 'perigo' : 'primario'}" data-acao="confirmar.sim">${ok}</button></div>`,
        aoFechar: () => { if (!decidiu) resolve(false); }
      });
      const fim = v => { decidiu = true; resolve(v); f.fechar(); };
      f.el.querySelector('[data-acao="confirmar.sim"]').addEventListener('click', () => fim(true));
      f.el.querySelector('[data-acao="confirmar.nao"]').addEventListener('click', () => fim(false));
    });
  }

  /* ───────── Avisos ───────── */
  function aviso(msg, tipo = 'ok') {
    const caixa = document.getElementById('avisos');
    const el = document.createElement('div');
    el.className = 'aviso aviso-' + tipo;
    el.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
    el.textContent = msg;
    caixa.appendChild(el);
    requestAnimationFrame(() => el.classList.add('vis'));
    setTimeout(() => { el.classList.remove('vis'); setTimeout(() => el.remove(), 250); }, tipo === 'erro' ? 6000 : 2800);
  }
  const erro = e => aviso(Dados.traduzir(e), 'erro');

  // Trava um botão enquanto a ação roda
  async function ocupado(btn, fn) {
    if (btn) { if (btn.disabled) return; btn.disabled = true; btn.classList.add('carregando'); }
    try { return await fn(); }
    catch (e) { erro(e); }
    finally { if (btn) { btn.disabled = false; btn.classList.remove('carregando'); } }
  }

  /* ───────── Gráficos ───────── */
  const graficos = [];
  const cor = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function grafico(canvas, config) {
    if (!window.Chart || !canvas) return null;
    Chart.defaults.color = cor('--txt2');
    Chart.defaults.borderColor = cor('--linha');
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 11;
    const g = new Chart(canvas, config);
    graficos.push(g);
    return g;
  }
  const limparGraficos = () => graficos.splice(0).forEach(g => g.destroy());

  /* ───────── Peças de tela ───────── */
  const ICONES = {
    painel: '<path d="M4 19V10M10 19V5M16 19v-7M22 19H2"/>',
    estoque: '<path d="M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    simular: '<path d="M4 5h16v14H4zM8 9h8M8 13h5"/>',
    ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    fornecedores: '<path d="M3 21V9l9-6 9 6v12M9 21v-6h6v6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    voltar: '<path d="M15 5l-7 7 7 7"/>',
    mais_pequeno: '<path d="M12 5v14M5 12h14"/>',
    busca: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    editar: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>',
    lixo: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    grade: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    lista: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    alerta: '<path d="M12 4l9 16H3zM12 10v4M12 17h.01"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    whats: '<path d="M4 20l1.3-4.2A8 8 0 1 1 8.3 18.8z"/>',
    seta: '<path d="M9 5l7 7-7 7"/>',
    sair: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
    copiar: '<path d="M9 9h10v11H9zM5 15V4h10"/>',
    ok: '<path d="M5 12l5 5 9-10"/>'
  };
  const icone = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[n] || ''}</svg>`;
  const ic = (n, cls) => raw(icone(n, cls));

  function cabecalho({ titulo, sub, voltar, acoes: botoes }) {
    return h`<header class="cab">
      ${voltar ? h`<a class="btn-icone" href="${voltar}" aria-label="Voltar">${ic('voltar')}</a>` : ''}
      <div class="cab-txt"><h1>${titulo}</h1>${sub ? h`<p class="sub">${sub}</p>` : ''}</div>
      ${botoes ? h`<div class="cab-acoes">${botoes}</div>` : ''}
    </header>`;
  }
  const vazio = (texto, botao) => h`<div class="vazio"><p>${texto}</p>${botao || ''}</div>`;
  const secao = (titulo, corpo, extra) => h`<section class="secao"><div class="secao-topo"><h2>${titulo}</h2>${extra || ''}</div>${corpo}</section>`;

  function chips(itens, selecionado, acao, extraAttr = '') {
    return h`<div class="chips" role="group">${itens.map(i => h`<button type="button" class="chip${String(i.v) === String(selecionado) ? ' sel' : ''}" data-acao="${acao}" data-v="${i.v}" ${raw(extraAttr)}>${i.cor ? h`<i class="bolinha" style="background:${i.cor}"></i>` : ''}${i.t}</button>`)}</div>`;
  }

  // Barras horizontais: itens [{rotulo, valor, texto, sub, cor, acao, dados}]
  function barras(itens, { max } = {}) {
    const m = max || Math.max(...itens.map(i => Math.abs(i.valor)), 0.0001);
    if (!itens.length) return vazio('Nada para mostrar neste filtro.');
    return h`<div class="barras">${itens.map(i => {
      const tag = i.acao ? 'button' : 'div';
      return raw(`<${tag} class="barra-linha${i.acao ? ' clicavel' : ''}" ${i.acao ? `type="button" data-acao="${esc(i.acao)}" data-v="${esc(i.dados || '')}"` : ''}>
        <span class="barra-rotulo">${i.cor ? `<i class="bolinha" style="background:${esc(i.cor)}"></i>` : ''}${esc(i.rotulo)}</span>
        <span class="barra-trilho"><span class="barra-preench${i.valor < 0 ? ' neg' : ''}" style="width:${Math.max(Math.abs(i.valor) / m * 100, i.valor ? 2 : 0).toFixed(1)}%;${i.cor ? 'background:' + esc(i.cor) : ''}"></span></span>
        <span class="barra-valor">${esc(i.texto)}${i.sub ? `<small>${esc(i.sub)}</small>` : ''}</span></${tag}>`);
    })}</div>`;
  }

  // Tabela densa. colunas: [{t, cls}], linhas: [[celula, ...]]
  function tabela(colunas, linhas, vazioTxt = 'Nada para mostrar.') {
    if (!linhas.length) return vazio(vazioTxt);
    return h`<div class="tab-wrap"><table class="tab"><thead><tr>${colunas.map(c => h`<th class="${c.cls || ''}">${c.t}</th>`)}</tr></thead>
      <tbody>${linhas.map(l => h`<tr>${l.map((c, i) => h`<td class="${colunas[i].cls || ''}">${c}</td>`)}</tr>`)}</tbody></table></div>`;
  }

  function campo(rotulo, nome, { valor = '', tipo = 'text', ph = '', req = false, dec = false, dica = '', extra = '', cls = '' } = {}) {
    const modo = dec ? 'inputmode="decimal" autocomplete="off"' : '';
    return h`<label class="campo ${cls}"><span>${rotulo}${req ? h`<b class="obrig">*</b>` : ''}</span>
      <input type="${dec ? 'text' : tipo}" name="${nome}" value="${valor === null || valor === undefined ? '' : valor}" placeholder="${ph}" ${raw(modo)} ${req ? raw('required') : ''} ${raw(extra)}>
      ${dica ? h`<small>${dica}</small>` : ''}</label>`;
  }
  function areaTexto(rotulo, nome, valor = '', ph = '') {
    return h`<label class="campo"><span>${rotulo}</span><textarea name="${nome}" rows="3" placeholder="${ph}">${valor || ''}</textarea></label>`;
  }
  // opcoes: [{v, t}] ; valor selecionado
  function selecao(rotulo, nome, opcoes, valor, { extra = '', cls = '' } = {}) {
    return h`<label class="campo ${cls}"><span>${rotulo}</span><select name="${nome}" ${raw(extra)}>
      ${opcoes.map(o => h`<option value="${o.v}" ${String(o.v) === String(valor ?? '') ? raw('selected') : ''}>${o.t}</option>`)}</select></label>`;
  }
  function seg(nome, opcoes, valor, acao) {
    return h`<div class="seg" role="group">${opcoes.map(o => h`<button type="button" class="${String(o.v) === String(valor) ? 'sel' : ''}" data-acao="${acao}" data-v="${o.v}" data-nome="${nome}">${o.t}</button>`)}</div>`;
  }
  const interruptor = (nome, ligado, rotulo, acao) =>
    h`<label class="linha-int"><span>${rotulo}</span><input type="checkbox" class="int" name="${nome}" ${ligado ? raw('checked') : ''} ${acao ? raw(`data-muda="${acao}"`) : ''}></label>`;

  // Foto do produto ou um quadrado colorido com a inicial
  function miniatura(p, cats, cls = '') {
    const url = p && Dados.urlFoto(p.foto);
    if (url) return h`<div class="thumb ${cls}"><img src="${url}" alt="" loading="lazy"></div>`;
    const cat = cats && p ? cats.find(c => c.id === p.categoria_id) : null;
    const base = (cat && cat.cor) || '#8a8fa8';
    const emoji = p && p.foto && p.foto.startsWith('emoji:') ? p.foto.slice(6) : null;
    return h`<div class="thumb ${cls}${emoji ? ' ilustra' : ''}" style="background:linear-gradient(135deg, ${base}, ${base}99)"><span>${emoji || (p && p.nome || '?').trim().charAt(0).toUpperCase()}</span></div>`;
  }

  // Foto: lê o arquivo, reduz para no máximo 1200 px e comprime para cerca de 200 KB
  async function comprimirFoto(arquivo, { lado = 1200, alvoKB = 200 } = {}) {
    let img;
    if (window.createImageBitmap) {
      try { img = await createImageBitmap(arquivo, { imageOrientation: 'from-image' }); } catch (e) { img = null; }
    }
    if (!img) {
      img = await new Promise((ok, no) => {
        const i = new Image(), url = URL.createObjectURL(arquivo);
        i.onload = () => { URL.revokeObjectURL(url); ok(i); };
        i.onerror = () => no(new Error('Não foi possível abrir esta imagem.'));
        i.src = url;
      });
    }
    const w0 = img.width || img.naturalWidth, h0 = img.height || img.naturalHeight;
    const k = Math.min(1, lado / Math.max(w0, h0));
    const cv = document.createElement('canvas');
    cv.width = Math.round(w0 * k); cv.height = Math.round(h0 * k);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    let q = 0.85, blob;
    for (let i = 0; i < 6; i++) {
      blob = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', q));
      if (!blob || blob.size <= alvoKB * 1024) break;
      q -= 0.1;
    }
    if (!blob) throw new Error('Não foi possível comprimir a imagem.');
    return blob;
  }

  return { esc, raw, h, render, juntar, moeda, moeda0, pct, inteiro, decimal, dataBR, dataCurta, mesAno, sinal, numero, campoNum, campoMoeda,
    MESES, MESES_LONGOS, DIAS, acoes, aoDigitar, aoMudar, aoEnviar, folha, fecharTodas, confirmar, aviso, erro, ocupado,
    grafico, limparGraficos, cor, icone, ic, cabecalho, vazio, secao, chips, barras, tabela, campo, areaTexto, selecao, seg, interruptor,
    miniatura, comprimirFoto };
})();
