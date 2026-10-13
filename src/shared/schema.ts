import { z } from 'zod';

export const commandDefSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  enabled: z.boolean(),
  maxPerSession: z.number().int().positive().nullable(),
});

export const configSchema = z.object({
  intervalSec: z.number().int().min(5).max(600),
  maxSessionMin: z.number().int().min(1).max(120),
  jitterSec: z.number().int().min(0).max(10),
  autoStopOnForegroundLoss: z.boolean(),
  rotation: z.array(commandDefSchema).min(1),
  selectors: z.object({ composerId: z.string() }),
});

export const startSchema = z.object({
  intervalSec: z.number().int().min(5).max(600).optional(),
});

export const stopSchema = z.object({
  mode: z.enum(['normal', 'emergency']).default('normal'),
});

export type ConfigInput = z.input<typeof configSchema>;
export type StartInput = z.input<typeof startSchema>;
