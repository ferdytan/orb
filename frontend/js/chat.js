/* ==========================================================================
   ORB - CHAT & VOICE INTERACTION MANAGER
   ========================================================================== */

const ChatManager = {
  activeAgent: null,
  isRecording: false,
  recognition: null,

  init(initialAgent) {
    this.activeAgent = initialAgent;
    if (initialAgent) {
      this.updateActiveAgent(initialAgent);
    }
    this.setupSpeechRecognition();
    this.setupListeners();
  },

  updateActiveAgent(agent) {
    if (!agent) return;
    this.activeAgent = agent;
    const thumbImg = document.getElementById("chatActiveAgentThumb");
    const nameTag = document.getElementById("chatActiveAgentNameTag");
    const inputEl = document.getElementById("chatBarInput");

    const avatarSrc = window.resolveOrbAsset ? window.resolveOrbAsset(agent.avatar_image) : (agent.avatar_image || './assets/avatar_fin.png');

    if (thumbImg) thumbImg.src = avatarSrc;
    if (nameTag) nameTag.textContent = agent.name;
    if (inputEl) inputEl.placeholder = `What can ${agent.name} do for you?`;
  },

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";

      this.recognition.onstart = () => {
        this.isRecording = true;
        this.updateMicUi(true);
      };

      this.recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const inputEl = document.getElementById("chatBarInput");
        if (inputEl) inputEl.value = transcript;
      };

      this.recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        this.stopRecording();
      };

      this.recognition.onend = () => {
        this.stopRecording();
        const inputEl = document.getElementById("chatBarInput");
        if (inputEl && inputEl.value.trim()) {
          this.sendMessage();
        }
      };
    }
  },

  toggleRecording() {
    if (!this.recognition) {
      const samplePrompts = [
        "Please check our flight route for the upcoming trip",
        "Save Rp 1 juta this month to the reserve vault",
        "How is our wallet balance and outside sales conversion?",
        "Review marketing funnels and daily tasks"
      ];
      const randomPrompt = samplePrompts[Math.floor(Math.random() * samplePrompts.length)];
      const inputEl = document.getElementById("chatBarInput");
      if (inputEl) {
        inputEl.value = randomPrompt;
        this.sendMessage();
      }
      return;
    }

    if (this.isRecording) {
      this.recognition.stop();
      this.stopRecording();
    } else {
      try {
        this.recognition.start();
      } catch (e) {
        console.warn("Could not start recognition:", e);
      }
    }
  },

  stopRecording() {
    this.isRecording = false;
    this.updateMicUi(false);
  },

  updateMicUi(active) {
    const micBtn = document.getElementById("chatMicBtn");
    if (micBtn) {
      micBtn.classList.toggle("recording", active);
      micBtn.innerHTML = active ? "🔴" : "🎤";
    }
  },

  async sendMessage() {
    const inputEl = document.getElementById("chatBarInput");
    if (!inputEl) return;
    const text = inputEl.value.trim();
    if (!text || !this.activeAgent) return;

    inputEl.value = "";
    inputEl.placeholder = `${this.activeAgent.name} is thinking...`;

    try {
      const response = await window.API?.sendChat(this.activeAgent.id, text);
      inputEl.placeholder = `What can ${this.activeAgent.name} do for you?`;

      this.showToast(this.activeAgent.name, response.text);

      if (response.action) {
        const goals = await window.API?.getGoals();
        const wallet = await window.API?.getWallet();
        window.BentoManager?.init({ goals, wallet });
      }
    } catch (e) {
      console.error("Error sending chat:", e);
      inputEl.placeholder = `What can ${this.activeAgent.name} do for you?`;
    }
  },

  showToast(sender, message) {
    let toast = document.getElementById("orbFloatingToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "orbFloatingToast";
      toast.style.cssText = `
        position: fixed;
        top: 70px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        width: 90%;
        max-width: 480px;
        background: rgba(24, 25, 31, 0.95);
        color: white;
        padding: 12px 18px;
        border-radius: 18px;
        font-size: 0.82rem;
        box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        z-index: 95;
        transition: transform 0.3s ease, opacity 0.3s ease;
        opacity: 0;
        pointer-events: none;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      `;
      document.body.appendChild(toast);
    }

    toast.innerHTML = `<strong style="color: #10B981;">${sender}:</strong> ${message}`;
    toast.style.transform = "translateX(-50%) translateY(0)";
    toast.style.opacity = "1";

    setTimeout(() => {
      toast.style.transform = "translateX(-50%) translateY(-20px)";
      toast.style.opacity = "0";
    }, 4500);
  },

  setupListeners() {
    const micBtn = document.getElementById("chatMicBtn");
    const sendBtn = document.getElementById("chatSendBtn");
    const inputEl = document.getElementById("chatBarInput");
    const badgeEl = document.getElementById("chatActiveAgentBadge");

    micBtn?.addEventListener("click", () => this.toggleRecording());
    sendBtn?.addEventListener("click", () => this.sendMessage());
    inputEl?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.sendMessage();
    });

    badgeEl?.addEventListener("click", () => {
      if (this.activeAgent && window.AgentModalManager) {
        window.AgentModalManager.open(this.activeAgent.id);
      }
    });
  }
};

window.ChatManager = ChatManager;
