/**
 * lagamarData.js
 * -----------------------------------------------------------------------
 * Camada de dados do "Lagamar Investiga — Laboratório de Investigação Digital".
 *
 * REGRA DE OURO: nada aqui pode ser inventado. Cada registro carrega um
 * campo `provenance` que diz de onde ele vem:
 *
 *   "caderno"           -> está descrito no Caderno de Campo (metodologia,
 *                           espécies, fórmulas, locais, datas, procedimentos).
 *   "contexto-didatico"  -> conceito de apoio (ex: escala teórica de
 *                           salinidade 0–36 g/L) presente no material, mas
 *                           que não é uma medição.
 *   "exemplo"            -> valor numérico ilustrativo, usado só para o
 *                           dashboard não ficar vazio antes da coleta real.
 *                           NUNCA deve ser lido como resultado de campo.
 *   "nao-fornecido"      -> campo que existe na Ficha Técnica mas cujo
 *                           valor depende de o grupo ter coletado em campo.
 *
 * O professor pode (e deve) substituir os blocos marcados como "exemplo"
 * pelos dados reais coletados pelos alunos, usando o modo Professor da
 * aplicação (importar CSV/JSON) ou editando este arquivo diretamente.
 * -----------------------------------------------------------------------
 */

// ---------------------------------------------------------------------
// 1. METADADOS DO ESTUDO DE MEIO (documentados no Caderno de Campo)
// ---------------------------------------------------------------------
const STUDY_META = {
  title: "O Mundo do Trabalho: que naturezas e que sociedades estamos construindo?",
  location: "Lagamar Paulista (Iguape, Cananéia, Ilha do Cardoso, Quilombo do Mandira)",
  dates: "27 a 29 de maio de 2026",
  centralQuestion:
    "Como podemos investigar as relações entre trabalho, território e cotidiano no contexto do estudo de meio?",
  provenance: "caderno",
  source: "Caderno de Campo — Apresentação e Cronograma",
};

// Rodadas de análise pós-campo, conforme o cronograma do documento de
// Escrita de Projetos 2026 (3 rodadas ao longo do ano; cada uma cobre 3
// atividades do Caderno de Campo).
const ANALYSIS_ROUNDS = {
  1: { activities: [1, 3, 9], label: "Rodada 1 — Atividades 1, 3 e 9" },
  2: { activities: [4, 7, 8], label: "Rodada 2 — Atividades 4, 7 e 8" },
  3: { activities: [2, 5, 6], label: "Rodada 3 — Atividades 2, 5 e 6" },
  provenance: "caderno",
  source: "[7°ANO] Escrita de Projetos 2026 — cronograma pós-campo",
};

// Lista das 12 atividades de campo, para preencher o seletor da Etapa 1.
const FIELD_ACTIVITIES = [
  { number: 1, name: "Visita ao Morro do Espia" },
  { number: 2, name: "Visita ao Valo Grande" },
  { number: 3, name: "Caminhada no Centro Histórico" },
  { number: 4, name: "Caracterização Ambiental de Manguezal" },
  { number: 5, name: "Coleta e quantificação da salinidade (Mar Pequeno e Mar de Cananéia)" },
  { number: 6, name: "Coleta e análise de plâncton (Mar Pequeno e Mar de Cananéia)" },
  { number: 7, name: "Diagnóstico da Pesca Artesanal" },
  { number: 8, name: "Visita aos Ecossistemas Florestais Costeiros da Ilha do Cardoso" },
  { number: 9, name: "Oficina de Pesca Artesanal na Ilha do Cardoso" },
  { number: 10, name: "Prática de Pesca Artesanal na Praia do Pereirinha" },
  { number: 11, name: "Quilombo do Mandira" },
  { number: 12, name: "Estrutura de Depuração de Ostras (antiga COOPEROSTRA)" },
];

