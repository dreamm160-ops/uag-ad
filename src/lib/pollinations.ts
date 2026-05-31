import type { BriefInput, HookGenerationResult, HookMatrix, HookAngle, ScriptGenerationResult, ScriptVariant, ShotList, Shot, StoryboardResult, StoryboardFrame } from './types';

const POLLINATIONS_BASE_URL = 'https://gen.pollinations.ai';

// ---------------------------------------------------------------------------
// Config — strict BYOP for app runtime (user key > optional mock for local development)
// ---------------------------------------------------------------------------

interface PollinationsConfig {
  apiKey: string;
  model: string;
  allowMock: boolean;
}

function getPollinationsConfig(clientKey?: string, modelOverride?: string): PollinationsConfig {
  const apiKey = clientKey || '';
  const model = modelOverride?.trim() || process.env.POLLINATIONS_TEXT_MODEL || 'openai';
  const allowMock = process.env.POLLINATIONS_ALLOW_MOCK === 'true';

  return { apiKey, model, allowMock };
}

function getImageModel(imageModelOverride?: string): string {
  return imageModelOverride?.trim() || process.env.POLLINATIONS_IMAGE_MODEL || 'flux';
}

function imageQuery(imageModelOverride?: string, apiKey?: string): string {
  const imageModel = getImageModel(imageModelOverride);
  const keyParam = apiKey ? `&key=${apiKey}` : '';
  return `width=512&height=768&nologo=true&model=${encodeURIComponent(imageModel)}${keyParam}`;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function extractJson(content: string): unknown {
  const trimmed = content.trim();

  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1]);
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  }

  throw new Error('Model did not return valid JSON.');
}

// ---------------------------------------------------------------------------
// Hook matrix generation
// ---------------------------------------------------------------------------

function buildUserPrompt(brief: BriefInput): string {
  return [
    'You are a senior DTC creative strategist. Create a UGC ad hook matrix for the following product brief.',
    'Return JSON only. No markdown. No commentary.',
    '',
    'QUALITY RULES:',
    '- Each hook must feel like something a real creator would actually SAY on camera, not ad-copy speak.',
    '- Hooks must be scroll-stopping in the first 2 seconds. No "Introducing..." or "Are you tired of..." generics.',
    '- Use the product name at most once per angle. Prefer implications and specificity.',
    '- CTAs must be action-oriented with a concrete next step, not vague "Learn more" text.',
    '- Rationales should explain WHY this angle works for THIS audience, not why angles work in general.',
    '',
    'Need 4 distinct angles. Each angle needs exactly 3 hooks and 1 CTA.',
    '',
    `Product name: ${brief.productName}`,
    `Product description: ${brief.productDescription}`,
    `Target audience: ${brief.targetAudience}`,
    `Offer: ${brief.offer}`,
    `Tone: ${brief.tone}`,
    `Primary goal: ${brief.primaryGoal}`,
    `Landing page URL: ${brief.landingPageUrl || 'N/A'}`,
    `Constraints: ${brief.constraints || 'None provided'}`,
    '',
    'JSON shape:',
    '{',
    '  "productSummary": string,',
    '  "audienceSummary": string,',
    '  "angles": [',
    '    {',
    '      "angle": string,',
    '      "rationale": string,',
    '      "hooks": [string, string, string],',
    '      "cta": string',
    '    }',
    '  ]',
    '}',
  ].join('\n');
}

function validateMatrix(value: unknown): HookMatrix {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid hook matrix payload.');
  }

  const matrix = value as HookMatrix;

  if (
    typeof matrix.productSummary !== 'string' ||
    typeof matrix.audienceSummary !== 'string' ||
    !Array.isArray(matrix.angles) ||
    matrix.angles.length === 0
  ) {
    throw new Error('Hook matrix is missing required fields.');
  }

  for (const angle of matrix.angles) {
    if (
      !angle ||
      typeof angle.angle !== 'string' ||
      typeof angle.rationale !== 'string' ||
      typeof angle.cta !== 'string' ||
      !Array.isArray(angle.hooks) ||
      angle.hooks.length !== 3 ||
      angle.hooks.some((hook) => typeof hook !== 'string')
    ) {
      throw new Error('Hook matrix contains malformed angle data.');
    }
  }

  return matrix;
}

