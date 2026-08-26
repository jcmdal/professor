/**
 * import/fichaTecnicaImport.js
 * -----------------------------------------------------------------------
 * Lê um arquivo PDF ou DOCX da Ficha Técnica preenchida à mão (ou digitada
 * em outro lugar) e tenta extrair os campos automaticamente, pré-populando
 * o formulário da investigação.
 *
 * Estratégia: a Ficha Técnica oficial tem rótulos de texto fixos e
 * previsíveis (ex: "● Grupo:", "○ Número da Atividade no Caderno de
 * Campo:", "A Grande Constatação (Manchete):"). Extraímos o texto bruto
 * do arquivo e localizamos, para cada campo, o texto entre um rótulo e o
 * próximo rótulo conhecido.
 *
 * IMPORTANTE — honestidade sobre os limites desta extração:
 * - Isto NÃO é OCR de letra manuscrita. Só funciona bem com texto
 *   digitado/datilografado no PDF ou DOCX.
 *   Se o arquivo for um PDF escaneado de um formulário preenchido à mão,
 *   o texto não será extraível e a aplicação deve avisar isso claramente
 *   (nunca inventar valores para compensar).
 * - Sempre que um campo não for localizado com confiança, ele é deixado
 *   em branco — jamais preenchido com um palpite. O aluno/professor
 *   confere e completa manualmente o que faltar.
 * - Todo campo importado é marcado como "importado do documento X" para
 *   rastreabilidade, e pode ser editado livremente depois.
 * -----------------------------------------------------------------------
 */
