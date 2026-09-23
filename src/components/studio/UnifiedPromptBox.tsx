// Bidou AI Unified Prompt Box
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Plus,
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  Wand2,
  X,
  FileMusic,
  Disc,
  Check,
  ChevronDown,
  SlidersHorizontal,
  AlertCircle,
  CornerDownLeft,
  Lock,
  Settings,
} from 'lucide-react';
import { AiModelConfig, GenerationType, PlanTier, RestoreRequest } from '../../types';
export type { RestoreRequest };
import { CustomSelect } from '../common/CustomSelect';
import { GradientBorder } from '../common/GradientBorder';
import { InlineNotice } from '../common/InlineNotice';
import { quoteGenerationCost } from '../../services/pricingEngine';
import { COVER_ART_ROUTE_KEY } from '../../services/providerCatalog';
import { TIER_VARIANT_CAP } from '../../services/tiers';
import { getEnhanceErrorPresentation, EnhanceErrorPresentation } from '../../lib/errorMapping';

export interface EnhancePromptContext {
  rawPrompt: string;
  mediaType: string;
  modelId: string;
  aspectRatio?: string;
  variantCount?: number;
  durationSeconds?: number;
  resolution?: string;
  genre?: string;
  tonality?: string;
  hasReferenceImage?: boolean;
  previousVariants?: string[];
}

export interface TabState {
  prompt: string;
  originalPrompt: string;
  modelId: string;
  aspectRatio: '1:1' | '16:9' | '9:16';
  variantCount: number;
  referenceFileUrl: string | null;
  referenceFileName: string;
  // video only
  videoDuration: 5 | 8;
  videoResolution: '720p' | '1080p';
  // music only
  musicTitle: string;
  musicGenre: string;
  musicTonality: string;
  musicLyrics: string;
  coverArtUrl: string | null;
}

export interface PrefillRequest {
  prompt: string;
  type: GenerationType;
  token: number;
}

export const makeDefaultTabState = (
  type: GenerationType,
  models: AiModelConfig[],
  initialPrompt = '',
  planTier: PlanTier = 'free'
): TabState => {
  const tabModels = models.filter((m) => m.generation_type === type && m.active && m.licensing_verified);
  const defaultModelId = tabModels[0]?.id || (
    type === 'image' ? 'img_nano_banana_2_lite' :
    type === 'video' ? 'vid_veo_3_1_lite' :
    type === 'music' ? 'mus_lyria_3_pro' : ''
  );
  const tierCap = TIER_VARIANT_CAP[planTier] ?? 1;
  const defaultMusicVariants = Math.min(2, tierCap);

  return {
    prompt: initialPrompt,
    originalPrompt: '',
    modelId: defaultModelId,
    aspectRatio: type === 'video' ? '16:9' : (type === 'image' ? '16:9' : '1:1'),
    variantCount: type === 'music' ? defaultMusicVariants : 1,
    referenceFileUrl: null,
    referenceFileName: '',
    videoDuration: 5,
    videoResolution: '720p',
    musicTitle: '',
    musicGenre: 'Makossa',
    musicTonality: 'Celebratory & Energetic',
    musicLyrics: '',
    coverArtUrl: null,
  };
};

export interface UnifiedPromptBoxProps {
  models: AiModelConfig[];
  activeTab: GenerationType;
  onTabChange: (tab: GenerationType) => void;
  planTier?: PlanTier;
  onRequestUpgrade?: () => void;
  onGenerateImage: (params: {
    prompt: string;
    enhancedPrompt?: string;
    modelId: string;
    aspectRatio: string;
    referenceImageUrl?: string;
    variantCount?: number;
    clientSettings?: Record<string, any>;
  }) => Promise<void>;
  onGenerateVideo: (params: {
    prompt: string;
    enhancedPrompt?: string;
    modelId: string;
    durationSeconds: number;
    resolution: '720p' | '1080p';
    aspectRatio: string;
    referenceImageUrl?: string;
    variantCount?: number;
    clientSettings?: Record<string, any>;
  }) => Promise<void>;
  onGenerateMusic: (params: {
    prompt: string;
    enhancedPrompt?: string;
    modelId: string;
    genre: string;
    tonality: string;
    lyrics?: string;
    title?: string;
    variantCount?: number;
    clientSettings?: Record<string, any>;
  }) => Promise<void>;
  onEnhancePrompt: (context: EnhancePromptContext) => Promise<string>;
  onGenerateLyrics: (params: { title: string; genre: string; tonality: string }) => Promise<string>;
  onRewriteLyrics: (lyrics: string) => Promise<string>;
  onGenerateCoverArt: (params: { title: string; genre: string }) => Promise<string>;
  isGenerating?: boolean;
  prefillRequest?: PrefillRequest | null;
  prefilledPrompt?: string;
  restoreRequest?: RestoreRequest | null;
  walletBalance?: number;
  onInsufficientCredits?: (params: {
    required: number;
    available: number;
    variantCount: number;
    unitCost: number;
    mediaType: GenerationType;
  }) => void;
}

