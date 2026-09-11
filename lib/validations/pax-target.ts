import { z } from 'zod';

export const targetPaxItemSchema = z.object({
  depot: z.string().trim().min(1).max(100),
  targetPax: z.number().int().min(0).max(1_000_000),
}).strict();

export const targetPaxListSchema = z.array(targetPaxItemSchema).min(1).max(500)
  .superRefine((items, ctx) => {
    const depotTerlihat = new Set<string>();
    for (const [index, item] of items.entries()) {
      if (depotTerlihat.has(item.depot)) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'depot'],
          message: 'Depot tidak boleh dikirim dua kali.',
        });
      }
      depotTerlihat.add(item.depot);
    }
  });

export type TargetPaxItem = z.infer<typeof targetPaxItemSchema>;