function mockMatrix(brief: BriefInput): HookMatrix {
  return {
    productSummary: `${brief.productName} is positioned as a simple, creator-friendly solution with a clear consumer benefit and offer pressure.`,
    audienceSummary: `Best framed for ${brief.targetAudience} with a ${brief.tone} tone and direct purchase intent.`,
    angles: [
      {
        angle: 'Problem-first interruption',
        rationale: 'Open by naming the frustration the audience already feels.',
        hooks: [
          `"I almost scrolled past this — but then I saw the ${brief.offer}"`,
          `"If you're still [common frustration], this is for you."`,
          `"Stop scrolling — this ${brief.tone} take on ${brief.productName} is different."`,
        ],
        cta: `Tap the link — ${brief.offer} won't last.`,
      },
      {
        angle: 'Social proof / credibility',
        rationale: 'Lead with implied or explicit proof that others trust this.',
        hooks: [
          `"The reason [target audience] keep switching to ${brief.productName}"`,
          `"I didn't believe the hype either. Then I tried it."`,
          `"Everyone in [niche] is talking about this — here's why."`,
        ],
        cta: `See why thousands chose ${brief.productName} →`,
      },
      {
        angle: 'Offer / urgency',
        rationale: 'Push the deal front and center.',
        hooks: [
          `"${brief.offer} — but only if you act right now"`,
          `"You're leaving ${brief.offer} on the table if you skip this."`,
          `"Last chance: ${brief.offer} ends tonight."`,
        ],
        cta: `Claim ${brief.offer} before it's gone →`,
      },
      {
        angle: 'Transformation / aspiration',
        rationale: 'Paint the before/after in one line.',
        hooks: [
          `"From [frustration] to [result] — ${brief.productName} did that."`,
          `"This is what ${brief.primaryGoal} actually looks like."`,
          `"Imagine [aspirational outcome]. Now stop imagining."`,
        ],
        cta: `Start your transformation →`,
      },
    ],
  };
}

