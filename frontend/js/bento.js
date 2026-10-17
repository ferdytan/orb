/* ==========================================================================
   ORB - AI AGENTS DASHBOARD & BENTO CONTROLLER
   Manages interactive tasks, agent routing, financial widget & quick actions.
   Strictly zero blocking awaits & responsive client-side state.
   ========================================================================== */

const BentoManager = {
  tasks: [
    { id: "t1", title: "Review anggaran bulanan", time: "09:00", done: true },
    { id: "t2", title: "Analisis pengeluaran Q3", time: "11:30", done: true },
    { id: "t3", title: "Update target tabungan", time: "14:00", done: true },
    { id: "t4", title: "Sinkronisasi portofolio", time: "16:30", done: false }
  ],

  init() {
    console.log("📊 Initializing AI Agents Dashboard Bento & Tasks...");
    this.loadTaskState();
    this.renderTasks();
    this.setupListeners();
    this.refresh();
  },

  loadTaskState() {
    try {
      const saved = localStorage.getItem("orb_ai_tasks_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.tasks.forEach(t => {
            const found = parsed.find(p => p.id === t.id);
            if (found) t.done = !!found.done;
          });
        }
      }
    } catch (_) {}
  },

  saveTaskState() {
    try {
      localStorage.setItem("orb_ai_tasks_state", JSON.stringify(this.tasks));
    } catch (_) {}
  },

  renderTasks() {
    const listEl = document.getElementById("aiTaskList");
    const countEl = document.getElementById("aiTasksCountText");
    const fillEl = document.getElementById("aiTasksBarFill");

    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.done).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (countEl) {
      countEl.textContent = `${completed}/${total} selesai ›`;
    }

    if (fillEl) {
      fillEl.style.width = `${pct}%`;
    }

    if (listEl) {
      listEl.innerHTML = this.tasks.map(t => `
        <div class="ai-task-row ${t.done ? 'task-done' : ''}" data-task-id="${t.id}">
          <div class="ai-task-left">
            <span class="ai-task-checkbox ${t.done ? 'checked' : ''}" id="chk_${t.id}">${t.done ? '✓' : ''}</span>
            <span class="ai-task-title">${t.title}</span>
          </div>
          <span class="ai-task-time">${t.time}</span>
        </div>
      `).join("");
    }
  },

  toggleTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.done = !task.done;
      this.saveTaskState();
      this.renderTasks();
    }
  },

  async refresh() {
    // 1. Refresh Dynamic Keuangan Nominal from Fin transactions if available
    try {
      const summaryEl = document.getElementById("aiStatKeuanganValue");
      if (summaryEl && window.FinWorkspace?.transactions) {
        const txs = window.FinWorkspace.transactions;
        if (Array.isArray(txs) && txs.length > 0) {
          const totalExpense = txs
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => acc + (t.amount || 0), 0);
          
          if (totalExpense > 0) {
            summaryEl.textContent = this.formatIDR(totalExpense);
          }
        }
      }
    } catch (_) {}
  },

  formatIDR(num) {
    if (typeof num !== "number") num = Number(num) || 0;
    return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
  },

  setupListeners() {
    // 1. Task Checkbox / Row Click
    const listEl = document.getElementById("aiTaskList");
    listEl?.addEventListener("click", (e) => {
      const row = e.target.closest(".ai-task-row");
      if (row) {
        const taskId = row.dataset.taskId;
        if (taskId) this.toggleTask(taskId);
      }
    });

    // 2. Click Tasks Card Header -> Navigates to Fin Reminders / Tagihan
    document.getElementById("aiTasksCard")?.addEventListener("click", (e) => {
      if (e.target.closest(".ai-task-row")) return;
      window.location.hash = "#fin/reminders";
    });

    // 3. Click Keuangan Card -> Fin Workspace
    document.getElementById("aiStatKeuangan")?.addEventListener("click", () => {
      window.location.hash = "#fin";
    });

    // 4. Click Produktivitas Card -> Fin Reports
    document.getElementById("aiStatProduktivitas")?.addEventListener("click", () => {
      window.location.hash = "#fin/reports";
    });

    // 5. Agent List Item Clicks
    document.getElementById("agentItemFin")?.addEventListener("click", () => {
      window.location.hash = "#fin";
    });

    document.getElementById("agentItemWelly")?.addEventListener("click", () => {
      window.location.hash = "#welly";
    });

    document.getElementById("agentItemNova")?.addEventListener("click", () => {
      window.location.hash = "#fin/chat";
      setTimeout(() => {
        const chatInput = document.getElementById("finChatTextInput");
        if (chatInput) {
          chatInput.value = "Halo Nova, bagaimana tren riset keuangan terbaru hari ini?";
          chatInput.focus();
        }
      }, 150);
    });

    // 6. Segmented Filter Tabs
    const segmentBtns = document.querySelectorAll(".ai-segment-tab");
    segmentBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        segmentBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const filter = btn.dataset.filter;
        if (filter === "tasks") {
          document.getElementById("aiTasksCard")?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (filter === "goals") {
          window.location.hash = "#fin/goals";
        } else if (filter === "insights") {
          window.location.hash = "#fin/reports";
        } else if (filter === "agents") {
          document.getElementById("aiAgentsListCard")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });

    // 7. Quick Action Buttons
    document.getElementById("btnQuickChatAI")?.addEventListener("click", () => {
      window.location.hash = "#fin/chat";
    });

    document.getElementById("btnQuickBuatTugas")?.addEventListener("click", () => {
      if (window.FinWorkspace?.openAddTransactionModal) {
        window.FinWorkspace.openAddTransactionModal("expense");
      } else {
        window.location.hash = "#fin/transactions";
      }
    });

    document.getElementById("btnQuickLihatLaporan")?.addEventListener("click", () => {
      window.location.hash = "#fin/reports";
    });

    document.getElementById("btnQuickAturGoal")?.addEventListener("click", () => {
      window.location.hash = "#fin/goals";
    });
  }
};

window.BentoManager = BentoManager;
