# Presentasi & Simulasi Algoritma Hybrid Cloud Task Scheduling (Kelompok 8 SOKA)

Repositori ini memuat **materi presentasi interaktif** (`index.html`) dan **kode sumber simulasi CloudSim** (`../Code/`) untuk perbandingan performa dua algoritma penjadwalan komputasi awan *hybrid*:
1. **Hybrid Max-Min + Ant Colony Optimization (ACO)** *(Kandidat Utama)*
2. **Hybrid Min-Min + Genetic Algorithm (GA)** *(Kandidat Pembanding)*

Pengujian dilakukan menggunakan **CloudSim 3.0.3** dengan lingkungan infrastruktur komputasi awan heterogen (10 VM) dan dataset realistis **Google Cluster Jobs (GoCJ)** berukuran 100 hingga 1.000 tasks.

---

## 📁 Struktur Direktori & Keterkaitan Berkas

```
SOKA/Hybrid/
├── Presentasi-Algoritma-Hybrid-Kelompok8-SOKA/
│   ├── index.html            # Web deck presentasi interaktif (Tailwind CSS, KaTeX, Simulator visual)
│   └── README.md             # Dokumentasi lengkap konsep, kode, dan panduan presentasi
└── Code/
    ├── Hybrid.java           # Kode sumber implementasi CloudSim & kedua algoritma hybrid
    ├── pom.xml               # Konfigurasi Maven (Java 17, CloudSim 3.0.3, Gson, Commons-Math3)
    ├── Datasets/             # 10 berkas dataset GoCJ format JSON (100 s.d. 1.000 task)
    │   ├── GoCJ_Dataset_100.json
    │   ├── ...
    │   └── GoCJ_Dataset_1000.json
    └── Results/              # Hasil keluaran otomatis simulasi batch CloudSim
        ├── hasil_simulasi_hybrid.csv   # Data metrik mentah per task & algoritma
        └── ringkasan_simulasi.txt      # Laporan tabel rekapitulasi komparasi
```

---

## 📚 Landasan Teori & Tinjauan Pustaka Ilmiah

Penelitian dan implementasi ini didasarkan pada dua rujukan jurnal ilmiah utama:

1. **Jurnal 1 (Advance ACO & Max-Min Hybrid)**:
   * **Judul:** *"Task Scheduling based on Advance Ant Colony Optimization and Particle Swarm Optimization with Machine learning in the cloud environment"*
   * **Penulis:** Mrs. Nahla Ahmed Faraj & Prof. Ramesh Babu Inampudi
   * **Publikasi:** *International Journal of Management, Technology And Engineering (IJAMTES)*, Vol. 8, Issue XII, Dec 2018, pp. 32–40.
   * **Kutipan Kunci:**
     > *"By combining with the Max-Min algorithm, the outputs of Max-Min algorithm can be assigned to a VM. This output is then given as input to the [metaheuristic] algorithm. As a result, it helps to find the optimal solution compare to the existing algorithm."* (Faraj & Inampudi, 2018, Hal. 34)

2. **Jurnal 2 (Heuristic Seeding pada Lingkungan Terdistribusi)**:
   * **Judul:** *"Resource Allocation & Heuristic-Metaheuristic Scheduling in Distributed Sensor & Computing Networks"*
   * **Publikasi:** *International Journal of Distributed Sensor Networks (SAGE Publications)*, DOI: `10.1080/15501320802554976`.
   * **Sintesis Masalah:** Algoritma metaheuristik murni (GA/ACO acak) menderita masalah *cold-start* dan membutuhkan iterasi lambat untuk menemukan solusi layak. Pendekatan *hybrid* memanfaatkan solusi heuristik deterministik sebagai titik awal (*heuristic seeding*) untuk mempercepat konvergensi global.

---

## ⚙️ Cara Kerja Kedua Algoritma Hybrid

### 1. Hybrid Max-Min + ACO (Kandidat Utama)
* **Langkah 1 (Matriks ETC):** Menghitung perkiraan waktu eksekusi task $T_i$ pada tiap virtual machine $VM_j$:
  $$ET_{ij} = \frac{\text{Length}(T_i)}{\text{MIPS}(VM_j)}, \qquad CT_{ij} = ET_{ij} + RT_j$$
* **Langkah 2 (Eksekusi Max-Min):** Mencari $CT$ minimum per tugas, lalu memilih tugas dengan nilai $CT$ **terbesar** untuk dijadwalkan lebih awal ke VM tercepat.
* **Langkah 3 (Guided Pheromone Seeding):** Jalur alokasi $(T_i, VM_j)$ yang dihasilkan Max-Min diberikan bonus feromon awal:
  $$\tau_{ij}(0) = \tau_{\text{base}} + 2.0 = 3.0$$
