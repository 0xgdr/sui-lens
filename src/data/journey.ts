export const journeyStops = [
  {
    stop: 1,
    slug: 'meet-the-backpack',
    title: 'Meet the backpack',
    subtitle: 'Identity and state',
    prompt: 'Change its trail tag without turning it into a different object.',
    href: '/learn/objects/identity-and-state',
    icon: '/journey/backpack.svg',
  },
  {
    stop: 2,
    slug: 'pack-the-route',
    title: 'Pack the route',
    subtitle: 'A transaction plan',
    prompt: 'Make a 1 SUI travel coin, then hand that exact result to the guide.',
    href: '/learn/transactions/read-the-ptb',
    icon: '/journey/map.svg',
  },
  {
    stop: 3,
    slug: 'open-the-coin-pocket',
    title: 'Open the coin pocket',
    subtitle: 'Containers and value',
    prompt: 'Watch three gas coin objects become one survivor and a new travel coin.',
    href: '/learn/transactions/effects-and-cost',
    icon: '/journey/pass.svg',
  },
  {
    stop: 4,
    slug: 'reach-the-checkpoint',
    title: 'Reach the checkpoint',
    subtitle: 'Private and shared',
    prompt: 'Compare your backpack with the counter every traveller can use.',
    href: '/learn/objects/ownership-and-access',
    icon: '/journey/checkpoint.svg',
  },
  {
    stop: 5,
    slug: 'read-the-gear-tag',
    title: 'Read the gear tag',
    subtitle: '&T, &mut T, and T',
    prompt: 'Read a Move parameter as a handling instruction for the backpack.',
    href: '/learn/move/borrows-and-values',
    icon: '/journey/tag.svg',
  },
  {
    stop: 6,
    slug: 'unfold-the-receipt',
    title: 'Unfold the receipt',
    subtitle: 'The five questions',
    prompt: 'Rebuild the real trail payment from evidence instead of memory.',
    href: '/learn/move/reconstruct-from-evidence',
    icon: '/journey/receipt.svg',
  },
] as const;

export type JourneyStop = (typeof journeyStops)[number];

export function getJourneyStop(stop?: number) {
  return journeyStops.find((item) => item.stop === stop);
}
