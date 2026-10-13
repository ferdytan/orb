/* ==========================================================================
   ORB - BENTO WIDGETS MANAGER (INTERACTIVE & AGENT-LINKED)
   ========================================================================== */

const BentoManager = {
  goals: [],
  wallet: { balance: 1400, currency: "USD", last_transaction: "" },
  talents: [],
  collections: [],
  currentCurrency: "USD",

  init(initialData = {}) {
    if (initialData.goals && initialData.goals.length > 0) this.goals = initialData.goals;
    if (initialData.wallet) this.wallet = initialData.wallet;
    if (initialData.talents && initialData.talents.length > 0) this.talents = initialData.talents;
    if (initialData.collections && initialData.collections.length > 0) this.collections = initialData.collections;

    this.renderGoalWidget();
    this.renderWalletWidget();
    this.renderGoalsTab();
    this.setupListeners();
  },

  renderGoalWidget() {
    if (!this.goals || this.goals.length === 0) return;
    const activeGoal = this.goals[0];

    const heroEl = document.getElementById("goalHeroTitle");
    const milestoneEl = document.getElementById("goalMilestoneText");
    const checkboxEl = document.getElementById("goalCheckboxBtn");
    const fillEl = document.getElementById("goalProgressFill");

    if (heroEl) heroEl.textContent = activeGoal.title;
    if (milestoneEl) milestoneEl.textContent = `Milestone: ${activeGoal.milestone}`;
    if (checkboxEl) {
      checkboxEl.classList.toggle("completed", activeGoal.completed === 1);
      checkboxEl.innerHTML = activeGoal.completed === 1 ? "✓" : "";
    }
    if (fillEl) {
      fillEl.style.width = `${activeGoal.progress_pct}%`;
    }
  },

  renderWalletWidget() {
    const digitsEl = document.getElementById("walletBalanceDigits");
    const noteEl = document.getElementById("walletNoteText");
    if (!digitsEl) return;

    if (this.currentCurrency === "USD") {
      digitsEl.textContent = Number(this.wallet.balance).toLocaleString("en-US");
    } else {
      const idr = this.wallet.balance * 16000;
      digitsEl.textContent = `Rp ${Number(idr).toLocaleString("id-ID")}`;
    }

    if (noteEl) {
      noteEl.textContent = this.wallet.last_transaction || "Synced with Fin";
    }
  },

  renderGoalsTab() {
    const container = document.getElementById("fullGoalsListContainer");
    if (!container) return;

    let html = `<div style="display: flex; flex-direction: column; gap: 12px;">`;
    this.goals.forEach((goal) => {
      html += `
        <div style="background: var(--bg-widget); padding: 16px; border-radius: 20px; border: 1px solid var(--border-widget); box-shadow: var(--shadow-widget);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div style="font-weight: 800; font-size: 1rem; color: var(--text-main);">${goal.title}</div>
            <span style="font-size: 0.72rem; font-weight: 700; background: var(--bg-pill); padding: 3px 10px; border-radius: 99px; color: #10B981;">${goal.progress_pct}%</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px;">Milestone: ${goal.milestone}</div>
          <div style="background: var(--bg-pill); height: 7px; border-radius: 99px; overflow: hidden;">
            <div style="background: linear-gradient(90deg, #3B82F6, #10B981); height: 100%; width: ${goal.progress_pct}%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted); margin-top: 8px;">
            <span>Assigned: <strong>${(goal.assigned_agent_id || 'Fin').toUpperCase()}</strong></span>
            <span>Target: ${goal.target_value || '100%'}</span>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;
  },

  async toggleMilestone(goalId) {
    const goal = this.goals.find(g => g.id === goalId) || this.goals[0];
    if (!goal) return;

    const newCompleted = goal.completed === 1 ? 0 : 1;
    const newProgress = newCompleted === 1 ? Math.min(100, goal.progress_pct + 20) : Math.max(10, goal.progress_pct - 20);

    goal.completed = newCompleted;
    goal.progress_pct = newProgress;
    this.renderGoalWidget();
    this.renderGoalsTab();

    try {
      await window.API?.updateGoal(goal.id, {
        progress_pct: newProgress,
        completed: newCompleted
      });
    } catch (_) {}
  },

  toggleCurrency() {
    this.currentCurrency = this.currentCurrency === "USD" ? "IDR" : "USD";
    this.renderWalletWidget();
  },

  setupListeners() {
    // Checkbox inside goal
    const checkboxEl = document.getElementById("goalCheckboxBtn");
    if (checkboxEl) {
      checkboxEl.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleMilestone(this.goals[0]?.id || 1);
      });
    }

    // Goal Widget Click -> Opens Nova (Analytics/Goal agent) or Goal modal
    const goalCard = document.getElementById("bentoGoalCard");
    if (goalCard) {
      goalCard.addEventListener("click", () => {
        // Open Nova agent dashboard directly as requested!
        if (window.AgentModalManager) {
          window.AgentModalManager.open("nova");
        } else {
          this.openGoalModal();
        }
      });
    }

    // Wallet Widget Click -> Opens Fin (Finance agent)
    const walletCard = document.getElementById("bentoWalletCard");
    if (walletCard) {
      walletCard.addEventListener("click", () => {
        if (window.AgentModalManager) {
          window.AgentModalManager.open("fin");
        } else {
          this.openWalletModal();
        }
      });
    }

    // Talent Widget Click -> Opens Atlas (Ops & Talent agent)
    const talentCard = document.getElementById("bentoTalentCard");
    if (talentCard) {
      talentCard.addEventListener("click", () => {
        if (window.AgentModalManager) {
          window.AgentModalManager.open("atlas");
        } else {
          this.openTalentModal();
        }
      });
    }

    // Collections Widget Click -> Opens Muse / Badges modal
    const collectionsCard = document.getElementById("bentoCollectionsCard");
    if (collectionsCard) {
      collectionsCard.addEventListener("click", () => {
        if (window.AgentModalManager) {
          window.AgentModalManager.open("muse");
        } else {
          this.openCollectionsModal();
        }
      });
    }
  },

  openGoalModal() {
    const modal = document.getElementById("genericOrbModal");
    const title = document.getElementById("genericModalTitle");
    const body = document.getElementById("genericModalBody");

    if (!modal || !body) return;
    title.textContent = "Crew Goals (Managed by Nova)";

    let html = `<div style="display: flex; flex-direction: column; gap: 12px;">`;
    this.goals.forEach(goal => {
      html += `
        <div style="background: var(--bg-widget); padding: 12px; border-radius: 16px; border: 1px solid var(--border-light);">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 800;">${goal.title}</span>
            <span style="color: #10B981; font-weight: 700;">${goal.progress_pct}%</span>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 4px;">Milestone: ${goal.milestone}</div>
        </div>
      `;
    });
    html += `
      <button id="talkToNovaBtn" style="background: #8B5CF6; color: white; border: none; padding: 10px; border-radius: 14px; font-weight: 700; cursor: pointer;">
        💬 Chat with Nova about Goals
      </button>
    </div>`;

    body.innerHTML = html;
    modal.classList.add("active");

    document.getElementById("talkToNovaBtn")?.addEventListener("click", () => {
      modal.classList.remove("active");
      window.AgentModalManager?.open("nova");
    });
  },

  openWalletModal() {
    const modal = document.getElementById("genericOrbModal");
    const title = document.getElementById("genericModalTitle");
    const body = document.getElementById("genericModalBody");

    if (!modal || !body) return;
    title.textContent = "Orb Wallet (Managed by Fin)";

    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px; text-align: center;">
        <div style="font-size: 2.2rem; font-weight: 800; color: #10B981;">
          $${Number(this.wallet.balance).toLocaleString()}
        </div>
        <div style="font-size: 0.75rem; color: var(--text-secondary);">
          ${this.wallet.last_transaction || "Active cashflow synchronized with Fin"}
        </div>
        <button id="talkToFinBtn" style="background: #10B981; color: white; border: none; padding: 10px; border-radius: 14px; font-weight: 700; cursor: pointer; margin-top: 8px;">
          💬 Chat with Fin about Expenses
        </button>
      </div>
    `;
    modal.classList.add("active");

    document.getElementById("talkToFinBtn")?.addEventListener("click", () => {
      modal.classList.remove("active");
      window.AgentModalManager?.open("fin");
    });
  },

  openTalentModal() {
    const modal = document.getElementById("genericOrbModal");
    const title = document.getElementById("genericModalTitle");
    const body = document.getElementById("genericModalBody");

    if (!modal || !body) return;
    title.textContent = "Crew Talents & Synergy";

    let html = `<div style="display: flex; flex-direction: column; gap: 10px;">`;
    this.talents.forEach(t => {
      html += `
        <div style="background: var(--bg-widget); padding: 12px; border-radius: 14px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 800;">${t.category}</div>
            <div style="font-size: 0.7rem; color: var(--text-secondary);">${t.badge_name}</div>
          </div>
          <div style="font-size: 1.1rem; font-weight: 800; color: #3B82F6;">Lv. ${t.level}</div>
        </div>
      `;
    });
    html += `
      <button id="talkToAtlasBtn" style="background: #3B82F6; color: white; border: none; padding: 10px; border-radius: 14px; font-weight: 700; cursor: pointer;">
        💬 Chat with Atlas about Talents
      </button>
    </div>`;

    body.innerHTML = html;
    modal.classList.add("active");

    document.getElementById("talkToAtlasBtn")?.addEventListener("click", () => {
      modal.classList.remove("active");
      window.AgentModalManager?.open("atlas");
    });
  },

  openCollectionsModal() {
    const modal = document.getElementById("genericOrbModal");
    const title = document.getElementById("genericModalTitle");
    const body = document.getElementById("genericModalBody");

    if (!modal || !body) return;
    title.textContent = "Collections & Badges";

    let html = `<div style="display: flex; flex-direction: column; gap: 10px;">`;
    this.collections.forEach(b => {
      html += `
        <div style="background: var(--bg-widget); padding: 12px; border-radius: 14px; display: flex; gap: 10px; align-items: center;">
          <div style="font-size: 1.6rem;">${b.unlocked ? '🏅' : '🔒'}</div>
          <div>
            <div style="font-weight: 800; font-size: 0.9rem;">${b.title}</div>
            <div style="font-size: 0.7rem; color: var(--text-secondary);">${b.description}</div>
          </div>
        </div>
      `;
    });
    html += `
      <button id="talkToMuseBtn" style="background: #F59E0B; color: white; border: none; padding: 10px; border-radius: 14px; font-weight: 700; cursor: pointer;">
        💬 Chat with Muse about Collections
      </button>
    </div>`;

    body.innerHTML = html;
    modal.classList.add("active");

    document.getElementById("talkToMuseBtn")?.addEventListener("click", () => {
      modal.classList.remove("active");
      window.AgentModalManager?.open("muse");
    });
  }
};

window.BentoManager = BentoManager;
