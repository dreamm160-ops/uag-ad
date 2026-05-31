import { sampleBriefs } from './sample-brief';
import type { SavedGeneration, ScriptVariant, StoryboardFrame, Shot } from './types';

type ExampleScene = {
  shotType: string;
  caption: string;
  description: string;
  visualNote: string;
  audioDirection: string;
  durationEstimate: string;
  prompt: string;
};

type ExampleConfig = {
  id: string;
  title: string;
  briefIndex: number;
  angle: string;
  rationale: string;
  hooks: [string, string, string];
  cta: string;
  variantLabel: string;
  platform: string;
  intro: string;
  bridge: string;
  outro: string;
  palette: [string, string, string];
  scenes: ExampleScene[];
};

function svgDataUrl(lines: string[], palette: [string, string, string]): string {
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const [bg, accent, accent2] = palette;
  const lineSvg = lines
    .map(
      (line, index) =>
        `<text x="40" y="${160 + index * 56}" fill="#f4f7fb" font-size="28" font-family="Inter,Arial,sans-serif">${escape(line)}</text>`
    )
    .join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="768" viewBox="0 0 512 768">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${bg}" />
          <stop offset="55%" stop-color="${accent}" />
          <stop offset="100%" stop-color="${accent2}" />
        </linearGradient>
      </defs>
      <rect width="512" height="768" rx="32" fill="url(#g)" />
      <rect x="34" y="34" width="444" height="700" rx="28" fill="rgba(9,14,24,0.18)" stroke="rgba(255,255,255,0.18)" />
      <text x="40" y="84" fill="#d7e2ff" font-size="20" font-family="Inter,Arial,sans-serif">UGC Ad Studio Example</text>
      ${lineSvg}
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

function sceneIllustration(productName: string, scene: ExampleScene, sceneNumber: number, palette: [string, string, string]): string {
  const [bg, accent, accent2] = palette;
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const header = `
    <text x="40" y="74" fill="#d7e2ff" font-size="20" font-family="Inter,Arial,sans-serif">Saved example scene</text>
    <text x="40" y="106" fill="#ffffff" font-size="34" font-weight="700" font-family="Inter,Arial,sans-serif">${escape(productName)}</text>
    <text x="40" y="138" fill="#d7e2ff" font-size="18" font-family="Inter,Arial,sans-serif">Scene ${sceneNumber} · ${escape(scene.shotType)}</text>
  `;

  const glowSipScene = () => {
    const creator = sceneNumber === 3 || sceneNumber === 5;
    const canX = sceneNumber === 1 ? 276 : sceneNumber === 4 ? 238 : 184;
    const canY = sceneNumber === 2 ? 378 : sceneNumber === 4 ? 308 : 322;

    return `
      <circle cx="412" cy="128" r="68" fill="rgba(255,255,255,0.18)" />
      <rect x="36" y="188" width="440" height="500" rx="28" fill="rgba(6,10,18,0.22)" stroke="rgba(255,255,255,0.15)" />
      <rect x="56" y="452" width="400" height="188" rx="26" fill="rgba(255,255,255,0.16)" />
      <rect x="72" y="236" width="124" height="156" rx="18" fill="rgba(255,255,255,0.12)" />
      <rect x="94" y="256" width="80" height="116" rx="16" fill="rgba(255,255,255,0.08)" />
      <rect x="${canX}" y="${canY}" width="84" height="176" rx="36" fill="#ffe8f5" stroke="#ffffff" stroke-width="4" />
      <rect x="${canX + 12}" y="${canY + 26}" width="60" height="74" rx="14" fill="${accent}" opacity="0.88" />
      <rect x="${canX + 24}" y="${canY + 116}" width="36" height="10" rx="5" fill="${bg}" opacity="0.42" />
      <circle cx="${canX + 42}" cy="${canY - 12}" r="18" fill="#f6f7ff" opacity="0.94" />
      ${creator ? `
        <circle cx="148" cy="352" r="50" fill="#f3c7a5" />
        <path d="M102 346c6-58 91-74 112-14l-1 20-112-6z" fill="#1a1e33" />
        <rect x="118" y="392" width="60" height="92" rx="24" fill="#f6f1ff" />
        <path d="M176 426l58-24 16 34-74 33z" fill="#f3c7a5" />
      ` : `
        <rect x="122" y="364" width="54" height="104" rx="22" fill="#f3c7a5" />
      `}
      <rect x="70" y="490" width="96" height="58" rx="16" fill="#ffffff" opacity="0.24" />
      <rect x="178" y="500" width="66" height="50" rx="14" fill="#ffffff" opacity="0.22" />
      <rect x="352" y="250" width="88" height="76" rx="18" fill="rgba(255,255,255,0.18)" />
      <text x="370" y="284" fill="#ffffff" font-size="16" font-family="Inter,Arial,sans-serif">Offer</text>
      <text x="370" y="308" fill="#fdf6ff" font-size="24" font-weight="700" font-family="Inter,Arial,sans-serif">2+1</text>
    `;
  };

  const deskFlowScene = () => {
    const hunch = sceneNumber === 1;
    const standVisible = sceneNumber >= 2;

    return `
      <rect x="40" y="188" width="432" height="500" rx="28" fill="rgba(7,10,18,0.28)" stroke="rgba(255,255,255,0.14)" />
      <rect x="58" y="220" width="132" height="170" rx="18" fill="rgba(255,255,255,0.11)" />
      <rect x="206" y="478" width="228" height="22" rx="11" fill="#0f172a" opacity="0.82" />
      <rect x="126" y="500" width="276" height="92" rx="18" fill="rgba(255,255,255,0.12)" />
      <rect x="236" y="362" width="120" height="78" rx="14" fill="#1e293b" stroke="#7dd3fc" stroke-width="3" />
      ${standVisible ? `<path d="M246 456l44-62h24l44 62" stroke="#dbeafe" stroke-width="10" fill="none" stroke-linecap="round" />` : ''}
      <path d="M234 456h130" stroke="#cbd5e1" stroke-width="12" stroke-linecap="round" />
      <circle cx="174" cy="350" r="38" fill="#f0c7a1" />
      <path d="M136 340c8-48 66-62 83-12l-2 18-81-6z" fill="#111827" />
      <path d="M150 392c${hunch ? '10 22 22 44 34 62' : '8 10 18 28 26 46'}" stroke="#f0c7a1" stroke-width="16" fill="none" stroke-linecap="round" />
      <rect x="146" y="394" width="60" height="96" rx="22" fill="#334155" />
      <rect x="80" y="540" width="62" height="44" rx="12" fill="#0f172a" />
      <rect x="86" y="546" width="50" height="32" rx="10" fill="${accent2}" opacity="0.82" />
      <path d="M102 550l30-44" stroke="#22c55e" stroke-width="6" stroke-linecap="round" opacity="0.75" />
    `;
  };

  const barkBondScene = () => {
    const reflective = sceneNumber >= 3;

    return `
      <rect x="40" y="188" width="432" height="500" rx="28" fill="rgba(4,12,20,0.3)" stroke="rgba(255,255,255,0.15)" />
      <path d="M40 564c102-24 188-24 432 0v124H40z" fill="rgba(11,21,17,0.64)" />
      <circle cx="400" cy="236" r="54" fill="rgba(255,245,175,0.14)" />
      <path d="M96 520c20-76 94-136 160-124 54 10 96 54 112 124" fill="none" stroke="#dbeafe" stroke-width="10" opacity="0.25" />
      <circle cx="170" cy="372" r="34" fill="#f2c49d" />
      <rect x="144" y="404" width="58" height="118" rx="22" fill="#d9f99d" opacity="0.2" />
      <path d="M196 430l88-42" stroke="#f2c49d" stroke-width="14" stroke-linecap="round" />
      <path d="M272 446c24-6 58 2 76 26 14 18 10 48-16 58-16 6-40 2-58-6-20 18-44 18-58 8-12-10-10-30 0-42 10-14 30-24 56-30z" fill="#f6f7eb" stroke="#15381f" stroke-width="4" />
      <path d="M254 470l48 22" stroke="#15381f" stroke-width="8" stroke-linecap="round" />
      <path d="M276 434c10-8 20-10 28-8" stroke="#15381f" stroke-width="6" stroke-linecap="round" />
      <path d="M278 454l38 12" stroke="${reflective ? '#bef264' : accent2}" stroke-width="10" stroke-linecap="round" opacity="0.95" />
      <path d="M238 424l-52 70" stroke="${accent2}" stroke-width="5" stroke-linecap="round" opacity="0.75" />
      <circle cx="398" cy="364" r="16" fill="#fef08a" opacity="0.48" />
      <circle cx="432" cy="404" r="12" fill="#fef08a" opacity="0.34" />
    `;
  };

  const art = productName.includes('GlowSip') ? glowSipScene() : productName.includes('DeskFlow') ? deskFlowScene() : barkBondScene();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="768" viewBox="0 0 512 768">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${bg}" />
          <stop offset="55%" stop-color="${accent}" />
          <stop offset="100%" stop-color="${accent2}" />
        </linearGradient>
      </defs>
      <rect width="512" height="768" rx="32" fill="url(#g)" />
      ${header}
      ${art}
      <rect x="40" y="642" width="432" height="84" rx="22" fill="rgba(8,12,20,0.44)" stroke="rgba(255,255,255,0.12)" />
      <text x="60" y="684" fill="#f8fbff" font-size="17" font-family="Inter,Arial,sans-serif">${escape(scene.caption.slice(0, 52))}${scene.caption.length > 52 ? '…' : ''}</text>
      <text x="60" y="709" fill="#cedcff" font-size="13" font-family="Inter,Arial,sans-serif">${escape(scene.visualNote.slice(0, 66))}${scene.visualNote.length > 66 ? '…' : ''}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

function createFrame(exampleId: string, scene: ExampleScene, index: number): StoryboardFrame {
  const sceneNumber = index + 1;

  return {
    sceneNumber,
    shotType: scene.shotType,
    prompt: scene.prompt,
    caption: scene.caption,
    imageUrl: `/examples/${exampleId}/scene-${sceneNumber}.png`,
  };
}

function createShot(scene: ExampleScene, index: number): Shot {
  return {
    sceneNumber: index + 1,
    shotType: scene.shotType,
    description: scene.description,
    visualNote: scene.visualNote,
    audioDirection: scene.audioDirection,
    durationEstimate: scene.durationEstimate,
  };
}

function buildScriptBody(config: ExampleConfig): string {
  return [
    'HOOK',
    config.hooks[0],
    '',
    'BODY',
    `• ${config.intro}`,
    `• ${config.bridge}`,
    `• ${config.outro}`,
    '',
    'CTA',
    config.cta,
  ].join('\n');
}

function buildExample(config: ExampleConfig): SavedGeneration {
  const brief = sampleBriefs[config.briefIndex];
  const frames = config.scenes.map((scene, index) => createFrame(config.id, scene, index));
  const shots = config.scenes.map((scene, index) => createShot(scene, index));
  const selectedVariant: ScriptVariant = {
    variantLabel: config.variantLabel,
    durationEstimate: '20-30s',
    platform: config.platform,
    scriptBody: buildScriptBody(config),
  };

  return {
    id: config.id,
    title: config.title,
    brief,
    selectedAngle: {
      angle: config.angle,
      rationale: config.rationale,
      hooks: config.hooks,
      cta: config.cta,
    },
    scriptResult: {
      brief,
      angle: {
        angle: config.angle,
        rationale: config.rationale,
        hooks: config.hooks,
        cta: config.cta,
      },
      variants: [selectedVariant],
      shotList: {
        totalDurationEstimate: '24s',
        shots,
      },
      model: 'example/demo-text',
      generatedAt: '2026-05-28T00:00:00.000Z',
      mock: false,
    },
    selectedVariant,
    storyboardResult: {
      frames,
      model: 'example/demo-storyboard',
      generatedAt: '2026-05-28T00:00:00.000Z',
      mock: false,
    },
    savedAt: '2026-05-28T00:00:00.000Z',
    source: 'example',
  };
}

export const exampleResults: SavedGeneration[] = [
  buildExample({
    id: 'example-glowsip-conversion',
    title: 'GlowSip · Offer-led beauty ad',
    briefIndex: 0,
    angle: 'Offer-first interruption',
    rationale: 'Lead with the deal, then make the beauty routine feel easy and social-native.',
    hooks: [
      '"Wait — collagen soda and buy 2 get 1 free?"',
      '"This is the only beauty routine I actually look forward to."',
      '"If your skincare routine feels like homework, watch this."',
    ],
    cta: 'Tap for the buy 2 get 1 free bundle before it ends.',
    variantLabel: 'Offer-led conversion cut',
    platform: 'TikTok / Reels',
    intro: 'Open with the can in hand and the offer on-screen before the viewer can scroll away.',
    bridge: 'Show the drink sliding into a real daily routine instead of sounding like a supplement ad.',
    outro: 'Land on taste + convenience + bundle urgency, then push the click.',
    palette: ['#5b3df5', '#ff6fb0', '#ffc756'],
    scenes: [
      {
        shotType: 'Hook / offer flash',
        caption: 'Scene 1 — Offer hits first with can-in-hand and instant bundle context.',
        description: 'Creator pops into frame with the can and immediately states the bundle offer.',
        visualNote: 'Handheld vertical close-up, can label visible, price/offer-safe space top right.',
        audioDirection: 'Fast, excited opening line with crisp can crack sound.',
        durationEstimate: '3s',
        prompt: 'Handheld close-up of a beauty creator holding a pastel collagen soda can toward camera, energetic expression, vertical framing, bold offer-safe space, natural daylight kitchen scene, social-native UGC look',
      },
      {
        shotType: 'Routine fit',
        caption: 'Scene 2 — Product slips into an easy morning ritual.',
        description: 'Show the drink next to skincare and a tote bag to make the routine feel effortless.',
        visualNote: 'Countertop setup, casual apartment light, product in practical context.',
        audioDirection: 'Voiceover: “I wanted something I would actually remember to use.”',
        durationEstimate: '5s',
        prompt: 'Morning counter scene with collagen soda beside skincare and tote bag, soft apartment daylight, casual but tidy styling, creator reaching into frame, realistic UGC capture',
      },
      {
        shotType: 'Taste / reaction',
        caption: 'Scene 3 — Real creator reaction sells enjoyment, not just benefits.',
        description: 'Creator sips and gives a believable “wait that is actually good” reaction.',
        visualNote: 'Chest-up framing, slight camera shake, authentic expression.',
        audioDirection: 'Natural sip, light laugh, reaction line kept conversational.',
        durationEstimate: '4s',
        prompt: 'Real creator tasting collagen soda for the first time, subtle surprised smile, chest-up framing, slight handheld motion, apartment living room background, relatable UGC vibe',
      },
      {
        shotType: 'Benefit shorthand',
        caption: 'Scene 4 — Short benefit framing without sounding clinical.',
        description: 'Overlay quick bullets around convenience, low sugar, and easy consistency.',
        visualNote: 'Can rotating in hand, centered composition, text-safe zones left and right.',
        audioDirection: 'Voiceover punches through three fast proof points.',
        durationEstimate: '6s',
        prompt: 'Close handheld beauty-product shot of collagen soda turning in creator hand, clean background, natural light, text-safe composition, creator content aesthetic, lifestyle not studio',
      },
      {
        shotType: 'CTA / checkout push',
        caption: 'Scene 5 — Direct CTA with bundle urgency and end-card space.',
        description: 'Creator points at the screen and repeats the bundle offer to close.',
        visualNote: 'End-card safe zone, confident eye contact, clean backdrop.',
        audioDirection: 'Direct CTA: “Grab the bundle before this week is over.”',
        durationEstimate: '6s',
        prompt: 'Creator pointing toward lower-screen CTA area, confident smile, clean apartment backdrop, natural ring-light catchlight, end-card safe framing, UGC ad outro',
      },
    ],
  }),
  buildExample({
    id: 'example-deskflow-demo',
    title: 'DeskFlow · Workspace proof ad',
    briefIndex: 1,
    angle: 'Portable problem-solution demo',
    rationale: 'Make the pain instantly familiar, then prove the stand fixes it in real work setups.',
    hooks: [
      '"My laptop setup looked fine until my neck disagreed."',
      '"This folds flatter than my charger brick."',
      '"If you work from coffee shops, this is the one desk thing I would keep."',
    ],
    cta: 'Pre-order at launch price before it jumps back to $59.',
    variantLabel: 'Workspace proof cut',
    platform: 'Reels / Shorts',
    intro: 'Open on a bad posture moment so the problem is obvious before the product appears.',
    bridge: 'Cut into fast setup proof with bag, laptop, and cable management in real environments.',
    outro: 'Close with launch price urgency and the travel pouch bonus.',
    palette: ['#0f172a', '#2563eb', '#22c55e'],
    scenes: [
      {
        shotType: 'Pain point',
        caption: 'Scene 1 — Bad laptop posture creates the problem instantly.',
        description: 'Start on the creator hunched at a café table with a frustrated look.',
        visualNote: 'Slightly wide frame, cramped table, real café setting.',
        audioDirection: 'Dry line: “This is what my back thinks about laptop-only days.”',
        durationEstimate: '4s',
        prompt: 'Freelancer hunched over laptop at small cafe table, cramped posture, coffee cup and cables around, natural window light, realistic creator-shot frame, relatable productivity pain point',
      },
      {
        shotType: 'Fast setup demo',
        caption: 'Scene 2 — Stand unfolds fast and feels compact.',
        description: 'Show one smooth unfold motion from pouch to desk setup.',
        visualNote: 'Hands-focused close shot with laptop and pouch visible.',
        audioDirection: 'Clean mechanical unfold sound, no music-heavy distraction.',
        durationEstimate: '5s',
        prompt: 'Hands unfolding slim aluminum laptop stand from small travel pouch onto cafe table, quick setup motion, practical tech aesthetic, natural light, handheld UGC framing',
      },
      {
        shotType: 'Before / after workspace',
        caption: 'Scene 3 — Real desk upgrade proof in one beat.',
        description: 'Cut between before and after to show screen height and cleaner cable flow.',
        visualNote: 'Matched angle for comparison, screen higher in after frame.',
        audioDirection: 'Voiceover: “Same table, way better setup.”',
        durationEstimate: '5s',
        prompt: 'Before-and-after style workspace frame showing laptop raised on compact stand, cleaner cable path, freelance work session, cafe background, believable creator tech review style',
      },
      {
        shotType: 'Portability proof',
        caption: 'Scene 4 — Fold-flat portability shown in the bag.',
        description: 'Slide the stand into a tote or backpack pocket beside daily carry items.',
        visualNote: 'Top-down packing shot, bag compartments visible.',
        audioDirection: 'Short VO: “It actually comes with me instead of living on my desk.”',
        durationEstimate: '4s',
        prompt: 'Top-down shot of compact aluminum laptop stand sliding into backpack pocket beside charger and notebook, organized carry setup, clean productivity UGC style',
      },
      {
        shotType: 'CTA / launch price',
        caption: 'Scene 5 — Price framing with bonus pouch closes the sale.',
        description: 'Show product upright with quick text hit for launch price and free pouch.',
        visualNote: 'Hero shot but still handheld and creator-native, not studio glossy.',
        audioDirection: 'Direct CTA with launch price urgency.',
        durationEstimate: '6s',
        prompt: 'Creator holding compact laptop stand toward camera with travel pouch visible, clean desk background, handheld close-up, launch price text-safe area, creator tech ad aesthetic',
      },
    ],
  }),
  buildExample({
    id: 'example-barkbond-safety',
    title: 'BarkBond · Dog safety proof ad',
    briefIndex: 2,
    angle: 'Safety proof with emotional relief',
    rationale: 'Show visibility and calm owner confidence without becoming sad or preachy.',
    hooks: [
      '"I did not realize how invisible my dog was at night until this."',
      '"The reflective stitching is the part I trust most on late walks."',
      '"This is the harness I reach for when the street gets dark fast."',
    ],
    cta: 'Use code WALKSAFE for 20% off plus the free matching leash.',
    variantLabel: 'Safety proof cut',
    platform: 'TikTok / Instagram Reels',
    intro: 'Start at dusk so the visibility problem feels immediate and real.',
    bridge: 'Move through fit, movement, and reflective proof in actual neighborhood walk footage.',
    outro: 'Close on calm confidence and the free leash offer.',
    palette: ['#052e16', '#15803d', '#38bdf8'],
    scenes: [
      {
        shotType: 'Dusk hook',
        caption: 'Scene 1 — Night-walk problem framed in one recognizable moment.',
        description: 'Owner clips leash on as the light drops and traffic glows behind them.',
        visualNote: 'Suburban sidewalk, dusk ambient light, dog and owner both visible.',
        audioDirection: 'Low-key, honest opening line about night visibility.',
        durationEstimate: '4s',
        prompt: 'Dog owner preparing for evening walk at dusk, subtle traffic glow in background, realistic neighborhood sidewalk, authentic handheld pet creator footage, calm but alert mood',
      },
      {
        shotType: 'Fit / comfort',
        caption: 'Scene 2 — Harness goes on easily and fits cleanly.',
        description: 'Show quick adjustment and comfortable movement on the dog.',
        visualNote: 'Medium shot at dog height, real dog body motion, no stock-photo stiffness.',
        audioDirection: 'Voiceover: “It fits fast and he does not fight it.”',
        durationEstimate: '5s',
        prompt: 'Dog owner adjusting reflective harness on happy active dog, dog-height camera angle, backyard or sidewalk setting, real movement, warm trustworthy pet content style',
      },
      {
        shotType: 'Reflective proof',
        caption: 'Scene 3 — Car-light catch shows the safety proof clearly.',
        description: 'Hit the reflective stitching when light passes across the dog.',
        visualNote: 'Side angle with headlight reflection visible on harness lines.',
        audioDirection: 'Brief punch line focused on visibility.',
        durationEstimate: '4s',
        prompt: 'Evening dog walk side view with reflective harness catching passing car light, clear visibility lines, realistic suburban street, handheld creator filming style',
      },
      {
        shotType: 'No-pull walk moment',
        caption: 'Scene 4 — Controlled walking shows functional benefit.',
        description: 'Show the dog moving forward while the owner stays in control without strain.',
        visualNote: 'Wide enough frame to show leash angle and walking rhythm.',
        audioDirection: 'VO: “The front clip makes busy corners feel way calmer.”',
        durationEstimate: '5s',
        prompt: 'Active dog walking confidently in reflective harness with owner maintaining easy control, neighborhood corner at blue hour, natural motion, social-native pet ad frame',
      },
      {
        shotType: 'CTA / offer close',
        caption: 'Scene 5 — Safe walk energy and offer close together.',
        description: 'Owner kneels by dog, taps harness, and calls out the offer with leash visible.',
        visualNote: 'Friendly warm close, leash bonus visible, end-card space.',
        audioDirection: 'Warm CTA with code mention and free leash bonus.',
        durationEstimate: '6s',
        prompt: 'Dog owner kneeling beside happy dog in reflective harness, free matching leash visible, evening neighborhood backdrop, warm creator-to-camera closing shot, clear CTA framing',
      },
    ],
  }),
];
