# Interactive Cloud Scheduling Lab

Presentasi Bahasa Indonesia Kelompok 8 SOKA untuk membandingkan **Hybrid Max-Min + ACO** dan **Hybrid Min-Min + GA**. Lima materi tetap dipertahankan: literatur, walkthrough ACO, walkthrough GA, laboratorium interaktif, dan benchmark aktual CloudSim.

Judul akademik: **Algoritma Hybrid ACO + Max-Min dan GA + Min-Min**. Subjudul: **Analisis Perbandingan Penjadwalan Task pada Cloud Computing**. Dalam penjelasan teknis, nama hybrid tetap mengikuti urutan eksekusi Max-Min + ACO dan Min-Min + GA. Panduan praktis untuk presenter tersedia di `PRESENTATION_GUIDE.md`.

Lab menjalankan algoritma di browser, menghasilkan trace dari kalkulasi nyata, kemudian memutar ulang trace tersebut. Ini bukan CloudSim di browser. Hasil rekaman GoCJ pada materi 5 terpisah dari skenario lab.

## Menjalankan secara lokal

Dari Ubuntu WSL:

```bash
cd /home/rimubren/projects/Presentasi-Algoritma-Hybrid-Kelompok8-SOKA
ss -ltnp 'sport = :8080'
python3 -m http.server 8080 --bind 0.0.0.0
```

