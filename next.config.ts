import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lib/dashboard/hierarchy.ts membaca berkas ini lewat path yang dirakit saat
  // runtime, dan penelusuran berkas Next tidak bisa mendeteksinya sendiri.
  // Tanpa baris ini hierarkinya hilang di deployment dan dropdown depot diam-
  // diam jatuh ke pemetaan lama.
  outputFileTracingIncludes: {
    '/**': ['./public/Hierarchy Depot.csv'],
  },
  // unzipper (dipakai read-excel-file) punya require opsional ke AWS SDK yang
  // gagal di-bundle webpack; dijalankan langsung dari node_modules saja.
  serverExternalPackages: ['read-excel-file', 'unzipper'],
};

export default nextConfig;
