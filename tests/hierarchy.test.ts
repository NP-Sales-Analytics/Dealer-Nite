import { describe, expect, it } from 'vitest';
import { hierarkiDepot, lengkapiInduk, pilihanDepot } from '@/lib/dashboard/hierarchy';

describe('hierarkiDepot', () => {
  it('membaca seluruh baris CSV', () => {
    expect(hierarkiDepot().size).toBe(98);
  });

  it('tidak lagi memuat depot Komunitas & Media', () => {
    expect(hierarkiDepot().has('Komunitas & Media')).toBe(false);
  });

  it('menyediakan pilihan depot lengkap dan terurut untuk form master', () => {
    const pilihan = pilihanDepot();
    expect(pilihan).toHaveLength(98);
    expect(pilihan.find((item) => item.depot === '1P Semarang')).toEqual({
      depot: '1P Semarang', region: '3A', wilayah: 'Indonesia Barat',
    });
    expect(pilihan.map((item) => item.depot)).toEqual(
      [...pilihan.map((item) => item.depot)].sort((a, b) => a.localeCompare(b, 'id')),
    );
  });

  it('memetakan depot ke region dan wilayahnya', () => {
    expect(hierarkiDepot().get('1P Semarang')).toEqual({
      region: '3A', wilayah: 'Indonesia Barat',
    });
  });

  it('semua depot region 3A terbaca', () => {
    const tiga_a = [...hierarkiDepot().entries()]
      .filter(([, v]) => v.region === '3A')
      .map(([depot]) => depot);
    expect(tiga_a).toContain('1P Semarang');
    expect(tiga_a).toContain('1Y Pati');
    // Depot dari region lain tidak boleh ikut terbawa.
    expect(tiga_a).not.toContain('1G Lampung');
  });
});

describe('lengkapiInduk', () => {
  it('mengisi region yang kosong dari hierarki', () => {
    // Kasus nyata: depot yang cuma punya baris manual entry tidak punya region,
    // dan sebelum ini ikut muncul di setiap pilihan region.
    expect(lengkapiInduk('1P Semarang', null, null)).toEqual({
      region: '3A', wilayah: 'Indonesia Barat',
    });
  });

  it('TIDAK menimpa nilai yang sudah ada di basis data', () => {
    // '4A Medan' tersimpan sebagai region '5', sedangkan hierarki bilang '5A'.
    // Penyaringan SQL berjalan atas nilai basis data, jadi kalau hierarki
    // menang, memilih "Region 5" berhenti memunculkan Medan.
    expect(lengkapiInduk('4A Medan', '5', 'Indonesia Barat').region).toBe('5');
  });

  it('melengkapi hanya bidang yang kosong', () => {
    expect(lengkapiInduk('1P Semarang', '3A', null)).toEqual({
      region: '3A', wilayah: 'Indonesia Barat',
    });
  });

  it('depot di luar hierarki tetap null, bukan menebak', () => {
    expect(lengkapiInduk('(Tanpa Depot)', null, null)).toEqual({
      region: null, wilayah: null,
    });
  });
});