Buka [http://localhost:8080/](http://localhost:8080/), atau [langsung ke lab](http://localhost:8080/#4). Server yang sudah ada pada port 8080 melayani checkout ini dan dipakai ulang. Jangan menghentikan proses lain untuk mengambil port. Alamat IPv4 WSL saat verifikasi: `172.20.152.50`; alamat ini dapat berubah setelah WSL restart.

Tidak ada build, backend, package runtime, font remote, atau CDN. Python 3 hanya diperlukan untuk menyajikan berkas HTTP. Jangan membuka lewat `file://`: module dan Web Worker memerlukan origin HTTP. Browser modern dengan SVG, ES modules, Web Animations, dialog dan module Worker diperlukan.

## Alur demonstrasi

1. Materi 1 menunjukkan hubungan heuristic seeding dan pencarian metaheuristik. Kutipan awal tersedia dalam disclosure literatur.
2. Materi 2 dan 3 memiliki lima langkah yang dapat dipilih. Contoh dihitung menggunakan engine yang sama dengan lab, dengan enam task dan tiga VM.
3. Materi 4 langsung siap dengan 10 task, 4 VM, 2 host, seed 8. **Mode Presentasi Terpandu** menjadi default: Reset, Sebelumnya, Putar/Jeda, Berikutnya dan Kecepatan. Perpindahan mengikuti keputusan awal heuristik, siklus optimasi pertama dan checkpoint iterasi berikutnya. Pada default ada 30 langkah panduan; jumlah mengikuti trace skenario.
4. Pada seeding/optimasi, kanvas utama beralih ke graph feromon atau kromosom. **Lihat infrastruktur** mengembalikan rack host dan VM. Inspector tetap menyediakan angka aktual.
5. **Mode Lanjutan** membuka seluruh event, substep, pemilih iterasi/generasi, semut, kromosom, operasi anak, matriks dan scrubber. Pengaturan Detail/Ringkas tetap tersedia. Pergantian mode menjeda playback tanpa mengganti skenario, algoritma atau posisi event; tidak menjalankan ulang optimizer.
6. **Hasil akhir** menunjukkan jadwal global best. **Jalankan eksekusi** memutar clock simulasi terpisah selama sekitar 12 detik wall-clock pada tempo 1×; semua task berjalan paralel antar-VM. Scrubber waktu dapat digunakan untuk memeriksa keadaan tepat pada suatu waktu.
7. **Bandingkan** menampilkan seed, jadwal akhir, history dan metrik kedua algoritma dengan skala waktu Gantt yang sama.
8. Materi 5 menyediakan filter 100–300, 400–700, 800–1.000 task dan grafik makespan, DoI, utilisasi serta runtime yang berasal dari rekaman asli.

**Layar penuh** adalah kontrol terpisah yang kompatibel dengan kedua mode interaksi. Kontrol ini mengurangi chrome dan menjaga playback terlihat; akses konfigurasi tetap tersedia. Browser yang mengizinkan Fullscreen API juga masuk fullscreen; jika izin tidak tersedia, tata letak distraction-free tetap aktif. Gunakan **Keluar layar penuh** atau Escape. Pada laptop pendek, scroll vertikal singkat masih dapat diperlukan untuk berpindah antara diagram, timeline dan metrik. Pada mobile, gunakan pilihan **Materi**; diagram/tabel lebar memiliki scroll sendiri.

Satu disclosure **Bantuan** mengikuti istilah fase aktif. Penjelasan menerangkan proses, alasan dan hasil dengan nilai aktual serta membandingkan kandidat dengan global best sebelumnya. Grafik membedakan current-best dan global-best; kedua kurva GA ini berimpit karena elitisme. Walkthrough materi 2/3 mempunyai tombol Sebelumnya/Berikutnya, interpretasi diagram dan rumus/parameter dalam disclosure.

## Konfigurasi

**Konfigurasi skenario** membuka editor bersama untuk kedua algoritma. Membukanya menghentikan playback dan eksekusi.

Jumlah host, VM, task dan jenis workload langsung terlihat bersama preset. Seed, kapasitas/jenis infrastruktur, rincian MI/MIPS/placement, ETC custom dan parameter optimizer ditempatkan dalam disclosure lanjutan. Semua kemampuan konfigurasi tetap tersedia pada kedua mode interaksi.

- Host: 1–8; VM: 1–24; task: 1–100.
- Generator mendukung infrastruktur homogen 1.500 MIPS atau tier heterogen 500, 1.000, 1.500 dan 2.500 MIPS.
- Workload seragam, bervariasi, ringan, campuran, atau satu task sangat berat. Enam preset menghasilkan data berbeda.
- Seed adalah integer unsigned 32-bit. Generator dan optimizer memakai Mulberry32; skenario, parameter dan seed yang sama menghasilkan mapping serta trace yang sama. Waktu komputasi tidak deterministik.
- Setelah mengubah pengaturan generator, klik **Bangkitkan data dari pengaturan**. Ini mengganti rincian draft. Kemudian edit kapasitas host, MIPS tiap VM, host tujuan VM, dan MI tiap task bila diperlukan.
- VM tidak boleh mereservasi total MIPS melebihi kapasitas host. Placement harus menunjuk host yang ada. Tidak ada overcommit dalam model lab.
- Host mengontrol placement/validasi/visualisasi. Memindahkan VM ke host lain atau menambah host tanpa mengubah MIPS/ETC tidak mengubah makespan.
- Model normal menghitung `ET[i][j] = MI[i] / MIPS[j]` dalam detik.
- Mode **ETC custom** menerima satu baris per task dan satu kolom per VM, dipisahkan koma. Nilai harus positif dan berdimensi tepat. Dalam mode ini ETC independen dari MI/MIPS; label model selalu terlihat.
- Parameter advanced: semut, iterasi, alpha, beta, evaporasi, Q; populasi, generasi, tournament, peluang crossover dan mutasi. Semua parameter memengaruhi kalkulasi.

Generator bukan dataset GoCJ. Workload lab tidak boleh diklaim sebagai pengulangan benchmark GoCJ.

## Algoritma dan kesetiaan pada Java

Referensi: [Hybrid.java](https://github.com/RizzqiAkbar/Algoritma-Hybrid-Kelompok-8/blob/main/Hybrid.java), commit `2c0dd4b97489b4bc147e28d01bfa0acd9c37c80b` saat inspeksi. Salinan read-only disimpan di `work/java-reference/` dan diabaikan Git.

### Heuristik

Untuk setiap task yang belum terjadwal, hitung `CT = ET + readyTime`. Max-Min memilih task dengan minimum CT terbesar; Min-Min memilih minimum terkecil. Scan berdasarkan ID task lalu ID VM. Perbandingan strict mempertahankan pemenang pertama ketika seri, sama seperti Java.

Trace menyimpan lima substep per keputusan: evaluasi CT, minimum per task, pemilihan task/VM, routing, alokasi dan ready time baru. Matriks, graph dan timeline disinkronkan terhadap snapshot ini.

### ACO

Default terverifikasi: 25 semut, 50 iterasi, alpha 1, beta 2, rho 0,2, Q 100. Pasangan hasil Max-Min memulai tau 3; pasangan lain tau 1. Heuristik visibilitas `eta = 1/(ET + 1e-6)`.

Setiap semut menyusun mapping menggunakan roulette-wheel dengan probabilitas ternormalisasi `tau^alpha * eta^beta`. Probabilitas tidak memakai ready time; ini mengikuti Java. Semua kandidat dievaluasi berdasarkan makespan. Global best hanya diperbarui bila lebih kecil, tanpa tie-break DoI. Evaporasi berlaku ke seluruh matriks, dengan floor 0,01. Deposit `Q / globalBestMakespan` hanya pada pasangan global best.

Semua semut dihitung dan dapat diinspeksi. Trace konstruksi menampilkan hingga tiga titik representatif dari semut 1 per iterasi. Graph menampilkan hingga 12 task awal ditambah task yang dipilih, dan hingga 7 VM awal ditambah VM tujuan terpilih. Jumlah representatif diberi label; tidak mengurangi populasi yang dihitung. Probabilitas yang ditampilkan adalah probabilitas saat kandidat dibangun, sedangkan tau mengikuti substep evaporasi/reinforcement saat ini.

### GA

Default terverifikasi: populasi 30, generasi 50, tournament size 3, crossover 0,8 dan mutasi 0,05. Kromosom 0 berasal dari Min-Min; yang lain acak. Posisi gen adalah task, nilainya VM. Fitness `1/makespan` ditampilkan, sedangkan seleksi memakai makespan minimum yang ekuivalen.

Tournament menarik peserta dengan replacement. Single-point crossover memilih titik 0 sampai N−1, termasuk titik 0 seperti Java. Setiap gen dapat dipilih ulang secara acak pada mutasi; hasil baru boleh sama. Satu elit global disalin ke slot 0 sebelum anak baru dibuat. Global best diperbarui hanya pada penurunan makespan dan tetap dipertahankan pada seri.

Seluruh populasi/operasi anak dihitung. Diagram menampilkan sampel lima kromosom atau satu operasi anak yang dapat dipilih. Semua kromosom pada generasi optimasi tersedia melalui inspector. Inspeksi kandidat mengubah proyeksi timeline dan metrik, tanpa mengubah hasil pencarian.

## Model eksekusi dan metrik

- Semua task tersedia pada waktu nol. Setiap VM memiliki satu processing element; satu task aktif per VM, tanpa preemption. VM yang berbeda berjalan paralel.
- Konstruksi heuristik memakai urutan alokasi untuk menjelaskan ready time. Jadwal optimizer/final mengikuti ID task, sesuai urutan submit broker Java. Urutan pada VM tidak mengubah total load/makespan model ini.
- Tidak ada jaringan, transfer file, startup CloudSim, contention fisik, kegagalan, deadline atau dynamic arrivals. Reservasi MIPS dianggap tersedia penuh.
- CloudSim asli membangun host satu PE 100.000 MIPS, memakai VM scheduler time-shared dan cloudlet scheduler space-shared. Lab memakai validasi jumlah reservasi MIPS yang lebih sederhana; tidak mereproduksi mekanisme alokasi host/RAM/BW CloudSim.
- Makespan = maksimum total execution time tiap VM. Ini proyeksi jadwal; clock eksekusi terpisah dan tidak sama dengan runtime browser.
- DoI = `(max(load) − min(load)) / (average(load) + 1e-9)`; VM idle tetap dihitung.
- Utilisasi = `sum(load) / (makespan * jumlahVM + 1e-9) * 100%`.
- Rata-rata beban = total execution time / jumlah VM. “Selesai” hanya bertambah setelah clock eksekusi melewati finish time task.
- Waktu komputasi lab mengukur engine plus pembuatan trace, di dalam Worker; tidak termasuk rendering dan transfer trace kembali ke UI. Tidak dapat dibandingkan langsung dengan timer algoritma Java.
- Kedua optimizer mempertahankan seed sebagai global best. Hasil akhir tidak lebih buruk dari seed dalam makespan, tetapi mungkin tidak berubah. Pencarian tidak menjamin optimum global. Makespan yang lebih baik dapat memiliki DoI lebih buruk.

Java produksi memakai `java.util.Random` dan seed dinamis (`SecureRandom.nextLong() ^ System.nanoTime()`). Lab memakai Mulberry32 dan seed tetap. Nilai seed yang sama di Java normal dan browser tidak menghasilkan urutan random yang sama. Parity test menggunakan adapter draw yang sama agar logika algoritma dapat dibandingkan secara tepat.

## Benchmark dan literatur

Seluruh 10 baris benchmark pada `ui/benchmark.js` dipertahankan dari `Results/ringkasan_simulasi.txt`: makespan, DoI, utilisasi, cost dan runtime untuk GA/ACO. Kolom delta dihitung dari makespan yang sudah dibulatkan pada rekaman. Tidak ada nilai lab yang ditulis ke tabel ini. ACO menang makespan pada 10 rekaman tersebut; itu tidak menetapkan pemenang skenario browser atau eksperimen baru.

Literatur, DOI, penulis dan kutipan awal dipertahankan. Transkripsi tidak diverifikasi terhadap PDF penerbit dan labelnya menjelaskan keterbatasan bibliografis tersebut. Tidak ada referensi ilmiah baru yang dibuat.

## Struktur berkas

```text
index.html                  Lima materi, editor, kontrol dan semantik
simulation.css              Sistem visual solid-color, responsif, reduced motion
presentation.js             Navigasi, keyboard, mode presentasi
simulation.js               Orkestrasi lab, worker, inspeksi dan clock eksekusi
engine/scenario.js          Generator, validasi, ETC, parameter default
engine/random.js            PRNG seeded
engine/heuristic.js         Max-Min / Min-Min dan trace keputusan
engine/aco.js               Kandidat, probabilitas, feromon dan trace ACO
engine/ga.js                Tournament, crossover, mutasi, elitisme dan trace GA
engine/metrics.js           Slot timeline dan metrik
engine/run.js               Pipeline run dan batas fase
engine/worker.js            Komputasi kedua algoritma di luar main thread
ui/playback.js              Timer tunggal, seek, stepping dan tempo
ui/guided.js                Pemilihan langkah instruksional dari trace yang sama
ui/learning.js              Definisi kontekstual dan penjelasan berbasis nilai aktual
ui/configuration.js         Draft konfigurasi dan editor
ui/renderers.js             SVG topologi, Gantt, matriks, graph, kromosom
ui/walkthrough.js           Walkthrough materi 2/3 berbasis engine
ui/benchmark.js             Data benchmark asli dan visualisasinya
tests/engine.test.js         Automated tests kalkulasi dan playback
tests/guided.test.js         Navigasi terpandu, mode, fase dan perbandingan kandidat
tests/benchmark.test.js      Integritas seluruh angka terhadap ringkasan Java
tests/JavaParity.java        Reflection harness terhadap Hybrid.java asli
tests/java-parity.js         Perbandingan keluaran Java / browser engine
tests/contrast.py            Verifikasi palette lewat checker AntiSlop terpasang
DESIGN.md                   Arah visual dan alasan desain
IMPLEMENTATION_REPORT.md     Bukti implementasi, pengujian dan quality gate
PRESENTATION_GUIDE.md        Narasi lima materi, urutan klik, istilah dan tanya jawab
work/                       Backup sebelum redesign, referensi dan hasil uji; ignored
```

## Keyboard dan aksesibilitas

| Tombol | Aksi |
| --- | --- |
| Panah kiri / kanan | Materi sebelumnya / berikutnya |
| Spasi saat fokus di area lab | Putar / jeda konstruksi jadwal |
| `[` / `]` | Fase sebelumnya / berikutnya |
| `F` | Layar penuh / distraction-free |
| Escape | Tutup dialog / keluar layar penuh |
| Tab, Enter, Spasi | Kontrol native, disclosure dan task pada Gantt |
| Panah, Home, End pada slider | Scrub event atau clock eksekusi |

Shortcut tidak menangkap input, select, textarea atau contenteditable. Tombol/link/summary mempertahankan perilaku keyboard native. **Kurangi gerak** pada footer menonaktifkan choreography; pengaturan sistem `prefers-reduced-motion` selalu dihormati. Clock dan perubahan state tetap berjalan agar simulasi dapat digunakan tanpa animasi perpindahan. Focus ring, label, tabel, alt SVG dan dialog native disediakan.

## Pengujian

Tidak ada instalasi dependencies. Dengan Node.js 20 atau lebih baru:

```bash
node --test tests/*.test.js
```

Pada mesin pengembangan ini Node belum ada di PATH Ubuntu; tes dijalankan dengan Node Windows 26.13.0 terhadap berkas checkout WSL. Ini tidak diperlukan untuk menjalankan presentasi.

Parity opsional terhadap referensi Java (JDK diperlukan; tidak menjalankan CloudSim atau menulis Results):

```bash
mkdir -p work
git clone --depth 1 https://github.com/RizzqiAkbar/Algoritma-Hybrid-Kelompok-8.git work/java-reference
mkdir -p work/java-classes
javac -cp work/java-reference/lib/cloudsim-3.0.3.jar -d work/java-classes work/java-reference/Hybrid.java tests/JavaParity.java
java -cp work/java-classes:work/java-reference/lib/cloudsim-3.0.3.jar JavaParity > work/java-parity.json
node tests/java-parity.js
```

Parity menjalankan 32 perbandingan pada matriks kecil, seri, dan single-VM memakai adapter Mulberry32 untuk `nextDouble` dan `nextInt`. Ini memverifikasi logika penjadwalan, bukan kesetaraan runtime atau lifecycle CloudSim.

Lihat `IMPLEMENTATION_REPORT.md` untuk hasil nyata, daftar click-through dan batas verifikasi browser. Refinement diperiksa pada 1920×1080, 1366×768, 1280×720 dan cek mobile 390×844; pemeriksaan 820×1180 tercatat pada implementasi awal. Tidak ada klaim Lighthouse, Web Vitals atau audit WCAG menyeluruh.

## Deployment statis

Kompatibel dengan Vercel sebagai static site. Pilih framework **Other**, tanpa build command, root/output direktori checkout. Sertakan `index.html`, `simulation.css`, `simulation.js`, `presentation.js`, `engine/` dan `ui/`. Tidak memerlukan environment variable atau backend. Jangan sertakan `work/` pada upload manual.

Tidak ada commit, push, perubahan akun/permission atau deployment produksi yang dilakukan dalam redesign ini. Perintah Git manual yang telah disesuaikan dengan working tree tersedia di laporan implementasi. Review diff sebelum menjalankannya.
