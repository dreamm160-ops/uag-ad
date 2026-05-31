export interface PollinationsModelOption {
  name: string;
  description: string;
  aliases: string[];
  inputModalities: string[];
  outputModalities: string[];
}

interface PollinationsModelRecord extends PollinationsModelOption {
  paidOnly: boolean;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeModel(value: unknown): PollinationsModelRecord | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;
  if (typeof raw.name !== 'string' || !raw.name.trim()) return null;

  return {
    name: raw.name.trim(),
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    aliases: asStringArray(raw.aliases),
    inputModalities: asStringArray(raw.input_modalities),
    outputModalities: asStringArray(raw.output_modalities),
    paidOnly: raw.paidOnly === true || raw.paid_only === true,
  };
}

function toOption(model: PollinationsModelRecord): PollinationsModelOption {
  return {
    name: model.name,
    description: model.description,
    aliases: model.aliases,
    inputModalities: model.inputModalities,
    outputModalities: model.outputModalities,
  };
}

export function filterFreeTextModels(payload: unknown): PollinationsModelOption[] {
  if (!Array.isArray(payload)) return [];

  return payload
    .map(normalizeModel)
    .filter((model): model is PollinationsModelRecord => !!model)
    .filter((model) => !model.paidOnly)
    .filter((model) => model.outputModalities.includes('text'))
    .map(toOption);
}

export function filterFreeImageModels(payload: unknown): PollinationsModelOption[] {
  if (!Array.isArray(payload)) return [];

  return payload
    .map(normalizeModel)
    .filter((model): model is PollinationsModelRecord => !!model)
    .filter((model) => !model.paidOnly)
    .filter((model) => model.outputModalities.includes('image'))
    .filter((model) => !model.outputModalities.includes('video'))
    .map(toOption);
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; UGC-Ad-Studio/1.0; +https://gen.pollinations.ai)',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Pollinations model discovery failed (${response.status}) for ${url}`);
  }

  return response.json();
}

export async function fetchPollinationsModelOptions(): Promise<{
  textModels: PollinationsModelOption[];
  imageModels: PollinationsModelOption[];
}> {
  const [textPayload, imagePayload] = await Promise.all([
    fetchJson('https://gen.pollinations.ai/text/models'),
    fetchJson('https://gen.pollinations.ai/image/models'),
  ]);

  const textModels = filterFreeTextModels(textPayload);
  const imageModels = filterFreeImageModels(imagePayload);

  if (textModels.length === 0) {
    throw new Error('Pollinations returned no free text models.');
  }

  if (imageModels.length === 0) {
    throw new Error('Pollinations returned no free image models.');
  }

  return { textModels, imageModels };
}
