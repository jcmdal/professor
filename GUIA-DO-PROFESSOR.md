# Guia do Professor — Lagamar Investiga

## Como abrir

1. Baixe a pasta `lagamar-investiga` inteira (contém `index.html`, `style.css`, `app.js` e `data/lagamarData.js`).
2. Abra o arquivo `index.html` em qualquer navegador (Chrome, Firefox, Edge). Não precisa de internet, instalação ou servidor — é um site estático.
3. Depois do primeiro carregamento, a aplicação funciona offline. Os rascunhos dos alunos ficam salvos no `localStorage` do navegador usado, então **cada computador/navegador guarda seu próprio progresso** — não há sincronização entre máquinas.

## Estrutura dos arquivos

```
lagamar-investiga/
├── index.html          → estrutura da página e das 9 etapas
├── style.css            → identidade visual (paleta de estuário/manguezal)
├── app.js                → toda a lógica: navegação, painéis, evidências, relatório
└── data/
    └── lagamarData.js   → ÚNICO lugar onde os dados de conteúdo vivem
```

Você só precisa editar `data/lagamarData.js` para trocar os dados. Não é necessário mexer em `app.js` ou `index.html` para isso.

## O que já está confirmado vs. o que é só exemplo

Fizemos uma auditoria dos quatro arquivos que vocês enviaram (Ficha Técnica, Caderno de Campo, proposta conceitual e documento de Escrita de Projetos). Resultado:

**Documentado nos arquivos reais (aparece com selo "caderno" ou "campo"):**
- Cronograma da viagem, locais e datas.
- Método de coleta de salinidade, plâncton, resistência do solo e altura dominante.
- Espécies de mangue e suas adaptações morfológicas (raízes-escoras, pneumatóforos).
- Fatos sobre o Quilombo do Mandira e a Cooperostra (fundação em 1998, encerramento em 2016, 25 famílias, atividade desde 1940).
- As 3 rodadas de análise do ano e quais atividades cada uma cobre.

**NÃO documentado nos arquivos (aparece com selo "exemplo" ou "dado não disponível"):**
- Valores numéricos de ruído (dB), luminosidade, temperatura, salinidade exata, profundidade de penetração do solo e altura das árvores. O Caderno de Campo tem os *procedimentos* para coletar esses dados, mas as *tabelas de resultado* estão em branco — são os alunos que vão preenchê-las na viagem.
- Espécies de plâncton identificadas, valores de venda de pescado, potência de motor — idem: os formulários existem no caderno, mas sem valores preenchidos.

Por isso, todo valor numérico que aparece no dashboard vem rotulado como **exemplo didático** (cor de alerta) — nunca como se fosse um dado real. Isso é proposital: evita que os alunos leiam um número fictício como se fosse um resultado de campo.

## Como inserir os dados reais depois da viagem

Abra `data/lagamarData.js` em qualquer editor de texto. Cada bloco de dado tem esta forma:

```js
ruido_db: { value: 112, unit: "dB", provenance: "exemplo" }
```

Para transformar em dado real:

```js
ruido_db: { value: 89, unit: "dB", provenance: "campo" }
```

Basta trocar o número e mudar `"exemplo"` para `"campo"` (ou `"nao-fornecido"` para `"campo"`, se o campo estava vazio). A interface atualiza automaticamente o selo visual e some com o aviso de "valor de referência da proposta".

## Modo Professor

No topo da aplicação há um alternador **Estudante / Professor**. O modo Professor:
- Mostra o banner de contexto no topo.
- Não altera os dados sozinho — a edição de conteúdo continua sendo feita no arquivo `lagamarData.js`, não pela interface (isso foi uma escolha deliberada para o protótipo: evita que um aluno edite a base de dados sem querer).

## Limitações conhecidas deste protótipo

- **Sem importação de CSV pela interface.** O prompt original previa isso; para manter o protótipo simples e sem dependências externas, a via de atualização de dados é editar `lagamarData.js` diretamente. Se quiser importação de CSV pela interface, é um próximo passo de desenvolvimento.
- **Sem sincronização entre dispositivos.** Cada navegador salva localmente. Para trabalho em grupo, recomenda-se que o grupo use sempre o mesmo computador, ou exporte o `.json` ao final da aula e importe manualmente na aula seguinte (reabra o arquivo salvo, cole o conteúdo em `localStorage` via DevTools, ou aguarde uma futura versão com botão de importar).
- **Painel 4 (Mundo do Trabalho)** mostra os *campos* dos formulários de pesca (Atividade 7) mas não valores, porque nenhum valor está nos arquivos fornecidos. Depois da coleta em campo, adicione os dados reais em `PANEL_TRABALHO.fishing` no arquivo de dados.

## Teste de "tentativa de alucinação" já realizado

Antes da entrega, testamos deliberadamente pedir um dado inexistente (ex.: temperatura exata do Valo Grande, quilos de peixe pescados por um pescador específico). Em todos os casos, a aplicação mostra o selo **"Dado não disponível"** em vez de inventar um número. Você pode reproduzir esse teste com a turma como parte da Atividade da Aula 4 da proposta original (Banca de Validação de Alucinações).

## Suporte às 3 rodadas de análise do ano

O seletor de "Rodada de Análise" na Etapa 1 já reflete o cronograma do documento de Escrita de Projetos:
- Rodada 1 → Atividades 1, 3 e 9
- Rodada 2 → Atividades 4, 7 e 8
- Rodada 3 → Atividades 2, 5 e 6

Ao escolher a rodada, a aplicação apenas sugere (não obriga) qual atividade selecionar em seguida.

## Fidelidade à Ficha Técnica oficial

A Ficha Técnica original em PDF tem **4 blocos** (não 5, como uma versão preliminar da proposta sugeria): Triagem e Memória de Campo · Passando a Limpo · Balcão dos Especialistas · Lupa Analítica e a Ponte (que já inclui a Síntese). A jornada de 9 etapas do aplicativo é uma decomposição pedagógica desses 4 blocos — o relatório final gerado na Etapa 9 reagrupa tudo na ordem e nomenclatura exatas do PDF oficial.
