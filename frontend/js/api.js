/* ==========================================================================
   ORB - API & CLIENT DATA LAYER (FIN-FIRST RESILIENT ARCHITECTURE)
   ========================================================================== */

const getBasePath = () => {
  return window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
};

// Canonical single active agent contract: Fin
const DEFAULT_AGENTS = [
  {
    id: "fin",
    name: "Fin",
    role: "Personal Finance Specialist",
    domain: "finance",
    status: "active",
    tag_text: "active",
    tag_color: "#10B981",
    description_icon: "💰",
    description_text: "Personal Finance Workspace",
    avatar_image: "./assets/avatar_fin_360.png",
    personality: "Plush akuntan yang ceria dan teliti. Membantu mencatat transaksi, mengawal budget, dan mengoptimalkan arus kas harian.",
    color_theme: "#DCFCE7",
    sort_order: 1
  },
  {
    id: "welly",
    name: "Welly",
    role: "Wealth & Planning Specialist",
    domain: "wealth",
    status: "active",
    tag_text: "active",
    tag_color: "#3B82F6",
    description_icon: "📈",
    description_text: "Perencanaan Kekayaan & Alokasi Tujuan",
    avatar_image: "./assets/avatar_welly_360.png",
    personality: "Plush perencana kekayaan berjas rapi dan kacamata emas. Membantu memetakan alokasi investasi, mengevaluasi kapasitas kontribusi, dan mengawal pencapaian target finansial jangka panjang.",
    color_theme: "#DBEAFE",
    sort_order: 2
  }
];

window.DEFAULT_AGENTS = DEFAULT_AGENTS;
window.ORB_FIN_AVATAR = "./assets/avatar_fin_360.png";
window.ORB_WELLY_AVATAR = "./assets/avatar_welly_360.png";

