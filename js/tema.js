/* Aparência: tema, tamanho do texto e modo leve. Fica salvo por aparelho (localStorage).
   Carregado no <head> para a tela já abrir com o tema certo, sem piscar. */
(function () {
  'use strict';
  const ler = (k, padrao) => { try { const v = localStorage.getItem(k); return v === null ? padrao : v; } catch (e) { return padrao; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento: vale só nesta sessão */ } };
  const mq = q => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {} });

  const TEXTO = { p: 14, m: 16, g: 18 };
  const COR_BARRA = { a: '#0b0b1a', b: '#fde9dc', c: '#17181b' };

  const Tema = {
    TEMAS: { a: 'Vidro Aurora', b: 'Vidro Claro', c: 'Painel Grafite', auto: 'Automático' },
    ler() { return { tema: ler('tema', 'auto'), texto: ler('texto', 'm'), leve: ler('leve', 'auto') }; },
    gravar(chave, valor) { gravar(chave, valor); Tema.aplicar(); },
    // Automático: Claro (B) de dia e Noturno (A) à noite, seguindo o aparelho
    resolver() {
      const { tema } = Tema.ler();
      if (tema === 'a' || tema === 'b' || tema === 'c') return tema;
      return mq('(prefers-color-scheme: dark)').matches ? 'a' : 'b';
    },
    leveAtivo() {
      const { leve } = Tema.ler();
      if (leve === '1') return true;
      if (leve === '0') return false;
      return mq('(prefers-reduced-transparency: reduce)').matches || mq('(prefers-reduced-motion: reduce)').matches;
    },
    aplicar() {
      const r = document.documentElement, { texto } = Tema.ler(), t = Tema.resolver();
      r.setAttribute('data-tema', t);
      r.setAttribute('data-leve', Tema.leveAtivo() ? '1' : '0');
      r.style.fontSize = (TEXTO[texto] || 16) + 'px';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', COR_BARRA[t]);
    }
  };
  window.Tema = Tema;
  Tema.aplicar();
  ['(prefers-color-scheme: dark)', '(prefers-reduced-transparency: reduce)', '(prefers-reduced-motion: reduce)'].forEach(q => {
    const m = mq(q);
    if (m.addEventListener) m.addEventListener('change', Tema.aplicar);
  });
})();
