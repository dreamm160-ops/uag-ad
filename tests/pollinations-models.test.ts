import { describe, expect, it } from 'vitest';

import { filterFreeImageModels, filterFreeTextModels } from '@/lib/pollinations-models';

describe('pollinations model discovery filters', () => {
  it('keeps only free text-output models for text selectors', () => {
    const result = filterFreeTextModels([
      { name: 'openai', output_modalities: ['text'] },
      { name: 'paid-text', output_modalities: ['text'], paid_only: true },
      { name: 'audio-only', output_modalities: ['audio'] },
      { name: 'text-and-audio', output_modalities: ['text', 'audio'] },
      { nope: true },
    ]);

    expect(result.map((model) => model.name)).toEqual(['openai', 'text-and-audio']);
  });

  it('keeps only free image-output models and excludes video models', () => {
    const result = filterFreeImageModels([
      { name: 'flux', output_modalities: ['image'] },
      { name: 'veo', output_modalities: ['video'], paid_only: true },
      { name: 'hybrid-video', output_modalities: ['image', 'video'] },
      { name: 'paid-image', output_modalities: ['image'], paidOnly: true },
      { name: 'kontext', output_modalities: ['image'], aliases: ['edit'] },
    ]);

    expect(result.map((model) => model.name)).toEqual(['flux', 'kontext']);
    expect(result[1]?.aliases).toEqual(['edit']);
  });
});
