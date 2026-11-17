# Estoque: como colocar para funcionar

O sistema está pronto e já abre em **modo demonstração** (dados só no navegador, com exemplos). Para usar de verdade, com os dois celulares compartilhando os mesmos dados, faltam três coisas que só você pode fazer: criar o banco no Supabase, preencher `js/config.js` e publicar no GitHub Pages.

## 0. Ver funcionando agora (opcional)

Na pasta do projeto, num terminal:

```bash
python -m http.server 5173
```

Abra `http://localhost:5173` e toque em **Entrar na demonstração**. Precisa de internet (os gráficos e a conexão com o Supabase vêm por link). Ajustes > Dados > **Reiniciar demonstração** volta ao começo.

## 1. Banco de dados (Supabase) — Fase 1

1. Em supabase.com, com o e-mail pessoal, crie um projeto novo na região **São Paulo**.
2. Abra **SQL Editor > New query**, cole todo o conteúdo de `supabase/01-esquema.sql` e clique em **Run**. Isso cria as tabelas, liga a segurança por linha e cria o bucket privado `fotos`. Pode rodar de novo sem estragar nada.
3. **Authentication > Users > Add user > Create new user**: crie os dois usuários (e-mail e senha) e marque *Auto Confirm User*.
4. **Authentication > Sign In / Providers > Email**: desligue **Allow new users to sign up** (cadastro público). Sem isso qualquer pessoa com o link poderia criar conta.
5. **Project Settings > API**: copie a **Project URL** e a chave **anon / public**.
6. Cole as duas em `js/config.js`. **Nunca** use a chave `service_role` no site.

## 2. Publicar (GitHub Pages) — Fase 6

1. No GitHub, crie um repositório **público** (o Pages gratuito exige isso) e envie todos os arquivos desta pasta.
2. **Settings > Pages**: *Deploy from a branch*, branch `main`, pasta `/ (root)`.
3. Abra o link `https://SEU-USUARIO.github.io/NOME-DO-REPO/` nos dois celulares, entre com e-mail e senha e, no Safari, **Compartilhar > Adicionar à Tela de Início**.

O código fica visível a qualquer um; os dados não, porque exigem login (segurança por linha). A chave anon pode ficar pública por isso.

## 3. Carga inicial — Fase 7

Entre no sistema e vá em **Ajustes > Dados > Carregar dados da pesquisa**. Cadastra categorias, os canais com as faixas de taxa, os 9 fornecedores e os produtos candidatos (inativos, para o simulador).

**Antes de confiar nos lucros**, confira em **Ajustes > Canais e taxas** os valores nos sites oficiais:

- Shopee: a pesquisa não trouxe a faixa de R$ 200 em diante. O sistema avisa "sem faixa" nesses preços até você cadastrar.
- Mercado Livre: comissão e custo fixo são **estimativas** (a pesquisa deu intervalos). Usei o meio: 12% (Clássico) e 17% (Premium), R$ 6 abaixo de R$ 79.
- Adicional de R$ 3 para vendedor CPF: as fontes divergem. Ajuste em **Ajustes > Custos padrão**.

## 4. Conferência — Fase 8

1. Em **Estoque**, abra um produto candidato e toque em **Entrada**: informe quantidade e custo. O produto vira ativo sozinho.
2. Lance uma **Venda** e confira o lucro com a conta à mão: `preço − custo médio − comissão − taxa fixa − CPF − embalagem − imposto`.
3. Confira que o estoque baixou e que o alerta de mínimo aparece no Painel.
4. Abra o link numa aba anônima sem entrar: nenhum dado deve aparecer.
5. Lance no celular de um e toque em **Atualizar** (ou volte ao app) no do outro.
6. Apague os dados de teste: em cada produto, nos lançamentos, o ícone de lixeira.

## Como funciona (resumo)

- **Estoque** = soma das movimentações. **Custo** = média ponderada das entradas (com o frete do lote). A venda guarda o custo da hora, então lucro antigo não muda quando o custo muda.
- **Devolução** desfaz a venda. Zere as taxas que a plataforma não devolveu: elas ficam como custo. **Perda** entra no lucro como prejuízo. **Ajuste** só corrige a contagem.
- Valores monetários da movimentação são totais da linha, exceto preço e custo (por unidade).
- Os dois celulares veem o que o outro lançou ao voltar ao app (depois de 45 s) ou ao tocar em **Atualizar dados**. Não é em tempo real.
- Tema, tamanho do texto e modo leve ficam salvos por aparelho.

## Diferenças em relação ao roteiro

- `produtos` ganhou `custo_estimado` (candidatos sem compra ainda precisam de custo para simular) e `embalagem` (a pesquisa usa R$ 1 a R$ 2 conforme o produto).
- `fornecedor_produtos` ganhou `observacao`.
- Existe modo demonstração, que o roteiro não previa.

## Arquivos

```
index.html            casca do app            supabase/01-esquema.sql   banco
css/estilo.css        três temas              js/config.js              URL e chave do Supabase
js/calculos.js        regras de cálculo       js/supabase.js            conexão, login, dados, demo
js/ui.js              componentes             js/dados-iniciais.js      carga da pesquisa
js/telas/             painel, estoque, lançar, simulador, fornecedores, ajustes
tests/calculos.test.js   node tests/calculos.test.js
```

Os testes reproduzem os oito lucros da tabela de `pesquisa-produtos.md` (R$ 27,43; R$ 15,42; −R$ 2,01 e os demais).

## Observações

- Projetos gratuitos do Supabase podem ser pausados por inatividade. Se o sistema ficar sem uso por semanas e parar de abrir, entre no painel do Supabase e clique em **Restore**. Confirme a regra atual no site.
- Faça uma planilha de backup por mês em **Ajustes > Dados > Baixar planilha**.

## Crescer (adicionado em 16/11/2026)

Três telas novas, no menu do PC e, no celular, no fim do Painel e em Ajustes:

- **Planejamento**: meta de lucro por mês, semestre e ano. Informe a meta anual e o sistema divide pelos meses (igual, crescente ou sazonal). Mostra quanto falta no mês, quanto precisa por dia, o faturamento contra o limite do MEI e uma lista de próximos passos.
- **Ideias de produtos**: 16 candidatos (pet, moto, carro, casa) com lucro simulado nos seus canais. Os custos são estimativas sem cotação. "Adicionar como candidato" cria o produto inativo, com ilustração provisória; a foto de verdade você tira pela câmera na ficha do produto.
- **Plataformas**: indica onde vender cada produto considerando as taxas de 9 plataformas, com guia de cada uma e as fontes. Os botões para adicionar um canal, trocar taxas ou zerar o adicional de CPF só agem quando você toca neles.

As metas e os próximos passos ficam guardados no banco, na coluna `painel_cartoes` da tabela `configuracoes`, sem precisar rodar SQL de novo.

Para brincar sem mexer nos dados reais, abra o endereço com `?demo` no final.