// ---------------------------------------------------------------------
// 2. PAINEL 1 — Espectro físico e sonoro
// ---------------------------------------------------------------------
// O Caderno de Campo NÃO contém valores medidos de dB, luminosidade ou
// temperatura (não há atividade de telemetria micro:bit documentada nos
// arquivos fornecidos). Os valores abaixo vêm da proposta conceitual
// (proposta-dashboard-manusia.md) e são exemplos didáticos.
const PANEL_FISICO_SONORO = {
  variables: ["ruido_db", "luminosidade_pct", "temperatura_c"],
  stations: [
    {
      id: "valo-grande",
      name: "Valo Grande (Iguape)",
      data: {
        ruido_db: { value: 112, unit: "dB", provenance: "exemplo" },
        luminosidade_pct: { value: 35, unit: "% (relativo)", provenance: "exemplo" },
        temperatura_c: { value: null, provenance: "nao-fornecido" },
      },
      note:
        "Valor de referência da proposta pedagógica — confirmar com registros originais de campo (telemetria não documentada no Caderno de Campo anexado).",
    },
    {
      id: "ilha-cardoso",
      name: "Ilha do Cardoso (Núcleo Perequê)",
      data: {
        ruido_db: { value: 42, unit: "dB", provenance: "exemplo" },
        luminosidade_pct: { value: 68, unit: "% (relativo)", provenance: "exemplo" },
        temperatura_c: { value: null, provenance: "nao-fornecido" },
      },
      note: "Valor de referência da proposta pedagógica — confirmar com os registros originais.",
    },
    {
      id: "quilombo-mandira",
      name: "Quilombo do Mandira",
      data: {
        ruido_db: { value: 45, unit: "dB", provenance: "exemplo" },
        luminosidade_pct: { value: 60, unit: "% (relativo)", provenance: "exemplo" },
        temperatura_c: { value: null, provenance: "nao-fornecido" },
      },
      note: "Valor de referência da proposta pedagógica — confirmar com os registros originais.",
    },
  ],
  provenance: "exemplo",
  source: "proposta-dashboard-manusia.md (dado conceitual, não medição de campo confirmada)",
};

// ---------------------------------------------------------------------
// 3. PAINEL 2 — Hidrodinâmica, salinidade e vida
// ---------------------------------------------------------------------
const PANEL_HIDRODINAMICA = {
  points: [
    {
      id: "ponto-a",
      name: "Ponto A — Mar Pequeno / Iguape (sob a Ponte Prefeito Laércio Ribeiro)",
      salinity: { value: null, unit: "g/L", provenance: "nao-fornecido" },
      salinityExample: { value: 3, unit: "g/L", provenance: "exemplo" },
      planktonNote:
        "O Caderno de Campo prevê desenho esquemático dos organismos observados (Atividade 6), não uma lista de espécies identificadas. Nenhuma espécie de plâncton está documentada nos arquivos anexados.",
      source: "Caderno de Campo — Atividade 5 (Coleta e quantificação da salinidade)",
      provenance: "caderno",
    },
    {
      id: "ponto-b",
      name: "Ponto B — Mar de Cananéia",
      salinity: { value: null, unit: "g/L", provenance: "nao-fornecido" },
      salinityExample: { value: 27, unit: "g/L", provenance: "exemplo" },
      planktonNote:
        "O Caderno de Campo prevê desenho esquemático dos organismos observados (Atividade 6), não uma lista de espécies identificadas. Nenhuma espécie de plâncton está documentada nos arquivos anexados.",
      source: "Caderno de Campo — Atividade 5 (Coleta e quantificação da salinidade)",
      provenance: "caderno",
    },
  ],
  theoreticalScale: {
    freshwater: { value: 0, label: "Água doce (rio)" },
    seawater: { value: 36, label: "Água do mar (oceano aberto)" },
    note: "Escala teórica apresentada no Caderno de Campo (Atividade 2) como referência conceitual, não como medição.",
    provenance: "contexto-didatico",
    source: "Caderno de Campo — Atividade 2 (Visita ao Valo Grande), item 3",
  },
};