window.LagamarImport = (function () {
  "use strict";

  // Rótulos EXATOS conforme a Ficha Técnica de Análise de Dados —
  // LAGAMAR PAULISTA 2026 (páginas 1 e 2 do documento oficial).
  //
  // Dois tipos de campo:
  // - "direct": a resposta vem logo após o próprio rótulo até o próximo
  //   marcador (ex: "Dúvida 1: <resposta aqui>").
  // - "afterR": o rótulo é seguido do ENUNCIADO da pergunta (às vezes
  //   longo, em várias linhas) e só DEPOIS aparece "R:" com a resposta
  //   de fato. Nesse caso a resposta é o texto após o "R:" mais próximo
  //   que vem depois do rótulo — nunca o enunciado da pergunta em si.
  const FIELD_MARKERS = [
    { key: "groupName", markers: ["● Grupo:", "Grupo:"], mode: "direct" },
    { key: "analysisRound", markers: ["Rodada de Análise atual:"], mode: "direct" },
    { key: "activityNumber", markers: ["Número da Atividade no Caderno de Campo:"], mode: "direct" },
    { key: "activityName", markers: ["Nome da Atividade:"], mode: "direct" },
    { key: "scenario", markers: ["O Cenário:"], mode: "afterR" },
    { key: "taskDivision", markers: ["Divisão de Tarefas no Campo:"], mode: "afterR" },
    { key: "materialsBlock", markers: ["Inventário de Material:"], mode: "direct" },
    { key: "rawData", markers: ["Os Dados:"], mode: "direct", lowConfidenceAlways: true },
    { key: "question1", markers: ["Dúvida 1:"], mode: "direct" },
    { key: "question2", markers: ["Dúvida 2:"], mode: "direct" },
    { key: "question3", markers: ["Dúvida 3:"], mode: "direct" },
    { key: "consultancyNotes", markers: ["Anotações da Consultoria:"], mode: "direct" },
    { key: "patterns", markers: ["Padrões e Destaques:"], mode: "direct" },
    { key: "workBridge", markers: ["A Ponte Principal:"], mode: "direct" },
    { key: "headline", markers: ["A Grande Constatação (Manchete):"], mode: "direct" },
    { key: "newQuestion", markers: ["Semente para a Questão Motivadora:"], mode: "direct" },
  ];

  // Marcadores "de corte" — sempre que aparecem, encerram a captura do
  // campo anterior mesmo que não estejam na lista de campos (evitam que
  // um campo "vaze" para dentro de instruções da própria ficha).
  const SECTION_BREAKS = [
    "1. Triagem e Memória de Campo",
    "2. Passando a Limpo",
    "3. O Balcão dos Especialistas",
    "4. A Lupa Analítica e a Ponte",
    "5. Síntese para a Apresentação",
    "Instrução:",
  ];

  /** Extrai texto de um arquivo PDF usando pdf.js (carregado via CDN).
   *  IMPORTANTE: pdf.js precisa de um "worker" configurado antes do
   *  primeiro uso, ou a extração falha. Configuramos uma única vez,
   *  usando a mesma versão do script principal carregado no <head>. */
  let pdfWorkerConfigured = false;
  function ensurePdfWorkerConfigured() {
    if (pdfWorkerConfigured || !window.pdfjsLib) return;
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    pdfWorkerConfigured = true;
  }

  async function extractTextFromPdf(arrayBuffer) {
    if (!window.pdfjsLib) {
      throw new Error(
        "A biblioteca de leitura de PDF não carregou. Verifique sua conexão com a internet e recarregue a página."
      );
    }
    ensurePdfWorkerConfigured();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    return fullText;
  }

  /** Extrai texto de um arquivo DOCX usando mammoth.js (carregado via CDN). */
  async function extractTextFromDocx(arrayBuffer) {
    if (!window.mammoth) {
      throw new Error(
        "A biblioteca de leitura de DOCX não carregou. Verifique sua conexão com a internet e recarregue a página."
      );
    }
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  /** Remove bullets/marcadores soltos que sobraram no início/fim do texto
   *  capturado (ex: quando o campo está vazio no formulário original e o
   *  parser captura só o próximo "●" antes do próximo rótulo real). */
  function stripNoiseAndCheckEmpty(raw) {
    if (!raw) return null;
    const cleaned = raw
      .replace(/^[●○\-\s]+/, "")
      .replace(/[●○\-\s]+$/, "")
      .trim();
    if (!cleaned || /^[\s.,;:●○\-]*$/.test(cleaned) || cleaned.length < 2) return null;
    return cleaned;
  }

  /**
   * Localiza, para cada campo conhecido, o trecho de texto entre seu
   * rótulo e o próximo marcador (rótulo de outro campo ou quebra de
   * seção). Retorna { campo: valor_ou_null }.
   */
  function parseFieldsFromText(text) {
    // Normaliza quebras de linha e espaços múltiplos para facilitar a busca,
    // mas preserva o texto original para extrair os trechos com fidelidade.
    const normalized = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");

    // Lista plana de TODOS os marcadores conhecidos (campos + quebras de
    // seção + o marcador de resposta "R:"), cada um com sua posição no
    // texto — usada para descobrir onde um campo "termina" (no próximo
    // marcador que aparecer depois dele).
    const allMarkerStrings = [
      ...FIELD_MARKERS.flatMap((f) => f.markers),
      ...SECTION_BREAKS,
      "R:",
    ];
    allMarkerStrings.sort((a, b) => b.length - a.length);

    const positions = [];
    const seenSpans = [];
    allMarkerStrings.forEach((marker) => {
      let searchFrom = 0;
      while (true) {
        const idx = normalized.indexOf(marker, searchFrom);
        if (idx === -1) break;
        const overlaps = seenSpans.some((s) => idx < s.end && idx + marker.length > s.start);
        if (!overlaps) {
          positions.push({ marker, start: idx, end: idx + marker.length });
          seenSpans.push({ start: idx, end: idx + marker.length });
        }
        searchFrom = idx + marker.length;
      }
    });
    positions.sort((a, b) => a.start - b.start);

    const result = {};
    let confidence = {}; // 'alta' | 'baixa' por campo, para a UI sinalizar

    FIELD_MARKERS.forEach((field) => {
      let bestValue = null;
      for (const markerText of field.markers) {
        const hit = positions.find((p) => p.marker === markerText);
        if (!hit) continue;

        // Fim do campo: o próximo marcador de CAMPO ou QUEBRA DE SEÇÃO
        // depois deste rótulo (nunca um "R:", que é interno ao campo).
        const fieldEndMarkers = positions.filter((p) => p.start > hit.end && p.marker !== "R:");
        const hardEnd = fieldEndMarkers.length > 0 ? fieldEndMarkers[0].start : hit.end + 600;

        if (field.mode === "afterR") {
          // A resposta real do aluno vem depois do "R:" mais próximo,
          // não logo após o rótulo (que é seguido do enunciado da
          // pergunta). Sem "R:" localizado, deixamos em branco — nunca
          // arriscamos capturar a pergunta como se fosse resposta.
          const rMarker = positions.find(
            (p) => p.marker === "R:" && p.start > hit.end && p.start < hardEnd
          );
          if (rMarker) {
            const rawSlice = normalized.slice(rMarker.end, hardEnd);
            const cleaned = stripNoiseAndCheckEmpty(rawSlice.replace(/^[:\s]+/, ""));
            if (cleaned) {
              bestValue = cleaned;
              break;
            }
          }
        } else {
          const rawSlice = normalized.slice(hit.end, hardEnd);
          const cleaned = stripNoiseAndCheckEmpty(rawSlice.replace(/^[:\s]+/, ""));
          if (cleaned) {
            bestValue = cleaned;
            break; // usa o primeiro marcador da lista que deu resultado
          }
        }
      }
      result[field.key] = bestValue;
      confidence[field.key] = field.lowConfidenceAlways
        ? "baixa"
        : bestValue && bestValue.length > 2
        ? "alta"
        : "baixa";
    });

    return { fields: result, confidence };
  }

  /** Interpreta o bloco de "Rodada de Análise atual: ( ) 1 ( ) 2 ( ) 3" e tenta achar qual foi marcado. */
  function parseAnalysisRound(rawValue) {
    if (!rawValue) return null;
    // Formulários preenchidos à mão geralmente marcam com "X", "✓" ou
    // preenchem o parêntese: "(X) 2" ou "( ✓ ) 2". Buscamos o padrão
    // mais comum; se não achar com confiança, deixa em branco.
    const match = rawValue.match(/\(\s*[xX✓]\s*\)\s*(\d)/);
    if (match) return match[1];
    // fallback: se só um número aparece isolado no texto, usa ele.
    const numbers = rawValue.match(/\b([123])\b/g);
    if (numbers && numbers.length === 1) return numbers[0];
    return null; // ambíguo — melhor deixar em branco do que arriscar errado
  }

  /** Interpreta o bloco de materiais marcados com (X) para a checklist. */
  function parseMaterialsChecklist(rawValue) {
    if (!rawValue) return [];
    const options = [
      { label: "Textos e anotações escritas no caderno", pattern: /textos e anotações/i },
      { label: "Fotografias", pattern: /fotografias/i },
      { label: "Vídeos ou gravações de áudio", pattern: /vídeos ou gravações/i },
      { label: "Tabelas, contagens ou mapas preenchidos", pattern: /tabelas, contagens/i },
    ];
    const found = [];
    options.forEach((opt) => {
      // Procura o padrão precedido de uma marcação "(X)" nas proximidades.
      const re = new RegExp("\\([xX✓]\\)[^\\n]{0,10}" + opt.pattern.source, "i");
      if (re.test(rawValue)) found.push(opt.label);
    });
    return found;
  }

  /**
   * Função principal: recebe um File (do <input type="file">) e devolve
   * um objeto pronto para popular o formulário, junto com metadados de
   * confiança e uma lista de campos que não foram encontrados.
   */
  async function importFromFile(file) {
    const buffer = await file.arrayBuffer();
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isDocx =
      file.name.toLowerCase().endsWith(".docx") ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (!isPdf && !isDocx) {
      throw new Error("Formato não suportado. Envie um arquivo .pdf ou .docx.");
    }

    let rawText;
    try {
      rawText = isPdf ? await extractTextFromPdf(buffer) : await extractTextFromDocx(buffer);
    } catch (e) {
      // Erros que já vêm com mensagem clara e específica (ex: biblioteca
      // não carregada) devem ser propagados como estão — só mascaramos
      // com a mensagem genérica quando o erro vem da própria lib de
      // parsing falhando ao interpretar o conteúdo do arquivo.
      if (e.message.includes("não carregou")) throw e;
      throw new Error(
        "Não foi possível ler o texto do arquivo. Se for um PDF escaneado (foto do formulário preenchido à mão), esta importação automática não funciona — preencha manualmente."
      );
    }

    if (!rawText || rawText.trim().length < 20) {
      throw new Error(
        "O arquivo não parece ter texto extraível (pode ser um documento escaneado/imagem). Preencha manualmente."
      );
    }

    const { fields, confidence } = parseFieldsFromText(rawText);

    const parsedRound = parseAnalysisRound(fields.analysisRound);
    const parsedMaterials = parseMaterialsChecklist(fields.materialsBlock);

    const notFound = FIELD_MARKERS.filter((f) => !fields[f.key]).map((f) => f.key);

    return {
      sourceFileName: file.name,
      importedAt: new Date().toISOString(),
      fields: {
        groupName: fields.groupName || "",
        analysisRound: parsedRound || "",
        activityNumber: extractLeadingNumber(fields.activityNumber),
        activityName: fields.activityName || "",
        scenario: fields.scenario || "",
        taskDivision: fields.taskDivision || "",
        materials: parsedMaterials,
        rawData: fields.rawData || "",
        question1: fields.question1 || "",
        question2: fields.question2 || "",
        question3: fields.question3 || "",
        consultancyNotes: fields.consultancyNotes || "",
        patterns: fields.patterns || "",
        workBridge: fields.workBridge || "",
        headline: fields.headline || "",
        newQuestion: fields.newQuestion || "",
      },
      confidence,
      notFoundFields: notFound,
      rawTextPreview: rawText.slice(0, 400),
    };
  }

  function extractLeadingNumber(value) {
    if (!value) return "";
    const match = value.match(/\d+/);
    return match ? match[0] : "";
  }

  return { importFromFile };
})();
