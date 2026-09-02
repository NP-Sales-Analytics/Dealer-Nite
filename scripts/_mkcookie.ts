import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Membuat cookie jar curl yang formatnya sama dengan @supabase/ssr,
// supaya endpoint ber-auth bisa diuji dari terminal tanpa browser.
async function main() {
  const [, , email, password] = process.argv;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ref = new URL(url).hostname.split('.')[0];

  const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { console.error('LOGIN FAIL:', error.message); process.exit(1); }

  const value = 'base64-' + Buffer.from(JSON.stringify(data.session)).toString('base64url');
  const name = `sb-${ref}-auth-token`;
  const expiry = Math.floor(Date.now() / 1000) + 3600;

  // Cookie besar dipecah persis seperti @supabase/ssr (chunk 3180 char).
  const CHUNK = 3180;
  const parts: [string, string][] = [];
  if (value.length <= CHUNK) parts.push([name, value]);
  else for (let i = 0, n = 0; i < value.length; i += CHUNK, n++) parts.push([`${name}.${n}`, value.slice(i, i + CHUNK)]);

  const lines = parts.map(([n, v]) => `localhost\tFALSE\t/\tFALSE\t${expiry}\t${n}\t${v}`);
  writeFileSync(process.env.COOKIE_OUT || 'cookies.txt', '# Netscape HTTP Cookie File\n' + lines.join('\n') + '\n');
  console.log(`cookie ditulis (${parts.length} chunk) untuk ${data.user!.email}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
