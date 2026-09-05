'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { cabutWaktu, simpanWaktu } from '@/app/(app)/setting/waktu/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { jamJakarta, tanggalJakarta } from '@/lib/utils';

const dua = (n: number) => String(n).padStart(2, '0');
const JAM = Array.from({ length: 24 }, (_, i) => dua(i));
const MENIT = Array.from({ length: 60 }, (_, i) => dua(i));

// Gaya native <select> disamakan dengan <Input> supaya sebaris rapi dengan
// kolom tanggal di sebelahnya.
const GAYA_SELECT =
  'h-11 w-full rounded-lg border border-border bg-background px-3 text-base tabular-nums shadow-xs focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none';

export function WaktuForm({
  tenggat,
  tanggalAwal,
  jamAwal,
  menitAwal,
}: {
  tenggat: string | null;
  tanggalAwal: string;
  jamAwal: string;
  menitAwal: string;
}) {
  const [pending, start] = useTransition();
  const sudahLewat = tenggat !== null && Date.parse(tenggat) <= Date.now();

  return (
    <div className="space-y-4">
      <div
        className={
          sudahLewat
            ? 'rounded-2xl border-2 border-amber-300 bg-amber-50 p-4'
            : 'rounded-2xl border border-border bg-card p-4 shadow-xs'
        }
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Status saat ini
        </p>
        {tenggat === null ? (
          <p className="mt-1.5 text-sm">
            Belum ada batas waktu. Penambahan order <span className="font-semibold">terbuka</span>.
          </p>
        ) : (
          <>
            <p className="mt-1.5 text-base font-semibold">
              {tanggalJakarta(tenggat)}, {jamJakarta(tenggat)} WIB
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {sudahLewat
                ? 'Waktu sudah lewat — semua penambahan order terkunci.'
                : 'Setelah waktu ini, semua penambahan order terkunci.'}
            </p>
          </>
        )}
      </div>

      <form
        action={(fd) =>
          start(async () => {
            const msg = await simpanWaktu(null, fd);
            if (msg) {
              toast.error(msg);
              return;
            }
            toast.success('Waktu penambahan disimpan.');
          })
        }
        className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5"
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
          <div className="space-y-2">
            <Label htmlFor="w-tanggal">Tanggal</Label>
            <Input
              className="h-11"
              id="w-tanggal"
              name="tanggal"
              type="date"
              defaultValue={tanggalAwal}
            />
          </div>

          {/* Dua dropdown 24 jam, bukan <input type="time">: tampilan input itu
              mengikuti locale browser dan di sebagian perangkat berubah jadi
              AM/PM. Di sini 00-23 selalu, tanpa AM/PM sama sekali. */}
          <div className="space-y-2">
            <Label htmlFor="w-jam">Jam</Label>
            <select id="w-jam" name="jam" defaultValue={jamAwal} className={GAYA_SELECT}>
              <option value="">--</option>
              {JAM.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="w-menit">Menit</Label>
            <select id="w-menit" name="menit" defaultValue={menitAwal} className={GAYA_SELECT}>
              <option value="">--</option>
              {MENIT.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Memakai jam 24 (00.00&ndash;23.59) waktu Indonesia Barat. Berlaku untuk{' '}
          <span className="font-semibold text-foreground">semua orang</span>, termasuk customer dan
          RSM. Super Admin dan Admin RSVP tetap bisa mengoreksi angka lewat halaman Detail Order
          setelah waktu habis.
        </p>

        <div className="flex items-center gap-2">
          <Button type="submit" className="h-11 flex-1 sm:flex-none sm:px-8" disabled={pending}>
            {pending ? 'Menyimpan...' : 'Simpan Waktu'}
          </Button>
          {tenggat !== null && (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await cabutWaktu();
                  toast.success('Batas waktu dicabut.');
                })
              }
            >
              Cabut Batas Waktu
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
