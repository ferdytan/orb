/* ==========================================================================
   ORB - AGENT & ACTION CAPABILITY REGISTRY
   Defines active agents (Fin, Welly, Lois), contextual toolbars, and avatar presets.
   ========================================================================== */

const AgentRegistry = {
  agents: {
    fin: {
      id: "fin",
      name: "Fin",
      role: "Pencatatan keuangan & rekening bank",
      avatar: "./assets/avatars/avatar_orb_01.png",
      accentColor: "#10B981",
      initialGreeting: "Halo! Saya Fin, spesialis keuangan pribadi & perbankan Anda. Saya memantau saldo rekening bank (BCA, Mandiri, cash, e-wallet), transfer antar-rekening, alokasi dana cadangan, serta batas budget Anda.",
      actions: [
        { id: "dashboard", label: "Dashboard", icon: "📊", isPrimary: false },
        { id: "accounts", label: "Rekening Bank", icon: "🏦", isPrimary: false },
        { id: "transfers", label: "Transfer Rekening", icon: "🔄", isPrimary: false },
        { id: "reserves", label: "Dana Cadangan", icon: "🛡️", isPrimary: false },
        { id: "add_log", label: "+ Tambah Log", icon: "➕", isPrimary: true },
        { id: "budget", label: "Budget", icon: "🎯", isPrimary: false },
        {
          id: "more",
          label: "Lainnya",
          icon: "···",
          isPrimary: false,
          subActions: [
            { id: "reminders", label: "Tagihan & Reminder", icon: "📅" },
            { id: "goals", label: "Target Tabungan", icon: "🏆" },
            { id: "reports", label: "Laporan Keuangan", icon: "📈" },
            { id: "collab_welly", label: "Review bersama Welly", icon: "🤝" }
          ]
        }
      ]
    },

    welly: {
      id: "welly",
      name: "Welly",
      role: "Perencanaan investasi & akun broker",
      avatar: "./assets/avatars/avatar_orb_02.png",
      accentColor: "#3B82F6",
      initialGreeting: "Halo! Saya Welly, perencana kekayaan & investasi Anda. Saya memetakan portofolio instrumen (Saham, ETF, Forex, Reksa Dana, Kripto), mengamankan akun broker (Ajaib, Exness) dengan PIN 1607, dan merancang target masa depan.",
      actions: [
        { id: "portfolio", label: "Portofolio", icon: "💼", isPrimary: false },
        { id: "inv_accounts", label: "Akun & Broker", icon: "🔐", isPrimary: false },
        { id: "inv_categories", label: "Kategori Investasi", icon: "🏷️", isPrimary: false },
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
      ]
    },

    lois: {
      id: "lois",
      name: "Lois",
      role: "Pembuat invoice & sales order",
      avatar: "./assets/avatars/avatar_orb_03.png",
      accentColor: "#8B5CF6",
      initialGreeting: "Halo! Saya Lois, asisten penagihan & invoice Anda. Saya siap membuat invoice profesional, memantau piutang belum bayar, mengelola kontak pelanggan, mengirim email invoice, dan menyinkronkan dana masuk langsung ke Fin.",
      actions: [
        { id: "invoices", label: "Daftar Invoice", icon: "📄", isPrimary: false },
        { id: "create_invoice", label: "+ Buat Invoice", icon: "➕", isPrimary: true },
        { id: "customers", label: "Pelanggan", icon: "👥", isPrimary: false },
        { id: "unpaid_invoices", label: "Piutang Belum Bayar", icon: "⏳", isPrimary: false },
        {
          id: "more_lois",
          label: "Lainnya",
          icon: "···",
          isPrimary: false,
          subActions: [
            { id: "import_customers", label: "Import Pelanggan", icon: "📥" },
            { id: "templates_invoice", label: "Template Invoice", icon: "🎨" },
            { id: "collab_fin", label: "Kirim Dana Masuk ke Fin", icon: "💰" }
          ]
        }
      ]
    }
  },

  // 28 Cute 3D Clay Avatars extracted with transparency
  PRESET_AVATARS: [
    { id: "orb_01", url: "./assets/avatars/avatar_orb_01.png" },
    { id: "orb_02", url: "./assets/avatars/avatar_orb_02.png" },
    { id: "orb_03", url: "./assets/avatars/avatar_orb_03.png" },
    { id: "orb_04", url: "./assets/avatars/avatar_orb_04.png" },
    { id: "orb_05", url: "./assets/avatars/avatar_orb_05.png" },
    { id: "orb_06", url: "./assets/avatars/avatar_orb_06.png" },
    { id: "orb_07", url: "./assets/avatars/avatar_orb_07.png" },
    { id: "orb_08", url: "./assets/avatars/avatar_orb_08.png" },
    { id: "orb_09", url: "./assets/avatars/avatar_orb_09.png" },
    { id: "orb_10", url: "./assets/avatars/avatar_orb_10.png" },
    { id: "orb_11", url: "./assets/avatars/avatar_orb_11.png" },
    { id: "orb_12", url: "./assets/avatars/avatar_orb_12.png" },
    { id: "orb_13", url: "./assets/avatars/avatar_orb_13.png" },
    { id: "orb_14", url: "./assets/avatars/avatar_orb_14.png" },
    { id: "orb_15", url: "./assets/avatars/avatar_orb_15.png" },
    { id: "orb_16", url: "./assets/avatars/avatar_orb_16.png" },
    { id: "orb_17", url: "./assets/avatars/avatar_orb_17.png" },
    { id: "orb_18", url: "./assets/avatars/avatar_orb_18.png" },
    { id: "orb_19", url: "./assets/avatars/avatar_orb_19.png" },
    { id: "orb_20", url: "./assets/avatars/avatar_orb_20.png" },
    { id: "orb_21", url: "./assets/avatars/avatar_orb_21.png" },
    { id: "orb_22", url: "./assets/avatars/avatar_orb_22.png" },
    { id: "orb_23", url: "./assets/avatars/avatar_orb_23.png" },
    { id: "orb_24", url: "./assets/avatars/avatar_orb_24.png" },
    { id: "orb_25", url: "./assets/avatars/avatar_orb_25.png" },
    { id: "orb_26", url: "./assets/avatars/avatar_orb_26.png" },
    { id: "orb_27", url: "./assets/avatars/avatar_orb_27.png" },
    { id: "orb_28", url: "./assets/avatars/avatar_orb_28.png" },
    { id: "fin_orig", url: "./assets/avatar_fin_360.png" },
    { id: "welly_orig", url: "./assets/avatar_welly_360.png" }
  ],

  getAgent(agentId) {
    const base = this.agents[agentId] || this.agents.fin;
    const customAvatar = localStorage.getItem(`orb_avatar_${base.id}`);
    const customName = localStorage.getItem(`orb_name_${base.id}`);
    return {
      ...base,
      name: (customName && customName.trim()) ? customName.trim() : base.name,
      avatar: customAvatar || base.avatar
    };
  },

  setAgentAvatar(agentId, avatarUrl) {
    try {
      localStorage.setItem(`orb_avatar_${agentId}`, avatarUrl);
      if (this.agents[agentId]) {
        this.agents[agentId].avatar = avatarUrl;
      }
    } catch (_) {}
  },

  resetAgentAvatar(agentId) {
    try {
      localStorage.removeItem(`orb_avatar_${agentId}`);
      if (agentId === "fin") this.agents.fin.avatar = "./assets/avatars/avatar_orb_01.png";
      if (agentId === "welly") this.agents.welly.avatar = "./assets/avatars/avatar_orb_02.png";
      if (agentId === "lois") this.agents.lois.avatar = "./assets/avatars/avatar_orb_03.png";
    } catch (_) {}
  },

  setAgentName(agentId, newName) {
    try {
      if (newName && newName.trim()) {
        const cleanName = newName.trim();
        localStorage.setItem(`orb_name_${agentId}`, cleanName);
        if (this.agents[agentId]) {
          this.agents[agentId].name = cleanName;
        }
      }
    } catch (_) {}
  },

  resetAgentName(agentId) {
    try {
      localStorage.removeItem(`orb_name_${agentId}`);
      if (agentId === "fin") this.agents.fin.name = "Fin";
      if (agentId === "welly") this.agents.welly.name = "Welly";
      if (agentId === "lois") this.agents.lois.name = "Lois";
    } catch (_) {}
  },

  getAllAgents() {
    return Object.keys(this.agents).map(id => this.getAgent(id));
  }
};

window.AgentRegistry = AgentRegistry;
