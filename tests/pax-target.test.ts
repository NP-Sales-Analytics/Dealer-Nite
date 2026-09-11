import { describe, expect, it } from 'vitest';
import { targetPaxListSchema } from '@/lib/validations/pax-target';

describe('targetPaxListSchema', () => {
  it('menerima target bilangan bulat nol atau lebih', () => {
    expect(targetPaxListSchema.safeParse([
      { depot: '1A Jakarta', targetPax: 100 },
      { depot: 'Komunitas & Media', targetPax: 0 },
    ]).success).toBe(true);
  });

  it('menolak target negatif atau desimal', () => {
    expect(targetPaxListSchema.safeParse([{ depot: 'A', targetPax: -1 }]).success).toBe(false);
    expect(targetPaxListSchema.safeParse([{ depot: 'A', targetPax: 1.5 }]).success).toBe(false);
  });

  it('menolak depot duplikat', () => {
    expect(targetPaxListSchema.safeParse([
      { depot: 'A', targetPax: 10 },
      { depot: 'A', targetPax: 20 },
    ]).success).toBe(false);
  });
});
