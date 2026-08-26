# Lagamar Investiga v2 — Status da Implementação

**Este é um entregável PARCIAL.** Você pediu 3 funcionalidades em ordem de prioridade — este pacote entrega a **#1 completa** (Painel do Professor + Comparação entre Grupos) e o **motor da #2 pronto** (import de PDF/DOCX), mas ainda não integrado à tela do aluno. A **#3** (estrutura de turmas/grupos como acesso do aluno) tem o banco pronto, mas falta a tela de seleção.

---

## ✅ O que está pronto e funcional

### 1. Banco de dados (Supabase)
- Projeto `lagamar-investiga` criado (região São Paulo, plano gratuito)
- Schema completo: `classes`, `groups`, `investigations`, `data_points` (com a separação **quantitativo × qualitativo** que a coordenação pediu), `table_rows`, `evidence_log`, `submissions`, `location_photos`
- Turmas e grupos já cadastrados: **7º A com 7 grupos**, **7º B com 6 grupos**, cada um com um código de acesso próprio
- Política de acesso configurada como você escolheu: aberta (sem login de aluno), com a senha do professor (`admin@elvira`) continuando como barreira só de interface — mesmo modelo do protótipo anterior
- Sem alertas de segurança pendentes (verificado via advisor automático do Supabase)

### 2. Painel do Professor (`professor.html`) — PRONTO
Três seções, acessíveis por uma barra lateral (visual bem distinto da experiência do aluno, como pedido):

- **Visão geral**: cartões de estatística (total, aguardando aprovação, aprovadas, em revisão, rascunhos) + tabela com todas as investigações de todos os grupos, com botão para ver detalhe de cada uma.
- **Fila de aprovação**: mesma lógica do protótipo anterior (aprovar / solicitar revisão com comentário obrigatório), agora lendo do banco compartilhado — ou seja, **funciona mesmo que cada grupo esteja em um computador diferente do professor**, o que resolve a limitação que o protótipo anterior tinha com o `localStorage`.
- **Comparar grupos**: você seleciona turma (opcional) + rodada + atividade, e a ferramenta monta uma grade lado a lado com todos os grupos que investigaram aquele tema — cenário, hipótese, evidências a favor/contra, ponte com o trabalho, manchete e nova questão. Campos não preenchidos aparecem claramente marcados como "Não preenchido", nunca inventados.

### 3. Motor de importação de Ficha Técnica em PDF/DOCX — PRONTO (motor), PENDENTE (tela)
- Testei a extração de texto contra o PDF real da Ficha Técnica oficial e mapeei os rótulos exatos do documento
- **Encontrei e corrigi um bug real durante o desenvolvimento**: a primeira versão do parser capturava a *pergunta* do formulário (ex: "O Cenário: Onde nós estávamos exatamente...") em vez da *resposta* do aluno. Corrigi distinguindo campos de resposta direta dos campos em que a resposta só aparece depois de um "R:" no documento.
- O parser nunca inventa valor para campo vazio ou ilegível — sempre marca como "não encontrado" e deixa para revisão manual.
- **O que falta**: uma tela/botão na interface do aluno para de fato fazer o upload e ver os campos pré-preenchidos antes de confirmar. O motor (`js/import/fichaTecnicaImport.js`) está pronto para ser plugado nisso.

---

## ⚠️ Importante: limitação de teste que encontrei (e como contornei)

O ambiente onde eu desenvolvo não tem acesso de rede a domínios externos como `supabase.co` ou CDNs (`cdnjs.cloudflare.com`, `jsdelivr.net`, `unpkg.com`) — nem via terminal, nem via navegador de teste. Isso significa que **não consegui testar esta v2 de ponta a ponta contra o banco real ou com as bibliotecas de PDF/DOCX carregadas de verdade**, ao contrário da v1 (que era 100% local e eu conseguia testar tudo com Puppeteer).

Para compensar isso com o máximo de rigor possível, eu:
1. Testei toda a lógica de UI do painel do professor com um **simulador (mock) do banco**, usando os mesmos dados e a mesma estrutura de colunas do banco real — 15 verificações automatizadas, todas passando.
2. Conferi **cada nome de coluna e cada relação de junção** usada no código contra o schema real do banco, via consulta direta — nenhuma divergência encontrada.
3. Testei a lógica pura do parser de PDF (sem a biblioteca de leitura em si, que roda só no navegador) com um arquivo de teste simulando uma ficha preenchida — inclusive um teste que só passou depois que corrigi o bug mencionado acima.
4. Revisei manualmente a sintaxe de configuração do `pdf.js` (worker) contra a documentação, e adicionei tratamento de erro claro caso as bibliotecas externas não carreguem.

**O que isso significa na prática para você:** o código está sólido e consistente com o banco, mas a primeira vez que você abrir o `professor.html` com internet de verdade é o primeiro teste "de verdade" contra o Supabase ao vivo. Recomendo testar com os 3 grupos de exemplo que já deixei cadastrados (veja abaixo) antes de usar com a turma real.

---

## Como testar agora

1. Abra `professor.html` em um navegador com internet.
2. Senha: `admin@elvira`
3. Você vai ver 3 investigações de teste já carregadas (Grupo 1, 2 e 3 da 7ºA, todos na Atividade 8 — Ecossistemas Florestais):
   - Grupo 1: aguardando aprovação
   - Grupo 2: já aprovado, com comentário
   - Grupo 3: ainda em rascunho (dados incompletos, de propósito, para testar como a comparação lida com campos vazios)
4. Teste a Fila de Aprovação (aprove ou peça revisão no Grupo 1).
5. Teste Comparar Grupos: selecione Rodada 2 + Atividade 8 e clique em Comparar.

**Antes de usar com a turma de verdade**, me avise para eu apagar esses 3 registros de teste do banco (ou posso fazer isso automaticamente na próxima etapa).

---

## O que ainda falta (próximos passos)

Seguindo sua ordem de prioridade, o que falta implementar:

1. **Conectar o import de PDF/DOCX à tela do aluno** — criar a tela de upload + pré-visualização dos campos extraídos + confirmação, usando o motor já pronto.
2. **Reescrever a tela do aluno (`index.html`) para usar Supabase** em vez de `localStorage` — atualmente a v1 ainda é 100% local; a v2 só tem o painel do professor.
3. **Tela inicial de seleção turma → grupo** (os cards de acesso que você pediu, usando os `access_code` já cadastrados no banco).
4. Pontos que ainda não comecei: fotos reais dos locais, exportar/reimportar rascunho em PDF, UI mais interativa voltada ao estudante.

Quer que eu continue por essa ordem, começando pela tela do aluno em Supabase (para o import de PDF ter onde "morar")?