// Helper to consistently resolve asset URLs across root subdomain deployments
window.resolveOrbAsset = function(path) {
  if (!path) return './assets/avatar_fin.png';
  let clean = path.trim().replace(/^\.?\//, '');
  if (!clean.startsWith('assets/')) {
    clean = 'assets/' + clean;
  }
  return './' + clean;
};

const getApiBaseUrl = () => {
  // 1. Prioritas tertinggi: Override manual via window.ORB_API_URL jika di-set
  if (typeof window !== "undefined" && window.ORB_API_URL && typeof window.ORB_API_URL === "string") {
    const custom = window.ORB_API_URL.trim().replace(/\/+$/, '');
    if (custom) return custom;
  }

  // 2. Gunakan origin domain yang sama (https://orb.krftworks.my.id atau localhost)
  return window.location.origin;
};

const API = {
  basePath: getBasePath(),
  baseUrl: getApiBaseUrl(),
  ws: null,
  wsListeners: [],

  buildUrl(endpoint) {
    const base = (this.baseUrl || '').replace(/\/+$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    if (base.endsWith('/api') && (cleanEndpoint === '/api' || cleanEndpoint.startsWith('/api/'))) {
      return `${base.slice(0, -4)}${cleanEndpoint}`;
    }
    return `${base}${cleanEndpoint}`;
  },

  getHeaders(extra = {}) {
    const headers = { ...extra };
    const token = localStorage.getItem("orb_session_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  },

  // WebSocket Management
  initWebSocket(onMessageCallback) {
    let wsHost = window.location.host;
    let wsBasePath = this.basePath;

    try {
      const u = new URL(this.baseUrl);
      wsHost = u.host;
      wsBasePath = u.pathname.replace(/\/+$/, '');
      if (wsBasePath.endsWith('/api')) {
        wsBasePath = wsBasePath.slice(0, -4);
      }
    } catch (_) {}

    const protocol = (window.location.protocol === "https:" || (this.baseUrl && this.baseUrl.startsWith("https:"))) ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${wsHost}${wsBasePath}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("⚡ Orb WebSocket connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessageCallback) onMessageCallback(data);
          this.wsListeners.forEach(listener => listener(data));
        } catch (e) {
          console.error("Error parsing WS message", e);
        }
      };

      this.ws.onclose = () => {
        setTimeout(() => this.initWebSocket(onMessageCallback), 8000);
      };

      this.ws.onerror = () => {};
    } catch (e) {
      console.warn("WebSocket unavailable, running in resilient client mode:", e);
    }
  },

  addWsListener(fn) {
    this.wsListeners.push(fn);
  },

  sendWs(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  },

  // -------------------------------------------------------------
  // AGENTS (STRICTLY 1 ACTIVE AGENT: FIN)
  // -------------------------------------------------------------
  async getAgents() {
    try {
      const res = await fetch(this.buildUrl('/api/agents'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}
    return DEFAULT_AGENTS;
  },

  async getAgentDetail(agentId = "fin") {
    try {
      const res = await fetch(this.buildUrl(`/api/agents/${agentId}`));
      if (res.ok) return await res.json();
    } catch (_) {}

    return {
      agent: DEFAULT_AGENTS[0],
      memories: [
        { id: 1, memory_type: "per_agent", category: "goal", content: "Fin Goal: Catat transaksi dengan disiplin dan optimalkan alokasi tabungan." }
      ],
      chat_history: [
        { sender: "agent", text: "Halo! Saya Fin, spesialis keuangan pribadi Anda. Mari kita kelola anggaran dan target Anda." }
      ]
    };
  },

  // -------------------------------------------------------------
  // FIN EXECUTIVE BRIEF (OFFICE SCREEN - ZERO RUPIAH STRICTLY)
  // -------------------------------------------------------------
  async getFinExecutiveBrief() {
    try {
      const res = await fetch(this.buildUrl('/api/agents/fin/brief'));
      if (res.ok) return await res.json();
    } catch (_) {}

    // Resilient offline fallback with honest status
    return {
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
        "Klik Fin di bawah untuk membuka ruang kerja detail lengkap."
      ],
      quick_tips: "Klik Fin untuk membuka ruang kerja detail dengan kontrol privasi nominal.",
      fin_status: "ready"
    };
  },

  // -------------------------------------------------------------
  // FIN WORKSPACE DOMAIN APIS
  // -------------------------------------------------------------
  async getFinSummary(period = null) {
    try {
      const url = period ? `/api/agents/fin/summary?period=${encodeURIComponent(period)}` : '/api/agents/fin/summary';
      const res = await fetch(this.buildUrl(url));
      if (res.ok) return await res.json();
    } catch (_) {}

    return {
      current_period: new Date().toISOString().slice(0, 7),
      total_net_worth: 0,
      total_income: 0,
      total_expense: 0,
      net_savings: 0,
      savings_rate_pct: 0,
      total_budget_limit: 0,
      total_budget_spent: 0,
      overall_budget_utilization_pct: 0,
      accounts_count: 1,
      transactions_count: 0,
      unpaid_reminders_count: 0,
      category_breakdown: []
    };
  },

  async getFinAccounts(activeOnly = true) {
    try {
      const res = await fetch(this.buildUrl(`/api/agents/fin/accounts?active_only=${activeOnly}`));
      if (res.ok) return await res.json();
    } catch (_) {}
    return [
      { id: 1, name: "Dompet Tunai", account_type: "cash", balance: 0, currency: "IDR", icon: "👛", color: "#10B981", is_active: 1 }
    ];
  },

  async createFinAccount(data) {
    const res = await fetch(this.buildUrl('/api/agents/fin/accounts'), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Gagal membuat akun.");
    }
    return await res.json();
  },

  async getFinCategories(type = null) {
    try {
      const url = type ? `/api/agents/fin/categories?type=${encodeURIComponent(type)}` : '/api/agents/fin/categories';
      const res = await fetch(this.buildUrl(url));
      if (res.ok) return await res.json();
    } catch (_) {}
    return [
      { id: 1, name: "Makanan & Minuman", type: "expense", icon: "🍔", color: "#EF4444", sort_order: 1 },
      { id: 2, name: "Transportasi", type: "expense", icon: "🚗", color: "#F59E0B", sort_order: 2 },
      { id: 3, name: "Gaji Pokok", type: "income", icon: "💼", color: "#10B981", sort_order: 1 }
    ];
  },

  async getFinTransactions(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.period) params.append("period", filters.period);
      if (filters.type) params.append("type", filters.type);
      if (filters.account_id) params.append("account_id", filters.account_id);
      if (filters.limit) params.append("limit", filters.limit);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(this.buildUrl(`/api/agents/fin/transactions${qs}`));
      if (res.ok) return await res.json();
    } catch (_) {}
    return [];
  },

  async createFinTransaction(txData) {
    const res = await fetch(this.buildUrl('/api/agents/fin/transactions'), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(txData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Gagal menyimpan transaksi.");
    }
    return await res.json();
  },

  async deleteFinTransaction(txId) {
    const res = await fetch(this.buildUrl(`/api/agents/fin/transactions/${txId}`), {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Gagal menghapus transaksi.");
    return await res.json();
  },

  async getFinBudgets(period = null) {
    try {
      const url = period ? `/api/agents/fin/budgets?period=${encodeURIComponent(period)}` : '/api/agents/fin/budgets';
      const res = await fetch(this.buildUrl(url));
      if (res.ok) return await res.json();
    } catch (_) {}
    return [];
  },

  async setFinBudget(data) {
    const res = await fetch(this.buildUrl('/api/agents/fin/budgets'), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Gagal menyetel budget.");
    return await res.json();
  },

  async getFinReminders() {
    try {
      const res = await fetch(this.buildUrl('/api/agents/fin/reminders'));
      if (res.ok) return await res.json();
    } catch (_) {}
    return [];
  },

  async createFinReminder(data) {
    const res = await fetch(this.buildUrl('/api/agents/fin/reminders'), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Gagal menambah pengingat.");
    return await res.json();
  },

  async payFinReminder(remId, accountId = null) {
    const url = accountId ? `/api/agents/fin/reminders/${remId}/pay?account_id=${accountId}` : `/api/agents/fin/reminders/${remId}/pay`;
    const res = await fetch(this.buildUrl(url), { method: "POST" });
    if (!res.ok) throw new Error("Gagal memproses pembayaran tagihan.");
    return await res.json();
  },

  async getFinGoals() {
    try {
      const res = await fetch(this.buildUrl('/api/agents/fin/goals'));
      if (res.ok) return await res.json();
    } catch (_) {}
    return [];
  },

  async createFinGoal(data) {
    const res = await fetch(this.buildUrl('/api/agents/fin/goals'), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Gagal membuat target tabungan.");
    return await res.json();
  },

  async depositFinGoal(goalId, data) {
    const res = await fetch(this.buildUrl(`/api/agents/fin/goals/${goalId}/deposit`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Gagal menyetor ke target tabungan.");
    return await res.json();
  },

  async askFin(question) {
    try {
      const res = await fetch(this.buildUrl('/api/agents/fin/ask'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question })
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    return {
      answer: "Fin siap mencatat pengeluaran dan pemasukan Anda. Sambungkan koneksi untuk analisis angka terperinci.",
      intent: "offline",
      suggestions: ["Berapa pengeluaran bulan ini?", "Bagaimana status budget?"]
    };
  },

  getFinExportUrl(period = null) {
    const qs = period ? `?period=${encodeURIComponent(period)}` : "";
    return this.buildUrl(`/api/agents/fin/export${qs}`);
  },

  // -------------------------------------------------------------
  // LIGHTING & THEME
  // -------------------------------------------------------------
  async getLighting() {
    try {
      const res = await fetch(this.buildUrl('/api/lighting'));
      if (res.ok) return await res.json();
    } catch (_) {}
    return { time_of_day: "auto", theme_mode: "dark", auto: true };
  },

  async setLighting(lightingData) {
    try {
      const res = await fetch(this.buildUrl('/api/lighting'), {
        method: "POST",
        headers: this.getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(lightingData)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return lightingData;
  },

  // -------------------------------------------------------------
  // FIN STRUCTURED SNAPSHOT (fin.snapshot.v1)
  // -------------------------------------------------------------
  async getFinSnapshot(period = null, refresh = false) {
    const params = [];
    if (period) params.push(`period=${encodeURIComponent(period)}`);
    if (refresh) params.push(`refresh=true`);
    const qs = params.length ? `?${params.join("&")}` : "";

    try {
      const res = await fetch(this.buildUrl(`/api/agents/fin/snapshot${qs}`), {
        headers: this.getHeaders()
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  async generateFinSnapshot(period = null) {
    const qs = period ? `?period=${encodeURIComponent(period)}` : "";
    try {
      const res = await fetch(this.buildUrl(`/api/agents/fin/snapshot/generate${qs}`), {
        method: "POST",
        headers: this.getHeaders()
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  // -------------------------------------------------------------
  // WELLY WEALTH & PLANNING AGENT
  // -------------------------------------------------------------
  async getWealthPlans() {
    try {
      const res = await fetch(this.buildUrl('/api/agents/welly/plans'), {
        headers: this.getHeaders()
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return [];
  },

  async createWealthPlan(planData) {
    try {
      const res = await fetch(this.buildUrl('/api/agents/welly/plans'), {
        method: "POST",
        headers: this.getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(planData)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  async updateWealthPlan(planId, planData) {
    try {
      const res = await fetch(this.buildUrl(`/api/agents/welly/plans/${planId}`), {
        method: "PATCH",
        headers: this.getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(planData)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  async deleteWealthPlan(planId) {
    try {
      const res = await fetch(this.buildUrl(`/api/agents/welly/plans/${planId}`), {
        method: "DELETE",
        headers: this.getHeaders()
      });
      return res.ok;
    } catch (_) {}
    return false;
  },

  async getWellyCapacity(period = null) {
    const qs = period ? `?period=${encodeURIComponent(period)}` : "";
    try {
      const res = await fetch(this.buildUrl(`/api/agents/welly/capacity${qs}`), {
        headers: this.getHeaders()
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  async askWelly(message) {
    try {
      const res = await fetch(this.buildUrl('/api/agents/welly/ask'), {
        method: "POST",
        headers: this.getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ message })
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return {
      text: "Welly siap menganalisis alokasi portofolio Anda berdasarkan arus kas aktual Fin.",
      suggestions: ["Cek Kapasitas Kontribusi", "Lihat Target Masa Depan"]
    };
  },

  // -------------------------------------------------------------
  // FIN & WELLY COLLABORATION
  // -------------------------------------------------------------
  async getJointReview(period = null) {
    const qs = period ? `?period=${encodeURIComponent(period)}` : "";
    try {
      const res = await fetch(this.buildUrl(`/api/collaboration/review${qs}`), {
        headers: this.getHeaders()
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  async generateJointReview(period = null) {
    const qs = period ? `?period=${encodeURIComponent(period)}` : "";
    try {
      const res = await fetch(this.buildUrl(`/api/collaboration/review/generate${qs}`), {
        method: "POST",
        headers: this.getHeaders()
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  async approveRecommendation(recId) {
    try {
      const res = await fetch(this.buildUrl(`/api/collaboration/recommendations/${recId}/approve`), {
        method: "POST",
        headers: this.getHeaders()
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  async applyRecommendation(recId) {
    try {
      const res = await fetch(this.buildUrl(`/api/collaboration/recommendations/${recId}/apply`), {
        method: "POST",
        headers: this.getHeaders()
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  async rejectRecommendation(recId) {
    try {
      const res = await fetch(this.buildUrl(`/api/collaboration/recommendations/${recId}/reject`), {
        method: "POST",
        headers: this.getHeaders()
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  async getCollaborationPermissions() {
    try {
      const res = await fetch(this.buildUrl('/api/collaboration/permissions'), {
        headers: this.getHeaders()
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return { welly_read_fin_summary: true, allowed_scope: "aggregated_summary", allow_external_llm: false };
  },

  async updateCollaborationPermissions(perms) {
    try {
      const res = await fetch(this.buildUrl('/api/collaboration/permissions'), {
        method: "POST",
        headers: this.getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(perms)
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  },

  async getCollaborationAuditLogs(limit = 50) {
    try {
      const res = await fetch(this.buildUrl(`/api/collaboration/audit-logs?limit=${limit}`), {
        headers: this.getHeaders()
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return [];
  }
};

window.API = API;