export async function generateHooks(brief: BriefInput, clientKey?: string, modelOverride?: string): Promise<HookGenerationResult> {
  const { apiKey, model, allowMock } = getPollinationsConfig(clientKey, modelOverride);

  if (!apiKey) {
    if (!allowMock) {
      throw new Error(
        'Missing Pollinations user key. Log in with Pollinations in the "Connect Pollinations" panel before generating.'
      );
    }

    return {
      brief,
      matrix: mockMatrix(brief),
      model: 'mock',
      generatedAt: new Date().toISOString(),
      mock: true,
    };
  }

  const response = await fetch(`${POLLINATIONS_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior DTC creative strategist. Produce structured, usable ad ideation. Do not be generic. Return JSON only.',
        },
        {
          role: 'user',
          content: buildUserPrompt(brief),
        },
      ],
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pollinations request failed (${response.status}): ${text.slice(0, 500)}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };
  const content = json.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Pollinations returned an empty completion.');
  }

  const matrix = validateMatrix(extractJson(content));

  return {
    brief,
    matrix,
    model: json.model || model,
    generatedAt: new Date().toISOString(),
    mock: false,
  };
}

// ---------------------------------------------------------------------------
// Script + shot list generation
// ---------------------------------------------------------------------------

function buildScriptPrompt(brief: BriefInput, angle: HookAngle): string {
  return [
    'You are a senior DTC ad scriptwriter and creative director. Create UGC ad script variants and a shot list for the following product brief and chosen angle.',
    'Return JSON only. No markdown. No commentary.',
    '',
    'QUALITY RULES:',
    '- Scripts must sound like a real creator talking to camera, NOT ad-copy. Use conversational contractions, natural pauses, and first-person framing.',
    '- HOOK section must match the hook from the chosen angle exactly — do not paraphrase it.',
    '- BODY should advance one clear idea: proof, demo, or story. No laundry lists of features.',
    '- CTA must be direct and include the offer or a concrete next step, not "Learn more" or "Shop now."',
    '- Shot descriptions must be filmable by a solo creator with a phone and a ring light. No drone shots, no studio rigs.',
    '- Audio direction should specify what the creator SAYS or what ambient sound plays — not "upbeat music."',
    '',
    `Product name: ${brief.productName}`,
    `Product description: ${brief.productDescription}`,
    `Target audience: ${brief.targetAudience}`,
    `Tone: ${brief.tone}`,
    `Offer: ${brief.offer}`,
    `Primary goal: ${brief.primaryGoal}`,
    '',
    'Chosen angle:',
    `  angle: ${angle.angle}`,
    `  rationale: ${angle.rationale}`,
    `  hooks: ${angle.hooks.join(' | ')}`,
    `  cta: ${angle.cta}`,
    '',
    'Requirements for script variants:',
    '  - 3 script variants, each with a distinct pacing/structure.',
    '  - Each variant: variantLabel, scriptBody (full script text), durationEstimate, platform.',
    '  - Script body should include HOOK / BODY / CTA sections.',
    '',
    'Requirements for shot list:',
    '  - 5 shots matching the script structure.',
    '  - Each shot: sceneNumber, shotType, description, audioDirection, visualNote, durationEstimate.',
    '  - Include totalDurationEstimate for the full shot list.',
    '',
    'JSON shape:',
    '{',
    '  "variants": [',
    '    { "variantLabel": string, "scriptBody": string, "durationEstimate": string, "platform": string }',
    '  ],',
    '  "shotList": {',
    '    "totalDurationEstimate": string,',
    '    "shots": [',
    '      { "sceneNumber": number, "shotType": string, "description": string, "audioDirection": string, "visualNote": string, "durationEstimate": string }',
    '    ]',
    '  }',
    '}',
  ].join('\n');
}

function extractScriptJson(content: string): { variants: ScriptVariant[]; shotList: ShotList } {
  const raw = extractJson(content) as Record<string, unknown>;

  if (!Array.isArray(raw.variants)) throw new Error('Missing variants array.');

  const variants: ScriptVariant[] = raw.variants.map((v: Record<string, unknown>) => ({
    variantLabel: String(v.variantLabel || 'Untitled'),
    scriptBody: String(v.scriptBody || ''),
    durationEstimate: String(v.durationEstimate || '?'),
    platform: v.platform ? String(v.platform) : undefined,
  }));

  const shotListRaw = raw.shotList as Record<string, unknown> | undefined;
  if (!shotListRaw || !Array.isArray(shotListRaw.shots)) throw new Error('Missing shotList.');

  const shots: Shot[] = (shotListRaw.shots as Record<string, unknown>[]).map((s) => ({
    sceneNumber: Number(s.sceneNumber) || 0,
    shotType: String(s.shotType || ''),
    description: String(s.description || ''),
    audioDirection: String(s.audioDirection || ''),
    visualNote: String(s.visualNote || ''),
    durationEstimate: String(s.durationEstimate || ''),
  }));

  return {
    variants,
    shotList: {
      totalDurationEstimate: String(shotListRaw.totalDurationEstimate || ''),
      shots,
    },
  };
}

function mockScripts(brief: BriefInput, angle: HookAngle): { variants: ScriptVariant[]; shotList: ShotList } {
  const hook = angle.hooks[0];
  const cta = angle.cta;
  const scriptBody1 = `HOOK:\n${hook}\n\nBODY:\n• Quick unboxing feel showing ${brief.productName}.\n• Mention the ${brief.offer} and why it makes sense now.\n• Show the result in a natural, unpolished moment.\n\nCTA:\n${cta}`;
  const scriptBody2 = `HOOK:\n${angle.hooks[1]}\n\nBODY:\n• Story-first: "I almost skipped this, but..."\n• Walk through one real use scenario.\n• Tie the payoff to ${brief.primaryGoal}.\n\nCTA:\n${cta}`;
  const scriptBody3 = `HOOK:\n${angle.hooks[2]}\n\nBODY:\n• Direct demo, no fluff.\n• Address the main objection in one line.\n• Repeat the offer once more.\n\nCTA:\n${cta}`;

  const shots: Shot[] = [
    { sceneNumber: 1, shotType: 'Hook / grab', description: 'Creator looks at camera and delivers hook line. No logo visible yet.', audioDirection: 'Natural voice or quick voiceover hook.', visualNote: 'Tight frame, eye contact, slight motion.', durationEstimate: '3-5s' },
    { sceneNumber: 2, shotType: 'Context / product reveal', description: `Show ${brief.productName} in the setting where it's used.`, audioDirection: 'Soft ambient or voiceover transition.', visualNote: 'Hand-held or static close-up. Natural lighting.', durationEstimate: '4-7s' },
    { sceneNumber: 3, shotType: 'Benefit / proof', description: 'Demonstrate the key payoff. Before/after or reaction shot.', audioDirection: 'Voiceover explaining result or reaction audio.', visualNote: 'Close-up on product action or face reaction.', durationEstimate: '5-8s' },
    { sceneNumber: 4, shotType: 'Offer / urgency', description: `Show the ${brief.offer} on screen or creator mentions it.`, audioDirection: 'Voiceover: "The offer ends soon."', visualNote: 'Text overlay safe area. Product in frame.', durationEstimate: '3-5s' },
    { sceneNumber: 5, shotType: 'CTA / outro', description: 'Creator points to link or screen shows URL/QR.', audioDirection: 'Short CTA line or music swell.', visualNote: 'End card safe zone. Clear brand handle.', durationEstimate: '2-4s' },
  ];

  return {
    variants: [
      { variantLabel: 'Direct demo (fast)', scriptBody: scriptBody1, durationEstimate: '15-25s', platform: 'Reels / Shorts' },
      { variantLabel: 'Story hook (mid)', scriptBody: scriptBody2, durationEstimate: '25-40s', platform: 'TikTok / Reels' },
      { variantLabel: 'Objection buster (short)', scriptBody: scriptBody3, durationEstimate: '15-20s', platform: 'Shorts / Reels' },
    ],
    shotList: {
      totalDurationEstimate: '20-35s depending on pacing',
      shots,
    },
  };
}

