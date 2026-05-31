import { NextResponse } from 'next/server';

import { generateSingleStoryboardFrame } from '@/lib/pollinations';
import type { BriefInput, HookAngle, ScriptVariant, StoryboardFrame } from '@/lib/types';

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
  if (!value || typeof value !== 'object') throw new Error('Missing angle payload.');
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

function validateVariant(value: unknown): ScriptVariant {
  if (!value || typeof value !== 'object') throw new Error('Missing script variant payload.');
  const v = value as Record<string, unknown>;
  if (
    typeof v.variantLabel !== 'string' ||
    typeof v.scriptBody !== 'string' ||
    typeof v.durationEstimate !== 'string'
  ) {
    throw new Error('Malformed script variant data.');
  }
  return {
    variantLabel: String(v.variantLabel),
    scriptBody: String(v.scriptBody),
    durationEstimate: String(v.durationEstimate),
    platform: typeof v.platform === 'string' ? v.platform : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      brief?: unknown;
      angle?: unknown;
      variant?: unknown;
      sceneNumber?: unknown;
      existingFrames?: unknown;
      clientKey?: string;
      textModel?: string;
      imageModel?: string;
    };

    const brief = validateBrief(body.brief);
    const angle = validateAngle(body.angle);
    const variant = validateVariant(body.variant);
    const sceneNumber = Number(body.sceneNumber);
    const existingFrames = Array.isArray(body.existingFrames)
      ? (body.existingFrames as StoryboardFrame[])
      : undefined;

    if (!sceneNumber || sceneNumber < 1 || sceneNumber > 5) {
      throw new Error('sceneNumber must be between 1 and 5.');
    }

    const clientKey =
      typeof body.clientKey === 'string' && body.clientKey.trim()
        ? body.clientKey.trim()
        : undefined;
    const textModel = typeof body.textModel === 'string' && body.textModel.trim() ? body.textModel.trim() : undefined;
    const imageModel = typeof body.imageModel === 'string' && body.imageModel.trim() ? body.imageModel.trim() : undefined;

    const frame = await generateSingleStoryboardFrame(
      brief,
      angle,
      variant,
      sceneNumber,
      existingFrames,
      clientKey,
      textModel,
      imageModel
    );

    return NextResponse.json({ frame, sceneNumber });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
