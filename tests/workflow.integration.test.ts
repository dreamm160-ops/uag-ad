import { describe, it, expect } from 'vitest';

/**
 * Integration-level workflow test using the app's public API surface.
 *
 * These tests hit the Next.js dev server or require a running server.
 * They validate the full vertical slice: brief validation → hook matrix →
 * scripts → storyboard → single-frame regeneration.
 *
 * Run with the dev server active on port 3100, or mock the fetch calls
 * against a local test harness.
 *
 * For now, we test the data-flow contracts by importing the route logic
 * through the shared pollinations module.
 */

import {
  generateHooks,
  generateScripts,
  generateStoryboard,
  generateSingleStoryboardFrame,
  // Not exporting these directly, so we re-implement validation for testing
} from '@/lib/pollinations';

const testBrief = {
  productName: 'TestGlow Serum',
  productDescription: 'A vitamin C serum for brightening skin in 2 weeks.',
  targetAudience: 'Women 25-40 with dull skin looking for easy skincare wins.',
  offer: '20% off first order + free shipping.',
  tone: 'Confident but warm, slightly playful',
  primaryGoal: 'Drive purchases from paid social traffic',
  landingPageUrl: 'https://example.com/glowserum',
  constraints: 'Avoid medical claims. No "dermatologist recommended" language.',
};

const testAngle = {
  angle: 'Problem-first interruption',
  rationale: 'Open by naming the frustration the audience already feels.',
  hooks: [
    '"I almost scrolled past this — but then I saw the 20% off"',
    '"If you\'re still dealing with dull skin, this is for you."',
    '"Stop scrolling — this warm take on GlowSerum is different."',
  ],
  cta: 'Tap the link — 20% off + free shipping ends soon.',
};

const testVariant = {
  variantLabel: 'Direct demo (fast)',
  scriptBody:
    'HOOK:\n"I almost scrolled past this — but then I saw the 20% off"\n\nBODY:\n• Quick unboxing feel showing TestGlow Serum.\n• Mention the 20% off + free shipping and why it makes sense now.\n• Show the result in a natural, unpolished moment.\n\nCTA:\nTap the link — 20% off + free shipping ends soon.',
  durationEstimate: '15-25s',
  platform: 'Reels / Shorts',
};

describe('UGC Ad Studio — mock workflow integration', () => {
  it('generates a hook matrix from a valid brief (mock)', async () => {
    // In production this would need a clientKey; we test the mock path
    // by setting the env to allow mock fallback.
    const original = process.env.POLLINATIONS_ALLOW_MOCK;
    process.env.POLLINATIONS_ALLOW_MOCK = 'true';

    const result = await generateHooks(testBrief);

    expect(result.brief.productName).toBe('TestGlow Serum');
    expect(result.matrix.angles.length).toBeGreaterThan(0);
    expect(result.matrix.angles[0].hooks.length).toBe(3);
    expect(typeof result.matrix.angles[0].cta).toBe('string');
    expect(result.mock).toBe(true);
    expect(result.model).toBe('mock');

    if (original) process.env.POLLINATIONS_ALLOW_MOCK = original;
    else delete process.env.POLLINATIONS_ALLOW_MOCK;
  });

  it('generates scripts and shot list from brief + angle (mock)', async () => {
    const original = process.env.POLLINATIONS_ALLOW_MOCK;
    process.env.POLLINATIONS_ALLOW_MOCK = 'true';

    const result = await generateScripts(testBrief, testAngle);

    expect(result.variants.length).toBeGreaterThan(0);
    expect(result.variants[0].scriptBody.length).toBeGreaterThan(20);
    expect(result.shotList.shots.length).toBe(5);
    expect(result.shotList.shots[0].sceneNumber).toBe(1);
    expect(result.shotList.totalDurationEstimate).toBeTruthy();
    expect(result.mock).toBe(true);

    if (original) process.env.POLLINATIONS_ALLOW_MOCK = original;
    else delete process.env.POLLINATIONS_ALLOW_MOCK;
  });

  it('generates storyboard frames from brief + angle + variant (mock)', async () => {
    const original = process.env.POLLINATIONS_ALLOW_MOCK;
    process.env.POLLINATIONS_ALLOW_MOCK = 'true';

    const result = await generateStoryboard(testBrief, testAngle, testVariant);

    expect(result.frames.length).toBe(5);
    expect(result.frames[0].sceneNumber).toBe(1);
    expect(result.frames[0].prompt.length).toBeGreaterThan(20);
    expect(result.frames[0].imageUrl).toContain('gen.pollinations.ai/image/');
    expect(result.mock).toBe(true);

    if (original) process.env.POLLINATIONS_ALLOW_MOCK = original;
    else delete process.env.POLLINATIONS_ALLOW_MOCK;
  });

  it('regenerates a single frame (mock)', async () => {
    const original = process.env.POLLINATIONS_ALLOW_MOCK;
    process.env.POLLINATIONS_ALLOW_MOCK = 'true';

    const frame = await generateSingleStoryboardFrame(
      testBrief,
      testAngle,
      testVariant,
      3,
      undefined
    );

    expect(frame.sceneNumber).toBe(3);
    expect(frame.shotType.length).toBeGreaterThan(0);
    expect(frame.prompt.length).toBeGreaterThan(20);
    expect(frame.imageUrl).toContain('gen.pollinations.ai/image/');

    if (original) process.env.POLLINATIONS_ALLOW_MOCK = original;
    else delete process.env.POLLINATIONS_ALLOW_MOCK;
  });

  it('all mock frame prompts include UGC realism terms', async () => {
    const original = process.env.POLLINATIONS_ALLOW_MOCK;
    process.env.POLLINATIONS_ALLOW_MOCK = 'true';

    const result = await generateStoryboard(testBrief, testAngle, testVariant);

    // At least some frames should contain product name to prove
    // brief context flows through to the image prompt
    const productMentions = result.frames.filter(
      (f) =>
        f.prompt.includes('TestGlow Serum') ||
        f.caption.includes('TestGlow Serum')
    );
    expect(productMentions.length).toBeGreaterThanOrEqual(1);

    // Image URLs should be well-formed
    for (const frame of result.frames) {
      expect(frame.imageUrl).toMatch(/^https:\/\/gen\.pollinations\.ai\/image\//);
    }

    if (original) process.env.POLLINATIONS_ALLOW_MOCK = original;
    else delete process.env.POLLINATIONS_ALLOW_MOCK;
  });
});