export async function generateScripts(brief: BriefInput, angle: HookAngle, clientKey?: string, modelOverride?: string): Promise<ScriptGenerationResult> {
  const { apiKey, model, allowMock } = getPollinationsConfig(clientKey, modelOverride);

  if (!apiKey) {
    if (!allowMock) {
      throw new Error(
        'Missing Pollinations user key. Log in with Pollinations in the "Connect Pollinations" panel before generating.'
      );
    }

    const { variants, shotList } = mockScripts(brief, angle);

    return {
      brief,
      angle,
      variants,
      shotList,
      model: 'mock',
      generatedAt: new Date().toISOString(),
      mock: true,
    };
  }

  const response = await fetch(`${POLLINATIONS_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.85,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior DTC ad scriptwriter and creative director. Produce usable, production-ready UGC scripts and shot lists. Return JSON only.',
        },
        {
          role: 'user',
          content: buildScriptPrompt(brief, angle),
        },
      ],
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pollinations request failed (${response.status}): ${text.slice(0, 500)}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };
  const content = json.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Pollinations returned an empty completion.');
  }

  const { variants, shotList } = extractScriptJson(content);

  return {
    brief,
    angle,
    variants,
    shotList,
    model: json.model || model,
    generatedAt: new Date().toISOString(),
    mock: false,
  };
}

// ---------------------------------------------------------------------------
// Storyboard frame generation
// ---------------------------------------------------------------------------

function buildStoryboardPrompt(brief: BriefInput, angle: HookAngle, script: ScriptVariant): string {
  return [
    'You are a senior DTC creative director and storyboard artist. Create a storyboard prompt plan for a UGC ad based on the following script and angle.',
    'Return JSON only. No markdown. No commentary.',
    '',
    'QUALITY RULES:',
    '- Image prompts must produce realistic, creator-shot-looking frames — NOT polished studio photos or 3D renders.',
    '- Every prompt should include: subject, action, lighting (natural/ambient), setting, camera angle, and mood.',
    '- Use terms like "handheld framing", "natural ring light", "phone camera quality", "shallow depth of field" to ensure UGC realism.',
    '- Avoid: "professional studio", "cinematic", "high-end", "polished", "commercial" — these make output look fake.',
    '- Each prompt should be 40-70 words and specific enough that the same prompt run twice gives a similar frame.',
    '',
    `Product name: ${brief.productName}`,
    `Product description: ${brief.productDescription}`,
    `Target audience: ${brief.targetAudience}`,
    `Tone: ${brief.tone}`,
    '',
    'Chosen angle:',
    `  angle: ${angle.angle}`,
    `  hooks: ${angle.hooks.join(' | ')}`,
    `  cta: ${angle.cta}`,
    '',
    'Script:',
    script.scriptBody,
    '',
    'Requirements:',
    '  - 5 storyboard frames.',
    '  - Each frame includes sceneNumber, shotType, prompt (detailed image generation prompt for Pollinations), caption (one-line description).',
    '  - Do not generate URLs. Generate descriptive prompts that can be passed to an image model.',
    '',
    'JSON shape:',
    '{',
    '  "frames": [',
    '    { "sceneNumber": number, "shotType": string, "prompt": string, "caption": string }',
    '  ]',
    '}',
  ].join('\n');
}

function extractStoryboardJson(content: string): StoryboardFrame[] {
  const raw = extractJson(content) as Record<string, unknown>;
  if (!Array.isArray(raw.frames)) throw new Error('Missing frames array.');

  for (const f of raw.frames as StoryboardFrame[]) {
    if (
      typeof f.sceneNumber !== 'number' ||
      typeof f.shotType !== 'string' ||
      typeof f.prompt !== 'string' ||
      typeof f.caption !== 'string'
    ) {
      throw new Error('Malformed storyboard frame.');
    }
  }

  return raw.frames as StoryboardFrame[];
}

function mockStoryboardFrames(brief: BriefInput, angle: HookAngle, script: ScriptVariant, apiKey?: string, imageModelOverride?: string): StoryboardResult {
  const baseUrl = 'https://gen.pollinations.ai/image/';
  const query = imageQuery(imageModelOverride, apiKey);

  const frames: StoryboardFrame[] = [
    {
      sceneNumber: 1,
      shotType: 'Hook / grab',
      prompt: `A cinematic close-up of a young creator making eye contact with the camera, warm natural lighting, slightly blurred background, modern minimal apartment, excited subtle expression, product ${brief.productName} barely visible, shallow depth of field, film grain, highly detailed, 8k, UGC style still`,
      imageUrl: `${baseUrl}${encodeURIComponent(`A cinematic close-up of a young creator making eye contact with the camera, warm natural lighting, slightly blurred background, modern minimal apartment, excited subtle expression, product ${brief.productName} barely visible, shallow depth of field, film grain, highly detailed, 8k, UGC style still`)}?${query}`,
      caption: `Scene 1 — Hook shot: creator grabs attention with direct eye contact.`,
    },
    {
      sceneNumber: 2,
      shotType: 'Context / product reveal',
      prompt: `A top-down flat lay of ${brief.productName} on a clean marble surface next to a phone and sunglasses, soft daylight, crisp product focus, modern DTC aesthetic, highly detailed, 8k, UGC style still`,
      imageUrl: `${baseUrl}${encodeURIComponent(`A top-down flat lay of ${brief.productName} on a clean marble surface next to a phone and sunglasses, soft daylight, crisp product focus, modern DTC aesthetic, highly detailed, 8k, UGC style still`)}?${query}`,
      caption: `Scene 2 — Product reveal: product shown in natural context.`,
    },
    {
      sceneNumber: 3,
      shotType: 'Benefit / proof',
      prompt: `A person using ${brief.productName} in a real moment of satisfaction, candid expression, authentic lighting, modern home setting, soft bokeh background, relatable genuine emotion, highly detailed, 8k, UGC style still`,
      imageUrl: `${baseUrl}${encodeURIComponent(`A person using ${brief.productName} in a real moment of satisfaction, candid expression, authentic lighting, modern home setting, soft bokeh background, relatable genuine emotion, highly detailed, 8k, UGC style still`)}?${query}`,
      caption: `Scene 3 — Benefit moment: real person experiencing the product result.`,
    },
    {
      sceneNumber: 4,
      shotType: 'Offer / urgency',
      prompt: `Bold modern graphic overlay on a handheld product shot of ${brief.productName}, minimal text-safe area centered, clean sans-serif style, warm ambient lighting, studio-quality UGC aesthetic, highly detailed, 8k`,
      imageUrl: `${baseUrl}${encodeURIComponent(`Bold modern graphic overlay on a handheld product shot of ${brief.productName}, minimal text-safe area centered, clean sans-serif style, warm ambient lighting, studio-quality UGC aesthetic, highly detailed, 8k`)}?${query}`,
      caption: `Scene 4 — Offer overlay: product held up with offer text space.`,
    },
    {
      sceneNumber: 5,
      shotType: 'CTA / outro',
      prompt: `Creator pointing at camera with friendly confident expression, soft ring light catchlight in eyes, modern minimal background, end-card safe zone for logo and URL, clean aesthetic, highly detailed, 8k, UGC style still`,
      imageUrl: `${baseUrl}${encodeURIComponent(`Creator pointing at camera with friendly confident expression, soft ring light catchlight in eyes, modern minimal background, end-card safe zone for logo and URL, clean aesthetic, highly detailed, 8k, UGC style still`)}?${query}`,
      caption: `Scene 5 — CTA outro: creator points to link / screen-safe end card.`,
    },
  ];

  return {
    frames,
    model: 'mock',
    generatedAt: new Date().toISOString(),
    mock: true,
  };
}

export async function generateStoryboard(
  brief: BriefInput,
  angle: HookAngle,
  script: ScriptVariant,
  clientKey?: string,
  modelOverride?: string,
  imageModelOverride?: string
): Promise<StoryboardResult> {
  const { apiKey, model, allowMock } = getPollinationsConfig(clientKey, modelOverride);
  const imageModel = getImageModel(imageModelOverride);

  if (!apiKey) {
    if (!allowMock) {
      throw new Error(
        'Missing Pollinations user key. Log in with Pollinations in the "Connect Pollinations" panel before generating.'
      );
    }
    return mockStoryboardFrames(brief, angle, script, apiKey, imageModel);
  }

  const response = await fetch(`${POLLINATIONS_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.85,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior DTC creative director and storyboard artist. Produce detailed image prompts for UGC ad storyboard frames. Return JSON only.',
        },
        {
          role: 'user',
          content: buildStoryboardPrompt(brief, angle, script),
        },
      ],
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pollinations request failed (${response.status}): ${text.slice(0, 500)}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };
  const content = json.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Pollinations returned an empty completion.');
  }

  const query = imageQuery(imageModel, apiKey);
  const frames = extractStoryboardJson(content).map((frame) => ({
    ...frame,
    imageUrl: `https://gen.pollinations.ai/image/${encodeURIComponent(frame.prompt)}?${query}`,
  }));

  return {
    frames,
    model: `${json.model || model} / image:${imageModel}`,
    generatedAt: new Date().toISOString(),
    mock: false,
  };
}

