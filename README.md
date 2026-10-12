<<<<<<< HEAD
# 🌐 Orb - Virtual Office AI Agent System

**Orb** is a portable, handheld-first virtual office dashboard powered by **FastAPI** and **CrewAI**. It blends plush, playful 3D aesthetics (inspired by Dots and Muse) with an autonomous multi-agent orchestration architecture and a persistent memory framework.

---

## 🎨 Core Design Concept & UI/UX

### 1. Handheld Bento Dashboard
- **Portable Form-Factor**: Designed mobile-first within an interactive handheld device shell (with a toggle to expand into full-width mode).
- **Solid Tone Bento Grid**: Uniform background color for all widgets (crisp `#FFFFFF` in Light Mode, deep `#1E2028` in Dark Mode).
- **Tactile Bento Cards**:
  - **Goal**: Displays active objective (*"Turn one outside sale..."*), sub-milestones with interactive check toggles, and live progress rings.
  - **Wallet**: 3D plush green wallet artwork with live balance ($1,400 / Rp 22.400.000), transaction ledger, and currency toggles.
  - **Talent**: 3D fan of layered cards representing core capabilities (**Social**, **Collab**, **Creativity**) with glowing bulb badges.
  - **Collections**: High-gloss achievement tokens (**Achiever Star**, **Celestial Spark**, **Vault Keeper**).

### 2. Office Scene Background & Dynamic Lighting
- **Full Blurred Office Scene**: Realistic modern workspace backdrop layered with lighting shaders.
- **Dynamic Time-of-Day Shaders**:
  - 🌅 **Morning Warm**: Soft amber/peach sunbeams and warm morning glow.
  - ☀️ **Noon Bright**: High-key, natural daylight with crisp neutral shadows.
  - 🌇 **Evening Golden**: Rich orange-gold sunset rays through office windows.
  - 🌙 **Night Deep Blue**: Midnight indigo city skyline with glowing amber desk lamp pools.
- **Controls**: Instant mode switcher buttons + an **Auto** mode that synchronizes with the real system clock.
- **System Modes**: Seamless Light and Dark mode styling.

### 3. Plush Avatars (Dots / Muse Inspired)
- Soft rounded edges, pastel palettes, playful plush felt textures, expressive faces, and domain accessories.
- **Color-Coded Status Pills** above heads:
  - 🟢 `active` (pulsing green halo)
  - 🔵 `listening` (calm purple/blue pill)
  - 🟡 `routing` / `thinking` (amber processing pill)
  - ⚪ `idle` (slate gray standby pill)
- **Activity Subtitle** below each avatar: e.g. `🌟 Fin / 👍 Logging expenses`, `😴 Muse / ✈️ Checking routes`, `👍 Chat / 💬 Monitoring chats`.
- **Carousel & Compact Modes**:
  - Displays 3 primary agents by default with touch-swipe / pagination dots.
  - One-click **"All 10"** button shrinks all 10 avatars into a view for rapid inspection.

---

## 🤖 10 Abstract Agents & Visual Identities

| Agent | Plush Color & Style | Accessory | Domain / Role | Default Status |
| :--- | :--- | :--- | :--- | :--- |
| **Fin** | Yellow plush, green hoodie & cap | Headphones, thumbs up | Finance & Budgeting | `active` |
| **Muse** | Fluffy beige bear plush | Headphones, laptop | Routing & Logistics | `routing` |
| **Chat** | Fluffy white yeti / bunny | Headset with boom mic | Customer & Team Comms | `listening` |
| **Nova** | Lavender-purple plush | Retro glasses, warm mug | Metrics & Analytics | `active` |
| **Blaze** | Coral-orange fox plush | Cyan cyber visor, lanyard | Growth & Marketing | `active` |
| **Sage** | Mint-green sprout plush | Leaf clip, leather journal | Strategy & Roadmaps | `idle` |
| **Spark** | Buttercup-yellow chick plush | Digital antenna & stylus | UI & Bento Design | `listening` |
| **Echo** | Sky-blue sound bubble plush | Over-ear studio headphones | Audio & Podcasting | `routing` |
| **Pixel** | Bubblegum-pink bunny plush | Retro VR goggles | 3D & Visual Assets | `active` |
| **Atlas** | Slate-indigo owl plush | Gold monocle | Global Compliance & Ops | `idle` |

