import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lessons' }),
  schema: z.object({
    track: z.enum(['objects', 'transactions', 'move']),
    order: z.number().int().positive(),
    title: z.string(),
    eyebrow: z.string(),
    description: z.string(),
    duration: z.string(),
    level: z.enum(['Foundation', 'Intermediate']),
    outcome: z.string(),
    takeaway: z.string(),
    prerequisite: z.string().optional(),
    story: z.object({
      marker: z.string(),
      title: z.string(),
      body: z.string(),
      icon: z.enum(['backpack', 'checkpoint', 'compass', 'map', 'pass', 'receipt', 'tag']),
      demo: z.enum(['object', 'ptb', 'coins', 'checkpoint', 'signature', 'receipt', 'trail-note']),
      accuracyNote: z.string().optional(),
      journeyStop: z.number().int().min(1).max(6).optional(),
    }),
    prediction: z.object({
      question: z.string(),
      options: z.array(z.object({ id: z.string(), label: z.string() })).min(2).max(4),
      answer: z.string(),
      explanation: z.string(),
    }),
    bridge: z.object({
      javascript: z.string(),
      javascriptCode: z.string(),
      sui: z.string(),
      suiCode: z.string(),
      aliases: z.array(z.object({
        javascript: z.string(),
        sui: z.string(),
        meaning: z.string(),
      })).min(1).max(4).optional(),
      carryOver: z.string(),
      difference: z.string(),
    }),
    evidence: z.array(z.object({
      label: z.string(),
      value: z.string(),
      note: z.string().optional(),
    })).min(1),
  }),
});

export const collections = { lessons };
