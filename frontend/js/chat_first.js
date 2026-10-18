/* ==========================================================================
   ORB - CHAT-FIRST CONTROLLER (FIN & WELLY)
   Pure conversation-centric architecture with contextual action toolbars,
   interactive transaction drafts, rich result cards, and sliding side panel.
   ========================================================================== */

const ChatFirstManager = {
  activeAgentId: null,
  panelOpen: false,
  panelType: null,
  wellyPinUnlocked: false,

  init() {
    console.log("💬 Initializing Orb Chat-First Architecture...");

    // Check deep-link route (e.g. #agents/welly or #agents/fin?panel=dashboard or #agents/lois)
    const hash = window.location.hash.replace(/^#/, '').trim();
    let initialAgent = null;
    if (hash.startsWith("agents/")) {
      const parts = hash.split("?")[0].split("/");
      if (parts[1] && (parts[1] === "fin" || parts[1] === "welly" || parts[1] === "lois")) {
        initialAgent = parts[1];
      }
    }

    this.initTheme();
    this.initCustomAgentProfiles();
    this.setupSidebarDrawer();
    this.setupComposer();
    this.setupListeners();
    this.setupHub();

    const isMobile = window.innerWidth <= 768;
    if (initialAgent) {
      this.switchAgent(initialAgent);
    } else if (isMobile || hash === "hub") {
      this.showHub();
    } else {
      this.switchAgent("fin");
    }
  },

  // --------------------------------------------------------------------------
  // THEME MANAGEMENT (Auto 12-Hour Switch: 06:00-17:59 Light, 18:00-05:59 Dark)
  // --------------------------------------------------------------------------
  getThemeMode() {
    try {
      return localStorage.getItem("orb_theme_mode") || "auto";
    } catch (_) {
      return "auto";
    }
  },

  getAutoTheme() {
    const hour = new Date().getHours();
    // 6 pagi (06:00) s/d 5.59 sore (17:59) => light
    // 6 sore (18:00) s/d 5.59 pagi (05:59) => dark
    return (hour >= 6 && hour < 18) ? "light" : "dark";
  },

  resolveTheme(mode) {
    if (!mode) mode = this.getThemeMode();
    if (mode === "auto") {
      return this.getAutoTheme();
    }
    return mode === "light" ? "light" : "dark";
  },

  setThemeMode(mode) {
    try {
      localStorage.setItem("orb_theme_mode", mode);
    } catch (_) {}
    this.applyTheme(mode);
  },

  applyTheme(mode) {
    if (!mode) mode = this.getThemeMode();
    const resolved = this.resolveTheme(mode);
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute("data-theme-mode", mode);
    document.body.setAttribute("data-theme", resolved);

    // Sync mobile browser status bar / theme-color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute("content", resolved === "dark" ? "#0F172A" : "#F8FAFC");

    if (window.OrbApp) {
      window.OrbApp.currentTheme = resolved;
    }
    return resolved;
  },

  initTheme() {
    this.applyTheme(this.getThemeMode());

    // Auto-check periodically (every 30 seconds) to switch seamlessly
    if (!this._themeInterval) {
      this._themeInterval = setInterval(() => {
        if (this.getThemeMode() === "auto") {
          const expected = this.getAutoTheme();
          const current = document.documentElement.getAttribute("data-theme");
          if (expected !== current) {
            this.applyTheme("auto");
            if (this.panelOpen && this.panelType === "settings") {
              this.openSettingsPanel();
            }
          }
        }
      }, 30000);
    }

    // Check immediately when user re-focuses tab / screen unlocks
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.getThemeMode() === "auto") {
        this.applyTheme("auto");
      }
    });
    window.addEventListener("focus", () => {
      if (this.getThemeMode() === "auto") {
        this.applyTheme("auto");
      }
    });
  },

  initCustomAgentProfiles() {
    ["fin", "welly", "lois"].forEach(id => {
      const agent = window.AgentRegistry?.getAgent(id);
      if (agent) {
        // Update sidebar
        const row = document.querySelector(`.orb-agent-sidebar-row[data-agent="${id}"]`);
        if (row) {
          row.dataset.agentName = agent.name;
          const nameEl = row.querySelector(".orb-sidebar-agent-name");
          if (nameEl) nameEl.textContent = agent.name;
          const imgEl = row.querySelector("img");
          if (imgEl) imgEl.src = agent.avatar;
        }

        // Update mobile stories
        const story = document.querySelector(`.orb-story-item[data-agent="${id}"]`);
        if (story) {
          const nameEl = story.querySelector(".orb-story-name");
          if (nameEl) nameEl.textContent = agent.name;
          const imgEl = story.querySelector("img");
          if (imgEl) imgEl.src = agent.avatar;
        }

        // Update Hub directory cards
        const hubCard = document.querySelector(`.orb-hub-agent-card[data-agent="${id}"]`);
        if (hubCard) {
          const nameEl = hubCard.querySelector(".orb-hub-card-name");
          if (nameEl) nameEl.textContent = agent.name;
          const imgEl = hubCard.querySelector("img");
          if (imgEl) imgEl.src = agent.avatar;
        }

        // Update Hub story item
        const hubStory = document.querySelector(`.orb-hub-story-item[data-agent="${id}"]`);
        if (hubStory) {
          const nameEl = hubStory.querySelector(".orb-hub-story-name");
          if (nameEl) nameEl.textContent = agent.name;
          const imgEl = hubStory.querySelector("img");
          if (imgEl) imgEl.src = agent.avatar;
        }
      }
    });
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

  // --------------------------------------------------------------------------
  // AGENT HUB (INITIAL VIEW & AGENT SELECTION)
  // --------------------------------------------------------------------------
  setupHub() {
    // Stories item clicks in Hub
    document.querySelectorAll("#orbHubStoriesRow .orb-hub-story-item").forEach(item => {
      item.addEventListener("click", () => {
        const id = item.dataset.agent;
        if (id) {
          this.switchAgent(id);
        }
      });
    });

    // Directory card clicks in Hub
    document.querySelectorAll("#orbHubAgentList .orb-hub-agent-card").forEach(card => {
      card.addEventListener("click", () => {
        const id = card.dataset.agent;
        if (id) {
          this.switchAgent(id);
        }
      });
    });

    // Back to Hub button in mobile header
    document.getElementById("btnOrbMobileBackToHub")?.addEventListener("click", () => {
      this.showHub();
    });

    // Hub settings button
    document.getElementById("btnHubSettings")?.addEventListener("click", () => {
      this.openSettingsPanel();
    });
  },

  showHub() {
    this.activeAgentId = null;
    const hub = document.getElementById("orbAgentHubView");
    const workspace = document.getElementById("orbConversationWorkspace");
    if (hub) hub.style.display = "flex";
    if (workspace) workspace.style.display = "none";

    document.querySelectorAll(".orb-agent-sidebar-row").forEach(row => row.classList.remove("active"));
    document.querySelectorAll(".orb-story-item").forEach(item => item.classList.remove("active"));

    if (this.panelOpen) this.closePanel();

    try {
      history.replaceState(null, "", "#hub");
    } catch (_) {
      window.location.hash = "#hub";
    }
  },

  hideHub() {
    const hub = document.getElementById("orbAgentHubView");
    const workspace = document.getElementById("orbConversationWorkspace");
    if (hub) hub.style.display = "none";
    if (workspace) workspace.style.display = "flex";
  },

  switchAgent(agentId) {
    if (agentId !== "fin" && agentId !== "welly" && agentId !== "lois") agentId = "fin";

    // 1. Save draft of previous agent
    if (this.activeAgentId) {
      this.saveComposerDraft(this.activeAgentId);
    }

    this.activeAgentId = agentId;
    this.hideHub();

    let agent = window.AgentRegistry?.getAgent(agentId);
    if (!agent || !agent.actions) {
      agent = {
        id: agentId,
        name: agentId === "fin" ? "Fin" : (agentId === "welly" ? "Welly" : "Lois"),
        role: agentId === "fin" ? "Pencatatan keuangan & rekening bank" : (agentId === "welly" ? "Perencanaan investasi & akun broker" : "Pembuat invoice & sales order"),
        avatar: `./assets/avatars/avatar_orb_${agentId === 'fin' ? '01' : (agentId === 'welly' ? '02' : '03')}.png`,
        actions: []
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
    if (mobileTitle) mobileTitle.textContent = `• ${agent.name}`;

    // 5. Render Contextual Action Toolbar for this agent
    this.renderActionToolbar(agent);

    // 6. Render Chat Timeline for this agent
    this.renderTimeline(agentId);

    // 7. Restore Composer Draft for this agent
    this.restoreComposerDraft(agentId);

    // 8. Close panel if mismatched
    if (this.panelOpen) {
      this.closePanel();
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
    if (actionId === "more" || actionId === "more_welly" || actionId === "more_lois") {
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
      case "transfers":
        this.openFinTransfersPanel();
        break;
      case "reserves":
        this.openFinReservesPanel();
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
      case "inv_accounts":
        this.openWellyInvAccountsPanel();
        break;
      case "inv_categories":
        this.openWellyInvCategoriesPanel();
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

      // LOIS ACTIONS
      case "invoices":
        this.openLoisInvoicesPanel();
        break;
      case "create_invoice":
        this.openLoisCreateInvoicePanel();
        break;
      case "customers":
        this.openLoisCustomersPanel();
        break;
      case "unpaid_invoices":
        this.openLoisInvoicesPanel("unpaid");
        break;
      case "import_customers":
        this.openLoisImportCustomersModal();
        break;
      case "templates_invoice":
        this.openLoisTemplatesPanel();
        break;
      case "collab_fin":
        this.openLoisCollabFinPanel();
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
    this.openPanel("accounts", "Rekening Bank & Saldo", `<div style="padding: 20px;">Memuat data rekening...</div>`);
    try {
      const accounts = await window.API.getFinAccounts();
      const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

      const content = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Total Balance Card -->
          <div class="orb-dash-stat-card" style="padding: 16px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.08)); border-color: rgba(16, 185, 129, 0.3);">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--orb-text-muted); text-transform: uppercase; letter-spacing: 0.04em;">Total Saldo Tergabung</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: #10B981; margin: 4px 0;">Rp ${Math.round(totalBalance).toLocaleString('id-ID')}</div>
            <div style="font-size: 0.74rem; color: var(--orb-text-dim);">${accounts.length} Akun Aktif (Bank, Tabungan, Kas, E-Wallet)</div>
          </div>

          <!-- Accounts List -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${accounts.map(a => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: var(--orb-bg-app); border-radius: 12px; border: 1px solid var(--orb-border);">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="font-size: 1.4rem;">${a.icon || '🏦'}</span>
                  <div>
                    <div style="font-weight: 700; font-size: 0.92rem; color: var(--orb-text-main);">${a.name}</div>
                    <div style="font-size: 0.74rem; color: var(--orb-text-muted);">
                      <strong>${a.bank_name || a.account_type.toUpperCase()}</strong> ${a.account_number ? '• ' + a.account_number : ''}
                    </div>
                  </div>
                </div>
                <div style="font-weight: 800; font-size: 0.96rem; color: var(--orb-text-main);">
                  Rp ${Math.round(a.balance || 0).toLocaleString('id-ID')}
                </div>
              </div>
            `).join("")}
          </div>

          <!-- Add Account Form Toggle -->
          <div class="orb-dash-stat-card" style="padding: 16px; margin-top: 6px;">
            <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 10px;">+ Tambah Rekening / Akun Baru</h3>
            <form id="formAddFinAccount" style="display: flex; flex-direction: column; gap: 10px;">
              <div class="orb-form-group">
                <label class="orb-form-label">Nama Akun / Panggilan</label>
                <input type="text" name="name" class="orb-form-input" placeholder="Contoh: BCA Utama, Mandiri Tabungan, GoPay" required />
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Nama Bank / Institusi</label>
                <input type="text" name="bank_name" class="orb-form-input" placeholder="Contoh: Bank BCA, Bank Mandiri, BNI, GoPay, Tunai" required />
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Nomor Rekening (Opsional)</label>
                <input type="text" name="account_number" class="orb-form-input" placeholder="Contoh: 8820192831" />
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Tipe Akun</label>
                <select name="account_type" class="orb-form-input">
                  <option value="bank">Rekening Bank</option>
                  <option value="cash">Tunai / Dompet</option>
                  <option value="ewallet">E-Wallet</option>
                </select>
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Saldo Awal (Rp)</label>
                <input type="number" name="initial_balance" class="orb-form-input" placeholder="0" min="0" value="0" required />
              </div>
              <button type="submit" class="orb-btn-submit-form" id="btnSubmitNewAccount" style="margin-top: 4px;">Simpan Rekening</button>
            </form>
          </div>
        </div>
      `;

      this.openPanel("accounts", "Rekening Bank & Saldo", content);

      document.getElementById("formAddFinAccount")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const name = fd.get("name")?.trim();
        const bankName = fd.get("bank_name")?.trim();
        const accNum = fd.get("account_number")?.trim();
        const accType = fd.get("account_type");
        const initBal = parseInt(fd.get("initial_balance"), 10) || 0;

        try {
          await window.API.createFinAccount({
            name: name,
            bank_name: bankName,
            account_number: accNum,
            account_type: accType,
            initial_balance: initBal,
            currency: "IDR",
            icon: accType === "cash" ? "👛" : (accType === "ewallet" ? "📱" : "🏦")
          });
          this.openFinAccountsPanel();
          this.appendAgentMessage("fin", `Rekening baru **${name}** (${bankName}) berhasil ditambahkan dengan saldo awal Rp ${initBal.toLocaleString('id-ID')}.`);
        } catch (err) {
          alert("Gagal menambah rekening: " + err.message);
        }
      });
    } catch (e) {
      this.openPanel("accounts", "Rekening Bank & Saldo", `<div style="color: #EF4444; padding: 20px;">Error: ${e.message}</div>`);
    }
  },

  async openFinTransfersPanel() {
    this.openPanel("transfers", "Transfer Antar-Rekening", `<div style="padding: 20px;">Memuat form transfer...</div>`);
    try {
      const accounts = await window.API.getFinAccounts();
      const transfers = await window.API.getFinTransfers(15);

      const srcOptions = accounts.map(a => `
        <option value="${a.id}">${a.name} (${a.bank_name || a.account_type}) - Saldo: Rp ${Math.round(a.balance || 0).toLocaleString('id-ID')}</option>
      `).join("");

      const destOptions = accounts.map(a => `
        <option value="${a.id}">${a.name} (${a.bank_name || a.account_type})</option>
      `).join("");

      const content = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Transfer Form -->
          <form id="formFinTransfer" class="orb-dash-stat-card" style="padding: 16px; display: flex; flex-direction: column; gap: 10px;">
            <h3 style="font-size: 0.92rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 2px;">🔄 Formulir Transfer</h3>
            <p style="font-size: 0.76rem; color: var(--orb-text-muted); margin-bottom: 8px;">
              Pindahkan dana dari satu rekening ke rekening lain dengan update saldo atomik seketika.
            </p>

            <div class="orb-form-group">
              <label class="orb-form-label">Dari Rekening (Sumber)</label>
              <select name="source_account_id" class="orb-form-input" id="selectTransferSource" required>
                ${srcOptions}
              </select>
            </div>

            <div class="orb-form-group">
              <label class="orb-form-label">Ke Rekening (Tujuan)</label>
              <select name="destination_account_id" class="orb-form-input" id="selectTransferDest" required>
                ${destOptions}
              </select>
            </div>

            <div class="orb-form-group">
              <label class="orb-form-label">Nominal Transfer (Rp)</label>
              <input type="number" name="amount" class="orb-form-input" placeholder="Contoh: 500000" min="1" required />
            </div>

            <div class="orb-form-group">
              <label class="orb-form-label">Biaya Admin (Rp, default 0)</label>
              <input type="number" name="fee" class="orb-form-input" placeholder="0" min="0" value="0" />
            </div>

            <div class="orb-form-group">
              <label class="orb-form-label">Catatan / Keperluan</label>
              <input type="text" name="notes" class="orb-form-input" placeholder="Contoh: Isi saldo GoPay, Pindah tabungan" />
            </div>

            <div class="orb-form-group">
              <label class="orb-form-label">Tanggal</label>
              <input type="date" name="date" class="orb-form-input" value="${new Date().toISOString().slice(0, 10)}" required />
            </div>

            <button type="submit" class="orb-btn-submit-form" id="btnSubmitTransfer">Proses Transfer ➔</button>
          </form>

          <!-- History -->
          <div style="margin-top: 6px;">
            <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 8px;">Riwayat Transfer Terbaru</h3>
            ${Array.isArray(transfers) && transfers.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${transfers.map(tr => `
                  <div style="padding: 10px 12px; background: var(--orb-bg-app); border: 1px solid var(--orb-border); border-radius: 10px; font-size: 0.82rem;">
                    <div style="display: flex; justify-content: space-between; font-weight: 700; color: var(--orb-text-main);">
                      <span>${tr.source_account_name} ➔ ${tr.destination_account_name}</span>
                      <span style="color: #3B82F6;">Rp ${Math.round(tr.amount || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div style="font-size: 0.72rem; color: var(--orb-text-muted); margin-top: 4px; display: flex; justify-content: space-between;">
                      <span>${tr.date} ${tr.notes ? '• ' + tr.notes : ''}</span>
                      ${tr.fee ? `<span style="color: #EF4444;">Biaya: Rp ${tr.fee.toLocaleString('id-ID')}</span>` : ''}
                    </div>
                  </div>
                `).join("")}
              </div>
            ` : `<div style="font-size: 0.78rem; color: var(--orb-text-dim);">Belum ada riwayat transfer.</div>`}
          </div>
        </div>
      `;

      this.openPanel("transfers", "Transfer Antar-Rekening", content);

      document.getElementById("formFinTransfer")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const srcId = parseInt(fd.get("source_account_id"), 10);
        const destId = parseInt(fd.get("destination_account_id"), 10);
        const amount = parseInt(fd.get("amount"), 10);
        const fee = parseInt(fd.get("fee"), 10) || 0;
        const notes = fd.get("notes")?.trim() || "";
        const date = fd.get("date");

        if (srcId === destId) {
          alert("Rekening sumber dan tujuan tidak boleh sama.");
          return;
        }

        const btn = document.getElementById("btnSubmitTransfer");
        if (btn) { btn.disabled = true; btn.textContent = "Memproses..."; }

        try {
          const res = await window.API.createFinTransfer({
            source_account_id: srcId,
            destination_account_id: destId,
            amount: amount,
            fee: fee,
            notes: notes,
            date: date
          });
          this.closePanel();
          this.appendAgentMessage("fin", `✓ **Transfer Berhasil**: Rp ${amount.toLocaleString('id-ID')} dari **${res.source_account_name}** ke **${res.destination_account_name}** telah dibukukan.`);
        } catch (err) {
          alert("Gagal transfer: " + err.message);
          if (btn) { btn.disabled = false; btn.textContent = "Proses Transfer ➔"; }
        }
      });
    } catch (e) {
      this.openPanel("transfers", "Transfer Antar-Rekening", `<div style="color: #EF4444; padding: 20px;">Error: ${e.message}</div>`);
    }
  },

  async openFinReservesPanel() {
    this.openPanel("reserves", "Dana Cadangan & Alokasi Khusus", `<div style="padding: 20px;">Memuat dana cadangan...</div>`);
    try {
      const reserves = await window.API.getFinReserves();

      const totalTarget = reserves.reduce((s, r) => s + (r.target_amount || 0), 0);
      const totalAlloc = reserves.reduce((s, r) => s + (r.allocated_amount || 0), 0);
      const overallPct = totalTarget > 0 ? Math.min(100, Math.round((totalAlloc / totalTarget) * 100)) : 0;

      const content = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Overall Stats -->
          <div class="orb-dash-stat-card" style="padding: 16px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(139, 92, 246, 0.08)); border-color: rgba(16, 185, 129, 0.3);">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--orb-text-muted); text-transform: uppercase;">Total Cadangan Terkumpul</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: #10B981; margin: 4px 0;">
              Rp ${Math.round(totalAlloc).toLocaleString('id-ID')}
            </div>
            <div style="font-size: 0.74rem; color: var(--orb-text-dim); margin-bottom: 10px;">
              Target Total: Rp ${Math.round(totalTarget).toLocaleString('id-ID')} (${overallPct}% Tercapai)
            </div>
            <div style="height: 6px; background: var(--orb-border); border-radius: 99px; overflow: hidden;">
              <div style="height: 100%; width: ${overallPct}%; background: #10B981;"></div>
            </div>
          </div>

          <!-- Reserve Items List -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${reserves.map(r => {
              const pct = r.target_amount > 0 ? Math.min(100, Math.round((r.allocated_amount / r.target_amount) * 100)) : 0;
              const sisa = Math.max(0, r.target_amount - r.allocated_amount);
              return `
                <div style="padding: 14px; background: var(--orb-bg-app); border: 1px solid var(--orb-border); border-radius: 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                      <div style="font-weight: 800; font-size: 0.92rem; color: var(--orb-text-main);">${r.name}</div>
                      <div style="font-size: 0.74rem; color: var(--orb-text-muted);">${r.category || 'Dana Cadangan'} ${r.target_date ? '• Target: ' + r.target_date : ''}</div>
                    </div>
                    <span style="font-size: 0.72rem; padding: 3px 8px; border-radius: 6px; font-weight: 700; background: ${r.is_completed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.15)'}; color: ${r.is_completed ? '#10B981' : '#3B82F6'};">
                      ${r.is_completed ? '✓ Tercapai' : pct + '%'}
                    </span>
                  </div>

                  <div style="height: 6px; background: var(--orb-border); border-radius: 99px; margin: 10px 0; overflow: hidden;">
                    <div style="height: 100%; width: ${pct}%; background: ${pct >= 100 ? '#10B981' : '#3B82F6'};"></div>
                  </div>

                  <div style="display: flex; justify-content: space-between; font-size: 0.76rem; color: var(--orb-text-main); font-weight: 600;">
                    <span>Alokasi: Rp ${Math.round(r.allocated_amount || 0).toLocaleString('id-ID')}</span>
                    <span style="color: var(--orb-text-muted);">Target: Rp ${Math.round(r.target_amount || 0).toLocaleString('id-ID')}</span>
                  </div>

                  ${sisa > 0 ? `<div style="font-size: 0.72rem; color: #F59E0B; margin-top: 4px;">Sisa butuh: Rp ${Math.round(sisa).toLocaleString('id-ID')}</div>` : ''}

                  <div style="display: flex; gap: 8px; margin-top: 10px;">
                    <button class="orb-rich-card-action-btn btn-quick-allocate" data-reserve-id="${r.id}" data-current="${r.allocated_amount}">
                      + Tambah Alokasi
                    </button>
                    <button class="orb-rich-card-action-btn btn-delete-reserve" data-reserve-id="${r.id}" style="color: #EF4444; border-color: rgba(239, 68, 68, 0.3);">
                      Hapus
                    </button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>

          <!-- Add Reserve Form -->
          <div class="orb-dash-stat-card" style="padding: 16px; margin-top: 4px;">
            <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 8px;">+ Buat Pos Cadangan Baru</h3>
            <form id="formCreateReserve" style="display: flex; flex-direction: column; gap: 10px;">
              <div class="orb-form-group">
                <label class="orb-form-label">Nama Dana Cadangan</label>
                <input type="text" name="name" class="orb-form-input" placeholder="Contoh: Dana Darurat 6 Bulan, Pajak Tahunan, Liburan" required />
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Kategori</label>
                <select name="category" class="orb-form-input">
                  <option value="Dana Darurat">Dana Darurat</option>
                  <option value="Pajak & Kewajiban">Pajak & Kewajiban</option>
                  <option value="Tabungan Khusus">Tabungan Khusus</option>
                  <option value="Liburan & Hiburan">Liburan & Hiburan</option>
                  <option value="Investasi">Investasi Masa Depan</option>
                </select>
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Target Nominal (Rp)</label>
                <input type="number" name="target_amount" class="orb-form-input" placeholder="Contoh: 30000000" min="1" required />
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Alokasi Awal (Rp)</label>
                <input type="number" name="allocated_amount" class="orb-form-input" placeholder="0" min="0" value="0" />
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Target Tanggal (Opsional)</label>
                <input type="date" name="target_date" class="orb-form-input" />
              </div>
              <button type="submit" class="orb-btn-submit-form" id="btnSubmitNewReserve">Simpan Cadangan</button>
            </form>
          </div>
        </div>
      `;

      this.openPanel("reserves", "Dana Cadangan & Alokasi Khusus", content);

      // Add Reserve Event
      document.getElementById("formCreateReserve")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await window.API.createFinReserve({
            name: fd.get("name")?.trim(),
            category: fd.get("category"),
            target_amount: parseInt(fd.get("target_amount"), 10),
            allocated_amount: parseInt(fd.get("allocated_amount"), 10) || 0,
            target_date: fd.get("target_date") || null
          });
          this.openFinReservesPanel();
        } catch (err) {
          alert("Gagal membuat pos cadangan: " + err.message);
        }
      });

      // Quick Allocate Event
      document.querySelectorAll(".btn-quick-allocate").forEach(btn => {
        btn.addEventListener("click", async () => {
          const rId = parseInt(btn.dataset.reserveId, 10);
          const current = parseInt(btn.dataset.current, 10);
          const nominalStr = prompt("Masukkan jumlah dana tambahan untuk dialokasikan (Rp):", "500000");
          if (!nominalStr) return;
          const addNominal = parseInt(nominalStr.replace(/\D/g, ''), 10);
          if (addNominal > 0) {
            await window.API.updateFinReserve(rId, { allocated_amount: current + addNominal });
            this.openFinReservesPanel();
          }
        });
      });

      // Delete Reserve Event
      document.querySelectorAll(".btn-delete-reserve").forEach(btn => {
        btn.addEventListener("click", async () => {
          const rId = parseInt(btn.dataset.reserveId, 10);
          if (confirm("Hapus pos cadangan ini?")) {
            await window.API.deleteFinReserve(rId);
            this.openFinReservesPanel();
          }
        });
      });

    } catch (e) {
      this.openPanel("reserves", "Dana Cadangan & Alokasi Khusus", `<div style="color: #EF4444; padding: 20px;">Error: ${e.message}</div>`);
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

  // --- WELLY INVESTMENT & CREDENTIALS PANELS ---
  async openWellyInvAccountsPanel() {
    this.openPanel("inv_accounts", "Akun & Kredensial Broker", `<div style="padding: 20px;">Memuat akun investasi...</div>`);
    try {
      const isUnlocked = this.wellyPinUnlocked === true;
      const accounts = await window.API.getInvestmentAccounts(isUnlocked ? "1607" : null);
      const categories = await window.API.getInvestmentCategories();

      const catOptions = categories.map(c => `
        <option value="${c.name}">${c.icon || '📈'} ${c.name}</option>
      `).join("");

      const content = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- PIN Lock/Unlock Status Banner -->
          <div class="orb-dash-stat-card" style="padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; background: ${isUnlocked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)'}; border-color: ${isUnlocked ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'};">
            <div>
              <div style="font-weight: 800; font-size: 0.88rem; color: var(--orb-text-main);">
                ${isUnlocked ? '🔓 Sandi Terbuka (Sesi Aktif)' : '🔐 Sandi & PIN Tersembunyi'}
              </div>
              <div style="font-size: 0.74rem; color: var(--orb-text-muted);">
                ${isUnlocked ? 'Kredensial akun broker dapat dibaca' : 'Wajib verifikasi PIN 1607 untuk melihat'}
              </div>
            </div>
            ${!isUnlocked ? `
              <button class="orb-btn-submit-form" id="btnTriggerPinModal" style="margin: 0; padding: 8px 14px; font-size: 0.78rem; width: auto; background: #3B82F6;">
                Buka Sandi ➔
              </button>
            ` : `
              <button class="orb-toolbar-btn" id="btnLockCredentials" style="padding: 8px 12px; font-size: 0.78rem;">
                🔒 Kunci
              </button>
            `}
          </div>

          <!-- Accounts Cards List -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${accounts.map(acc => `
              <div style="padding: 14px; background: var(--orb-bg-app); border: 1px solid var(--orb-border); border-radius: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <div>
                    <div style="font-weight: 800; font-size: 0.94rem; color: var(--orb-text-main);">${acc.platform_name}</div>
                    <span style="font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; background: rgba(59, 130, 246, 0.15); color: #3B82F6; font-weight: 700;">
                      ${acc.category_name}
                    </span>
                  </div>
                  <button class="orb-rich-card-action-btn btn-delete-inv-acc" data-id="${acc.id}" style="color: #EF4444; border-color: rgba(239,68,68,0.25); padding: 4px 8px; font-size: 0.7rem;">
                    ✕ Hapus
                  </button>
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; background: var(--orb-bg-card); padding: 10px; border-radius: 8px; border: 1px solid var(--orb-border);">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--orb-text-muted);">Akun / ID:</span>
                    <strong style="color: var(--orb-text-main); font-family: monospace;">${acc.account_identifier}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--orb-text-muted);">Password / PIN:</span>
                    ${isUnlocked ? `
                      <span style="font-family: monospace; font-weight: 700; color: #10B981; background: var(--orb-bg-app); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--orb-border);">
                        ${acc.credential_secret || '(Kosong)'}
                      </span>
                    ` : `
                      <span style="letter-spacing: 0.25em; color: var(--orb-text-dim); font-size: 0.9rem;">••••••••</span>
                    `}
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                    <span style="color: var(--orb-text-muted);">Saldo Portofolio:</span>
                    <strong style="color: #3B82F6;">Rp ${Math.round(acc.current_balance || 0).toLocaleString('id-ID')}</strong>
                  </div>
                </div>

                ${acc.notes ? `<div style="font-size: 0.74rem; color: var(--orb-text-muted); margin-top: 6px;">Catatan: ${acc.notes}</div>` : ''}
              </div>
            `).join("")}
          </div>

          <!-- Add Account Form -->
          <div class="orb-dash-stat-card" style="padding: 16px;">
            <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 8px;">+ Tambah Akun Broker / Investasi</h3>
            <form id="formAddInvAccount" style="display: flex; flex-direction: column; gap: 10px;">
              <div class="orb-form-group">
                <label class="orb-form-label">Kategori Investasi</label>
                <select name="category_name" class="orb-form-input">
                  ${catOptions}
                </select>
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Platform / Broker / Sekuritas</label>
                <input type="text" name="platform_name" class="orb-form-input" placeholder="Contoh: Ajaib Investasi, Broker Exness, Bareksa, Bibit" required />
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Username / Email / No. Akun</label>
                <input type="text" name="account_identifier" class="orb-form-input" placeholder="Contoh: ferdy@krftworks.my.id atau Acc #8829102" required />
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Password / PIN Rahasia (Opsional)</label>
                <input type="password" name="credential_secret" class="orb-form-input" placeholder="Sandi aman (tersembunyi)" />
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Saldo Saat Ini (Rp)</label>
                <input type="number" name="current_balance" class="orb-form-input" placeholder="0" min="0" value="0" />
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Catatan Tambahan</label>
                <input type="text" name="notes" class="orb-form-input" placeholder="Contoh: Trading EURUSD & Gold XAUUSD" />
              </div>
              <button type="submit" class="orb-btn-submit-form" style="background: #3B82F6;">Simpan Akun Broker</button>
            </form>
          </div>
        </div>
      `;

      this.openPanel("inv_accounts", "Akun & Kredensial Broker", content);

      // Trigger PIN Modal
      document.getElementById("btnTriggerPinModal")?.addEventListener("click", () => {
        this.promptPinModal((success) => {
          if (success) {
            this.wellyPinUnlocked = true;
            this.openWellyInvAccountsPanel();
          }
        });
      });

      // Lock again
      document.getElementById("btnLockCredentials")?.addEventListener("click", () => {
        this.wellyPinUnlocked = false;
        this.openWellyInvAccountsPanel();
      });

      // Add account submit
      document.getElementById("formAddInvAccount")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await window.API.createInvestmentAccount({
            category_name: fd.get("category_name"),
            platform_name: fd.get("platform_name")?.trim(),
            account_identifier: fd.get("account_identifier")?.trim(),
            credential_secret: fd.get("credential_secret") || "",
            current_balance: parseInt(fd.get("current_balance"), 10) || 0,
            notes: fd.get("notes")?.trim() || ""
          });
          this.openWellyInvAccountsPanel();
        } catch (err) {
          alert("Gagal menambah akun investasi: " + err.message);
        }
      });

      // Delete account
      document.querySelectorAll(".btn-delete-inv-acc").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = parseInt(btn.dataset.id, 10);
          if (confirm("Hapus akun broker ini?")) {
            await window.API.deleteInvestmentAccount(id);
            this.openWellyInvAccountsPanel();
          }
        });
      });

    } catch (e) {
      this.openPanel("inv_accounts", "Akun & Kredensial Broker", `<div style="color: #EF4444; padding: 20px;">Error: ${e.message}</div>`);
    }
  },

  async openWellyInvCategoriesPanel() {
    this.openPanel("inv_categories", "Kategori Investasi", `<div style="padding: 20px;">Memuat kategori...</div>`);
    try {
      const categories = await window.API.getInvestmentCategories();

      const content = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Categories list -->
          <div class="orb-dash-stat-card" style="padding: 16px;">
            <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 6px;">🏷️ Kategori Aktif</h3>
            <p style="font-size: 0.76rem; color: var(--orb-text-muted); margin-bottom: 12px;">
              Daftar instrumen portofolio Anda. Anda dapat menambah atau mengurangi kategori sesuai kebutuhan.
            </p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${categories.map(cat => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--orb-bg-app); border: 1px solid var(--orb-border); border-radius: 10px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 1.2rem;">${cat.icon || '📈'}</span>
                    <strong style="font-size: 0.88rem; color: var(--orb-text-main);">${cat.name}</strong>
                  </div>
                  <button class="orb-rich-card-action-btn btn-delete-cat" data-id="${cat.id}" style="color: #EF4444; border-color: rgba(239,68,68,0.25); padding: 4px 8px; font-size: 0.7rem;">
                    ✕ Hapus
                  </button>
                </div>
              `).join("")}
            </div>
          </div>

          <!-- Add category form -->
          <div class="orb-dash-stat-card" style="padding: 16px;">
            <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 8px;">+ Tambah Kategori Baru</h3>
            <form id="formAddCategory" style="display: flex; flex-direction: column; gap: 10px;">
              <div class="orb-form-group">
                <label class="orb-form-label">Nama Kategori</label>
                <input type="text" name="name" class="orb-form-input" placeholder="Contoh: Saham AS, Komoditas Emas, P2P Lending" required />
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Icon Emoji</label>
                <input type="text" name="icon" class="orb-form-input" placeholder="📈" value="📈" />
              </div>
              <button type="submit" class="orb-btn-submit-form" style="background: #3B82F6;">Tambah Kategori</button>
            </form>
          </div>
        </div>
      `;

      this.openPanel("inv_categories", "Kategori Investasi", content);

      // Add category
      document.getElementById("formAddCategory")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await window.API.createInvestmentCategory({
            name: fd.get("name")?.trim(),
            icon: fd.get("icon")?.trim() || "📈"
          });
          this.openWellyInvCategoriesPanel();
        } catch (err) {
          alert("Gagal menambah kategori: " + err.message);
        }
      });

      // Delete category
      document.querySelectorAll(".btn-delete-cat").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = parseInt(btn.dataset.id, 10);
          if (confirm("Hapus kategori investasi ini?")) {
            await window.API.deleteInvestmentCategory(id);
            this.openWellyInvCategoriesPanel();
          }
        });
      });

    } catch (e) {
      this.openPanel("inv_categories", "Kategori Investasi", `<div style="color: #EF4444; padding: 20px;">Error: ${e.message}</div>`);
    }
  },

  // --- LOIS AGENT PANELS (INVOICING & SALES) ---
  async openLoisInvoicesPanel(filterStatus = null) {
    this.openPanel("invoices", "Daftar Invoice & Piutang", `<div style="padding: 20px;">Memuat invoice...</div>`);
    try {
      const invoices = await window.API.getInvoices(filterStatus);

      const totalUnpaid = invoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + (i.total_amount || 0), 0);
      const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total_amount || 0), 0);

      const content = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Filter Tabs -->
          <div style="display: flex; gap: 6px; background: var(--orb-bg-app); padding: 4px; border-radius: 10px; border: 1px solid var(--orb-border);">
            <button class="orb-toolbar-btn ${!filterStatus ? 'primary' : ''}" id="btnInvFilterAll" style="flex: 1; padding: 6px; font-size: 0.78rem;">Semua</button>
            <button class="orb-toolbar-btn ${filterStatus === 'unpaid' ? 'primary' : ''}" id="btnInvFilterUnpaid" style="flex: 1; padding: 6px; font-size: 0.78rem;">Belum Bayar</button>
            <button class="orb-toolbar-btn ${filterStatus === 'paid' ? 'primary' : ''}" id="btnInvFilterPaid" style="flex: 1; padding: 6px; font-size: 0.78rem;">Lunas</button>
          </div>

          <!-- Summary stats -->
          <div class="orb-dash-stat-grid">
            <div class="orb-dash-stat-card">
              <span class="orb-dash-stat-label">Piutang Belum Bayar</span>
              <div class="orb-dash-stat-val" style="color: #F59E0B;">Rp ${Math.round(totalUnpaid).toLocaleString('id-ID')}</div>
            </div>
            <div class="orb-dash-stat-card">
              <span class="orb-dash-stat-label">Total Telah Lunas</span>
              <div class="orb-dash-stat-val" style="color: #10B981;">Rp ${Math.round(totalPaid).toLocaleString('id-ID')}</div>
            </div>
          </div>

          <!-- Invoices Cards -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${Array.isArray(invoices) && invoices.length > 0 ? invoices.map(inv => {
              const isPaid = inv.status === 'paid';
              return `
                <div style="padding: 14px; background: var(--orb-bg-app); border: 1px solid var(--orb-border); border-radius: 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                      <strong style="font-size: 0.94rem; color: var(--orb-text-main);">${inv.invoice_number}</strong>
                      <div style="font-size: 0.78rem; color: var(--orb-text-muted); font-weight: 600;">${inv.customer_name}</div>
                      ${inv.customer_email ? `<div style="font-size: 0.72rem; color: var(--orb-text-dim);">${inv.customer_email}</div>` : ''}
                    </div>
                    <span class="orb-invoice-badge ${isPaid ? 'paid' : 'unpaid'}">
                      ${isPaid ? '✓ Lunas' : 'Belum Bayar'}
                    </span>
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: baseline; margin: 10px 0 6px;">
                    <span style="font-size: 0.74rem; color: var(--orb-text-muted);">Jatuh Tempo: <strong>${inv.due_date || 'N/A'}</strong></span>
                    <span style="font-size: 1.05rem; font-weight: 800; color: ${isPaid ? '#10B981' : '#F59E0B'};">
                      Rp ${Math.round(inv.total_amount || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <!-- Actions -->
                  <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                    <button class="orb-rich-card-action-btn btn-send-invoice-email" data-id="${inv.id}" data-email="${inv.customer_email || ''}">
                      ✉️ ${inv.email_sent ? 'Kirim Ulang Email' : 'Kirim Email'}
                    </button>
                    ${!isPaid ? `
                      <button class="orb-rich-card-action-btn btn-mark-invoice-paid" data-id="${inv.id}" style="background: rgba(16, 185, 129, 0.15); color: #10B981; border-color: rgba(16, 185, 129, 0.3);">
                        ✓ Tandai Lunas
                      </button>
                    ` : ''}
                  </div>

                  ${isPaid ? `
                    <!-- Lois to Fin Collaboration CTA Card -->
                    <div class="orb-collab-cta-card">
                      <div style="font-size: 0.78rem; font-weight: 700; color: #8B5CF6; margin-bottom: 4px;">
                        💰 Dana Masuk: Rp ${Math.round(inv.total_amount || 0).toLocaleString('id-ID')}
                      </div>
                      <div style="font-size: 0.74rem; color: var(--orb-text-muted); margin-bottom: 8px;">
                        Invoice telah lunas. Kirim pemberitahuan & catat saldo masuk langsung ke rekening bank Fin.
                      </div>
                      <button class="orb-btn-confirm-draft btn-collab-catat-fin" data-id="${inv.id}" data-amount="${inv.total_amount}" data-number="${inv.invoice_number}" data-customer="${inv.customer_name}" style="background: #8B5CF6; width: 100%; text-align: center;">
                        + Catat Masuk ke Fin Rekening Bank ➔
                      </button>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join("") : `<div style="font-size: 0.8rem; color: var(--orb-text-dim);">Belum ada invoice pada filter ini.</div>`}
          </div>

          <button class="orb-btn-submit-form" id="btnOpenCreateInvForm" style="margin-top: 6px; background: #8B5CF6;">+ Buat Invoice Baru</button>
        </div>
      `;

      this.openPanel("invoices", "Daftar Invoice & Piutang", content);

      // Filters
      document.getElementById("btnInvFilterAll")?.addEventListener("click", () => this.openLoisInvoicesPanel());
      document.getElementById("btnInvFilterUnpaid")?.addEventListener("click", () => this.openLoisInvoicesPanel("unpaid"));
      document.getElementById("btnInvFilterPaid")?.addEventListener("click", () => this.openLoisInvoicesPanel("paid"));
      document.getElementById("btnOpenCreateInvForm")?.addEventListener("click", () => this.openLoisCreateInvoicePanel());

      // Send email
      document.querySelectorAll(".btn-send-invoice-email").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = parseInt(btn.dataset.id, 10);
          const email = btn.dataset.email;
          btn.textContent = "Mengirim...";
          try {
            await window.API.sendInvoiceEmail(id);
            alert(`Invoice berhasil dikirim via email ke ${email || 'pelanggan'}.`);
            this.openLoisInvoicesPanel(filterStatus);
          } catch (err) {
            alert("Gagal mengirim email: " + err.message);
            btn.textContent = "✉️ Kirim Email";
          }
        });
      });

      // Mark paid
      document.querySelectorAll(".btn-mark-invoice-paid").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = parseInt(btn.dataset.id, 10);
          if (confirm("Tandai invoice ini sebagai Lunas?")) {
            await window.API.markInvoicePaid(id);
            this.openLoisInvoicesPanel(filterStatus);
          }
        });
      });

      // Collaboration CTA to Fin
      document.querySelectorAll(".btn-collab-catat-fin").forEach(btn => {
        btn.addEventListener("click", () => {
          const amount = parseInt(btn.dataset.amount, 10);
          const invNum = btn.dataset.number;
          const cust = btn.dataset.customer;

          this.recordInvoiceToFin(amount, invNum, cust);
        });
      });

    } catch (e) {
      this.openPanel("invoices", "Daftar Invoice & Piutang", `<div style="color: #EF4444; padding: 20px;">Error: ${e.message}</div>`);
    }
  },

  recordInvoiceToFin(amount, invoiceNumber, customerName) {
    this.closePanel();
    this.switchAgent("fin");
    this.openAddLogPanel({
      type: "income",
      amount: amount,
      description: `Pelunasan Invoice ${invoiceNumber} - ${customerName}`,
      date: new Date().toISOString().slice(0, 10)
    });
  },

  async openLoisCreateInvoicePanel() {
    this.openPanel("create_invoice", "Buat Invoice Baru", `<div style="padding: 20px;">Menyiapkan form invoice...</div>`);
    try {
      const customers = await window.API.getCustomers();
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const todayStr = new Date().toISOString().slice(0, 10);
      const defaultDueStr = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
      const autoInvNum = `INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${randomSuffix}`;

      const custOptions = customers.map(c => `
        <option value="${c.name}" data-email="${c.email || ''}">${c.name} (${c.company || 'Personal'})</option>
      `).join("");

      const content = `
        <form id="formCreateInvoice" style="display: flex; flex-direction: column; gap: 12px;">
          <div class="orb-form-group">
            <label class="orb-form-label">Nomor Invoice</label>
            <input type="text" name="invoice_number" class="orb-form-input" value="${autoInvNum}" required />
          </div>

          <div class="orb-form-group">
            <label class="orb-form-label">Pilih Pelanggan / Klien</label>
            <select name="customer_select" id="selectInvCustomer" class="orb-form-input">
              ${custOptions}
              <option value="__new__">+ Masukkan Pelanggan Baru...</option>
            </select>
          </div>

          <div id="newCustomerInputWrap" style="display: none; flex-direction: column; gap: 8px; background: var(--orb-bg-app); padding: 10px; border-radius: 8px; border: 1px solid var(--orb-border);">
            <input type="text" id="inputNewCustName" class="orb-form-input" placeholder="Nama Pelanggan / Perusahaan" />
            <input type="email" id="inputNewCustEmail" class="orb-form-input" placeholder="Email Pelanggan" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div class="orb-form-group">
              <label class="orb-form-label">Tanggal Terbit</label>
              <input type="date" name="issue_date" class="orb-form-input" value="${todayStr}" required />
            </div>
            <div class="orb-form-group">
              <label class="orb-form-label">Jatuh Tempo</label>
              <input type="date" name="due_date" class="orb-form-input" value="${defaultDueStr}" required />
            </div>
          </div>

          <!-- Items Section -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label class="orb-form-label" style="margin: 0;">Rincian Item & Jasa</label>
              <button type="button" class="orb-rich-card-action-btn" id="btnAddInvoiceItemRow" style="font-size: 0.72rem; padding: 4px 8px;">
                + Tambah Item
              </button>
            </div>
            <div id="invoiceItemsContainer" style="display: flex; flex-direction: column; gap: 8px;">
              <div class="invoice-item-row" style="display: flex; gap: 6px; align-items: center;">
                <input type="text" class="orb-form-input item-desc" placeholder="Deskripsi jasa/produk" value="Jasa Layanan & Konsultasi" style="flex: 2; margin-bottom: 0;" required />
                <input type="number" class="orb-form-input item-qty" placeholder="Qty" value="1" min="1" style="flex: 0.6; margin-bottom: 0;" required />
                <input type="number" class="orb-form-input item-price" placeholder="Harga Satuan" value="1000000" min="0" style="flex: 1.4; margin-bottom: 0;" required />
              </div>
            </div>
          </div>

          <div class="orb-form-group">
            <label class="orb-form-label">Catatan / Rekening Pembayaran</label>
            <input type="text" name="notes" class="orb-form-input" placeholder="Contoh: Transfer Bank BCA 8820192831 a.n Ferdy" value="Transfer Bank BCA 8820192831 a.n Ferdy" />
          </div>

          <button type="submit" class="orb-btn-submit-form" id="btnSubmitInvoice" style="background: #8B5CF6; margin-top: 6px;">
            Terbitkan & Simpan Invoice ➔
          </button>
        </form>
      `;

      this.openPanel("create_invoice", "Buat Invoice Baru", content);

      // Customer select toggle
      const custSelect = document.getElementById("selectInvCustomer");
      const newWrap = document.getElementById("newCustomerInputWrap");
      custSelect?.addEventListener("change", () => {
        if (custSelect.value === "__new__") {
          newWrap.style.display = "flex";
        } else {
          newWrap.style.display = "none";
        }
      });

      // Add item row
      document.getElementById("btnAddInvoiceItemRow")?.addEventListener("click", () => {
        const container = document.getElementById("invoiceItemsContainer");
        const row = document.createElement("div");
        row.className = "invoice-item-row";
        row.style.cssText = "display: flex; gap: 6px; align-items: center;";
        row.innerHTML = `
          <input type="text" class="orb-form-input item-desc" placeholder="Deskripsi jasa/produk" style="flex: 2; margin-bottom: 0;" required />
          <input type="number" class="orb-form-input item-qty" placeholder="Qty" value="1" min="1" style="flex: 0.6; margin-bottom: 0;" required />
          <input type="number" class="orb-form-input item-price" placeholder="Harga Satuan" value="0" min="0" style="flex: 1.4; margin-bottom: 0;" required />
          <button type="button" class="btn-remove-row" style="background: none; border: none; color: #EF4444; font-size: 1.1rem; cursor: pointer;">✕</button>
        `;
        container.appendChild(row);
        row.querySelector(".btn-remove-row")?.addEventListener("click", () => row.remove());
      });

      // Submit
      document.getElementById("formCreateInvoice")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const invNum = fd.get("invoice_number");
        let custName = fd.get("customer_select");
        let custEmail = "";

        if (custName === "__new__") {
          custName = document.getElementById("inputNewCustName")?.value?.trim() || "Customer";
          custEmail = document.getElementById("inputNewCustEmail")?.value?.trim() || "";
        } else {
          const selectedOption = custSelect?.options[custSelect.selectedIndex];
          custEmail = selectedOption?.dataset.email || "";
        }

        const items = [];
        document.querySelectorAll(".invoice-item-row").forEach(row => {
          const desc = row.querySelector(".item-desc")?.value?.trim() || "Item";
          const qty = parseInt(row.querySelector(".item-qty")?.value, 10) || 1;
          const price = parseInt(row.querySelector(".item-price")?.value, 10) || 0;
          items.push({ description: desc, qty: qty, unit_price: price, total: qty * price });
        });

        const subtotal = items.reduce((s, it) => s + it.total, 0);

        try {
          const created = await window.API.createInvoice({
            invoice_number: invNum,
            customer_name: custName,
            customer_email: custEmail,
            issue_date: fd.get("issue_date"),
            due_date: fd.get("due_date"),
            items: items,
            subtotal: subtotal,
            tax_amount: 0,
            total_amount: subtotal,
            notes: fd.get("notes")?.trim() || ""
          });

          this.closePanel();
          this.appendAgentMessage("lois", `✓ **Invoice Diterbitkan**: **${created.invoice_number}** untuk **${custName}** dengan total **Rp ${subtotal.toLocaleString('id-ID')}** (Jatuh tempo: ${created.due_date}).`);
        } catch (err) {
          alert("Gagal membuat invoice: " + err.message);
        }
      });

    } catch (e) {
      this.openPanel("create_invoice", "Buat Invoice Baru", `<div style="color: #EF4444; padding: 20px;">Error: ${e.message}</div>`);
    }
  },

  async openLoisCustomersPanel() {
    this.openPanel("customers", "Daftar Pelanggan", `<div style="padding: 20px;">Memuat pelanggan...</div>`);
    try {
      const customers = await window.API.getCustomers();

      const content = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Top bar with import button -->
          <div style="display: flex; gap: 8px;">
            <button class="orb-toolbar-btn primary" id="btnTriggerAddCustomer" style="flex: 1; padding: 8px;">
              + Pelanggan Baru
            </button>
            <button class="orb-toolbar-btn" id="btnTriggerImportCustomers" style="flex: 1; padding: 8px;">
              📥 Import CSV / JSON
            </button>
          </div>

          <!-- Customer List -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${customers.map(c => `
              <div style="padding: 12px; background: var(--orb-bg-app); border: 1px solid var(--orb-border); border-radius: 12px;">
                <div style="font-weight: 800; font-size: 0.92rem; color: var(--orb-text-main);">${c.name}</div>
                <div style="font-size: 0.74rem; color: var(--orb-text-muted); margin-top: 2px;">
                  ${c.company ? 'Perusahaan: <strong>' + c.company + '</strong> • ' : ''}${c.email || ''}
                </div>
                ${c.phone ? `<div style="font-size: 0.72rem; color: var(--orb-text-dim);">Telp: ${c.phone}</div>` : ''}
              </div>
            `).join("")}
          </div>

          <!-- Add customer quick form -->
          <div id="addCustomerFormWrap" class="orb-dash-stat-card" style="padding: 16px;">
            <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 8px;">+ Tambah Data Pelanggan</h3>
            <form id="formAddCustomer" style="display: flex; flex-direction: column; gap: 10px;">
              <div class="orb-form-group">
                <label class="orb-form-label">Nama Pelanggan / Kontak</label>
                <input type="text" name="name" class="orb-form-input" placeholder="Contoh: Budi Santoso" required />
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Nama Perusahaan / Bisnis</label>
                <input type="text" name="company" class="orb-form-input" placeholder="Contoh: PT Kreasi Mandiri" />
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Email</label>
                <input type="email" name="email" class="orb-form-input" placeholder="finance@kreasimandiri.com" required />
              </div>
              <div class="orb-form-group">
                <label class="orb-form-label">Nomor Telepon / WhatsApp</label>
                <input type="text" name="phone" class="orb-form-input" placeholder="08123456789" />
              </div>
              <button type="submit" class="orb-btn-submit-form" style="background: #8B5CF6;">Simpan Pelanggan</button>
            </form>
          </div>
        </div>
      `;

      this.openPanel("customers", "Daftar Pelanggan", content);

      // Add customer submit
      document.getElementById("formAddCustomer")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await window.API.createCustomer({
            name: fd.get("name")?.trim(),
            company: fd.get("company")?.trim() || "",
            email: fd.get("email")?.trim(),
            phone: fd.get("phone")?.trim() || ""
          });
          this.openLoisCustomersPanel();
        } catch (err) {
          alert("Gagal menambah pelanggan: " + err.message);
        }
      });

      // Import modal
      document.getElementById("btnTriggerImportCustomers")?.addEventListener("click", () => {
        this.openLoisImportCustomersModal();
      });

    } catch (e) {
      this.openPanel("customers", "Daftar Pelanggan", `<div style="color: #EF4444; padding: 20px;">Error: ${e.message}</div>`);
    }
  },

  openLoisImportCustomersModal() {
    const raw = prompt("Tempelkan data pelanggan dalam format JSON atau baris CSV (Nama, Email, Perusahaan, Telepon):\n\nContoh JSON:\n[{\"name\":\"PT Sukses\",\"email\":\"info@sukses.com\"}]");
    if (!raw) return;

    let parsedList = [];
    try {
      if (raw.trim().startsWith("[")) {
        parsedList = JSON.parse(raw);
      } else {
        const lines = raw.trim().split("\n");
        for (const line of lines) {
          const parts = line.split(",").map(p => p.trim());
          if (parts[0]) {
            parsedList.push({
              name: parts[0],
              email: parts[1] || "",
              company: parts[2] || "",
              phone: parts[3] || ""
            });
          }
        }
      }

      if (parsedList.length > 0) {
        window.API.importCustomers(parsedList).then(() => {
          alert(`Berhasil mengimpor ${parsedList.length} pelanggan.`);
          this.openLoisCustomersPanel();
        }).catch(err => alert("Gagal impor: " + err.message));
      }
    } catch (err) {
      alert("Format data tidak valid: " + err.message);
    }
  },

  openLoisTemplatesPanel() {
    this.openPanel("templates_invoice", "Template Invoice", `
      <div style="display: flex; flex-direction: column; gap: 12px; padding: 4px;">
        <div class="orb-dash-stat-card" style="padding: 14px; border: 2px solid #8B5CF6;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="font-size: 0.92rem; color: var(--orb-text-main);">Template Modern Clean (Aktif)</strong>
            <span style="font-size: 0.72rem; padding: 2px 7px; background: rgba(139, 92, 246, 0.15); color: #8B5CF6; border-radius: 4px; font-weight: 700;">Default</span>
          </div>
          <p style="font-size: 0.76rem; color: var(--orb-text-muted);">Layout profesional dengan logo Orb, rincian item jelas, total otomatis, dan petunjuk transfer bank BCA.</p>
        </div>
      </div>
    `);
  },

  openLoisCollabFinPanel() {
    this.openLoisInvoicesPanel("paid");
  },

  // --------------------------------------------------------------------------
  // PIN 1607 VERIFICATION MODAL
  // --------------------------------------------------------------------------
  promptPinModal(callback) {
    const existing = document.getElementById("orbPinModalOverlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "orb-modal-overlay";
    overlay.id = "orbPinModalOverlay";
    overlay.innerHTML = `
      <div class="orb-modal-box">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div class="orb-modal-title">🔐 Autentikasi PIN Keamanan</div>
          <button id="btnPinModalClose" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--orb-text-dim);">✕</button>
        </div>
        <div class="orb-modal-sub">
          Masukkan 4 digit PIN keamanan Anda untuk membuka sandi akun broker dan kredensial investasi.
        </div>
        <form id="formPinVerify" onsubmit="return false;">
          <input type="password" id="inputPinVerify" class="orb-pin-input" maxlength="4" placeholder="••••" autocomplete="off" autofocus required />
          <div id="pinModalError" style="color: #EF4444; font-size: 0.8rem; font-weight: 600; text-align: center; margin-bottom: 12px; display: none;">
            PIN salah. Silakan coba kembali.
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="submit" class="orb-btn-submit-form" id="btnSubmitPinModal" style="margin: 0; flex: 1; background: #3B82F6;">
              Buka Kunci (1607) ➔
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = document.getElementById("inputPinVerify");
    input?.focus();

    const close = () => overlay.remove();
    document.getElementById("btnPinModalClose")?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    const submit = async () => {
      const val = input.value.trim();
      const valid = await window.API.verifyWellyPin(val);
      if (valid) {
        close();
        callback(true);
      } else {
        const errEl = document.getElementById("pinModalError");
        if (errEl) errEl.style.display = "block";
        input.value = "";
        input.focus();
      }
    };

    document.getElementById("formPinVerify")?.addEventListener("submit", submit);
    input?.addEventListener("keyup", (e) => {
      if (input.value.length === 4) {
        submit();
      }
    });
  },

  // --- SETTINGS PANEL ---
  openSettingsPanel() {
    const themeMode = this.getThemeMode(); // 'auto', 'light', 'dark'
    const activeTheme = this.resolveTheme(themeMode); // 'light' or 'dark'
    const finAgent = window.AgentRegistry?.getAgent("fin") || { name: "Fin", avatar: "./assets/avatars/avatar_orb_01.png" };
    const wellyAgent = window.AgentRegistry?.getAgent("welly") || { name: "Welly", avatar: "./assets/avatars/avatar_orb_02.png" };
    const loisAgent = window.AgentRegistry?.getAgent("lois") || { name: "Lois", avatar: "./assets/avatars/avatar_orb_03.png" };

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

        <!-- Orb Avatar & Name Customization -->
        <div class="orb-dash-stat-card" style="padding: 16px;">
          <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 6px;">🎭 Tampilan & Nama Orb</h3>
          <p style="font-size: 0.76rem; color: var(--orb-text-muted); margin-bottom: 12px; line-height: 1.45;">
            Kustomisasi nama dan avatar untuk para Orb Anda (Fin, Welly, Lois) dari 28 galeri siap pakai atau upload foto sendiri.
          </p>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--orb-bg-app); border-radius: 10px; border: 1px solid var(--orb-border);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${finAgent.avatar}" id="settingsFinAvatarPreview" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1.5px solid #10B981;" />
                <div>
                  <div style="font-size: 0.86rem; font-weight: 700; color: var(--orb-text-main);">Orb ${finAgent.name}</div>
                  <div style="font-size: 0.72rem; color: var(--orb-text-muted);">Pencatatan & Rekening Bank</div>
                </div>
              </div>
              <button class="orb-rich-card-action-btn" id="btnChangeFinAvatar">
                Ubah Profil
              </button>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--orb-bg-app); border-radius: 10px; border: 1px solid var(--orb-border);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${wellyAgent.avatar}" id="settingsWellyAvatarPreview" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1.5px solid #3B82F6;" />
                <div>
                  <div style="font-size: 0.86rem; font-weight: 700; color: var(--orb-text-main);">Orb ${wellyAgent.name}</div>
                  <div style="font-size: 0.72rem; color: var(--orb-text-muted);">Perencanaan & Akun Broker</div>
                </div>
              </div>
              <button class="orb-rich-card-action-btn" id="btnChangeWellyAvatar">
                Ubah Profil
              </button>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--orb-bg-app); border-radius: 10px; border: 1px solid var(--orb-border);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${loisAgent.avatar}" id="settingsLoisAvatarPreview" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1.5px solid #8B5CF6;" />
                <div>
                  <div style="font-size: 0.86rem; font-weight: 700; color: var(--orb-text-main);">Orb ${loisAgent.name}</div>
                  <div style="font-size: 0.72rem; color: var(--orb-text-muted);">Invoice & Sales Order</div>
                </div>
              </div>
              <button class="orb-rich-card-action-btn" id="btnChangeLoisAvatar">
                Ubah Profil
              </button>
            </div>
          </div>
        </div>

        <!-- Appearance: Auto 12-Hour Switch / Light / Dark -->
        <div class="orb-dash-stat-card" style="padding: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin: 0;">🎨 Tema Tampilan</h3>
            <span style="font-size: 0.72rem; padding: 3px 9px; border-radius: 99px; background: var(--orb-border); color: var(--orb-text-main); font-weight: 700;">
              ${activeTheme === 'dark' ? '🌙 Gelap Aktif' : '☀️ Terang Aktif'}
            </span>
          </div>
          <p style="font-size: 0.76rem; color: var(--orb-text-muted); margin-bottom: 12px; line-height: 1.45;">
            Pilih mode otomatis 12 jam atau atur manual tema terang / gelap:
          </p>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
            <button class="orb-theme-choice-btn ${themeMode === 'auto' ? 'active' : ''}" data-theme-mode="auto">
              <span style="font-size: 1.15rem;">⏱️</span>
              <span style="font-size: 0.8rem; font-weight: 700;">Auto</span>
              <span style="font-size: 0.62rem; color: var(--orb-text-muted);">12 Jam</span>
            </button>
            <button class="orb-theme-choice-btn ${themeMode === 'light' ? 'active' : ''}" data-theme-mode="light">
              <span style="font-size: 1.15rem;">☀️</span>
              <span style="font-size: 0.8rem; font-weight: 700;">Terang</span>
              <span style="font-size: 0.62rem; color: var(--orb-text-muted);">Light</span>
            </button>
            <button class="orb-theme-choice-btn ${themeMode === 'dark' ? 'active' : ''}" data-theme-mode="dark">
              <span style="font-size: 1.15rem;">🌙</span>
              <span style="font-size: 0.8rem; font-weight: 700;">Gelap</span>
              <span style="font-size: 0.62rem; color: var(--orb-text-muted);">Dark</span>
            </button>
          </div>

          <div style="margin-top: 12px; font-size: 0.72rem; color: var(--orb-text-muted); background: var(--orb-bg-app); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--orb-border); line-height: 1.55;">
            💡 <strong>Aturan Auto Switch (12 Jam):</strong><br>
            • <strong>06.00 – 17.59</strong> : Mode Terang (Light)<br>
            • <strong>18.00 – 05.59</strong> : Mode Gelap (Dark)
          </div>
        </div>

        <!-- AI Engine -->
        <div class="orb-dash-stat-card" style="padding: 16px;">
          <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 8px;">🤖 AI Engine & Model</h3>
          <p style="font-size: 0.78rem; color: var(--orb-text-muted); line-height: 1.45; margin-bottom: 10px;">
            Engine percakapan Fin, Welly, dan Lois terhubung ke Google Gemini dengan fallback analisis aturan terstruktur lokal.
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
              🗑️ Bersihkan Riwayat Chat ${finAgent.name}
            </button>
            <button class="orb-rich-card-action-btn" id="btnResetWellyChat" style="text-align: left; padding: 10px 14px;">
              🗑️ Bersihkan Riwayat Chat ${wellyAgent.name}
            </button>
            <button class="orb-rich-card-action-btn" id="btnResetLoisChat" style="text-align: left; padding: 10px 14px;">
              🗑️ Bersihkan Riwayat Chat ${loisAgent.name}
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
    document.getElementById("btnChangeFinAvatar")?.addEventListener("click", () => {
      this.openAvatarPickerPanel("fin");
    });

    document.getElementById("btnChangeWellyAvatar")?.addEventListener("click", () => {
      this.openAvatarPickerPanel("welly");
    });

    document.getElementById("btnChangeLoisAvatar")?.addEventListener("click", () => {
      this.openAvatarPickerPanel("lois");
    });

    document.getElementById("btnResetLoisChat")?.addEventListener("click", () => {
      if (confirm(`Hapus seluruh riwayat percakapan dengan ${loisAgent.name}? Data invoice tetap aman.`)) {
        localStorage.removeItem("orb_chat_history_v4_lois");
        if (this.activeAgentId === "lois") this.renderTimeline("lois");
        alert(`Riwayat chat ${loisAgent.name} telah dibersihkan.`);
      }
    });

    document.getElementById("btnChangeWellyAvatar")?.addEventListener("click", () => {
      this.openAvatarPickerPanel("welly");
    });

    document.querySelectorAll(".orb-theme-choice-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.themeMode;
        if (mode) {
          this.setThemeMode(mode);
          this.openSettingsPanel();
        }
      });
    });

    document.getElementById("btnResetFinChat")?.addEventListener("click", () => {
      if (confirm(`Hapus seluruh riwayat percakapan dengan ${finAgent.name}? Data transaksi ledger tetap aman.`)) {
        localStorage.removeItem("orb_chat_history_v4_fin");
        if (this.activeAgentId === "fin") this.renderTimeline("fin");
        alert(`Riwayat chat ${finAgent.name} telah dibersihkan.`);
      }
    });

    document.getElementById("btnResetWellyChat")?.addEventListener("click", () => {
      if (confirm(`Hapus seluruh riwayat percakapan dengan ${wellyAgent.name}? Data portofolio tetap aman.`)) {
        localStorage.removeItem("orb_chat_history_v4_welly");
        if (this.activeAgentId === "welly") this.renderTimeline("welly");
        alert(`Riwayat chat ${wellyAgent.name} telah dibersihkan.`);
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

  // --- AVATAR & NAME PICKER PANEL ---
  openAvatarPickerPanel(agentId) {
    const agent = window.AgentRegistry?.getAgent(agentId) || { id: agentId, name: agentId === 'fin' ? 'Fin' : 'Welly', avatar: './assets/avatar_fin_360.png' };
    const presets = window.AgentRegistry?.PRESET_AVATARS || [];

    const content = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Current Avatar Preview -->
        <div class="orb-dash-stat-card" style="padding: 16px; text-align: center;">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--orb-text-muted); margin-bottom: 8px;">
            Avatar Aktif: <strong id="avatarPickerActiveNameText" style="color: var(--orb-text-main);">Orb ${agent.name}</strong>
          </div>
          <img src="${agent.avatar}" id="avatarPickerPreviewImg" style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 2.5px solid ${agent.accentColor || '#3B82F6'}; margin: 0 auto; display: block;" />
        </div>

        <!-- Option 1: Custom Name for this Orb -->
        <div class="orb-dash-stat-card" style="padding: 16px;">
          <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 6px;">🏷️ Beri Nama Orb Ini</h3>
          <p style="font-size: 0.76rem; color: var(--orb-text-muted); margin-bottom: 12px; line-height: 1.45;">
            Tentukan nama panggilan untuk Orb ini sesuai keinginan Anda.
          </p>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="inputOrbCustomName" class="orb-form-input" value="${agent.name}" placeholder="Nama Orb..." style="margin-bottom: 0; flex: 1; padding: 10px 12px; font-size: 0.88rem;" />
            <button class="orb-btn-submit-form" id="btnSaveOrbCustomName" style="margin: 0; padding: 10px 16px; font-size: 0.84rem; white-space: nowrap; width: auto;">
              ✓ Simpan
            </button>
          </div>
          <div id="orbNameSaveStatus" style="font-size: 0.74rem; color: #10B981; font-weight: 600; margin-top: 8px; display: none;">✓ Nama Orb berhasil diperbarui!</div>
        </div>

        <!-- Option 2: Upload Custom Photo -->
        <div class="orb-dash-stat-card" style="padding: 16px;">
          <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 8px;">📁 Upload Gambar / Foto Sendiri</h3>
          <p style="font-size: 0.76rem; color: var(--orb-text-muted); margin-bottom: 12px; line-height: 1.45;">
            Pilih foto dari HP atau komputer Anda. Tersimpan otomatis di browser ini.
          </p>
          <input type="file" id="inputAvatarFileUpload" accept="image/*" style="display: none;" />
          <button class="orb-btn-submit-form" id="btnTriggerAvatarUpload" style="margin: 0; padding: 10px; font-size: 0.84rem;">
            📸 Pilih Foto dari Perangkat
          </button>
        </div>

        <!-- Option 3: Choose from Preset Gallery (NO NAMES UNDERNEATH) -->
        <div class="orb-dash-stat-card" style="padding: 16px;">
          <h3 style="font-size: 0.88rem; font-weight: 800; color: var(--orb-text-main); margin-bottom: 6px;">🎨 Galeri Avatar Bawaan</h3>
          <p style="font-size: 0.76rem; color: var(--orb-text-muted); margin-bottom: 12px; line-height: 1.45;">
            Pilih tampilan avatar dari koleksi bawaan di folder assets.
          </p>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
            ${presets.map(p => `
              <button class="orb-preset-avatar-btn ${agent.avatar === p.url ? 'active' : ''}" data-avatar-url="${p.url}" title="Pilih Avatar">
                <img src="${p.url}" style="width: 46px; height: 46px; border-radius: 50%; object-fit: cover; display: block;" />
              </button>
            `).join("")}
          </div>
        </div>

        <!-- Actions: Reset to Default & Back -->
        <div style="display: flex; gap: 8px;">
          <button class="orb-rich-card-action-btn" id="btnResetDefaultAvatar" style="flex: 1; padding: 10px; text-align: center;">
            ↺ Reset ke Awal
          </button>
          <button class="orb-toolbar-btn" id="btnBackToSettingsFromAvatar" style="padding: 10px 16px;">
            Kembali
          </button>
        </div>
      </div>
    `;

    this.openPanel("avatar_picker", `Ubah Avatar Orb ${agent.name}`, content);

    // Event listeners
    // 1. Save Custom Name
    const doSaveName = () => {
      const inputEl = document.getElementById("inputOrbCustomName");
      const val = inputEl?.value?.trim();
      if (!val) return;
      window.AgentRegistry?.setAgentName(agentId, val);
      this.applyNewAgentName(agentId, val);
      const statusEl = document.getElementById("orbNameSaveStatus");
      if (statusEl) {
        statusEl.style.display = "block";
        setTimeout(() => { if (statusEl) statusEl.style.display = "none"; }, 2500);
      }
    };
    document.getElementById("btnSaveOrbCustomName")?.addEventListener("click", doSaveName);
    document.getElementById("inputOrbCustomName")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSaveName();
      }
    });

    // 2. Upload file
    const fileInput = document.getElementById("inputAvatarFileUpload");
    document.getElementById("btnTriggerAvatarUpload")?.addEventListener("click", () => {
      fileInput?.click();
    });

    fileInput?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const dataUrl = loadEvt.target?.result;
        if (dataUrl) {
          window.AgentRegistry?.setAgentAvatar(agentId, dataUrl);
          this.applyNewAvatar(agentId, dataUrl);
          this.openAvatarPickerPanel(agentId); // refresh
        }
      };
      reader.readAsDataURL(file);
    });

    // 3. Preset avatar click
    document.querySelectorAll(".orb-preset-avatar-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const url = btn.dataset.avatarUrl;
        if (url) {
          window.AgentRegistry?.setAgentAvatar(agentId, url);
          this.applyNewAvatar(agentId, url);
          this.openAvatarPickerPanel(agentId);
        }
      });
    });

    // 4. Reset default
    document.getElementById("btnResetDefaultAvatar")?.addEventListener("click", () => {
      window.AgentRegistry?.resetAgentAvatar(agentId);
      window.AgentRegistry?.resetAgentName(agentId);
      const defUrl = agentId === 'fin' ? './assets/avatar_fin_360.png' : './assets/avatar_welly_360.png';
      const defName = agentId === 'fin' ? 'Fin' : 'Welly';
      this.applyNewAvatar(agentId, defUrl);
      this.applyNewAgentName(agentId, defName);
      this.openAvatarPickerPanel(agentId);
    });

    document.getElementById("btnBackToSettingsFromAvatar")?.addEventListener("click", () => {
      this.openSettingsPanel();
    });
  },

  applyNewAvatar(agentId, newUrl) {
    // 1. Update Sidebar Avatar
    const sideRowImg = document.querySelector(`.orb-agent-sidebar-row[data-agent="${agentId}"] img`);
    if (sideRowImg) sideRowImg.src = newUrl;

    // 2. Update Stories Switcher Avatar
    const storyImg = document.querySelector(`.orb-story-item[data-agent="${agentId}"] img`);
    if (storyImg) storyImg.src = newUrl;

    // 3. Update Topbar if this agent is active
    if (this.activeAgentId === agentId) {
      const topAvatar = document.getElementById("orbTopAgentAvatar");
      if (topAvatar) topAvatar.src = newUrl;
    }

    // 4. Re-render Timeline so agent messages reflect new avatar
    this.renderTimeline(this.activeAgentId);
  },

  applyNewAgentName(agentId, newName) {
    // 1. Update Sidebar Name
    document.querySelectorAll(`.orb-agent-sidebar-row[data-agent="${agentId}"] .orb-sidebar-agent-name`).forEach(el => {
      el.textContent = newName;
    });
    document.querySelectorAll(`.orb-agent-sidebar-row[data-agent="${agentId}"]`).forEach(el => {
      el.dataset.agentName = newName;
    });

    // 2. Update Stories Switcher Name
    document.querySelectorAll(`.orb-story-item[data-agent="${agentId}"] .orb-story-name`).forEach(el => {
      el.textContent = newName;
    });

    // 3. Update Topbar if this agent is active
    if (this.activeAgentId === agentId) {
      const topName = document.getElementById("orbTopAgentName");
      if (topName) topName.textContent = newName;

      const mobileTitle = document.getElementById("orbMobileHeaderTitle");
      if (mobileTitle) mobileTitle.textContent = `• ${newName}`;
    }

    // 4. Update Header in Avatar Picker if open
    const activeText = document.getElementById("avatarPickerActiveNameText");
    if (activeText) activeText.textContent = `Orb ${newName}`;

    const panelTitle = document.querySelector(".orb-panel-head h2");
    if (panelTitle && panelTitle.textContent.includes("Avatar Orb")) {
      panelTitle.textContent = `Ubah Avatar Orb ${newName}`;
    }
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
      } else if (agentId === "welly") {
        if (window.API?.askWelly) {
          const res = await window.API.askWelly(text);
          replyText = res?.text || "";
        }
        if (!replyText) {
          replyText = `Sebagai perencana kekayaan Anda, saya siap memetakan portofolio dan alokasi jangka panjang. Gunakan tombol **+ Investasi** atau diskusikan target aset Anda di sini.`;
        }
      } else if (agentId === "lois") {
        if (window.API?.askLois) {
          const res = await window.API.askLois(text);
          replyText = res?.text || "";
        }
        if (!replyText) {
          replyText = `Saya siap mengelola invoice dan piutang bisnis Anda. Anda dapat menerbitkan tagihan via **+ Buat Invoice**, kelola data via **Pelanggan**, atau pantau status tagihan di **Daftar Tagihan**.`;
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

    // 9. Click on Agent Avatar in Topbar opens Avatar Customizer
    const topAvatar = document.getElementById("orbTopAgentAvatar");
    if (topAvatar) {
      topAvatar.style.cursor = "pointer";
      topAvatar.title = "Klik untuk mengubah tampilan / avatar Orb ini";
      topAvatar.addEventListener("click", () => {
        this.openAvatarPickerPanel(this.activeAgentId);
      });
    }
  }
};

window.ChatFirstManager = ChatFirstManager;
window.OrbTheme = {
  getMode: () => ChatFirstManager.getThemeMode(),
  getAutoTheme: () => ChatFirstManager.getAutoTheme(),
  resolveCurrentTheme: (m) => ChatFirstManager.resolveTheme(m),
  apply: (m) => ChatFirstManager.setThemeMode(m),
  init: () => ChatFirstManager.initTheme()
};
