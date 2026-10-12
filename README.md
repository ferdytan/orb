Orb – Virtual Office AI Agent Dashboard
Orb adalah handheld dashboard untuk sistem multi‑agent berbasis FastAPI + CrewAI, dengan gaya visual terinspirasi dari Dots/Muse.
Tujuannya: menghadirkan pengalaman portable, playful, tapi tetap profesional untuk mengelola agent AI dengan memori, goal, dan kolaborasi.

✨ Fitur Utama
🎨 Design Language: avatar plush‑like, warna‑warni, dengan aksesori unik (glasses, headphones, hats).

🏢 Office Scene Background: blur penuh dengan pencahayaan dinamis (pagi, siang, sore, malam).

🧩 Bento Widgets: flat layout, solid background satu tone, ikon colorful (Goal, Wallet, Talent, Collections).

👥 Multi‑Agent View: homescreen menampilkan 3 agent default, bisa swipe untuk cek hingga 10 agent (avatar mengecil bila tampil semua).

🔄 Agent Interaction: klik avatar → masuk ke dashboard agent dengan input & data layout berbeda sesuai domain.

🧠 Memory System: CrewAI role memory + shared memory, agar agent ingat preferensi, goal, dan progress user.

🌗 Dynamic Mode: mendukung light/dark mode, otomatis menyesuaikan dengan sistem + waktu.

🛠️ Teknologi
Backend: FastAPI (API, database, UI communication).

Orchestration: CrewAI (multi‑agent workflows, memory).

Frontend: handheld‑first, bento‑style UI.

🚀 Instalasi
bash
# clone repo
git clone https://github.com/username/orb.git
cd orb

# install dependencies
pip install -r requirements.txt

# run server
uvicorn main:app --reload
📱 Penggunaan
Jalankan backend FastAPI.

Dashboard Orb akan tersedia di perangkat handheld/browser.

Tambahkan agent baru via konfigurasi CrewAI.

Homescreen menampilkan 3 agent default, swipe untuk melihat lebih banyak.

Klik avatar untuk masuk ke dashboard agent dengan data unik.

📸 Preview
(Screenshots atau mockup UI di sini)

🗺️ Roadmap
[ ] Integrasi penuh CrewAI memory (per‑agent + shared).

[ ] Animasi swipe untuk multi‑agent view.

[ ] Dark mode + dynamic office scene lighting.

[ ] Customizable widget layout.

[ ] Support hingga 10 agent dengan avatar kecil.

🤝 Kontribusi
Pull request dan issue sangat diterima. Silakan fork repo ini dan ajukan perubahan.

📄 Lisensi
MIT License.