// ---------------------------------------------------------------------
// 4. PAINEL 3 — Ecossistemas costeiros, solo e vegetação (Ilha do Cardoso)
// ---------------------------------------------------------------------
const PANEL_ECOSSISTEMAS = {
  biomes: [
    {
      id: "manguezal",
      name: "Manguezal",
      soil: {
        texture: { value: null, options: ["Arenosa", "Lamosa", "Terrosa"], provenance: "nao-fornecido" },
        moisture: { value: null, options: ["Encharcado", "Úmido", "Seco"], provenance: "nao-fornecido" },
      },
      penetrationDepthCm: { value: null, unit: "cm", provenance: "nao-fornecido" },
      penetrationExampleCm: { value: 45, unit: "cm", provenance: "exemplo" },
      dominantHeight: { value: null, unit: "m", provenance: "nao-fornecido" },
      adaptations: [
        {
          name: "Raízes-escoras (fúlcreas)",
          species: "Rhizophora mangle (mangue-vermelho)",
          function: "Sustentação",
          justification: "Solo instável",
          provenance: "caderno",
        },
        {
          name: "Pneumatóforos",
          species: "Avicennia schaueriana / Laguncularia racemosa (mangue-preto / mangue-branco)",
          function: "Respiração",
          justification: "Solo com baixa oxigenação",
          provenance: "caderno",
        },
      ],
      source: "Caderno de Campo — Atividade 8, itens 2 e 3.4",
    },
    {
      id: "restinga",
      name: "Restinga",
      soil: {
        texture: { value: null, options: ["Arenosa", "Lamosa", "Terrosa"], provenance: "nao-fornecido" },
        moisture: { value: null, options: ["Encharcado", "Úmido", "Seco"], provenance: "nao-fornecido" },
      },
      penetrationDepthCm: { value: null, unit: "cm", provenance: "nao-fornecido" },
      penetrationExampleCm: { value: 15, unit: "cm", provenance: "exemplo" },
      dominantHeight: { value: null, unit: "m", provenance: "nao-fornecido" },
      adaptations: [],
      source: "Caderno de Campo — Atividade 8, itens 2 e 3.4",
    },
    {
      id: "mata-atlantica",
      name: "Mata Atlântica de Encosta",
      soil: {
        texture: { value: null, options: ["Arenosa", "Lamosa", "Terrosa"], provenance: "nao-fornecido" },
        moisture: { value: null, options: ["Encharcado", "Úmido", "Seco"], provenance: "nao-fornecido" },
      },
      penetrationDepthCm: { value: null, unit: "cm", provenance: "nao-fornecido" },
      penetrationExampleCm: { value: 4, unit: "cm", provenance: "exemplo" },
      dominantHeight: { value: null, unit: "m", provenance: "nao-fornecido" },
      adaptations: [],
      source: "Caderno de Campo — Atividade 8, itens 2 e 3.4",
    },
  ],
  method: {
    penetration:
      "Vareta de bambu graduada (penetrômetro adaptado), empurrada perpendicularmente ao solo com o peso do corpo. Quanto maior a profundidade atingida, menor a resistência à penetração do solo.",
    dominantHeight:
      "Hd = média da altura das 5 maiores árvores do quadrante (5m x 5m), medidas pelo método do lápis e da pessoa de referência (Hp).",
    provenance: "caderno",
    source: "Caderno de Campo — Atividade 8, itens 2.2 e 3.1",
  },
};

// ---------------------------------------------------------------------
// 5. PAINEL 4 — Mundo do Trabalho no Lagamar
// ---------------------------------------------------------------------
const PANEL_TRABALHO = {
  fishing: {
    iguape: {
      name: "Pesca artesanal — Iguape",
      fields: [
        "Nome da espécie", "Técnica de pesca", "Nº de pessoas envolvidas",
        "Embarcação", "Local da pescaria", "Tempo médio de duração",
        "Valor de venda (R$/kg)", "Potência do motor (HP)", "Capacidade (kg)",
      ],
      values: { value: null, provenance: "nao-fornecido" },
      note: "Formulário 1 do Caderno de Campo — campos a preencher com dados de entrevistas reais em campo.",
      source: "Caderno de Campo — Atividade 7, Formulário 1",
      provenance: "caderno",
    },
    cananeia: {
      name: "Pesca artesanal — Cananéia",
      fields: [
        "Nome da espécie", "Técnica de pesca", "Nº de pessoas envolvidas",
        "Embarcação", "Local da pescaria", "Tempo médio de duração",
        "Valor de venda (R$/kg)", "Potência do motor (HP)", "Capacidade (kg)",
      ],
      values: { value: null, provenance: "nao-fornecido" },
      note: "Formulário 2 do Caderno de Campo — campos a preencher com dados de entrevistas reais em campo.",
      source: "Caderno de Campo — Atividade 7, Formulário 2",
      provenance: "caderno",
    },
  },
  mandira: {
    name: "Quilombo do Mandira — cultivo de ostras",
    facts: [
      { label: "Comunidade fundada", value: "Século XIX", provenance: "caderno" },
      { label: "Número de famílias (2026)", value: "25 famílias", provenance: "caderno" },
      { label: "Início da atividade de ostras", value: "Desde 1940", provenance: "caderno" },
      { label: "Fundação da Cooperostra", value: "1998 (para reduzir dependência de atravessadores)", provenance: "caderno" },
      { label: "Encerramento da cooperativa", value: "2016 (a estrutura de depuração segue em uso, sob gestão privada)", provenance: "caderno" },
    ],
    unfilledFields: [
      "Número de pessoas envolvidas na atividade", "Tempo trabalhado por dia",
      "Preço de venda ao consumidor final", "Preço de venda ao atravessador",
    ],
    source: "Caderno de Campo — Atividades 11 e 12, Formulários 4 e 5",
  },
};

