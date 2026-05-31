'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { exampleResults } from '@/lib/example-results';
import type { PollinationsModelOption } from '@/lib/pollinations-models';
import { sampleBriefs } from '@/lib/sample-brief';
import type {
  BriefInput,
  HookAngle,
  HookGenerationResult,
  SavedGeneration,
  ScriptGenerationResult,
  ScriptVariant,
  StoryboardFrame,
  StoryboardResult,
} from '@/lib/types';

const DRAFT_KEY = 'ugc-ad-studio:brief:v1';
const RECENT_GENERATIONS_KEY = 'ugc-ad-studio:recent-generations:v1';
const API_KEY_LS = 'ugc-ad-studio:pollinations-key';
const POLLINATIONS_AUTH_STATE_LS = 'ugc-ad-studio:pollinations-auth-state';
const POLLINATIONS_AUTHORIZE_URL = 'https://enter.pollinations.ai/authorize';
const POLLINATIONS_APP_KEY = process.env.NEXT_PUBLIC_POLLINATIONS_APP_KEY || '';

type Phase = 'home' | 'brief' | 'hooks' | 'scripts' | 'storyboard' | 'export';
type WorkspaceMode =
  | { kind: 'fresh' }
  | { kind: 'viewing_saved'; entry: SavedGeneration }
  | { kind: 'template'; entry: SavedGeneration };

const DEFAULT_TEXT_MODELS: PollinationsModelOption[] = [
  { name: 'openai', description: '', aliases: [], inputModalities: ['text', 'image'], outputModalities: ['text'] },
  { name: 'mistral', description: '', aliases: [], inputModalities: ['text', 'image'], outputModalities: ['text'] },
  { name: 'qwen', description: '', aliases: [], inputModalities: ['text'], outputModalities: ['text'] },
  { name: 'deepseek', description: '', aliases: [], inputModalities: ['text'], outputModalities: ['text'] },
  { name: 'llama', description: '', aliases: [], inputModalities: ['text'], outputModalities: ['text'] },
];

const DEFAULT_IMAGE_MODELS: PollinationsModelOption[] = [
  { name: 'flux', description: '', aliases: [], inputModalities: ['text'], outputModalities: ['image'] },
  { name: 'gptimage', description: '', aliases: [], inputModalities: ['text', 'image'], outputModalities: ['image'] },
  { name: 'gptimage-large', description: '', aliases: [], inputModalities: ['text', 'image'], outputModalities: ['image'] },
  { name: 'kontext', description: '', aliases: [], inputModalities: ['text', 'image'], outputModalities: ['image'] },
];

const initialBrief: BriefInput = {
  productName: '',
  productDescription: '',
  targetAudience: '',
  offer: '',
  tone: '',
  primaryGoal: '',
  landingPageUrl: '',
  constraints: '',
};

