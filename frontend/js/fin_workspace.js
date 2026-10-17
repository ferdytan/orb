/* ==========================================================================
   ORB - FIN PERSONAL FINANCE WORKSPACE MODULE
   Isolated, deterministic, privacy-respecting client module.
   ========================================================================== */

const FinWorkspace = {
  currentSubtab: "overview", // 'overview', 'transactions', 'budgets', 'accounts', 'reminders', 'goals', 'reports', 'chat'
  isPrivacyMasked: false,    // Persisted in localStorage
  currentPeriod: null,
  activeAccounts: [],
  categories: [],
  summary: null,
  txFilter: "all",           // 'all', 'income', 'expense', 'transfer'

  init() {
    console.log("💰 Initializing Fin Personal Finance Workspace...");
    this.currentPeriod = new Date().toISOString().slice(0, 7);
    this.isPrivacyMasked = localStorage.getItem("orb_fin_privacy_mask") === "true";

    this.setupListeners();
    this.applyPrivacyMaskUI();
    this.setupSubtabNavigation();
  },

  // --------------------------------------------------------------------------
  // PRIVACY MASK
  // --------------------------------------------------------------------------
  togglePrivacyMask() {
    this.isPrivacyMasked = !this.isPrivacyMasked;
    localStorage.setItem("orb_fin_privacy_mask", this.isPrivacyMasked ? "true" : "false");
    this.applyPrivacyMaskUI();
    this.renderCurrentSubtab();
  },

  applyPrivacyMaskUI() {
    const btn = document.getElementById("finPrivacyToggleBtn");
    if (btn) {
      btn.innerHTML = this.isPrivacyMasked 
        ? `<span>👁️‍🗨️</span> <span>Tampilkan Nominal</span>`
        : `<span>👁️</span> <span>Sembunyikan Nominal</span>`;
      btn.classList.toggle("privacy-active", this.isPrivacyMasked);
    }
  },

  formatCurrency(amount, forceMask = false) {
    if (this.isPrivacyMasked || forceMask) {
      return "••••••••";
    }
    const val = Math.round(Number(amount) || 0);
    return `Rp ${val.toLocaleString("id-ID")}`;
  },

  // --------------------------------------------------------------------------
  // ROUTING & SUBTABS
  // --------------------------------------------------------------------------
  switchSubtab(subtabName) {
    this.currentSubtab = subtabName;
    document.querySelectorAll(".fin-subtab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.subtab === subtabName);
    });

    document.querySelectorAll(".fin-subtab-pane").forEach(pane => {
      pane.classList.remove("active");
      pane.style.display = "none";
    });

    const target = document.getElementById(`finSubtab_${subtabName}`);
    if (target) {
      target.classList.add("active");
      target.style.display = "block";
    }

    this.renderCurrentSubtab();
  },

  setupSubtabNavigation() {
    document.querySelectorAll(".fin-subtab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const sub = btn.dataset.subtab;
        if (sub) {
          window.location.hash = `#fin/${sub}`;
        }
      });
    });
  },

  async loadInitialData() {
    try {
      const [accs, cats, sum] = await Promise.all([
        window.API.getFinAccounts(),
        window.API.getFinCategories(),
        window.API.getFinSummary(this.currentPeriod)
      ]);
      this.activeAccounts = accs || [];
      this.categories = cats || [];
      this.summary = sum;
    } catch (e) {
      console.warn("Fin initial load warning:", e);
    }
  },

  async renderCurrentSubtab() {
    switch (this.currentSubtab) {
      case "overview":
        await this.renderOverview();
        break;
      case "transactions":
        await this.renderTransactions();
        break;
      case "budgets":
        await this.renderBudgets();
        break;
      case "accounts":
        await this.renderAccounts();
        break;
      case "reminders":
        await this.renderReminders();
        break;
      case "goals":
        await this.renderGoals();
        break;
      case "reports":
        await this.renderReports();
        break;
      case "chat":
        await this.renderChat();
        break;
      default:
        await this.renderOverview();
    }
  },

  // --------------------------------------------------------------------------
  // 1. OVERVIEW (RINGKASAN)
  // --------------------------------------------------------------------------
  async renderOverview() {
    const container = document.getElementById("finOverviewContent");
    if (!container) return;

    container.innerHTML = `<div class="fin-loading-indicator">Menyinkronkan ringkasan...</div>`;

    try {
      this.summary = await window.API.getFinSummary(this.currentPeriod);
      this.activeAccounts = await window.API.getFinAccounts();
    } catch (_) {}

    const sum = this.summary || {
      total_net_worth: 0,
      total_income: 0,
      total_expense: 0,
      net_savings: 0,
      savings_rate_pct: 0,
      category_breakdown: []
    };

    let breakdownHtml = "";
    if (sum.category_breakdown && sum.category_breakdown.length > 0) {
      breakdownHtml = sum.category_breakdown.slice(0, 5).map(c => `
        <div class="fin-breakdown-row">
          <div class="fin-breakdown-info">
            <span class="fin-cat-icon">${c.icon || '🏷️'}</span>
            <span class="fin-cat-name">${c.name}</span>
          </div>
          <div class="fin-breakdown-val">
            <span class="fin-nominal ${this.isPrivacyMasked ? 'nominal-masked' : ''}">${this.formatCurrency(c.amount)}</span>
            <span class="fin-cat-pct">(${c.percentage}%)</span>
          </div>
        </div>
      `).join("");
    } else {
      breakdownHtml = `<div class="fin-empty-note">Belum ada pos pengeluaran tercatat bulan ini.</div>`;
    }

    let accountsHtml = "";
    if (this.activeAccounts.length > 0) {
      accountsHtml = this.activeAccounts.map(a => `
        <div class="fin-acc-chip">
          <span class="fin-acc-icon">${a.icon || '👛'}</span>
          <div class="fin-acc-col">
            <span class="fin-acc-title">${a.name}</span>
            <span class="fin-acc-bal ${this.isPrivacyMasked ? 'nominal-masked' : ''}">${this.formatCurrency(a.balance)}</span>
          </div>
        </div>
      `).join("");
    } else {
      accountsHtml = `<div class="fin-empty-note">Belum ada akun terdaftar.</div>`;
    }

    container.innerHTML = `
      <div class="fin-kpi-grid">
        <div class="fin-kpi-card kpi-networth">
          <div class="fin-kpi-label">Total Saldo Bersih</div>
          <div class="fin-kpi-value ${this.isPrivacyMasked ? 'nominal-masked' : ''}">${this.formatCurrency(sum.total_net_worth)}</div>
          <div class="fin-kpi-sub">Seluruh akun terdaftar</div>
        </div>
        <div class="fin-kpi-card kpi-income">
          <div class="fin-kpi-label">Pemasukan Bulan Ini</div>
          <div class="fin-kpi-value ${this.isPrivacyMasked ? 'nominal-masked' : ''}">${this.formatCurrency(sum.total_income)}</div>
          <div class="fin-kpi-sub">Arus kas masuk</div>
        </div>
        <div class="fin-kpi-card kpi-expense">
          <div class="fin-kpi-label">Pengeluaran Bulan Ini</div>
          <div class="fin-kpi-value ${this.isPrivacyMasked ? 'nominal-masked' : ''}">${this.formatCurrency(sum.total_expense)}</div>
          <div class="fin-kpi-sub">Batas terkelola</div>
        </div>
        <div class="fin-kpi-card kpi-savings">
          <div class="fin-kpi-label">Sisa Tabungan (Rasio)</div>
          <div class="fin-kpi-value ${this.isPrivacyMasked ? 'nominal-masked' : ''}">${this.formatCurrency(sum.net_savings)}</div>
          <div class="fin-kpi-sub">Rasio simpanan: <strong>${sum.savings_rate_pct}%</strong></div>
        </div>
      </div>

      <div class="fin-section-card">
        <div class="fin-card-header">
          <span class="fin-card-title">💳 Saldo Rekening & Dompet</span>
          <button class="fin-card-action-btn" id="finBtnGoAccounts">Lihat Semua</button>
        </div>
        <div class="fin-accounts-chips-row">${accountsHtml}</div>
      </div>

      <div class="fin-section-card">
        <div class="fin-card-header">
          <span class="fin-card-title">📊 Pos Pengeluaran Terbesar</span>
          <button class="fin-card-action-btn" id="finBtnGoBudgets">Atur Budget</button>
        </div>
        <div class="fin-breakdown-list">${breakdownHtml}</div>
      </div>
    `;

    document.getElementById("finBtnGoAccounts")?.addEventListener("click", () => window.location.hash = "#fin/accounts");
    document.getElementById("finBtnGoBudgets")?.addEventListener("click", () => window.location.hash = "#fin/budgets");
  },

  // --------------------------------------------------------------------------
  // 2. TRANSACTIONS (TRANSAKSI)
  // --------------------------------------------------------------------------
  async renderTransactions() {
    const container = document.getElementById("finTransactionsContent");
    if (!container) return;

    container.innerHTML = `<div class="fin-loading-indicator">Memuat transaksi...</div>`;

    const txTypeFilter = this.txFilter === "all" ? null : this.txFilter;
    let txs = [];
    try {
      txs = await window.API.getFinTransactions({ period: this.currentPeriod, type: txTypeFilter, limit: 100 });
    } catch (_) {}

    let listHtml = "";
    if (txs.length > 0) {
      listHtml = txs.map(t => {
        let sign = "-";
        let amountClass = "is-expense";
        let typeBadge = "Pengeluaran";
        if (t.type === "income") {
          sign = "+";
          amountClass = "is-income";
          typeBadge = "Pemasukan";
        } else if (t.type === "transfer") {
          sign = "⇄";
          amountClass = "is-transfer";
          typeBadge = "Transfer";
        }

        const accountLabel = t.type === "transfer" 
          ? `${t.account_name || 'Akun'} ➔ ${t.destination_account_name || 'Tujuan'}`
          : (t.account_name || 'Dompet');

        return `
          <div class="fin-tx-item">
            <div class="fin-tx-icon-frame ${amountClass}">${t.category_icon || (t.type === 'income' ? '💰' : '👛')}</div>
            <div class="fin-tx-main">
              <div class="fin-tx-desc-row">
                <span class="fin-tx-desc">${t.description}</span>
                <span class="fin-tx-amount ${amountClass} ${this.isPrivacyMasked ? 'nominal-masked' : ''}">
                  ${sign} ${this.formatCurrency(t.amount)}
                </span>
              </div>
              <div class="fin-tx-sub-row">
                <span>${t.date} ${t.time || ''} • <strong>${accountLabel}</strong></span>
                <button class="fin-tx-del-btn" data-id="${t.id}" title="Hapus transaksi">🗑️</button>
              </div>
            </div>
          </div>
        `;
      }).join("");
    } else {
      listHtml = `<div class="fin-empty-state">
        <span style="font-size: 2.2rem;">📝</span>
        <div style="font-weight: 700; margin-top: 8px;">Belum ada transaksi tercatat</div>
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">Gunakan tombol "+ Catat Transaksi" untuk memasukkan transaksi pertama Anda.</p>
      </div>`;
    }

    container.innerHTML = `
      <div class="fin-tx-toolbar">
        <div class="fin-filter-group">
          <button class="fin-filter-btn ${this.txFilter === 'all' ? 'active' : ''}" data-filter="all">Semua</button>
          <button class="fin-filter-btn ${this.txFilter === 'expense' ? 'active' : ''}" data-filter="expense">Pengeluaran</button>
          <button class="fin-filter-btn ${this.txFilter === 'income' ? 'active' : ''}" data-filter="income">Pemasukan</button>
          <button class="fin-filter-btn ${this.txFilter === 'transfer' ? 'active' : ''}" data-filter="transfer">Transfer</button>
        </div>
        <button class="fin-primary-btn" id="finBtnAddTxDirect">+ Catat</button>
      </div>
      <div class="fin-tx-list">${listHtml}</div>
    `;

    container.querySelectorAll(".fin-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.txFilter = btn.dataset.filter;
        this.renderTransactions();
      });
    });

    document.getElementById("finBtnAddTxDirect")?.addEventListener("click", () => this.openAddTransactionModal());

    container.querySelectorAll(".fin-tx-del-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (confirm("Hapus transaksi ini? Saldo akun akan dikembalikan otomatis.")) {
          try {
            await window.API.deleteFinTransaction(id);
            this.renderTransactions();
            window.OrbApp?.refreshExecutiveBrief();
          } catch (err) {
            alert(err.message || "Gagal menghapus transaksi.");
          }
        }
      });
    });
  },

  // --------------------------------------------------------------------------
  // 3. BUDGETS (ANGGARAN KATEGORI)
  // --------------------------------------------------------------------------
  async renderBudgets() {
    const container = document.getElementById("finBudgetContent");
    if (!container) return;

    container.innerHTML = `<div class="fin-loading-indicator">Memuat anggaran...</div>`;

    let budgets = [];
    try {
      budgets = await window.API.getFinBudgets(this.currentPeriod);
    } catch (_) {}

    let cardsHtml = "";
    if (budgets.length > 0) {
      cardsHtml = budgets.map(b => {
        let barColor = "var(--status-active)";
        if (b.utilization_pct > 100) barColor = "#EF4444";
        else if (b.utilization_pct >= 80) barColor = "var(--status-warning)";

        return `
          <div class="fin-budget-card">
            <div class="fin-budget-head">
              <div class="fin-budget-title-col">
                <span class="fin-cat-icon">${b.category_icon || '🏷️'}</span>
                <strong>${b.category_name}</strong>
              </div>
              <span class="fin-budget-pct ${b.is_over_budget ? 'is-over' : ''}">${b.utilization_pct}%</span>
            </div>

            <div class="fin-progress-bar-wrap">
              <div class="fin-progress-bar-fill" style="width: ${Math.min(100, b.utilization_pct)}%; background-color: ${barColor};"></div>
            </div>

            <div class="fin-budget-stats-row">
              <span class="fin-nominal ${this.isPrivacyMasked ? 'nominal-masked' : ''}">Terpakai: ${this.formatCurrency(b.spent_amount)}</span>
              <span class="fin-nominal ${this.isPrivacyMasked ? 'nominal-masked' : ''}">Batas: ${this.formatCurrency(b.limit_amount)}</span>
            </div>

            <div class="fin-budget-rem-row">
              <span>${b.is_over_budget ? '⚠️ Melebihi anggaran' : 'Sisa ruang'}: 
                <strong class="fin-nominal ${this.isPrivacyMasked ? 'nominal-masked' : ''}">${this.formatCurrency(Math.abs(b.remaining_amount))}</strong>
              </span>
              <button class="fin-budget-edit-btn" data-catid="${b.category_id}" data-catname="${b.category_name}" data-limit="${b.limit_amount}">Ubah</button>
            </div>
          </div>
        `;
      }).join("");
    } else {
      cardsHtml = `<div class="fin-empty-state">
        <span style="font-size: 2.2rem;">🎯</span>
        <div style="font-weight: 700; margin-top: 8px;">Belum ada budget terpasang</div>
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">Pasang batas pengeluaran untuk memantau utilitas persentase di dashboard.</p>
      </div>`;
    }

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <div>
          <div style="font-weight: 800; font-size: 1rem;">Batas Anggaran (${this.currentPeriod})</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">Kendalikan pengeluaran bulanan per kategori</div>
        </div>
        <button class="fin-primary-btn" id="finBtnSetBudget">+ Set Budget</button>
      </div>
      <div class="fin-budgets-grid">${cardsHtml}</div>
    `;

    document.getElementById("finBtnSetBudget")?.addEventListener("click", () => this.openSetBudgetModal());

    container.querySelectorAll(".fin-budget-edit-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.openSetBudgetModal({
          category_id: btn.dataset.catid,
          category_name: btn.dataset.catname,
          limit_amount: btn.dataset.limit
        });
      });
    });
  },

  // --------------------------------------------------------------------------
  // 4. ACCOUNTS (REKENING & DOMPET)
  // --------------------------------------------------------------------------
  async renderAccounts() {
    const container = document.getElementById("finAccountsContent");
    if (!container) return;

    container.innerHTML = `<div class="fin-loading-indicator">Memuat rekening & dompet...</div>`;

    let accs = [];
    try {
      accs = await window.API.getFinAccounts();
    } catch (_) {}

    let cardsHtml = accs.map(a => `
      <div class="fin-account-card">
        <div class="fin-account-left">
          <span class="fin-acc-large-icon">${a.icon || '👛'}</span>
          <div>
            <div style="font-weight: 800; font-size: 1rem;">${a.name}</div>
            <div style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase;">${a.account_type} • ${a.currency}</div>
          </div>
        </div>
        <div class="fin-account-right">
          <div class="fin-account-bal-label">Saldo Saat Ini</div>
          <div class="fin-account-bal-val ${this.isPrivacyMasked ? 'nominal-masked' : ''}">${this.formatCurrency(a.balance)}</div>
        </div>
      </div>
    `).join("");

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <div>
          <div style="font-weight: 800; font-size: 1rem;">Daftar Akun Keuangan</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">Dompet tunai, rekening bank, dan e-wallet aktif</div>
        </div>
        <button class="fin-primary-btn" id="finBtnAddAccount">+ Tambah Akun</button>
      </div>
      <div class="fin-accounts-list">${cardsHtml}</div>
    `;

    document.getElementById("finBtnAddAccount")?.addEventListener("click", () => this.openAddAccountModal());
  },

  // --------------------------------------------------------------------------
  // 5. REMINDERS (TAGIHAN & JATUH TEMPO)
  // --------------------------------------------------------------------------
  async renderReminders() {
    const container = document.getElementById("finRemindersContent");
    if (!container) return;

    container.innerHTML = `<div class="fin-loading-indicator">Memuat jadwal tagihan...</div>`;

    let reminders = [];
    try {
      reminders = await window.API.getFinReminders();
    } catch (_) {}

    let listHtml = "";
    if (reminders.length > 0) {
      listHtml = reminders.map(r => {
        const isPaid = r.is_paid === 1;
        let dueClass = "is-normal";
        let dueLabel = `${r.days_until_due} hari lagi`;
        if (r.days_until_due === 0) dueLabel = "Hari ini!";
        else if (r.days_until_due < 0) {
          dueLabel = `Terlambat ${Math.abs(r.days_until_due)} hari`;
          dueClass = "is-overdue";
        }

        return `
          <div class="fin-reminder-item ${isPaid ? 'is-settled' : ''}">
            <div class="fin-rem-left">
              <span class="fin-rem-icon">${isPaid ? '✅' : '📅'}</span>
              <div>
                <div style="font-weight: 800; font-size: 0.95rem;">${r.title}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">
                  Jatuh tempo: ${r.due_date} • <span class="fin-due-badge ${dueClass}">${isPaid ? 'Lunas' : dueLabel}</span>
                </div>
              </div>
            </div>
            <div class="fin-rem-right">
              <div class="fin-rem-nominal ${this.isPrivacyMasked ? 'nominal-masked' : ''}">${this.formatCurrency(r.amount)}</div>
              ${!isPaid ? `<button class="fin-pay-btn" data-id="${r.id}">Bayar</button>` : `<span class="fin-settled-text">✓ Lunas</span>`}
            </div>
          </div>
        `;
      }).join("");
    } else {
      listHtml = `<div class="fin-empty-state">
        <span style="font-size: 2.2rem;">📅</span>
        <div style="font-weight: 700; margin-top: 8px;">Tidak ada tagihan mendatang</div>
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">Tambahkan jadwal tagihan listrik, internet, langganan, atau sewa.</p>
      </div>`;
    }

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <div>
          <div style="font-weight: 800; font-size: 1rem;">Pengingat Tagihan & Kewajiban</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">Jaga ketepatan pembayaran agar skor kewajiban tetap 100%</div>
        </div>
        <button class="fin-primary-btn" id="finBtnAddReminder">+ Buat Tagihan</button>
      </div>
      <div class="fin-reminders-list">${listHtml}</div>
    `;

    document.getElementById("finBtnAddReminder")?.addEventListener("click", () => this.openAddReminderModal());

    container.querySelectorAll(".fin-pay-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (confirm("Bayar tagihan ini sekarang? Transaksi pengeluaran akan dibuat otomatis.")) {
          try {
            await window.API.payFinReminder(id);
            this.renderReminders();
            window.OrbApp?.refreshExecutiveBrief();
          } catch (err) {
            alert(err.message || "Gagal memproses pembayaran tagihan.");
          }
        }
      });
    });
  },

  // --------------------------------------------------------------------------
  // 6. GOALS (TARGET TABUNGAN)
  // --------------------------------------------------------------------------
  async renderGoals() {
    const container = document.getElementById("finGoalsContent");
    if (!container) return;

    container.innerHTML = `<div class="fin-loading-indicator">Memuat target tabungan...</div>`;

    let goals = [];
    try {
      goals = await window.API.getFinGoals();
    } catch (_) {}

    let cardsHtml = "";
    if (goals.length > 0) {
      cardsHtml = goals.map(g => `
        <div class="fin-goal-card">
          <div class="fin-goal-head">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.3rem;">${g.icon || '🎯'}</span>
              <div style="font-weight: 800; font-size: 1rem;">${g.title}</div>
            </div>
            <span class="fin-goal-pct">${g.progress_pct}%</span>
          </div>

          <div class="fin-progress-bar-wrap">
            <div class="fin-progress-bar-fill" style="width: ${g.progress_pct}%; background: linear-gradient(90deg, #3B82F6, #10B981);"></div>
          </div>

          <div class="fin-goal-stats">
            <span class="fin-nominal ${this.isPrivacyMasked ? 'nominal-masked' : ''}">Terkumpul: ${this.formatCurrency(g.current_amount)}</span>
            <span class="fin-nominal ${this.isPrivacyMasked ? 'nominal-masked' : ''}">Target: ${this.formatCurrency(g.target_amount)}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
            <span style="font-size: 0.72rem; color: var(--text-secondary);">Target: ${g.target_date}</span>
            <button class="fin-deposit-btn" data-id="${g.id}" data-title="${g.title}">+ Setor</button>
          </div>
        </div>
      `).join("");
    } else {
      cardsHtml = `<div class="fin-empty-state">
        <span style="font-size: 2.2rem;">🏆</span>
        <div style="font-weight: 700; margin-top: 8px;">Belum ada target tabungan</div>
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">Pasang target dana darurat, liburan, atau pembelian aset masa depan.</p>
      </div>`;
    }

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <div>
          <div style="font-weight: 800; font-size: 1rem;">Target Tabungan & Aset</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">Pantau pertumbuhan akumulasi dana terencana</div>
        </div>
        <button class="fin-primary-btn" id="finBtnAddGoal">+ Target Baru</button>
      </div>
      <div class="fin-goals-grid">${cardsHtml}</div>
    `;

    document.getElementById("finBtnAddGoal")?.addEventListener("click", () => this.openAddGoalModal());

    container.querySelectorAll(".fin-deposit-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.openDepositGoalModal({ id: btn.dataset.id, title: btn.dataset.title });
      });
    });
  },

  // --------------------------------------------------------------------------
  // 7. REPORTS & CSV EXPORT (LAPORAN)
  // --------------------------------------------------------------------------
  async renderReports() {
    const container = document.getElementById("finReportsContent");
    if (!container) return;

    container.innerHTML = `<div class="fin-loading-indicator">Memuat laporan...</div>`;

    let sum = null;
    try {
      sum = await window.API.getFinSummary(this.currentPeriod);
    } catch (_) {}

    sum = sum || { total_income: 0, total_expense: 0, net_savings: 0, savings_rate_pct: 0, category_breakdown: [] };

    const exportUrl = window.API.getFinExportUrl(this.currentPeriod);

    let rowsHtml = sum.category_breakdown.map(c => `
      <tr>
        <td>${c.icon} ${c.name}</td>
        <td class="fin-nominal ${this.isPrivacyMasked ? 'nominal-masked' : ''}">${this.formatCurrency(c.amount)}</td>
        <td>${c.percentage}%</td>
      </tr>
    `).join("");

    if (!rowsHtml) {
      rowsHtml = `<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">Belum ada transaksi bulan ini</td></tr>`;
    }

    container.innerHTML = `
      <div class="fin-section-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <div style="font-weight: 800; font-size: 1rem;">Laporan Arus Kas (${this.currentPeriod})</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">Rangkuman pemasukan, pengeluaran, dan simpanan</div>
          </div>
          <a href="${exportUrl}" download class="fin-primary-btn" style="text-decoration: none;">📥 Ekspor CSV</a>
        </div>

        <div class="fin-report-kpis">
          <div class="fin-rep-stat">
            <span>Total Pemasukan</span>
            <strong class="fin-nominal is-income ${this.isPrivacyMasked ? 'nominal-masked' : ''}">${this.formatCurrency(sum.total_income)}</strong>
          </div>
          <div class="fin-rep-stat">
            <span>Total Pengeluaran</span>
            <strong class="fin-nominal is-expense ${this.isPrivacyMasked ? 'nominal-masked' : ''}">${this.formatCurrency(sum.total_expense)}</strong>
          </div>
          <div class="fin-rep-stat">
            <span>Simpanan Bersih</span>
            <strong class="fin-nominal ${this.isPrivacyMasked ? 'nominal-masked' : ''}">${this.formatCurrency(sum.net_savings)}</strong>
          </div>
        </div>

        <div style="margin-top: 18px;">
          <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 8px;">Rincian Pengeluaran per Kategori</div>
          <table class="fin-report-table">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Nominal</th>
                <th>Porsi</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>

        <div class="fin-collab-cta-card" style="margin-top: 18px; padding: 14px 16px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px;">
            <div style="font-weight: 700; font-size: 0.95rem; color: #60A5FA;">🤝 Kolaborasi dengan Welly</div>
            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">Kirim ringkasan laporan aktual ini ke Welly untuk evaluasi kapasitas kontribusi dan rekomendasi portofolio masa depan.</div>
          </div>
          <button class="fin-primary-btn" id="btnGoToWellyCollab" style="white-space: nowrap; background: #3B82F6;">Review Bersama Welly ↗</button>
        </div>
      </div>
    `;

    document.getElementById("btnGoToWellyCollab")?.addEventListener("click", () => {
      window.location.hash = "#welly";
      if (window.WellyWorkspace) {
        window.WellyWorkspace.switchSubtab("reviews");
      }
    });
  },

  // --------------------------------------------------------------------------
  // 8. TANYA FIN (DETERMINISTIC CONVERSATION)
  // --------------------------------------------------------------------------
  async renderChat() {
    const container = document.getElementById("finChatContent");
    if (!container) return;

    container.innerHTML = `
      <div class="fin-chat-wrapper">
        <div class="fin-chat-intro">
          <img src="./assets/avatar_fin_360.png" alt="Fin" class="fin-chat-plush-avatar" />
          <div style="font-weight: 800; font-size: 1.05rem; margin-top: 6px;">Tanya Fin</div>
          <p style="font-size: 0.8rem; color: var(--text-secondary); max-width: 320px; margin: 4px auto 0;">
            Konsultasikan angka pengeluaran, batas budget, tagihan jatuh tempo, atau saran arus kas Anda.
          </p>
        </div>

        <div class="fin-chat-chips-row">
          <button class="fin-chip-btn" data-msg="Berapa pengeluaran bulan ini?">💸 Pengeluaran bulan ini?</button>
          <button class="fin-chip-btn" data-msg="Bagaimana status budget?">🎯 Status budget?</button>
          <button class="fin-chip-btn" data-msg="Ada tagihan apa?">📅 Tagihan jatuh tempo?</button>
          <button class="fin-chip-btn" data-msg="Berapa total saldo?">💳 Total saldo kas?</button>
          <button class="fin-chip-btn" data-msg="Saran penghematan">💡 Saran Fin</button>
        </div>

        <div class="fin-chat-messages" id="finChatMessagesList">
          <div class="fin-bubble-bot">
            Halo! Saya Fin, spesialis keuangan pribadi Anda. Tanyakan apa saja tentang kondisi finansial Anda!
          </div>
        </div>

        <div class="fin-chat-input-bar">
          <input type="text" id="finChatTextInput" class="fin-chat-input" placeholder="Tanya pengeluaran, budget, atau tagihan..." />
          <button id="finChatSubmitBtn" class="fin-chat-send-btn">➤</button>
        </div>
      </div>
    `;

    const input = document.getElementById("finChatTextInput");
    const sendBtn = document.getElementById("finChatSubmitBtn");

    const doSend = async (text) => {
      const q = text || input?.value?.trim();
      if (!q) return;

      const list = document.getElementById("finChatMessagesList");
      if (list) {
        list.innerHTML += `<div class="fin-bubble-user">${q}</div>`;
        list.scrollTop = list.scrollHeight;
      }

      if (input) input.value = "";

      try {
        const res = await window.API.askFin(q);
        if (list) {
          list.innerHTML += `<div class="fin-bubble-bot">${res.answer}</div>`;
          list.scrollTop = list.scrollHeight;
        }
      } catch (err) {
        if (list) {
          list.innerHTML += `<div class="fin-bubble-bot">Fin sedang offline atau terjadi gangguan jaringan.</div>`;
        }
      }
    };

    sendBtn?.addEventListener("click", () => doSend());
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSend();
    });

    container.querySelectorAll(".fin-chip-btn").forEach(btn => {
      btn.addEventListener("click", () => doSend(btn.dataset.msg));
    });
  },

  // --------------------------------------------------------------------------
  // MODALS
  // --------------------------------------------------------------------------
  openAddTransactionModal(defaultType = "expense") {
    const modal = document.getElementById("genericOrbModal");
    const title = document.getElementById("genericModalTitle");
    const body = document.getElementById("genericModalBody");
    if (!modal || !body) return;

    title.textContent = "Catat Transaksi";

    const accOptions = this.activeAccounts.map(a => `<option value="${a.id}">${a.name} (${this.formatCurrency(a.balance)})</option>`).join("");
    const expCatOptions = this.categories.filter(c => c.type === 'expense').map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join("");
    const incCatOptions = this.categories.filter(c => c.type === 'income').map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join("");

    body.innerHTML = `
      <form id="finFormAddTx" style="display: flex; flex-direction: column; gap: 12px;">
        <div class="fin-form-group">
          <label class="fin-form-label">Tipe Transaksi</label>
          <div class="fin-type-toggle-row">
            <label><input type="radio" name="txType" value="expense" ${defaultType === 'expense' ? 'checked' : ''}> 💸 Pengeluaran</label>
            <label><input type="radio" name="txType" value="income" ${defaultType === 'income' ? 'checked' : ''}> 💰 Pemasukan</label>
            <label><input type="radio" name="txType" value="transfer"> ⇄ Transfer</label>
          </div>
        </div>

        <div class="fin-form-group">
          <label class="fin-form-label">Nominal (Rupiah murni)</label>
          <input type="number" name="amount" id="txAmountInput" class="fin-input" placeholder="Contoh: 50000" min="1" required />
        </div>

        <div class="fin-form-group">
          <label class="fin-form-label">Deskripsi / Keterangan</label>
          <input type="text" name="description" class="fin-input" placeholder="Contoh: Makan siang, Kopi, Beli buku" required />
        </div>

        <div class="fin-form-group" id="groupAccountSource">
          <label class="fin-form-label">Akun Pembayaran</label>
          <select name="accountId" class="fin-input" required>${accOptions}</select>
        </div>

        <div class="fin-form-group" id="groupAccountDest" style="display: none;">
          <label class="fin-form-label">Akun Tujuan Transfer</label>
          <select name="destAccountId" class="fin-input">${accOptions}</select>
        </div>

        <div class="fin-form-group" id="groupCategory">
          <label class="fin-form-label">Kategori</label>
          <select name="categoryId" class="fin-input" id="txCatSelect">${defaultType === 'income' ? incCatOptions : expCatOptions}</select>
        </div>

        <div class="fin-form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="fin-form-group">
            <label class="fin-form-label">Tanggal</label>
            <input type="date" name="date" class="fin-input" value="${new Date().toISOString().slice(0, 10)}" required />
          </div>
          <div class="fin-form-group">
            <label class="fin-form-label">Waktu</label>
            <input type="time" name="time" class="fin-input" value="${new Date().toTimeString().slice(0, 5)}" />
          </div>
        </div>

        <button type="submit" class="fin-submit-btn">Simpan Transaksi</button>
      </form>
    `;

    const form = document.getElementById("finFormAddTx");
    const radioTypes = form.querySelectorAll('input[name="txType"]');
    const groupDest = document.getElementById("groupAccountDest");
    const groupCat = document.getElementById("groupCategory");
    const catSelect = document.getElementById("txCatSelect");

    radioTypes.forEach(r => {
      r.addEventListener("change", () => {
        if (r.value === "transfer") {
          groupDest.style.display = "block";
          groupCat.style.display = "none";
        } else {
          groupDest.style.display = "none";
          groupCat.style.display = "block";
          catSelect.innerHTML = r.value === "income" ? incCatOptions : expCatOptions;
        }
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const tType = fd.get("txType");
      const amt = parseInt(fd.get("amount"), 10);
      const desc = fd.get("description");
      const accId = parseInt(fd.get("accountId"), 10);
      const destId = fd.get("destAccountId") ? parseInt(fd.get("destAccountId"), 10) : null;
      const catId = fd.get("categoryId") ? parseInt(fd.get("categoryId"), 10) : null;
      const dt = fd.get("date");
      const tm = fd.get("time") || "";

      if (!amt || amt <= 0) return alert("Nominal harus lebih besar dari 0");

      try {
        await window.API.createFinTransaction({
          type: tType,
          account_id: accId,
          destination_account_id: tType === "transfer" ? destId : null,
          category_id: tType !== "transfer" ? catId : null,
          amount: amt,
          description: desc,
          date: dt,
          time: tm
        });

        modal.classList.remove("active");
        modal.style.display = "none";

        this.renderCurrentSubtab();
        window.OrbApp?.refreshExecutiveBrief();
      } catch (err) {
        alert(err.message || "Gagal menyimpan transaksi");
      }
    });

    modal.classList.add("active");
    modal.style.display = "flex";
  },

  openSetBudgetModal(existing = null) {
    const modal = document.getElementById("genericOrbModal");
    const title = document.getElementById("genericModalTitle");
    const body = document.getElementById("genericModalBody");
    if (!modal || !body) return;

    title.textContent = existing ? `Ubah Batas Budget: ${existing.category_name}` : "Pasang Batas Budget Kategori";

    const catOptions = this.categories.filter(c => c.type === 'expense').map(c => `
      <option value="${c.id}" ${existing && existing.category_id == c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>
    `).join("");

    body.innerHTML = `
      <form id="finFormSetBudget" style="display: flex; flex-direction: column; gap: 12px;">
        <div class="fin-form-group">
          <label class="fin-form-label">Kategori Pengeluaran</label>
          <select name="categoryId" class="fin-input" ${existing ? 'disabled' : ''} required>${catOptions}</select>
        </div>

        <div class="fin-form-group">
          <label class="fin-form-label">Batas Anggaran Bulanan (Rupiah)</label>
          <input type="number" name="limitAmount" class="fin-input" placeholder="Contoh: 1500000" value="${existing ? existing.limit_amount : ''}" min="0" required />
        </div>

        <div class="fin-form-group">
          <label class="fin-form-label">Periode</label>
          <input type="text" name="period" class="fin-input" value="${this.currentPeriod}" readonly />
        </div>

        <button type="submit" class="fin-submit-btn">Simpan Batas Anggaran</button>
      </form>
    `;

    const form = document.getElementById("finFormSetBudget");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const catId = existing ? existing.category_id : parseInt(fd.get("categoryId"), 10);
      const limitAmt = parseInt(fd.get("limitAmount"), 10);

      try {
        await window.API.setFinBudget({
          category_id: catId,
          period: this.currentPeriod,
          limit_amount: limitAmt
        });

        modal.classList.remove("active");
        modal.style.display = "none";
        this.renderBudgets();
        window.OrbApp?.refreshExecutiveBrief();
      } catch (err) {
        alert(err.message || "Gagal menyetel budget");
      }
    });

    modal.classList.add("active");
    modal.style.display = "flex";
  },

  openAddAccountModal() {
    const modal = document.getElementById("genericOrbModal");
    const title = document.getElementById("genericModalTitle");
    const body = document.getElementById("genericModalBody");
    if (!modal || !body) return;

    title.textContent = "Tambah Rekening / Dompet Baru";

    body.innerHTML = `
      <form id="finFormAddAccount" style="display: flex; flex-direction: column; gap: 12px;">
        <div class="fin-form-group">
          <label class="fin-form-label">Nama Akun</label>
          <input type="text" name="name" class="fin-input" placeholder="Contoh: BCA Prioritas, GoPay, Dompet Saku" required />
        </div>

        <div class="fin-form-group">
          <label class="fin-form-label">Tipe Akun</label>
          <select name="accountType" class="fin-input">
            <option value="cash">👛 Dompet Tunai / Kas</option>
            <option value="bank">🏦 Rekening Bank</option>
            <option value="ewallet">📱 E-Wallet (GoPay, OVO, Dana)</option>
            <option value="investment">📈 Investasi / Sekuritas</option>
          </select>
        </div>

        <div class="fin-form-group">
          <label class="fin-form-label">Saldo Awal (Rupiah)</label>
          <input type="number" name="initialBalance" class="fin-input" placeholder="0" value="0" min="0" required />
          <span style="font-size: 0.7rem; color: var(--text-muted); margin-top: 3px;">Saldo awal tidak dihitung sebagai pemasukan.</span>
        </div>

        <button type="submit" class="fin-submit-btn">Buat Akun</button>
      </form>
    `;

    const form = document.getElementById("finFormAddAccount");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const accName = fd.get("name");
      const aType = fd.get("accountType");
      const initBal = parseInt(fd.get("initialBalance"), 10) || 0;

      let icon = "👛";
      if (aType === "bank") icon = "🏦";
      else if (aType === "ewallet") icon = "📱";
      else if (aType === "investment") icon = "📈";

      try {
        await window.API.createFinAccount({
          name: accName,
          account_type: aType,
          initial_balance: initBal,
          icon: icon
        });

        modal.classList.remove("active");
        modal.style.display = "none";
        this.renderAccounts();
        window.OrbApp?.refreshExecutiveBrief();
      } catch (err) {
        alert(err.message || "Gagal membuat akun");
      }
    });

    modal.classList.add("active");
    modal.style.display = "flex";
  },

  openAddReminderModal() {
    const modal = document.getElementById("genericOrbModal");
    const title = document.getElementById("genericModalTitle");
    const body = document.getElementById("genericModalBody");
    if (!modal || !body) return;

    title.textContent = "Buat Pengingat Tagihan";

    body.innerHTML = `
      <form id="finFormAddRem" style="display: flex; flex-direction: column; gap: 12px;">
        <div class="fin-form-group">
          <label class="fin-form-label">Nama Tagihan</label>
          <input type="text" name="title" class="fin-input" placeholder="Contoh: Listrik PLN, WiFi Indihome, Sewa Kantor" required />
        </div>

        <div class="fin-form-group">
          <label class="fin-form-label">Nominal (Rupiah)</label>
          <input type="number" name="amount" class="fin-input" placeholder="Contoh: 350000" min="1" required />
        </div>

        <div class="fin-form-group">
          <label class="fin-form-label">Tanggal Jatuh Tempo</label>
          <input type="date" name="dueDate" class="fin-input" value="${new Date().toISOString().slice(0, 10)}" required />
        </div>

        <div class="fin-form-group">
          <label class="fin-form-label">Frekuensi</label>
          <select name="frequency" class="fin-input">
            <option value="monthly">Bulanan</option>
            <option value="once">Sekali Bayar</option>
            <option value="weekly">Mingguan</option>
            <option value="yearly">Tahunan</option>
          </select>
        </div>

        <button type="submit" class="fin-submit-btn">Simpan Jadwal Tagihan</button>
      </form>
    `;

    const form = document.getElementById("finFormAddRem");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await window.API.createFinReminder({
          title: fd.get("title"),
          amount: parseInt(fd.get("amount"), 10),
          due_date: fd.get("dueDate"),
          frequency: fd.get("frequency")
        });

        modal.classList.remove("active");
        modal.style.display = "none";
        this.renderReminders();
        window.OrbApp?.refreshExecutiveBrief();
      } catch (err) {
        alert(err.message || "Gagal membuat pengingat tagihan");
      }
    });

    modal.classList.add("active");
    modal.style.display = "flex";
  },

  openAddGoalModal() {
    const modal = document.getElementById("genericOrbModal");
    const title = document.getElementById("genericModalTitle");
    const body = document.getElementById("genericModalBody");
    if (!modal || !body) return;

    title.textContent = "Buat Target Tabungan";

    body.innerHTML = `
      <form id="finFormAddGoal" style="display: flex; flex-direction: column; gap: 12px;">
        <div class="fin-form-group">
          <label class="fin-form-label">Nama Target</label>
          <input type="text" name="title" class="fin-input" placeholder="Contoh: Dana Darurat 6 Bulan, Laptop Baru" required />
        </div>

        <div class="fin-form-group">
          <label class="fin-form-label">Nominal Target (Rupiah)</label>
          <input type="number" name="targetAmount" class="fin-input" placeholder="Contoh: 15000000" min="1" required />
        </div>

        <div class="fin-form-group">
          <label class="fin-form-label">Terkumpul Saat Ini (Opsional)</label>
          <input type="number" name="currentAmount" class="fin-input" placeholder="0" value="0" min="0" />
        </div>

        <div class="fin-form-group">
          <label class="fin-form-label">Target Tanggal Selesai</label>
          <input type="date" name="targetDate" class="fin-input" value="${new Date(Date.now() + 90*86400000).toISOString().slice(0, 10)}" required />
        </div>

        <button type="submit" class="fin-submit-btn">Buat Target</button>
      </form>
    `;

    const form = document.getElementById("finFormAddGoal");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await window.API.createFinGoal({
          title: fd.get("title"),
          target_amount: parseInt(fd.get("targetAmount"), 10),
          current_amount: parseInt(fd.get("currentAmount"), 10) || 0,
          target_date: fd.get("targetDate")
        });

        modal.classList.remove("active");
        modal.style.display = "none";
        this.renderGoals();
        window.OrbApp?.refreshExecutiveBrief();
      } catch (err) {
        alert(err.message || "Gagal membuat target tabungan");
      }
    });

    modal.classList.add("active");
    modal.style.display = "flex";
  },

  openDepositGoalModal(goal) {
    const modal = document.getElementById("genericOrbModal");
    const title = document.getElementById("genericModalTitle");
    const body = document.getElementById("genericModalBody");
    if (!modal || !body) return;

    title.textContent = `Setor Tabungan: ${goal.title}`;

    const accOptions = this.activeAccounts.map(a => `<option value="${a.id}">${a.name} (${this.formatCurrency(a.balance)})</option>`).join("");

    body.innerHTML = `
      <form id="finFormDepositGoal" style="display: flex; flex-direction: column; gap: 12px;">
        <div class="fin-form-group">
          <label class="fin-form-label">Nominal Setoran (Rupiah)</label>
          <input type="number" name="amount" class="fin-input" placeholder="Contoh: 500000" min="1" required />
        </div>

        <div class="fin-form-group">
          <label class="fin-form-label">Potong dari Akun Sumber</label>
          <select name="sourceAccountId" class="fin-input">${accOptions}</select>
        </div>

        <button type="submit" class="fin-submit-btn">Konfirmasi Setoran</button>
      </form>
    `;

    const form = document.getElementById("finFormDepositGoal");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await window.API.depositFinGoal(goal.id, {
          amount: parseInt(fd.get("amount"), 10),
          source_account_id: parseInt(fd.get("sourceAccountId"), 10)
        });

        modal.classList.remove("active");
        modal.style.display = "none";
        this.renderGoals();
        window.OrbApp?.refreshExecutiveBrief();
      } catch (err) {
        alert(err.message || "Gagal menyetor tabungan");
      }
    });

    modal.classList.add("active");
    modal.style.display = "flex";
  },

  setupListeners() {
    document.getElementById("finPrivacyToggleBtn")?.addEventListener("click", () => this.togglePrivacyMask());
    document.getElementById("finBtnAddTx")?.addEventListener("click", () => this.openAddTransactionModal());
  }
};

window.FinWorkspace = FinWorkspace;
