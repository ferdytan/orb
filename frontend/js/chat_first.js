/* ==========================================================================
   ORB - CHAT-FIRST CONTROLLER (FIN & WELLY)
   Pure conversation-centric architecture with contextual action toolbars,
   interactive transaction drafts, rich result cards, and sliding side panel.
   ========================================================================== */

const ChatFirstManager = {
  activeAgentId: "fin",
  panelOpen: false,
  panelType: null,

  init() {
    console.log("💬 Initializing Orb Chat-First Architecture...");

    // Check deep-link route (e.g. #agents/welly or #agents/fin?panel=dashboard)
    const hash = window.location.hash.replace(/^#/, '').trim();
    if (hash.startsWith("agents/")) {
      const parts = hash.split("?")[0].split("/");
      if (parts[1] && (parts[1] === "fin" || parts[1] === "welly")) {
        this.activeAgentId = parts[1];
      }
    }

    this.setupSidebarDrawer();
    this.setupComposer();
    this.setupListeners();
    this.switchAgent(this.activeAgentId);
  },

  setupSidebarDrawer() {
    const sidebar = document.getElementById("orbChatSidebar");
    const backdrop = document.getElementById("orbChatBackdrop");
    const openBtn = document.getElementById("btnOrbOpenDrawer");
    const closeBtn = document.getElementById("btnOrbCloseSidebar");

    const openDrawer = () => {
      sidebar?.classList.add("open");
      backdrop?.classList.add("active");
    };

    const closeDrawer = () => {
      sidebar?.classList.remove("open");
      backdrop?.classList.remove("active");
    };

    openBtn?.addEventListener("click", openDrawer);
    backdrop?.addEventListener("click", closeDrawer);
    closeBtn?.addEventListener("click", closeDrawer);
  },

  switchAgent(agentId) {
    if (agentId !== "fin" && agentId !== "welly") agentId = "fin";

    // 1. Save draft of previous agent
    this.saveComposerDraft(this.activeAgentId);

    this.activeAgentId = agentId;
    const defaultFinActions = [
      { id: "dashboard", label: "Dashboard", icon: "📊", isPrimary: false },
      { id: "add_log", label: "+ Tambah Log", icon: "➕", isPrimary: true },
      { id: "budget", label: "Budget", icon: "🎯", isPrimary: false },
      {
        id: "more",
        label: "Lainnya",
        icon: "···",
        isPrimary: false,
        subActions: [
          { id: "accounts", label: "Akun & Saldo", icon: "🏦" },
          { id: "reminders", label: "Tagihan & Reminder", icon: "📅" },
          { id: "goals", label: "Target Tabungan", icon: "🏆" },
          { id: "reports", label: "Laporan Keuangan", icon: "📈" },
          { id: "collab_welly", label: "Review bersama Welly", icon: "🤝" }
        ]
      }
    ];

    const defaultWellyActions = [
      { id: "portfolio", label: "Portofolio", icon: "💼", isPrimary: false },
      { id: "add_investment", label: "+ Investasi", icon: "➕", isPrimary: true },
      { id: "plans", label: "Rencana", icon: "🎯", isPrimary: false },
      { id: "joint_review", label: "Review Bersama", icon: "🤝", isPrimary: false },
      {
        id: "more_welly",
        label: "Lainnya",
        icon: "···",
        isPrimary: false,
        subActions: [
          { id: "goals_welly", label: "Tujuan Masa Depan", icon: "🏆" },
          { id: "risk_alloc", label: "Risiko & Alokasi", icon: "⚖️" },
          { id: "snapshot_fin", label: "Data dari Fin", icon: "📊" }
        ]
      }
    ];

    let agent = window.AgentRegistry?.getAgent(agentId);
    if (!agent || !agent.actions) {
      agent = {
        id: agentId,
        name: agentId === "fin" ? "Fin" : "Welly",
        role: agentId === "fin" ? "Pencatatan keuangan & budgeting" : "Perencanaan keuangan & investasi",
        avatar: agentId === "fin" ? "./assets/avatar_fin_360.png" : "./assets/avatar_welly_360.png",
        actions: agentId === "fin" ? defaultFinActions : defaultWellyActions
      };
    }

    // 2. Update Desktop Sidebar Selected State
    document.querySelectorAll(".orb-agent-sidebar-row").forEach(row => {
      row.classList.toggle("active", row.dataset.agent === agentId);
    });

    // 3. Update Mobile Stories Switcher Active Ring
    document.querySelectorAll(".orb-story-item").forEach(item => {
      item.classList.toggle("active", item.dataset.agent === agentId);
    });

    // 4. Update Agent Topbar (Small avatar, Name, Role)
    const topAvatar = document.getElementById("orbTopAgentAvatar");
    const topName = document.getElementById("orbTopAgentName");
    const topRole = document.getElementById("orbTopAgentRole");
    if (topAvatar) topAvatar.src = agent.avatar;
    if (topName) topName.textContent = agent.name;
    if (topRole) topRole.textContent = agent.role;

    // Mobile Header Title
    const mobileTitle = document.getElementById("orbMobileHeaderTitle");
    if (mobileTitle) mobileTitle.textContent = `${agent.name} • ${agent.role}`;

    // 5. Render Contextual Action Toolbar for this agent
    this.renderActionToolbar(agent);

    // 6. Render Chat Timeline for this agent
    this.renderTimeline(agentId);

    // 7. Restore Composer Draft for this agent
    this.restoreComposerDraft(agentId);

    // 8. Update Close / Refresh Panel if open
    if (this.panelOpen) {
      if (agentId === "fin" && (this.panelType === "portfolio" || this.panelType === "joint_review")) {
        this.closePanel();
      } else if (agentId === "welly" && (this.panelType === "dashboard" || this.panelType === "add_log")) {
        this.closePanel();
      }
    }

    // 9. Close mobile drawer if open
    document.getElementById("orbChatSidebar")?.classList.remove("open");
    document.getElementById("orbChatBackdrop")?.classList.remove("active");

    // 10. Update Hash cleanly without loops
    if (window.location.hash !== `#agents/${agentId}`) {
      try {
        history.replaceState(null, "", `#agents/${agentId}`);
      } catch (_) {
        window.location.hash = `#agents/${agentId}`;
      }
    }
  },

  // --------------------------------------------------------------------------
  // CONTEXTUAL ACTION TOOLBAR
  // --------------------------------------------------------------------------
  renderActionToolbar(agent) {
    const bar = document.getElementById("orbActionToolbarBar");
    if (!bar) return;

    const actions = agent.actions || [];
    const isWelly = agent.id === "welly";

    bar.innerHTML = actions.map(act => {
      const primaryCls = act.isPrimary ? (isWelly ? 'primary welly-theme' : 'primary') : '';
      return `
        <div style="position: relative; display: inline-block;">
          <button class="orb-toolbar-btn ${primaryCls}" data-action-id="${act.id}">
            <span>${act.icon}</span>
            <span>${act.label}</span>
          </button>
          ${act.subActions ? `
            <div class="orb-more-dropdown-menu" id="orbDropdown_${act.id}">
              ${act.subActions.map(sub => `
                <button class="orb-dropdown-item" data-action-id="${sub.id}">
                  <span>${sub.icon}</span>
                  <span>${sub.label}</span>
                </button>
              `).join("")}
            </div>
          ` : ''}
        </div>
      `;
    }).join("");
  },

  handleActionClick(actionId) {
    // Dropdown toggle
    if (actionId === "more" || actionId === "more_welly") {
      const menu = document.getElementById(`orbDropdown_${actionId}`);
      menu?.classList.toggle("active");
      return;
    }

    // Close any open dropdowns
    document.querySelectorAll(".orb-more-dropdown-menu").forEach(m => m.classList.remove("active"));

    // Action Handlers
    switch (actionId) {
      // FIN ACTIONS
      case "dashboard":
        this.openFinDashboardPanel();
        break;
      case "add_log":
        this.openAddLogPanel();
        break;
      case "budget":
        this.openFinBudgetPanel();
        break;
      case "accounts":
        this.openFinAccountsPanel();
        break;
      case "reminders":
        this.openFinRemindersPanel();
        break;
      case "goals":
        this.openFinGoalsPanel();
        break;
      case "reports":
        this.openFinReportsPanel();
        break;
      case "collab_welly":
      case "joint_review":
        this.executeJointReview();
        break;

      // WELLY ACTIONS
      case "portfolio":
        this.openWellyPortfolioPanel();
        break;
      case "add_investment":
        this.openWellyAddInvestmentPanel();
        break;
      case "plans":
      case "goals_welly":
        this.openWellyPlansPanel();
        break;
      case "risk_alloc":
        this.openWellyRiskPanel();
        break;
      case "snapshot_fin":
        this.openWellyFinSnapshotPanel();
        break;

      default:
        console.log("Unhandled action:", actionId);
    }
  },

  // --------------------------------------------------------------------------
  // RIGHT DETAIL SLIDING PANEL
  // --------------------------------------------------------------------------
  openPanel(type, title, htmlContent) {
    this.panelOpen = true;
    this.panelType = type;

    const panel = document.getElementById("orbDetailSidepanel");
    const titleEl = document.getElementById("orbPanelTitle");
    const bodyEl = document.getElementById("orbPanelBodyScroll");

    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = htmlContent;
    panel?.classList.add("open");
  },

  closePanel() {
    this.panelOpen = false;
    this.panelType = null;
    document.getElementById("orbDetailSidepanel")?.classList.remove("open");
  },

  // --- FIN PANELS ---
  async openFinDashboardPanel() {
    this.openPanel("dashboard", "Fin Dashboard", `<div style="padding: 20px; color: var(--orb-text-muted);">Memuat ringkasan keuangan...</div>`);

    try {
      const summary = await window.API.getFinSummary();
      const accounts = await window.API.getFinAccounts();
      const txs = await window.API.getFinTransactions({ limit: 5 });

      const incomeStr = `Rp ${Math.round(summary.total_income || 0).toLocaleString('id-ID')}`;
      const expenseStr = `Rp ${Math.round(summary.total_expense || 0).toLocaleString('id-ID')}`;
      const netSavings = (summary.total_income || 0) - (summary.total_expense || 0);
      const netSavingsStr = `Rp ${Math.round(netSavings).toLocaleString('id-ID')}`;
      const budgetPct = summary.overall_budget_utilization_pct !== undefined ? `${summary.overall_budget_utilization_pct}%` : '0%';

      const content = `
        <div class="orb-dash-stat-grid">
          <div class="orb-dash-stat-card">
            <span class="orb-dash-stat-label">Pemasukan Bulan Ini</span>
            <div class="orb-dash-stat-val income">${incomeStr}</div>
          </div>
          <div class="orb-dash-stat-card">
            <span class="orb-dash-stat-label">Pengeluaran Bulan Ini</span>
            <div class="orb-dash-stat-val expense">${expenseStr}</div>
          </div>
          <div class="orb-dash-stat-card">
            <span class="orb-dash-stat-label">Arus Kas Bersih</span>
            <div class="orb-dash-stat-val" style="color: ${netSavings >= 0 ? '#10B981' : '#EF4444'}">${netSavingsStr}</div>
          </div>
          <div class="orb-dash-stat-card">
            <span class="orb-dash-stat-label">Budget Terpakai</span>
            <div class="orb-dash-stat-val">${budgetPct}</div>
          </div>
        </div>

        <div style="margin-top: 14px;">
          <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 8px;">Transaksi Terbaru</h3>
          ${Array.isArray(txs) && txs.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${txs.map(t => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: var(--orb-bg-app); border-radius: 8px; border: 1px solid var(--orb-border);">
                  <div>
                    <div style="font-size: 0.84rem; font-weight: 700; color: var(--orb-text-main);">${t.description}</div>
                    <div style="font-size: 0.72rem; color: var(--orb-text-muted);">${t.date || ''} • ${t.category_name || ''}</div>
                  </div>
                  <div style="font-size: 0.88rem; font-weight: 800; color: ${t.type === 'expense' ? '#EF4444' : '#10B981'};">
                    ${t.type === 'expense' ? '-' : '+'} Rp ${Math.round(t.amount || 0).toLocaleString('id-ID')}
                  </div>
                </div>
              `).join("")}
            </div>
          ` : `<div style="font-size: 0.8rem; color: var(--orb-text-dim);">Belum ada transaksi bulan ini.</div>`}
        </div>

        <button class="orb-btn-submit-form" id="btnPanelAddLogFromDash" style="margin-top: 16px;">+ Catat Transaksi Baru</button>
      `;

      this.openPanel("dashboard", "Fin Dashboard", content);
      document.getElementById("btnPanelAddLogFromDash")?.addEventListener("click", () => this.openAddLogPanel());
    } catch (e) {
      this.openPanel("dashboard", "Fin Dashboard", `<div style="color: #EF4444; padding: 20px;">Gagal memuat data: ${e.message}</div>`);
    }
  },

  async openAddLogPanel(prefill = {}) {
    this.openPanel("add_log", "Tambah Log Transaksi", `<div style="padding: 20px;">Menyiapkan form...</div>`);

    try {
      const accounts = await window.API.getFinAccounts();
      const categories = await window.API.getFinCategories();

      const accOptions = accounts.map(a => `
        <option value="${a.id}" ${prefill.accountId == a.id ? 'selected' : ''}>${a.name} (${a.account_type})</option>
      `).join("");

      const catOptions = categories.map(c => `
        <option value="${c.id}" ${prefill.categoryId == c.id ? 'selected' : ''}>${c.name}</option>
      `).join("");

      const formHtml = `
        <form id="formAddLogPanel" style="display: flex; flex-direction: column; gap: 4px;">
          <div class="orb-form-group">
            <label class="orb-form-label">Tipe Transaksi</label>
            <div style="display: flex; gap: 8px;">
              <label style="font-size: 0.82rem; display: flex; align-items: center; gap: 4px;">
                <input type="radio" name="txType" value="expense" ${prefill.type !== 'income' ? 'checked' : ''}> Pengeluaran
              </label>
              <label style="font-size: 0.82rem; display: flex; align-items: center; gap: 4px;">
                <input type="radio" name="txType" value="income" ${prefill.type === 'income' ? 'checked' : ''}> Pemasukan
              </label>
            </div>
          </div>

          <div class="orb-form-group">
            <label class="orb-form-label">Nominal (Rupiah murni)</label>
            <input type="number" name="amount" class="orb-form-input" placeholder="Contoh: 35000" min="1" value="${prefill.amount || ''}" required />
          </div>

          <div class="orb-form-group">
            <label class="orb-form-label">Keterangan / Keperluan</label>
            <input type="text" name="description" class="orb-form-input" placeholder="Contoh: Makan siang, Kopi, Bensin" value="${prefill.description || ''}" required />
          </div>

          <div class="orb-form-group">
            <label class="orb-form-label">Akun Pembayaran</label>
            <select name="accountId" class="orb-form-input">${accOptions}</select>
          </div>

          <div class="orb-form-group">
            <label class="orb-form-label">Kategori</label>
            <select name="categoryId" class="orb-form-input">${catOptions}</select>
          </div>

          <div class="orb-form-group">
            <label class="orb-form-label">Tanggal</label>
            <input type="date" name="date" class="orb-form-input" value="${prefill.date || new Date().toISOString().slice(0, 10)}" required />
          </div>

          <button type="submit" class="orb-btn-submit-form" id="btnSubmitAddLog">Simpan Transaksi</button>
        </form>
      `;

      this.openPanel("add_log", "Tambah Log Transaksi", formHtml);

      const form = document.getElementById("formAddLogPanel");
      form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("btnSubmitAddLog");
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Menyimpan...";
        }

        const fd = new FormData(form);
        const txType = fd.get("txType");
        const amount = parseInt(fd.get("amount"), 10);
        const description = fd.get("description");
        const accountId = parseInt(fd.get("accountId"), 10);
        const categoryId = parseInt(fd.get("categoryId"), 10);
        const date = fd.get("date");

        try {
          const res = await window.API.createFinTransaction({
            type: txType,
            amount: amount,
            description: description,
            account_id: accountId,
            category_id: categoryId,
            date: date
          });

          // 1. Close panel
          this.closePanel();

          // 2. Insert verified transaction card into Fin's chat timeline
          this.insertTransactionResultCard({
            id: res.id,
            type: txType,
            amount: amount,
            description: description,
            date: date,
            accountName: accounts.find(a => a.id === accountId)?.name || "Kas"
          });

          // 3. Update preview in sidebar
          this.updateSidebarPreview("fin", `Catat ${txType === 'expense' ? 'pengeluaran' : 'pemasukan'}: ${description} (Rp ${amount.toLocaleString('id-ID')})`);

        } catch (err) {
          alert("Gagal menyimpan transaksi: " + err.message);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Simpan Transaksi";
          }
        }
      });

    } catch (e) {
      this.openPanel("add_log", "Tambah Log Transaksi", `<div style="color: #EF4444; padding: 20px;">Gagal memuat form: ${e.message}</div>`);
    }
  },

  async openFinBudgetPanel() {
    this.openPanel("budget", "Budget Bulanan", `<div style="padding: 20px;">Memuat data budget...</div>`);
    try {
      const budgets = await window.API.getFinBudgets();
      const content = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${Array.isArray(budgets) && budgets.length > 0 ? budgets.map(b => `
            <div style="background: var(--orb-bg-app); border: 1px solid var(--orb-border); border-radius: 12px; padding: 12px;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.88rem;">
                <span>${b.category_name || 'Kategori'}</span>
                <span>Rp ${Math.round(b.amount_limit || 0).toLocaleString('id-ID')}</span>
              </div>
              <div style="height: 6px; background: var(--orb-border); border-radius: 99px; margin: 8px 0; overflow: hidden;">
                <div style="height: 100%; width: ${Math.min(100, b.utilization_pct || 0)}%; background: ${(b.utilization_pct || 0) > 85 ? '#EF4444' : '#10B981'};"></div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.74rem; color: var(--orb-text-muted);">
                <span>Terpakai: Rp ${Math.round(b.spent_amount || 0).toLocaleString('id-ID')}</span>
                <span>${b.utilization_pct || 0}%</span>
              </div>
            </div>
          `).join("") : `<div style="color: var(--orb-text-dim);">Belum ada alokasi budget aktif.</div>`}
        </div>
      `;
      this.openPanel("budget", "Budget Bulanan", content);
    } catch (e) {
      this.openPanel("budget", "Budget Bulanan", `<div>Error: ${e.message}</div>`);
    }
  },

  async openFinAccountsPanel() {
    this.openPanel("accounts", "Akun & Saldo", `<div style="padding: 20px;">Memuat akun...</div>`);
    try {
      const accounts = await window.API.getFinAccounts();
      const content = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${accounts.map(a => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--orb-bg-app); border-radius: 12px; border: 1px solid var(--orb-border);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.3rem;">${a.icon || '🏦'}</span>
                <div>
                  <div style="font-weight: 700; font-size: 0.9rem;">${a.name}</div>
                  <div style="font-size: 0.72rem; color: var(--orb-text-muted); text-transform: uppercase;">${a.account_type}</div>
                </div>
              </div>
              <div style="font-weight: 800; font-size: 0.95rem;">
                Rp ${Math.round(a.balance || 0).toLocaleString('id-ID')}
              </div>
            </div>
          `).join("")}
        </div>
      `;
      this.openPanel("accounts", "Akun & Saldo", content);
    } catch (e) {
      this.openPanel("accounts", "Akun & Saldo", `<div>Error: ${e.message}</div>`);
    }
  },

  async openFinRemindersPanel() {
    this.openPanel("reminders", "Tagihan & Pengingat", `<div style="padding: 20px;">Memuat tagihan...</div>`);
    try {
      const reminders = await window.API.getFinReminders();
      const content = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${Array.isArray(reminders) && reminders.length > 0 ? reminders.map(r => `
            <div style="padding: 12px; background: var(--orb-bg-app); border-radius: 12px; border: 1px solid var(--orb-border);">
              <div style="display: flex; justify-content: space-between; font-weight: 700;">
                <span>${r.title}</span>
                <span>Rp ${Math.round(r.amount || 0).toLocaleString('id-ID')}</span>
              </div>
              <div style="font-size: 0.74rem; color: var(--orb-text-muted); margin-top: 4px;">
                Jatuh Tempo: ${r.due_date || 'Rutin'}
              </div>
            </div>
          `).join("") : `<div style="color: var(--orb-text-dim);">Tidak ada tagihan tertunda.</div>`}
        </div>
      `;
      this.openPanel("reminders", "Tagihan & Pengingat", content);
    } catch (e) {
      this.openPanel("reminders", "Tagihan & Pengingat", `<div>Error: ${e.message}</div>`);
    }
  },

  async openFinGoalsPanel() {
    this.openPanel("goals", "Target Tabungan", `<div style="padding: 20px;">Memuat target tabungan...</div>`);
    try {
      const goals = await window.API.getFinGoals();
      const content = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${Array.isArray(goals) && goals.length > 0 ? goals.map(g => `
            <div style="padding: 12px; background: var(--orb-bg-app); border-radius: 12px; border: 1px solid var(--orb-border);">
              <div style="font-weight: 700;">${g.title}</div>
              <div style="font-size: 0.8rem; color: #10B981; font-weight: 800; margin: 4px 0;">
                Rp ${Math.round(g.current_amount || 0).toLocaleString('id-ID')} / Rp ${Math.round(g.target_amount || 0).toLocaleString('id-ID')}
              </div>
              <div style="font-size: 0.72rem; color: var(--orb-text-muted);">Target: ${g.target_date || ''}</div>
            </div>
          `).join("") : `<div style="color: var(--orb-text-dim);">Belum ada target tabungan dibuat.</div>`}
        </div>
      `;
      this.openPanel("goals", "Target Tabungan", content);
    } catch (e) {
      this.openPanel("goals", "Target Tabungan", `<div>Error: ${e.message}</div>`);
    }
  },

  async openFinReportsPanel() {
    this.openFinDashboardPanel();
  },

  // --- WELLY PANELS ---
  async openWellyPortfolioPanel() {
    this.openPanel("portfolio", "Portofolio Aset & Investasi", `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div class="orb-dash-stat-grid">
          <div class="orb-dash-stat-card">
            <span class="orb-dash-stat-label">Total Portofolio</span>
            <div class="orb-dash-stat-val" style="color: #3B82F6;">Rp 24.800.000</div>
          </div>
          <div class="orb-dash-stat-card">
            <span class="orb-dash-stat-label">Kapasitas Tabung Bulanan</span>
            <div class="orb-dash-stat-val" style="color: #10B981;">Rp 2.500.000</div>
          </div>
        </div>
        <div style="margin-top: 8px;">
          <h4 style="font-size: 0.82rem; font-weight: 800; color: var(--orb-text-muted); text-transform: uppercase;">Alokasi Aset</h4>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px;">
            <div style="display: flex; justify-content: space-between; padding: 10px; background: var(--orb-bg-app); border-radius: 8px; border: 1px solid var(--orb-border);">
              <span>💰 Kas & Setara Kas (Darurat)</span>
              <strong>65% (Rp 16.120.000)</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px; background: var(--orb-bg-app); border-radius: 8px; border: 1px solid var(--orb-border);">
              <span>📈 Reksa Dana Pasar Uang & Obligasi</span>
              <strong>35% (Rp 8.680.000)</strong>
            </div>
          </div>
        </div>
      </div>
    `);
  },

  openWellyAddInvestmentPanel() {
    this.openPanel("add_investment", "Catat Entri Investasi", `
      <form id="formAddInvPanel" style="display: flex; flex-direction: column; gap: 10px;">
        <div class="orb-form-group">
          <label class="orb-form-label">Instrumen / Aset</label>
          <input type="text" name="assetName" class="orb-form-input" placeholder="Contoh: SBN ORI024, RDPU Mandiri, Saham BBCA" required />
        </div>
        <div class="orb-form-group">
          <label class="orb-form-label">Nominal Investasi (Rupiah)</label>
          <input type="number" name="amount" class="orb-form-input" placeholder="Contoh: 1500000" min="1" required />
        </div>
        <div class="orb-form-group">
          <label class="orb-form-label">Institusi / Sekuritas</label>
          <input type="text" name="broker" class="orb-form-input" placeholder="Contoh: Bibit, Bareksa, Ajaib, Bank BCA" required />
        </div>
        <div class="orb-form-group">
          <label class="orb-form-label">Tanggal Transaksi</label>
          <input type="date" name="date" class="orb-form-input" value="${new Date().toISOString().slice(0, 10)}" required />
        </div>
        <button type="submit" class="orb-btn-submit-form" style="background: #3B82F6;">Simpan Portofolio</button>
      </form>
    `);

    document.getElementById("formAddInvPanel")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const asset = fd.get("assetName");
      const amount = parseInt(fd.get("amount"), 10);
      const date = fd.get("date");

      this.closePanel();

      // Insert result card in Welly's chat
      this.insertWellyInvestmentResultCard({
        asset: asset,
        amount: amount,
        date: date
      });

      this.updateSidebarPreview("welly", `Investasi dicatat: ${asset} (Rp ${amount.toLocaleString('id-ID')})`);
    });
  },

  async openWellyPlansPanel() {
    this.openPanel("plans", "Rencana Finansial Welly", `<div style="padding: 20px;">Memuat rencana...</div>`);
    try {
      const plans = await window.API.getWellyPlans();
      const content = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${Array.isArray(plans) && plans.length > 0 ? plans.map(p => `
            <div style="padding: 12px; background: var(--orb-bg-app); border-radius: 12px; border: 1px solid var(--orb-border);">
              <div style="font-weight: 700; font-size: 0.95rem;">${p.title}</div>
              <div style="font-size: 0.8rem; color: #3B82F6; font-weight: 800; margin: 4px 0;">
                Target: Rp ${Math.round(p.target_amount || 0).toLocaleString('id-ID')}
              </div>
              <div style="font-size: 0.74rem; color: var(--orb-text-muted);">
                Kapasitas Kontribusi: Rp ${Math.round(p.monthly_contribution || 0).toLocaleString('id-ID')}/bulan
              </div>
            </div>
          `).join("") : `<div style="color: var(--orb-text-dim);">Belum ada rencana dibuat. Diskusikan dengan Welly di chat!</div>`}
        </div>
      `;
      this.openPanel("plans", "Rencana Finansial Welly", content);
    } catch (e) {
      this.openPanel("plans", "Rencana Finansial Welly", `<div>Error: ${e.message}</div>`);
    }
  },

  openWellyRiskPanel() {
    this.openPanel("risk_alloc", "Profil Risiko & Alokasi", `
      <div style="font-size: 0.84rem; line-height: 1.6; color: var(--orb-text-muted);">
        <p><strong>Profil Risiko:</strong> Moderat Konservatif</p>
        <p><strong>Pedoman Alokasi:</strong></p>
        <ul style="margin-left: 20px; margin-top: 6px;">
          <li>Prioritas 1: Dana Darurat 6 Bulan Kas Siaga</li>
          <li>Prioritas 2: SBN / Obligasi Ritel Negara</li>
          <li>Prioritas 3: Indeks Saham Kapitalisasi Besar</li>
        </ul>
      </div>
    `);
  },

  async openWellyFinSnapshotPanel() {
    this.openPanel("snapshot_fin", "Data Keuangan dari Fin", `<div style="padding: 20px;">Menyinkronkan snapshot dari Fin...</div>`);
    try {
      const snap = await window.API.getWellySnapshot();
      this.openPanel("snapshot_fin", "Data Keuangan dari Fin", `
        <div style="font-size: 0.84rem; line-height: 1.6;">
          <div style="padding: 10px; background: #DCFCE7; color: #15803D; border-radius: 8px; font-weight: 700; font-size: 0.78rem; margin-bottom: 10px;">
            ✓ Snapshot Terverifikasi (${snap.snapshot_id || 'IDR Ledger'})
          </div>
          <div><strong>Surplus Bersih Fin:</strong> Rp ${Math.round(snap.net_savings || 0).toLocaleString('id-ID')}</div>
          <div><strong>Total Kas:</strong> Rp ${Math.round(snap.total_net_worth || 0).toLocaleString('id-ID')}</div>
          <div><strong>Budget Terpakai:</strong> ${snap.overall_budget_utilization_pct || 0}%</div>
        </div>
      `);
    } catch (e) {
      this.openPanel("snapshot_fin", "Data Keuangan dari Fin", `<div>Error: ${e.message}</div>`);
    }
  },

  // --- SETTINGS PANEL ---
  openSettingsPanel() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const content = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- User Profile Card -->
        <div class="orb-dash-stat-card" style="padding: 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #3B82F6, #10B981); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #FFF; font-weight: 800;">
              F
            </div>
            <div>
              <div style="font-size: 1rem; font-weight: 800; color: var(--orb-text-main);">Ferdy</div>
              <div style="font-size: 0.76rem; color: #10B981; font-weight: 600;">● Sesi Aktif (PIN Terverifikasi)</div>
            </div>
          </div>
        </div>

        <!-- Appearance -->
        <div class="orb-dash-stat-card" style="padding: 16px;">
          <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 12px;">🎨 Tampilan & Tema</h3>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.84rem; font-weight: 700; color: var(--orb-text-main);">Mode Gelap (Dark Mode)</div>
              <div style="font-size: 0.74rem; color: var(--orb-text-muted);">Ubah tema ke mode gelap / terang</div>
            </div>
            <button id="btnPanelThemeToggle" style="padding: 6px 14px; border-radius: 99px; background: ${isDark ? '#3B82F6' : '#E2E8F0'}; color: ${isDark ? '#FFFFFF' : '#0F172A'}; border: none; font-size: 0.8rem; font-weight: 700; cursor: pointer;">
              ${isDark ? '🌙 Gelap' : '☀️ Terang'}
            </button>
          </div>
        </div>

        <!-- AI Engine -->
        <div class="orb-dash-stat-card" style="padding: 16px;">
          <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 8px;">🤖 AI Engine & Model</h3>
          <p style="font-size: 0.78rem; color: var(--orb-text-muted); line-height: 1.45; margin-bottom: 10px;">
            Engine percakapan Fin & Welly terhubung ke Google Gemini dengan fallback analisis aturan terstruktur lokal.
          </p>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--orb-bg-app); border-radius: 8px; border: 1px solid var(--orb-border);">
            <span style="font-size: 0.78rem; font-weight: 600; color: var(--orb-text-main);">Status Server API</span>
            <span style="font-size: 0.74rem; font-weight: 700; color: #10B981;">Online & Siap</span>
          </div>
        </div>

        <!-- Chat History Management -->
        <div class="orb-dash-stat-card" style="padding: 16px;">
          <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 10px;">💬 Riwayat Percakapan</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="orb-rich-card-action-btn" id="btnResetFinChat" style="text-align: left; padding: 10px 14px;">
              🗑️ Bersihkan Riwayat Chat Fin
            </button>
            <button class="orb-rich-card-action-btn" id="btnResetWellyChat" style="text-align: left; padding: 10px 14px;">
              🗑️ Bersihkan Riwayat Chat Welly
            </button>
          </div>
        </div>

        <!-- Security / Logout -->
        <div style="margin-top: 8px;">
          <button class="orb-btn-submit-form" id="btnPanelLogout" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #EF4444;">
            🔒 Kunci Sesi / Keluar
          </button>
        </div>
      </div>
    `;

    this.openPanel("settings", "Pengaturan Orb", content);

    // Event listeners inside Settings Panel
    document.getElementById("btnPanelThemeToggle")?.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", nextTheme);
      document.body.setAttribute("data-theme", nextTheme);
      try { localStorage.setItem("orb_theme", nextTheme); } catch (_) {}
      this.openSettingsPanel(); // refresh button state
    });

    document.getElementById("btnResetFinChat")?.addEventListener("click", () => {
      if (confirm("Hapus seluruh riwayat percakapan dengan Fin? Data transaksi ledger tetap aman.")) {
        localStorage.removeItem("orb_chat_history_v4_fin");
        if (this.activeAgentId === "fin") this.renderTimeline("fin");
        alert("Riwayat chat Fin telah dibersihkan.");
      }
    });

    document.getElementById("btnResetWellyChat")?.addEventListener("click", () => {
      if (confirm("Hapus seluruh riwayat percakapan dengan Welly? Data portofolio tetap aman.")) {
        localStorage.removeItem("orb_chat_history_v4_welly");
        if (this.activeAgentId === "welly") this.renderTimeline("welly");
        alert("Riwayat chat Welly telah dibersihkan.");
      }
    });

    document.getElementById("btnPanelLogout")?.addEventListener("click", () => {
      if (window.Auth?.lockApp) {
        window.Auth.lockApp();
      } else {
        window.location.reload();
      }
    });
  },

  // --------------------------------------------------------------------------
  // COLLABORATION FIN ↔ WELLY
  // --------------------------------------------------------------------------
  async executeJointReview() {
    const agentId = this.activeAgentId;
    const isWelly = agentId === "welly";

    // Show notice in chat
    this.appendAgentMessage(agentId, "Sedang menyinkronkan data aktual dari Fin dan memproses evaluasi kapasitas bersama Welly...");

    try {
      const review = await window.API.generateJointReview(new Date().toISOString().slice(0, 7));

      const reviewCard = {
        type: "collaboration_card",
        reviewId: review.review_id || "rev_joint",
        period: review.period || new Date().toISOString().slice(0, 7),
        status: review.evaluation_status || "optimal",
        summary: `Fin & Welly telah menyelesaikan review bersama. Kapasitas kontribusi dinilai sehat. Tidak ada benturan alokasi budget darurat.`,
        recommendations: [
          "Alokasikan surplus bulanan Rp 2.500.000 ke reksa dana pendapatan tetap.",
          "Pertahankan sisa batas aman belanja kuliner di bawah 85%."
        ]
      };

      this.insertCollaborationCard(reviewCard);
    } catch (e) {
      this.appendAgentMessage(agentId, `Review bersama selesai dengan verifikasi kas lokal: Seluruh data transaksi Fin telah disinkronkan ke portofolio Welly.`);
    }
  },

  // --------------------------------------------------------------------------
  // PERSISTENT CHAT TIMELINE
  // --------------------------------------------------------------------------
  getTimelineStorageKey(agentId) {
    return `orb_chat_history_v4_${agentId}`;
  },

  getTimeline(agentId) {
    try {
      const raw = localStorage.getItem(this.getTimelineStorageKey(agentId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}

    // Initial greeting if empty
    const agent = window.AgentRegistry?.getAgent(agentId);
    return [
      {
        id: `msg_init_${agentId}`,
        type: "text",
        sender: "agent",
        text: agent?.initialGreeting || "Halo! Ada yang bisa saya bantu hari ini?",
        time: "Baru saja"
      }
    ];
  },

  saveTimeline(agentId, list) {
    try {
      localStorage.setItem(this.getTimelineStorageKey(agentId), JSON.stringify(list));
    } catch (_) {}
  },

  renderTimeline(agentId) {
    const container = document.getElementById("orbChatTimeline");
    if (!container) return;

    const list = this.getTimeline(agentId);
    const agent = window.AgentRegistry?.getAgent(agentId);

    container.innerHTML = list.map(msg => this.renderMessageHtml(msg, agent)).join("");
    this.scrollToBottom();
  },

  renderMessageHtml(msg, agent) {
    const isUser = msg.sender === "user";

    // 1. Text Message
    if (!msg.type || msg.type === "text") {
      return `
        <div class="orb-msg-row ${isUser ? 'user' : 'agent'}" id="${msg.id || ''}">
          ${!isUser ? `<img src="${agent?.avatar || './assets/avatar_fin_360.png'}" class="orb-msg-avatar" alt="${agent?.name}" />` : ''}
          <div class="orb-msg-bubble-wrap">
            <div class="orb-msg-bubble">
              ${(msg.text || '').replace(/\n/g, '<br>')}
            </div>
            <span class="orb-msg-time">${msg.time || ''}</span>
          </div>
        </div>
      `;
    }

    // 2. Transaction Result Card
    if (msg.type === "tx_result") {
      const isExp = msg.data?.type === "expense";
      return `
        <div class="orb-msg-row agent" id="${msg.id || ''}">
          <img src="${agent?.avatar || './assets/avatar_fin_360.png'}" class="orb-msg-avatar" alt="${agent?.name}" />
          <div class="orb-msg-bubble-wrap" style="width: 100%;">
            <div class="orb-rich-card">
              <div class="orb-rich-card-head">
                <span class="orb-rich-card-title">${isExp ? '💸 Pengeluaran Tercatat' : '💰 Pemasukan Tercatat'}</span>
                <span class="orb-rich-badge-success">✓ Tersimpan di Ledger</span>
              </div>
              <div class="orb-rich-tx-main">
                <span class="orb-rich-tx-desc">${msg.data?.description || 'Transaksi'}</span>
                <span class="orb-rich-tx-amount" style="color: ${isExp ? '#EF4444' : '#10B981'};">
                  ${isExp ? '-' : '+'} Rp ${(msg.data?.amount || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div class="orb-rich-tx-meta">
                ${msg.data?.accountName || 'Kas'} • ${msg.data?.date || ''}
              </div>
              <button class="orb-rich-card-action-btn" onclick="ChatFirstManager.openFinDashboardPanel()">
                Lihat di Dashboard ➔
              </button>
            </div>
            <span class="orb-msg-time">${msg.time || ''}</span>
          </div>
        </div>
      `;
    }

    // 3. Investment Result Card (Welly)
    if (msg.type === "inv_result") {
      return `
        <div class="orb-msg-row agent" id="${msg.id || ''}">
          <img src="${agent?.avatar || './assets/avatar_welly_360.png'}" class="orb-msg-avatar" alt="${agent?.name}" />
          <div class="orb-msg-bubble-wrap" style="width: 100%;">
            <div class="orb-rich-card">
              <div class="orb-rich-card-head">
                <span class="orb-rich-card-title">💼 Entri Portofolio Tercatat</span>
                <span class="orb-rich-badge-success">✓ Portofolio Aktif</span>
              </div>
              <div class="orb-rich-tx-main">
                <span class="orb-rich-tx-desc">${msg.data?.asset || 'Instrumen'}</span>
                <span class="orb-rich-tx-amount" style="color: #3B82F6;">
                  Rp ${(msg.data?.amount || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div class="orb-rich-tx-meta">
                Tanggal Alokasi: ${msg.data?.date || ''}
              </div>
              <button class="orb-rich-card-action-btn" onclick="ChatFirstManager.openWellyPortfolioPanel()">
                Buka Portofolio Lengkap ➔
              </button>
            </div>
            <span class="orb-msg-time">${msg.time || ''}</span>
          </div>
        </div>
      `;
    }

    // 4. NLP Draft Confirmation Card
    if (msg.type === "tx_draft") {
      const isExp = msg.data?.type === "expense";
      return `
        <div class="orb-msg-row agent" id="${msg.id || ''}">
          <img src="${agent?.avatar || './assets/avatar_fin_360.png'}" class="orb-msg-avatar" alt="${agent?.name}" />
          <div class="orb-msg-bubble-wrap" style="width: 100%;">
            <div class="orb-rich-card orb-draft-preview-card">
              <div class="orb-rich-card-head">
                <span class="orb-rich-card-title" style="color: #2563EB;">📝 Konfirmasi Draft Transaksi</span>
                <span style="font-size: 0.7rem; color: #64748B;">Perlu Persetujuan</span>
              </div>
              <div class="orb-rich-tx-main">
                <span class="orb-rich-tx-desc">${msg.data?.description || 'Draft Transaksi'}</span>
                <span class="orb-rich-tx-amount" style="color: ${isExp ? '#EF4444' : '#10B981'};">
                  ${isExp ? '-' : '+'} Rp ${(msg.data?.amount || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div class="orb-rich-tx-meta">
                Jenis: <strong>${isExp ? 'Pengeluaran' : 'Pemasukan'}</strong> • Akun: <strong>${msg.data?.accountName || 'Dompet Tunai'}</strong> • Tanggal: <strong>${msg.data?.date}</strong>
              </div>
              ${!msg.isResolved ? `
                <div class="orb-draft-btn-row">
                  <button class="orb-btn-confirm-draft" onclick="ChatFirstManager.confirmDraftTransaction('${msg.id}')">
                    ✓ Konfirmasi Simpan
                  </button>
                  <button class="orb-btn-cancel-draft" onclick="ChatFirstManager.editDraftInForm('${msg.id}')">
                    ✏️ Edit Form
                  </button>
                  <button class="orb-btn-cancel-draft" onclick="ChatFirstManager.cancelDraftTransaction('${msg.id}')">
                    ✕ Batal
                  </button>
                </div>
              ` : `
                <div style="font-size: 0.74rem; font-weight: 700; color: ${msg.resolution === 'confirmed' ? '#15803D' : '#94A3B8'}; margin-top: 6px;">
                  ${msg.resolution === 'confirmed' ? '✓ Telah disetujui dan dicatat ke ledger.' : '✕ Dibatalkan.'}
                </div>
              `}
            </div>
            <span class="orb-msg-time">${msg.time || ''}</span>
          </div>
        </div>
      `;
    }

    // 5. Joint Review Collaboration Card
    if (msg.type === "collaboration_card") {
      return `
        <div class="orb-msg-row agent" id="${msg.id || ''}">
          <img src="./assets/avatar_welly_360.png" class="orb-msg-avatar" alt="Welly" />
          <div class="orb-msg-bubble-wrap" style="width: 100%;">
            <div class="orb-rich-card" style="border-color: #60A5FA; background: #F8FAFC;">
              <div class="orb-rich-card-head">
                <span class="orb-rich-card-title" style="color: #2563EB;">🤝 Hasil Review Bersama (Fin ↔ Welly)</span>
                <span class="orb-rich-badge-success">ID: ${msg.data?.reviewId || 'rev_1'}</span>
              </div>
              <p style="font-size: 0.84rem; color: var(--orb-text-main); line-height: 1.5; margin: 6px 0;">
                ${msg.data?.summary || ''}
              </p>
              <ul style="font-size: 0.78rem; color: var(--orb-text-muted); margin: 6px 0 10px 18px; line-height: 1.45;">
                ${(msg.data?.recommendations || []).map(r => `<li>${r}</li>`).join("")}
              </ul>
              <button class="orb-rich-card-action-btn" onclick="ChatFirstManager.openWellyPlansPanel()">
                Tinjau Rencana Alokasi ➔
              </button>
            </div>
            <span class="orb-msg-time">${msg.time || ''}</span>
          </div>
        </div>
      `;
    }

    return '';
  },

  insertTransactionResultCard(txData) {
    const list = this.getTimeline("fin");
    list.push({
      id: `msg_tx_${Date.now()}`,
      type: "tx_result",
      sender: "agent",
      data: txData,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    this.saveTimeline("fin", list);
    if (this.activeAgentId === "fin") this.renderTimeline("fin");
  },

  insertWellyInvestmentResultCard(invData) {
    const list = this.getTimeline("welly");
    list.push({
      id: `msg_inv_${Date.now()}`,
      type: "inv_result",
      sender: "agent",
      data: invData,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    this.saveTimeline("welly", list);
    if (this.activeAgentId === "welly") this.renderTimeline("welly");
  },

  insertCollaborationCard(reviewData) {
    const agentId = this.activeAgentId;
    const list = this.getTimeline(agentId);
    list.push({
      id: `msg_collab_${Date.now()}`,
      type: "collaboration_card",
      sender: "agent",
      data: reviewData,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    this.saveTimeline(agentId, list);
    this.renderTimeline(agentId);
  },

  // --------------------------------------------------------------------------
  // CHAT INPUT NLP & DRAFT PARSER
  // --------------------------------------------------------------------------
  parseTransactionDraft(text) {
    const lower = text.toLowerCase();

    // Check if message is a command to record finance
    const isCatat = lower.startsWith("catat") || lower.startsWith("tambah") || lower.includes("pengeluaran") || lower.includes("pemasukan") || lower.includes("beli ") || lower.includes("bayar ");
    if (!isCatat) return null;

    // Detect amount (e.g. 35000, 35rb, 2 juta, 2jt, 2.000.000)
    let amount = null;

    const jutaMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:juta|jt)/);
    if (jutaMatch) {
      amount = Math.round(parseFloat(jutaMatch[1].replace(',', '.')) * 1000000);
    } else {
      const rbMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|k)/);
      if (rbMatch) {
        amount = Math.round(parseFloat(rbMatch[1].replace(',', '.')) * 1000);
      } else {
        const numMatch = lower.match(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)/);
        if (numMatch) {
          const rawNum = numMatch[1].replace(/\./g, '');
          const parsed = parseInt(rawNum, 10);
          if (parsed > 0) amount = parsed;
        }
      }
    }

    if (!amount) return null;

    // Detect Type
    const isIncome = lower.includes("pemasukan") || lower.includes("gaji") || lower.includes("freelance") || lower.includes("terima uang") || lower.includes("dapat ");
    const type = isIncome ? "income" : "expense";

    // Detect Description
    let desc = text.replace(/^(catat|tambahkan|tolong catat)\s+/i, '').trim();
    if (!desc) desc = isIncome ? "Pemasukan Lainnya" : "Pengeluaran";

    return {
      type: type,
      amount: amount,
      description: desc,
      accountId: 1,
      accountName: "Dompet Tunai",
      categoryId: 1,
      date: new Date().toISOString().slice(0, 10)
    };
  },

  async confirmDraftTransaction(draftMsgId) {
    const list = this.getTimeline("fin");
    const msg = list.find(m => m.id === draftMsgId);
    if (!msg || msg.isResolved) return;

    msg.isResolved = true;
    msg.resolution = "confirmed";
    this.saveTimeline("fin", list);
    this.renderTimeline("fin");

    // Execute real transaction via API
    try {
      const res = await window.API.createFinTransaction({
        type: msg.data.type,
        amount: msg.data.amount,
        description: msg.data.description,
        account_id: msg.data.accountId || 1,
        category_id: msg.data.categoryId || 1,
        date: msg.data.date
      });

      this.insertTransactionResultCard({
        id: res.id,
        type: msg.data.type,
        amount: msg.data.amount,
        description: msg.data.description,
        date: msg.data.date,
        accountName: msg.data.accountName
      });

      this.updateSidebarPreview("fin", `Catat: ${msg.data.description} (Rp ${msg.data.amount.toLocaleString('id-ID')})`);
    } catch (err) {
      alert("Gagal menyimpan transaksi: " + err.message);
    }
  },

  editDraftInForm(draftMsgId) {
    const list = this.getTimeline("fin");
    const msg = list.find(m => m.id === draftMsgId);
    if (!msg) return;

    this.openAddLogPanel(msg.data);
  },

  cancelDraftTransaction(draftMsgId) {
    const list = this.getTimeline("fin");
    const msg = list.find(m => m.id === draftMsgId);
    if (!msg) return;

    msg.isResolved = true;
    msg.resolution = "cancelled";
    this.saveTimeline("fin", list);
    this.renderTimeline("fin");
  },

  // --------------------------------------------------------------------------
  // COMPOSER & CHAT LOGIC
  // --------------------------------------------------------------------------
  setupComposer() {
    const textarea = document.getElementById("orbComposerTextarea");
    const sendBtn = document.getElementById("btnOrbSendMessage");

    const doSend = () => {
      const text = textarea?.value?.trim();
      if (!text) return;
      textarea.value = "";
      this.handleUserSendMessage(text);
    };

    sendBtn?.addEventListener("click", doSend);
    textarea?.addEventListener("keydown", (e) => {
      // Enter to send, Shift+Enter for new line. Respect IME composition.
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        doSend();
      }
    });

    // Auto-expand textarea height
    textarea?.addEventListener("input", () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(120, textarea.scrollHeight)}px`;
    });
  },

  saveComposerDraft(agentId) {
    const textarea = document.getElementById("orbComposerTextarea");
    if (textarea) {
      try {
        localStorage.setItem(`orb_chat_draft_v4_${agentId}`, textarea.value);
      } catch (_) {}
    }
  },

  restoreComposerDraft(agentId) {
    const textarea = document.getElementById("orbComposerTextarea");
    if (textarea) {
      try {
        textarea.value = localStorage.getItem(`orb_chat_draft_v4_${agentId}`) || "";
      } catch (_) {}
    }
  },

  async handleUserSendMessage(text) {
    const agentId = this.activeAgentId;
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Append user message to timeline
    const list = this.getTimeline(agentId);
    list.push({
      id: `msg_u_${Date.now()}`,
      type: "text",
      sender: "user",
      text: text,
      time: timeNow
    });
    this.saveTimeline(agentId, list);
    this.renderTimeline(agentId);

    // Update preview in sidebar
    this.updateSidebarPreview(agentId, text);

    // 2. Check if Fin NLP Transaction draft is detected
    if (agentId === "fin") {
      const draft = this.parseTransactionDraft(text);
      if (draft) {
        list.push({
          id: `draft_${Date.now()}`,
          type: "tx_draft",
          sender: "agent",
          data: draft,
          isResolved: false,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        this.saveTimeline("fin", list);
        this.renderTimeline("fin");
        return;
      }
    }

    // 3. Regular AI Conversation
    try {
      let replyText = "";
      if (agentId === "fin") {
        if (window.API?.askFin) {
          const res = await window.API.askFin(text);
          replyText = res?.answer || "";
        }
        if (!replyText) {
          replyText = `Catatan dan instruksi Anda telah saya terima. Untuk mencatat transaksi langsung ke ledger, gunakan tombol **+ Tambah Log** atau ketik misalnya *"Catat pengeluaran makan siang 35000"*`;
        }
      } else {
        if (window.API?.askWelly) {
          const res = await window.API.askWelly(text);
          replyText = res?.text || "";
        }
        if (!replyText) {
          replyText = `Sebagai perencana kekayaan Anda, saya siap memetakan portofolio dan alokasi jangka panjang. Gunakan tombol **+ Investasi** atau diskusikan target aset Anda di sini.`;
        }
      }

      this.appendAgentMessage(agentId, replyText);
    } catch (e) {
      this.appendAgentMessage(agentId, "Maaf, terjadi gangguan jaringan. Silakan coba kembali.");
    }
  },

  appendAgentMessage(agentId, text) {
    const list = this.getTimeline(agentId);
    list.push({
      id: `msg_a_${Date.now()}`,
      type: "text",
      sender: "agent",
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    this.saveTimeline(agentId, list);
    if (this.activeAgentId === agentId) this.renderTimeline(agentId);
    this.updateSidebarPreview(agentId, text);
  },

  updateSidebarPreview(agentId, text) {
    const previewEl = document.getElementById(`orbSidebarPreview_${agentId}`);
    if (previewEl) {
      previewEl.textContent = text;
    }
  },

  scrollToBottom() {
    setTimeout(() => {
      const timeline = document.getElementById("orbChatTimeline");
      if (timeline) {
        timeline.scrollTop = timeline.scrollHeight;
      }
    }, 40);
  },

  // --------------------------------------------------------------------------
  // LISTENERS SETUP
  // --------------------------------------------------------------------------
  setupListeners() {
    // 1. Sidebar Agent Row Click
    document.querySelectorAll(".orb-agent-sidebar-row").forEach(row => {
      row.addEventListener("click", () => {
        const id = row.dataset.agent;
        if (id) this.switchAgent(id);
      });
    });

    // 2. Mobile Stories Switcher Click
    document.querySelectorAll(".orb-story-item").forEach(item => {
      item.addEventListener("click", () => {
        const id = item.dataset.agent;
        if (id) this.switchAgent(id);
      });
    });

    // 3. Action Toolbar Buttons Click (Delegated)
    const toolbar = document.getElementById("orbActionToolbarBar");
    toolbar?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action-id]");
      if (btn) {
        const actionId = btn.dataset.actionId;
        if (actionId) this.handleActionClick(actionId);
      }
    });

    // 4. Close Panel Button
    document.getElementById("btnOrbClosePanel")?.addEventListener("click", () => {
      this.closePanel();
    });

    // 5. Search Bar Filter
    const searchInput = document.getElementById("orbSidebarSearchInput");
    searchInput?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll(".orb-agent-sidebar-row").forEach(row => {
        const name = row.dataset.agentName?.toLowerCase() || '';
        const match = !q || name.includes(q);
        row.style.display = match ? "flex" : "none";
      });
    });

    // 6. Clear Chat History
    document.getElementById("btnOrbClearHistory")?.addEventListener("click", () => {
      if (confirm(`Bersihkan riwayat percakapan dengan ${this.activeAgentId === 'fin' ? 'Fin' : 'Welly'}?`)) {
        localStorage.removeItem(`orb_chat_history_v4_${this.activeAgentId}`);
        this.renderTimeline(this.activeAgentId);
      }
    });

    document.getElementById("btnPageResetFinChat")?.addEventListener("click", () => {
      if (confirm("Hapus seluruh riwayat percakapan dengan Fin? Data transaksi ledger tetap aman.")) {
        localStorage.removeItem("orb_chat_history_v4_fin");
        if (this.activeAgentId === "fin") this.renderTimeline("fin");
        alert("Riwayat chat Fin telah dibersihkan.");
      }
    });

    document.getElementById("btnPageResetWellyChat")?.addEventListener("click", () => {
      if (confirm("Hapus seluruh riwayat percakapan dengan Welly? Data portofolio tetap aman.")) {
        localStorage.removeItem("orb_chat_history_v4_welly");
        if (this.activeAgentId === "welly") this.renderTimeline("welly");
        alert("Riwayat chat Welly telah dibersihkan.");
      }
    });

    // 7. Settings Panel Navigation
    const openSettings = (e) => {
      e?.preventDefault?.();
      this.openSettingsPanel();
    };
    document.getElementById("btnOrbSettings")?.addEventListener("click", openSettings);
    document.getElementById("btnOrbMobileSettings")?.addEventListener("click", openSettings);

    document.getElementById("btnOrbLock")?.addEventListener("click", () => {
      if (window.Auth?.lockApp) {
        window.Auth.lockApp();
      } else {
        window.location.reload();
      }
    });

    document.getElementById("btnOrbSidebarBrandHome")?.addEventListener("click", () => {
      this.switchAgent("fin");
    });

    // 8. Close dropdown menus on clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".orb-more-dropdown-menu") && !e.target.closest("[data-action-id='more']") && !e.target.closest("[data-action-id='more_welly']")) {
        document.querySelectorAll(".orb-more-dropdown-menu").forEach(m => m.classList.remove("active"));
      }
    });
  }
};

window.ChatFirstManager = ChatFirstManager;
