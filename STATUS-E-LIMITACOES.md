# Lagamar Investiga v2 — Status da Implementação

## Atualizações mais recentes

1. **Navegação para o professor**: o botão "Modo professor" na tela do aluno leva direto para
   `professor.html` (que pede a própria senha). Para isso funcionar no seu domínio, suba os dois
   arquivos (`index.html` e `professor.html`) **na mesma pasta** do seu site — não precisa de
   nenhuma configuração extra de servidor. Se sua hospedagem usar rotas diferentes (ex.: sem
   `.html` na URL, ou subdomínio dedicado), me avise qual serviço você vai usar que ajusto.
2. **Relatório em formato de documento**: a prévia na Etapa 9 agora mostra o relatório já
   formatado como um documento (mesmo layout do PDF final, dentro de um iframe), não mais como
   texto simples. O botão de baixar PDF continua funcionando à parte, liberado após a aprovação
   do professor.
3. **"Concluir" volta à tela inicial**: depois de enviar o relatório (ou já com status de
   aprovado/revisão), o botão "Concluir" leva de volta à tela inicial — sem perder a sessão do
   grupo, que continua salva para retomar depois (aparece a tela "Continuando como Grupo X").
4. **Fotos reais com interação**: os 4 painéis agora têm uma galeria de fotos por local/estação,
   com lightbox (amplia em tela cheia, navega por setas/teclado ← →, fecha com ESC). A estrutura
   já está pronta no banco (tabela `location_photos` + bucket de Storage); veja
   `COMO-ADICIONAR-FOTOS.md` para o passo a passo de upload.

Durante os testes desta rodada, encontrei e corrigi um bug real de empacotamento: ao reconstruir
a fonte editável do `index.html` a partir da versão embutida anterior, o bloco de dados
(`lagamarData.js`) ficou órfão — referenciado como arquivo externo em vez de embutido, o que
quebraria a aplicação para quem baixasse só o `index.html`. Corrigido e revalidado.

---

## O que está pronto e testado

### 1. Banco de dados (Supabase)
Projeto `lagamar-investiga` criado (região São Paulo, plano gratuito), schema completo:
`classes`, `groups`, `investigations`, `data_points` (separação quantitativo × qualitativo),
`table_rows`, `evidence_log`, `submissions`, `location_photos`. Turmas e grupos já cadastrados:
**7º A com 7 grupos**, **7º B com 6 grupos**. RLS aberto (sem login de aluno). Bucket de Storage
`location-photos` criado e público para leitura.

### 2. Tela do aluno (`index.html`) — autocontida, migrada para Supabase
- Seleção de acesso por clique: turma → grupo, sem digitar nome. Sessão leve salva no navegador
  para retomar sem escolher de novo.
- As 9 etapas persistem direto no banco (debounce de 600ms por campo).
- Import de Ficha Técnica (PDF/DOCX) na Etapa 1, aplicando só campos de alta confiança.
- Fluxo de aprovação sincronizado com o professor (polling a cada 30s na Etapa 9).
- Relatório final em formato de documento, com PDF liberado após aprovação.
- Galeria de fotos reais por painel, com lightbox interativo.

### 3. Painel do Professor (`professor.html`) — autocontido
Três seções: Visão Geral, Fila de Aprovação, Comparar Grupos. Contador de pendências atualiza
corretamente em ambos os pontos de entrada.

### 4. Ambos os HTMLs são autocontidos
Todo CSS e JavaScript local embutido inline — só dependem de CDN para bibliotecas externas
(Supabase, e no aluno também pdf.js/mammoth.js para o import).

---

## Bugs reais encontrados e corrigidos ao longo do desenvolvimento

1. **Envio para aprovação não atualizava o status** — função assíncrona chamada como síncrona.
2. **Status desatualizado ao voltar para a Etapa 9** — faltava sincronizar antes de renderizar.
3. **Contador de pendências do professor ficava zerado** se ele fosse direto para a fila.
4. **Bloco de dados órfão** ao reconstruir a fonte HTML nesta rodada (ver acima).

Todos encontrados rodando o fluxo de ponta a ponta com testes automatizados, não apenas
inspecionando o código.

---

## Sobre os testes realizados

Meu ambiente de desenvolvimento não tem acesso de rede a domínios externos (nem ao Supabase
real, nem aos CDNs de bibliotecas). Para testar mesmo assim com rigor, uso um **simulador do
banco de dados** que imita a mesma interface do Supabase real, com os mesmos nomes de tabela e
coluna — conferido diretamente contra o schema real via consulta ao banco.

Com esse simulador, testei: o fluxo do aluno sozinho (todas as 9 etapas, os 4 painéis, galeria
de fotos e lightbox), o fluxo do professor sozinho, o fluxo completo entre os dois papéis (aluno
envia → professor aprova → aluno vê o resultado), a navegação entre os dois arquivos HTML, e os
comportamentos de fallback (sem internet, sem bibliotecas, foto ainda não enviada).

**O que isso não cobre:** a primeira vez que você abrir isso com o Supabase real e as bibliotecas
carregando de verdade via internet é, na prática, o primeiro teste verdadeiramente completo do
sistema.

---

## Como testar agora

1. Abra `index.html` (aluno) em uma aba e `professor.html` em outra, ambos com internet, na
   mesma pasta.
2. Na aba do aluno: escolha 7º A → Grupo 1, preencha a Etapa 1 em diante, gere o relatório na
   Etapa 9 (vai aparecer como um documento formatado) e clique em "Enviar para aprovação".
3. Clique em "Concluir" — deve voltar para a tela inicial, mostrando "Continuando como Grupo 1".
4. Na aba do professor: senha `admin@elvira`, aprove o envio na Fila de Aprovação.
5. Volte para a aba do aluno, continue a sessão e confira que o status mudou para "Aprovado" e o
   botão de PDF foi liberado.
6. Para testar as fotos: suba pelo menos uma imagem seguindo `COMO-ADICIONAR-FOTOS.md` e veja a
   miniatura aparecer no painel correspondente.

---

## O que ainda falta (da lista original da reunião)

- **Exportar/reimportar rascunho em PDF** (hoje só o relatório aprovado gera PDF; falta poder
  salvar o rascunho em qualquer ponto e reimportar para autopreencher — pode reaproveitar o
  motor de import de Ficha Técnica já construído).
- Mais refinamentos de UI/UX lúdica, se quiser ir além do que já foi implementado com as fotos e
  o lightbox.
