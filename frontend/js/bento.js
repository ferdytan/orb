/* ==========================================================================
   ORB - EXECUTIVE BRIEF MANAGER (OFFICE VIEW)
   Strictly zero rupiah amounts on the Office screen.
   Pure percentage & statistical indicators with instant zero-blocking render.
   ========================================================================== */

const BentoManager = {
  briefData: null,

  init(initialBrief = null) {
    console.log("📊 Initializing Office Executive Brief...");
    this.briefData = initialBrief;

    // 1. Instant zero-blocking render of shell
    this.render();
    this.setupListeners();

    // 2. Fetch fresh data in the background without blocking UI
    this.refresh();
  },

  async refresh() {
    try {
      const data = await window.API.getFinExecutiveBrief();
      this.briefData = data;
      this.render();
    } catch (e) {
      console.warn("Executive brief sync failed, keeping offline shell:", e);
    }
  },

  render() {
    const data = this.briefData || {
      has_data: false,
      budget_utilization: {
        id: "budget_utilization",
        title: "Budget Bulanan",
        percentage: null,
        status_text: "Belum Ada Batas",
        status_tone: "neutral",
        indicator_note: "Belum ada anggaran bulanan aktif"
      },
      recording_coverage: {
        id: "recording_coverage",
        title: "Konsistensi Catat",
        percentage: 0,
        status_text: "Perlu Dicatat",
        status_tone: "neutral",
        indicator_note: "Mulai catat transaksi pertama Anda"
      },
      savings_allocation: {
        id: "savings_allocation",
        title: "Rasio Tabungan",
        percentage: null,
        status_text: "Nihil",
        status_tone: "neutral",
        indicator_note: "Belum ada catatan pemasukan"
      },
      upcoming_obligations: {
        id: "upcoming_obligations",
        title: "Kewajiban Tagihan",
        percentage: 100,
        status_text: "100% Bersih",
        status_tone: "good",
        indicator_note: "Tidak ada tagihan tertunda"
      },
      insights: [
        "Fin siap mendampingi perencanaan keuangan pribadi Anda.",
        "Klik Fin di atas untuk membuka ruang kerja detail lengkap."
      ],
      quick_tips: "Klik Fin untuk membuka ruang kerja detail dengan kontrol privasi nominal.",
      fin_status: "ready"
    };

    // Render Widget 1: Budget Utilization
    this.renderWidget(
      "briefBudgetCard",
      "briefBudgetPct",
      "briefBudgetBar",
      "briefBudgetNote",
      data.budget_utilization
    );

    // Render Widget 2: Recording Coverage
    this.renderWidget(
      "briefCoverageCard",
      "briefCoveragePct",
      "briefCoverageBar",
      "briefCoverageNote",
      data.recording_coverage
    );

    // Render Widget 3: Savings Allocation
    this.renderWidget(
      "briefSavingsCard",
      "briefSavingsPct",
      "briefSavingsBar",
      "briefSavingsNote",
      data.savings_allocation
    );

    // Render Widget 4: Upcoming Obligations
    this.renderWidget(
      "briefObligationsCard",
      "briefObligationsPct",
      "briefObligationsBar",
      "briefObligationsNote",
      data.upcoming_obligations
    );

    // Render Insights Card
    const insightsList = document.getElementById("briefInsightsList");
    if (insightsList && Array.isArray(data.insights)) {
      insightsList.innerHTML = data.insights.map(item => `
        <li class="brief-insight-item">
          <span class="brief-bullet">✦</span>
          <span>${item}</span>
        </li>
      `).join("");
    }

    const tipEl = document.getElementById("briefQuickTip");
    if (tipEl && data.quick_tips) {
      tipEl.textContent = data.quick_tips;
    }
  },

  renderWidget(cardId, pctId, barId, noteId, widgetData) {
    const cardEl = document.getElementById(cardId);
    const pctEl = document.getElementById(pctId);
    const barEl = document.getElementById(barId);
    const noteEl = document.getElementById(noteId);

    if (!widgetData) return;

    if (pctEl) {
      if (widgetData.percentage !== null && widgetData.percentage !== undefined) {
        pctEl.textContent = `${widgetData.percentage}%`;
        pctEl.className = `brief-stat-pct tone-${widgetData.status_tone || 'neutral'}`;
      } else {
        pctEl.textContent = widgetData.status_text || "--";
        pctEl.className = `brief-stat-pct tone-neutral is-text`;
      }
    }

    if (barEl) {
      const pct = widgetData.percentage !== null && widgetData.percentage !== undefined ? Math.min(100, Math.max(0, widgetData.percentage)) : 0;
      barEl.style.width = `${pct}%`;
      barEl.className = `brief-progress-fill tone-${widgetData.status_tone || 'neutral'}`;
    }

    if (noteEl) {
      noteEl.textContent = widgetData.indicator_note || widgetData.status_text || "";
    }

    if (cardEl) {
      cardEl.className = `bento-card executive-brief-card tone-${widgetData.status_tone || 'neutral'}`;
    }
  },

  setupListeners() {
    // Quick Action: Catat Pemasukan
    document.getElementById("btnQuickIncome")?.addEventListener("click", () => {
      window.FinWorkspace?.openAddTransactionModal("income");
    });

    // Quick Action: Catat Pengeluaran
    document.getElementById("btnQuickExpense")?.addEventListener("click", () => {
      window.FinWorkspace?.openAddTransactionModal("expense");
    });

    // Quick Action: Buka Fin Workspace
    document.getElementById("btnOpenFinWorkspace")?.addEventListener("click", () => {
      window.location.hash = "#fin";
    });

    // Clicking any widget cards navigates to corresponding Fin subtab
    document.getElementById("briefBudgetCard")?.addEventListener("click", () => {
      window.location.hash = "#fin/budgets";
    });

    document.getElementById("briefCoverageCard")?.addEventListener("click", () => {
      window.location.hash = "#fin/transactions";
    });

    document.getElementById("briefSavingsCard")?.addEventListener("click", () => {
      window.location.hash = "#fin/goals";
    });

    document.getElementById("briefObligationsCard")?.addEventListener("click", () => {
      window.location.hash = "#fin/reminders";
    });
  }
};

window.BentoManager = BentoManager;
