# Interactive Cloud Scheduling Lab

## Refinement akademik: literatur dan dua tahap benchmark

Materi Literatur kini memakai format referensi: metadata jurnal, judul lengkap, penulis, cuplikan kutipan dengan halaman dan penjelasan relevansinya. Kutipan diperiksa pada PDF; bibliografi tetap IJAMTES 2018, hlm. 32–42 dan MCGA oleh Shu/Wang, 2009, hlm. 62–63. Penjelasan seeding kelompok dipisahkan dari teks jurnal pada disclosure relevansi.

Baseline tersinkron dengan `main` pada commit `694229d2abbeb78a39c5b848a8f0a41ccc69efd2`, termasuk perubahan rekan pada `dunia3d.html` dan `ui/cloud-ops.js`. Semua file 3D, integrasi, engine dan walkthrough dipertahankan. Bagian fitur di bawah menyimpan dokumentasi integrasi sebelumnya; launcher terbaru membuka `dunia3d.html` milik rekan dan tidak diubah dalam refinement akademik.

Buka <http://localhost:8080/> atau langsung materi 5 di <http://localhost:8080/#5>. Lima materi tetap sama. Materi 5 mempunyai dua tab:

1. **Antar-hybrid:** rekaman asli CloudSim 3.0.3 untuk Max-Min + ACO vs Min-Min + GA. Semua 10 dataset historis menunjukkan makespan Max-Min + ACO lebih rendah, sehingga dipilih untuk penjelasan utama. GA lebih cepat menghitung jadwal pada rekaman itu. Tidak ada klaim unggul universal.
2. **Hybrid vs Metaheuristik:** hasil eksperimen baru yang memakai algoritma Java asli dari kedua repositori pada konfigurasi bersama, dibandingkan dengan ACO dan GWO tugas sebelumnya. Rekaman ACO/GWO lama tersedia melalui disclosure terpisah dan tidak dicampur ke ranking terkontrol.

Sumber terverifikasi:

