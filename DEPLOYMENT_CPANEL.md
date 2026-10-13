# Panduan Deployment cPanel: Orb (FastAPI + Phusion Passenger)

Dokumentasi ini menjelaskan konfigurasi dan prosedur pembaruan (*deploy update*) untuk aplikasi **Orb** di lingkungan shared hosting cPanel/Dewaweb dengan CloudLinux **Setup Python App** dan **Phusion Passenger**.

---

## 1. Struktur Deployment Server

```text
/home/CPANEL_USER/krftworks/orb                 -> Git repository / Python App root
/home/CPANEL_USER/krftworks/orb/frontend        -> Document root subdomain orb.krftworks.my.id
```

- **Backend API & WSGI Entrypoint**: Berjalan dari direktori `/home/CPANEL_USER/krftworks/orb`.
- **Frontend Static (PWA & HTML/CSS/JS)**: Dilayani langsung oleh Apache dari document root `/home/CPANEL_USER/krftworks/orb/frontend`.
- **Subdomain URL**: `https://orb.krftworks.my.id` (frontend berada di URL root `/`).

> **Catatan Penting**:
> File `frontend/.htaccess` wajib ada karena document root subdomain adalah folder `frontend`. File ini menonaktifkan `mod_rewrite` (`RewriteEngine Off`) dan Phusion Passenger (`PassengerEnabled off`) pada folder static agar Apache melayani file CSS, JS, Web App Manifest, dan aset secara langsung dengan HTTP 200 tanpa MIME type mismatch (`text/html`) atau 404.

---

## 2. Konfigurasi cPanel "Setup Python App"

Pastikan konfigurasi aplikasi pada menu **Setup Python App** di cPanel telah diatur sebagai berikut:

| Parameter | Nilai Konfigurasi |
| :--- | :--- |
| **Python Version** | `3.11` |
| **Application root** | `krftworks/orb` |
| **Application URL** | `orb.krftworks.my.id` (atau path aplikasi backend) |
| **Application startup file** | `passenger_wsgi.py` |
| **Application Entry point** | `application` |

---

## 3. Prosedur Deploy / Pembaruan Kode (Update)

Jalankan perintah berikut melalui SSH atau terminal cPanel setiap kali melakukan pembaruan dari repository:

```bash
# 1. Masuk ke direktori repository aplikasi
cd ~/krftworks/orb

# 2. Cek status working tree untuk memastikan tidak ada perubahan lokal yang tidak disengaja
git status

# 3. Tarik perubahan terbaru secara fast-forward
git pull --ff-only origin main

# 4. Aktifkan virtual environment Python 3.11 cPanel
# (Sesuaikan CPANEL_USER dengan username cPanel Anda, misal: satulogi)
source /home/CPANEL_USER/virtualenv/krftworks/orb/3.11/bin/activate

# 5. Instal / perbarui dependensi Python
python -m pip install -r requirements.txt

# 6. Validasi konsistensi paket
python -m pip check
```

### Restart Aplikasi
Setelah pembaruan selesai di terminal:
1. Buka cPanel → **Setup Python App**.
2. Temukan aplikasi `krftworks/orb`.
3. Klik tombol **Restart** agar Phusion Passenger memuat ulang proses worker Python.

> ⚠️ **Peringatan Git di Server Produksi**:
> **Jangan gunakan `git reset --hard`** pada server production kecuali Anda memang bermaksud membuang seluruh perubahan file lokal secara sadar. Penggunaan `git reset --hard` berisiko menimpa atau menghapus file lokal atau data runtime (seperti database lokal jika belum dimigrasikan).

---

## 4. Checklist Verifikasi Setelah Deploy

Setelah melakukan deploy dan me-restart aplikasi, lakukan pengujian berikut:

1. **Uji Kompilasi Kode Python**:
   ```bash
   python -m compileall -q .
   ```
   *(Harus selesai tanpa error sintaksis).*

2. **Verifikasi WSGI Entrypoint**:
   ```bash
   python -c "import passenger_wsgi; print(type(passenger_wsgi.application).__name__)"
   ```
   *(Output yang diharapkan adalah `ASGIMiddleware`, menandakan FastAPI berhasil dibungkus WSGI).*

3. **Cek Respons Web & Aset Statis**:
   - Buka browser ke: `https://orb.krftworks.my.id/`
   - Buka DevTools (F12) → tab **Network**.
   - Periksa bahwa file `/css/styles.css`, `/css/avatars.css`, `/js/app.js`, `/manifest.json`, dan file aset lainnya mengembalikan status **HTTP 200** dengan `Content-Type: text/css` atau `application/javascript`, bukan `text/html` (halaman fallback/error).
   - Pastikan PWA dapat diinstall (muncul prompt *Add to Home screen*).
   - Pastikan pencahayaan office mengikuti jam nyata secara otomatis.
   - Pastikan seluruh 10 avatar dan widget bento dapat diklik menuju detail agent yang sesuai.

---

## 5. Batasan & Ruang Lingkup Deployment Git

Komponen-komponen berikut **berada di luar kendali Git repository** dan tidak dikelola melalui commit/pull:
- Konfigurasi DNS & CDN di Cloudflare.
- Sertifikat SSL / TLS (Let's Encrypt / AutoSSL cPanel).
- Path instalasi Virtualenv dan interpreter CloudLinux.
- File konfigurasi hosting atau vhost di luar folder `krftworks/orb`.
- File kredensial sensitif atau environment variables (`.env`).

---

## 6. Pengelolaan Runtime Database (`backend/orb.db`)

Saat ini file database SQLite `backend/orb.db` masih tercatat (*tracked*) dalam Git repository:
- **Risiko**: Jika `backend/orb.db` dimodifikasi oleh backend saat aplikasi berjalan di server produksi, perintah `git pull` di masa depan berpotensi mengalami konflik (*merge conflict*) atau menimpa data pengguna.
- **Rencana Migrasi Aman (Rekomendasi Terpisah)**:
  1. Buat backup database di server produksi:
     ```bash
     cp backend/orb.db backend/orb.db.backup
     ```
  2. Di lingkungan pengembangan, hentikan pelacakan file tanpa menghapus file fisiknya:
     ```bash
     git rm --cached backend/orb.db
     ```
  3. Tambahkan `backend/orb.db` ke `.gitignore`.
  4. Sediakan database inisialisasi kosong (atau biarkan fungsi `init_db()` di `backend/database.py` membuatnya secara otomatis saat startup pertama kali).
  5. Commit dan dorong perubahan tersebut ke branch utama setelah disetujui.
