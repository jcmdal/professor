/**
 * app.js — Lagamar Investiga
 * Camada de interface e lógica de estado. Não contém dados de conteúdo —
 * estes vivem em data/lagamarData.js (window.LAGAMAR_DATA).
 */
(function () {
  "use strict";

  // Guarda defensiva: se por qualquer motivo os dados não estiverem
  // disponíveis (arquivo movido, bloqueio do navegador, etc.), mostramos
  // um aviso claro em vez de deixar a aplicação travar silenciosamente
  // com selects vazios e botões que não fazem nada.
  if (!window.LAGAMAR_DATA) {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.innerHTML =
        '<div style="max-width:640px;margin:80px auto;padding:28px;' +
        'font-family:system-ui,sans-serif;border:2px solid #9c4a3c;' +
        'border-radius:6px;background:#fdf3f1;color:#2f2a22;">' +
        '<h1 style="margin-top:0;color:#9c4a3c;font-size:1.3rem;">' +
        "Não foi possível carregar os dados da aplicação</h1>" +
        "<p>O arquivo <code>data/lagamarData.js</code> não foi encontrado " +
        "ou não pôde ser lido pelo navegador.</p>" +
        "<p><strong>Como corrigir:</strong></p>" +
        "<ol><li>Confirme que a pasta <code>data/</code> está no mesmo " +
        "diretório do arquivo <code>index.html</code> (ela precisa vir " +
        "junto, não pode ser apagada nem movida).</li>" +
        "<li>Se você extraiu de um .zip, extraia a pasta inteira — não " +
        "copie apenas o index.html.</li>" +
        "<li>Se o problema persistir, use a versão com dados embutidos " +
        "(este arquivo já deveria funcionar sem depender de " +
        "data/lagamarData.js — se está vendo esta mensagem mesmo assim, " +
        "avise o professor responsável).</li></ol></div>";
    });
    return;
  }

  const D = window.LAGAMAR_DATA;
  const STORAGE_KEY = "lagamar-investiga-state-v1";
  const SUBMISSIONS_KEY = "lagamar-investiga-submissions-v1";
  const TOTAL_STEPS = 9;

  // -----------------------------------------------------------------
  // Estado
  // -----------------------------------------------------------------
  const defaultState = () => ({
    groupName: "",
    analysisRound: "",
    activityNumber: "",
    activityName: "",
    scenario: "",
    taskDivision: "",
    materials: [],
    materialsAccessible: "",
    rawData: "",
    tableRows: [],
    questions: ["", "", ""],
    consultancyNotes: "",
    patterns: "",
    observations: "",
    hypothesis: "",
    supportingEvidence: "",
    limitingEvidence: "",
    analyticalLimits: "",
    workBridge: "",
    headline: "",
    newQuestion: "",
    nextStep: "",
    evidenceLog: [],
    currentStep: 1,
    teacherMode: false,
    // --- controle de submissão/aprovação ---
    submissionId: null,        // id fixo desta investigação, gerado ao enviar pela 1ª vez
    submissionStatus: "rascunho", // "rascunho" | "aguardando-aprovacao" | "aprovado" | "revisao-solicitada"
    submittedAt: null,
    teacherFeedback: "",       // comentário do professor ao solicitar revisão ou aprovar
    reviewedAt: null,
  });

  let state = loadState() || defaultState();
  let currentPanel = "fisico-sonoro";

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      console.warn("Não foi possível carregar rascunho salvo:", e);
      return null;
    }
  }

  function saveState(showToast) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      const el = document.getElementById("save-indicator");
      if (el) el.textContent = "Rascunho salvo · " + new Date().toLocaleTimeString("pt-BR");
      if (showToast) toast("Rascunho salvo.");
    } catch (e) {
      const el = document.getElementById("save-indicator");
      if (el) el.textContent = "Não foi possível salvar (armazenamento indisponível).";
    }
  }

  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  // -----------------------------------------------------------------
  // Caixa de submissões — relatórios enviados para aprovação do professor
  // -----------------------------------------------------------------
  // Funciona por localStorage compartilhado no mesmo navegador/computador
  // (cenário típico de laboratório de informática). Cada submissão guarda
  // uma cópia completa do estado no momento do envio, mais o md gerado,
  // para o professor conseguir revisar mesmo se o aluno seguir editando
  // seu rascunho depois de enviar.
  function loadSubmissions() {
    try {
      const raw = localStorage.getItem(SUBMISSIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Não foi possível carregar a caixa de submissões:", e);
      return [];
    }
  }

  function saveSubmissions(list) {
    try {
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      console.warn("Não foi possível salvar a caixa de submissões:", e);
      return false;
    }
  }

  function submitForApproval() {
    const missing = missingEssentials();
    if (missing.length > 0) {
      toast(`Antes de enviar: complete → ${missing[0].label}`);
      renderCompleteness();
      return false;
    }

    const md = buildReportMarkdown();
    const now = new Date().toISOString();
    if (!state.submissionId) {
      state.submissionId = "sub-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    }
    state.submissionStatus = "aguardando-aprovacao";
    state.submittedAt = now;
    state.teacherFeedback = "";
    state._lastReport = md;

    const submissions = loadSubmissions();
    const record = {
      id: state.submissionId,
      groupName: state.groupName,
      analysisRound: state.analysisRound,
      activityNumber: state.activityNumber,
      activityName: state.activityName,
      headline: state.headline,
      submittedAt: now,
      status: "aguardando-aprovacao",
      teacherFeedback: "",
      reviewedAt: null,
      reportMarkdown: md,
      fullState: JSON.parse(JSON.stringify(state)), // snapshot completo, útil ao professor
    };
    const existingIndex = submissions.findIndex((s) => s.id === state.submissionId);
    if (existingIndex >= 0) {
      // Reenvio após revisão solicitada: atualiza o registro existente.
      submissions[existingIndex] = record;
    } else {
      submissions.push(record);
    }
    saveSubmissions(submissions);
    saveState(false);
    return true;
  }

  function getMySubmissionStatus() {
    if (!state.submissionId) return null;
    const submissions = loadSubmissions();
    return submissions.find((s) => s.id === state.submissionId) || null;
  }

  // Sincroniza o status local (rascunho do aluno) com o que está na caixa
  // de submissões — importante porque o professor aprova mexendo na
  // caixa de submissões, não no rascunho do aluno diretamente.
  function syncSubmissionStatus() {
    if (!state.submissionId) return;
    const record = getMySubmissionStatus();
    if (!record) return;
    if (record.status !== state.submissionStatus || record.teacherFeedback !== state.teacherFeedback) {
      state.submissionStatus = record.status;
      state.teacherFeedback = record.teacherFeedback || "";
      state.reviewedAt = record.reviewedAt || null;
      saveState(false);
    }
  }

  function teacherSetSubmissionStatus(id, status, feedback) {
    const submissions = loadSubmissions();
    const idx = submissions.findIndex((s) => s.id === id);
    if (idx < 0) return;
    submissions[idx].status = status;
    submissions[idx].teacherFeedback = feedback || "";
    submissions[idx].reviewedAt = new Date().toISOString();
    saveSubmissions(submissions);
  }

  // -----------------------------------------------------------------
  // Badges de procedência
  // -----------------------------------------------------------------
  function provenanceBadge(prov) {
    const map = {
      campo: ["DADO DE CAMPO", "badge-campo"],
      caderno: ["CADERNO DE CAMPO", "badge-caderno"],
      "contexto-didatico": ["CONTEXTO DIDÁTICO", "badge-contexto"],
      exemplo: ["EXEMPLO DIDÁTICO", "badge-exemplo"],
      "nao-fornecido": ["DADO NÃO DISPONÍVEL", "badge-ausente"],
    };
    const [label, cls] = map[prov] || map["nao-fornecido"];
    return `<span class="badge ${cls}">${label}</span>`;
  }

  // -----------------------------------------------------------------
  // Acesso ao modo professor (protegido por senha simples)
  // -----------------------------------------------------------------
  // Proteção leve para desencorajar alunos de entrar no modo professor
  // por engano/curiosidade. Não é segurança real (a senha fica visível
  // no código-fonte do app.js) — é só uma barreira de uso combinada com
  // a turma, adequada para um protótipo de sala de aula sem login.
  const TEACHER_PASSWORD = "admin@elvira";

  function requestTeacherAccess(onSuccess) {
    const attempt = window.prompt("Digite a senha do modo professor:");
    if (attempt === null) return; // usuário cancelou
    if (attempt === TEACHER_PASSWORD) {
      onSuccess();
    } else {
      toast("Senha incorreta. Modo professor não liberado.");
    }
  }

  // -----------------------------------------------------------------
  // Tela inicial / navegação de telas
  // -----------------------------------------------------------------
  function initHero() {
    document.getElementById("btn-start").addEventListener("click", () => enterApp());
    document.getElementById("btn-continue").addEventListener("click", () => enterApp());
    document.getElementById("btn-teacher-mode").addEventListener("click", () => {
      requestTeacherAccess(() => {
        state.teacherMode = true;
        enterApp();
      });
    });

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      document.getElementById("btn-continue").style.display = "inline-flex";
    }
  }

  function enterApp() {
    document.getElementById("hero").classList.add("hidden");
    document.getElementById("app-shell").classList.add("active");
    document.getElementById("teacher-banner").style.display = state.teacherMode ? "flex" : "none";
    setModeToggle(state.teacherMode);
    renderAll();
  }

  function setModeToggle(isTeacher) {
    document.getElementById("toggle-student").classList.toggle("active", !isTeacher);
    document.getElementById("toggle-teacher").classList.toggle("active", isTeacher);
    document.getElementById("teacher-banner").style.display = isTeacher ? "flex" : "none";
    if (isTeacher) updatePendingCount();
  }

  // -----------------------------------------------------------------
  // Progress rail + navegação de etapas
  // -----------------------------------------------------------------
  const STEP_LABELS = [
    "Identificação", "Memória", "Passando a limpo", "Laboratório",
    "Especialistas", "Lupa analítica", "Ponte c/ trabalho", "Síntese", "Revisão",
  ];

  function renderProgressRail() {
    const rail = document.getElementById("progress-rail");
    rail.innerHTML = "";
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const btn = document.createElement("button");
      btn.className = "progress-step" + (i === state.currentStep ? " current" : i < state.currentStep ? " done" : "");
      btn.textContent = `${i}. ${STEP_LABELS[i - 1]}`;
      btn.addEventListener("click", () => goToStep(i));
      rail.appendChild(btn);
    }
  }

  function goToStep(n) {
    state.currentStep = Math.min(Math.max(n, 1), TOTAL_STEPS);
    document.querySelectorAll(".step-panel").forEach((p) => {
      p.style.display = Number(p.dataset.step) === state.currentStep ? "block" : "none";
    });
    renderProgressRail();
    document.getElementById("btn-prev-step").disabled = state.currentStep === 1;
    document.getElementById("btn-next-step").textContent =
      state.currentStep === TOTAL_STEPS ? "Concluir ✓" : "Avançar →";
    if (state.currentStep === 9) {
      renderCompleteness();
      renderSubmissionPanel();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    saveState(false);
  }

  // -----------------------------------------------------------------
  // Etapa 1 — Identificação
  // -----------------------------------------------------------------
  function initStep1() {
    const activitySelect = document.getElementById("f-activityNumber");
    D.FIELD_ACTIVITIES.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.number;
      opt.textContent = `${a.number} — ${a.name}`;
      activitySelect.appendChild(opt);
    });

    bindText("f-groupName", "groupName");
    bindSelect("f-analysisRound", "analysisRound", (val) => {
      // Ao trocar a rodada, sugere (mas não força) atividades daquela rodada
      const round = D.ANALYSIS_ROUNDS[val];
      if (round) {
        toast(`Dica: a ${round.label.toLowerCase()} é sugerida para esta rodada.`);
      }
    });
    bindSelect("f-activityNumber", "activityNumber", (val) => {
      const found = D.FIELD_ACTIVITIES.find((a) => String(a.number) === String(val));
      state.activityName = found ? found.name : "";
      document.getElementById("f-activityName").value = state.activityName;
      updateTopbarMeta();
      saveState(false);
    });
  }

  // -----------------------------------------------------------------
  // Etapa 2 — Memória de campo
  // -----------------------------------------------------------------
  function initStep2() {
    bindText("f-scenario", "scenario");
    bindText("f-taskDivision", "taskDivision");

    document.querySelectorAll("#materials-checklist input").forEach((cb) => {
      cb.addEventListener("change", () => {
        const checked = Array.from(document.querySelectorAll("#materials-checklist input:checked")).map((c) => c.value);
        state.materials = checked;
        saveState(false);
      });
    });

    document.querySelectorAll('input[name="materialsAccessible"]').forEach((r) => {
      r.addEventListener("change", (e) => {
        state.materialsAccessible = e.target.value;
        saveState(false);
      });
    });
  }

  function hydrateStep2() {
    document.querySelectorAll("#materials-checklist input").forEach((cb) => {
      cb.checked = state.materials.includes(cb.value);
    });
    document.querySelectorAll('input[name="materialsAccessible"]').forEach((r) => {
      r.checked = r.value === state.materialsAccessible;
    });
  }

  // -----------------------------------------------------------------
  // Etapa 3 — Passando a limpo (tabela editável)
  // -----------------------------------------------------------------
  const TABLE_COLUMNS = ["Local", "Variável", "Valor", "Unidade", "Observação"];

  function initStep3() {
    bindText("f-rawData", "rawData");
    document.getElementById("btn-add-row").addEventListener("click", () => {
      state.tableRows.push(TABLE_COLUMNS.map(() => ""));
      renderEditableTable();
      saveState(false);
    });
    renderEditableTable();
  }

  function renderEditableTable() {
    const wrap = document.getElementById("editable-table-wrap");
    if (state.tableRows.length === 0) {
      wrap.innerHTML = '<p class="data-missing">Nenhuma linha adicionada. Clique em "Adicionar linha" para começar a tabela do grupo.</p>';
      return;
    }
    let html = '<table class="data-table"><thead><tr>';
    TABLE_COLUMNS.forEach((c) => (html += `<th>${c}</th>`));
    html += "<th></th></tr></thead><tbody>";
    state.tableRows.forEach((row, ri) => {
      html += "<tr>";
      row.forEach((cell, ci) => {
        html += `<td><input type="text" data-row="${ri}" data-col="${ci}" value="${escapeHtml(cell)}" style="border:none; background:transparent; padding:4px; width:100%;" /></td>`;
      });
      html += `<td><button class="icon-btn" data-remove-row="${ri}" type="button" style="padding:4px 8px;">✕</button></td>`;
      html += "</tr>";
    });
    html += "</tbody></table>";
    wrap.innerHTML = html;

    wrap.querySelectorAll("input[data-row]").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const r = Number(e.target.dataset.row);
        const c = Number(e.target.dataset.col);
        state.tableRows[r][c] = e.target.value;
        saveState(false);
      });
    });
    wrap.querySelectorAll("[data-remove-row]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.tableRows.splice(Number(btn.dataset.removeRow), 1);
        renderEditableTable();
        saveState(false);
      });
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  // -----------------------------------------------------------------
  // Etapa 4 — Painéis investigativos
  // -----------------------------------------------------------------
  function initStep4() {
    document.querySelectorAll(".panel-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".panel-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        currentPanel = tab.dataset.panel;
        renderPanelContent();
      });
    });
    renderPanelContent();
  }

  function renderPanelContent() {
    const el = document.getElementById("panel-content");
    if (currentPanel === "fisico-sonoro") return (el.innerHTML = "", renderPanelFisicoSonoro(el));
    if (currentPanel === "hidrodinamica") return (el.innerHTML = "", renderPanelHidrodinamica(el));
    if (currentPanel === "ecossistemas") return (el.innerHTML = "", renderPanelEcossistemas(el));
    if (currentPanel === "trabalho") return (el.innerHTML = "", renderPanelTrabalho(el));
  }

  // --- Painel 1 ---
  let selectedStations = ["valo-grande", "ilha-cardoso"];
  function renderPanelFisicoSonoro(el) {
    const P = D.PANEL_FISICO_SONORO;
    let html = `
      <div class="card">
        <h3>O ambiente está em equilíbrio?</h3>
        <p class="card-sub">Selecione estações para comparar ruído (dB), luminosidade e temperatura. ${provenanceBadge(P.provenance)}</p>
        <p class="provenance-note">Fonte: ${P.source}</p>
        <div class="station-grid" id="station-grid"></div>
        <h4 style="margin-top:20px; font-family:var(--font-display);">Comparação — Ruído (dB)</h4>
        <div class="bar-chart" id="bar-chart-noise"></div>
        <details style="margin-top:14px;"><summary>Ver tabela alternativa</summary><div id="alt-table-1"></div></details>
        <ul class="socratic-list">
          <li>O que você observa primeiro na curva ou na tabela?</li>
          <li>Qual estação apresenta maior variação?</li>
          <li>Que relação você imagina entre cobertura vegetal, urbanização, sedimentos, luz, ruído e temperatura?</li>
          <li>Qual dado adicional seria necessário para sustentar uma explicação mais forte?</li>
        </ul>
        <div class="evidence-editor">
          <textarea placeholder="Sua interpretação sobre esta comparação..." id="ev-note-1"></textarea>
          <button class="btn-secondary" id="btn-add-ev-1" type="button">+ Adicionar evidência</button>
        </div>
      </div>`;
    el.innerHTML = html;

    const grid = document.getElementById("station-grid");
    P.stations.forEach((s) => {
      const card = document.createElement("div");
      card.className = "station-card" + (selectedStations.includes(s.id) ? " selected" : "");
      card.innerHTML = `<h4>${s.name}</h4>
        <div class="metric-row"><span>Ruído</span><span class="metric-value">${fmtMetric(s.data.ruido_db)}</span></div>
        <div class="metric-row"><span>Luminosidade</span><span class="metric-value">${fmtMetric(s.data.luminosidade_pct)}</span></div>
        <div class="metric-row"><span>Temperatura</span><span class="metric-value">${fmtMetric(s.data.temperatura_c)}</span></div>
        <p class="provenance-note">${s.note}</p>`;
      card.addEventListener("click", () => {
        if (selectedStations.includes(s.id)) {
          selectedStations = selectedStations.filter((x) => x !== s.id);
        } else if (selectedStations.length < 3) {
          selectedStations.push(s.id);
        }
        renderPanelFisicoSonoro(el);
      });
      grid.appendChild(card);
    });

    renderBarChart(
      "bar-chart-noise",
      P.stations.filter((s) => selectedStations.includes(s.id)),
      (s) => s.data.ruido_db,
      (s) => s.name
    );
    renderAltTable("alt-table-1", ["Estação", "Ruído (dB)", "Luminosidade", "Temperatura", "Procedência"],
      P.stations.map((s) => [s.name, fmtMetric(s.data.ruido_db), fmtMetric(s.data.luminosidade_pct), fmtMetric(s.data.temperatura_c), s.data.ruido_db.provenance])
    );

    document.getElementById("btn-add-ev-1").addEventListener("click", () => {
      addEvidence("fisico-sonoro", `Estações: ${selectedStations.join(", ")}`, document.getElementById("ev-note-1").value);
    });
  }

  function fmtMetric(m) {
    if (!m || m.value === null || m.value === undefined) return "—";
    return `${m.value} ${m.unit || ""}`.trim();
  }

  function renderBarChart(elId, items, getMetric, getLabel) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (items.length === 0) {
      el.innerHTML = '<p class="data-missing">Selecione ao menos uma estação/local para comparar.</p>';
      return;
    }
    const max = Math.max(...items.map((i) => getMetric(i).value || 0), 1);
    el.innerHTML = items
      .map((i) => {
        const m = getMetric(i);
        const hasValue = m && m.value !== null && m.value !== undefined;
        const h = hasValue ? Math.max((m.value / max) * 100, 4) : 0;
        return `<div class="bar-col">
          <span class="bar-value">${hasValue ? m.value : "s/ dado"}</span>
          <div class="bar" style="height:${h}%;" role="img" aria-label="${getLabel(i)}: ${hasValue ? m.value + (m.unit || "") : "dado não disponível"}"></div>
          <span class="bar-label">${getLabel(i)}</span>
        </div>`;
      })
      .join("");
  }

  function renderAltTable(elId, headers, rows) {
    const el = document.getElementById(elId);
    if (!el) return;
    let html = '<table class="data-table"><thead><tr>' + headers.map((h) => `<th>${h}</th>`).join("") + "</tr></thead><tbody>";
    rows.forEach((r) => {
      html += "<tr>" + r.map((c) => `<td>${c}</td>`).join("") + "</tr>";
    });
    html += "</tbody></table>";
    el.innerHTML = html;
  }

  // --- Painel 2 ---
  function renderPanelHidrodinamica(el) {
    const P = D.PANEL_HIDRODINAMICA;
    let html = `
      <div class="card">
        <h3>Que água circula por aqui?</h3>
        <p class="card-sub">Compare o Ponto A (Iguape) e o Ponto B (Cananéia). ${provenanceBadge("caderno")}</p>
        <div class="station-grid">`;
    P.points.forEach((pt) => {
      const hasReal = pt.salinity.value !== null;
      const displayVal = hasReal ? pt.salinity : pt.salinityExample;
      html += `<div class="station-card">
        <h4>${pt.name}</h4>
        <div class="metric-row"><span>Salinidade</span><span class="metric-value">${fmtMetric(displayVal)}</span></div>
        <p>${provenanceBadge(hasReal ? "campo" : "exemplo")}</p>
        <p class="provenance-note">${pt.planktonNote}</p>
        <p class="provenance-note">Fonte: ${pt.source}</p>
      </div>`;
    });
    html += `</div>
      <h4 style="margin-top:20px; font-family:var(--font-display);">Escala teórica de referência (${provenanceBadge("contexto-didatico")})</h4>
      <div class="bar-chart">
        <div class="bar-col"><span class="bar-value">0 g/L</span><div class="bar" style="height:6%;"></div><span class="bar-label">Água doce</span></div>
        <div class="bar-col"><span class="bar-value">36 g/L</span><div class="bar" style="height:100%;"></div><span class="bar-label">Água do mar</span></div>
      </div>
      <p class="provenance-note">${P.theoreticalScale.note} Fonte: ${P.theoreticalScale.source}</p>
      <div class="warning-box">O controle de "proximidade do Valo Grande", se usado em sala, é uma <strong>simulação didática</strong> — não uma medição contínua.</div>
      <ul class="socratic-list">
        <li>O que muda entre os pontos A e B?</li>
        <li>Qual variável apresenta a diferença mais evidente?</li>
        <li>Essa comparação mostra uma causa, uma associação ou apenas uma diferença entre locais?</li>
        <li>Que outras coletas seriam necessárias para generalizar o resultado?</li>
      </ul>
      <div class="evidence-editor">
        <textarea placeholder="Sua interpretação sobre esta comparação..." id="ev-note-2"></textarea>
        <button class="btn-secondary" id="btn-add-ev-2" type="button">+ Adicionar evidência</button>
      </div>
    </div>`;
    el.innerHTML = html;
    document.getElementById("btn-add-ev-2").addEventListener("click", () => {
      addEvidence("hidrodinamica", "Comparação Ponto A x Ponto B", document.getElementById("ev-note-2").value);
    });
  }

  // --- Painel 3 ---
  let selectedBiome = "manguezal";
  function renderPanelEcossistemas(el) {
    const P = D.PANEL_ECOSSISTEMAS;
    let tabs = P.biomes.map((b) => `<button class="panel-tab ${b.id === selectedBiome ? "active" : ""}" data-biome="${b.id}" type="button">${b.name}</button>`).join("");
    const biome = P.biomes.find((b) => b.id === selectedBiome);

    let html = `
      <div class="card">
        <h3>Como a vida se adapta ao lugar?</h3>
        <p class="card-sub">Alterne entre manguezal, restinga e Mata Atlântica de encosta.</p>
        <div class="panel-tabs">${tabs}</div>
        <div class="two-col">
          <div>
            <h4 style="font-family:var(--font-display);">Solo</h4>
            <div class="metric-row"><span>Textura</span><span class="metric-value">${biome.soil.texture.value || "Dado não disponível"}</span></div>
            <div class="metric-row"><span>Umidade</span><span class="metric-value">${biome.soil.moisture.value || "Dado não disponível"}</span></div>
            <div class="metric-row"><span>Resistência à penetração</span><span class="metric-value">${biome.penetrationDepthCm.value !== null ? biome.penetrationDepthCm.value + " cm" : biome.penetrationExampleCm.value + " cm"}</span></div>
            <p>${provenanceBadge(biome.penetrationDepthCm.value !== null ? "campo" : "exemplo")}</p>
            <div class="metric-row"><span>Altura Dominante (Hd)</span><span class="metric-value">${biome.dominantHeight.value !== null ? biome.dominantHeight.value + " m" : "Dado não disponível"}</span></div>
            <p>${provenanceBadge("nao-fornecido")}</p>
          </div>
          <div>
            <h4 style="font-family:var(--font-display);">Adaptações morfológicas registradas</h4>
            ${biome.adaptations.length === 0 ? '<p class="data-missing">Nenhuma adaptação morfológica específica documentada para este bioma nos arquivos fornecidos.</p>' : biome.adaptations.map((a) => `
              <div class="station-card" style="margin-bottom:8px;">
                <strong>${a.name}</strong> <span class="provenance-note">(${a.species})</span>
                <p class="provenance-note">Função: ${a.function} — ${a.justification}</p>
                ${provenanceBadge(a.provenance)}
              </div>`).join("")}
          </div>
        </div>
        <p class="provenance-note" style="margin-top:12px;">Fonte: ${biome.source}. Método: ${P.method.penetration}</p>
        <ul class="socratic-list">
          <li>Qual ambiente apresenta maior ou menor resistência à penetração?</li>
          <li>Como umidade e textura podem ajudar a interpretar a sustentação das plantas?</li>
          <li>O que é dado observado e o que é explicação do grupo?</li>
        </ul>
        <div class="evidence-editor">
          <textarea placeholder="Sua interpretação sobre este bioma..." id="ev-note-3"></textarea>
          <button class="btn-secondary" id="btn-add-ev-3" type="button">+ Adicionar evidência</button>
        </div>
      </div>`;
    el.innerHTML = html;

    el.querySelectorAll("[data-biome]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedBiome = btn.dataset.biome;
        renderPanelEcossistemas(el);
      });
    });
    document.getElementById("btn-add-ev-3").addEventListener("click", () => {
      addEvidence("ecossistemas", `Bioma: ${biome.name}`, document.getElementById("ev-note-3").value);
    });
  }

  // --- Painel 4 ---
  function renderPanelTrabalho(el) {
    const P = D.PANEL_TRABALHO;
    let html = `
      <div class="card">
        <h3>Como ambiente e trabalho se transformam juntos?</h3>
        <p class="card-sub">Compare a pesca artesanal em Iguape e Cananéia, e as práticas do Quilombo do Mandira.</p>
        <div class="two-col">
          <div class="station-card">
            <h4>${P.fishing.iguape.name}</h4>
            <p class="data-missing">${P.fishing.iguape.note}</p>
            <p class="provenance-note">Campos do formulário: ${P.fishing.iguape.fields.join(", ")}</p>
            ${provenanceBadge("nao-fornecido")}
          </div>
          <div class="station-card">
            <h4>${P.fishing.cananeia.name}</h4>
            <p class="data-missing">${P.fishing.cananeia.note}</p>
            <p class="provenance-note">Campos do formulário: ${P.fishing.cananeia.fields.join(", ")}</p>
            ${provenanceBadge("nao-fornecido")}
          </div>
        </div>
        <h4 style="margin-top:20px; font-family:var(--font-display);">${P.mandira.name}</h4>
        <table class="data-table">
          <thead><tr><th>Informação</th><th>Registro</th><th>Procedência</th></tr></thead>
          <tbody>
            ${P.mandira.facts.map((f) => `<tr><td>${f.label}</td><td>${f.value}</td><td>${provenanceBadge(f.provenance)}</td></tr>`).join("")}
          </tbody>
        </table>
        <p class="provenance-note" style="margin-top:10px;">Campos ainda não preenchidos neste protótipo: ${P.mandira.unfilledFields.join(", ")}. ${provenanceBadge("nao-fornecido")}</p>
        <p class="provenance-note">Fonte: ${P.mandira.source}</p>
        <div class="warning-box">Não há pares numéricos suficientes documentados para calcular uma correlação estatística entre técnica de pesca, potência do motor e valor de venda. Um gráfico de dispersão aqui seria uma correlação artificial — por isso mostramos apenas tabelas qualitativas.</div>
        <ul class="socratic-list">
          <li>Que diferenças aparecem entre as formas de trabalho observadas?</li>
          <li>Como tecnologia, organização coletiva e saberes tradicionais aparecem na investigação?</li>
          <li>Quem realiza o trabalho e quem se beneficia dele, de acordo com os registros?</li>
        </ul>
        <div class="evidence-editor">
          <textarea placeholder="Sua interpretação sobre o Mundo do Trabalho no Lagamar..." id="ev-note-4"></textarea>
          <button class="btn-secondary" id="btn-add-ev-4" type="button">+ Adicionar evidência</button>
        </div>
      </div>`;
    el.innerHTML = html;
    document.getElementById("btn-add-ev-4").addEventListener("click", () => {
      addEvidence("trabalho", "Mundo do Trabalho — Iguape/Cananéia/Mandira", document.getElementById("ev-note-4").value);
    });
  }

  // -----------------------------------------------------------------
  // Caderno de Evidências
  // -----------------------------------------------------------------
  function addEvidence(panel, reference, note) {
    if (!note || !note.trim()) {
      toast("Escreva sua interpretação antes de adicionar a evidência.");
      return;
    }
    state.evidenceLog.push({
      id: "ev-" + Date.now(),
      panel,
      reference,
      studentNote: note.trim(),
      timestamp: new Date().toISOString(),
    });
    saveState(false);
    renderEvidenceDrawer();
    toast("Evidência adicionada ao Caderno.");
  }

  function renderEvidenceDrawer() {
    document.getElementById("evidence-count").textContent = state.evidenceLog.length;
    const list = document.getElementById("evidence-list");
    if (state.evidenceLog.length === 0) {
      list.innerHTML = '<p class="hint">Nenhuma evidência registrada ainda. Ao explorar os painéis, clique em "Adicionar evidência" para guardar aqui uma observação, um dado ou uma comparação — sempre com sua própria interpretação.</p>';
      return;
    }
    list.innerHTML = state.evidenceLog
      .map(
        (ev) => `<div class="evidence-item">
          <button class="ev-remove" data-remove-ev="${ev.id}" type="button" aria-label="Remover evidência">✕</button>
          <div class="ev-meta">${ev.panel} · ${ev.reference}</div>
          <div>${escapeHtml(ev.studentNote)}</div>
        </div>`
      )
      .join("");
    list.querySelectorAll("[data-remove-ev]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.evidenceLog = state.evidenceLog.filter((e) => e.id !== btn.dataset.removeEv);
        saveState(false);
        renderEvidenceDrawer();
      });
    });
  }

  // -----------------------------------------------------------------
  // Painel de Aprovações (visão do professor)
  // -----------------------------------------------------------------
  const SUBMISSION_STATUS_LABELS = {
    "aguardando-aprovacao": { label: "Aguardando aprovação", cls: "status-pending" },
    aprovado: { label: "Aprovado", cls: "status-approved" },
    "revisao-solicitada": { label: "Revisão solicitada", cls: "status-revision" },
  };

  function updatePendingCount() {
    const submissions = loadSubmissions();
    const pending = submissions.filter((s) => s.status === "aguardando-aprovacao").length;
    const el = document.getElementById("pending-count");
    if (el) el.textContent = pending;
  }

  function renderApprovalsDrawer() {
    updatePendingCount();
    const list = document.getElementById("approvals-list");
    const submissions = loadSubmissions().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    if (submissions.length === 0) {
      list.innerHTML = '<p class="hint">Nenhum relatório enviado ainda. Assim que um grupo enviar o relatório para aprovação (Etapa 9), ele aparece aqui.</p>';
      return;
    }

    list.innerHTML = submissions
      .map((sub) => {
        const statusInfo = SUBMISSION_STATUS_LABELS[sub.status] || { label: sub.status, cls: "" };
        const round = D.ANALYSIS_ROUNDS[sub.analysisRound];
        return `<div class="approval-item" data-sub-id="${sub.id}">
          <div class="submission-badge ${statusInfo.cls}" style="margin-bottom:8px;">${statusInfo.label}</div>
          <h4 style="margin:0 0 4px; font-family:var(--font-display);">${escapeHtml(sub.groupName || "Grupo sem nome")}</h4>
          <p class="provenance-note" style="margin:0 0 8px;">
            ${sub.activityNumber ? "Atividade " + sub.activityNumber + " — " + escapeHtml(sub.activityName || "") : "Atividade não informada"}
            ${round ? " · " + round.label : ""}
          </p>
          <p style="font-size:0.85rem; margin:0 0 10px; font-style:italic;">"${escapeHtml(sub.headline || "sem manchete registrada")}"</p>
          <p class="provenance-note">Enviado em: ${new Date(sub.submittedAt).toLocaleString("pt-BR")}</p>
          ${sub.reviewedAt ? `<p class="provenance-note">Revisado em: ${new Date(sub.reviewedAt).toLocaleString("pt-BR")}</p>` : ""}
          <details style="margin:10px 0;">
            <summary style="cursor:pointer; font-size:0.85rem; font-weight:600; color:var(--agua-salobra-forte);">Ver relatório completo</summary>
            <div class="report-preview" style="margin-top:8px; max-height:260px;">${escapeHtml(sub.reportMarkdown)}</div>
          </details>
          <div class="field">
            <label style="font-size:0.8rem;" for="feedback-${sub.id}">Comentário para o grupo (opcional em aprovação, recomendado em revisão)</label>
            <textarea id="feedback-${sub.id}" placeholder="Ex.: Ótima hipótese! Só falta detalhar a evidência contrária." style="min-height:56px;">${escapeHtml(sub.teacherFeedback || "")}</textarea>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn-primary" data-approve="${sub.id}" type="button" ${sub.status === "aprovado" ? "disabled" : ""}>✓ Aprovar</button>
            <button class="btn-secondary" data-request-revision="${sub.id}" type="button">Solicitar revisão</button>
          </div>
        </div>`;
      })
      .join("");

    list.querySelectorAll("[data-approve]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.approve;
        const feedback = document.getElementById("feedback-" + id)?.value || "";
        teacherSetSubmissionStatus(id, "aprovado", feedback);
        toast("Relatório aprovado. O grupo já pode gerar o PDF.");
        renderApprovalsDrawer();
        renderSubmissionPanel(); // caso o professor esteja revisando o próprio grupo aberto no momento
      });
    });
    list.querySelectorAll("[data-request-revision]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.requestRevision;
        const feedbackEl = document.getElementById("feedback-" + id);
        const feedback = feedbackEl ? feedbackEl.value : "";
        if (!feedback.trim()) {
          toast("Escreva um comentário explicando o que precisa ser ajustado.");
          feedbackEl?.focus();
          return;
        }
        teacherSetSubmissionStatus(id, "revisao-solicitada", feedback);
        toast("Revisão solicitada. O grupo verá seu comentário.");
        renderApprovalsDrawer();
        renderSubmissionPanel();
      });
    });
  }

  // -----------------------------------------------------------------
  // Etapas 5–8 — binds diretos
  // -----------------------------------------------------------------
  function initStep5() {
    bindText("f-question1", null, (v) => (state.questions[0] = v));
    bindText("f-question2", null, (v) => (state.questions[1] = v));
    bindText("f-question3", null, (v) => (state.questions[2] = v));
    bindText("f-consultancyNotes", "consultancyNotes");
  }

  function initStep6() {
    ["patterns", "observations", "hypothesis", "supportingEvidence", "limitingEvidence", "analyticalLimits"].forEach((f) =>
      bindText("f-" + f, f)
    );
  }

  function initStep7() {
    bindText("f-workBridge", "workBridge");
  }

  function initStep8() {
    bindText("f-headline", "headline");
    bindText("f-newQuestion", "newQuestion");
    bindText("f-nextStep", "nextStep");
  }

  // -----------------------------------------------------------------
  // Etapa 9 — Revisão, completude e relatório
  // -----------------------------------------------------------------
  const COMPLETENESS_CHECKS = [
    { key: "groupName", label: "Nome do grupo preenchido" },
    { key: "analysisRound", label: "Rodada de análise selecionada" },
    { key: "activityNumber", label: "Atividade identificada" },
    { key: "scenario", label: "Cenário de coleta descrito" },
    { key: "rawData", label: "Dados brutos organizados" },
    { key: "hypothesis", label: "Hipótese provisória registrada" },
    { key: "workBridge", label: "Ponte com o Mundo do Trabalho escrita" },
    { key: "headline", label: "Manchete/constatação escrita" },
    { key: "newQuestion", label: "Nova questão motivadora registrada" },
  ];

  function renderCompleteness() {
    const list = document.getElementById("completeness-list");
    list.innerHTML = COMPLETENESS_CHECKS.map((c) => {
      const ok = !!(state[c.key] && String(state[c.key]).trim());
      return `<li><span class="dot ${ok ? "ok" : "pending"}"></span> ${c.label}</li>`;
    }).join("");
  }

  function missingEssentials() {
    return COMPLETENESS_CHECKS.filter((c) => !(state[c.key] && String(state[c.key]).trim()));
  }

  function buildReportMarkdown() {
    const round = D.ANALYSIS_ROUNDS[state.analysisRound];
    const tableRows = state.tableRows.filter((r) => r.some((c) => c && c.trim()));
    let tableMd = "";
    if (tableRows.length) {
      tableMd = "| " + TABLE_COLUMNS.join(" | ") + " |\n" + "|" + TABLE_COLUMNS.map(() => "---").join("|") + "|\n";
      tableRows.forEach((r) => (tableMd += "| " + r.join(" | ") + " |\n"));
    }

    return `# Relatório de Investigação — Lagamar Paulista

## 1. Triagem e Memória de Campo
- Grupo: ${state.groupName || "_não preenchido_"}
- Rodada: ${state.analysisRound || "_não preenchido_"}${round ? " (" + round.label + ")" : ""}
- Atividade: ${state.activityNumber ? state.activityNumber + " — " + state.activityName : "_não preenchido_"}
- Cenário: ${state.scenario || "_não preenchido_"}
- Divisão de tarefas: ${state.taskDivision || "_não preenchido_"}
- Materiais disponíveis: ${state.materials.length ? state.materials.join(", ") : "_não preenchido_"}

## 2. Dados organizados
${state.rawData || "_não preenchido_"}

${tableMd}

## 3. Perguntas para especialistas
1. ${state.questions[0] || "_não preenchido_"}
2. ${state.questions[1] || "_não preenchido_"}
3. ${state.questions[2] || "_não preenchido_"}

Anotações da consultoria: ${state.consultancyNotes || "_não preenchido_"}

## 4. Análise
### Observações
${state.observations || "_não preenchido_"}

### Padrões e destaques
${state.patterns || "_não preenchido_"}

### Hipótese provisória
${state.hypothesis || "_não preenchido_"}

### Evidências que apoiam a hipótese
${state.supportingEvidence || "_não preenchido_"}

### Evidências que limitam ou não confirmam a hipótese
${state.limitingEvidence || "_não preenchido_"}

### Limites da análise
${state.analyticalLimits || "_não preenchido_"}

## 5. Ponte com o Mundo do Trabalho
${state.workBridge || "_não preenchido_"}

## 6. Síntese para a apresentação
### Grande constatação/manchete
${state.headline || "_não preenchido_"}

### Nova questão motivadora
${state.newQuestion || "_não preenchido_"}

### Próximo passo ou proposta do grupo
${state.nextStep || "_não preenchido_"}

## Caderno de Evidências (${state.evidenceLog.length} registro(s))
${state.evidenceLog.map((ev, i) => `${i + 1}. [${ev.panel}] ${ev.reference} — ${ev.studentNote}`).join("\n") || "_nenhuma evidência registrada_"}

---
*Relatório gerado por Lagamar Investiga. As interpretações e hipóteses acima são de autoria do grupo de estudantes e não foram validadas automaticamente pelo sistema.*
`;
  }

  function initStep9() {
    document.getElementById("btn-generate-report").addEventListener("click", () => {
      const missing = missingEssentials();
      if (missing.length > 0) {
        toast(`Antes de gerar: complete → ${missing[0].label}`);
        renderCompleteness();
        return;
      }
      const md = buildReportMarkdown();
      document.getElementById("report-preview").textContent = md;
      state._lastReport = md;
      toast("Relatório gerado. Revise e, quando estiver pronto, envie para aprovação.");
      renderSubmissionPanel();
    });

    document.getElementById("btn-copy-report").addEventListener("click", async () => {
      const md = state._lastReport || buildReportMarkdown();
      try {
        await navigator.clipboard.writeText(md);
        toast("Relatório copiado para a área de transferência.");
      } catch (e) {
        toast("Não foi possível copiar automaticamente. Selecione o texto manualmente.");
      }
    });

    document.getElementById("btn-export-md").addEventListener("click", () => {
      const md = state._lastReport || buildReportMarkdown();
      downloadFile(`relatorio-${slug(state.groupName) || "grupo"}.md`, md, "text/markdown");
    });

    document.getElementById("btn-export-json").addEventListener("click", () => {
      downloadFile(`investigacao-${slug(state.groupName) || "grupo"}.json`, JSON.stringify(state, null, 2), "application/json");
    });

    document.getElementById("btn-submit-approval").addEventListener("click", () => {
      const ok = submitForApproval();
      if (ok) {
        toast("Relatório enviado! Aguarde a aprovação do professor.");
        renderSubmissionPanel();
      }
    });

    document.getElementById("btn-export-pdf").addEventListener("click", () => {
      openPdfPrintView();
    });

    renderSubmissionPanel();
  }

  // -----------------------------------------------------------------
  // Painel de status da submissão (visão do aluno, dentro da Etapa 9)
  // -----------------------------------------------------------------
  function renderSubmissionPanel() {
    syncSubmissionStatus();
    const el = document.getElementById("submission-status-panel");
    if (!el) return;

    const statusMap = {
      rascunho: { label: "Ainda não enviado", cls: "status-draft", desc: "Gere o relatório e clique em \"Enviar para aprovação do professor\" quando o grupo estiver satisfeito com o conteúdo." },
      "aguardando-aprovacao": { label: "Aguardando aprovação do professor", cls: "status-pending", desc: "Seu relatório foi enviado e está na fila de revisão do professor. Você ainda pode continuar editando o rascunho, mas isso não altera automaticamente o que foi enviado — reenvie se quiser atualizar." },
      aprovado: { label: "Aprovado ✓", cls: "status-approved", desc: "O professor aprovou este relatório. Agora você já pode exportar o PDF final." },
      "revisao-solicitada": { label: "Revisão solicitada pelo professor", cls: "status-revision", desc: "O professor pediu ajustes. Veja o comentário abaixo, edite o que for necessário nas etapas anteriores e reenvie." },
    };
    const s = statusMap[state.submissionStatus] || statusMap.rascunho;

    let html = `<div class="submission-badge ${s.cls}">${s.label}</div><p class="card-sub">${s.desc}</p>`;

    if (state.submittedAt) {
      html += `<p class="provenance-note">Enviado em: ${new Date(state.submittedAt).toLocaleString("pt-BR")}</p>`;
    }
    if (state.submissionStatus === "revisao-solicitada" && state.teacherFeedback) {
      html += `<div class="warning-box"><strong>Comentário do professor:</strong> ${escapeHtml(state.teacherFeedback)}</div>`;
    }
    if (state.submissionStatus === "aprovado" && state.teacherFeedback) {
      html += `<div class="warning-box" style="border-left-color:var(--junco); background:rgba(122,140,79,0.1); color:#3f4c26;"><strong>Comentário do professor:</strong> ${escapeHtml(state.teacherFeedback)}</div>`;
    }

    el.innerHTML = html;

    // Botão de enviar: some quando já aprovado (não faz sentido reenviar)
    const submitBtn = document.getElementById("btn-submit-approval");
    submitBtn.style.display = state.submissionStatus === "aprovado" ? "none" : "inline-flex";
    submitBtn.textContent = state.submissionStatus === "revisao-solicitada"
      ? "Reenviar para aprovação"
      : "Enviar para aprovação do professor";

    // Botão de PDF: só habilitado quando aprovado
    const pdfBtn = document.getElementById("btn-export-pdf");
    pdfBtn.disabled = state.submissionStatus !== "aprovado";
    pdfBtn.title = state.submissionStatus !== "aprovado"
      ? "Disponível somente após a aprovação do professor"
      : "Gerar PDF do relatório aprovado";
  }

  function slug(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("Arquivo exportado.");
  }

  // -----------------------------------------------------------------
  // Geração de PDF (somente após aprovação do professor)
  // -----------------------------------------------------------------
  // Estratégia: sem backend disponível, a rota mais confiável e que
  // funciona 100% offline é montar uma página HTML formatada para
  // impressão e acionar window.print() — o usuário escolhe "Salvar
  // como PDF" no diálogo de impressão do navegador. Isso evita
  // dependências externas e funciona em qualquer navegador moderno.
  function openPdfPrintView() {
    if (state.submissionStatus !== "aprovado") {
      toast("O PDF só fica disponível depois que o professor aprovar o relatório.");
      return;
    }
    const md = state._lastReport || buildReportMarkdown();
    const html = markdownReportToPrintHtml(md, state);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast("O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Aguarda o layout carregar antes de abrir o diálogo de impressão.
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  function markdownReportToPrintHtml(md, s) {
    // Conversão leve de Markdown -> HTML, suficiente para a estrutura
    // previsível do relatório (títulos, subtítulos, listas, tabela).
    // Não é um parser Markdown genérico — não precisa ser, pois o único
    // documento convertido aqui é o gerado por buildReportMarkdown().
    const escaped = escapeHtml(md);
    let body = escaped
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br/>");
    body = "<p>" + body + "</p>";

    const approvedNote = `Aprovado pelo professor em ${s.reviewedAt ? new Date(s.reviewedAt).toLocaleString("pt-BR") : "—"}`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Relatório de Investigação — ${escapeHtml(s.groupName || "Grupo")}</title>
<style>
  @page { size: A4; margin: 22mm 18mm; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: #2f2a22;
    line-height: 1.55;
    font-size: 12.5px;
    max-width: 720px;
    margin: 0 auto;
  }
  .doc-header {
    border-bottom: 3px solid #24413b;
    padding-bottom: 14px;
    margin-bottom: 24px;
  }
  .doc-header .eyebrow {
    font-family: 'Courier New', monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #b5652f;
  }
  .doc-header h1 { font-size: 20px; margin: 6px 0; color: #24413b; }
  .approval-stamp {
    display: inline-block;
    margin-top: 8px;
    padding: 4px 10px;
    border: 1.5px solid #7a8c4f;
    color: #4c5c2c;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-radius: 3px;
  }
  h1 { font-size: 17px; color: #24413b; margin-top: 22px; }
  h2 { font-size: 14px; color: #24413b; border-bottom: 1px solid #cbbfa4; padding-bottom: 4px; margin-top: 20px; }
  h3 { font-size: 12.5px; color: #b5652f; margin-top: 14px; margin-bottom: 4px; }
  li { margin-left: 18px; }
  p { margin: 6px 0; }
  .doc-footer {
    margin-top: 32px;
    padding-top: 10px;
    border-top: 1px solid #cbbfa4;
    font-size: 10px;
    color: #6b634c;
    font-family: 'Courier New', monospace;
  }
  @media print {
    body { font-size: 12px; }
    a { color: inherit; text-decoration: none; }
  }
</style>
</head>
<body>
  <div class="doc-header">
    <span class="eyebrow">Lagamar Investiga · Estudo de Meio · Lagamar Paulista</span>
    <h1>Relatório de Investigação — ${escapeHtml(s.groupName || "Grupo")}</h1>
    <span class="approval-stamp">✓ ${approvedNote}</span>
  </div>
  ${body}
  <div class="doc-footer">
    Documento gerado por Lagamar Investiga — Laboratório de Investigação Digital.<br/>
    As interpretações e hipóteses acima são de autoria do grupo de estudantes.
  </div>
</body>
</html>`;
  }

  // -----------------------------------------------------------------
  // Helpers de binding
  // -----------------------------------------------------------------
  function bindText(elId, stateKey, customSetter) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.addEventListener("input", (e) => {
      if (customSetter) customSetter(e.target.value);
      else state[stateKey] = e.target.value;
      updateTopbarMeta();
      saveState(false);
    });
  }

  function bindSelect(elId, stateKey, onChange) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.addEventListener("change", (e) => {
      state[stateKey] = e.target.value;
      if (onChange) onChange(e.target.value);
      updateTopbarMeta();
      saveState(false);
    });
  }

  function hydrateForm() {
    setVal("f-groupName", state.groupName);
    setVal("f-analysisRound", state.analysisRound);
    setVal("f-activityNumber", state.activityNumber);
    setVal("f-activityName", state.activityName);
    setVal("f-scenario", state.scenario);
    setVal("f-taskDivision", state.taskDivision);
    setVal("f-rawData", state.rawData);
    setVal("f-question1", state.questions[0]);
    setVal("f-question2", state.questions[1]);
    setVal("f-question3", state.questions[2]);
    setVal("f-consultancyNotes", state.consultancyNotes);
    ["patterns", "observations", "hypothesis", "supportingEvidence", "limitingEvidence", "analyticalLimits", "workBridge", "headline", "newQuestion", "nextStep"].forEach((f) =>
      setVal("f-" + f, state[f])
    );
    hydrateStep2();
    updateTopbarMeta();
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  }

  function updateTopbarMeta() {
    document.getElementById("meta-group").textContent = state.groupName || "—";
    document.getElementById("meta-round").textContent = state.analysisRound || "—";
    document.getElementById("meta-activity").textContent = state.activityNumber ? `${state.activityNumber} — ${state.activityName}` : "—";
  }

  // -----------------------------------------------------------------
  // Navegação global, evidências drawer, modo professor
  // -----------------------------------------------------------------
  function initGlobalControls() {
    document.getElementById("btn-prev-step").addEventListener("click", () => goToStep(state.currentStep - 1));
    document.getElementById("btn-next-step").addEventListener("click", () => {
      if (state.currentStep === TOTAL_STEPS) {
        if (state.submissionStatus === "aguardando-aprovacao") {
          toast("Relatório já está aguardando aprovação do professor.");
        } else if (state.submissionStatus === "aprovado") {
          toast("Relatório já aprovado. Você pode exportar o PDF.");
        } else {
          toast("Gere o relatório e clique em \"Enviar para aprovação do professor\" para concluir.");
        }
        document.getElementById("submission-status-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      goToStep(state.currentStep + 1);
    });

    document.getElementById("btn-save-draft").addEventListener("click", () => saveState(true));

    document.getElementById("btn-open-evidence").addEventListener("click", () => {
      document.getElementById("evidence-drawer").classList.add("open");
    });
    document.getElementById("btn-close-evidence").addEventListener("click", () => {
      document.getElementById("evidence-drawer").classList.remove("open");
    });

    document.getElementById("btn-open-approvals").addEventListener("click", () => {
      renderApprovalsDrawer();
      document.getElementById("approvals-drawer").classList.add("open");
    });
    document.getElementById("btn-close-approvals").addEventListener("click", () => {
      document.getElementById("approvals-drawer").classList.remove("open");
    });

    document.getElementById("toggle-student").addEventListener("click", () => {
      state.teacherMode = false;
      setModeToggle(false);
      saveState(false);
    });
    document.getElementById("toggle-teacher").addEventListener("click", () => {
      if (state.teacherMode) return; // já está no modo professor
      requestTeacherAccess(() => {
        state.teacherMode = true;
        setModeToggle(true);
        saveState(false);
      });
    });
    document.getElementById("btn-exit-teacher").addEventListener("click", () => {
      state.teacherMode = false;
      setModeToggle(false);
      saveState(false);
    });

    // Autosave periódico discreto
    setInterval(() => saveState(false), 20000);

    window.addEventListener("beforeunload", () => saveState(false));
  }

  // -----------------------------------------------------------------
  // Bootstrap
  // -----------------------------------------------------------------
  function renderAll() {
    renderProgressRail();
    initStep1();
    initStep2();
    initStep3();
    initStep4();
    initStep5();
    initStep6();
    initStep7();
    initStep8();
    initStep9();
    hydrateForm();
    renderEvidenceDrawer();
    updatePendingCount();
    goToStep(state.currentStep || 1);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initHero();
    initGlobalControls();
  });
})();