// ---------------------------------------------------------------------------
// Single-frame regeneration (per-scene regenerate)
// ---------------------------------------------------------------------------

function buildSingleFramePrompt(
  brief: BriefInput,
  angle: HookAngle,
  script: ScriptVariant,
  sceneNumber: number,
  existingFrames?: StoryboardFrame[]
): string {
  const contextLines = existingFrames
    ? existingFrames
        .map((f) => `  Scene ${f.sceneNumber} (${f.shotType}): ${f.caption}`)
        .join('\n')
    : '';

  return [
    'You are a senior DTC creative director and storyboard artist. Regenerate a SINGLE storyboard frame for a UGC ad.',
    'Return JSON only. No markdown. No commentary.',
    '',
    'QUALITY RULES:',
    '- Image prompts must produce realistic, creator-shot-looking frames — NOT polished studio photos or 3D renders.',
    '- Every prompt should include: subject, action, lighting (natural/ambient), setting, camera angle, and mood.',
    '- Use terms like "handheld framing", "natural ring light", "phone camera quality", "shallow depth of field" to ensure UGC realism.',
    '- Avoid: "professional studio", "cinematic", "high-end", "polished", "commercial" — these make output look fake.',
    '- Each prompt should be 40-70 words and specific enough that the same prompt run twice gives a similar frame.',
    '- The regenerated frame must be DISTINCT from the existing version. Different angle, composition, or lighting — not a minor tweak.',
    '',
    `Product name: ${brief.productName}`,
    `Product description: ${brief.productDescription}`,
    `Target audience: ${brief.targetAudience}`,
    `Tone: ${brief.tone}`,
    '',
    'Chosen angle:',
    `  angle: ${angle.angle}`,
    `  hooks: ${angle.hooks.join(' | ')}`,
    `  cta: ${angle.cta}`,
    '',
    'Script:',
    script.scriptBody,
    '',
    `Regenerate scene ${sceneNumber}.`,
    contextLines ? `Existing frames (for context — do NOT duplicate these):\n${contextLines}` : '',
    '',
    'Return a single frame object:',
    '{',
    '  "sceneNumber": number,',
    '  "shotType": string,',
    '  "prompt": string,',
    '  "caption": string',
    '}',
  ].join('\n');
}

