import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lib/dashboard/hierarchy.ts membaca berkas ini lewat path yang dirakit saat
  // runtime, dan penelusuran berkas Next tidak bisa mendeteksinya sendiri.
  // Tanpa baris ini hierarkinya hilang di deployment dan dropdown depot diam-
  // diam jatuh ke pemetaan lama.
  outputFileTracingIncludes: {
    '/api/dashboard/filters': ['./public/Hierarchy Depot.csv'],
  },
};

export default nextConfig;
