# Guia do Professor — Lagamar Investiga

## Como abrir

1. Baixe a pasta `lagamar-investiga` inteira (contém `index.html`, `style.css`, `app.js` e `data/lagamarData.js`).
2. Abra o arquivo `index.html` em qualquer navegador (Chrome, Firefox, Edge). Não precisa de internet, instalação ou servidor — é um site estático.
3. Depois do primeiro carregamento, a aplicação funciona offline. Os rascunhos dos alunos ficam salvos no `localStorage` do navegador usado, então **cada computador/navegador guarda seu próprio progresso** — não há sincronização entre máquinas.

> **Nota técnica sobre a correção de 22/08:** numa versão anterior, se a pasta `data/` não fosse copiada junto com o `index.html` (por exemplo, ao extrair só um arquivo do .zip, ou copiar `index.html` sozinho para outro lugar), a aplicação carregava com o seletor de atividades vazio, a tabela da Etapa 3 travada, os painéis da Etapa 4 inacessíveis e a geração de relatório sem funcionar — todos os quatro sintomas tinham a mesma causa raiz: os dados nunca chegavam a carregar. Agora os dados também estão embutidos diretamente dentro do `index.html`, então a aplicação funciona mesmo que a pasta `data/` seja perdida. Se algum dia aparecer uma tela vermelha de erro ao abrir, ela vai indicar exatamente o que fazer.

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

No topo da aplicação há um alternador **Estudante / Professor**, e também um botão "Modo professor" na tela inicial. Os dois pedem uma senha:

**Senha: `admin@elvira`**

Atenção: isso é uma barreira simples de uso, combinada com a turma — não é segurança real, já que a senha fica visível para quem abrir o arquivo `app.js` num editor de texto. Não a reutilize em nenhum outro sistema que exija segurança de verdade.

O modo Professor:
- Mostra o banner de contexto no topo, com um botão **"Relatórios para aprovar"** e um contador de pendências.
- Não altera os dados de conteúdo sozinho — a edição da base (`lagamarData.js`) continua sendo feita fora da interface (evita que um aluno edite a base sem querer).

## Fluxo de aprovação de relatórios (novo)

O relatório de cada grupo passa por 4 estados, visíveis tanto para o aluno (Etapa 9) quanto para o professor (painel "Relatórios para aprovar"):

1. **Rascunho** — o grupo ainda está preenchendo, nada foi enviado.
2. **Aguardando aprovação** — o grupo clicou em "Enviar para aprovação do professor". O relatório entra na fila do professor.
3. **Aprovado** — o professor revisou e aprovou (pode incluir um comentário). Só a partir daqui o botão **"Baixar PDF final"** é liberado para o grupo.
4. **Revisão solicitada** — o professor pediu ajustes, com um comentário obrigatório explicando o quê. O grupo vê esse comentário na Etapa 9, ajusta o que for preciso nas etapas anteriores e clica em "Reenviar para aprovação".

**Como o professor aprova:**
1. Entre no Modo Professor (senha acima).
2. Clique em **"🗂️ Relatórios para aprovar"** no banner superior.
3. Cada relatório enviado aparece com grupo, atividade, manchete e o texto completo (expansível). Escreva um comentário (opcional em aprovação, obrigatório em revisão) e clique em **"✓ Aprovar"** ou **"Solicitar revisão"**.

**Importante — como isso persiste:** como a ferramenta não tem servidor, a fila de aprovação vive no `localStorage` do navegador. Isso funciona perfeitamente quando **professor e alunos usam o mesmo computador/navegador** (cenário típico de um laboratório de informática com poucas máquinas, ou quando o professor circula com um notebook). Se cada grupo usa uma máquina diferente da do professor, a fila de aprovação **não vai aparecer automaticamente** para o professor, porque cada navegador guarda sua própria cópia do `localStorage`. Nesse caso, o caminho mais simples é: o aluno exporta o `.json` (Etapa 9) e envia por outro meio (pendrive, e-mail, Classroom) para o professor abrir na própria máquina.

## Geração de PDF

Depois que o professor aprova, o botão **"Baixar PDF final"** abre uma nova aba com o relatório formatado para impressão e já aciona o diálogo de impressão do navegador. Para salvar como PDF: no diálogo de impressão, escolha o destino **"Salvar como PDF"** (essa opção já vem pronta na maioria dos navegadores — Chrome, Edge, Firefox). O PDF inclui um selo com a data de aprovação do professor.

Se o navegador bloquear a abertura da nova aba (bloqueador de pop-up), a aplicação avisa e pede para liberar pop-ups para aquele arquivo/site.

## Limitações conhecidas deste protótipo

- **Sem importação de CSV pela interface.** O prompt original previa isso; para manter o protótipo simples e sem dependências externas, a via de atualização de dados é editar `lagamarData.js` diretamente. Se quiser importação de CSV pela interface, é um próximo passo de desenvolvimento.
- **Sem sincronização entre dispositivos.** Cada navegador salva localmente — isso vale tanto para os rascunhos quanto para a fila de aprovação (veja a nota na seção acima). Para trabalho em grupo, recomenda-se que o grupo use sempre o mesmo computador, ou exporte o `.json` ao final da aula.
- **Painel 4 (Mundo do Trabalho)** mostra os *campos* dos formulários de pesca (Atividade 7) mas não valores, porque nenhum valor está nos arquivos fornecidos. Depois da coleta em campo, adicione os dados reais em `PANEL_TRABALHO.fishing` no arquivo de dados.
- **O PDF depende do recurso de impressão do navegador**, não de uma biblioteca de geração de PDF. Isso foi escolhido de propósito para manter a aplicação livre de dependências externas e funcionando offline — mas significa que a formatação final do PDF depende um pouco do navegador usado (Chrome e Edge costumam dar o resultado mais fiel ao layout).

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
