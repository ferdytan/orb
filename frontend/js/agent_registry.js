/* ==========================================================================
   ORB - AGENT & ACTION CAPABILITY REGISTRY
   Extensible architecture: defines agents, metadata, and contextual toolbars.
   Only Fin and Welly are registered — strictly zero dummy agents.
   ========================================================================== */

const AgentRegistry = {
  agents: {
    fin: {
      id: "fin",
      name: "Fin",
      role: "Pencatatan keuangan & budgeting",
      avatar: "./assets/avatar_fin_360.png",
      accentColor: "#10B981",
      initialGreeting: "Halo! Saya Fin. Saya siap mencatat transaksi, memantau batas budget, dan mengevaluasi arus kas harian Anda. Ada yang ingin dicatat atau dianalisis?",
      actions: [
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
      ]
    },

    welly: {
      id: "welly",
      name: "Welly",
      role: "Perencanaan keuangan & investasi",
      avatar: "./assets/avatar_welly_360.png",
      accentColor: "#3B82F6",
      initialGreeting: "Halo! Saya Welly, perencana kekayaan Anda. Saya membantu memetakan alokasi investasi, mengawal dana darurat, dan merancang strategi finansial jangka panjang.",
      actions: [
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
      ]
    }
  },

  PRESET_AVATARS: [
    { id: "fin_orig", name: "Fin Original", url: "./assets/avatar_fin_360.png" },
    { id: "welly_orig", name: "Welly Original", url: "./assets/avatar_welly_360.png" },
    { id: "sage", name: "Sage (Analis)", url: "./assets/avatar_sage.png" },
    { id: "blaze", name: "Blaze (Dinamis)", url: "./assets/avatar_blaze.png" },
    { id: "nova", name: "Nova (Futuristik)", url: "./assets/avatar_nova.png" },
    { id: "spark", name: "Spark (Ceria)", url: "./assets/avatar_spark.png" },
    { id: "echo", name: "Echo (Minimalis)", url: "./assets/avatar_echo.png" },
    { id: "atlas", name: "Atlas (Kokoh)", url: "./assets/avatar_atlas.png" },
    { id: "pixel", name: "Pixel (Retro)", url: "./assets/avatar_pixel.png" },
    { id: "muse", name: "Muse (Elegan)", url: "./assets/avatar_muse.png" },
    { id: "dot_fin", name: "Dot Fin (Icon)", url: "./assets/dot_fin.png" },
    { id: "dot_welly", name: "Dot Welly (Icon)", url: "./assets/dot_welly.png" }
  ],

  getAgent(agentId) {
    const base = this.agents[agentId] || this.agents.fin;
    const customAvatar = localStorage.getItem(`orb_avatar_${base.id}`);
    return {
      ...base,
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
      if (agentId === "fin") this.agents.fin.avatar = "./assets/avatar_fin_360.png";
      if (agentId === "welly") this.agents.welly.avatar = "./assets/avatar_welly_360.png";
    } catch (_) {}
  },

  getAllAgents() {
    return Object.keys(this.agents).map(id => this.getAgent(id));
  }
};

window.AgentRegistry = AgentRegistry;