* **Langkah 4 (Konstruksi Solusi Semut):** 25 semut menyusun pemetaan task berdasarkan aturan probabilitas roulette-wheel:
  $$P_{ij} = \frac{[\tau_{ij}]^\alpha \cdot [\eta_{ij}]^\beta}{\sum_{k=1}^{m} [\tau_{ik}]^\alpha \cdot [\eta_{ik}]^\beta}, \quad \text{dengan } \eta_{ij} = \frac{1}{ET_{ij} + 10^{-6}}$$
* **Langkah 5 (Evaporasi & Elitist Update):**
  $$\tau_{ij}(t+1) = (1 - \rho)\tau_{ij}(t) + \Delta \tau_{ij}^{\text{best}}, \quad \Delta \tau_{ij}^{\text{best}} = \frac{Q}{\text{Makespan}_{\text{best}}}$$
  *Parameter: $\alpha = 1.0, \beta = 2.0, \rho = 0.2, Q = 100.0, \text{Ants} = 25, \text{Iterations} = 50$.*

---

### 2. Hybrid Min-Min + GA (Kandidat Pembanding)
* **Langkah 1 (Eksekusi Min-Min):** Menghitung waktu penyelesaian minimum, lalu memilih task dengan $CT$ **terkecil** secara berulang hingga semua tugas terjadwal.
* **Langkah 2 (Chromosome Seeding):** Hasil jadwal Min-Min dijadikan **Kromosom ke-0 (Elit)**, sedangkan 29 kromosom lainnya dibangkitkan secara acak untuk membentuk populasi awal ($PopSize = 30$).
* **Langkah 3 (Evaluasi Fitness):**
  $$\text{Fitness}(K) = \frac{1}{\text{Makespan}(K)} = \frac{1}{\max_{j \in VM} \sum_{i \in K_j} ET_{ij}}$$
* **Langkah 4 (Seleksi & Crossover):** *Tournament Selection* ($k=3$) dan *Single-Point Crossover* ($P_c = 0.8$).
* **Langkah 5 (Mutasi & Elitisme):** Mutasi gen acak ($P_m = 0.05$) dan mempertahankan kromosom terbaik sepanjang 50 generasi.

---

## 📊 Hasil Pengujian Aktual CloudSim (GoCJ 100–1.000 Tasks)

Pengujian dijalankan pada **10 VM Heterogen** (tingkat kapasitas: 500, 1.000, 1.500, 2.000, dan 2.500 MIPS) dengan biaya komputasi `COST_PER_SEC = $3.0`.

