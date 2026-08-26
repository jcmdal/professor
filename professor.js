/**
 * professor.js — Painel do Professor (Lagamar Investiga)
 * Consome a camada window.LagamarAPI (api/*.js) sobre Supabase.
 */
(function () {
  "use strict";

  const TEACHER_PASSWORD = "admin@elvira";
  const D = window.LAGAMAR_DATA;

  const SUBMISSION_STATUS_LABELS = {
    rascunho: "Rascunho",
    "aguardando-aprovacao": "Aguardando aprovação",
    aprovado: "Aprovado",
    "revisao-solicitada": "Revisão solicitada",
  };
  const SUBMISSION_STATUS_CLASS = {
    rascunho: "status-draft",
    "aguardando-aprovacao": "status-pending",
    aprovado: "status-approved",
    "revisao-solicitada": "status-revision",
  };

  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  // -----------------------------------------------------------------
  // Autenticação simples (mesmo padrão do protótipo anterior — barreira
  // de uso, não segurança real; ver GUIA-DO-PROFESSOR.md)
  // -----------------------------------------------------------------
  function initPasswordGate() {
    const input = document.getElementById("teacher-password");
    const errorMsg = document.getElementById("password-error");

    function attempt() {
      if (input.value === TEACHER_PASSWORD) {
        document.getElementById("password-gate").style.display = "none";
        document.getElementById("teacher-shell").style.display = "grid";
        bootstrapPanel();
      } else {
        errorMsg.style.display = "block";
        input.value = "";
        input.focus();
      }
    }

    document.getElementById("btn-enter-teacher").addEventListener("click", attempt);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") attempt();
    });
    input.focus();
  }

  // -----------------------------------------------------------------
  // Navegação entre seções
  // -----------------------------------------------------------------
  function initNav() {
    document.querySelectorAll(".teacher-nav-item[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".teacher-nav-item[data-view]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".teacher-view").forEach((v) => (v.style.display = "none"));
        document.getElementById("view-" + btn.dataset.view).style.display = "block";

        if (btn.dataset.view === "overview") loadOverview();
        if (btn.dataset.view === "approvals") loadApprovals();
        if (btn.dataset.view === "compare") loadCompareFilters();
      });
    });

    document.getElementById("btn-exit-teacher-panel").addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  // -----------------------------------------------------------------
  // VISÃO GERAL
  // -----------------------------------------------------------------
  async function loadOverview() {
    const statGrid = document.getElementById("stat-grid");
    const tbody = document.getElementById("overview-table-body");
    statGrid.innerHTML = '<div class="loading-state">Carregando estatísticas…</div>';
    tbody.innerHTML = '<tr><td colspan="6" class="loading-state">Carregando…</td></tr>';

    try {
      const all = await window.LagamarAPI.investigations.listAll();
      updatePendingCountBadge(all);
      renderStatCards(all);
      renderOverviewTable(all);
    } catch (err) {
      statGrid.innerHTML = "";
      tbody.innerHTML = `<tr><td colspan="6" class="teacher-empty">Não foi possível carregar os dados: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderStatCards(all) {
    const total = all.length;
    const pending = all.filter((i) => i.submission_status === "aguardando-aprovacao").length;
    const approved = all.filter((i) => i.submission_status === "aprovado").length;
    const revision = all.filter((i) => i.submission_status === "revisao-solicitada").length;
    const draft = all.filter((i) => i.submission_status === "rascunho" || !i.submission_status).length;

    document.getElementById("stat-grid").innerHTML = `
      <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Investigações no total</div></div>
      <div class="stat-card accent"><div class="stat-value">${pending}</div><div class="stat-label">Aguardando aprovação</div></div>
      <div class="stat-card success"><div class="stat-value">${approved}</div><div class="stat-label">Aprovadas</div></div>
      <div class="stat-card"><div class="stat-value">${revision}</div><div class="stat-label">Em revisão</div></div>
      <div class="stat-card"><div class="stat-value">${draft}</div><div class="stat-label">Ainda em rascunho</div></div>
    `;
  }

  function renderOverviewTable(all) {
    const tbody = document.getElementById("overview-table-body");
    if (all.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="teacher-empty"><span class="emoji">🌱</span>Nenhuma investigação criada ainda.</div></td></tr>';
      return;
    }
    tbody.innerHTML = all
      .map((inv) => {
        const group = inv.groups;
        const className = group?.classes?.short_code || "—";
        const status = inv.submission_status || "rascunho";
        return `<tr>
          <td class="group-cell"><strong>${escapeHtml(group?.display_name || "Grupo?")}</strong><span>${escapeHtml(className)}</span></td>
          <td>${inv.analysis_round ? "Rodada " + inv.analysis_round : "—"}${inv.activity_number ? " · Ativ. " + inv.activity_number : ""}</td>
          <td class="headline-cell">${inv.headline ? '"' + escapeHtml(inv.headline) + '"' : '<span style="color:#b5aa8c;">sem manchete</span>'}</td>
          <td><span class="submission-badge ${SUBMISSION_STATUS_CLASS[status]}">${SUBMISSION_STATUS_LABELS[status]}</span></td>
          <td>${fmtDate(inv.updated_at)}</td>
          <td><button class="row-action-btn" data-view-report="${inv.id}">Ver</button></td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll("[data-view-report]").forEach((btn) => {
      btn.addEventListener("click", () => openReportModal(all.find((i) => i.id === btn.dataset.viewReport)));
    });
  }

  function updatePendingCountBadge(all) {
    const pending = all.filter((i) => i.submission_status === "aguardando-aprovacao").length;
    const el = document.getElementById("nav-pending-count");
    el.textContent = pending;
    el.classList.toggle("zero", pending === 0);
  }

  // -----------------------------------------------------------------
  // FILA DE APROVAÇÃO
  // -----------------------------------------------------------------
  async function loadApprovals() {
    const el = document.getElementById("approvals-content");
    el.innerHTML = '<div class="loading-state">Carregando fila…</div>';

    try {
      const pending = await window.LagamarAPI.submissions.listPending();
      renderApprovalsList(pending);
    } catch (err) {
      el.innerHTML = `<div class="teacher-empty">Não foi possível carregar a fila: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderApprovalsList(pending) {
    const el = document.getElementById("approvals-content");
    if (pending.length === 0) {
      el.innerHTML = '<div class="teacher-empty"><span class="emoji">✓</span>Nenhum relatório aguardando aprovação no momento.</div>';
      return;
    }

    el.innerHTML = pending
      .map((sub) => {
        const inv = sub.investigations;
        const group = inv?.groups;
        const className = group?.classes?.short_code || "—";
        const roundLabel = D?.ANALYSIS_ROUNDS?.[inv?.analysis_round]?.label || (inv?.analysis_round ? "Rodada " + inv.analysis_round : "");
        return `<div class="card" data-submission-card="${sub.id}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
            <div>
              <h3 style="margin-bottom:2px;">${escapeHtml(group?.display_name || "Grupo?")} <span style="font-family:var(--font-mono); font-size:11px; color:#8a8064;">${escapeHtml(className)}</span></h3>
              <p class="card-sub" style="margin:0;">${inv?.activity_number ? "Atividade " + inv.activity_number + " — " + escapeHtml(inv.activity_name || "") : "Atividade não informada"}${roundLabel ? " · " + roundLabel : ""}</p>
            </div>
            <span class="provenance-note">Enviado em ${fmtDate(sub.submitted_at)}</span>
          </div>
          <p style="font-style:italic; margin:12px 0 4px;">"${escapeHtml(inv?.headline || "sem manchete registrada")}"</p>
          <details style="margin:10px 0;">
            <summary style="cursor:pointer; font-size:0.85rem; font-weight:600; color:var(--agua-salobra-forte);">Ver relatório completo</summary>
            <div class="report-preview" style="margin-top:8px; max-height:280px;">${escapeHtml(sub.report_markdown)}</div>
          </details>
          <div class="field">
            <label style="font-size:0.8rem;" for="fb-${sub.id}">Comentário para o grupo</label>
            <textarea id="fb-${sub.id}" placeholder="Ótima hipótese! Só falta detalhar a evidência contrária." style="min-height:56px;"></textarea>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn-primary" data-approve="${sub.id}" data-inv="${inv?.id}" type="button">✓ Aprovar</button>
            <button class="btn-secondary" data-revise="${sub.id}" data-inv="${inv?.id}" type="button">Solicitar revisão</button>
          </div>
        </div>`;
      })
      .join("");

    el.querySelectorAll("[data-approve]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const feedback = document.getElementById("fb-" + btn.dataset.approve).value;
        btn.disabled = true;
        try {
          await window.LagamarAPI.submissions.approve(btn.dataset.approve, btn.dataset.inv, feedback);
          toast("Relatório aprovado. O grupo já pode gerar o PDF.");
          loadApprovals();
        } catch (err) {
          toast("Erro ao aprovar: " + err.message);
          btn.disabled = false;
        }
      });
    });

    el.querySelectorAll("[data-revise]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const feedbackEl = document.getElementById("fb-" + btn.dataset.revise);
        const feedback = feedbackEl.value.trim();
        if (!feedback) {
          toast("Escreva um comentário explicando o que precisa ser ajustado.");
          feedbackEl.focus();
          return;
        }
        btn.disabled = true;
        try {
          await window.LagamarAPI.submissions.requestRevision(btn.dataset.revise, btn.dataset.inv, feedback);
          toast("Revisão solicitada. O grupo verá seu comentário.");
          loadApprovals();
        } catch (err) {
          toast("Erro ao solicitar revisão: " + err.message);
          btn.disabled = false;
        }
      });
    });
  }

  // -----------------------------------------------------------------
  // COMPARAR GRUPOS
  // -----------------------------------------------------------------
  async function loadCompareFilters() {
    const classSelect = document.getElementById("compare-class");
    const activitySelect = document.getElementById("compare-activity");

    if (classSelect.options.length <= 1) {
      try {
        const classes = await window.LagamarAPI.classesGroups.listClasses();
        classes.forEach((c) => {
          const opt = document.createElement("option");
          opt.value = c.id;
          opt.textContent = c.name;
          classSelect.appendChild(opt);
        });
      } catch (err) {
        toast("Não foi possível carregar as turmas: " + err.message);
      }
    }

    if (activitySelect.options.length <= 1 && D?.FIELD_ACTIVITIES) {
      D.FIELD_ACTIVITIES.forEach((a) => {
        const opt = document.createElement("option");
        opt.value = a.number;
        opt.textContent = `${a.number} — ${a.name}`;
        activitySelect.appendChild(opt);
      });
    }
  }

  function initCompareRunner() {
    document.getElementById("btn-run-comparison").addEventListener("click", runComparison);
  }

  async function runComparison() {
    const round = document.getElementById("compare-round").value;
    const activity = document.getElementById("compare-activity").value;
    const classId = document.getElementById("compare-class").value || null;
    const content = document.getElementById("comparison-content");

    if (!round || !activity) {
      toast("Selecione a rodada e a atividade para comparar.");
      return;
    }

    content.innerHTML = '<div class="loading-state">Carregando comparação…</div>';

    try {
      const results = await window.LagamarAPI.investigations.listByRoundAndActivity(
        Number(round),
        Number(activity),
        classId
      );
      renderComparisonGrid(results);
    } catch (err) {
      content.innerHTML = `<div class="teacher-empty">Não foi possível comparar: ${escapeHtml(err.message)}</div>`;
    }
  }

  const COMPARISON_ROWS = [
    { key: "scenario", label: "Cenário" },
    { key: "hypothesis", label: "Hipótese" },
    { key: "supporting_evidence", label: "Evidências a favor" },
    { key: "limiting_evidence", label: "Evidências contra" },
    { key: "work_bridge", label: "Ponte c/ trabalho" },
    { key: "headline", label: "Manchete" },
    { key: "new_question", label: "Nova questão" },
  ];

  function renderComparisonGrid(results) {
    const content = document.getElementById("comparison-content");
    if (results.length === 0) {
      content.innerHTML = '<div class="teacher-empty"><span class="emoji">🔍</span>Nenhum grupo registrou dados para essa rodada e atividade ainda.</div>';
      return;
    }

    const cols = results.length;
    let html = `<div class="comparison-grid" style="grid-template-columns: 200px repeat(${cols}, minmax(220px, 1fr));">`;

    // Cabeçalho
    html += '<div class="row-label">Grupo</div>';
    results.forEach((inv) => {
      const g = inv.groups;
      const status = inv.submission_status || "rascunho";
      html += `<div class="group-header">
        ${escapeHtml(g?.display_name || "Grupo?")}
        <div class="sub">${escapeHtml(g?.classes?.short_code || "")} · ${SUBMISSION_STATUS_LABELS[status]}</div>
      </div>`;
    });

    // Linhas de comparação
    COMPARISON_ROWS.forEach((row) => {
      html += `<div class="row-label">${row.label}</div>`;
      results.forEach((inv) => {
        const val = inv[row.key];
        html += val
          ? `<div class="cell">${escapeHtml(val)}</div>`
          : `<div class="cell empty">Não preenchido</div>`;
      });
    });

    html += "</div>";
    content.innerHTML = html;
  }

  // -----------------------------------------------------------------
  // Modal de visualização de relatório (usado na Visão Geral)
  // -----------------------------------------------------------------
  function openReportModal(inv) {
    if (!inv) return;
    const backdrop = document.getElementById("review-modal-backdrop");
    const content = document.getElementById("review-modal-content");
    const status = inv.submission_status || "rascunho";

    content.innerHTML = `
      <button class="modal-close" id="btn-close-modal" type="button">✕</button>
      <h2 style="font-family:var(--font-display); margin-top:0;">${escapeHtml(inv.groups?.display_name || "Grupo?")}</h2>
      <span class="submission-badge ${SUBMISSION_STATUS_CLASS[status]}" style="margin-bottom:14px; display:inline-flex;">${SUBMISSION_STATUS_LABELS[status]}</span>
      <table class="data-table" style="margin-bottom:16px;">
        <tr><th>Rodada</th><td>${inv.analysis_round || "—"}</td></tr>
        <tr><th>Atividade</th><td>${inv.activity_number ? inv.activity_number + " — " + escapeHtml(inv.activity_name || "") : "—"}</td></tr>
        <tr><th>Cenário</th><td>${escapeHtml(inv.scenario || "—")}</td></tr>
        <tr><th>Hipótese</th><td>${escapeHtml(inv.hypothesis || "—")}</td></tr>
        <tr><th>Manchete</th><td>${escapeHtml(inv.headline || "—")}</td></tr>
        <tr><th>Ponte c/ trabalho</th><td>${escapeHtml(inv.work_bridge || "—")}</td></tr>
      </table>
      ${inv.teacher_feedback ? `<div class="warning-box"><strong>Seu comentário:</strong> ${escapeHtml(inv.teacher_feedback)}</div>` : ""}
    `;

    backdrop.style.display = "flex";
    document.getElementById("btn-close-modal").addEventListener("click", () => {
      backdrop.style.display = "none";
    });
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.style.display = "none";
    });
  }

  // -----------------------------------------------------------------
  // Bootstrap
  // -----------------------------------------------------------------
  function bootstrapPanel() {
    initNav();
    initCompareRunner();
    loadOverview();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initPasswordGate();
  });
})();