| Sumber | Commit | Berkas utama |
|---|---|---|
| [Hybrid](https://github.com/RizzqiAkbar/Algoritma-Hybrid-Kelompok-8) | `2c0dd4b97489b4bc147e28d01bfa0acd9c37c80b` | `Hybrid.java`, `Datasets/`, `Results/hasil_simulasi_hybrid.csv`, `Results/ringkasan_simulasi.txt` |
| [Metaheuristik sebelumnya](https://github.com/farelrafli/soka-cloudsim-metaheuristik) | `ded59903791064cc8f7084fbc3b74ac31aa363b3` | `Main.java`, `MetaScheduler.java`, `Tuning.java`, `output/hasil_metrik_perbandingan.csv`, `output/parameter_terpilih.txt` |

Semua **10 pasangan workload identik dalam panjang dan urutan task** setelah parsing JSON `length_mi` dan TXT. Hash file berbeda karena format; hash workload terurut cocok. Ini tidak membuktikan identitas dengan arsip minggu 3 di luar kedua repo tersebut, yang tidak disertakan. Sumber dan hash ada pada `data/benchmarks/historical.json`.

Konfigurasi historis berbeda: hybrid memakai 10 VM satu PE, MIPS dari tier 500–2.500 yang dibangkitkan dengan seed dinamis tidak tercatat; ACO/GWO memakai CloudSim Plus 8.0.0, 3 datacenter, 15 host, 30 VM, total **93 PE dan 51.951 MIPS** (seed VM 99). Imbalance lama adalah SD waktu selesai VM dalam detik, bukan DoI. Utilisasi dan biaya juga memakai rumus berbeda. CSV meta akhir memakai parameter hasil tuning: ACO 20×100, GWO 50×25, seed algoritma 42; hasil parameter awal dan hasil tuning tidak diperlakukan sebagai hasil akhir.

**Eksperimen terkontrol baru:** CloudSim 3.0.3, 1 datacenter, 10 host, 10 VM satu PE; MIPS `[500,1000,1500,2000,2500]` diulang dua kali (total 15.000). Semua task satu PE, urutan dataset sama, batch tanpa submission delay, SpaceShared pada VM, TimeShared pada host tanpa oversubscription. Metode private hybrid dipanggil lewat reflection dari `Hybrid.java` asli; standalone memakai `MetaScheduler.java` asli. Keduanya dikompilasi tanpa edit ke direktori eksperimen ignored. Memilih satu PE memungkinkan evaluator asli kedua repo mempunyai semantik yang sama tanpa mengubah pencarian atau browser engine.

- Cohort parameter asli: **400 run**, 10 dataset × seed 1–10 × 4 metode, termasuk Min-Min + GA sebagai tambahan. Hybrid ACO: 1.250 kandidat + 1 seed; ACO murni: 2.000 evaluasi; GWO: 1.300 evaluasi; GA: 10.151 fitness calls termasuk tournament yang berulang.
- Cohort anggaran pencarian setara: **300 run**, 10 dataset × seed 1–10 × 3 metode. Hybrid 25×50, ACO 25×50, GWO 50×(24+1): masing-masing 1.250 kandidat stokastik. Hybrid tetap mempunyai satu evaluasi seed tambahan dan biaya konstruksi Max-Min. Ini bukan ablation seeding murni atau persamaan runtime.
- Raw CSV, mapping semua run, mean, SD sampel (`ddof=1`), terbaik, terburuk dan jumlah run berhasil tersedia di `data/benchmarks/`. Tidak ada run yang dihapus atau dataset yang diinterpolasi. Whisker menunjukkan mean ± SD, bukan confidence interval.
- Makespan terkontrol = finish terakhir − start pertama; offset startup dikeluarkan, sementara kedua timestamp asli dan prediksi model ikut dicatat. Gap model/CloudSim maksimum sekitar 0,011804% (parameter asli) dan 0,011550% (anggaran setara), akibat model diskret simulator/rounding. DoI memakai beban CPU aktual semua VM; utilisasi = total CPU/(span×10)×100%; biaya model = total CPU seconds×USD3/s. Runtime memakai `System.nanoTime`, mencakup persiapan input umum dan pencarian, tidak termasuk CloudSim.
- Lingkungan: Intel Core i5-10310U, Ubuntu WSL2, OpenJDK 21.0.13.1, `-Xms256m -Xmx1536m`, run sekuensial dengan urutan metode dirotasi menurut seed, satu warm-up seed 42 per metode/cohort yang tidak dilaporkan sebagai run hasil. Runtime bukan benchmark mesin lain atau JVM yang sudah stabil sempurna.

**Temuan pada konfigurasi ini:** rata-rata makespan hybrid lebih rendah dari ACO dan GWO pada 10/10 dataset di kedua cohort. Penurunan relatif terhadap ACO 1,04–1,84% pada parameter asli dan 2,00–2,94% pada anggaran pencarian setara; terhadap GWO 22,19–51,67% dan 22,55–50,57%. GWO mempunyai runtime scheduler lebih rendah pada 10/10 dataset di kedua cohort. ACO murni mempunyai biaya model lebih rendah dari hybrid pada 10/10 dataset. Karena dua implementasi ACO juga berbeda dalam visibility, deposit dan batas feromon, hasil ini tidak mengisolasi efek Max-Min saja dan tidak membuktikan superioritas umum.

### Rujukan ilmiah yang sudah dibaca dari PDF

- Nahla Ahmed Faraj & Ramesh Babu Inampudi (2018), *Task Scheduling based on Advance Ant Colony Optimization and Particle Swarm Optimization with Machine learning in the cloud environment*, **International Journal of Management, Technology And Engineering**, 8(XII), 32–42. [PDF penerbit](https://ijamtes.org/gallery/4-dec.pdf). Paper mengusulkan MLCCAP (AACO + PSO + Classifier Chains). Hlm. 34 membahas Max-Min + **PSO** pada related work; konsep ACO ada di hlm. 36–37. Paper ini sendiri bukan bukti proposal langsung Max-Min + ACO.
- Wanneng Shu & Jiangqing Wang (2009), *Min-Min Chromosome Genetic Algorithm for Load Balancing in Grid Computing*, **International Journal of Distributed Sensor Networks**, 5, 62–63. [DOI](https://doi.org/10.1080/15501320802554976). MCGA memberi dasar langsung konsep Min-Min + GA untuk grid. Dua halaman ini tidak menentukan populasi, tournament, Pc/Pm atau fitness persis seperti kode kelompok.

Kelompok mengadaptasi seeding heuristik ke CloudSim cloud, bukan mereproduksi semua sistem dalam paper. Judul generik dan tahun yang sebelumnya keliru sudah dikoreksi; kutipan PSO yang diubah menjadi `[metaheuristic]` dihapus. Rujukan tambahan Banupriya & Xavier Christopher tentang MMH+EACO tersedia pada disclosure materi 1: [artikel penerbit](https://www.ijisae.org/index.php/IJISAE/article/view/3413), IJISAE 12(1s), 258–270 (edisi 2024, daring 2023). Kerangkanya memakai load balancing, resource allocation dan WSVM migration; bukan kode seeding yang sama. PDF juga mempunyai ketidakkonsistenan penyebutan metode pada awal §3; tidak dipakai untuk mengklaim parameter atau hasil kelompok. Status peer review mengikuti kebijakan penerbit, bukan jaminan kualitas metodologi. Konfirmasi penerimaan adaptasi terhadap syarat dosen yang mengharuskan hybrid persis dari jurnal tetap diperlukan; keunikan pilihan antar-kelas belum dapat diverifikasi tanpa daftar kelas.

### Reproduksi benchmark

Jalankan di Ubuntu WSL dari root repo (JDK 17+, Maven, Python 3; tanpa dependency Python tambahan untuk benchmark):

```bash
bash experiments/prepare.sh
bash experiments/run.sh
bash experiments/run.sh data/benchmarks/equal-search 1000 equal-search
python3 experiments/aggregate.py
```

`prepare.sh` membuat reference checkout terpisah pada commit terkunci dan menolak checkout yang berubah/kotor. Tidak menjalankan `Main` asli yang dapat menimpa historical output. `run.sh` mengompilasi sumber asli ke `work/academic/classes`, bukan mengedit repo referensi. Menjalankan ulang benchmark menghasilkan **run baru**, terutama nilai runtime yang dapat berubah; simpan hasil lama bila perlu membandingkan reproduksi.

`ui/academic.js` dan `ui/academic-data.js` hanya membaca JSON lokal; tidak ada request GitHub saat presentasi. `academic.css` terbatas pada materi 1/5. Data rusak/hilang menampilkan sebab dan tombol retry; benchmark hybrid asli tetap tersedia. Tes tambahan memeriksa import, hash/urutan workload, satuan, missing values, pemisahan eksperimen, agregasi 700 run, mapping/evaluator, filter, persentase, pemilihan hybrid dan hash preservasi. Total **33 tes** lulus dan **32 parity Java** tetap lulus. Dokumen metodologi, laporan perbandingan, implementation report dan presenter guide tetap lokal sesuai kebijakan pengguna: hanya README.md yang dipublikasikan sebagai Markdown.

## Cloud Ops 3D

**Catatan versi terbaru (baseline `694229d`):** launcher saat ini membuka `dunia3d.html`, sesuai pembaruan rekan. Seluruh berkas 3D dan integrasinya dipertahankan identik. Uraian `/cloud-ops/` di bawah mendokumentasikan integrasi sebelumnya yang masih tersimpan di repo, bukan jaminan perilaku entry point terbaru. `dunia3d.html` memakai Three.js dari jsDelivr; dukungan 3D sepenuhnya offline tidak diklaim. Benchmark akademik sendiri hanya membaca data lokal.

Smoke test terbaru: scene terbuka dan tombol **Kembali ke presentasi** milik dialog induk mengembalikan mode/event laboratorium yang sama. Tombol kembali di dalam game belum menutup iframe pada pengujian ini; gunakan kontrol induk tersebut. Peringatan deprecation build Three.js juga berasal dari versi yang sudah ada. Keduanya dicatat sebagai temuan 3D sebelumnya, tanpa perbaikan dalam refinement akademik ini.

Pada materi 4, klik **Simulasi 3D**. Pengalaman **Cloud Ops 3D — Jadilah Scheduler** terbuka pada halaman same-origin di dalam dialog layar penuh, tanpa menambah materi keenam. **Kembali ke presentasi** atau Escape mengembalikan pengguna ke state laboratorium yang sama. Playback dan eksekusi 2D dijeda saat masuk; skenario, parameter, algoritma, mode, event, hasil dan kandidat inspeksi tetap tersimpan di halaman induk, tanpa dihitung ulang.

- Presentasi: <http://localhost:8080/#4>
- Halaman 3D langsung: <http://localhost:8080/cloud-ops/>
- Uji fallback yang disengaja: <http://localhost:8080/cloud-ops/?webgl=off>

**Main sendiri:** gerakkan robot dengan WASD/tombol arah, dekati task dan tekan E/Spasi untuk mengambil. Bawa ke VM dan tekan E/Spasi untuk menaruh. Task yang sudah ditempatkan dapat diambil ulang. Klik kotak/jalur untuk mendekat otomatis; alternatif keyboard tersedia pada Rincian → Dekati task atau VM. Durasi pada setiap VM ditampilkan sebelum memilih, beban dan makespan diperbarui saat menaruh. Klik **Jalankan** bila lengkap; tombol yang sama menjeda/melanjutkan eksekusi. R = reset, M = audio, Escape = kembali (menutup dialog hasil terlebih dahulu bila terbuka).

**Tonton Max-Min + ACO / Tonton Min-Min + GA:** Putar/Jeda, Berikutnya, dan Lewati ke hasil mengendalikan langkah representatif dari trace asli. Semua semut, kromosom dan iterasi/generasi dihitung; tampilan merangkum iterasi 1, 2, 5, 10, 25 dan terakhir. Iterasi pertama menampilkan lifecycle lengkap; GA juga menampilkan anak dengan mutasi yang benar-benar mengubah gen bila ada. Pemilih operasi anak ada pada Rincian. Parent, titik crossover, gen anak dan mutasi berasal dari event, termasuk crossover tidak terpicu dan mutasi tanpa perubahan. Ant berjalan satu kali sepanjang mapping kandidat 1, bukan lintasan acak sebagai bukti algoritma. Feromon seed/evaporasi/reinforcement mengikuti global best dan τ aktual.

Latihan default memakai ETC custom `[[2,4],[6,3],[8,5]]`, 3 task dan 2 VM. Seed dan parameter aktif dari laboratorium dipakai bila dibuka dari sana; halaman langsung memakai seed 8 dan defaults engine. Pada seed 8, Max-Min dan ACO tetap `[0,0,1]` dan Min-Min dan GA tetap `[0,1,1]`, masing-masing makespan 8 s. Mapping `[1,1,0]` memiliki DoI lebih rendah tetapi makespan sama, sehingga tidak menggantikan global best. Indeks array dimulai dari 0; HUD memakai VM1, VM2, dst.

**Gunakan skenario dari laboratorium** mengimpor seluruh host, VM, task, MI, MIPS, placement, ETC, seed dan parameter. Batas 3D adalah **12 task dan 6 VM**; jumlah host tetap mengikuti validasi engine (maksimum 8). Skenario lebih besar ditolak seluruhnya dengan penjelasan dan latihan tetap tersedia. Tidak ada pemotongan data. Pada 6 VM dan layar 720p, overview lebih padat: gunakan kamera Ikuti robot atau rincian ETC untuk inspeksi. Kontrol gerak sentuh tidak disediakan; gameplay diprioritaskan untuk keyboard/mouse desktop. Tata letak narrow tetap reflow dan menyediakan navigasi kembali.

Sesudah eksekusi, tabel membandingkan jadwal pemain, Max-Min, Min-Min dan kedua hybrid menggunakan `engine/metrics.js`. Mesin tetap mengoptimalkan makespan saja, dengan update global best yang ketat; DoI/utilisasi hanya evaluasi. Enumerasi menyeluruh dilakukan hanya bila jumlah mapping ≤ 4096; latihan memiliki 8 mapping dan optimum makespan terbukti 8 s. Untuk ruang lebih besar, UI memakai istilah solusi terbaik yang ditemukan. Bintang membandingkan makespan terhadap optimum terbukti bila tersedia, atau pembanding terbaik: 3 untuk sama/lebih baik, 2 untuk ≤ 1,25×, 1 untuk ≤ 1,5×, selebihnya 0. Robot berjalan tidak memengaruhi waktu komputasi simulasi.

`ui/cloud-ops.js` hanya membuka/menutup iframe dan mengambil snapshot konfigurasi; `cloud-ops/adapter.js` menerjemahkan trace serta menyimpan urutan penempatan manual. Perhitungan ACO/GA tetap dilakukan oleh `engine/worker.js` dan `engine/run.js`, tanpa algoritma kedua. `world.js`, `game.js`, `lessons.js`, `audio.js`, dan `lifecycle.js` mengurus scene, kontrol, penjelasan dan pembatalan. Keluar menghentikan worker, RAF, pending wait/movement, input, timer audio, node dan AudioContext, melepas listener serta dispose geometry/material/texture/WebGL renderer dan context. Reset membatalkan demonstrasi/eksekusi yang sedang berjalan. Kehilangan fokus menjeda, mengosongkan input dan mematikan audio; tab tersembunyi juga menghentikan RAF.

Audio **mati pada setiap entri**, hanya aktif setelah klik Audio atau M. Musik prosedural dan efek mengambil, menaruh, menjalankan dan reward diadaptasi dari kontribusi rekan. Three.js **0.152.2** tersedia lokal di `cloud-ops/vendor/three.module.js`, dengan lisensi MIT di `vendor/LICENSE` dan sumber/checksum di `cloud-ops/NOTICE`. Tarball diverifikasi dengan integrity registry npm. Tidak ada CDN/font/texture/audio runtime eksternal. Jalankan melalui HTTP; file:// tidak mendukung module/worker. Seluruh aset tetap berfungsi setelah internet terputus selama server lokal aktif. Ini tidak memasang service worker/PWA untuk cache server yang mati. Static hosting Vercel kompatibel tanpa build; tidak ada deployment otomatis.

Pulau, robot, task crates, action pad, semut, musik dan reward berasal dari **Cloud Ops 3D: Jadilah Scheduler**, kontribusi asli rekan Kelompok 8 yang dilampirkan sebagai `dunia3d (1).html`. Nama individu tidak diberikan dan tidak dibuat-buat. Jadwal, counter serta hasil ACO/GA yang sebelumnya scripted telah diganti kalkulasi nyata; bentuk dunia dan interaksi robot tetap dipertahankan.

Pengujian integrasi menambah 8 tes terfokus (25 total), seluruh 8 mapping latihan, import/limits, trace/metric agreement, elitisme tanpa tie-break DoI, gene inheritance, cancellation dan lifecycle audio. Rincian bukti browser, batas verifikasi, serta gate AntiSlop tersedia di `IMPLEMENTATION_REPORT.md`; alur kelas ada di `PRESENTATION_GUIDE.md`.

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