function fallbackSvg(frame: StoryboardFrame) {
  const shotType = frame.shotType.replace(/[<>]/g, '');
  const caption = frame.caption.replace(/[<>]/g, '').slice(0, 84);

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="768"><rect fill="%230a0e17" width="512" height="768"/><text fill="%239db0c8" x="50%25" y="38%25" text-anchor="middle" font-size="18" font-family="sans-serif">Scene ${frame.sceneNumber}</text><text fill="%239db0c8" x="50%25" y="45%25" text-anchor="middle" font-size="14" font-family="sans-serif">${encodeURIComponent(shotType)}</text><text fill="%237a8a9e" x="50%25" y="55%25" text-anchor="middle" font-size="12" font-family="sans-serif">${encodeURIComponent(caption)}${frame.caption.length > 84 ? '…' : ''}</text></svg>`;
}

function cleanModelName(name: string): string {
  return name.replace(/^accounts\/[^/]+\/models\//, '');
}

function displayLabel(model: PollinationsModelOption): string {
  if (model.description && model.description.trim()) return model.description.trim();
  const alias = model.aliases?.[0];
  const cleanName = cleanModelName(model.name);
  if (alias && alias !== model.name) return `${alias} · ${cleanName}`;
  return cleanName;
}

function ModelSelects({
  includeImage = false,
  textModelValue,
  imageModelValue,
  textModelList,
  imageModelList,
  onTextChange,
  onImageChange,
  isLoading,
  loadingNote,
  errorNote,
}: {
  includeImage?: boolean;
  textModelValue: string;
  imageModelValue: string;
  textModelList: PollinationsModelOption[];
  imageModelList: PollinationsModelOption[];
  onTextChange: (value: string) => void;
  onImageChange: (value: string) => void;
  isLoading: boolean;
  loadingNote: string | null;
  errorNote: string | null;
}) {
  return (
    <div className="model-controls">
      <label className="model-selector-row">
        <span className="model-label">Text model</span>
        <div className="model-select-wrap">
          <select className="model-select" value={textModelValue} onChange={(event) => onTextChange(event.target.value)} disabled={isLoading}>
            {textModelList.map((model) => (
              <option key={model.name} value={model.name}>{displayLabel(model)}</option>
            ))}
          </select>
        </div>
      </label>
      {includeImage ? (
        <label className="model-selector-row">
          <span className="model-label">Image model</span>
          <div className="model-select-wrap">
            <select className="model-select" value={imageModelValue} onChange={(event) => onImageChange(event.target.value)} disabled={isLoading}>
              {imageModelList.map((model) => (
                <option key={model.name} value={model.name}>{displayLabel(model)}</option>
              ))}
            </select>
          </div>
        </label>
      ) : null}

      {isLoading ? <span className="model-state-note">{loadingNote}</span> : null}
      {!isLoading && errorNote ? <span className="model-state-note warning">{errorNote}</span> : null}
    </div>
  );
}

export default function Page() {
  const [brief, setBrief] = useState<BriefInput>(initialBrief);
  const [hookResult, setHookResult] = useState<HookGenerationResult | null>(null);
  const [selectedAngle, setSelectedAngle] = useState<HookAngle | null>(null);
  const [scriptResult, setScriptResult] = useState<ScriptGenerationResult | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ScriptVariant | null>(null);
  const [storyboardResult, setStoryboardResult] = useState<StoryboardResult | null>(null);
  const [phase, setPhase] = useState<Phase>('home');
  const [loading, setLoading] = useState(false);
  const [storyboardLoading, setStoryboardLoading] = useState(false);
  const [regeneratingScene, setRegeneratingScene] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [savedKey, setSavedKey] = useState('');

  const [textModels, setTextModels] = useState<PollinationsModelOption[]>(DEFAULT_TEXT_MODELS);
  const [imageModels, setImageModels] = useState<PollinationsModelOption[]>(DEFAULT_IMAGE_MODELS);
  const [textModel, setTextModel] = useState('openai');
  const [imageModel, setImageModel] = useState('flux');
  const textModelInitRef = useRef(false);
  const imageModelInitRef = useRef(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [frameImagesLoading, setFrameImagesLoading] = useState<Set<number>>(new Set());
  const [frameImageErrors, setFrameImageErrors] = useState<Record<number, string>>({});

  const [sampleIndex, setSampleIndex] = useState(0);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [recentGenerations, setRecentGenerations] = useState<SavedGeneration[]>([]);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>({ kind: 'fresh' });

  useEffect(() => {
    const storedKey = window.localStorage.getItem(API_KEY_LS) || '';
    setSavedKey(storedKey);

    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const returnedApiKey = hashParams.get('api_key');
    const returnedError = hashParams.get('error');
    const returnedState = hashParams.get('state');
    const expectedState = window.localStorage.getItem(POLLINATIONS_AUTH_STATE_LS);

    if (returnedError) {
      setError(returnedError === 'access_denied' ? 'Pollinations login was cancelled.' : `Pollinations login failed: ${returnedError}`);
      window.localStorage.removeItem(POLLINATIONS_AUTH_STATE_LS);
      window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
    }

    if (returnedApiKey) {
      if (expectedState && returnedState && expectedState !== returnedState) {
        setError('Pollinations login state mismatch. Please try again.');
      } else {
        window.localStorage.setItem(API_KEY_LS, returnedApiKey);
        setSavedKey(returnedApiKey);
        setError(null);
      }

      window.localStorage.removeItem(POLLINATIONS_AUTH_STATE_LS);
      window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
    }

    const saved = window.localStorage.getItem(DRAFT_KEY);
    if (!saved) return;

    try {
      setBrief({ ...initialBrief, ...(JSON.parse(saved) as BriefInput) });
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(brief));
  }, [brief]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_GENERATIONS_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as SavedGeneration[];
      if (Array.isArray(parsed)) {
        setRecentGenerations(parsed);
      }
    } catch {
      window.localStorage.removeItem(RECENT_GENERATIONS_KEY);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      setModelsLoading(true);

      try {
        const response = await fetch('/api/pollinations/models', { cache: 'no-store' });
        const payload = (await response.json()) as {
          textModels?: PollinationsModelOption[];
          imageModels?: PollinationsModelOption[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || 'Unable to load live Pollinations models.');
        }

        if (cancelled) return;

        setTextModels(payload.textModels?.length ? payload.textModels : DEFAULT_TEXT_MODELS);
        setImageModels(payload.imageModels?.length ? payload.imageModels : DEFAULT_IMAGE_MODELS);
        setModelsError(null);
      } catch (err) {
        if (cancelled) return;

        setTextModels(DEFAULT_TEXT_MODELS);
        setImageModels(DEFAULT_IMAGE_MODELS);
        setModelsError(err instanceof Error ? err.message : 'Unable to load live Pollinations models.');
      } finally {
        if (!cancelled) {
          setModelsLoading(false);
        }
      }
    }

    void loadModels();

    return () => {
      cancelled = true;
    };
  }, []);

  // Stable model init: only set default once when live models first load
  useEffect(() => {
    if (textModelInitRef.current) return;
    if (textModels.length > 0 && textModels.some((m) => m.name === textModel)) {
      textModelInitRef.current = true;
      return;
    }
    if (textModels.length > 0) {
      setTextModel(textModels[0]?.name || 'openai');
      textModelInitRef.current = true;
    }
  }, [textModels]);

  useEffect(() => {
    if (imageModelInitRef.current) return;
    if (imageModels.length > 0 && imageModels.some((m) => m.name === imageModel)) {
      imageModelInitRef.current = true;
      return;
    }
    if (imageModels.length > 0) {
      setImageModel(imageModels[0]?.name || 'flux');
      imageModelInitRef.current = true;
    }
  }, [imageModels]);

  const clientKey = savedKey.trim() || undefined;
  const connected = !!clientKey;
  const isGeneratingScripts = phase === 'hooks' && loading && !!selectedAngle;

  const missingFields = useMemo(() => {
    return [
      ['Product name', brief.productName],
      ['Product description', brief.productDescription],
      ['Target audience', brief.targetAudience],
      ['Offer', brief.offer],
      ['Tone', brief.tone],
      ['Primary goal', brief.primaryGoal],
    ].filter(([, value]) => !value.trim());
  }, [brief]);

  function markFramesLoading(frames: StoryboardFrame[]) {
    setFrameImagesLoading(new Set(frames.map((frame) => frame.sceneNumber)));
    setFrameImageErrors({});
  }

  function clearFrameLoading(sceneNumber: number) {
    setFrameImagesLoading((current) => {
      const next = new Set(current);
      next.delete(sceneNumber);
      return next;
    });
  }

  function clearFrameError(sceneNumber: number) {
    setFrameImageErrors((current) => {
      if (!(sceneNumber in current)) return current;
      const next = { ...current };
      delete next[sceneNumber];
      return next;
    });
  }

  function markFrameError(sceneNumber: number, message: string) {
    setFrameImageErrors((current) => ({
      ...current,
      [sceneNumber]: message,
    }));
  }

  function resetStoryboardVisualState() {
    setFrameImagesLoading(new Set());
    setFrameImageErrors({});
  }

  function saveRecentGeneration(entry: SavedGeneration) {
    setRecentGenerations((current) => {
      const next = [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, 6);
      window.localStorage.setItem(RECENT_GENERATIONS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function openSavedGeneration(entry: SavedGeneration) {
    setBrief(entry.brief);
    setHookResult(null);
    setSelectedAngle(entry.selectedAngle);
    setScriptResult(entry.scriptResult);
    setSelectedVariant(entry.selectedVariant);
    setStoryboardResult(entry.storyboardResult);
    setPhase('export');
    setError(null);
    resetStoryboardVisualState();
    setWorkspaceMode({ kind: 'viewing_saved', entry });
  }

  function useSavedAsTemplate(entry: SavedGeneration) {
    setBrief(entry.brief);
    setHookResult(null);
    setSelectedAngle(null);
    setScriptResult(null);
    setSelectedVariant(null);
    setStoryboardResult(null);
    setPhase('brief');
    setError(null);
    resetStoryboardVisualState();
    setWorkspaceMode({ kind: 'template', entry });
  }

  function updateField<K extends keyof BriefInput>(field: K, value: BriefInput[K]) {
    setBrief((current) => ({ ...current, [field]: value }));
  }

  function handleLoginWithPollinations() {
    if (!POLLINATIONS_APP_KEY) {
      setError('Pollinations app key is not configured for this deployment yet.');
      return;
    }

    const state = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    window.localStorage.setItem(POLLINATIONS_AUTH_STATE_LS, state);

    const params = new URLSearchParams({
      redirect_uri: `${window.location.origin}${window.location.pathname}`,
      client_id: POLLINATIONS_APP_KEY,
      state,
      expiry: '7',
    });

    window.location.href = `${POLLINATIONS_AUTHORIZE_URL}?${params.toString()}`;
  }

  function requirePollinationsLogin(action: string) {
    if (clientKey) return true;
    setError(`Connect Pollinations before ${action}.`);
    handleLoginWithPollinations();
    return false;
  }

  async function handleGenerateHooks() {
    setError(null);
    setHookResult(null);
    setSelectedAngle(null);
    setScriptResult(null);
    setSelectedVariant(null);
    setStoryboardResult(null);
    resetStoryboardVisualState();

    if (missingFields.length > 0) {
      setError(`Complete the required brief fields first: ${missingFields.map(([label]) => label).join(', ')}`);
      return;
    }

    if (!requirePollinationsLogin('generating hooks')) return;

    setLoading(true);

    try {
      const response = await fetch('/api/generate/hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, clientKey, textModel }),
      });
      const payload = (await response.json()) as HookGenerationResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Generation failed.');
      setHookResult(payload);
      setPhase('hooks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectAngle(angle: HookAngle) {
    if (loading) return;

    setSelectedAngle(angle);
    setError(null);
    setScriptResult(null);
    setSelectedVariant(null);
    setStoryboardResult(null);
    resetStoryboardVisualState();

    if (!requirePollinationsLogin('generating scripts')) return;

    setLoading(true);

    try {
      const response = await fetch('/api/generate/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, angle, clientKey, textModel }),
      });
      const payload = (await response.json()) as ScriptGenerationResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Script generation failed.');
      setScriptResult(payload);
      setPhase('scripts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateStoryboard(variant: ScriptVariant) {
    if (!selectedAngle || storyboardLoading) return;

    setSelectedVariant(variant);
    setStoryboardResult(null);
    setError(null);
    resetStoryboardVisualState();

    if (!requirePollinationsLogin('generating storyboard frames')) return;

    setPhase('storyboard');
    setStoryboardLoading(true);

    try {
      const response = await fetch('/api/generate/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, angle: selectedAngle, variant, clientKey, textModel, imageModel }),
      });
      const payload = (await response.json()) as StoryboardResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Storyboard generation failed.');
      setStoryboardResult(payload);
      markFramesLoading(payload.frames);
      saveRecentGeneration({
        id: `${brief.productName}-${selectedAngle.angle}-${payload.generatedAt}`,
        title: `${brief.productName} · ${selectedAngle.angle}`,
        brief,
        selectedAngle,
        scriptResult: {
          ...scriptResult!,
        },
        selectedVariant: variant,
        storyboardResult: payload,
        savedAt: new Date().toISOString(),
        source: 'recent',
      });
      setWorkspaceMode({ kind: 'fresh' });
    } catch (err) {
      setPhase('scripts');
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setStoryboardLoading(false);
    }
  }

  async function handleRegenerateFrame(sceneNumber: number) {
    if (!selectedAngle || !selectedVariant || !storyboardResult || regeneratingScene) return;

    setRegeneratingScene(sceneNumber);
    setError(null);
    clearFrameError(sceneNumber);

    if (!requirePollinationsLogin('regenerating frames')) {
      setRegeneratingScene(null);
      return;
    }

    try {
      const response = await fetch('/api/generate/storyboard-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          angle: selectedAngle,
          variant: selectedVariant,
          sceneNumber,
          existingFrames: storyboardResult.frames,
          clientKey,
          textModel,
          imageModel,
        }),
      });
      const payload = (await response.json()) as { frame: StoryboardFrame; sceneNumber: number; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Frame regeneration failed.');

      setStoryboardResult((current) => {
        if (!current) return current;
        return {
          ...current,
          frames: current.frames.map((frame) => (frame.sceneNumber === sceneNumber ? payload.frame : frame)),
        };
      });
      setFrameImagesLoading((current) => new Set(current).add(sceneNumber));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRegeneratingScene(null);
    }
  }

  function loadSample() {
    setBrief(sampleBriefs[sampleIndex % sampleBriefs.length]);
    setError(null);
    setHookResult(null);
    setSelectedAngle(null);
    setScriptResult(null);
    setSelectedVariant(null);
    setStoryboardResult(null);
    resetStoryboardVisualState();
    setPhase('brief');
    setWorkspaceMode({ kind: 'fresh' });
  }

  function loadNextSample() {
    const next = (sampleIndex + 1) % sampleBriefs.length;
    setSampleIndex(next);
    setBrief(sampleBriefs[next]);
    setError(null);
    setHookResult(null);
    setSelectedAngle(null);
    setScriptResult(null);
    setSelectedVariant(null);
    setStoryboardResult(null);
    setPhase('brief');
    setWorkspaceMode({ kind: 'fresh' });
  }

  function clearBrief() {
    setBrief(initialBrief);
    setError(null);
    setHookResult(null);
    setSelectedAngle(null);
    setScriptResult(null);
    setSelectedVariant(null);
    setStoryboardResult(null);
    resetStoryboardVisualState();
    setPhase('brief');
    window.localStorage.removeItem(DRAFT_KEY);
    setWorkspaceMode({ kind: 'fresh' });
  }

  function clearBriefAndGoHome() {
    setBrief(initialBrief);
    setError(null);
    setHookResult(null);
    setSelectedAngle(null);
    setScriptResult(null);
    setSelectedVariant(null);
    setStoryboardResult(null);
    resetStoryboardVisualState();
    setPhase('home');
    window.localStorage.removeItem(DRAFT_KEY);
    setWorkspaceMode({ kind: 'fresh' });
  }

  function resetToHooks() {
    setPhase('hooks');
    setSelectedAngle(null);
    setScriptResult(null);
    setSelectedVariant(null);
    setStoryboardResult(null);
    resetStoryboardVisualState();
    setError(null);
  }

  function resetToHome() {
    setPhase('home');
  }

  function resetToBrief() {
    setPhase('brief');
    setHookResult(null);
    setSelectedAngle(null);
    setScriptResult(null);
    setSelectedVariant(null);
    setStoryboardResult(null);
    resetStoryboardVisualState();
    setError(null);
    setWorkspaceMode((current) => (current.kind === 'viewing_saved' ? { kind: 'template', entry: current.entry } : current));
  }

  function startNewBrief() {
    setPhase('brief');
    setError(null);
  }

  function resetToScripts() {
    setPhase('scripts');
    setSelectedVariant(null);
    setStoryboardResult(null);
    resetStoryboardVisualState();
    setError(null);
  }

  function copyToClipboard(text: string, section: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 1500);
    });
  }

  function StoryboardImage({ frame, compact = false }: { frame: StoryboardFrame; compact?: boolean }) {
    const isLoading = frameImagesLoading.has(frame.sceneNumber);
    const isRegenerating = regeneratingScene === frame.sceneNumber;
    const errorMessage = frameImageErrors[frame.sceneNumber];

    return (
      <div className={`frame-image-wrap ${errorMessage ? 'has-error' : ''}`}>
        {(isLoading || isRegenerating) ? (
          <div className="frame-loading-overlay">
            <div className="spinner" />
            <span>{isRegenerating ? 'Regenerating' : 'Loading'}</span>
          </div>
        ) : null}
        <img
          key={`${frame.sceneNumber}:${frame.imageUrl}`}
          src={frame.imageUrl}
          alt={frame.caption}
          loading="lazy"
          className={`frame-image ${compact ? 'compact' : ''} ${isRegenerating ? 'faded' : ''}`}
          onLoad={() => clearFrameLoading(frame.sceneNumber)}
          onError={(event) => {
            const el = event.currentTarget;
            if (el.dataset.fallbackApplied === 'true') {
              markFrameError(frame.sceneNumber, 'Image failed to load. Showing fallback. Regenerate this frame.');
              clearFrameLoading(frame.sceneNumber);
              return;
            }
            el.dataset.fallbackApplied = 'true';
            el.src = fallbackSvg(frame);
            markFrameError(frame.sceneNumber, 'Image failed to load. Showing fallback. Regenerate this frame.');
            clearFrameLoading(frame.sceneNumber);
          }}
        />
        {errorMessage ? <p className="frame-error-note">{errorMessage}</p> : null}
      </div>
    );
  }

  function PreviewThumb({ frame, index }: { frame: StoryboardFrame; index: number }) {
    return (
      <img
        src={frame.imageUrl}
        alt={frame.caption}
        className={`preview-thumb preview-thumb-${index}`}
        loading="lazy"
        onError={(event) => {
          const el = event.currentTarget;
          if (el.dataset.fallbackApplied === 'true') return;
          el.dataset.fallbackApplied = 'true';
          el.src = fallbackSvg(frame);
        }}
      />
    );
  }

  function GenerationCard({ entry }: { entry: SavedGeneration }) {
    const previewFrames = entry.storyboardResult.frames.slice(0, 3);

    return (
      <article className="gallery-card">
        <div className="gallery-stack" aria-hidden="true">
          {previewFrames.map((frame, index) => (
            <PreviewThumb key={`${entry.id}:${frame.sceneNumber}`} frame={frame} index={index} />
          ))}
        </div>
        <div className="gallery-copy">
          <div className="gallery-meta-row">
            <span className={`gallery-badge ${entry.source}`}>{entry.source === 'example' ? 'Example' : 'Recent'}</span>
            <span className="gallery-time">{new Date(entry.savedAt).toLocaleDateString()}</span>
          </div>
          <h3>{entry.title}</h3>
          <p>{entry.selectedAngle.angle}</p>
          <div className="gallery-actions">
            <button className="button gallery-button" onClick={() => openSavedGeneration(entry)}>Open export</button>
            <button className="button-secondary gallery-button" onClick={() => useSavedAsTemplate(entry)}>Use as template</button>
          </div>
        </div>
      </article>
    );
  }

  function GenerationGallerySection({ title, items, emptyText }: { title: string; items: SavedGeneration[]; emptyText?: string }) {
    if (items.length === 0 && !emptyText) return null;

    return (
      <section className="gallery-section">
        <div className="gallery-header">
          <h2>{title}</h2>
        </div>
        {items.length > 0 ? (
          <div className="gallery-grid">
            {items.map((entry) => <GenerationCard key={entry.id} entry={entry} />)}
          </div>
        ) : (
          <p className="gallery-empty">{emptyText}</p>
        )}
      </section>
    );
  }

  function HomeCarousel({ recent, examples }: { recent: SavedGeneration[]; examples: SavedGeneration[] }) {
    const allFrames = useMemo(() => {
      const recentFrames = recent.flatMap((entry) =>
        entry.storyboardResult.frames.map((frame) => ({
          ...frame,
          id: `${entry.id}:${frame.sceneNumber}`,
          title: entry.title,
        }))
      );
      const exampleFrames = examples.flatMap((entry) =>
        entry.storyboardResult.frames.map((frame) => ({
          ...frame,
          id: `ex:${entry.id}:${frame.sceneNumber}`,
          title: entry.title,
        }))
      );
      return [...recentFrames, ...exampleFrames];
    }, [recent, examples]);

    if (allFrames.length === 0) return null;

    const repeatedFrames = allFrames.concat(allFrames);
    const duration = Math.max(20, allFrames.length * 3.2);

    return (
      <div className="home-carousel-wrap">
        <div
          className="home-carousel-track"
          style={{ animationDuration: `${duration}s` }}
          aria-hidden="true"
        >
          {repeatedFrames.map((frame, index) => (
            <div key={`${frame.id}:${index}`} className="home-carousel-item">
              <img
                src={frame.imageUrl}
                alt={frame.caption}
                className="home-carousel-img"
                loading="lazy"
                onError={(event) => {
                  const el = event.currentTarget;
                  if (el.dataset.fallbackApplied === 'true') return;
                  el.dataset.fallbackApplied = 'true';
                  el.src = fallbackSvg(frame);
                }}
              />
              <span className="home-carousel-label">Scene {frame.sceneNumber}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function WorkspaceBanner() {
    if (workspaceMode.kind === 'fresh') return null;

    if (workspaceMode.kind === 'viewing_saved') {
      return (
        <div className="status info workspace-banner">
          <div>
            <strong>Viewing saved {workspaceMode.entry.source}:</strong> {workspaceMode.entry.title}. If you go to Brief and generate again, it creates a new recent result. This saved one stays unchanged.
          </div>
          <div className="workspace-actions">
            <button className="button-secondary" onClick={() => useSavedAsTemplate(workspaceMode.entry)}>Use as template</button>
            <button className="button-secondary" onClick={clearBrief}>Start fresh</button>
          </div>
        </div>
      );
    }

    return (
      <div className="status info workspace-banner">
        <div>
          <strong>Template mode from {workspaceMode.entry.source}:</strong> editing this brief will not overwrite <strong>{workspaceMode.entry.title}</strong>. A new generation becomes a new Recent item.
        </div>
        <div className="workspace-actions">
          <button className="button-secondary" onClick={() => openSavedGeneration(workspaceMode.entry)}>Back to saved export</button>
          <button className="button-secondary" onClick={clearBrief}>Start fresh</button>
        </div>
      </div>
    );
  }

  return (
    <main className="page-shell">
      <header className="header-bar">
        <button className="header-logo header-logo-button" type="button" onClick={resetToHome} aria-label="Go to home page">
          <img src="/brand/ugc-ad-studio-logo-mark.png" alt="" className="logo-mark-image" width={54} height={54} />
          <span className="logo-wordmark">UGC Ad Studio</span>
        </button>
        <button className="header-connect-btn" onClick={handleLoginWithPollinations}>
          <span className={`connect-dot ${connected ? 'connected' : 'disconnected'}`} />
          {connected ? 'Connected' : 'Connect Pollinations'}
        </button>
      </header>

      {phase !== 'home' ? (
        <nav className="stepper" aria-label="Workflow steps">
          <button className={`step ${phase === 'brief' ? 'active' : hookResult ? 'done' : ''}`} onClick={resetToBrief}>1 · Brief</button>
          <span className="step-sep">→</span>
          <button className={`step ${phase === 'hooks' ? 'active' : scriptResult ? 'done' : ''}`} disabled={!hookResult} onClick={resetToHooks}>2 · Hook matrix</button>
          <span className="step-sep">→</span>
          <button className={`step ${phase === 'scripts' ? 'active' : storyboardResult ? 'done' : ''}`} disabled={!selectedAngle} onClick={resetToScripts}>3 · Scripts & shots</button>
          <span className="step-sep">→</span>
          <button className={`step ${phase === 'storyboard' ? 'active' : storyboardResult ? 'done' : ''}`} disabled={!selectedVariant} onClick={() => setPhase('storyboard')}>4 · Storyboard</button>
          <span className="step-sep">→</span>
          <button className={`step ${phase === 'export' ? 'active' : ''}`} disabled={!storyboardResult} onClick={() => setPhase('export')}>5 · Export</button>
        </nav>
      ) : null}

      <WorkspaceBanner />

      {phase === 'home' ? (
        <section className="phase-section home-section">
          <div className="home-hero">
            <h1>
              Turn a product brief<br />
              into ready-to-shoot<br />
              UGC ads
            </h1>
            <p className="subtle">
              One brief. Five hook angles. Scripts, shots, and storyboard frames.
            </p>
          </div>

          <div className="home-actions">
            <button className="button home-primary" onClick={startNewBrief}>New creative brief →</button>
            {recentGenerations.length > 0 ? (
              <button className="button-secondary" onClick={() => { if (brief.productName || brief.productDescription) setPhase('brief'); else startNewBrief(); }}>
                Continue draft
              </button>
            ) : null}
            <button className="button-secondary" onClick={loadSample}>Try a sample brief</button>
          </div>

          <HomeCarousel recent={recentGenerations} examples={exampleResults} />

          {recentGenerations.length > 0 ? (
            <GenerationGallerySection
              title="Recent generations"
              items={recentGenerations}
              emptyText="Your latest storyboard exports will show here after you generate them."
            />
          ) : null}
          <GenerationGallerySection title="Example results" items={exampleResults} />
        </section>
      ) : null}

      {phase === 'brief' ? (
        <section className="phase-section">
          <div className="phase-header">
            <h1>Creative brief intake</h1>
            <ModelSelects
              textModelValue={textModel}
              imageModelValue={imageModel}
              textModelList={textModels}
              imageModelList={imageModels}
              onTextChange={setTextModel}
              onImageChange={setImageModel}
              isLoading={modelsLoading}
              loadingNote="Loading models…"
              errorNote={modelsError}
            />
          </div>
          <p className="subtle">Fill the brief, then generate hooks.</p>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="productName">Product name *</label>
              <input id="productName" className="input" value={brief.productName} onChange={(event) => updateField('productName', event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="offer">Offer *</label>
              <input id="offer" className="input" value={brief.offer} onChange={(event) => updateField('offer', event.target.value)} />
            </div>
            <div className="field-full">
              <label htmlFor="productDescription">Product description *</label>
              <textarea id="productDescription" className="textarea" value={brief.productDescription} onChange={(event) => updateField('productDescription', event.target.value)} />
            </div>
            <div className="field-full">
              <label htmlFor="targetAudience">Target audience *</label>
              <textarea id="targetAudience" className="textarea" value={brief.targetAudience} onChange={(event) => updateField('targetAudience', event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="tone">Tone *</label>
              <input id="tone" className="input" value={brief.tone} onChange={(event) => updateField('tone', event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="primaryGoal">Primary goal *</label>
              <input id="primaryGoal" className="input" value={brief.primaryGoal} onChange={(event) => updateField('primaryGoal', event.target.value)} />
            </div>
            <div className="field-full">
              <label htmlFor="landingPageUrl">Landing page URL</label>
              <input id="landingPageUrl" className="input" value={brief.landingPageUrl || ''} onChange={(event) => updateField('landingPageUrl', event.target.value)} />
            </div>
            <div className="field-full">
              <label htmlFor="constraints">Constraints / brand guardrails</label>
              <textarea id="constraints" className="textarea" value={brief.constraints || ''} onChange={(event) => updateField('constraints', event.target.value)} />
            </div>
          </div>

          <div className="actions">
            <button className="button" disabled={loading} onClick={handleGenerateHooks}>{loading ? 'Generating hook matrix…' : 'Generate hook matrix'}</button>
            <button className="button-secondary" disabled={loading} onClick={loadSample}>Use sample brief</button>
            {sampleBriefs.length > 1 ? <button className="button-secondary" disabled={loading} onClick={loadNextSample}>Next sample</button> : null}
            <button className="button-secondary" disabled={loading} onClick={clearBrief}>{workspaceMode.kind === 'fresh' ? 'Clear' : 'Start fresh'}</button>
          </div>

          {error ? <div className="status error">{error}</div> : null}
        </section>
      ) : null}

      {phase === 'hooks' && hookResult ? (
        <section className="phase-section">
          <div className="phase-header">
            <h1>Hook matrix</h1>
            <div className="meta-inline">
              <span className="pill">{new Date(hookResult.generatedAt).toLocaleString()}</span>
            </div>
          </div>

          {isGeneratingScripts ? (
            <div className="generation-toast" role="status" aria-live="polite">
              <div className="spinner" />
              <span>Generating scripts for: <strong>{selectedAngle?.angle}</strong></span>
            </div>
          ) : null}

          <div className="phase-subheader">
            <h2>Select an angle</h2>
            <ModelSelects
              textModelValue={textModel}
              imageModelValue={imageModel}
              textModelList={textModels}
              imageModelList={imageModels}
              onTextChange={setTextModel}
              onImageChange={setImageModel}
              isLoading={modelsLoading}
              loadingNote="Loading models…"
              errorNote={modelsError}
            />
          </div>
          <p className="select-hint">Pick one angle. Script generation starts immediately and locks the matrix until it finishes.</p>
          <div className={`angles ${isGeneratingScripts ? 'angles-disabled' : ''}`}>
            {hookResult.matrix.angles.map((angle) => {
              const isSelected = selectedAngle?.angle === angle.angle;
              return (
                <article
                  key={angle.angle}
                  className={`angle-card ${isSelected ? 'selected' : ''} ${isGeneratingScripts && !isSelected ? 'muted-card' : ''}`}
                  onClick={() => handleSelectAngle(angle)}
                  role="button"
                  tabIndex={isGeneratingScripts ? -1 : 0}
                  aria-disabled={isGeneratingScripts}
                  onKeyDown={(event) => {
                    if ((event.key === 'Enter' || event.key === ' ') && !isGeneratingScripts) {
                      event.preventDefault();
                      void handleSelectAngle(angle);
                    }
                  }}
                >
                  <div className="angle-header">
                    <h2>{angle.angle}</h2>
                    {isSelected ? <span className="badge">Selected</span> : null}
                  </div>
                  <p className="subtle">{angle.rationale}</p>
                  <ol className="hook-list">
                    {angle.hooks.map((hook, index) => <li key={index}>{hook}</li>)}
                  </ol>
                  <div className="cta-box"><strong>CTA:</strong> {angle.cta}</div>
                  <button
                    className="angle-select-btn"
                    disabled={isGeneratingScripts}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleSelectAngle(angle);
                    }}
                  >
                    Select this angle →
                  </button>
                </article>
              );
            })}
          </div>

          {error ? <div className="status error">{error}</div> : null}
        </section>
      ) : null}

      {(phase === 'scripts' || (phase === 'storyboard' && !storyboardResult)) && loading ? (
        <section className="phase-section">
          <div className="phase-header">
            <h1>Scripts & shot list</h1>
            <div className="meta-inline"><span className="pill">generating…</span></div>
          </div>
          <div className="skeleton skeleton-text long" />
          <div className="skeleton skeleton-text medium" />
          <div className="skeleton skeleton-card" style={{ marginTop: 12 }} />
          <div className="skeleton skeleton-card" style={{ marginTop: 12 }} />
        </section>
      ) : null}

      {(phase === 'scripts' || (phase === 'storyboard' && !storyboardResult)) && scriptResult ? (
        <section className="phase-section">
          <div className="phase-header">
            <h1>Scripts & shot list</h1>
            <div className="meta-inline">
              <span className="pill">Angle: {scriptResult.angle.angle}</span>
            </div>
          </div>

          <div className="phase-subheader">
            <h2>Script variants</h2>
            <ModelSelects
              includeImage
              textModelValue={textModel}
              imageModelValue={imageModel}
              textModelList={textModels}
              imageModelList={imageModels}
              onTextChange={setTextModel}
              onImageChange={setImageModel}
              isLoading={modelsLoading}
              loadingNote="Loading models…"
              errorNote={modelsError}
            />
          </div>
          <div className="script-variants">
            {scriptResult.variants.map((variant) => (
              <article key={variant.variantLabel} className={`variant-card ${selectedVariant?.variantLabel === variant.variantLabel ? 'selected' : ''}`}>
                <div className="variant-header">
                  <h3>{variant.variantLabel}</h3>
                  <div className="variant-meta">
                    <span className="pill">{variant.durationEstimate}</span>
                    {variant.platform ? <span className="pill">{variant.platform}</span> : null}
                  </div>
                </div>
                <pre className="script-body">{variant.scriptBody}</pre>
                <div className="variant-actions">
                  <button className="button" disabled={storyboardLoading} onClick={() => handleGenerateStoryboard(variant)}>
                    {storyboardLoading && selectedVariant?.variantLabel === variant.variantLabel ? 'Generating storyboard…' : 'Generate storyboard'}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <h2 className="section-title">Shot list · {scriptResult.shotList.totalDurationEstimate}</h2>
          <div className="shot-table-wrap">
            <table className="shot-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Shot type</th>
                  <th>Description</th>
                  <th>Visual</th>
                  <th>Audio</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {scriptResult.shotList.shots.map((shot) => (
                  <tr key={shot.sceneNumber}>
                    <td className="shot-num">{shot.sceneNumber}</td>
                    <td className="shot-type">{shot.shotType}</td>
                    <td>{shot.description}</td>
                    <td className="shot-note">{shot.visualNote}</td>
                    <td className="shot-note">{shot.audioDirection}</td>
                    <td className="shot-dur">{shot.durationEstimate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="actions" style={{ marginTop: 24 }}>
            <button className="button-secondary" onClick={resetToHooks}>← Choose different angle</button>
            <button className="button-secondary" onClick={resetToBrief}>← Start new brief</button>
          </div>

          {error ? <div className="status error">{error}</div> : null}
        </section>
      ) : null}

      {phase === 'storyboard' && storyboardLoading ? (
        <section className="phase-section">
          <div className="phase-header">
            <h1>Storyboard</h1>
            <div className="meta-inline"><span className="pill">generating…</span></div>
            <ModelSelects
              includeImage
              textModelValue={textModel}
              imageModelValue={imageModel}
              textModelList={textModels}
              imageModelList={imageModels}
              onTextChange={setTextModel}
              onImageChange={setImageModel}
              isLoading={modelsLoading}
              loadingNote="Loading models…"
              errorNote={modelsError}
            />
          </div>
          <div className="storyboard-grid">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="frame-card">
                <div className="skeleton skeleton-image" />
                <div className="skeleton skeleton-text short" />
                <div className="skeleton skeleton-text medium" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {phase === 'storyboard' && storyboardResult ? (
        <section className="phase-section">
          <div className="phase-header">
            <h1>Storyboard</h1>
            <div className="meta-inline">
              <span className="pill">{storyboardResult.frames.length} frames</span>
            </div>
            <ModelSelects
              includeImage
              textModelValue={textModel}
              imageModelValue={imageModel}
              textModelList={textModels}
              imageModelList={imageModels}
              onTextChange={setTextModel}
              onImageChange={setImageModel}
              isLoading={modelsLoading}
              loadingNote="Loading models…"
              errorNote={modelsError}
            />
          </div>

          <div className="storyboard-grid">
            {storyboardResult.frames.map((frame) => (
              <article key={frame.sceneNumber} className={`frame-card ${regeneratingScene === frame.sceneNumber ? 'regenerating' : ''}`}>
                <StoryboardImage frame={frame} />
                <div className="frame-meta">
                  <span className="frame-num">Scene {frame.sceneNumber}</span>
                  <span className="pill">{frame.shotType}</span>
                </div>
                <p className="frame-caption">{frame.caption}</p>
                <button className="copy-btn regenerate-btn" disabled={regeneratingScene === frame.sceneNumber} onClick={() => handleRegenerateFrame(frame.sceneNumber)}>
                  {regeneratingScene === frame.sceneNumber ? 'Regenerating…' : '↻ Regenerate frame'}
                </button>
              </article>
            ))}
          </div>

          <div className="actions" style={{ marginTop: 24 }}>
            <button className="button-secondary" onClick={resetToScripts}>← Choose different variant</button>
            <button className="button-secondary" onClick={resetToHooks}>← Choose different angle</button>
            <button className="button" onClick={() => setPhase('export')}>Next: Export brief →</button>
          </div>

          {error ? <div className="status error">{error}</div> : null}
        </section>
      ) : null}

      {phase === 'export' && !storyboardResult ? (
        <section className="phase-section">
          <div className="phase-header"><h1>Creator brief export</h1></div>
          <div className="skeleton skeleton-text long" />
          <div className="skeleton skeleton-text medium" />
          <div className="skeleton skeleton-card" style={{ marginTop: 12 }} />
        </section>
      ) : null}

      {phase === 'export' && storyboardResult && scriptResult && selectedAngle ? (
        <section className="phase-section">
          <div className="phase-header">
            <h1>Creator brief export</h1>
            <div className="meta-inline">
              <span className="pill">{brief.productName}</span>
              <span className="pill">Angle: {selectedAngle.angle}</span>
            </div>
          </div>

          <div className="actions export-actions">
            <button className="button-secondary" onClick={() => setPhase('storyboard')}>← Back to storyboard</button>
            <button className="button-secondary" onClick={resetToBrief}>← Start new brief</button>
            <button className="button" onClick={() => window.print()}>Print / Save as PDF</button>
            <button
              className={`button-secondary ${copiedSection === 'all' ? 'copied' : ''}`}
              onClick={() => {
                const parts = [
                  `Product: ${brief.productName}`,
                  `Audience: ${brief.targetAudience}`,
                  `Offer: ${brief.offer}`,
                  `Tone: ${brief.tone}`,
                  `Goal: ${brief.primaryGoal}`,
                  '',
                  `Angle: ${selectedAngle.angle}`,
                  `Rationale: ${selectedAngle.rationale}`,
                  `CTA: ${selectedAngle.cta}`,
                  '',
                  `Script · ${selectedVariant?.variantLabel || 'Variant'}`,
                  selectedVariant?.scriptBody || '',
                  '',
                  `Shot list · ${scriptResult.shotList.totalDurationEstimate}`,
                  ...scriptResult.shotList.shots.map((shot) => `Scene ${shot.sceneNumber} · ${shot.shotType}\nDescription: ${shot.description}\nVisual: ${shot.visualNote}\nAudio: ${shot.audioDirection}\nDuration: ${shot.durationEstimate}`),
                  '',
                  'Storyboard prompts:',
                  ...storyboardResult.frames.map((frame) => `Scene ${frame.sceneNumber} · ${frame.shotType}\nPrompt: ${frame.prompt}\nCaption: ${frame.caption}\nImage: ${frame.imageUrl}`),
                ];
                copyToClipboard(parts.join('\n'), 'all');
              }}
            >
              {copiedSection === 'all' ? 'Copied all ✓' : 'Copy all to clipboard'}
            </button>
            <button
              className="button-secondary"
              onClick={() => {
                const payload = {
                  productBrief: brief,
                  angle: selectedAngle,
                  script: selectedVariant,
                  shotList: scriptResult.shotList,
                  storyboard: storyboardResult.frames,
                  exportedAt: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${brief.productName.replace(/\s+/g, '-').toLowerCase()}-creative-brief.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
            >
              Download JSON
            </button>
          </div>

          <div className="export-body">
            <div className="export-section">
              <h2>Product brief</h2>
              <p><strong>Name:</strong> {brief.productName}</p>
              <p><strong>Audience:</strong> {brief.targetAudience}</p>
              <p><strong>Offer:</strong> {brief.offer}</p>
              <p><strong>Tone:</strong> {brief.tone}</p>
              <p><strong>Goal:</strong> {brief.primaryGoal}</p>
            </div>

            <div className="export-section">
              <div className="export-section-header">
                <h2>Chosen angle & CTA</h2>
                <button className={`copy-btn ${copiedSection === 'angle' ? 'copied' : ''}`} onClick={() => copyToClipboard(`Angle: ${selectedAngle.angle}\nRationale: ${selectedAngle.rationale}\nCTA: ${selectedAngle.cta}`, 'angle')}>
                  {copiedSection === 'angle' ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
              <p><strong>Angle:</strong> {selectedAngle.angle}</p>
              <p><strong>Rationale:</strong> {selectedAngle.rationale}</p>
              <p><strong>CTA:</strong> {selectedAngle.cta}</p>
            </div>

            <div className="export-section">
              <div className="export-section-header">
                <h2>Script · {selectedVariant?.variantLabel || 'Variant'}</h2>
                <button className={`copy-btn ${copiedSection === 'script' ? 'copied' : ''}`} onClick={() => copyToClipboard(selectedVariant?.scriptBody || '', 'script')}>
                  {copiedSection === 'script' ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
              <pre className="script-body">{selectedVariant?.scriptBody || 'No script selected.'}</pre>
            </div>

            <div className="export-section">
              <h2>Shot list · {scriptResult.shotList.totalDurationEstimate}</h2>
              <div className="shot-table-wrap">
                <table className="shot-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Shot type</th>
                      <th>Description</th>
                      <th>Visual</th>
                      <th>Audio</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scriptResult.shotList.shots.map((shot) => (
                      <tr key={shot.sceneNumber}>
                        <td className="shot-num">{shot.sceneNumber}</td>
                        <td className="shot-type">{shot.shotType}</td>
                        <td>{shot.description}</td>
                        <td className="shot-note">{shot.visualNote}</td>
                        <td className="shot-note">{shot.audioDirection}</td>
                        <td className="shot-dur">{shot.durationEstimate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="export-section">
              <h2>Storyboard frames</h2>
              <div className="storyboard-grid compact">
                {storyboardResult.frames.map((frame) => (
                  <article key={frame.sceneNumber} className="frame-card compact">
                    <StoryboardImage frame={frame} compact />
                    <div className="frame-meta">
                      <span className="frame-num">Scene {frame.sceneNumber}</span>
                      <span className="pill">{frame.shotType}</span>
                    </div>
                    <p className="frame-caption">{frame.caption}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
