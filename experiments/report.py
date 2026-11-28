"""Write the local comparison report directly from verified aggregate records."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'data/benchmarks/controlled.json').read_text())
history=json.loads((ROOT/'data/benchmarks/historical.json').read_text())
names={'hybrid-aco':'Max-Min + ACO','aco':'ACO murni','gwo':'GWO murni','hybrid-ga':'Min-Min + GA'}
def fmt(value, digits=2):
    return f'{value:,.{digits}f}'.replace(',','@').replace('.',',').replace('@','.')

lines=['# Laporan perbandingan benchmark','',
'Run baru: 26 November 2026. Baseline presentasi `694229d2abbeb78a39c5b848a8f0a41ccc69efd2`. Ini hasil eksperimen terkontrol tambahan; dua rekaman historis tidak diganti. Metodologi lengkap ada di BENCHMARK_METHODOLOGY.md, metadata dan raw data di data/benchmarks/.','',
'## Sumber dan rekaman historis','',
'Hybrid: https://github.com/RizzqiAkbar/Algoritma-Hybrid-Kelompok-8 @ `2c0dd4b97489b4bc147e28d01bfa0acd9c37c80b`, Results/hasil_simulasi_hybrid.csv dan ringkasan_simulasi.txt. Meta: https://github.com/farelrafli/soka-cloudsim-metaheuristik @ `ded59903791064cc8f7084fbc3b74ac31aa363b3`, output/hasil_metrik_perbandingan.csv dan parameter_terpilih.txt. Kedua raw CSV disalin byte-for-byte; hash dicatat pada historical.json.','',
'Seluruh sepuluh pasangan workload sama dalam length_mi dan urutan. Hardware, simulator, VM/PE dan rumus historis berbeda, sehingga makespan hybrid 10VM tidak diranking bersama ACO/GWO historis 30VM/93PE. Total kapasitas VM meta51951MIPS, sedangkan kapasitas historis hybrid per run tidak diketahui karena MIPS/seed tidak direkam.','',
'Pada rekaman hybrid asli, Max-Min + ACO mempunyai makespan lebih rendah pada 10/10 dataset daripada Min-Min + GA. Ini dasar pemilihan hybrid untuk demonstrasi. Rekaman meta historis menggunakan parameter final, bukan parameter awal atau skor tuning. Imbalance meta tetap SD dalam detik, tidak disebut DoI; runtime meta yang tidak ada tetap null.','',
'## Kondisi bersama','',
'CloudSim3.0.3, 10host, 10VM satuPE, MIPS500/1000/1500/2000/2500 diulang dua kali (15000total). Semua task satuPE, batch tanpa submission delay, urutan sama. Metode asli Hybrid.java dipanggil melalui reflection; MetaScheduler.java asli menerima vmPes=1. Source tidak diedit. Seed1–10 independen, satu warm-up42 per metode/cohort, urutan metode dirotasi, eksekusi sekuensial.','',
'Makespan = finish terakhir − start pertama. DoI memakai accumulated actualCPU perVM. Utilisasi = 100×totalCPU/(span×10). Biaya = totalCPU×USD3/s. Runtime nanoTime mencakup persiapan input umum dan search, tidak CloudSim. Mesin i5-10310U/WSL2/OpenJDK21.0.13.1, Xms256m/Xmx1536m. Runtime tidak dianggap berlaku pada hardware lain.','']

for policy,cohort in data['cohorts'].items():
    by={(r['n'],r['algorithm']):r for r in cohort['rows']}
    title='Parameter asli (termasuk ACO/GWO hasil tuning)' if policy=='tuned' else 'Anggaran pencarian setara: 1.250 kandidat stokastik'
    lines += ['## '+title,'',f"{cohort['successfulRuns']} run berhasil. Raw: `{cohort['rawFile']}`. SHA-256 `{cohort['rawSha256']}`. Mapping lengkap: `{cohort['assignmentFile']}`.",'']
    lines += [('Hybrid1251, ACO2000, GWO1300 evaluasi; GA tambahan10151 fitness calls, termasuk turnamen berulang.' if policy=='tuned' else 'Hybrid25×50, ACO25×50, GWO50×(24+1). Hybrid tetap mempunyai satu evaluasi seed tambahan dan biaya membangun Max-Min. Budget ini tidak menyamakan runtime dan bukan ablation seeding.'),'',
    '| Task | Hybrid mean ± SD (s) | ACO mean ± SD (s) | GWO mean ± SD (s) | Δ vs ACO (%) | Δ vs GWO (%) |','|---:|---:|---:|---:|---:|---:|']
    for n in range(100,1001,100):
        metrics=[by[n,a]['metrics']['ms'] for a in ['hybrid-aco','aco','gwo']]
        relative=[(1-metrics[0]['mean']/m['mean'])*100 for m in metrics[1:]]
        lines += ['| '+str(n)+' | '+' | '.join(fmt(m['mean'])+' ± '+fmt(m['sd']) for m in metrics)+' | '+' | '.join(fmt(v) for v in relative)+' |']
    lines += ['', '| Metrik | Hybrid lebih baik dari ACO | Hybrid lebih baik dari GWO |','|---|---:|---:|']
    for metric in ['ms','doi','util','time','cost']:
        counts=[]
        for a in ['aco','gwo']:
            counts.append(sum((by[n,'hybrid-aco']['metrics'][metric]['mean']>by[n,a]['metrics'][metric]['mean'] if metric=='util' else by[n,'hybrid-aco']['metrics'][metric]['mean']<by[n,a]['metrics'][metric]['mean']) for n in range(100,1001,100)))
        lines += [f'| {metric} | {counts[0]}/10 | {counts[1]}/10 |']
    lines += ['',f"Gap absolut relatif model–CloudSim maksimum {fmt(cohort['maxModelGapPct'],6)}%. Mean dan sampleSD ddof=1 dihitung dari 10 run, bukan satu run yang disebut rata-rata. SD=0 pada suatu sel adalah hasil aktual, tidak diganti variasi buatan.",'',
    '| Task | Algoritma | Makespan terbaik (s) | Terburuk (s) | Run berhasil |','|---:|---|---:|---:|---:|']
    for r in cohort['rows']:
        m=r['metrics']['ms'];lines += [f"| {r['n']} | {names[r['algorithm']]} | {fmt(m['best'])} | {fmt(m['worst'])} | {r['runs']} |"]
    lines += ['','Best/worst, mean dan SD untuk semua metrik lain tersedia pada controlled.json dan disclosure statistik di materi5. CSV memuat seluruh run, timestamp simulator, prediksi model, gap dan evaluation count. Tidak ada data yang dipilih berdasarkan pemenangnya.','']

lines += ['## Interpretasi dan batas kesimpulan','',
'Pada konfigurasi bersama ini, hybrid mempunyai mean makespan/DoI lebih rendah dan utilisasi lebih tinggi pada seluruh sepuluh dataset terhadap kedua metode lama. GWO lebih cepat menghitung scheduler, sedangkan ACO murni lebih murah pada model biayaCPU yang dipakai. Jadi hybrid tidak menang pada setiap metrik. ACO murni dapat memusatkan lebih banyak pekerjaan pada VM cepat, menurunkan jumlah CPU seconds, tetapi menaikkan span terakhir; menyeimbangkan beban tidak identik dengan meminimalkan biaya.','',
'Dua implementasi ACO berbeda dalam visibility dinamis vs statis, deposit, skalaQ, batasτ, jumlah semut/iterasi dan seedheuristik. Eksperimen ini membandingkan implementasi tugas yang sebenarnya, bukan mengisolasi Max-Min sebagai satu-satunya sebab perbedaan. Tuning dari30VM tidak otomatis optimal pada10VM. Sepuluh seed/sepuluh workload tidak membuktikan superioritas pada seluruh workload atau statistical significance. Tidak ada CI/p-value atau klaim optimum global.','',
'SatuPE dipilih untuk mempertahankan evaluator asli kedua kode tanpa adaptasi multiPE. Hasil bukan reproduksi persis setup tugas sebelumnya. Koherensi dengan arsip minggu3 yang tidak disediakan dan keunikan pilihan antar-kelas belum dapat disimpulkan. Tidak ada deploycloud nyata; contoh Demo2 pada guide adalah penerapan konseptual dengan batas model yang dinyatakan.','',
'## Verifikasi literatur','',
'Dua PDF lokal dibaca seluruh teksnya dan halaman yang relevan dirender. Faraj/Inampudi2018: IJAMTES8(XII),32–42, MLCCAP=AACO+PSO+ClassifierChains. Relatedwork halaman34 menyebut Max-Min+PSO; dasar ACO pada36–37. Kode kelompok adalah adaptasi Max-Min seeding dengan ACO, bukan proposal persis paper1. Shu/Wang2009: IJDSN5,62–63, DOI10.1080/15501320802554976; MCGA langsung memadukan Min-Min+GA untuk grid. DetailGA kelompok tidak diklaim berasal dari artikel dua halaman itu.','',
'Rujukan tambahan MMH+EACO diperiksa pada fulltext penerbit, khususnya§3.3–3.4. Metadata edisi2024 berbeda dengan tanggal daring2023. Kerangkanya mencakup migration/WSVM, dan awal§3 mengandung ketidakkonsistenan penyebutan ESA. Dipakai hanya sebagai tambahan konsep, bukan bukti implementasiτ3/1 identik. Penerbit menyatakan peerreview; kualitas maupun penerimaan akademik dosen tidak disamakan dengan metadata publikasi.','',
'Keterbatasan syarat dosen: paper1 saja tidak memenuhi klaim bahwa Max-Min+ACO persis diambil dari paper. Adaptasi dan rujukan tambahan ditampilkan terbuka, bukan menukar kataPSO dalam kutipan atau mengganti dua paper asli.','',
'## Reproduksi dan preservasi','',
'Jalankan `bash experiments/prepare.sh`, `bash experiments/run.sh`, `bash experiments/run.sh data/benchmarks/equal-search 1000 equal-search`, `python3 experiments/aggregate.py`, kemudian `python3 experiments/report.py`. Run ulang adalah pengukuran baru, terutama runtime. Sumber3D, integrasi, enginebrowser dan walkthrough tetap pada hash baseline; audit akhir dicatat di IMPLEMENTATION_REPORT.md. Tidak ada commit/push/deployment otomatis. Semua Markdown tambahan tetap lokal; README adalah satu-satunya Markdown yang disarankan untuk staging.','']
(ROOT/'BENCHMARK_COMPARISON_REPORT.md').write_text('\n'.join(lines))
print('Wrote local BENCHMARK_COMPARISON_REPORT.md from complete verified cohorts')