// ---------------------------------------------------------------------
// 6. FICHA TÉCNICA — estrutura oficial (4 blocos, conforme o PDF original)
// ---------------------------------------------------------------------
// Observação de fidelidade ao documento: a Ficha Técnica oficial
// ("Ficha Técnica de Análise de Dados: LAGAMAR PAULISTA - 2026") tem
// QUATRO blocos, não cinco — o bloco de Síntese está integrado ao bloco
// "A Lupa Analítica e a Ponte" como item 5. Reproduzimos a divisão oficial
// abaixo, mantendo a numeração do documento original.
const FICHA_TECNICA_STRUCTURE = {
  provenance: "caderno",
  source: "Ficha Técnica de Análise de Dados — LAGAMAR PAULISTA - 2026",
  blocks: [
    {
      id: "triagem",
      number: 1,
      title: "Triagem e Memória de Campo",
      fields: [
        { id: "groupName", label: "Grupo", type: "text" },
        { id: "analysisRound", label: "Rodada de Análise atual", type: "select", options: [1, 2, 3] },
        { id: "activityNumber", label: "Número da Atividade no Caderno de Campo", type: "select-activity" },
        { id: "activityName", label: "Nome da Atividade", type: "text-auto" },
        { id: "scenario", label: "O Cenário (onde exatamente vocês estavam)", type: "textarea" },
        { id: "taskDivision", label: "Divisão de Tarefas no Campo", type: "textarea" },
        {
          id: "materials", label: "Inventário de Material disponível", type: "checklist",
          options: [
            "Textos e anotações escritas no caderno",
            "Fotografias",
            "Vídeos ou gravações de áudio",
            "Tabelas, contagens ou mapas preenchidos",
          ],
        },
        { id: "materialsAccessible", label: "Os arquivos estão salvos e acessíveis agora?", type: "boolean" },
      ],
    },
    {
      id: "limpo",
      number: 2,
      title: "Passando a Limpo",
      fields: [
        { id: "rawData", label: "Dados organizados (tabela, observações, citações, esquemas)", type: "textarea-table" },
      ],
      warning: "Organize o que foi observado sem transformar uma interpretação em dado.",
    },
    {
      id: "especialistas",
      number: 3,
      title: "O Balcão dos Especialistas",
      fields: [
        { id: "question1", label: "Dúvida técnica 1", type: "text" },
        { id: "question2", label: "Dúvida técnica 2", type: "text" },
        { id: "question3", label: "Dúvida técnica 3", type: "text" },
        { id: "consultancyNotes", label: "Anotações da Consultoria", type: "textarea" },
      ],
    },
    {
      id: "lupa",
      number: 4,
      title: "A Lupa Analítica e a Ponte",
      fields: [
        { id: "patterns", label: "Padrões e destaques", type: "textarea" },
        { id: "observations", label: "Observações diretamente visíveis nos dados", type: "textarea" },
        { id: "hypothesis", label: "Hipótese provisória", type: "textarea" },
        { id: "supportingEvidence", label: "Evidências que apoiam a hipótese", type: "textarea" },
        { id: "limitingEvidence", label: "Evidências que limitam ou não confirmam a hipótese", type: "textarea" },
        { id: "analyticalLimits", label: "Limites da análise", type: "textarea" },
        { id: "workBridge", label: "A Ponte com o Mundo do Trabalho", type: "textarea" },
        { id: "headline", label: "Grande constatação / manchete", type: "text" },
        { id: "newQuestion", label: "Nova questão motivadora", type: "textarea" },
        { id: "nextStep", label: "Próximo passo ou proposta do grupo", type: "textarea" },
      ],
    },
  ],
};

// ---------------------------------------------------------------------
// Exportação (agrupado num único objeto global para uso sem bundler)
// ---------------------------------------------------------------------
window.LAGAMAR_DATA = {
  STUDY_META,
  ANALYSIS_ROUNDS,
  FIELD_ACTIVITIES,
  PANEL_FISICO_SONORO,
  PANEL_HIDRODINAMICA,
  PANEL_ECOSSISTEMAS,
  PANEL_TRABALHO,
  FICHA_TECNICA_STRUCTURE,
};
