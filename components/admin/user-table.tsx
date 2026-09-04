'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { UserDetailDialog } from './user-detail-dialog';
import { UserFormDialog, type UserRow } from './user-form-dialog';
import { deleteUser } from '@/app/(app)/admin/users/actions';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { halamanEfektif, labelScope, ROLE_LABEL } from '@/lib/access';
import { inisial } from '@/lib/utils';

function Avatar({ nama }: { nama: string }) {
  return (
    <span
      className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground"
      aria-hidden
    >
      {inisial(nama)}
    </span>
  );
}

export function UserTable({ rows, currentUserId }: { rows: UserRow[]; currentUserId: string }) {
  const [pending, start] = useTransition();
  const [detail, setDetail] = useState<UserRow | null>(null);
  const [edit, setEdit] = useState<UserRow | null>(null);
  const [tambah, setTambah] = useState(false);
  const [hapus, setHapus] = useState<UserRow | null>(null);

  return (
    <>
      {/* Toolbar di atas tabel, bukan di header halaman: header sekarang milik
          layout dan dipakai bersama semua halaman. */}
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
        <p className="text-sm text-muted-foreground">
          {rows.length} akun terdaftar
        </p>
        <Button className="h-11 gap-2" onClick={() => setTambah(true)}>
          <Plus className="size-4" />
          Tambah User
        </Button>
      </div>

      {/* Struktur dan ukuran disamakan dengan tabel Detail Toko Hadir: satu
          layout untuk semua lebar layar, digeser ke kanan di HP alih-alih
          berubah jadi kartu, supaya susunan kolomnya tetap sama di mana pun. */}
      <div className="min-w-0 rounded-2xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <Table className="min-w-[52rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="py-4 pl-5">Nama</TableHead>
                <TableHead className="py-4">Role</TableHead>
                <TableHead className="py-4">Cakupan Data</TableHead>
                <TableHead className="py-4 text-center">Halaman</TableHead>
                <TableHead className="py-4 pr-5 text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => {
                const akunSendiri = u.id === currentUserId;
                const boleh = halamanEfektif(u.role, u.allowedPages);

                return (
                  <TableRow
                    key={u.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Lihat detail ${u.fullName || u.email || 'user'}`}
                    onClick={() => setDetail(u)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Spacebar' || e.key === ' ') {
                        e.preventDefault();
                        setDetail(u);
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-secondary/50 focus-visible:bg-secondary focus-visible:outline-none"
                  >
                    <TableCell className="py-4 pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar nama={u.fullName || u.email || '?'} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-medium leading-snug">
                            <span className="min-w-0 break-words">{u.fullName || 'Tanpa nama'}</span>
                            {akunSendiri && (
                              <Badge variant="outline" className="shrink-0">Anda</Badge>
                            )}
                          </p>
                          {u.email && <p className="break-all text-xs text-muted-foreground">{u.email}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="secondary">{ROLE_LABEL[u.role]}</Badge>
                    </TableCell>
                    <TableCell className="py-4 text-muted-foreground">
                      {labelScope(u.role, u.dataScope)}
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <span
                        className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground"
                        title={boleh.join(', ') || 'Tidak ada'}
                      >
                        {boleh.length} halaman
                      </span>
                    </TableCell>
                    <TableCell className="py-4 pr-5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setHapus(u); }}
                          disabled={pending || akunSendiri}
                          aria-label={`Hapus ${u.fullName || u.email || 'user'}`}
                          title={akunSendiri ? 'Tidak bisa menghapus akun sendiri' : 'Hapus'}
                          className="grid size-10 place-items-center rounded-lg border border-border text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <Trash2 className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEdit(u); }}
                          disabled={pending}
                          aria-label={`Ubah ${u.fullName || u.email || 'user'}`}
                          title="Ubah"
                          className="grid size-10 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <Pencil className="size-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail ditutup lebih dulu sebelum edit/hapus dibuka: dua dialog
          bertumpuk membuat fokus keyboard terjebak di lapisan bawah. */}
      <UserDetailDialog
        row={detail}
        akunSendiri={detail?.id === currentUserId}
        onOpenChange={(v) => !v && setDetail(null)}
        onEdit={(u) => { setDetail(null); setEdit(u); }}
        onHapus={(u) => { setDetail(null); setHapus(u); }}
      />

      <UserFormDialog mode="create" open={tambah} onOpenChange={setTambah} />

      {/* key: state form diisi dari props saat mount, jadi tanpa ini membuka
          user kedua akan menampilkan isian user pertama. */}
      {edit && (
        <UserFormDialog
          key={edit.id}
          mode="edit"
          row={edit}
          open
          onOpenChange={(v) => !v && setEdit(null)}
        />
      )}

      <AlertDialog open={hapus !== null} onOpenChange={(o) => !o && setHapus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus user ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {hapus?.fullName || hapus?.email || 'User ini'} akan dihapus permanen dan tidak bisa
              login lagi. Catatan kehadiran yang pernah dibuatnya tetap tersimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                const target = hapus;
                setHapus(null);
                if (!target) return;
                start(async () => {
                  try {
                    await deleteUser(target.id);
                    toast.success('User dihapus.');
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Gagal menghapus.');
                  }
                });
              }}
            >
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