function mockSingleFrame(
  brief: BriefInput,
  sceneNumber: number,
  apiKey?: string,
  imageModelOverride?: string
): StoryboardFrame {
  const baseUrl = 'https://gen.pollinations.ai/image/';
  const query = imageQuery(imageModelOverride, apiKey);

  const shotTypes: Record<number, { shotType: string; prompt: string; caption: string }> = {
    1: {
      shotType: 'Hook / grab',
      prompt: `A creator catching attention with a surprising expression, holding ${brief.productName} partially hidden, warm golden hour lighting, shallow depth of field, phone camera framing, genuine excitement, UGC style still, highly detailed`,
      caption: `Scene ${sceneNumber} — Hook: creator surprises viewer with product reveal.`,
    },
    2: {
      shotType: 'Context / product reveal',
      prompt: `A creator unboxing ${brief.productName} on a messy desk, natural window light from left, phone propped at eye level, authentic unstyled workspace, product in focus, UGC style still, highly detailed`,
      caption: `Scene ${sceneNumber} — Product reveal: casual unboxing moment.`,
    },
    3: {
      shotType: 'Benefit / proof',
      prompt: `Close-up of hands using ${brief.productName}, visible result on skin or surface, soft ring light illumination, bathroom or kitchen counter, candid personal moment, UGC style still, highly detailed`,
      caption: `Scene ${sceneNumber} — Benefit: real result shown casually.`,
    },
    4: {
      shotType: 'Offer / urgency',
      prompt: `Creator holding ${brief.productName} near camera with excited gesture, screen left space for text overlay, warm backlight, confident smile, phone camera quality, UGC style still, highly detailed`,
      caption: `Scene ${sceneNumber} — Offer: product held with text-safe composition.`,
    },
    5: {
      shotType: 'CTA / outro',
      prompt: `Creator pointing downward toward link area with warm smile, end-card composition with space for logo, soft ring light catchlight, modern minimal background, confident friendly expression, UGC style still, highly detailed`,
      caption: `Scene ${sceneNumber} — CTA: creator directs to link.`,
    },
  };

  const frame = shotTypes[sceneNumber] || shotTypes[1];

  return {
    sceneNumber,
    shotType: frame.shotType,
    prompt: frame.prompt,
    imageUrl: `${baseUrl}${encodeURIComponent(frame.prompt)}?${query}`,
    caption: frame.caption,
  };
}

