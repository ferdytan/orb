/* ==========================================================================
   ORB - BENTO WIDGETS MANAGER
   ========================================================================== */

const BentoManager = {
  goals: [],
  wallet: { balance: 1400, currency: "USD", last_transaction: "" },
  talents: [],
  collections: [],
  currentCurrency: "USD",

  init(initialData = {}) {
    if (initialData.goals) this.goals = initialData.goals;
    if (initialData.wallet) this.wallet = initialData.wallet;
    if (initialData.talents) this.talents = initialData.talents;
    if (initialData.collections) this.collections = initialData.collections;

    this.renderGoalWidget();
    this.renderWalletWidget();
    this.setupListeners();
  },

  renderGoalWidget() {
    if (!this.goals || this.goals.length === 0) return;
    const activeGoal = this.goals[0]; // Primary highlighted goal

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
      // IDR conversion rate approx 1 USD = Rp 16.000
      const idr = this.wallet.balance * 16000;
      digitsEl.textContent = `Rp ${Number(idr).toLocaleString("id-ID")}`;
    }

    if (noteEl) {
      noteEl.textContent = this.wallet.last_transaction || "Synced with Fin";
    }
  },

  async toggleMilestone(goalId) {
    const goal = this.goals.find(g => g.id === goalId) || this.goals[0];
    if (!goal) return;

    const newCompleted = goal.completed === 1 ? 0 : 1;
    const newProgress = newCompleted === 1 ? Math.min(100, goal.progress_pct + 20) : Math.max(10, goal.progress_pct - 20);

    goal.completed = newCompleted;
    goal.progress_pct = newProgress;
    this.renderGoalWidget();

    // Call API
    try {
      await window.API?.updateGoal(goal.id, {
        progress_pct: newProgress,
        completed: newCompleted
      });
    } catch (e) {
      console.error("Failed to update goal:", e);
    }
  },

  toggleCurrency() {
    this.currentCurrency = this.currentCurrency === "USD" ? "IDR" : "USD";
    this.renderWalletWidget();
  },

  setupListeners() {
    // Goal checkbox
    const checkboxEl = document.getElementById("goalCheckboxBtn");
    if (checkboxEl) {
      checkboxEl.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleMilestone(this.goals[0]?.id || 1);
      });
    }

    // Goal widget card click -> open Goal modal
    const goalCard = document.getElementById("bentoGoalCard");
    if (goalCard) {
      goalCard.addEventListener("click", () => this.openGoalModal());
    }

    // Wallet widget card click -> open Wallet modal
    const walletCard = document.getElementById("bentoWalletCard");
    if (walletCard) {
      walletCard.addEventListener("click", () => this.openWalletModal());
    }

    // Talent widget card click -> open Talent modal
    const talentCard = document.getElementById("bentoTalentCard");
    if (talentCard) {
      talentCard.addEventListener("click", () => this.openTalentModal());
    }

    // Collections widget card click -> open Collections modal
    const collectionsCard = document.getElementById("bentoCollectionsCard");
    if (collectionsCard) {
      collectionsCard.addEventListener("click", () => this.openCollectionsModal());
    }
  },

  openGoalModal() {
    const modal = document.getElementById("genericOrbModal");
    const title = document.getElementById("genericModalTitle");
    const body = document.getElementById("genericModalBody");

    if (!modal || !body) return;
    title.textContent = "Crew Goals & Milestones";

    let html = `<div style="display: flex; flex-direction: column; gap: 14px;">`;
    this.goals.forEach(goal => {
      html += `
        <div style="background: var(--bg-widget); padding: 14px; border-radius: 18px; border: 1px solid var(--border-light);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="font-weight: 800; font-size: 0.95rem;">${goal.title}</div>
            <span style="font-size: 0.7rem; font-weight: 700; background: var(--bg-pill); padding: 3px 8px; border-radius: 99px;">${goal.progress_pct}%</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">Milestone: ${goal.milestone}</div>
          <div style="margin-top: 8px; background: var(--bg-pill); height: 6px; border-radius: 99px; overflow: hidden;">
            <div style="background: #10B981; height: 100%; width: ${goal.progress_pct}%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--text-muted); margin-top: 6px;">
            <span>Assigned: ${goal.assigned_agent_id ? goal.assigned_agent_id.toUpperCase() : 'SHARED'}</span>
            <span>${goal.current_value || ''} / ${goal.target_value || ''}</span>
          </div>
        </div>
      `;
    });
    html += `
      <button id="addSavingsProgressBtn" style="background: #10B981; color: white; border: none; padding: 10px; border-radius: 16px; font-weight: 700; font-size: 0.85rem; cursor: pointer;">
        + Simulate Rp 100k Savings Deposit (Fin)
      </button>
    </div>`;

    body.innerHTML = html;
    modal.classList.add("active");

    document.getElementById("addSavingsProgressBtn")?.addEventListener("click", async () => {
      await window.API?.sendChat("fin", "Please log Rp 100.000 towards the Save Rp 1 juta savings goal.");
      const updatedGoals = await window.API?.getGoals();
      this.goals = updatedGoals;
      this.renderGoalWidget();
      this.openGoalModal(); // re-render modal
    });
  },

  openWalletModal() {
    const modal = document.getElementById("genericOrbModal");
    const title = document.getElementById("genericModalTitle");
    const body = document.getElementById("genericModalBody");
    if (!modal || !body) return;

    title.textContent = "Orb Virtual Wallet";
    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px; text-align: center;">
        <div style="background: var(--bg-widget); padding: 20px; border-radius: 20px;">
          <div style="font-size: 0.8rem; color: var(--text-secondary);">Available Balance</div>
          <div style="font-size: 2rem; font-weight: 800; margin: 6px 0;">
            ${this.currentCurrency === 'USD' ? '$' + Number(this.wallet.balance).toLocaleString('en-US') : 'Rp ' + Number(this.wallet.balance * 16000).toLocaleString('id-ID')}
          </div>
          <button id="modalCurrencyToggleBtn" style="background: var(--bg-pill); border: none; padding: 6px 14px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; cursor: pointer; color: var(--text-main);">
            Switch to ${this.currentCurrency === 'USD' ? 'IDR (Rp)' : 'USD ($)'}
          </button>
        </div>
        <div style="text-align: left; background: var(--bg-widget); padding: 14px; border-radius: 18px;">
          <div style="font-weight: 700; font-size: 0.82rem; margin-bottom: 6px;">Recent Ledger Events</div>
          <div style="font-size: 0.74rem; color: var(--text-secondary); line-height: 1.5;">
            • ${this.wallet.last_transaction || 'Vault initialized'}<br>
            • Reserve allocation: Rp 1 juta target active<br>
            • Managed by Fin (Finance Plush Specialist)
          </div>
        </div>
      </div>
    `;

    modal.classList.add("active");
    document.getElementById("modalCurrencyToggleBtn")?.addEventListener("click", () => {
      this.toggleCurrency();
      this.openWalletModal();
    });
  },

  openTalentModal() {
    const modal = document.getElementById("genericOrbModal");
    const title = document.getElementById("genericModalTitle");
    const body = document.getElementById("genericModalBody");
    if (!modal || !body) return;

    title.textContent = "Talent & Agent Synergy";
    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="background: linear-gradient(135deg, #EF4444, #F87171); color: white; padding: 14px; border-radius: 18px;">
          <div style="display: flex; justify-content: space-between; font-weight: 800;">
            <span>Social</span><span>Level 8 (85 pts)</span>
          </div>
          <div style="font-size: 0.72rem; opacity: 0.9; margin-top: 4px;">Assigned to Chat & Echo • Community Catalyst</div>
        </div>
        <div style="background: linear-gradient(135deg, #EA580C, #FB923C); color: white; padding: 14px; border-radius: 18px;">
          <div style="display: flex; justify-content: space-between; font-weight: 800;">
            <span>Collab</span><span>Level 9 (92 pts)</span>
          </div>
          <div style="font-size: 0.72rem; opacity: 0.9; margin-top: 4px;">Assigned to Muse, Sage & Atlas • Synergy Master</div>
        </div>
        <div style="background: linear-gradient(135deg, #F59E0B, #FBBF24); color: white; padding: 14px; border-radius: 18px;">
          <div style="display: flex; justify-content: space-between; font-weight: 800;">
            <span>Creativity</span><span>Level 10 (98 pts)</span>
          </div>
          <div style="font-size: 0.72rem; opacity: 0.9; margin-top: 4px;">Assigned to Spark & Pixel • Orb Visionary</div>
        </div>
      </div>
    `;
    modal.classList.add("active");
  },

  openCollectionsModal() {
    const modal = document.getElementById("genericOrbModal");
    const title = document.getElementById("genericModalTitle");
    const body = document.getElementById("genericModalBody");
    if (!modal || !body) return;

    title.textContent = "Collections & Badges";
    body.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div style="background: var(--bg-widget); padding: 14px; border-radius: 18px; text-align: center; border: 1px solid var(--border-light);">
          <div style="font-size: 1.8rem;">🌟</div>
          <div style="font-weight: 800; font-size: 0.85rem; margin-top: 4px;">Achiever Star</div>
          <div style="font-size: 0.68rem; color: var(--text-secondary); margin-top: 2px;">Completed 5 daily milestones</div>
        </div>
        <div style="background: var(--bg-widget); padding: 14px; border-radius: 18px; text-align: center; border: 1px solid var(--border-light);">
          <div style="font-size: 1.8rem;">✨</div>
          <div style="font-weight: 800; font-size: 0.85rem; margin-top: 4px;">Celestial Spark</div>
          <div style="font-size: 0.68rem; color: var(--text-secondary); margin-top: 2px;">Unlocked 3 domain synergies</div>
        </div>
        <div style="background: var(--bg-widget); padding: 14px; border-radius: 18px; text-align: center; border: 1px solid var(--border-light);">
          <div style="font-size: 1.8rem;">🛡️</div>
          <div style="font-weight: 800; font-size: 0.85rem; margin-top: 4px;">Vault Keeper</div>
          <div style="font-size: 0.68rem; color: var(--text-secondary); margin-top: 2px;">Savings milestone badge</div>
        </div>
        <div style="background: var(--bg-widget); padding: 14px; border-radius: 18px; text-align: center; border: 1px solid var(--border-light); opacity: 0.6;">
          <div style="font-size: 1.8rem;">⚡</div>
          <div style="font-weight: 800; font-size: 0.85rem; margin-top: 4px;">Speed Demon</div>
          <div style="font-size: 0.68rem; color: var(--text-secondary); margin-top: 2px;">Sub-100ms routing speed</div>
        </div>
      </div>
    `;
    modal.classList.add("active");
  }
};

window.BentoManager = BentoManager;
