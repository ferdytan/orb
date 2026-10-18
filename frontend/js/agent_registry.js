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

  getAgent(agentId) {
    return this.agents[agentId] || this.agents.fin;
  },

  getAllAgents() {
    return Object.values(this.agents);
  }
};

window.AgentRegistry = AgentRegistry;
