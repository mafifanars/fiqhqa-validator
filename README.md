# QAFiqih Validator

QAFiqih Validator adalah aplikasi web komprehensif yang dirancang untuk anotasi dan validasi dataset QAFiqih, yang berfokus pada yurisprudensi Islam (Fiqh). Aplikasi ini menyediakan platform kolaboratif bagi administrator dan anotator untuk mengelola data, menugaskan tugas, melacak kemajuan, dan memastikan kualitas anotasi.

## Fitur Utama

*   **Peran Pengguna Ganda:** Antarmuka dan fungsionalitas terpisah untuk Admin dan Anotator.
*   **Dasbor Admin:** Pusat kendali untuk memantau kemajuan proyek secara keseluruhan, kinerja anotator, dan statistik data.
*   **Manajemen Data:** Mengunggah, melihat, memfilter, dan mengelola dataset anotasi.
*   **Penugasan Tugas:** Sistem yang fleksibel untuk menugaskan tugas anotasi kepada anotator berdasarkan rentang atau daftar ID.
*   **Antarmuka Anotasi:** Tampilan berdampingan yang efisien untuk membaca artikel dan mengisi formulir anotasi yang terperinci.
*   **Uji Coba (Pilot Test):** Fungsionalitas untuk menjalankan dan mengelola uji coba terpisah dengan dataset dan pelacakan kemajuan khusus.
*   **Analisis Kesepakatan:** Alat untuk mengukur dan menganalisis kesepakatan antar-anotator pada item data yang tumpang tindih (overlap).

## Dibangun Dengan

Proyek ini dibangun dengan tumpukan teknologi modern yang aman secara tipe (type-safe):

*   [Next.js](https://nextjs.org/) - Kerangka Kerja React
*   [TypeScript](https://www.typescriptlang.org/) - Bahasa Pemrograman
*   [Tailwind CSS](https://tailwindcss.com/) - Kerangka Kerja CSS
*   [ShadCN UI](https://ui.shadcn.com/) - Pustaka Komponen
*   [Firebase](https://firebase.google.com/) - Backend (khususnya Firestore untuk database)
*   [Genkit](https://firebase.google.com/docs/genkit) - Perangkat AI Generatif

## Memulai

Untuk menjalankan salinan lokal proyek ini, ikuti langkah-langkah sederhana berikut.

### Prasyarat

Pastikan Anda telah menginstal Node.js dan npm di mesin Anda.
*   npm
    ```sh
    npm install npm@latest -g
    ```

### Instalasi & Menjalankan

1.  **Clone repositori** (jika berlaku) atau pastikan Anda berada di direktori root proyek.

2.  **Instal paket NPM:**
    ```sh
    npm install
    ```

3.  **Siapkan variabel lingkungan:**
    Buat file `.env` di direktori root. Proyek ini menggunakan Firebase, jadi Anda perlu mengisinya dengan konfigurasi proyek Firebase Anda jika belum dikonfigurasi.

4.  **Jalankan server pengembangan:**
    Aplikasi berjalan di port 9002.
    ```sh
    npm run dev
    ```

5.  **Jalankan server pengembangan Genkit (di terminal terpisah):**
    Ini diperlukan untuk fitur yang terkait dengan AI.
    ```sh
    npm run genkit:dev
    ```

Buka [http://localhost:9002](http://localhost:9002) dengan browser Anda untuk melihat hasilnya.
