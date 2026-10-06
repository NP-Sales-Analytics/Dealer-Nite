"""Gabungkan PDF ekspor PowerPoint dengan gambar slide resolusi tinggi.

PowerPoint menanam font variabel Outfit dengan bobot bawaannya (Thin) saat
Save As PDF, sehingga judul bold berubah tipis. Gambar slide hasil render
PowerPoint sendiri tampil benar, jadi tiap halaman ditimpa gambar slidenya;
teks ekspor tetap di lapisan bawah agar PDF masih bisa dicari dan disalin.

    python gabung-pdf.py native.pdf folder-png keluaran.pdf
"""
import sys
from pathlib import Path

import pymupdf

native, folder, keluaran = sys.argv[1], Path(sys.argv[2]), sys.argv[3]
doc = pymupdf.open(native)
gambar = sorted(folder.glob('slide-*.png'))
assert len(gambar) == doc.page_count, f'{len(gambar)} gambar vs {doc.page_count} halaman'

for page, png in zip(doc, gambar):
    page.insert_image(page.rect, filename=str(png), overlay=True)

doc.save(keluaran, garbage=4, deflate=True)
print(f'{keluaran}: {doc.page_count} halaman')