Data diambil langsung dari berkas keluaran simulasi [`Code/Results/ringkasan_simulasi.txt`](file:///c:/Users/Project%20Codingan/SOKA/Hybrid/Code/Results/ringkasan_simulasi.txt):

| N Tasks | Makespan GA | Makespan ACO ★ | Selisih Makespan | DoI GA | DoI ACO ★ | Util GA (%) | Util ACO ★ (%) | Cost (GA / ACO) | Algo Time (GA / ACO) |
|:-------:|:-----------:|:--------------:|:----------------:|:------:|:---------:|:-----------:|:--------------:|:---------------:|:--------------------:|
| **100** | 899,7 s | **852,8 s** | -46,9 s | 0,160 | **0,027** | 93,1% | **98,9%** | \$25.131 / \$25.297 | 19,6 ms / 60,9 ms |
| **200** | 1.704,7 s | **1.605,2 s** | -99,5 s | 0,271 | **0,011** | 94,3% | **99,6%** | \$48.221 / \$47.953 | 28,2 ms / 88,6 ms |
| **300** | 2.299,2 s | **2.248,1 s** | -51,1 s | 0,069 | **0,003** | 97,7% | **99,8%** | \$67.367 / \$67.336 | 26,3 ms / 130,2 ms |
| **400** | 4.406,1 s | **4.154,9 s** | -251,1 s | 0,207 | **0,007** | 94,3% | **99,8%** | \$124.682 / \$124.396 | 31,5 ms / 152,4 ms |
| **500** | 4.375,9 s | **4.199,2 s** | -176,8 s | 0,092 | **0,005** | 95,8% | **99,8%** | \$125.812 / \$125.741 | 36,9 ms / 170,9 ms |
| **600** | 5.623,5 s | **5.493,2 s** | -130,3 s | 0,135 | **0,003** | 96,8% | **99,9%** | \$163.310 / \$164.640 | 45,3 ms / 207,5 ms |
| **700** | 6.782,1 s | **6.485,2 s** | -296,9 s | 0,186 | **0,004** | 94,8% | **99,9%** | \$192.795 / \$194.383 | 53,3 ms / 246,8 ms |
| **800** | 6.609,1 s | **6.389,1 s** | -220,0 s | 0,239 | **0,002** | 93,7% | **99,9%** | \$185.812 / \$191.522 | 64,6 ms / 280,0 ms |
| **900** | 9.299,7 s | **8.898,3 s** | -401,5 s | 0,180 | **0,003** | 94,4% | **99,9%** | \$263.342 / \$266.631 | 68,7 ms / 314,7 ms |
| **1000** | 7.638,4 s | **7.412,9 s** | -225,5 s | 0,105 | **0,003** | 96,0% | **99,9%** | \$219.898 / \$222.191 | 92,5 ms / 354,0 ms |

---

## 💡 Temuan Kunci & Analisis Perbandingan

1. **Efisiensi Makespan (10/10 Kemenangan untuk Max-Min + ACO)**:
   * Max-Min + ACO unggul di seluruh 10 skenario GoCJ, memangkas makespan antara **46,9 detik** (skala 100 task) hingga **401,5 detik** (skala 900 task).
2. **Keseimbangan Beban (Degree of Imbalance - DoI)**:
   * Nilai DoI ACO konsisten berada pada rentang **0,002 – 0,027**, mendekati keseimbangan sempurna.
   * Sebaliknya, Min-Min + GA memiliki DoI yang jauh lebih tinggi (**0,069 – 0,271**) akibat kecenderungan Min-Min menumpuk tugas kecil di VM cepat.
3. **Pemanfaatan Sumber Daya (Resource Utilization)**:
   * ACO mencapai utilisasi **98,9% – 99,9%**, memastikan kapasitas pemrosesan seluruh VM digunakan secara maksimal.
4. **Trade-Off Waktu Algoritma (Runtime Complexity)**:
   * Hybrid Min-Min + GA lebih cepat dalam pengambilan keputusan alokasi (**19,6 – 92,5 ms**) karena representasi kromosom integer 1D.
   * Hybrid Max-Min + ACO memerlukan komputasi matriks probabilitas semut (**60,9 – 354,0 ms**). Namun *overhead* komputasi ini sangat sepadan karena berhasil menghemat waktu eksekusi aktual cloud hingga ratusan detik.

---

## 🚀 Panduan Menjalankan

### A. Membuka Slide Presentasi Interaktif
1. Buka berkas [`index.html`](file:///c:/Users/Project%20Codingan/SOKA/Hybrid/Presentasi-Algoritma-Hybrid-Kelompok8-SOKA/index.html) menggunakan peramban modern (Google Chrome, Microsoft Edge, Firefox).
2. **Fitur Presentasi:**
   * **Navigasi Tombol & Keyboard:** Gunakan tombol `←` dan `→` pada keyboard atau tombol navigasi di bagian header/footer.
   * **Slide 1:** Tinjauan pustaka, kutipan jurnal, dan landasan teori ilmiah.
   * **Slide 2 & 3:** Diagram alur 5 langkah, rumus matematis KaTeX, dan justifikasi parameter untuk kedua algoritma.
   * **Slide 4:** Simulator visual interaktif 3 tugas pada 2 VM dengan beban animasi bar dinamis.
   * **Slide 5:** Tabel rekapitulasi data benchmark aktual CloudSim dengan filter skala (Semua, Kecil, Menengah, Besar).

### B. Menjalankan Ulang Simulasi CloudSim (Java 17 & Maven)
Pastikan Java 17 dan Maven telah terpasang. Jalankan perintah berikut melalui terminal:

```powershell
# Pindah ke direktori Code
cd "SOKA/Hybrid/Code"

# Menjalankan simulasi batch untuk seluruh dataset (100 s.d. 1.000 Tasks):
mvn -q exec:java

# Atau menjalankan untuk satu berkas dataset tertentu:
mvn -q exec:java "-Dexec.args=Datasets/GoCJ_Dataset_500.json"
```

Hasil eksekusi akan otomatis tersimpan dan diperbarui di folder [`SOKA/Hybrid/Code/Results/`](file:///c:/Users/Project%20Codingan/SOKA/Hybrid/Code/Results/).
