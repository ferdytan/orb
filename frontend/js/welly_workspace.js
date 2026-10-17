/* ==========================================================================
   ORB - WELLY WEALTH & PLANNING WORKSPACE CONTROLLER
   Fin & Welly Structured Collaboration, Capacity Evaluation, Joint Reviews
   ========================================================================== */

const WellyWorkspace = {
  currentSubtab: "snapshot",
  activeSnapshot: null,
  activePlans: [],
  activeReview: null,
  activePermissions: null,

  init() {
    this.setupSubtabs();
    this.setupChat();
  },

  setupSubtabs() {
    const subnav = document.getElementById("wellySubnavScroll");
    if (!subnav) return;

    subnav.addEventListener("click", (e) => {
      const btn = e.target.closest(".welly-subtab-btn");
      if (!btn) return;

      const subtab = btn.dataset.subtab;
      this.switchSubtab(subtab);
    });
  },

  switchSubtab(subtab) {
    this.currentSubtab = subtab;

    // Update active tab button
    document.querySelectorAll(".welly-subtab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.subtab === subtab);
    });

    // Update active pane
    document.querySelectorAll(".welly-subtab-pane").forEach(pane => {
      pane.classList.remove("active");
      pane.style.display = "none";
    });

    const targetPane = document.getElementById(`wellySubtab_${subtab}`);
    if (targetPane) {
      targetPane.classList.add("active");
      targetPane.style.display = "block";
    }

    this.renderSubtab(subtab);
  },

  async refresh() {
    await this.renderSubtab(this.currentSubtab);
  },

  async renderSubtab(subtab) {
    if (subtab === "snapshot") {
      await this.renderSnapshot();
    } else if (subtab === "plans") {
      await this.renderPlans();
    } else if (subtab === "reviews") {
      await this.renderReviews();
    } else if (subtab === "chat") {
      this.renderChatPrompt();
    } else if (subtab === "privacy") {
      await this.renderPrivacy();
    }
  },

  // -------------------------------------------------------------
  // 1. KONDISI KEUANGAN DARI FIN (SNAPSHOT)
  // -------------------------------------------------------------
  async renderSnapshot() {
    const container = document.getElementById("wellySnapshotContent");
    if (!container) return;

    container.innerHTML = `<div class="fin-loading-state">Mengambil laporan tervalidasi dari Fin...</div>`;
    const snap = await API.getFinSnapshot();
    this.activeSnapshot = snap;

    if (!snap) {
      container.innerHTML = `
        <div class="fin-empty-state">
          <p>Belum ada snapshot keuangan dari Fin.</p>
          <button class="fin-primary-btn" id="btnGenSnapFirst">Buat Snapshot Fin Sekarang</button>
        </div>
      `;
      document.getElementById("btnGenSnapFirst")?.addEventListener("click", async () => {
        await API.generateFinSnapshot();
        await this.renderSnapshot();
      });
      return;
    }

    const facts = snap.facts || {};
    const surplus = snap.unallocated_surplus_capacity || {};
    const quality = snap.data_quality || {};
    const isStale = Boolean(quality.is_stale);

    container.innerHTML = `
      <!-- Staleness Warning or Sync Badge -->
      <div class="welly-status-banner ${isStale ? 'is-stale' : 'is-fresh'}">
        <div class="banner-text-col">
          <span class="banner-badge">${isStale ? '⚠️ Snapshot Usang' : '🟢 Snapshot Sinkron'}</span>
          <span class="banner-desc">
            ${isStale 
              ? 'Ada transaksi baru di Fin setelah snapshot ini dibuat. Angka di bawah belum mencerminkan data terbaru.' 
              : 'Data sinkron dengan buku kas Fin (fin.snapshot.v1).'}
          </span>
        </div>
        <button class="welly-pill-btn" id="btnRefreshFinSnapshot">Perbarui Snapshot 🔄</button>
      </div>

      <!-- Surplus Capacity Card -->
      <div class="welly-capacity-card">
        <div class="capacity-title-row">
          <span>💡 Saldo Bebas & Kapasitas Kontribusi</span>
          <span class="capacity-badge">Pure Integer IDR</span>
        </div>
        <div class="capacity-amount-grid">
          <div class="capacity-stat-box">
            <div class="capacity-stat-label">Saldo Likuid Bebas (Unallocated)</div>
            <div class="capacity-stat-val">Rp ${(surplus.unallocated_liquid_surplus || 0).toLocaleString('id-ID')}</div>
            <div class="capacity-stat-sub">Setelah dikurangi dana cadangan & tagihan</div>
          </div>
          <div class="capacity-stat-box">
            <div class="capacity-stat-label">Potensi Arus Kas Bebas / Bulan</div>
            <div class="capacity-stat-val">Rp ${(surplus.monthly_free_cashflow_potential || 0).toLocaleString('id-ID')}</div>
            <div class="capacity-stat-sub">Pemasukan dikurangi pengeluaran & tagihan</div>
          </div>
        </div>
      </div>

      <!-- Ledger Facts Breakdown -->
      <div class="welly-facts-grid">
        <div class="welly-fact-card">
          <span class="fact-label">Pemasukan Aktual Periode</span>
          <span class="fact-val" style="color: #10B981;">Rp ${(facts.actual_income || 0).toLocaleString('id-ID')}</span>
        </div>
        <div class="welly-fact-card">
          <span class="fact-label">Pengeluaran Aktual Periode</span>
          <span class="fact-val" style="color: #EF4444;">Rp ${(facts.actual_expense || 0).toLocaleString('id-ID')}</span>
        </div>
        <div class="welly-fact-card">
          <span class="fact-label">Arus Kas Bersih (Net)</span>
          <span class="fact-val" style="color: ${facts.net_cashflow >= 0 ? '#10B981' : '#EF4444'};">
            Rp ${(facts.net_cashflow || 0).toLocaleString('id-ID')}
          </span>
        </div>
        <div class="welly-fact-card">
          <span class="fact-label">Total Saldo Likuid Kas & Bank</span>
          <span class="fact-val">Rp ${(facts.liquid_balance || 0).toLocaleString('id-ID')}</span>
        </div>
      </div>

      <!-- Data Completeness Notes -->
      ${quality.missing_data_notes && quality.missing_data_notes.length > 0 ? `
        <div class="welly-notes-box">
          <div class="welly-notes-title">📌 Catatan Integritas Data dari Fin:</div>
          <ul class="welly-notes-list">
            ${quality.missing_data_notes.map(n => `<li>${n}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;

    document.getElementById("btnRefreshFinSnapshot")?.addEventListener("click", async () => {
      container.innerHTML = `<div class="fin-loading-state">Memperbarui snapshot...</div>`;
      await API.generateFinSnapshot();
      await this.renderSnapshot();
    });
  },

  // -------------------------------------------------------------
  // 2. TARGET & ALOKASI PORTFOLIO (WELLY PLANS)
  // -------------------------------------------------------------
  async renderPlans() {
    const container = document.getElementById("wellyPlansContent");
    if (!container) return;

    container.innerHTML = `<div class="fin-loading-state">Memuat target rencana kekayaan...</div>`;
    const plans = await API.getWealthPlans();
    this.activePlans = plans;

    container.innerHTML = `
      <div class="welly-plans-head">
        <div>
          <h3 class="welly-section-heading">Target & Portofolio Masa Depan</h3>
          <p class="welly-section-sub">Tujuan jangka menengah & panjang yang dipantau Welly</p>
        </div>
        <button class="fin-primary-btn" id="btnAddNewWealthPlan">+ Target Baru</button>
      </div>

      ${plans.length === 0 ? `
        <div class="fin-empty-state">
          <p>Belum ada target perencanaan kekayaan yang terdaftar.</p>
        </div>
      ` : `
        <div class="welly-plans-list">
          ${plans.map(p => `
            <div class="welly-plan-card">
              <div class="plan-card-top">
                <div>
                  <span class="plan-title">${p.title}</span>
                  <div class="plan-badges">
                    <span class="plan-risk-badge risk-${p.risk_profile}">${p.risk_profile.toUpperCase()}</span>
                    <span class="plan-horizon-badge">${p.horizon_years} Tahun</span>
                  </div>
                </div>
                <div class="plan-pct-badge">${p.progress_percentage}%</div>
              </div>

              <div class="plan-progress-track">
                <div class="plan-progress-fill" style="width: ${Math.min(100, p.progress_percentage)}%;"></div>
              </div>

              <div class="plan-numbers-row">
                <div>
                  <span class="plan-lbl">Terkumpul:</span>
                  <span class="plan-val">Rp ${p.current_amount.toLocaleString('id-ID')}</span>
                </div>
                <div>
                  <span class="plan-lbl">Target:</span>
                  <span class="plan-val">Rp ${p.target_amount.toLocaleString('id-ID')}</span>
                </div>
                <div>
                  <span class="plan-lbl">Kontribusi/Bln:</span>
                  <span class="plan-val">Rp ${p.monthly_contribution_target.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;

    document.getElementById("btnAddNewWealthPlan")?.addEventListener("click", () => {
      this.openAddPlanModal();
    });
  },

  openAddPlanModal() {
    const modal = document.getElementById("genericOrbModal");
    const title = document.getElementById("genericModalTitle");
    const body = document.getElementById("genericModalBody");
    if (!modal || !body) return;

    title.textContent = "Tambah Target Rencana Masa Depan";
    body.innerHTML = `
      <form id="formAddWealthPlan" class="fin-form-grid">
        <div class="fin-field">
          <label>Nama Target Rencana</label>
          <input type="text" id="inputPlanTitle" required placeholder="Contoh: Dana Rumah, Portofolio Saham" />
        </div>
        <div class="fin-field">
          <label>Nilai Target (IDR)</label>
          <input type="number" id="inputPlanTarget" required min="10000" placeholder="100000000" />
        </div>
        <div class="fin-field">
          <label>Terkumpul Saat Ini (IDR)</label>
          <input type="number" id="inputPlanCurrent" min="0" value="0" />
        </div>
        <div class="fin-field">
          <label>Target Kontribusi Bulanan (IDR)</label>
          <input type="number" id="inputPlanMonthly" min="0" placeholder="1000000" />
        </div>
        <div class="fin-field">
          <label>Profil Risiko</label>
          <select id="inputPlanRisk">
            <option value="conservative">Konservatif (Risiko Rendah)</option>
            <option value="moderate" selected>Moderat (Seimbang)</option>
            <option value="aggressive">Agresif (Pertumbuhan Tinggi)</option>
          </select>
        </div>
        <div class="fin-field">
          <label>Horizon Waktu (Tahun)</label>
          <input type="number" id="inputPlanHorizon" min="1" max="50" value="5" />
        </div>
        <button type="submit" class="fin-submit-btn">Simpan Target Rencana</button>
      </form>
    `;

    document.getElementById("formAddWealthPlan")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        title: document.getElementById("inputPlanTitle").value.trim(),
        target_amount: parseInt(document.getElementById("inputPlanTarget").value) || 0,
        current_amount: parseInt(document.getElementById("inputPlanCurrent").value) || 0,
        monthly_contribution_target: parseInt(document.getElementById("inputPlanMonthly").value) || 0,
        risk_profile: document.getElementById("inputPlanRisk").value,
        horizon_years: parseInt(document.getElementById("inputPlanHorizon").value) || 5
      };

      await API.createWealthPlan(payload);
      modal.style.display = "none";
      await this.renderPlans();
    });

    modal.style.display = "flex";
  },

  // -------------------------------------------------------------
  // 3. REVIEW BERSAMA & REKOMENDASI (JOINT REVIEW)
  // -------------------------------------------------------------
  async renderReviews() {
    const container = document.getElementById("wellyReviewsContent");
    if (!container) return;

    container.innerHTML = `<div class="fin-loading-state">Memuat review bersama Fin & Welly...</div>`;
    const review = await API.getJointReview();
    this.activeReview = review;

    if (!review) {
      container.innerHTML = `
        <div class="fin-empty-state">
          <p>Belum ada sesi review bersama yang tersimpan.</p>
          <button class="fin-primary-btn" id="btnStartJointReview">Mulai Review Bersama Pertama</button>
        </div>
      `;
      document.getElementById("btnStartJointReview")?.addEventListener("click", async () => {
        await this.generateNewReview();
      });
      return;
    }

    const recs = review.recommendations || [];

    container.innerHTML = `
      <div class="welly-review-head">
        <div>
          <span class="review-period-badge">Periode ${review.period} • ID: ${review.review_id}</span>
          <h3 class="welly-section-heading">Sintesis Fin & Welly</h3>
        </div>
        <button class="welly-pill-btn" id="btnRerunJointReview">Review Ulang 🔄</button>
      </div>

      <!-- Synthesized Insights Box -->
      <div class="joint-insights-card">
        <div class="joint-insights-title">🤝 Hasil Evaluasi Kolaborasi</div>
        <div class="joint-insights-body">
          ${review.summary_insights.split('\n').map(line => `<p>${line}</p>`).join('')}
        </div>
        <div class="joint-liquidity-box">
          <strong>💧 Analisis Likuiditas:</strong> ${review.liquidity_assessment}
        </div>
      </div>

      <!-- Recommendations Heading -->
      <div class="joint-recs-header">
        <h4>Rekomendasi Tindak Lanjut (${recs.length})</h4>
        <span class="recs-sub">Memerlukan persetujuan eksplisit Anda sebelum diterapkan</span>
      </div>

      ${recs.length === 0 ? `
        <div class="fin-empty-state">
          <p>Kondisi keuangan saat ini seimbang, tidak ada penyesuaian mendesak yang disarankan.</p>
        </div>
      ` : `
        <div class="joint-recs-list">
          ${recs.map(r => `
            <div class="joint-rec-card status-${r.status}">
              <div class="rec-card-top">
                <span class="rec-author-pill author-${r.author.toLowerCase()}">${r.author}</span>
                <span class="rec-status-pill status-${r.status}">
                  ${r.status === 'draft' ? 'Draft' : r.status === 'approved' ? 'Disetujui' : r.status === 'applied' ? 'Diterapkan' : 'Ditolak'}
                </span>
              </div>

              <div class="rec-title">${r.title}</div>
              <div class="rec-rationale"><strong>Rasional:</strong> ${r.rationale}</div>
              <div class="rec-impact"><strong>Dampak:</strong> ${r.projected_impact}</div>

              <div class="rec-actions-row">
                <button class="rec-preview-btn" data-rec-id="${r.id}">🔍 Preview Dampak</button>
                
                ${r.status === 'draft' ? `
                  <button class="rec-approve-btn" data-rec-id="${r.id}">Setujui</button>
                  <button class="rec-apply-btn" data-rec-id="${r.id}">Terapkan Langsung</button>
                ` : r.status === 'approved' ? `
                  <button class="rec-apply-btn" data-rec-id="${r.id}">Terapkan Sekarang</button>
                ` : `
                  <span class="rec-applied-label">✅ Selesai Diterapkan</span>
                `}
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;

    document.getElementById("btnRerunJointReview")?.addEventListener("click", async () => {
      await this.generateNewReview();
    });

    // Wire recommendation buttons
    container.querySelectorAll(".rec-preview-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.recId);
        this.openPreviewRecommendationModal(id);
      });
    });

    container.querySelectorAll(".rec-approve-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = parseInt(btn.dataset.recId);
        await API.approveRecommendation(id);
        await this.renderReviews();
      });
    });

    container.querySelectorAll(".rec-apply-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = parseInt(btn.dataset.recId);
        await API.applyRecommendation(id);
        await this.renderReviews();
      });
    });
  },

  async generateNewReview() {
    const container = document.getElementById("wellyReviewsContent");
    if (container) container.innerHTML = `<div class="fin-loading-state">Membuat review bersama baru...</div>`;
    await API.generateJointReview();
    await this.renderReviews();
  },

  openPreviewRecommendationModal(recId) {
    if (!this.activeReview || !this.activeReview.recommendations) return;
    const rec = this.activeReview.recommendations.find(r => r.id === recId);
    if (!rec) return;

    const modal = document.getElementById("genericOrbModal");
    const title = document.getElementById("genericModalTitle");
    const body = document.getElementById("genericModalBody");
    if (!modal || !body) return;

    title.textContent = `Preview Rekomendasi: ${rec.title}`;
    const payload = rec.proposed_payload || {};

    body.innerHTML = `
      <div class="preview-rec-modal-body">
        <div class="preview-row"><strong>Pengusul:</strong> ${rec.author}</div>
        <div class="preview-row"><strong>Jenis Tindakan:</strong> ${rec.action_type}</div>
        <div class="preview-row"><strong>Asumsi:</strong> ${rec.assumptions}</div>
        <div class="preview-row"><strong>Dampak yang Diproyeksikan:</strong> ${rec.projected_impact}</div>
        
        <div class="preview-payload-box">
          <div class="payload-box-title">Rincian Perubahan yang Akan Diterapkan:</div>
          <pre class="payload-pre">${JSON.stringify(payload, null, 2)}</pre>
        </div>

        <div class="preview-safety-note">
          🔒 <strong>Jaminan Keamanan:</strong> Penerapan rekomendasi ini tidak akan membuat transaksi fiktif atau memalsukan saldo rekening bank Anda.
        </div>

        <div class="preview-modal-actions">
          ${rec.status !== 'applied' ? `
            <button class="fin-primary-btn" id="btnModalApplyRec">Terapkan Perubahan Ini</button>
          ` : `
            <button class="fin-secondary-btn" disabled>Sudah Diterapkan</button>
          `}
        </div>
      </div>
    `;

    document.getElementById("btnModalApplyRec")?.addEventListener("click", async () => {
      await API.applyRecommendation(recId);
      modal.style.display = "none";
      await this.renderReviews();
    });

    modal.style.display = "flex";
  },

  // -------------------------------------------------------------
  // 4. TANYA WELLY (CHAT)
  // -------------------------------------------------------------
  renderChatPrompt() {
    const container = document.getElementById("wellyChatContent");
    if (!container) return;

    if (!container.innerHTML.trim()) {
      container.innerHTML = `
        <div class="welly-chat-container">
          <div class="welly-chat-history" id="wellyChatHistory">
            <div class="welly-chat-msg agent-msg">
              <img src="./assets/avatar_welly_360.png" class="chat-agent-avatar" />
              <div class="chat-bubble">
                Halo! Saya Welly, perencana kekayaan Anda. Saya menganalisis kapasitas arus kas aktual dari Fin untuk membantu menyusun strategi alokasi dan target masa depan. Apa yang ingin Anda diskusikan?
              </div>
            </div>
          </div>

          <div class="welly-chips-row" id="wellyChipsRow">
            <button class="welly-chip-btn">Kapasitas investasi bulan ini?</button>
            <button class="welly-chip-btn">Apakah dana darurat saya aman?</button>
            <button class="welly-chip-btn">Lihat progres target masa depan</button>
          </div>

          <div class="welly-chat-input-bar">
            <input type="text" id="wellyChatInput" placeholder="Tanya Welly seputar investasi, dana darurat, alokasi..." />
            <button id="btnSendWellyChat">➤</button>
          </div>
        </div>
      `;

      this.setupChatListeners();
    }
  },

  setupChat() {
    // Empty hook
  },

  setupChatListeners() {
    const input = document.getElementById("wellyChatInput");
    const sendBtn = document.getElementById("btnSendWellyChat");
    const chipsRow = document.getElementById("wellyChipsRow");

    const doSend = async (text) => {
      const msg = text || (input ? input.value.trim() : "");
      if (!msg) return;
      if (input) input.value = "";

      const history = document.getElementById("wellyChatHistory");
      if (!history) return;

      // Append User message
      history.innerHTML += `
        <div class="welly-chat-msg user-msg">
          <div class="chat-bubble">${msg}</div>
        </div>
      `;
      history.scrollTop = history.scrollHeight;

      // Call API
      const res = await API.askWelly(msg);

      // Append Agent message
      history.innerHTML += `
        <div class="welly-chat-msg agent-msg">
          <img src="./assets/avatar_welly_360.png" class="chat-agent-avatar" />
          <div class="chat-bubble">${res.text.replace(/\n/g, '<br>')}</div>
        </div>
      `;
      history.scrollTop = history.scrollHeight;
    };

    sendBtn?.addEventListener("click", () => doSend());
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSend();
    });

    chipsRow?.addEventListener("click", (e) => {
      const btn = e.target.closest(".welly-chip-btn");
      if (btn) doSend(btn.textContent.trim());
    });
  },

  // -------------------------------------------------------------
  // 5. IZIN & PRIVASI (PERMISSIONS & AUDIT LOGS)
  // -------------------------------------------------------------
  async renderPrivacy() {
    const container = document.getElementById("wellyPrivacyContent");
    if (!container) return;

    container.innerHTML = `<div class="fin-loading-state">Memuat pengaturan privasi & log audit...</div>`;
    const perms = await API.getCollaborationPermissions();
    const logs = await API.getCollaborationAuditLogs(20);
    this.activePermissions = perms;

    container.innerHTML = `
      <div class="welly-privacy-wrapper">
        <div class="privacy-card">
          <h3 class="welly-section-heading">Kontrol Berbagi Data Fin → Welly</h3>
          <p class="welly-section-sub">Atur izin akses Welly terhadap ringkasan keuangan dari Fin</p>

          <div class="privacy-row-toggle">
            <div>
              <div class="privacy-item-title">Izinkan Welly Membaca Ringkasan Fin</div>
              <div class="privacy-item-desc">Welly membaca data teragregasi untuk menghitung kapasitas kontribusi</div>
            </div>
            <button class="toggle-pill-switch ${perms.welly_read_fin_summary ? 'active' : ''}" id="toggleWellyPerms">
              <span class="toggle-thumb"></span>
            </button>
          </div>

          <div class="privacy-row-field">
            <label class="privacy-item-title">Cakupan Data yang Dibagikan</label>
            <select id="selectPermScope" class="privacy-select">
              <option value="aggregated_summary" ${perms.allowed_scope === 'aggregated_summary' ? 'selected' : ''}>
                Ringkasan Teragregasi (Default - Direkomendasikan)
              </option>
              <option value="minimal_kpi" ${perms.allowed_scope === 'minimal_kpi' ? 'selected' : ''}>
                Hanya KPI Minimal (Arus Kas Bersih & Saldo)
              </option>
              <option value="full_details" ${perms.allowed_scope === 'full_details' ? 'selected' : ''}>
                Rincian Penuh
              </option>
            </select>
          </div>
        </div>

        <div class="audit-card">
          <h3 class="welly-section-heading">📋 Log Audit Akses Kolaborasi</h3>
          <p class="welly-section-sub">Riwayat transparan saat Welly membaca atau mengambil tindakan</p>

          ${logs.length === 0 ? `
            <div class="fin-empty-state"><p>Belum ada aktivitas akses kolaborasi.</p></div>
          ` : `
            <div class="audit-list">
              ${logs.map(l => `
                <div class="audit-log-item">
                  <div class="audit-action">${l.action}</div>
                  <div class="audit-time">${new Date(l.accessed_at).toLocaleString('id-ID')}</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    document.getElementById("toggleWellyPerms")?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const newVal = !btn.classList.contains("active");
      btn.classList.toggle("active", newVal);
      await API.updateCollaborationPermissions({
        welly_read_fin_summary: newVal,
        allowed_scope: document.getElementById("selectPermScope")?.value || "aggregated_summary",
        allow_external_llm: false
      });
      await this.renderPrivacy();
    });

    document.getElementById("selectPermScope")?.addEventListener("change", async (e) => {
      await API.updateCollaborationPermissions({
        welly_read_fin_summary: document.getElementById("toggleWellyPerms")?.classList.contains("active") || false,
        allowed_scope: e.target.value,
        allow_external_llm: false
      });
      await this.renderPrivacy();
    });
  }
};

window.WellyWorkspace = WellyWorkspace;
