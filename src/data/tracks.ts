export const tracks = [
  {
    slug: 'objects',
    number: '01',
    title: 'Think in objects',
    shortTitle: 'Objects',
    description:
      'Build the Sui mental model: identity, versions, ownership, and the ways state can move.',
    outcome: 'Read an object reference and explain who can use it next.',
    lessonCount: 3,
    accent: 'blue',
  },
  {
    slug: 'transactions',
    number: '02',
    title: 'Read the transaction',
    shortTitle: 'Transactions',
    description:
      'Follow inputs through PTB commands, then separate intended actions from committed effects and cost.',
    outcome: 'Reconstruct a transaction from inputs to final effects.',
    lessonCount: 3,
    accent: 'amber',
  },
  {
    slug: 'move',
    number: '03',
    title: 'Decode Move calls',
    shortTitle: 'Move calls',
    description:
      'Use types and function signatures to understand what a Move call may read, change, or consume.',
    outcome: 'Turn a raw Move call into a precise, evidence-backed explanation.',
    lessonCount: 3,
    accent: 'coral',
  },
] as const;

export type Track = (typeof tracks)[number];
export type TrackSlug = Track['slug'];

export function getTrack(slug: string) {
  return tracks.find((track) => track.slug === slug);
}