export const UnifiedPromptBox: React.FC<UnifiedPromptBoxProps> = ({
  models,
  activeTab,
  onTabChange,
  planTier = 'free',
  onRequestUpgrade,
  onGenerateImage,
  onGenerateVideo,
  onGenerateMusic,
  onEnhancePrompt,
  onGenerateLyrics,
  onRewriteLyrics,
  onGenerateCoverArt,
  isGenerating = false,
  prefillRequest = null,
  prefilledPrompt = '',
  restoreRequest = null,
  walletBalance,
  onInsufficientCredits,
}) => {
  // Per-tab state (Section 4.3.1)
  const [tabStates, setTabStates] = useState<Record<GenerationType, TabState>>(() => ({
    image: makeDefaultTabState('image', models, activeTab === 'image' ? (prefillRequest?.prompt || prefilledPrompt) : '', planTier as PlanTier),
    video: makeDefaultTabState('video', models, activeTab === 'video' ? (prefillRequest?.prompt || prefilledPrompt) : '', planTier as PlanTier),
    music: makeDefaultTabState('music', models, activeTab === 'music' ? (prefillRequest?.prompt || prefilledPrompt) : '', planTier as PlanTier),
    voice: makeDefaultTabState('voice', models, activeTab === 'voice' ? (prefillRequest?.prompt || prefilledPrompt) : '', planTier as PlanTier),
  }));

  const current = tabStates[activeTab] || makeDefaultTabState(activeTab, models, '', planTier as PlanTier);
  const patchTab = (patch: Partial<TabState>, tab: GenerationType = activeTab) =>
    setTabStates((s) => ({ ...s, [tab]: { ...(s[tab] || makeDefaultTabState(tab, models, '', planTier as PlanTier)), ...patch } }));

  // Textarea reference for programmatic auto-resize fallback (Safari, Firefox)
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mobile/Tablet Settings Modal state and draft pattern (Section 4 — Issue 2)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [draft, setDraft] = useState<TabState | null>(null);

  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalPanelRef = useRef<HTMLElement>(null);
  const wasSettingsOpenRef = useRef(false);

  const openSettings = () => {
    setDraft({ ...current });
    setSettingsModalOpen(true);
  };

  const closeSettings = () => {
    setSettingsModalOpen(false);
  };

  // Close the drawer if activeTab changes (the draft belongs to the old tab)
  useEffect(() => {
    if (settingsModalOpen) {
      setSettingsModalOpen(false);
    }
  }, [activeTab]);

  // Close on Escape key (discard semantics — leaves current completely unchanged)
  useEffect(() => {
    if (!settingsModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSettings();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settingsModalOpen]);

  // Focus-restore effect guarded by wasSettingsOpenRef so focus returns to trigger only after a real open->close (never on mount)
  useEffect(() => {
    if (settingsModalOpen) {
      wasSettingsOpenRef.current = true;
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus({ preventScroll: true });
      }, 50);
      return () => clearTimeout(timer);
    } else if (wasSettingsOpenRef.current) {
      wasSettingsOpenRef.current = false;
      settingsTriggerRef.current?.focus({ preventScroll: true });
    }
  }, [settingsModalOpen]);

  // Fallback auto-resize for browsers without native field-sizing support (Safari, Firefox)
  useLayoutEffect(() => {
    if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('field-sizing', 'content')) {
      return;
    }
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = typeof window !== 'undefined' ? window.innerHeight * 0.4 : 300;
    const targetHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${targetHeight}px`;
  }, [current.prompt]);

  // Track if textarea has more scrollable content below viewport (for mobile fade indicator)
  const [canScrollDown, setCanScrollDown] = useState(false);
  const checkTextareaScroll = () => {
    const el = textareaRef.current;
    if (!el) {
      setCanScrollDown(false);
      return;
    }
    const hasOverflow = el.scrollHeight > el.clientHeight + 4;
    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 6;
    setCanScrollDown(hasOverflow && !isAtBottom);
  };

  useLayoutEffect(() => {
    checkTextareaScroll();
  }, [current.prompt, activeTab]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const onScroll = () => checkTextareaScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Enhancement ephemeral states
  const [enhanceHistory, setEnhanceHistory] = useState<string[]>([]);
  const [enhanceError, setEnhanceError] = useState<EnhanceErrorPresentation | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Prefill handling: respond to prefillRequest.token changes by writing into target tab's slot (Section 4.3.3)
  const lastPrefillTokenRef = useRef<number | null>(null);
  useEffect(() => {
    if (prefillRequest && prefillRequest.token !== lastPrefillTokenRef.current) {
      lastPrefillTokenRef.current = prefillRequest.token;
      patchTab(
        {
          prompt: prefillRequest.prompt,
          originalPrompt: '',
        },
        prefillRequest.type
      );
      if (prefillRequest.type === activeTab) {
        setEnhanceHistory([]);
        setEnhanceError(null);
      }
    }
  }, [prefillRequest, activeTab]);

  // Backwards-compatibility for string prefilledPrompt if prefillRequest is not used
  const lastPrefilledPromptRef = useRef<string>('');
  useEffect(() => {
    if (!prefillRequest && prefilledPrompt && prefilledPrompt !== lastPrefilledPromptRef.current) {
      lastPrefilledPromptRef.current = prefilledPrompt;
      patchTab({ prompt: prefilledPrompt, originalPrompt: '' }, activeTab);
      setEnhanceHistory([]);
      setEnhanceError(null);
    }
  }, [prefilledPrompt, prefillRequest, activeTab]);

  // Section 5.3.4: Restore prompt & full studio snapshot for Retry / Reuse Prompt
  const [referenceNote, setReferenceNote] = useState<string | null>(null);
  const lastRestoreTokenRef = useRef<number | null>(null);
  useEffect(() => {
    if (restoreRequest && restoreRequest.token !== lastRestoreTokenRef.current) {
      lastRestoreTokenRef.current = restoreRequest.token;
      const { tab, settings } = restoreRequest;
      if (!tab || !settings) return;

      setTabStates((prev) => {
        const existing = prev[tab] || makeDefaultTabState(tab, models);
        const restoredPrompt =
          settings.enhancedPrompt ||
          settings.originalPrompt ||
          settings.prompt ||
          existing.prompt;

        return {
          ...prev,
          [tab]: {
            ...existing,
            prompt: restoredPrompt,
            originalPrompt: settings.originalPrompt || '',
            modelId: settings.modelId || existing.modelId,
            aspectRatio: settings.aspectRatio || existing.aspectRatio,
            variantCount:
              typeof settings.variantCount === 'number'
                ? settings.variantCount
                : existing.variantCount,
            videoDuration:
              typeof settings.videoDuration === 'number'
                ? settings.videoDuration
                : existing.videoDuration,
            videoResolution: settings.videoResolution || existing.videoResolution,
            musicGenre: settings.musicGenre || existing.musicGenre,
            musicTonality: settings.musicTonality || existing.musicTonality,
            musicTitle: settings.musicTitle || existing.musicTitle,
            musicLyrics: settings.musicLyrics || existing.musicLyrics,
            referenceFileName: settings.referenceFileName || '',
            referenceFileUrl: null, // Binary file cannot be restored from snapshot
          },
        };
      });

      if (settings.referenceFileName) {
        setReferenceNote(`Re-attach ${settings.referenceFileName} if you want to reuse it.`);
      } else {
        setReferenceNote(null);
      }
      setEnhanceHistory([]);
      setEnhanceError(null);
    }
  }, [restoreRequest, models]);

  // Ensure tabs have valid model IDs when models list is available or updated
  useEffect(() => {
    setTabStates((prev) => {
      let changed = false;
      const next = { ...prev };
      (['image', 'video', 'music', 'voice'] as GenerationType[]).forEach((type) => {
        const typeModels = models.filter((m) => m.generation_type === type && m.active && m.licensing_verified);
        const currentModelId = next[type]?.modelId;
        const isValid = typeModels.some((m) => m.id === currentModelId);
        if (!isValid && typeModels.length > 0) {
          next[type] = {
            ...next[type],
            modelId: typeModels[0].id,
          };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [models]);

  // Clear enhance error when active tab changes
  useEffect(() => {
    setEnhanceError(null);
  }, [activeTab]);

  // Models filtered by active tab
  const tabModels = models.filter((m) => m.generation_type === activeTab && m.active && m.licensing_verified);
  const activeModel = tabModels.find((m) => m.id === current.modelId) || tabModels[0];

  // Variant count selector & authoritative tier clamping (Section 4c)
  const maxVariants = activeModel?.max_concurrent_variants ?? 1;
  const tierCap = TIER_VARIANT_CAP[planTier || 'free'] ?? 1;
  const effectiveCap = activeTab === 'music'
    ? Math.min(2, tierCap)
    : Math.min(maxVariants, tierCap);

  useEffect(() => {
    if (current.variantCount > effectiveCap) {
      patchTab({ variantCount: effectiveCap });
    }
  }, [effectiveCap, current.variantCount]);

  // If activeModel has restricted supported_aspect_ratios, clamp current.aspectRatio
  useEffect(() => {
    if (
      activeModel?.supported_aspect_ratios &&
      activeModel.supported_aspect_ratios.length > 0 &&
      !activeModel.supported_aspect_ratios.includes(current.aspectRatio)
    ) {
      patchTab({ aspectRatio: activeModel.supported_aspect_ratios[0] as any });
    }
  }, [activeModel?.id, activeModel?.supported_aspect_ratios, current.aspectRatio]);

  // Textarea state and change handler
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    patchTab({ prompt: e.target.value, originalPrompt: '' });
    setEnhanceHistory([]);
    setEnhanceError(null);
  };

  // Music async states
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [isRewritingLyrics, setIsRewritingLyrics] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isTrackDetailsOpen, setIsTrackDetailsOpen] = useState(false);

  // Live quote cost breakdown driven by quoteGenerationCost (Section 3.3)
  const quote = quoteGenerationCost({
    model: activeModel,
    durationSeconds: current.videoDuration,
    resolution: current.videoResolution,
    includeAudio: true,
    variantCount: activeTab === 'music' ? effectiveCap : current.variantCount,
  });

  const isInsufficient = typeof walletBalance === 'number' && quote.totalCost > walletBalance;
  const shortfall = typeof walletBalance === 'number' && isInsufficient ? quote.totalCost - walletBalance : 0;
  const maxAffordable = typeof walletBalance === 'number' && quote.unitCost > 0
    ? Math.floor(walletBalance / quote.unitCost)
    : 0;

  // Cover art add-on cost derived from providerCatalog
  const coverModel = models.find((m) => m.model_name === COVER_ART_ROUTE_KEY);
  const coverArtCost = coverModel ? quoteGenerationCost({ model: coverModel, variantCount: 1 }).totalCost : 80;

  // High-value confirmation dialog state (Section 3.3)
  const [highValueConfirmOpen, setHighValueConfirmOpen] = useState(false);

  // Handle Prompt Enhancement (Section 2.3.1)
  const handleEnhance = async () => {
    if (!current.prompt.trim() || isEnhancing) return;

    // The FIRST enhance click captures the user's own words as the
    // immutable source. Every later click re-rolls from that source,
    // so enhancement never compounds.
    const source = current.originalPrompt || current.prompt;
    if (!current.originalPrompt) patchTab({ originalPrompt: current.prompt });

    setIsEnhancing(true);
    setEnhanceError(null);
    try {
      const enhanced = await onEnhancePrompt({
        rawPrompt: source,
        mediaType: activeTab,
        modelId: activeModel?.id ?? '',
        aspectRatio: current.aspectRatio,
        variantCount: current.variantCount,
        durationSeconds: activeTab === 'video' ? current.videoDuration : undefined,
        resolution:     activeTab === 'video' ? current.videoResolution : undefined,
        genre:          activeTab === 'music' ? current.musicGenre : undefined,
        tonality:       activeTab === 'music' ? current.musicTonality : undefined,
        hasReferenceImage: !!current.referenceFileUrl,
        previousVariants: enhanceHistory, // so Gemini avoids repeating itself
      });
      patchTab({ prompt: enhanced });
      setEnhanceHistory((h) => [...h, enhanced].slice(-3));
    } catch (e: any) {
      const presentation = getEnhanceErrorPresentation(e);
      setEnhanceError(presentation);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileName = file.name;
      const reader = new FileReader();
      reader.onload = (event) => {
        patchTab({
          referenceFileName: fileName,
          referenceFileUrl: event.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearUpload = () => {
    patchTab({
      referenceFileUrl: null,
      referenceFileName: '',
    });
  };

  // Handle Music Lyrics Generation & Rewrite
  const handleGenerateLyricsClick = async () => {
    setIsGeneratingLyrics(true);
    try {
      const generated = await onGenerateLyrics({
        title: current.musicTitle || 'Chant de Joie',
        genre: current.musicGenre,
        tonality: current.musicTonality,
      });
      patchTab({ musicLyrics: generated });
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const handleRewriteLyricsClick = async () => {
    if (!current.musicLyrics.trim()) return;
    setIsRewritingLyrics(true);
    try {
      const rewritten = await onRewriteLyrics(current.musicLyrics);
      patchTab({ musicLyrics: rewritten });
    } finally {
      setIsRewritingLyrics(false);
    }
  };

  // Handle Cover Art Generation
  const handleCoverArtClick = async () => {
    setIsGeneratingCover(true);
    try {
      const cover = await onGenerateCoverArt({
        title: current.musicTitle || 'African Rhythm Single',
        genre: current.musicGenre,
      });
      patchTab({ coverArtUrl: cover });
    } finally {
      setIsGeneratingCover(false);
    }
  };

  // Handle Submit / Trigger Generation (Section 2.3.5 & 4.3.2 & 5.3.1)
  const executeFinalGeneration = async () => {
    const snapshot = { ...current }; // captured for retry (Section 5)
    const isEnhanced = !!snapshot.originalPrompt && snapshot.originalPrompt !== snapshot.prompt;
    const finalPrompt = isEnhanced ? snapshot.originalPrompt : snapshot.prompt;
    const enhancedPrompt = isEnhanced ? snapshot.prompt : undefined;

    const clientSettings = {
      tab: activeTab,
      modelId: activeModel?.id || snapshot.modelId,
      aspectRatio: snapshot.aspectRatio,
      variantCount: snapshot.variantCount,
      videoDuration: snapshot.videoDuration,
      videoResolution: snapshot.videoResolution,
      musicTitle: snapshot.musicTitle,
      musicGenre: snapshot.musicGenre,
      musicTonality: snapshot.musicTonality,
      musicLyrics: snapshot.musicLyrics,
      originalPrompt: snapshot.originalPrompt || snapshot.prompt,
      enhancedPrompt: isEnhanced ? snapshot.prompt : null,
      referenceFileName: snapshot.referenceFileName || null,
    };

    try {
      if (activeTab === 'image') {
        await onGenerateImage({
          prompt: finalPrompt,
          enhancedPrompt,
          modelId: activeModel?.id || snapshot.modelId,
          aspectRatio: snapshot.aspectRatio,
          referenceImageUrl: snapshot.referenceFileUrl || undefined,
          variantCount: snapshot.variantCount,
          clientSettings,
        });
      } else if (activeTab === 'video') {
        await onGenerateVideo({
          prompt: finalPrompt,
          enhancedPrompt,
          modelId: activeModel?.id || snapshot.modelId,
          durationSeconds: snapshot.videoDuration,
          resolution: snapshot.videoResolution,
          aspectRatio: snapshot.aspectRatio,
          referenceImageUrl: snapshot.referenceFileUrl || undefined,
          variantCount: snapshot.variantCount,
          clientSettings,
        });
      } else if (activeTab === 'music') {
        await onGenerateMusic({
          prompt: finalPrompt,
          enhancedPrompt,
          modelId: activeModel?.id || snapshot.modelId,
          genre: snapshot.musicGenre,
          tonality: snapshot.musicTonality,
          lyrics: snapshot.musicLyrics || undefined,
          title: snapshot.musicTitle || undefined,
          variantCount: effectiveCap,
          clientSettings,
        });
      }

      // Success — clear ONLY this tab's prompt and attachment.
      // Model, aspect ratio and variant count persist: those are
      // working preferences, not one-shot input.
      patchTab({
        prompt: '',
        originalPrompt: '',
        referenceFileUrl: null,
        referenceFileName: '',
        musicLyrics: activeTab === 'music' ? '' : current.musicLyrics,
      });
      setEnhanceHistory([]);
      setEnhanceError(null);
    } catch (err) {
      // Failure — preserve everything so the user can retry immediately.
      console.warn('[Studio] Generation dispatch failed, prompt preserved:', err);
    }
  };

  const handleTriggerGenerate = async () => {
    if (!current.prompt.trim() || isGenerating) return;

    if (typeof walletBalance === 'number' && quote.totalCost > walletBalance) {
      onInsufficientCredits?.({
        required: quote.totalCost,
        available: walletBalance,
        variantCount: quote.variantCount,
        unitCost: quote.unitCost,
        mediaType: activeTab,
      });
      return;
    }

    // High-value confirmation step (Section 3.3):
    // if quote.totalCost >= 5000, must first open confirm dialog:
    // "This will use {total} credits ({n} × {unit}). Continue?"
    if (quote.totalCost >= 5000) {
      setHighValueConfirmOpen(true);
      return;
    }

    await executeFinalGeneration();
  };

  // Option lists
  const modelOptions = tabModels.map((m) => ({
    value: m.id,
    label: m.display_name,
    sublabel: `${m.credit_cost} credits ≈ ${m.credit_cost} FCFA`,
    badge: m.quality_tier,
  }));

  const supportedRatios = activeModel?.supported_aspect_ratios;
  const aspectRatioOptions = [
    {
      value: '16:9',
      label: '16:9',
      disabled: supportedRatios ? !supportedRatios.includes('16:9') : false,
      disabledReason:
        supportedRatios && !supportedRatios.includes('16:9')
          ? `Not supported by ${activeModel?.display_name || 'selected model'}`
          : undefined,
    },
    {
      value: '9:16',
      label: '9:16',
      disabled: supportedRatios ? !supportedRatios.includes('9:16') : false,
      disabledReason:
        supportedRatios && !supportedRatios.includes('9:16')
          ? `Not supported by ${activeModel?.display_name || 'selected model'}`
          : undefined,
    },
    {
      value: '1:1',
      label: '1:1',
      disabled: supportedRatios ? !supportedRatios.includes('1:1') : false,
      disabledReason:
        supportedRatios && !supportedRatios.includes('1:1')
          ? `Not supported by ${activeModel?.display_name || 'selected model'}`
          : undefined,
    },
  ];

  const musicGenreOptions = [
    { value: 'Makossa', label: 'Makossa (Cameroon Bass & Brass)' },
    { value: 'Bikutsi', label: 'Bikutsi (Fast Rhythmic Central African Drive)' },
    { value: 'Mbolé', label: 'Mbolé (Street Percussion & Modern Poly-rhythms)' },
    { value: 'Amapiano', label: 'Amapiano (Log-drum Deep House Grooves)' },
    { value: 'Afrobeats', label: 'Afrobeats (Lagos / Global Afro-fusion)' },
    { value: 'Highlife', label: 'Highlife (Warm West African Guitars)' },
    { value: 'African Cinematic', label: 'African Cinematic Orchestral' },
    { value: 'Gospel', label: 'African Praise & Worship Gospel' },
    { value: 'Zouk', label: 'Afro-Zouk / Sensual Grooves' },
  ];

  const musicTonalityOptions = [
    { value: 'Celebratory & Energetic', label: 'Celebratory & Festive' },
    { value: 'Passionate & Romantic', label: 'Love & Sensual' },
    { value: 'Spiritual & Deep', label: 'Soulful & Uplifting' },
    { value: 'Street Anthem', label: 'High-energy Club Anthem' },
    { value: 'Cinematic & Melancholic', label: 'Reflective & Emotional' },
  ];

  const getPlaceholderText = () => {
    switch (activeTab) {
      case 'video':
        return 'What video would you like to create? (e.g. Cinematic aerial shot over Mount Cameroon...)';
      case 'music':
        return 'What music would you like to compose? (e.g. Upbeat Makossa rhythm with live brass...)';
      case 'image':
      default:
        return 'What can we create today? (e.g. Afrofuturistic portrait with glowing gold Ndop pattern...)';
    }
  };

  return (
    <GradientBorder mode="always" radius={24} thickness={1.5} glow className="w-full">
      <div className="rounded-[22.5px] bg-[#FFFFFF] dark:bg-[#18181B] p-3 sm:p-4 flex flex-col gap-3 shadow-xl">
        {/* ========================================================================= */}
        {/* 1. TOP ROW — MEDIA-TYPE TABS INSIDE THE BOX                                */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-1 p-0.5 rounded-full bg-black/5 dark:bg-white/5">
            <button
              type="button"
              onClick={() => onTabChange('image')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'image'
                  ? 'bg-brand-gradient text-white shadow-sm shadow-[#F86A00]/20'
                  : 'text-[#6B6B75] dark:text-[#A0A0AA] hover:text-[#1A1A1E] dark:hover:text-[#F5F5F7]'
              }`}
            >
              <ImageIcon size={14} />
              <span>Image</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('video')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'video'
                  ? 'bg-brand-gradient text-white shadow-sm shadow-[#F86A00]/20'
                  : 'text-[#6B6B75] dark:text-[#A0A0AA] hover:text-[#1A1A1E] dark:hover:text-[#F5F5F7]'
              }`}
            >
              <VideoIcon size={14} />
              <span>Video</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('music')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'music'
                  ? 'bg-brand-gradient text-white shadow-sm shadow-[#F86A00]/20'
                  : 'text-[#6B6B75] dark:text-[#A0A0AA] hover:text-[#1A1A1E] dark:hover:text-[#F5F5F7]'
              }`}
            >
              <MusicIcon size={14} />
              <span>Music</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[11px] text-[#6B6B75] dark:text-[#A0A0AA] font-mono">
              Powered by Bidou AI
            </span>
          </div>
        </div>

        {/* Inline Enhance Error Alert (Section 2.3.1 & 4d) */}
        {enhanceError && (
          <InlineNotice
            variant={enhanceError.code === 'NETWORK_ERROR' ? 'error' : 'warning'}
            icon={Wand2}
            title={enhanceError.title}
            message={enhanceError.message}
            devHint={enhanceError.devHint}
            onRetry={enhanceError.canRetry ? handleEnhance : undefined}
            onDismiss={() => setEnhanceError(null)}
          />
        )}

        {/* Section 5.3.4: Reference file reuse notification note */}
        {referenceNote && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs animate-fade-in">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertCircle size={14} className="shrink-0 text-amber-500" />
              <span className="truncate">{referenceNote}</span>
            </div>
            <button
              type="button"
              onClick={() => setReferenceNote(null)}
              className="text-[11px] font-semibold underline opacity-80 hover:opacity-100 cursor-pointer shrink-0 ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. PROMPT TEXTAREA (MAIN FREEFORM INPUT - SITS DIRECTLY IN SHELL)         */}
        {/* ========================================================================= */}
        <div className="relative w-full">
          <textarea
            ref={textareaRef}
            id="unified-prompt-input"
            rows={3}
            value={current.prompt}
            onChange={handlePromptChange}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleTriggerGenerate();
              }
            }}
            placeholder={getPlaceholderText()}
            className="w-full px-2 sm:px-3 py-1.5 bg-transparent text-base sm:text-sm text-[#1A1A1E] dark:text-[#F5F5F7] placeholder-[#8E8E98] dark:placeholder-[#71717A] focus:outline-none transition-colors resize-none leading-relaxed min-h-[110px] sm:min-h-[135px] max-h-[40dvh] field-sizing-content overflow-y-auto overscroll-contain prompt-box-scrollbar"
          />

          {/* Mobile Bottom Fade Mask Indicator: subtle visual clue when content overflows (hidden on desktop) */}
          <div
            aria-hidden="true"
            className={`sm:hidden pointer-events-none absolute bottom-0 left-0 right-0 h-7 bg-gradient-to-t from-[#FFFFFF] dark:from-[#18181B] to-transparent transition-opacity duration-200 ${
              canScrollDown ? 'opacity-90' : 'opacity-0'
            }`}
          />

          {/* Reference File Thumbnail Attachment Indicator */}
          {current.referenceFileUrl && (
            <div className="absolute bottom-2 right-2 flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-black/80 text-white text-[11px] backdrop-blur-md">
              {current.referenceFileUrl.startsWith('data:image') ? (
                <img
                  src={current.referenceFileUrl}
                  alt="Ref"
                  className="w-6 h-6 object-cover rounded-lg"
                />
              ) : (
                <Upload size={14} className="text-[#FF8800]" />
              )}
              <span className="truncate max-w-[100px]">{current.referenceFileName || 'Attached'}</span>
              <button
                type="button"
                onClick={handleClearUpload}
                className="hover:text-[#E74C3C] transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. MEDIA-SPECIFIC EXTRA FIELDS (MUSIC TAB ONLY) — COLLAPSIBLE DISCLOSURE   */}
        {/* ========================================================================= */}
        {activeTab === 'music' && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsTrackDetailsOpen(!isTrackDetailsOpen)}
              className="flex items-center justify-between px-3 py-2 rounded-xl glass-panel text-xs font-semibold text-[#1A1A1E] dark:text-[#F5F5F7] hover:border-[#FF8800]/40 transition-all cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={13} className="text-[#F86A00]" />
                <span>Track details</span>
                <span className="text-[11px] text-[#6B6B75] dark:text-[#A0A0AA] font-normal">
                  {current.musicTitle ? `(${current.musicTitle})` : '(Title, genre, lyrics & cover art)'}
                </span>
              </div>
              <ChevronDown
                size={14}
                className={`text-[#6B6B75] transition-transform duration-200 ${
                  isTrackDetailsOpen ? 'rotate-180 text-[#F86A00]' : ''
                }`}
              />
            </button>

            {isTrackDetailsOpen && (
              <div className="flex flex-col gap-3 p-3.5 rounded-2xl glass-panel-subtle border border-[#FF8800]/20 bg-black/5 dark:bg-white/5 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Song Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#1A1A1E] dark:text-[#F5F5F7]">
                      Track Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Soleil de Wouri"
                      value={current.musicTitle}
                      onChange={(e) => patchTab({ musicTitle: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl glass-panel text-base sm:text-xs text-[#1A1A1E] dark:text-[#F5F5F7] focus:outline-none focus:ring-1 focus:ring-[#F86A00]"
                    />
                  </div>

                  {/* African Genre Dropdown */}
                  <div className="flex flex-col">
                    <CustomSelect
                      label="African Genre"
                      options={musicGenreOptions}
                      value={current.musicGenre}
                      onChange={(val) => patchTab({ musicGenre: val })}
                    />
                  </div>

                  {/* Tonality / Emotion Dropdown */}
                  <div className="flex flex-col">
                    <CustomSelect
                      label="Vibe & Tonality"
                      options={musicTonalityOptions}
                      value={current.musicTonality}
                      onChange={(val) => patchTab({ musicTonality: val })}
                    />
                  </div>
                </div>

                {/* Lyrics Section */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[#FF8800]/10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#1A1A1E] dark:text-[#F5F5F7] flex items-center gap-1.5">
                      <FileMusic size={13} className="text-[#F86A00]" />
                      <span>Lyrics & Vocals (Optional)</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateLyricsClick}
                        disabled={isGeneratingLyrics}
                        className="flex items-center gap-1 text-[11px] font-bold text-brand-gradient hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50"
                      >
                        <Wand2 size={11} />
                        <span>{isGeneratingLyrics ? 'Writing…' : 'AI Lyricist'}</span>
                      </button>

                      {current.musicLyrics.trim() && (
                        <button
                          type="button"
                          onClick={handleRewriteLyricsClick}
                          disabled={isRewritingLyrics}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg glass-panel text-[10px] font-bold text-[#F86A00] hover:border-[#FF8800] transition-all cursor-pointer disabled:opacity-50"
                        >
                          <span>{isRewritingLyrics ? 'Enhancing…' : 'AI Rewrite (300 FCFA)'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="w-full">
                    <textarea
                      rows={2}
                      value={current.musicLyrics}
                      onChange={(e) => patchTab({ musicLyrics: e.target.value })}
                      placeholder="Write custom lyrics in French, English, Duala, Ewondo, or Pidgin — or click AI Lyricist above to auto-compose verse & chorus."
                      className="w-full p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-base sm:text-xs text-[#1A1A1E] dark:text-[#F5F5F7] placeholder-[#A0A0AA] focus:outline-none focus:border-[#FF8800]/40 transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* Cover Art Generator Button */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    {current.coverArtUrl ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={current.coverArtUrl}
                          alt="Cover"
                          className="w-8 h-8 rounded-lg object-cover border border-[#FF8800]"
                        />
                        <span className="text-[11px] text-[#2ECC71] font-semibold flex items-center gap-1">
                          <Check size={12} />
                          Cover Art Ready
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#6B6B75] dark:text-[#A0A0AA]">
                        Need album cover art for your track?
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCoverArtClick}
                    disabled={isGeneratingCover}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel text-xs font-semibold text-[#F86A00] border border-[#FF8800]/30 hover:border-[#FF8800] transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Disc size={13} />
                    <span>{isGeneratingCover ? 'Generating…' : `Generate Cover Art (${coverArtCost} FCFA)`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Video Extra Specs (Compact Duration & Resolution) — Desktop only (moved to Settings modal on mobile/tablet) */}
        {activeTab === 'video' && (
          <div className="hidden lg:flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#6B6B75] dark:text-[#A0A0AA] px-1">
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-semibold text-[#1A1A1E] dark:text-[#F5F5F7]">Duration:</span>
              <button
                type="button"
                onClick={() => patchTab({ videoDuration: 5 })}
                className={`px-2.5 py-1 rounded-full font-mono text-[11px] cursor-pointer transition-colors ${
                  current.videoDuration === 5
                    ? 'bg-brand-gradient text-white font-bold'
                    : 'border border-black/10 dark:border-white/10 hover:border-[#FF8800]/40 text-[#6B6B75] dark:text-[#A0A0AA]'
                }`}
              >
                5s (Standard)
              </button>
              <button
                type="button"
                onClick={() => patchTab({ videoDuration: 8 })}
                className={`px-2.5 py-1 rounded-full font-mono text-[11px] cursor-pointer transition-colors ${
                  current.videoDuration === 8
                    ? 'bg-brand-gradient text-white font-bold'
                    : 'border border-black/10 dark:border-white/10 hover:border-[#FF8800]/40 text-[#6B6B75] dark:text-[#A0A0AA]'
                }`}
              >
                8s (Extended)
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-semibold text-[#1A1A1E] dark:text-[#F5F5F7]">Quality:</span>
              <button
                type="button"
                onClick={() => patchTab({ videoResolution: '720p' })}
                className={`px-2.5 py-1 rounded-full font-mono text-[11px] cursor-pointer transition-colors ${
                  current.videoResolution === '720p'
                    ? 'bg-brand-gradient text-white font-bold'
                    : 'border border-black/10 dark:border-white/10 hover:border-[#FF8800]/40 text-[#6B6B75] dark:text-[#A0A0AA]'
                }`}
              >
                720p HD
              </button>
              <button
                type="button"
                onClick={() => patchTab({ videoResolution: '1080p' })}
                className={`px-2.5 py-1 rounded-full font-mono text-[11px] cursor-pointer transition-colors ${
                  current.videoResolution === '1080p'
                    ? 'bg-brand-gradient text-white font-bold'
                    : 'border border-black/10 dark:border-white/10 hover:border-[#FF8800]/40 text-[#6B6B75] dark:text-[#A0A0AA]'
                }`}
              >
                1080p FHD
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. BOTTOM ROW — EXACT ORDER MANDATED BY SPEC (SECTION 3.5)                */}
        {/* Order: (1) '+' upload, (2) Model selector, (3) Aspect-ratio, (4) Buttons */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-black/5 dark:border-white/5">
          <div className="flex items-center flex-wrap gap-2 flex-1">
            {/* 1. '+' Upload Button (Circular icon button, no text label, no rectangular border) */}
            <label
              title="Upload reference media"
              className="w-9 h-9 rounded-full border border-black/10 dark:border-white/10 hover:border-[#FF8800] dark:hover:border-[#FF8800] bg-black/[0.02] dark:bg-white/[0.03] flex items-center justify-center text-[#6B6B75] dark:text-[#A0A0AA] hover:text-[#F86A00] transition-all cursor-pointer shrink-0"
            >
              <Plus size={18} className="text-[#F86A00]" />
              <input
                type="file"
                accept={
                  activeTab === 'image'
                    ? 'image/*'
                    : activeTab === 'video'
                    ? 'image/*,video/*'
                    : 'audio/*,image/*'
                }
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Mobile/Tablet Settings Trigger — replaces inline controls below lg */}
            <button
              type="button"
              ref={settingsTriggerRef}
              onClick={openSettings}
              aria-label="Generation settings"
              className="w-9 h-9 rounded-full border border-black/10 dark:border-white/10 hover:border-[#FF8800] dark:hover:border-[#FF8800] bg-black/[0.02] dark:bg-white/[0.03] flex items-center justify-center text-[#6B6B75] dark:text-[#A0A0AA] hover:text-[#F86A00] transition-all cursor-pointer shrink-0 lg:hidden"
            >
              <Settings size={18} className="text-[#F86A00]" />
            </button>

            {/* Desktop Inline Controls (Hidden below lg, rendered in slide-in Settings modal instead) */}
            <div className="hidden lg:flex items-center flex-wrap gap-2">
              {/* 2. Model Selector (Filtered by active tab) - lighter pill style */}
              <div className="w-48 sm:w-56">
                <CustomSelect
                  label=""
                  variant="pill"
                  forcePlacement="top"
                  options={modelOptions}
                  value={current.modelId}
                  onChange={(val) => patchTab({ modelId: val })}
                />
              </div>

              {/* 3. Aspect-Ratio Selector - lighter pill style */}
              {activeTab !== 'music' && (
                <div className="w-36 sm:w-40">
                  <CustomSelect
                    label=""
                    variant="pill"
                    forcePlacement="top"
                    options={aspectRatioOptions}
                    value={current.aspectRatio}
                    onChange={(val) => patchTab({ aspectRatio: val as any })}
                  />
                </div>
              )}

              {/* 3.1 & 3.2: Variant Count Selector (Image/Video) or Music Takes Display (Section 4c) */}
              {activeTab !== 'music' ? (
                <div className="flex items-center gap-1 p-0.5 rounded-full bg-black/5 dark:bg-white/5 shrink-0">
                  {[1, 2, 3, 4].map((n) => {
                    const isTierLocked = n > tierCap;
                    const modelDisabled = n > maxVariants;
                    const costForN = n * quote.unitCost;
                    const creditExceeded = typeof walletBalance === 'number' && costForN > walletBalance;
                    const disabled = modelDisabled || creditExceeded;

                    let tooltip = `Generate ${n} variant${n > 1 ? 's' : ''}`;
                    if (isTierLocked) {
                      const reqTier = n === 2 ? 'Starter' : n === 3 ? 'Creator' : 'Pro';
                      tooltip = `Upgrade to ${reqTier} to generate ${n} variants at once`;
                    } else if (modelDisabled) {
                      tooltip = `${activeModel?.display_name || 'This model'} supports up to ${maxVariants} at once`;
                    } else if (creditExceeded) {
                      tooltip = maxAffordable > 0
                        ? `Exceeds balance. Affordable up to ${maxAffordable} variant${maxAffordable > 1 ? 's' : ''}`
                        : 'Exceeds balance';
                    }

                    return (
                      <button
                        key={n}
                        type="button"
                        disabled={!isTierLocked && disabled}
                        onClick={() => {
                          if (isTierLocked) {
                            onRequestUpgrade?.();
                            return;
                          }
                          patchTab({ variantCount: n });
                        }}
                        title={tooltip}
                        className={`px-2.5 py-1 rounded-full font-mono text-[11px] transition-colors flex items-center gap-1 cursor-pointer ${
                          isTierLocked
                            ? 'opacity-40 hover:opacity-80 text-[#6B6B75] dark:text-[#A0A0AA] hover:text-[#F86A00]'
                            : current.variantCount === n
                            ? 'bg-brand-gradient text-white font-bold'
                            : 'text-[#6B6B75] dark:text-[#A0A0AA] hover:text-[#1A1A1E] dark:hover:text-[#F5F5F7]'
                        } ${!isTierLocked && disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        <span>{n}×</span>
                        {isTierLocked && <Lock size={10} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : tierCap <= 1 ? (
                <button
                  type="button"
                  onClick={() => onRequestUpgrade?.()}
                  title="Upgrade to Starter to generate 2 takes at once"
                  className="px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/5 font-mono text-[11px] text-[#6B6B75] dark:text-[#A0A0AA] hover:text-[#F86A00] transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>1 take · Free</span>
                  <Lock size={10} className="shrink-0" />
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/5 font-mono text-[11px] text-[#6B6B75] dark:text-[#A0A0AA] shrink-0">
                  2 takes included
                </span>
              )}
            </div>
          </div>

          {/* 4. Live Cost Breakdown, Prompt-Enhancer Button & Enter-Icon Generate Button (Section 4a) */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0 justify-end">
            <div className="flex flex-col items-end leading-tight px-1 whitespace-nowrap">
              <span className={`text-xs font-mono font-bold ${isInsufficient ? 'text-rose-500' : 'text-[#1A1A1E] dark:text-[#F5F5F7]'}`}>
                {quote.totalCost.toLocaleString()} credits
              </span>
              {isInsufficient ? (
                <span className="text-[10px] font-mono text-rose-500 font-semibold">
                  Need {shortfall.toLocaleString()} more
                </span>
              ) : quote.variantCount > 1 ? (
                <span className="text-[10px] font-mono text-[#F86A00]">
                  {quote.variantCount} × {quote.unitCost.toLocaleString()}
                </span>
              ) : null}
            </div>

            {current.originalPrompt && current.originalPrompt !== current.prompt && (
              <button
                type="button"
                onClick={() => {
                  patchTab({ prompt: current.originalPrompt, originalPrompt: '' });
                  setEnhanceHistory([]);
                  setEnhanceError(null);
                }}
                className="text-[11px] text-[#6B6B75] dark:text-[#A0A0AA] hover:text-[#F86A00] transition-colors cursor-pointer px-2 py-1 whitespace-nowrap underline underline-offset-2"
                title="Revert to your original un-enhanced prompt"
              >
                Revert to my prompt
              </button>
            )}

            <button
              type="button"
              onClick={handleEnhance}
              disabled={isEnhancing || !current.prompt.trim()}
              title="Enhance prompt with Gemini AI"
              className="h-9 min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] text-xs font-semibold text-[#6B6B75] dark:text-[#A0A0AA] hover:text-[#F86A00] hover:border-[#FF8800]/40 transition-all cursor-pointer disabled:opacity-40"
            >
              <Wand2 size={13} className={isEnhancing ? 'animate-spin text-[#F86A00]' : ''} />
              <span className="hidden md:inline">Enhance</span>
            </button>

            <button
              type="button"
              id="unified-generate-btn"
              onClick={handleTriggerGenerate}
              disabled={!current.prompt.trim() || isGenerating || isInsufficient}
              aria-disabled={!current.prompt.trim() || isGenerating || isInsufficient}
              aria-busy={isGenerating}
              aria-label={
                activeTab === 'image'
                  ? 'Generate image'
                  : activeTab === 'video'
                  ? 'Generate video'
                  : 'Compose track'
              }
              title={
                isInsufficient
                  ? `Not enough credits. Need ${shortfall.toLocaleString()} more`
                  : activeTab === 'image'
                  ? 'Generate image'
                  : activeTab === 'video'
                  ? 'Generate video'
                  : 'Compose track'
              }
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0 flex items-center justify-center transition-all ${
                isInsufficient
                  ? 'bg-rose-600/80 text-white/90 border border-rose-500/40 shadow-sm shadow-rose-600/20 cursor-not-allowed opacity-75'
                  : !current.prompt.trim() || isGenerating
                  ? 'bg-brand-gradient text-white opacity-40 cursor-not-allowed'
                  : 'bg-brand-gradient text-white shadow-md shadow-[#F86A00]/25 hover:opacity-95 active:scale-95 cursor-pointer'
              }`}
            >
              {isGenerating ? (
                <svg
                  className="animate-spin w-[18px] h-[18px] text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    opacity="0.25"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray="56"
                    strokeDashoffset="42"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <CornerDownLeft size={18} className="text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* High-Value Confirmation Modal (>= 5000 credits, Section 3.3) */}
      {highValueConfirmOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#18181B] p-6 overflow-hidden border border-[#FF8800]/30 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-brand-gradient" />
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#FFB020]/15 text-[#FFB020] flex items-center justify-center mb-3">
                <AlertCircle size={26} />
              </div>
              <h4 className="jost text-lg font-bold text-[#1A1A1E] dark:text-[#F5F5F7] mb-1">
                Confirm Generation
              </h4>
              <p className="inter text-xs text-[#6B6B75] dark:text-[#A0A0AA] mb-4 leading-relaxed">
                This will use <strong className="text-[#F86A00] font-mono font-bold">{quote.totalCost.toLocaleString()} credits</strong> ({quote.variantCount} × {quote.unitCost.toLocaleString()}). Continue?
              </p>
              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setHighValueConfirmOpen(false)}
                  className="flex-1 py-2.5 rounded-xl glass-panel text-xs font-semibold text-[#6B6B75] dark:text-[#A0A0AA] hover:text-[#1A1A1E] dark:hover:text-[#F5F5F7] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setHighValueConfirmOpen(false);
                    await executeFinalGeneration();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-brand-gradient text-xs font-bold text-white shadow-md shadow-[#F86A00]/25 hover:opacity-95 cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Mobile/Tablet Per-Tab Settings Slide-in Sheet (Section 4 — Issue 2) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {settingsModalOpen && draft && (() => {
            const draftModel = tabModels.find((m) => m.id === draft.modelId) || activeModel;
            const draftSupportedRatios = draftModel?.supported_aspect_ratios || ['16:9', '9:16', '1:1'];
            const draftMaxVariants = draftModel?.max_concurrent_variants ?? 1;

            const handleSelectModel = (m: AiModelConfig) => {
              const modelMinTier = (m as any).min_plan_tier as PlanTier | undefined;
              const isLocked = modelMinTier && planTier ? (
                modelMinTier === 'studio' ? planTier !== 'studio' :
                modelMinTier === 'pro' ? !['pro', 'studio'].includes(planTier) :
                modelMinTier === 'creator' ? !['creator', 'pro', 'studio'].includes(planTier) :
                modelMinTier === 'starter' ? planTier === 'free' : false
              ) : false;

              if (isLocked) {
                closeSettings();
                onRequestUpgrade?.();
                return;
              }

              let nextRatio = draft.aspectRatio;
              if (
                m.supported_aspect_ratios &&
                m.supported_aspect_ratios.length > 0 &&
                !m.supported_aspect_ratios.includes(nextRatio)
              ) {
                nextRatio = m.supported_aspect_ratios[0] as any;
              }

              const newMaxVariants = m.max_concurrent_variants ?? 1;
              const newEffectiveMax = activeTab === 'music'
                ? Math.min(2, tierCap)
                : Math.min(newMaxVariants, tierCap);
              const nextVariants = Math.min(draft.variantCount, newEffectiveMax);

              setDraft((d) => d ? {
                ...d,
                modelId: m.id,
                aspectRatio: nextRatio,
                variantCount: Math.max(1, nextVariants),
              } : d);
            };

            const saveSettings = () => {
              if (draft) {
                patchTab({
                  modelId: draft.modelId,
                  aspectRatio: draft.aspectRatio,
                  variantCount: draft.variantCount,
                  videoDuration: draft.videoDuration,
                  videoResolution: draft.videoResolution,
                });
              }
              closeSettings();
            };

            return (
              <div className="fixed inset-0 z-[60] lg:hidden">
                {/* Dimmed Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={closeSettings}
                  className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />

                {/* Slide-In from RIGHT (matching specification) */}
                <motion.aside
                  ref={modalPanelRef}
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  className="absolute right-0 top-0 bottom-0 w-[min(92vw,380px)] h-[100dvh] overlay-panel border-l border-[#FF8800]/25 flex flex-col overflow-hidden shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="settings-sheet-title"
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && modalPanelRef.current) {
                      const focusableEls = modalPanelRef.current.querySelectorAll<HTMLElement>(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                      );
                      if (focusableEls.length > 0) {
                        const firstEl = focusableEls[0];
                        const lastEl = focusableEls[focusableEls.length - 1];
                        if (e.shiftKey && document.activeElement === firstEl) {
                          e.preventDefault();
                          lastEl.focus();
                        } else if (!e.shiftKey && document.activeElement === lastEl) {
                          e.preventDefault();
                          firstEl.focus();
                        }
                      }
                    }
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                      <Settings size={18} className="text-[#F86A00]" />
                      <h3 id="settings-sheet-title" className="jost text-base font-bold text-[#1A1A1E] dark:text-[#F5F5F7]">
                        {activeTab === 'image' ? 'Image Settings' : activeTab === 'video' ? 'Video Settings' : 'Music Settings'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      ref={closeButtonRef}
                      onClick={closeSettings}
                      aria-label="Close settings"
                      className="p-1.5 rounded-lg text-[#6B6B75] dark:text-[#A0A0AA] hover:text-[#1A1A1E] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Body — Exactly ONE scrollable container */}
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 flex flex-col gap-5 app-scroll">
                    {/* 1. Model Selector — Inline Radio Cards */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-[#1A1A1E] dark:text-[#F5F5F7]">
                        Model
                      </label>
                      <div className="flex flex-col gap-1.5">
                        {tabModels.map((m) => {
                          const isSelected = draft.modelId === m.id;
                          const modelMinTier = (m as any).min_plan_tier as PlanTier | undefined;
                          const isLocked = modelMinTier && planTier ? (
                            modelMinTier === 'studio' ? planTier !== 'studio' :
                            modelMinTier === 'pro' ? !['pro', 'studio'].includes(planTier) :
                            modelMinTier === 'creator' ? !['creator', 'pro', 'studio'].includes(planTier) :
                            modelMinTier === 'starter' ? planTier === 'free' : false
                          ) : false;
                          const badge = (m as any).badge || (m.quality_tier !== 'standard' ? m.quality_tier : null);

                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleSelectModel(m)}
                              className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'border-[#FF8800] bg-[#FF8800]/10 dark:bg-[#FF8800]/15'
                                  : 'border-black/10 dark:border-white/10 hover:border-[#FF8800]/40 bg-black/[0.02] dark:bg-white/[0.02]'
                              } ${isLocked ? 'opacity-60' : ''}`}
                            >
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-bold ${isSelected ? 'text-[#F86A00]' : 'text-[#1A1A1E] dark:text-[#F5F5F7]'}`}>
                                    {m.display_name}
                                  </span>
                                  {badge && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[#FF8800]/20 text-[#F86A00]">
                                      {badge}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-[#6B6B75] dark:text-[#A0A0AA] mt-0.5">
                                  {m.credit_cost} credits
                                  {modelMinTier && modelMinTier !== 'free' && ` · ${modelMinTier.toUpperCase()}`}
                                </span>
                              </div>

                              <div className="shrink-0 ml-2">
                                {isLocked ? (
                                  <div className="flex items-center gap-1 text-[11px] font-semibold text-[#F86A00]">
                                    <Lock size={12} />
                                    <span>Upgrade</span>
                                  </div>
                                ) : isSelected ? (
                                  <div className="w-5 h-5 rounded-full bg-brand-gradient text-white flex items-center justify-center">
                                    <Check size={12} strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full border border-black/20 dark:border-white/20" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Video Extra Specs (Video Tab only) */}
                    {activeTab === 'video' && (
                      <div className="flex flex-col gap-4 pt-3 border-t border-black/5 dark:border-white/5">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-[#1A1A1E] dark:text-[#F5F5F7]">
                            Duration
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setDraft((d) => d ? { ...d, videoDuration: 5 } : d)}
                              className={`py-2 px-3 rounded-xl font-mono text-xs cursor-pointer transition-colors text-center ${
                                draft.videoDuration === 5
                                  ? 'bg-brand-gradient text-white font-bold shadow-sm'
                                  : 'border border-black/10 dark:border-white/10 hover:border-[#FF8800]/40 text-[#6B6B75] dark:text-[#A0A0AA]'
                              }`}
                            >
                              5s (Standard)
                            </button>
                            <button
                              type="button"
                              onClick={() => setDraft((d) => d ? { ...d, videoDuration: 8 } : d)}
                              className={`py-2 px-3 rounded-xl font-mono text-xs cursor-pointer transition-colors text-center ${
                                draft.videoDuration === 8
                                  ? 'bg-brand-gradient text-white font-bold shadow-sm'
                                  : 'border border-black/10 dark:border-white/10 hover:border-[#FF8800]/40 text-[#6B6B75] dark:text-[#A0A0AA]'
                              }`}
                            >
                              8s (Extended)
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-[#1A1A1E] dark:text-[#F5F5F7]">
                            Quality
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setDraft((d) => d ? { ...d, videoResolution: '720p' } : d)}
                              className={`py-2 px-3 rounded-xl font-mono text-xs cursor-pointer transition-colors text-center ${
                                draft.videoResolution === '720p'
                                  ? 'bg-brand-gradient text-white font-bold shadow-sm'
                                  : 'border border-black/10 dark:border-white/10 hover:border-[#FF8800]/40 text-[#6B6B75] dark:text-[#A0A0AA]'
                              }`}
                            >
                              720p HD
                            </button>
                            <button
                              type="button"
                              onClick={() => setDraft((d) => d ? { ...d, videoResolution: '1080p' } : d)}
                              className={`py-2 px-3 rounded-xl font-mono text-xs cursor-pointer transition-colors text-center ${
                                draft.videoResolution === '1080p'
                                  ? 'bg-brand-gradient text-white font-bold shadow-sm'
                                  : 'border border-black/10 dark:border-white/10 hover:border-[#FF8800]/40 text-[#6B6B75] dark:text-[#A0A0AA]'
                              }`}
                            >
                              1080p FHD
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. Aspect Ratio (Image & Video Tabs) — 3 Inline Buttons */}
                    {activeTab !== 'music' && (
                      <div className="flex flex-col gap-1.5 pt-3 border-t border-black/5 dark:border-white/5">
                        <label className="text-xs font-semibold text-[#1A1A1E] dark:text-[#F5F5F7]">
                          Aspect Ratio
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['16:9', '9:16', '1:1'] as const).map((ratio) => {
                            const isSupported = draftSupportedRatios.includes(ratio);
                            const isSelected = draft.aspectRatio === ratio;

                            return (
                              <button
                                key={ratio}
                                type="button"
                                disabled={!isSupported}
                                onClick={() => setDraft((d) => d ? { ...d, aspectRatio: ratio } : d)}
                                title={!isSupported ? `Not supported by ${draftModel?.display_name || 'selected model'}` : undefined}
                                className={`py-2.5 px-3 rounded-xl font-mono text-xs cursor-pointer transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                                  isSelected
                                    ? 'bg-brand-gradient text-white font-bold shadow-sm'
                                    : isSupported
                                    ? 'border border-black/10 dark:border-white/10 hover:border-[#FF8800]/40 text-[#6B6B75] dark:text-[#A0A0AA]'
                                    : 'border border-black/5 dark:border-white/5 text-[#A0A0AA]/40 opacity-40 cursor-not-allowed'
                                }`}
                              >
                                <span>{ratio}</span>
                                <span className="text-[10px] opacity-75">
                                  {ratio === '16:9' ? 'Landscape' : ratio === '9:16' ? 'Portrait' : 'Square'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 4. Variant Count (Image & Video) or Takes Display (Music) */}
                    <div className="flex flex-col gap-1.5 pt-3 border-t border-black/5 dark:border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#1A1A1E] dark:text-[#F5F5F7]">
                          {activeTab !== 'music' ? `Parallel Variants (${draft.variantCount}×)` : 'Music Generation Takes'}
                        </label>
                      </div>
                      {activeTab !== 'music' ? (
                        <div className="grid grid-cols-4 gap-2 p-1 rounded-2xl bg-black/5 dark:bg-white/5">
                          {[1, 2, 3, 4].map((n) => {
                            const isTierLocked = n > tierCap;
                            const modelDisabled = n > draftMaxVariants;
                            const costForN = n * (draftModel?.credit_cost ?? 10);
                            const creditExceeded = typeof walletBalance === 'number' && costForN > walletBalance;
                            const disabled = modelDisabled || creditExceeded;

                            let tooltip = `Generate ${n} variant${n > 1 ? 's' : ''}`;
                            if (isTierLocked) {
                              const reqTier = n === 2 ? 'Starter' : n === 3 ? 'Creator' : 'Pro';
                              tooltip = `Upgrade to ${reqTier} to generate ${n} variants at once`;
                            } else if (modelDisabled) {
                              tooltip = `${draftModel?.display_name || 'This model'} supports up to ${draftMaxVariants} at once`;
                            } else if (creditExceeded) {
                              tooltip = maxAffordable > 0
                                ? `Exceeds balance. Affordable up to ${maxAffordable} variant${maxAffordable > 1 ? 's' : ''}`
                                : 'Exceeds balance';
                            }

                            return (
                              <button
                                key={n}
                                type="button"
                                disabled={!isTierLocked && disabled}
                                onClick={() => {
                                  if (isTierLocked) {
                                    closeSettings();
                                    onRequestUpgrade?.();
                                    return;
                                  }
                                  setDraft((d) => d ? { ...d, variantCount: n } : d);
                                }}
                                title={tooltip}
                                className={`py-2 rounded-xl font-mono text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                                  isTierLocked
                                    ? 'opacity-40 hover:opacity-80 text-[#6B6B75] dark:text-[#A0A0AA] hover:text-[#F86A00]'
                                    : draft.variantCount === n
                                    ? 'bg-brand-gradient text-white font-bold shadow-sm'
                                    : 'text-[#6B6B75] dark:text-[#A0A0AA] hover:text-[#1A1A1E] dark:hover:text-[#F5F5F7]'
                                } ${!isTierLocked && disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                              >
                                <span>{n}×</span>
                                {isTierLocked && <Lock size={10} className="shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      ) : tierCap <= 1 ? (
                        <button
                          type="button"
                          onClick={() => {
                            closeSettings();
                            onRequestUpgrade?.();
                          }}
                          title="Upgrade to Starter to generate 2 takes at once"
                          className="w-full py-2.5 px-3 rounded-xl bg-black/5 dark:bg-white/5 font-mono text-xs text-[#6B6B75] dark:text-[#A0A0AA] hover:text-[#F86A00] transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>1 take · Free Plan</span>
                          <div className="flex items-center gap-1 text-[11px] text-[#F86A00]">
                            <Lock size={12} className="shrink-0" />
                            <span>Upgrade to 2 takes</span>
                          </div>
                        </button>
                      ) : (
                        <div className="w-full py-2.5 px-3 rounded-xl bg-black/5 dark:bg-white/5 font-mono text-xs text-[#6B6B75] dark:text-[#A0A0AA]">
                          2 takes included ({planTier} Plan)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer — Shrink 0, calls saveSettings */}
                  <div className="p-4 border-t border-black/5 dark:border-white/5 shrink-0 bg-white/80 dark:bg-[#18181B]/80 backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={saveSettings}
                      className="w-full py-3 rounded-xl bg-brand-gradient text-white font-bold text-sm shadow-md hover:opacity-95 transition-opacity cursor-pointer text-center"
                    >
                      Update Settings
                    </button>
                  </div>
                </motion.aside>
              </div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}
    </GradientBorder>
  );
};