---

## 🧠 CrewAI Memory & Orchestration System

Orb implements a two-tier memory architecture managed by `OrbMemoryManager`:

1. **Shared Crew Memory**:
   - Global goals and organizational preferences accessible across all agents.
   - *Example*: `"Save Rp 1 juta this month"` → Monitored directly by **Fin**, while other agents (like **Blaze** or **Sage**) reference this shared constraint when planning campaigns or budgets.
2. **Per-Agent Memory**:
   - Individual preferences, execution history, and domain-specific context.
   - *Example*: Muse remembers flight seat preferences; Chat remembers tone guidelines.

### Real-Time Live Status Updates
- When tasks are assigned, the agent transitions state (`listening` ➔ `thinking/routing` ➔ `active` ➔ `listening/idle`).
- Updates are pushed over **WebSockets (`/ws`)** so the header status pills and activities reflect agent actions immediately without page reloads.

---

## 📂 Project Architecture

```
Orb/
├── backend/
│   ├── app.py           # FastAPI application, REST endpoints, WebSockets, static serving
│   ├── crew.py          # CrewAI agents, tasks, orchestration & smart turn engine
│   ├── memory.py        # CrewAI Memory manager (Per-agent + Shared global memory)
│   ├── database.py      # SQLite database schema, seeding, and queries
│   └── models.py        # Pydantic data schemas
├── frontend/
│   ├── index.html       # Handheld virtual office dashboard
│   ├── css/
│   │   ├── styles.css   # Bento styling, dynamic lighting shaders, responsive layouts
│   │   └── avatars.css  # Plush animations, status glows, domain badges
│   ├── js/
│   │   ├── app.js       # Master coordinator & lighting controller
│   │   ├── api.js       # REST & WebSocket client with auto-reconnect
│   │   ├── avatars.js   # Avatar carousel & compact 10-grid renderer
│   │   ├── bento.js     # Goal, Wallet, Talent, Collections widget manager
│   │   ├── agent_modal.js # Expanded agent dashboard with domain views & memory inspector
│   │   └── chat.js      # Persistent chat bar & Web Speech API voice input
│   └── assets/          # 3D plush avatars, office scenes, 3D wallet & badge assets
├── requirements.txt     # Python dependencies
├── run.py               # Fast launch script
└── README.md            # System documentation
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Server
```bash
python run.py
```
Or directly with Uvicorn:
```bash
uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Open the Dashboard
Navigate to **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser:
- Try toggling between **🌅 Morning**, **☀️ Noon**, **🌇 Evening**, and **🌙 Night** lighting moods.
- Switch between **☀️ Light** and **🌙 Dark** mode.
- Click **"▦ All 10"** to view all avatars simultaneously, or swipe through the carousel.
- Click on any agent (e.g. **Fin**, **Muse**, **Chat**) to expand their dedicated dashboard and inspect their domain metrics and CrewAI memory.
- Use the bottom input capsule or click the **🎤 Microphone** button to speak or send commands!
=======
# Orb – Virtual Office AI Agent Dashboard

Orb adalah handheld dashboard multi‑agent berbasis **FastAPI + CrewAI**, dengan gaya visual terinspirasi Dots/Muse.  
Tujuannya: menghadirkan pengalaman portable, playful, tapi tetap profesional.

## ✨ Fitur Utama
- 🎨 **Design Language**: avatar plush‑like warna‑warni dengan aksesoris unik.  
- 🏢 **Office Scene**: blur penuh dengan pencahayaan dinamis (pagi, siang, sore, malam).  
- 🍱 **Bento Widgets**: flat layout, solid background satu tone, ikon colorful.  
- 👥 **Multi‑Agent View**: homescreen menampilkan 3 agent default, swipe untuk cek hingga 10 agent.  
- 🧠 **Memory System**: CrewAI role memory + shared memory.  
- 🌗 **Dynamic Mode**: mendukung light/dark mode otomatis.  
>>>>>>> 9c2d40eaf258410392babcfd76fce2499277a04b
