import { NextResponse } from 'next/server';

import { generateScripts } from '@/lib/pollinations';
import type { BriefInput, HookAngle } from '@/lib/types';

function validateBrief(value: unknown): BriefInput {
  if (!value || typeof value !== 'object') {
    throw new Error('Missing brief payload.');
  }

  const brief = value as Record<string, unknown>;
  const required = [
    'productName',
    'productDescription',
    'targetAudience',
    'offer',
    'tone',
    'primaryGoal',
  ] as const;

  for (const key of required) {
    if (typeof brief[key] !== 'string' || !brief[key]?.trim()) {
      throw new Error(`Field ${key} is required.`);
    }
  }

  return {
    productName: String(brief.productName).trim(),
    productDescription: String(brief.productDescription).trim(),
    targetAudience: String(brief.targetAudience).trim(),
    offer: String(brief.offer).trim(),
    tone: String(brief.tone).trim(),
    primaryGoal: String(brief.primaryGoal).trim(),
    landingPageUrl: typeof brief.landingPageUrl === 'string' ? brief.landingPageUrl.trim() : '',
    constraints: typeof brief.constraints === 'string' ? brief.constraints.trim() : '',
  };
}

function validateAngle(value: unknown): HookAngle {
  if (!value || typeof value !== 'object') {
    throw new Error('Missing angle payload.');
  }

  const angle = value as Record<string, unknown>;

  if (
    typeof angle.angle !== 'string' ||
    typeof angle.rationale !== 'string' ||
    typeof angle.cta !== 'string' ||
    !Array.isArray(angle.hooks) ||
    angle.hooks.length !== 3 ||
    angle.hooks.some((h) => typeof h !== 'string')
  ) {
    throw new Error('Malformed angle data.');
  }

  return {
    angle: String(angle.angle),
    rationale: String(angle.rationale),
    hooks: angle.hooks.map(String),
    cta: String(angle.cta),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { brief?: unknown; angle?: unknown; clientKey?: string; textModel?: string };
    const brief = validateBrief(body.brief);
    const angle = validateAngle(body.angle);
    const clientKey = typeof body.clientKey === 'string' && body.clientKey.trim() ? body.clientKey.trim() : undefined;
    const textModel = typeof body.textModel === 'string' && body.textModel.trim() ? body.textModel.trim() : undefined;
    const result = await generateScripts(brief, angle, clientKey, textModel);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
