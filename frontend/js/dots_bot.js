/* ==========================================================================
   ORB - OPENDOTS & GROK BOT CONTROLLER (MULTI-AGENT CHAT & SWIPEABLE TASKS)
   Matching OpenDots Desktop & Grok Mobile Chat Experience
   Persistent per-agent chat history + Interactive swipeable task deliverables.
   ========================================================================== */

const DotsBotManager = {
  activeAgentId: "fin",

  agents: {
    fin: {
      id: "fin",
      name: "Fin",
      icon: "./assets/dot_fin.png",
      heroAvatar: "./assets/opendots_fin.png",
      role: "Personal Finance & Cashflow Specialist",
      specialistTag: "Specialist: Cashflow & Budget",
      bio: "Be thoughtful, practical, and concise. Help the user track personal finances, manage daily budgets, and follow through.",
      initialMessage: "Halo! Saya Fin, spesialis keuangan pribadi dan arus kas Anda. Saya mengawasi catatan pengeluaran, batasan budget harian, dan kesehatan kas Anda secara real-time. Ada transaksi baru atau angka yang ingin kita analisis bersama?",
      promptSuggestions: [
        "Bantu analisa arus kas bulan ini ↗",
        "Berapa sisa budget kategori makan? ↗",
        "Cek tagihan yang akan jatuh tempo ↗",
        "Saran penghematan 10% ↗"
      ],
      tasks: [
        {
          id: "fin_audit",
          icon: "💸",
          title: "Audit Arus Kas & Pengeluaran",
          status: "Selesai 🟢",
          statusType: "success",
          schedule: "Setiap Hari, 20:00 WIB",
          summary: "Surplus IDR 3.250.000 (Pemasukan IDR 18.5jt vs Pengeluaran IDR 15.25jt). Rasio pengeluaran aman di 82.4%.",
          scopeDetails: "Memindai seluruh transaksi pengeluaran dan pemasukan pada bulan berjalan. Mengukur rasio konsumsi harian, mendeteksi spike lonjakan belanja mendadak, dan mengkalkulasi surplus kas bersih.",
          resultDetails: "Kondisi arus kas bulan ini dalam status SURPLUS sehat sebesar IDR 3.250.000. Rata-rata pengeluaran harian IDR 492.000, masih berada di bawah ambang batas waspada IDR 550.000/hari.",
          nextAction: "Pindahkan IDR 2.000.000 dari rekening operasional ke instrumen pasar uang agar tidak terpakai impulsif."
        },
        {
          id: "fin_budget",
          icon: "🎯",
          title: "Monitoring Batas Budget Kategori",
          status: "Perhatian 🟡",
          statusType: "warning",
          schedule: "Real-time saat transaksi masuk",
          summary: "4 dari 5 kategori aman. Kategori 'Makan Luar' terpakai 82% (IDR 2.460.000 dari limit IDR 3.000.000).",
          scopeDetails: "Mengawal alokasi plafon belanja per kategori (Kebutuhan Pokok, Makan Luar, Hiburan, Transportasi, Utilitas). Mengirimkan alert bertahap saat kuota menyentuh 50%, 80%, dan 100%.",
          resultDetails: "Kategori 'Makan Luar & Kopi' telah menghabiskan 82% dari pagu bulanan dengan sisa kuota IDR 540.000 untuk 13 hari ke depan (alokasi aman: IDR 41.500/hari). 4 kategori lainnya (Belanja Pokok, Bensin, Tagihan, Hiburan) masih di bawah 65%.",
          nextAction: "Prioritaskan makan di rumah dan bawa bekal untuk 10 hari ke depan guna menghindari overbudget."
        },
        {
          id: "fin_reconcile",
          icon: "🏦",
          title: "Rekonsiliasi Saldo Bank & Kas",
          status: "Terverifikasi 🛡️",
          statusType: "success",
          schedule: "Mingguan setiap Jumat",
          summary: "Total kas IDR 24.800.000 terverifikasi konsisten di 3 akun aktif (Bank BCA, Bank Mandiri, GoPay).",
          scopeDetails: "Memvalidasi konsistensi catatan ledger lokal dengan mutasi rekening bank dan dompet digital untuk memastikan tidak ada transaksi yang terlewat atau dobel input.",
          resultDetails: "Seluruh mutasi pada 3 akun rekening terhubung sinkron 100%. Tidak ditemukan selisih catatan manual. Saldo likuid siap pakai IDR 24.800.000.",
          nextAction: "Pertahankan catatan real-time setiap kali melakukan pembayaran QRIS."
        },
        {
          id: "fin_bills",
          icon: "📅",
          title: "Verifikasi Tagihan Mendatang",
          status: "1 Tagihan ⏱️",
          statusType: "info",
          schedule: "H-3 sebelum jatuh tempo",
          summary: "Tagihan Internet Indihome IDR 450.000 jatuh tempo 20 Oktober (2 hari lagi).",
          scopeDetails: "Memantau kalender tagihan rutin (listrik, internet, asuransi, sewa) dan memverifikasi ketersediaan saldo rekening autodebet sebelum batas waktu.",
          resultDetails: "1 kewajiban terdeteksi: Internet Indihome IDR 450.000 jatuh tempo pada tanggal 20 Oktober. Saldo pada rekening pembayaran mencukupi.",
          nextAction: "Lakukan pembayaran atau pastikan fitur autodebet BCA aktif."
        }
      ]
    },

    welly: {
      id: "welly",
      name: "Welly",
      icon: "./assets/dot_welly.png",
      heroAvatar: "./assets/avatar_welly_360.png",
      role: "Wealth & Future Planning Specialist",
      specialistTag: "Specialist: Net Worth & Allocation",
      bio: "Evaluate long-term allocation, stress-test rainy day funds, and build resilient net worth without risking lifestyle peace.",
      initialMessage: "Halo! Saya Welly, perencana kekayaan Anda. Saya bertugas mengevaluasi kapasitas investasi bulanan, mengawal target dana darurat, dan merancang alokasi aset jangka panjang yang tangguh. Apa sasaran finansial masa depan yang ingin kita diskusikan?",
      promptSuggestions: [
        "Berapa kapasitas investasi bulanan saya? ↗",
        "Simulasikan target dana darurat 6 bulan ↗",
        "Stress test ketahanan keuangan jika PHK ↗",
        "Rekomendasi alokasi obligasi vs saham ↗"
      ],
      tasks: [
        {
          id: "welly_capacity",
          icon: "📈",
          title: "Evaluasi Kapasitas Kontribusi Bersih",
          status: "Optimal 🟢",
          statusType: "success",
          schedule: "Bulanan saat tutup buku Fin",
          summary: "Kapasitas investasi IDR 2.500.000/bulan (13.5% dari income). Angka ini aman dan tidak mengganggu biaya hidup.",
          scopeDetails: "Menghitung sisa surplus stabil yang dapat dikomitmenkan untuk instrumen pertumbuhan aset tanpa menimbulkan risiko likuiditas harian.",
          resultDetails: "Dengan surplus rata-rata IDR 3.250.000, komitmen kontribusi IDR 2.500.000/bulan menyisakan bantalan darurat fleksibel IDR 750.000 setiap bulan.",
          nextAction: "Setup transfer terjadwal otomatis setiap tanggal 27 (setelah gajian)."
        },
        {
          id: "welly_emergency",
          icon: "🛡️",
          title: "Stress Test & Ketahanan Dana Darurat",
          status: "On Track 🟢",
          statusType: "success",
          schedule: "Kuartalan",
          summary: "Ketahanan kas saat ini: 4.2 bulan biaya operasional. Target 6 bulan tercapai dalam 85 hari.",
          scopeDetails: "Menguji skenario ekstrem: jika seluruh sumber pendapatan terhenti mendadak, berapa lama kas saat ini mampu menopang kebutuhan keluarga tanpa berutang.",
          resultDetails: "Daya tahan likuiditas berada di 4.2 bulan (IDR 24.800.000 vs kebutuhan pokok IDR 5.900.000/bulan). Menuju target 6 bulan (IDR 35.400.000), masih dibutuhkan IDR 10.600.000.",
          nextAction: "Alokasikan IDR 1.500.000 dari surplus bulanan khusus untuk pos Dana Darurat."
        },
        {
          id: "welly_target",
          icon: "🏆",
          title: "Simulasi Target Finansial Jangka Panjang",
          status: "Tercapai 🎯",
          statusType: "info",
          schedule: "Review Bersama Fin",
          summary: "Proyeksi target Dana Pendidikan tercapai dalam 2 tahun 8 bulan dengan yield konservatif 6.5%.",
          scopeDetails: "Memodelkan pertumbuhan nilai investasi majemuk (compound interest) dengan mempertimbangkan laju inflasi riil 4.2% per tahun.",
          resultDetails: "Alokasi reksa dana pendapatan tetap dan obligasi ritel negara menghasilkan compound return yang solid untuk target 3 tahun ke depan.",
          nextAction: "Pertahankan konsistensi kontribusi tanpa mengambil risiko spekulatif."
        }
      ]
    },

    aaron: {
      id: "aaron",
      name: "Aaron",
      icon: "./assets/dot_aaron.png",
      heroAvatar: "./assets/avatar_nova_crop.png",
      role: "Research, Analysis & Market Intelligence",
      specialistTag: "Specialist: Market Data & Leak Detection",
      bio: "Sharp analytical intelligence. Uncover hidden spending leaks, benchmark banking rates, and evaluate market trends.",
      initialMessage: "Halo, saya Aaron. Fokus saya adalah riset data analitis mendalam, mendeteksi kebocoran uang kecil yang tak disadari (bocor halus), dan memantau instrumen imbal hasil pasar yang efisien.",
      promptSuggestions: [
        "Deteksi pengeluaran bocor halus bulan ini ↗",
        "Bandingkan yield RDPU vs deposito bank digital ↗",
        "Analisa biaya langganan streaming tidak terpakai ↗",
        "Riset inflasi bahan pokok terbaru ↗"
      ],
      tasks: [
        {
          id: "aaron_leaks",
          icon: "🔍",
          title: "Deteksi Kebocoran Belanja (Bocor Halus)",
          status: "2 Temuan 🔍",
          statusType: "warning",
          schedule: "Setiap 2 minggu",
          summary: "Ditemukan 2 langganan digital dobel dan IDR 37.500 biaya admin transfer. Potensi hemat IDR 226.500/bulan.",
          scopeDetails: "Melakukan audit mendalam pada transaksi mikro di bawah IDR 100.000 untuk mendeteksi biaya berulang yang tidak memberikan nilai tambah nyata.",
          resultDetails: "1 langganan streaming musik terdaftar di dua kartu berbeda (IDR 54.000/bln). Biaya topup e-wallet dan transfer antar bank non-BI Fast tercatat IDR 37.500 dalam 30 hari terakhir.",
          nextAction: "Aktifkan transfer gratis via BI-Fast (IDR 0) dan nonaktifkan salah satu akun streaming."
        },
        {
          id: "aaron_rdpu",
          icon: "📊",
          title: "Screening Return Pasar Uang & Deposito",
          status: "Updated 📈",
          statusType: "success",
          schedule: "Setiap awal pekan",
          summary: "Top 3 RDPU mencatat return rata-rata 5.3% net bebas pajak, mengungguli tabungan reguler (0.5%).",
          scopeDetails: "Memantau pergerakan suku bunga acuan BI Rate (6.00%) dan membandingkan performa instrumen pasar uang berisiko rendah.",
          resultDetails: "Instrumen RDPU dengan dana kelolaan di atas 2 Triliun rupiah memberikan stabilitas tinggi dengan likuiditas penarikan T+1.",
          nextAction: "Pindahkan porsi kas siaga di atas IDR 5.000.000 ke reksa dana pasar uang terpilih."
        }
      ]
    },

    lynn: {
      id: "lynn",
      name: "Lynn",
      icon: "./assets/dot_lynn.png",
      heroAvatar: "./assets/avatar_muse_crop.png",
      role: "Automation, Workflow & Daily Discipline",
      specialistTag: "Specialist: Workflows & Automations",
      bio: "Keep you disciplined and organized. Automated daily expense checkups, recurring alerts, and synchronized schedules.",
      initialMessage: "Hai! Saya Lynn. Saya bertugas mengotomatisasi rutinitas keuangan Anda agar tidak ada pencatatan yang terlewat, tagihan selalu terbayar tepat waktu, dan laporan mingguan siap dibaca tanpa repot.",
      promptSuggestions: [
        "Jadwalkan pengingat catat malam 21:00 ↗",
        "Kompilasi ringkasan minggu ini sekarang ↗",
        "Set alert tagihan H-2 ↗",
        "Review streak disiplin catat saya ↗"
      ],
      tasks: [
        {
          id: "lynn_night_alert",
          icon: "🌙",
          title: "Pengingat Catat Harian Otomatis",
          status: "Aktif 🌙",
          statusType: "success",
          schedule: "Harian, 21:00 WIB",
          summary: "Notifikasi otomatis dikirim jika sistem mendeteksi belum ada transaksi yang diinput pada hari ini.",
          scopeDetails: "Memeriksa log aktivitas harian pada pukul 21:00. Jika 0 transaksi tercatat, memunculkan popup pengingat ramah untuk mencatat pengeluaran sebelum tidur.",
          resultDetails: "Tingkat konsistensi pencatatan Anda meningkat 48% dalam 30 hari terakhir. Streak berturut-turut saat ini: 12 hari aktif.",
          nextAction: "Pertahankan rekor streak hingga minimal 21 hari untuk membentuk kebiasaan permanen."
        },
        {
          id: "lynn_weekly_recap",
          icon: "📑",
          title: "Kompilasi Executive Brief Mingguan",
          status: "Tersimpan 📑",
          statusType: "info",
          schedule: "Setiap Minggu, 21:00 WIB",
          summary: "Brief mingguan telah dirangkum dari data Fin & Welly, siap ditinjau di layar utama.",
          scopeDetails: "Mengagregasi data ringkasan pemasukan, pengeluaran, pergeseran persentase budget, dan catatan tagihan sepekan ke dalam format ringkas 1 menit baca.",
          resultDetails: "Laporan minggu ini telah selesai dikompilasi dengan hasil efisiensi 91% dan saldo tabungan bertambah IDR 850.000.",
          nextAction: "Buka ringkasan mingguan sebelum menyusun rencana anggaran pekan baru."
        }
      ]
    }
  },

  init() {
    console.log("🤖 Initializing OpenDots & Grok Bot UI System...");

    // Check hash for agent (e.g. #dots/welly)
    const rawHash = window.location.hash.replace(/^#/, '').trim();
    if (rawHash.startsWith("dots/")) {
      const parts = rawHash.split("/");
      if (parts[1] && this.agents[parts[1]]) {
        this.activeAgentId = parts[1];
      }
    }

    this.setupSidebarDrawer();
    this.setupListeners();
    this.switchAgent(this.activeAgentId);
  },

  setupSidebarDrawer() {
    const sidebar = document.getElementById("dotsSidebar");
    const backdrop = document.getElementById("dotsSidebarBackdrop");
    const openBtn = document.getElementById("btnOpenDotsDrawer");
    const toggleBtn = document.getElementById("btnToggleDotsSidebar");

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
    toggleBtn?.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        closeDrawer();
      }
    });
  },

  switchAgent(agentId) {
    if (!this.agents[agentId]) return;
    this.activeAgentId = agentId;
    const agent = this.agents[agentId];

    // 1. Update Sidebar Active State
    document.querySelectorAll(".dots-agent-nav-item").forEach(item => {
      item.classList.toggle("active", item.dataset.agent === agentId);
    });

    // 2. Update Mobile Agent Bar Active State
    document.querySelectorAll(".dots-pill-agent").forEach(pill => {
      pill.classList.toggle("active", pill.dataset.agent === agentId);
    });

    // 3. Update Breadcrumb
    const breadcrumbEl = document.getElementById("dotsBreadcrumbAgent");
    if (breadcrumbEl) breadcrumbEl.textContent = agent.name;

    // 4. Update Centered Hero Identity
    const heroAvatarEl = document.getElementById("dotsAgentHeroAvatar");
    const heroNameEl = document.getElementById("dotsAgentHeroName");
    const heroBioEl = document.getElementById("dotsAgentHeroBio");
    const heroSpecialistEl = document.getElementById("dotsAgentSpecialist");

    if (heroAvatarEl) heroAvatarEl.src = agent.heroAvatar;
    if (heroNameEl) heroNameEl.textContent = agent.name;
    if (heroBioEl) heroBioEl.textContent = agent.bio;
    if (heroSpecialistEl) heroSpecialistEl.textContent = agent.specialistTag;

    // 5. Render Swipeable Task Carousel for this agent
    this.renderTasksCarousel(agent);

    // 6. Load & Render Persistent Chat History for this agent
    this.renderChatHistory(agentId);

    // 7. Update Prompt Suggestions Row
    this.renderSuggestions(agent);

    // 8. Update input placeholder
    const inputEl = document.getElementById("dotsChatInput");
    if (inputEl) inputEl.placeholder = `Tanya ${agent.name} seputar tugas, angka, atau rekomendasi...`;

    // 9. Close mobile drawer if open
    document.getElementById("dotsSidebar")?.classList.remove("open");
    document.getElementById("dotsSidebarBackdrop")?.classList.remove("active");

    // 10. Update Hash
    window.location.hash = `#dots/${agentId}`;
  },

  // --------------------------------------------------------------------------
  // SWIPEABLE TASKS CAROUSEL ("MENU BISA DI SWIPE2")
  // --------------------------------------------------------------------------
  renderTasksCarousel(agent) {
    const deck = document.getElementById("dotsTasksDeck");
    if (!deck) return;

    if (!Array.isArray(agent.tasks) || agent.tasks.length === 0) {
      deck.innerHTML = `<div style="color: var(--dots-text-dim); font-size: 0.8rem; padding: 12px;">Belum ada tugas terjadwal untuk agen ini.</div>`;
      return;
    }

    deck.innerHTML = agent.tasks.map(t => `
      <div class="dots-task-card" data-task-id="${t.id}" title="Klik untuk cek detail tugas & hasilnya">
        <div class="dots-task-card-top">
          <div class="dots-task-icon-wrap">${t.icon || '📌'}</div>
          <span class="dots-task-badge-status ${t.statusType || ''}">${t.status}</span>
        </div>

        <div>
          <h3 class="dots-task-title">${t.title}</h3>
          <p class="dots-task-result-snippet">${t.summary}</p>
        </div>

        <div class="dots-task-card-footer">
          <span>⏱️ ${t.schedule}</span>
          <span>Detail Hasil ➔</span>
        </div>
      </div>
    `).join("");
  },

  openTaskModal(taskId) {
    const agent = this.agents[this.activeAgentId];
    if (!agent) return;
    const task = agent.tasks?.find(t => t.id === taskId);
    if (!task) return;

    const modal = document.getElementById("dotsTaskModalBackdrop");
    const iconBox = document.getElementById("dotsModalTaskIcon");
    const titleEl = document.getElementById("dotsModalTaskTitle");
    const statusEl = document.getElementById("dotsModalTaskStatus");
    const scheduleEl = document.getElementById("dotsModalTaskSchedule");
    const scopeEl = document.getElementById("dotsModalTaskScope");
    const resultEl = document.getElementById("dotsModalTaskResult");
    const nextEl = document.getElementById("dotsModalTaskNextAction");

    if (iconBox) iconBox.textContent = task.icon || "📌";
    if (titleEl) titleEl.textContent = task.title;
    if (statusEl) {
      statusEl.textContent = task.status;
      statusEl.className = `dots-task-badge-status ${task.statusType || ''}`;
    }
    if (scheduleEl) scheduleEl.textContent = `Jadwal Eksekusi: ${task.schedule}`;
    if (scopeEl) scopeEl.textContent = task.scopeDetails;
    if (resultEl) resultEl.textContent = task.resultDetails;
    if (nextEl) nextEl.textContent = task.nextAction;

    modal?.classList.add("active");
  },

  closeTaskModal() {
    document.getElementById("dotsTaskModalBackdrop")?.classList.remove("active");
  },

  // --------------------------------------------------------------------------
  // PERSISTENT CHAT HISTORY ("MUNCUL CHAT SEBELUM2NYA")
  // --------------------------------------------------------------------------
  getChatStorageKey(agentId) {
    return `orb_dots_chat_v1_${agentId}`;
  },

  getChatHistory(agentId) {
    try {
      const raw = localStorage.getItem(this.getChatStorageKey(agentId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}

    // Initial default greeting if empty
    const agent = this.agents[agentId];
    const initialMsg = {
      sender: "agent",
      text: agent?.initialMessage || "Halo! Apa yang bisa saya bantu hari ini?",
      time: "Baru saja"
    };
    return [initialMsg];
  },

  saveChatHistory(agentId, history) {
    try {
      localStorage.setItem(this.getChatStorageKey(agentId), JSON.stringify(history));
    } catch (_) {}
  },

  renderChatHistory(agentId) {
    const stream = document.getElementById("dotsChatStream");
    if (!stream) return;

    const history = this.getChatHistory(agentId);
    const agent = this.agents[agentId];
    const avatarSrc = agent?.heroAvatar || "./assets/opendots_fin.png";

    stream.innerHTML = history.map(msg => {
      const isUser = msg.sender === "user";
      return `
        <div class="dots-msg-row ${isUser ? 'user' : 'agent'}">
          ${!isUser ? `<img src="${avatarSrc}" alt="${agent.name}" class="dots-msg-avatar" />` : ''}
          <div class="dots-msg-body">
            <div class="dots-msg-bubble">
              ${msg.text.replace(/\n/g, '<br>')}
            </div>
            <span class="dots-msg-time">${msg.time || ''}</span>
          </div>
        </div>
      `;
    }).join("");

    this.scrollToBottom();
  },

  scrollToBottom() {
    setTimeout(() => {
      const stage = document.getElementById("dotsStageScroll");
      if (stage) {
        stage.scrollTo({ top: stage.scrollHeight, behavior: "smooth" });
      }
    }, 50);
  },

  renderSuggestions(agent) {
    const row = document.getElementById("dotsSuggestionsRow");
    if (!row) return;

    if (!Array.isArray(agent.promptSuggestions)) {
      row.innerHTML = "";
      return;
    }

    row.innerHTML = agent.promptSuggestions.map(prompt => `
      <button class="dots-chip-prompt" data-prompt="${prompt.replace(/ ↗$/, '')}">
        ${prompt}
      </button>
    `).join("");
  },

  startNewChat() {
    const agentId = this.activeAgentId;
    const agent = this.agents[agentId];
    const initialMsg = {
      sender: "agent",
      text: agent?.initialMessage || "Halo! Ada yang bisa saya bantu?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.saveChatHistory(agentId, [initialMsg]);
    this.renderChatHistory(agentId);
  },

  // --------------------------------------------------------------------------
  // SEND MESSAGE & AI RESPONSE DISPATCHER
  // --------------------------------------------------------------------------
  async sendMessage(customText = null) {
    const input = document.getElementById("dotsChatInput");
    const text = customText || input?.value?.trim();
    if (!text) return;

    if (input) input.value = "";

    const agentId = this.activeAgentId;
    const history = this.getChatHistory(agentId);
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Append user message
    history.push({
      sender: "user",
      text: text,
      time: timeNow
    });
    this.saveChatHistory(agentId, history);
    this.renderChatHistory(agentId);

    // 2. Show Typing Indicator
    this.showTypingIndicator();

    // 3. Dispatch AI response
    try {
      const responseText = await this.generateAgentResponse(agentId, text);
      this.hideTypingIndicator();

      history.push({
        sender: "agent",
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      this.saveChatHistory(agentId, history);
      this.renderChatHistory(agentId);
    } catch (err) {
      this.hideTypingIndicator();
      history.push({
        sender: "agent",
        text: `Maaf, terjadi gangguan jaringan. Silakan coba sesaat lagi.`,
        time: timeNow
      });
      this.saveChatHistory(agentId, history);
      this.renderChatHistory(agentId);
    }
  },

  showTypingIndicator() {
    const stream = document.getElementById("dotsChatStream");
    if (!stream) return;
    const agent = this.agents[this.activeAgentId];

    const typingEl = document.createElement("div");
    typingEl.id = "dotsTypingRow";
    typingEl.className = "dots-msg-row agent";
    typingEl.innerHTML = `
      <img src="${agent?.heroAvatar || './assets/opendots_fin.png'}" class="dots-msg-avatar" />
      <div class="dots-msg-bubble dots-typing-indicator">
        <span class="dots-typing-dot"></span>
        <span class="dots-typing-dot"></span>
        <span class="dots-typing-dot"></span>
      </div>
    `;
    stream.appendChild(typingEl);
    this.scrollToBottom();
  },

  hideTypingIndicator() {
    document.getElementById("dotsTypingRow")?.remove();
  },

  async generateAgentResponse(agentId, userText) {
    const q = userText.toLowerCase();

    // If Fin: Use real API askFin if available, or rich contextual intelligence
    if (agentId === "fin") {
      try {
        if (window.API?.askFin) {
          const res = await window.API.askFin(userText);
          if (res?.answer) return res.answer;
        }
      } catch (_) {}

      if (q.includes("pengeluaran") || q.includes("belanja") || q.includes("arus kas")) {
        return `Berdasarkan audit arus kas harian saya, total pengeluaran Anda bulan ini tercatat **IDR 15.250.000** dengan pemasukan **IDR 18.500.000** (Surplus bersih **IDR 3.250.000**).\n\nPos pengeluaran terbesar adalah *Kebutuhan Pokok* (44%) disusul *Makan & Kuliner* (26%). Kondisi kas masih sangat sehat!`;
      } else if (q.includes("budget") || q.includes("sisa")) {
        return `Monitoring budget real-time:\n• **Kebutuhan Pokok**: Terpakai 62% (Sisa IDR 1.900.000)\n• **Makan & Kuliner**: Terpakai 82% ⚠️ (Sisa IDR 540.000)\n• **Transport & Bensin**: Terpakai 50% (Sisa IDR 500.000)\n\nSaran saya: Batasi makan di luar selama sisa bulan ini agar kategori Makan tidak melampaui limit.`;
      } else if (q.includes("tagihan") || q.includes("tempo")) {
        return `Ada **1 tagihan terdekat** yang jatuh tempo:\n📅 **Internet Indihome IDR 450.000** pada tanggal 20 Oktober (2 hari lagi).\n\nSaldo rekening autodebet BCA Anda saat ini mencukupi untuk pembayaran ini.`;
      } else {
        return `Saya mengerti pertanyaan Anda mengenai "${userText}". Sebagai spesialis keuangan pribadi Anda, saya menyarankan untuk selalu menjaga pencatatan pengeluaran harian dan menyisihkan surplus kas minimal 15% setiap bulan. Apakah Anda ingin mencatat transaksi baru sekarang?`;
      }
    }

    // If Welly: Wealth, net worth & future planning
    if (agentId === "welly") {
      try {
        if (window.API?.askWelly) {
          const res = await window.API.askWelly(userText);
          if (res?.text) return res.text;
        }
      } catch (_) {}

      if (q.includes("investasi") || q.includes("kapasitas")) {
        return `Berdasarkan kalkulasi kapasitas bersih dari Fin, Anda memiliki ruang investasi aman sebesar **IDR 2.500.000 per bulan** (sekitar 13.5% dari income bulanan).\n\nAlokasi yang saya sarankan:\n1. 60% (IDR 1.500.000) ke Reksa Dana Pendapatan Tetap / Obligasi Negara\n2. 40% (IDR 1.000.000) dialokasikan ke bantalan Dana Darurat hingga genap 6 bulan pengeluaran.`;
      } else if (q.includes("darurat") || q.includes("stress")) {
        return `Hasil stress-test likuiditas Anda saat ini berada di angka **4.2 bulan** ketahanan kas (IDR 24.800.000 terhadap biaya hidup rutin IDR 5.900.000/bln).\n\nUntuk mencapai ketahanan ideal 6 bulan (IDR 35.400.000), Anda cukup menyisihkan IDR 1.000.000/bulan selama 10 bulan ke depan.`;
      } else {
        return `Strategi kekayaan jangka panjang berfokus pada ketahanan (resilience) dan konsistensi, bukan spekulasi. Dengan kapasitas tabung yang stabil, target finansial 3 tahun Anda berada di jalur yang sangat baik.`;
      }
    }

    // If Aaron: Research, leak detection & market intelligence
    if (agentId === "aaron") {
      if (q.includes("bocor") || q.includes("hemat") || q.includes("leak")) {
        return `Hasil pemindaian 'Bocor Halus' minggu ini:\n🔍 Ditemukan **2 langganan streaming dobel** aktif (potensi hemat **IDR 54.000/bln**).\n🔍 Biaya admin transaksi perbankan non-BI Fast sebesar **IDR 37.500**.\n\nTotal potensi penghematan tahunan jika dihentikan: **IDR 1.098.000/tahun**!`;
      } else if (q.includes("rdpu") || q.includes("suku bunga") || q.includes("deposito")) {
        return `Update riset pasar:\nBI-Rate bertahan di 6.00%. Rata-rata yield Reksa Dana Pasar Uang (RDPU) tier-1 saat ini berada di **5.2% - 5.5% net per tahun** tanpa pajak, jauh lebih efisien dibandingkan tabungan bank biasa yang hanya 0.5% - 1.0% dan dipotong pajak 20%.`;
      } else {
        return `Data riset menunjukkan bahwa disiplin memotong pengeluaran kecil berulang memberikan dampak akumulasi yang lebih besar daripada sekadar menunggu pendapatan naik.`;
      }
    }

    // If Lynn: Automation & Workflows
    if (agentId === "lynn") {
      if (q.includes("ingat") || q.includes("jadwal") || q.includes("alert")) {
        return `Jadwal otomasi aktif saat ini:\n⏰ **21:00 WIB**: Cek mutasi & pengingat catat harian jika transaksi kosong.\n⏰ **H-3 Tanggal 20**: Peringatan saldo autodebet tagihan internet.\n⏰ **Minggu 21:00**: Penyusunan Executive Brief mingguan secara otomatis.`;
      } else {
        return `Semua alur kerja otomatisasi berjalan normal tanpa kendala. Anda sudah mempertahankan rekor pencatatan 12 hari berturut-turut!`;
      }
    }

    return `Pesan Anda telah diterima. Saya akan terus memantau metrik Anda sesuai keahlian spesifik saya.`;
  },

  // --------------------------------------------------------------------------
  // LISTENERS SETUP
  // --------------------------------------------------------------------------
  setupListeners() {
    // 1. Sidebar Agent Click
    document.querySelectorAll(".dots-agent-nav-item").forEach(item => {
      item.addEventListener("click", () => {
        const id = item.dataset.agent;
        if (id) this.switchAgent(id);
      });
    });

    // 2. Mobile Agent Pill Bar Click
    document.querySelectorAll(".dots-pill-agent").forEach(pill => {
      pill.addEventListener("click", () => {
        const id = pill.dataset.agent;
        if (id) this.switchAgent(id);
      });
    });

    // 3. New Chat Button
    document.getElementById("btnDotsNewChat")?.addEventListener("click", () => {
      this.startNewChat();
    });

    // 4. Task Card Click (Delegated on deck)
    const deck = document.getElementById("dotsTasksDeck");
    deck?.addEventListener("click", (e) => {
      const card = e.target.closest(".dots-task-card");
      if (card) {
        const taskId = card.dataset.taskId;
        if (taskId) this.openTaskModal(taskId);
      }
    });

    // 5. Task Carousel Nav Arrows
    document.getElementById("btnDotsDeckLeft")?.addEventListener("click", () => {
      deck?.scrollBy({ left: -260, behavior: "smooth" });
    });
    document.getElementById("btnDotsDeckRight")?.addEventListener("click", () => {
      deck?.scrollBy({ left: 260, behavior: "smooth" });
    });

    // 6. Task Modal Close & Actions
    document.getElementById("btnDotsTaskModalClose")?.addEventListener("click", () => {
      this.closeTaskModal();
    });
    document.getElementById("dotsTaskModalBackdrop")?.addEventListener("click", (e) => {
      if (e.target.id === "dotsTaskModalBackdrop") this.closeTaskModal();
    });

    document.getElementById("btnDotsModalDiscussChat")?.addEventListener("click", () => {
      const title = document.getElementById("dotsModalTaskTitle")?.textContent || "";
      this.closeTaskModal();
      this.sendMessage(`Jelaskan lebih lanjut temuan dan rekomendasi dari tugas: "${title}"`);
    });

    document.getElementById("btnDotsModalReanalyze")?.addEventListener("click", () => {
      const btn = document.getElementById("btnDotsModalReanalyze");
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = "⏳ Menganalisis...";
        btn.disabled = true;
        setTimeout(() => {
          btn.innerHTML = "✓ Analisis Terkini!";
          setTimeout(() => {
            btn.innerHTML = orig;
            btn.disabled = false;
          }, 1200);
        }, 800);
      }
    });

    // 7. Chat Send Button & Enter Key
    const sendBtn = document.getElementById("btnDotsSendMsg");
    const inputField = document.getElementById("dotsChatInput");

    sendBtn?.addEventListener("click", () => this.sendMessage());
    inputField?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // 8. Suggestion Chips Click
    const sugRow = document.getElementById("dotsSuggestionsRow");
    sugRow?.addEventListener("click", (e) => {
      const chip = e.target.closest(".dots-chip-prompt");
      if (chip) {
        const prompt = chip.dataset.prompt;
        if (prompt) this.sendMessage(prompt);
      }
    });

    // 9. Spaces Click (Deep-link to Fin Workspace / Welly Workspace)
    document.getElementById("dotsSpaceFin")?.addEventListener("click", () => {
      window.location.hash = "#fin";
    });
    document.getElementById("dotsSpaceWelly")?.addEventListener("click", () => {
      window.location.hash = "#welly";
    });
    document.getElementById("dotsSpaceEveryday")?.addEventListener("click", () => {
      this.switchAgent("fin");
    });
  }
};

window.DotsBotManager = DotsBotManager;
