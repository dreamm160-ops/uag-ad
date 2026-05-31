export type BriefInput = {
  productName: string;
  productDescription: string;
  targetAudience: string;
  offer: string;
  tone: string;
  primaryGoal: string;
  landingPageUrl?: string;
  constraints?: string;
};

export type HookAngle = {
  angle: string;
  rationale: string;
  hooks: string[];
  cta: string;
};

export type HookMatrix = {
  productSummary: string;
  audienceSummary: string;
  angles: HookAngle[];
};

export type ScriptVariant = {
  variantLabel: string;
  scriptBody: string;
  durationEstimate: string;
  platform?: string;
};

export type Shot = {
  sceneNumber: number;
  shotType: string;
  description: string;
  audioDirection: string;
  visualNote: string;
  durationEstimate: string;
};

export type ShotList = {
  totalDurationEstimate: string;
  shots: Shot[];
};

export type ScriptGenerationResult = {
  brief: BriefInput;
  angle: HookAngle;
  variants: ScriptVariant[];
  shotList: ShotList;
  model: string;
  generatedAt: string;
  mock: boolean;
};

export type StoryboardFrame = {
  sceneNumber: number;
  shotType: string;
  prompt: string;
  imageUrl: string;
  caption: string;
};

export type StoryboardResult = {
  frames: StoryboardFrame[];
  model: string;
  generatedAt: string;
  mock: boolean;
};

export type HookGenerationResult = {
  brief: BriefInput;
  matrix: HookMatrix;
  model: string;
  generatedAt: string;
  mock: boolean;
};

export type SavedGeneration = {
  id: string;
  title: string;
  brief: BriefInput;
  selectedAngle: HookAngle;
  scriptResult: ScriptGenerationResult;
  selectedVariant: ScriptVariant;
  storyboardResult: StoryboardResult;
  savedAt: string;
  source: 'example' | 'recent';
};
