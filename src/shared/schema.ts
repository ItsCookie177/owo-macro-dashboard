import { z } from 'zod';

export const commandDefSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  enabled: z.boolean(),
  maxPerSession: z.number().int().positive().nullable(),
});

export const configSchema = z
  .object({
    minDelaySec: z.number().int().min(5).max(600).default(22),
    maxDelaySec: z.number().int().min(5).max(600).default(48),
    maxSessionMin: z.number().int().min(1).max(120).default(10),
    breakEveryCmd: z.number().int().min(0).max(100).default(12),
    breakMinSec: z.number().int().min(5).max(600).default(60),
    breakMaxSec: z.number().int().min(5).max(600).default(120),
    startGraceSec: z.number().int().min(5).max(120).default(10),
    autoStopOnForegroundLoss: z.boolean().default(true),
    rotation: z.array(commandDefSchema).min(1),
    selectors: z.object({ composerId: z.string() }),
  })
  .refine((c) => c.maxDelaySec >= c.minDelaySec, {
    message: 'maxDelaySec harus >= minDelaySec',
    path: ['maxDelaySec'],
  });

export const startSchema = z
  .object({
    minDelaySec: z.number().int().min(5).max(600).optional(),
    maxDelaySec: z.number().int().min(5).max(600).optional(),
  })
  .refine(
    (d) =>
      d.minDelaySec === undefined ||
      d.maxDelaySec === undefined ||
      d.maxDelaySec >= d.minDelaySec,
    { message: 'maxDelaySec harus >= minDelaySec', path: ['maxDelaySec'] },
  );

export const stopSchema = z.object({
  mode: z.enum(['normal', 'emergency']).default('normal'),
});

export type ConfigInput = z.input<typeof configSchema>;
export type StartInput = z.input<typeof startSchema>;
