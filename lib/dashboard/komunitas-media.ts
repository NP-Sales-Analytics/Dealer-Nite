/**
 * Depot sintetis "Komunitas & Media" - satu-satunya depot yang bukan berasal
 * dari master customer (lihat lib/pax-targets.ts).
 *
 * Sengaja di file TERPISAH tanpa import apa pun. lib/pax-targets.ts menarik
 * lib/db (driver postgres, Node-only) - modul itu tidak boleh sampai ke
 * bundel klien. Komponen client (mis. filter-bar.tsx) yang cuma butuh
 * string-nya harus impor dari sini, bukan dari pax-targets.ts.
 */
export const KOMUNITAS_MEDIA = 'Komunitas & Media';
