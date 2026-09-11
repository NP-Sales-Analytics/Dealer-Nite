# Hasil produksi — LOADTEST_20260911T023451Z_8FF0D4

## Preflight

- Marker lama: 0
- Aktivitas bisnis terakhir: 2026-09-10T11:58:56.200Z
- Tenggat order: 2026-09-13T14:45:00.000Z
- Snapshot awal: customer 135, profil 6, reservasi 8, order adjustment 52, app settings 1

## HTTP baseline

| Profil | VU | p95 | p99 | HTTP gagal | 402/429/5xx |
| --- | ---: | ---: | ---: | ---: | ---: |
| Customer leaderboard | 1 → 5 → 10 | 178.21 ms | 339.55 ms | 0% | 0 / 0 / 0 |
| Staf search/check-in | 1 → 5 → 10 | 425.42 ms | 492.25 ms | 0% | 0 / 0 / 0 |
| Staf search/check-in | 20 selama 7 menit | 441.93 ms | 591.98 ms | 0% | 0 / 0 / 0 |

## Realtime

| Profil | Tahap akhir | Delivery | Reconnect | p95 refetch | Channel tersisa |
| --- | --- | ---: | ---: | ---: | ---: |
| Realistis: 180 customer + 20 staf | 180/180 SUBSCRIBED | 1440/1440 (100%) | 0 | 233 ms | 0 |
| Batas kuota: customer saja | 200/200 SUBSCRIBED | Tidak ada order pemicu | 0 | N/A | 0 |

## Integritas dan cleanup

- Burst 10/25/50: seluruh respons 200 dan pertambahan ledger tepat 10/25/50.
- Race: 10 pengurangan serentak menghasilkan 1×200 + 9×409, tanpa minus; 50 customer berbeda berhasil 50/50.
- Rapid double-click: 1 POST dan 1 baris/1 dus ledger.
- Verifikasi sebelum cleanup: 200 customer dummy, 146 ledger row, 200 reservasi; tanpa total negatif atau check-in ganda.
- Cleanup: 200 customer, 20 staf, 146 child order, 200 child reservation dihapus secara eksak.
- Snapshot akhir: lima tabel non-test identik dengan snapshot awal.

## Keputusan

`READY FOR 200 CONCURRENT USERS — NO REALTIME HEADROOM ON FREE PLAN`