export async function generateSingleStoryboardFrame(
  brief: BriefInput,
  angle: HookAngle,
  script: ScriptVariant,
  sceneNumber: number,
  existingFrames: StoryboardFrame[] | undefined,
  clientKey?: string,
  modelOverride?: string,
  imageModelOverride?: string
): Promise<StoryboardFrame> {
  const { apiKey, model, allowMock } = getPollinationsConfig(clientKey, modelOverride);
  const imageModel = getImageModel(imageModelOverride);

  if (!apiKey) {
    if (!allowMock) {
      throw new Error(
        'Missing Pollinations user key. Log in with Pollinations in the "Connect Pollinations" panel before generating.'
      );
    }
    return mockSingleFrame(brief, sceneNumber, apiKey, imageModel);
  }

  const response = await fetch(`${POLLINATIONS_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior DTC creative director and storyboard artist. Produce a single storyboard frame with a detailed image prompt. Return JSON only.',
        },
        {
          role: 'user',
          content: buildSingleFramePrompt(brief, angle, script, sceneNumber, existingFrames),
        },
      ],
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pollinations request failed (${response.status}): ${text.slice(0, 500)}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };
  const content = json.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Pollinations returned an empty completion.');
  }

  const query = imageQuery(imageModel, apiKey);
  const parsed = extractJson(content) as StoryboardFrame;

  if (
    typeof parsed.sceneNumber !== 'number' ||
    typeof parsed.shotType !== 'string' ||
    typeof parsed.prompt !== 'string' ||
    typeof parsed.caption !== 'string'
  ) {
    throw new Error('Model returned malformed frame data.');
  }

  return {
    sceneNumber,
    shotType: parsed.shotType,
    prompt: parsed.prompt,
    imageUrl: `https://gen.pollinations.ai/image/${encodeURIComponent(parsed.prompt)}?${query}`,
    caption: parsed.caption,
  };
}
