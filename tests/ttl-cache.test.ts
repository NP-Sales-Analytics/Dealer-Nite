import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ttlCache } from '@/lib/ttl-cache';

beforeEach(() => {
  vi.useFakeTimers();
});

describe('ttlCache', () => {
  it('memanggil sumber sekali untuk dua pembacaan dalam masa berlaku', async () => {
    const sumber = vi.fn(async (k: string) => `nilai-${k}`);
    const cache = ttlCache(sumber, 1000);

    expect(await cache.get('a')).toBe('nilai-a');
    expect(await cache.get('a')).toBe('nilai-a');
    expect(sumber).toHaveBeenCalledTimes(1);
  });

  it('memisahkan hasil per kunci', async () => {
    const sumber = vi.fn(async (k: string) => `nilai-${k}`);
    const cache = ttlCache(sumber, 1000);

    expect(await cache.get('a')).toBe('nilai-a');
    expect(await cache.get('b')).toBe('nilai-b');
    expect(sumber).toHaveBeenCalledTimes(2);
  });

  it('mengambil ulang setelah masa berlaku habis', async () => {
    const sumber = vi.fn(async () => 'x');
    const cache = ttlCache(sumber, 1000);

    await cache.get('a');
    vi.advanceTimersByTime(1001);
    await cache.get('a');

    expect(sumber).toHaveBeenCalledTimes(2);
  });

  it('menggabungkan permintaan bersamaan menjadi satu panggilan sumber', async () => {
    let selesai: (v: string) => void = () => {};
    const sumber = vi.fn(() => new Promise<string>((r) => { selesai = r; }));
    const cache = ttlCache(sumber, 1000);

    const semua = Promise.all([cache.get('a'), cache.get('a'), cache.get('a')]);
    selesai('x');

    expect(await semua).toEqual(['x', 'x', 'x']);
    expect(sumber).toHaveBeenCalledTimes(1);
  });

  it('clear(kunci) memaksa pengambilan ulang hanya untuk kunci itu', async () => {
    const sumber = vi.fn(async (k: string) => `nilai-${k}`);
    const cache = ttlCache(sumber, 1000);

    await cache.get('a');
    await cache.get('b');
    cache.clear('a');
    await cache.get('a');
    await cache.get('b');

    expect(sumber).toHaveBeenCalledTimes(3);
  });

  it('clear() tanpa argumen mengosongkan semua kunci', async () => {
    const sumber = vi.fn(async (k: string) => `nilai-${k}`);
    const cache = ttlCache(sumber, 1000);

    await cache.get('a');
    await cache.get('b');
    cache.clear();
    await cache.get('a');
    await cache.get('b');

    expect(sumber).toHaveBeenCalledTimes(4);
  });

  it('kegagalan tidak tersimpan: percobaan berikutnya memanggil sumber lagi', async () => {
    const sumber = vi.fn()
      .mockRejectedValueOnce(new Error('gagal'))
      .mockResolvedValueOnce('berhasil');
    const cache = ttlCache(sumber as (k: string) => Promise<string>, 1000);

    await expect(cache.get('a')).rejects.toThrow('gagal');
    expect(await cache.get('a')).toBe('berhasil');
    expect(sumber).toHaveBeenCalledTimes(2);
  });

  it('membuang entri terlama saat melewati batas, bukan tumbuh tanpa henti', async () => {
    const sumber = vi.fn(async (k: string) => `nilai-${k}`);
    const cache = ttlCache(sumber, 1000, 2);

    await cache.get('a');
    await cache.get('b');
    await cache.get('c'); // melewati batas 2 -> 'a' terbuang
    await cache.get('c'); // masih tersimpan
    await cache.get('a'); // sudah terbuang, dipanggil ulang

    expect(sumber).toHaveBeenCalledTimes(4);
  });
});
