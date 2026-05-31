import type { BriefInput } from './types';

export const sampleBriefs: BriefInput[] = [
  {
    productName: 'GlowSip Collagen Soda',
    productDescription:
      'A low-sugar sparkling collagen drink for women who want a beauty routine that feels easy and enjoyable.',
    targetAudience:
      'Women 24-38 who care about skin, wellness, and looking put together but dislike complicated routines.',
    offer: 'Buy 2 packs, get 1 free this week only.',
    tone: 'Confident, clean, slightly playful, modern DTC',
    primaryGoal: 'Drive purchases from paid social traffic',
    landingPageUrl: 'https://example.com/products/glowsip',
    constraints:
      'Avoid medical claims. Avoid sounding too luxury or too clinical. Make it feel scroll-stopping and creator-friendly.',
  },
  {
    productName: 'DeskFlow Pro Stand',
    productDescription:
      'A compact aluminum laptop stand with built-in cable management and a fold-flat design for hybrid workers.',
    targetAudience:
      'Remote workers and freelancers 25-40 who set up at coffee shops, co-working spaces, and home desks.',
    offer: 'Launch price $39 (retail $59) + free travel pouch.',
    tone: 'Direct, practical, slightly geek-chic, no fluff',
    primaryGoal: 'Drive pre-orders from productivity and tech audiences',
    landingPageUrl: 'https://example.com/products/deskflow-pro',
    constraints:
      'Show real workspace scenarios, not studio renderings. Avoid sounding like a generic Amazon listing. Highlight portability.',
  },
  {
    productName: 'BarkBond Reflective Harness',
    productDescription:
      'A lightweight, adjustable dog harness with 360° reflective stitching and a no-pull front clip, designed for evening walks and active dogs.',
    targetAudience:
      'Dog owners 28-45 who walk their dogs before sunrise or after sunset, value safety, and buy premium pet gear.',
    offer: 'Free matching leash + 20% off first order with code WALKSAFE.',
    tone: 'Warm, trustworthy, slightly outdoorsy, community-minded',
    primaryGoal: 'Drive first-time purchases from pet safety content on Instagram and TikTok',
    landingPageUrl: 'https://example.com/products/barkbond-harness',
    constraints:
      'Show real dogs and owners, not stock footage. Emphasize safety data (reflectivity, visibility). Avoid sad shelter-music tone.',
  },
];

export const sampleBrief = sampleBriefs[0];
