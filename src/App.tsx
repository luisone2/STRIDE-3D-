import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FLAVORS,
  BITS,
  HERO_BITS,
  INSIDE_STEPS,
  INTRO_VIDEO_URL,
  getSpriteCrop,
  mod5,
} from './data/flavors';
import {
  clamp,
  lerp,
  easeInOutSine,
  solveCubicBezier,
  computeArcSlot,
  computeInsideScrollState,
  createStormPieceSpecs,
  computeStormPieceTransform,
  computeCameraParams,
  lerpBarState,
  BarScreenState,
} from './utils/math';
import { initBarScene, BarSceneController } from './three/barScene';
import { flyBarsToCart } from './utils/flyToCart';
import {
  BrandMark,
  ArrowRightIcon,
  PauseGlyph,
  PlayGlyph,
  BasketIcon,
  StepIcon,
} from './components/Icons';

const STORM_SPECS = createStormPieceSpecs();

const SLOT_POSITIONS: [string, string][] = [
  ['50.2%', '37%'],
  ['34.8%', '59.3%'],
  ['64.8%', '59.3%'],
];

export default function App() {
  const reducedMotionRef = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const autostartRef = useRef(
    typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('autostart') === '1'
  );

  const [introVisible, setIntroVisible] = useState(
    () => !reducedMotionRef.current && !autostartRef.current
  );
  const [stampMode, setStampMode] = useState(false);
  const [heroEntered, setHeroEntered] = useState(
    () => reducedMotionRef.current || autostartRef.current
  );

  const [activeFlavor, setActiveFlavor] = useState(1);
  const [autoplay, setAutoplay] = useState(() => !reducedMotionRef.current);

  const [activeSection, setActiveSection] = useState<
    'flavors' | 'inside' | 'shop' | 'range'
  >('flavors');
  const [navTheme, setNavTheme] = useState<'default' | 'light' | 'dark'>(
    'default'
  );
  const [navHlStyle, setNavHlStyle] = useState<{ left: number; width: number }>({
    left: 5,
    width: 78,
  });

  const [cartCount, setCartCount] = useState(0);
  const [basketBump, setBasketBump] = useState(false);

  const [insideStep, setInsideStep] = useState(0);
  const [displayStep, setDisplayStep] = useState(0);
  const [displayStepFlavor, setDisplayStepFlavor] = useState(1);

  const [shopRevealed, setShopRevealed] = useState(false);
  const [shopEntranceDone, setShopEntranceDone] = useState(false);
  const [pokingCard, setPokingCard] = useState<number | null>(null);

  const [rangeRevealed, setRangeRevealed] = useState(false);
  const [packSlots, setPackSlots] = useState<(number | null)[]>([
    null,
    null,
    null,
  ]);
  const [buyJustAdded, setBuyJustAdded] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const navPillRef = useRef<HTMLDivElement | null>(null);
  const navHlRef = useRef<HTMLDivElement | null>(null);
  const prevActiveSectionRef = useRef<'flavors' | 'inside' | 'shop' | 'range'>(
    'flavors'
  );
  const navLinkRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const basketRef = useRef<HTMLButtonElement | null>(null);

  const heroRef = useRef<HTMLElement | null>(null);
  const revealRef = useRef<HTMLDivElement | null>(null);
  const arcHitRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const countRef = useRef<HTMLDivElement | null>(null);

  const insideRef = useRef<HTMLElement | null>(null);
  const inDarkRef = useRef<HTMLDivElement | null>(null);
  const inBackFrameRef = useRef<HTMLDivElement | null>(null);
  const inNumRef = useRef<HTMLDivElement | null>(null);
  const inBarRef = useRef<HTMLDivElement | null>(null);
  const inFrontRef = useRef<HTMLDivElement | null>(null);
  const inFrontFrameRef = useRef<HTMLDivElement | null>(null);
  const inHeadRef = useRef<HTMLHeadingElement | null>(null);
  const inCapRef = useRef<HTMLParagraphElement | null>(null);
  const stormPieceRefs = useRef<(HTMLDivElement | null)[]>([]);

  const shopRef = useRef<HTMLElement | null>(null);
  const shopGridRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardPkRefs = useRef<(HTMLDivElement | null)[]>([]);

  const rangeRef = useRef<HTMLElement | null>(null);
  const slotBarRefs = useRef<(HTMLDivElement | null)[]>([]);

  const animRef = useRef({
    pos: reducedMotionRef.current || autostartRef.current ? 1 : -2.6,
    target: 1,
    slideTween: null as {
      from: number;
      to: number;
      startTime: number;
      duration: number;
      isEntrance?: boolean;
      visualsTriggered: boolean;
      dir: number;
    } | null,
    revealTween: null as {
      color: string;
      startTime: number;
      duration: number;
      cx: number;
      cy: number;
      R: number;
    } | null,
    dragging: false,
    pointerId: -1,
    downX: 0,
    downY: 0,
    pos0: 1,
    lastDragX: 0,
    lastDragTime: 0,
    velSlotsPerMs: 0,
    lastInteractTime: performance.now(),
    autoplayEnabled: !reducedMotionRef.current,
    heroEntered: reducedMotionRef.current || autostartRef.current,
    currentStep: 0,
    flipRy: 0,
    flipTween: null as {
      from: number;
      to: number;
      startTime: number;
      duration: number;
    } | null,
    cardTilts: [
      { x: 0, y: 0, curX: 0, curY: 0, pressed: false, pokeStart: -1 },
      { x: 0, y: 0, curX: 0, curY: 0, pressed: false, pokeStart: -1 },
      { x: 0, y: 0, curX: 0, curY: 0, pressed: false, pokeStart: -1 },
      { x: 0, y: 0, curX: 0, curY: 0, pressed: false, pokeStart: -1 },
      { x: 0, y: 0, curX: 0, curY: 0, pressed: false, pokeStart: -1 },
    ],
    livePokeStart: -1,
    hasCenteredMobileShop: false,
    smoothScrollTarget: 0,
    smoothScrollCurrent: 0,
    smoothScrollActive: false,
    navScrollTween: null as {
      from: number;
      to: number;
      startTime: number;
      duration: number;
      targetSection: 'flavors' | 'inside' | 'shop' | 'range' | null;
    } | null,
    lastFrameTime: performance.now(),
    userTouchedPack: false,
    packAutoFilled: false,
  });

  useEffect(() => {
    animRef.current.autoplayEnabled = autoplay;
  }, [autoplay]);

  useEffect(() => {
    if (!shopRevealed) return;
    const t = window.setTimeout(() => {
      setShopEntranceDone(true);
    }, 800);
    return () => window.clearTimeout(t);
  }, [shopRevealed]);

  const measureCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const updateTitleFontSize = useCallback((flavorIdx: number) => {
    const titleEl = titleRef.current;
    if (!titleEl) return;
    if (!measureCtxRef.current) {
      const c = document.createElement('canvas');
      measureCtxRef.current = c.getContext('2d');
    }
    const ctx = measureCtxRef.current;
    if (!ctx) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const name = FLAVORS[mod5(flavorIdx)].name.toUpperCase();

    if (vw <= 896 && vh <= 500 && vw > vh) {
      titleEl.style.fontSize = '36px';
      return;
    }

    ctx.font = '400 100px "Archivo Black", sans-serif';
    if (vw < 820) {
      const words = name.split(' ');
      let maxW = 1;
      for (const w of words) {
        maxW = Math.max(maxW, ctx.measureText(w).width);
      }
      const base = clamp(vw * 0.125, 40, 64);
      const fit = ((vw - 36) * 100) / maxW;
      titleEl.style.fontSize = `${Math.min(base, fit)}px`;
    } else {
      const u = Math.min(vw / 1440, vh / 900);
      const w = Math.max(1, ctx.measureText(name).width);
      const size = Math.min(96 * u, (760 * u * 100) / w);
      titleEl.style.fontSize = `${size}px`;
    }
  }, []);

  const populateTitleLayer = useCallback(
    (layer: HTMLElement, flavorName: string) => {
      layer.innerHTML = '';
      const words = flavorName.toUpperCase().split(' ');
      words.forEach((word) => {
        const wSpan = document.createElement('span');
        wSpan.className = 'word';
        for (const ch of word) {
          const cSpan = document.createElement('span');
          cSpan.className = 'char';
          cSpan.textContent = ch;
          wSpan.appendChild(cSpan);
        }
        layer.appendChild(wSpan);
      });
    },
    []
  );

  useEffect(() => {
    const titleEl = titleRef.current;
    if (!titleEl) return;
    titleEl.innerHTML = '';
    const layer = document.createElement('span');
    layer.className = 'title-layer';
    populateTitleLayer(layer, FLAVORS[1].name);
    titleEl.appendChild(layer);
    updateTitleFontSize(1);
    document.fonts.ready.then(() => updateTitleFontSize(activeFlavor));
  }, [populateTitleLayer, updateTitleFontSize]);

  const triggerFlavorChangeVisuals = useCallback(
    (newFlavorIdx: number, dir: number) => {
      const fIdx = mod5(newFlavorIdx);
      const newFlavor = FLAVORS[fIdx];
      const reduced = reducedMotionRef.current;

      setActiveFlavor(fIdx);
      updateTitleFontSize(fIdx);

      if (animRef.current.currentStep === 3) {
        const headEl = inHeadRef.current;
        if (headEl && !reduced) {
          headEl.animate(
            [
              { translate: '0px 0px', opacity: 1 },
              { translate: '0px -10px', opacity: 0 },
            ],
            { duration: 240, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }
          );
          window.setTimeout(() => {
            setDisplayStepFlavor(fIdx);
            headEl.animate(
              [
                { translate: '0px 14px', opacity: 0 },
                { translate: '0px 0px', opacity: 1 },
              ],
              { duration: 460, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }
            );
          }, 280);
        } else {
          setDisplayStepFlavor(fIdx);
        }
      } else {
        setDisplayStepFlavor(fIdx);
      }

      if (reduced) {
        document.documentElement.style.setProperty('--flav', newFlavor.color);
        document.documentElement.style.setProperty('--rv', 'transparent');
        if (revealRef.current) {
          revealRef.current.style.maskImage = '';
          revealRef.current.style.webkitMaskImage = '';
        }
        if (titleRef.current) {
          titleRef.current.innerHTML = '';
          const layer = document.createElement('span');
          layer.className = 'title-layer';
          populateTitleLayer(layer, newFlavor.name);
          titleRef.current.appendChild(layer);
        }
        if (countRef.current) {
          countRef.current.textContent = String(fIdx + 1).padStart(2, '0');
        }
        return;
      }

      if (animRef.current.revealTween) {
        document.documentElement.style.setProperty(
          '--flav',
          animRef.current.revealTween.color
        );
      }
      const vw = window.innerWidth;
      const heroH = heroRef.current?.clientHeight || window.innerHeight;
      const u = Math.min(vw / 1440, heroH / 900);
      const cx = vw / 2;
      const cy = vw < 820 ? heroH * 0.4 : heroH / 2 - 78 * u;
      const d1 = Math.hypot(cx, cy);
      const d2 = Math.hypot(vw - cx, cy);
      const d3 = Math.hypot(cx, heroH - cy);
      const d4 = Math.hypot(vw - cx, heroH - cy);
      const R = 1.45 * Math.max(d1, d2, d3, d4);

      document.documentElement.style.setProperty('--rv', newFlavor.color);
      animRef.current.revealTween = {
        color: newFlavor.color,
        startTime: performance.now(),
        duration: 420,
        cx,
        cy,
        R,
      };

      const titleEl = titleRef.current;
      if (titleEl) {
        const oldLayers = Array.from(
          titleEl.querySelectorAll('.title-layer:not(.outgoing)')
        ) as HTMLElement[];
        const outY = dir >= 0 ? '-110%' : '110%';
        oldLayers.forEach((oldLayer) => {
          oldLayer.classList.add('outgoing');
          const chars = Array.from(oldLayer.querySelectorAll('.char')) as HTMLElement[];
          chars.forEach((ch, idx) => {
            ch.animate(
              [
                { transform: 'translateY(0%)', opacity: 1 },
                { transform: `translateY(${outY})`, opacity: 0 },
              ],
              {
                duration: 300,
                delay: idx * 11,
                easing: 'cubic-bezier(.45,0,.75,.3)',
                fill: 'forwards',
              }
            );
          });
          window.setTimeout(() => {
            oldLayer.remove();
          }, 300 + chars.length * 11 + 60);
        });

        const newLayer = document.createElement('span');
        newLayer.className = 'title-layer';
        populateTitleLayer(newLayer, newFlavor.name);
        titleEl.appendChild(newLayer);

        const inY = dir >= 0 ? '110%' : '-110%';
        const newChars = Array.from(newLayer.querySelectorAll('.char')) as HTMLElement[];
        newChars.forEach((ch, idx) => {
          ch.style.opacity = '0';
          ch.style.transform = `translateY(${inY})`;
          ch.animate(
            [
              { transform: `translateY(${inY})`, opacity: 0 },
              { transform: 'translateY(0%)', opacity: 1 },
            ],
            {
              duration: 620,
              delay: 120 + idx * 22,
              easing: 'cubic-bezier(.22,1,.36,1)',
              fill: 'forwards',
            }
          );
        });
      }

      const countEl = countRef.current;
      if (countEl) {
        countEl.animate(
          [
            { translate: '0px 0px', opacity: 1 },
            { translate: '0px -10px', opacity: 0 },
          ],
          {
            duration: 220,
            easing: 'cubic-bezier(.5,0,.75,0)',
            fill: 'forwards',
          }
        );
        window.setTimeout(() => {
          if (countRef.current) {
            countRef.current.textContent = String(fIdx + 1).padStart(2, '0');
            countRef.current.animate(
              [
                { translate: '0px 14px', opacity: 0 },
                { translate: '0px 0px', opacity: 1 },
              ],
              {
                duration: 380,
                easing: 'cubic-bezier(.22,1,.36,1)',
                fill: 'forwards',
              }
            );
          }
        }, 280);
      }
    },
    [populateTitleLayer, updateTitleFontSize]
  );

  const goTo = useCallback(
    (newTarget: number, customDuration?: number) => {
      const st = animRef.current;
      const rounded = Math.round(newTarget);
      const prevFlavor = mod5(Math.round(st.target));
      const nextFlavor = mod5(rounded);
      const dir = rounded >= st.pos ? 1 : -1;
      const dist = Math.abs(rounded - st.pos);

      st.target = rounded;
      st.lastInteractTime = performance.now();

      if (reducedMotionRef.current || dist < 0.001) {
        st.pos = rounded;
        st.slideTween = null;
        if (nextFlavor !== prevFlavor) {
          triggerFlavorChangeVisuals(nextFlavor, dir);
        }
        return;
      }

      const extraSlots = Math.max(0, dist - 1);
      const duration =
        customDuration !== undefined
          ? customDuration
          : 650 + extraSlots * 160;

      st.slideTween = {
        from: st.pos,
        to: rounded,
        startTime: performance.now(),
        duration,
        visualsTriggered: nextFlavor === prevFlavor,
        dir,
      };
    },
    [triggerFlavorChangeVisuals]
  );

  const enterHero = useCallback(() => {
    if (animRef.current.heroEntered) return;
    animRef.current.heroEntered = true;
    animRef.current.lastInteractTime = performance.now();
    document.body.classList.remove('locked');
    setIntroVisible(false);
    setHeroEntered(true);

    if (reducedMotionRef.current) {
      animRef.current.pos = 1;
      animRef.current.target = 1;
      return;
    }

    animRef.current.pos = -2.6;
    animRef.current.target = 1;
    animRef.current.slideTween = {
      from: -2.6,
      to: 1,
      startTime: performance.now(),
      duration: 1700,
      isEntrance: true,
      visualsTriggered: true,
      dir: 1,
    };
  }, []);

  useEffect(() => {
    if (!introVisible) {
      document.body.classList.remove('locked');
      return;
    }

    document.body.classList.add('locked');
    const video = videoRef.current;
    let stampTriggered = false;
    let startedPlayback = false;

    const showStampThenEnter = () => {
      if (stampTriggered || animRef.current.heroEntered) return;
      stampTriggered = true;
      if (video) {
        try {
          video.pause();
        } catch {
          // ignore
        }
      }
      setStampMode(true);
      window.setTimeout(() => {
        enterHero();
      }, 380 + 650);
    };

    const startVideo = () => {
      if (!video || startedPlayback || stampTriggered) return;
      startedPlayback = true;
      try {
        video.currentTime = 0.55;
        const p = video.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => showStampThenEnter());
        }
      } catch {
        showStampThenEnter();
      }
    };

    const onTimeUpdate = () => {
      if (video && video.currentTime >= 4.6) {
        showStampThenEnter();
      }
    };

    if (video) {
      if (video.readyState >= 3) {
        startVideo();
      } else {
        video.addEventListener('canplay', startVideo, { once: true });
      }
      video.addEventListener('timeupdate', onTimeUpdate);
      video.addEventListener('ended', showStampThenEnter);
      video.addEventListener('error', showStampThenEnter);
    }

    const noStartTimer = window.setTimeout(() => {
      if (!startedPlayback || (video && video.paused)) {
        showStampThenEnter();
      }
    }, 3500);

    const failsafeTimer = window.setTimeout(() => {
      enterHero();
    }, 9000);

    return () => {
      window.clearTimeout(noStartTimer);
      window.clearTimeout(failsafeTimer);
      if (video) {
        video.removeEventListener('canplay', startVideo);
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('ended', showStampThenEnter);
        video.removeEventListener('error', showStampThenEnter);
      }
    };
  }, [introVisible, enterHero]);

  const updateNavHighlight = useCallback(() => {
    const btn = navLinkRefs.current[activeSection];
    const pill = navPillRef.current;
    if (!btn || !pill) return;
    setNavHlStyle({
      left: btn.offsetLeft,
      width: btn.offsetWidth,
    });
  }, [activeSection]);

  useEffect(() => {
    updateNavHighlight();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        updateNavHighlight();
      });
    }
    window.addEventListener('resize', updateNavHighlight);
    return () => window.removeEventListener('resize', updateNavHighlight);
  }, [updateNavHighlight]);

  useEffect(() => {
    if (prevActiveSectionRef.current !== activeSection) {
      prevActiveSectionRef.current = activeSection;
      if (!reducedMotionRef.current && navHlRef.current) {
        navHlRef.current.animate(
          [
            { scale: '1 1' },
            { scale: '1.08 0.91', offset: 0.35 },
            { scale: '0.98 1.02', offset: 0.75 },
            { scale: '1 1' },
          ],
          {
            duration: 440,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }
        );
      }
    }
  }, [activeSection]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      animRef.current.smoothScrollActive = false;
      animRef.current.navScrollTween = null;
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const heroEl = heroRef.current;
      if (!heroEl) return;
      const rect = heroEl.getBoundingClientRect();
      const visibleH =
        Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top);
      if (visibleH < rect.height * 0.5) return;
      animRef.current.lastInteractTime = performance.now();
      if (e.key === 'ArrowRight') {
        goTo(animRef.current.target + 1);
      } else {
        goTo(animRef.current.target - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goTo]);

  useEffect(() => {
    const isTouch =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const onWheel = (e: WheelEvent) => {
      animRef.current.navScrollTween = null;
      if (
        reducedMotionRef.current ||
        isTouch ||
        e.ctrlKey ||
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ||
        document.body.classList.contains('locked')
      ) {
        return;
      }
      e.preventDefault();
      const st = animRef.current;
      if (!st.smoothScrollActive) {
        st.smoothScrollCurrent = window.scrollY;
        st.smoothScrollTarget = window.scrollY;
        st.smoothScrollActive = true;
      }
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      st.smoothScrollTarget = clamp(
        st.smoothScrollTarget + e.deltaY,
        0,
        maxScroll
      );
    };

    const cancelSmooth = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('#nav')) return;
      animRef.current.smoothScrollActive = false;
      animRef.current.navScrollTween = null;
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointerdown', cancelSmooth, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointerdown', cancelSmooth);
    };
  }, []);

  const sceneCtrlRef = useRef<BarSceneController | null>(null);

  useEffect(() => {
    const glCanvas = document.getElementById('gl') as HTMLCanvasElement | null;
    if (!glCanvas) return;

    let disposed = false;
    let rafId = 0;

    initBarScene(glCanvas, () => {
      updateTitleFontSize(Math.round(animRef.current.target));
    }).then((ctrl) => {
      if (disposed) {
        ctrl.dispose();
        return;
      }
      sceneCtrlRef.current = ctrl;

      const onResize = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const k =
          vw < 820
            ? Math.min(vw / 390, vh / 780)
            : Math.min(vw / 1440, vh / 900);
        document.documentElement.style.setProperty('--k', k.toFixed(5));
        glCanvas.style.height = `${vh}px`;
        ctrl.resize(vw, vh);
        updateTitleFontSize(Math.round(animRef.current.target));
      };
      onResize();
      window.addEventListener('resize', onResize);

      const tick = () => {
        if (disposed) return;
        const now = performance.now();
        const dt = Math.min(64, Math.max(1, now - animRef.current.lastFrameTime));
        animRef.current.lastFrameTime = now;

        const st = animRef.current;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const reduced = reducedMotionRef.current;

        if (st.navScrollTween) {
          const ntw = st.navScrollTween;
          const rawT = clamp((now - ntw.startTime) / ntw.duration, 0, 1);
          const eased = solveCubicBezier(0.22, 1, 0.36, 1, rawT);
          const nextY = lerp(ntw.from, ntw.to, eased);
          window.scrollTo(0, nextY);
          st.smoothScrollCurrent = nextY;
          st.smoothScrollTarget = nextY;
          if (rawT >= 1) {
            window.scrollTo(0, ntw.to);
            st.navScrollTween = null;
          }
        } else if (st.smoothScrollActive && !reduced) {
          const diff = st.smoothScrollTarget - st.smoothScrollCurrent;
          if (Math.abs(diff) < 0.5) {
            st.smoothScrollCurrent = st.smoothScrollTarget;
            window.scrollTo(0, st.smoothScrollCurrent);
            st.smoothScrollActive = false;
          } else {
            st.smoothScrollCurrent += diff * (1 - Math.exp(-dt / 120));
            window.scrollTo(0, st.smoothScrollCurrent);
          }
        }

        if (st.slideTween) {
          const tw = st.slideTween;
          const rawT = clamp((now - tw.startTime) / tw.duration, 0, 1);
          const eased = tw.isEntrance
            ? solveCubicBezier(0.16, 1, 0.3, 1, rawT)
            : solveCubicBezier(0.25, 0.75, 0.2, 1, rawT);
          st.pos = lerp(tw.from, tw.to, eased);

          if (!tw.visualsTriggered && rawT >= 0.12) {
            tw.visualsTriggered = true;
            triggerFlavorChangeVisuals(mod5(Math.round(tw.to)), tw.dir);
          }

          if (rawT >= 1) {
            st.pos = tw.to;
            st.slideTween = null;
          }
        }

        if (st.revealTween && revealRef.current) {
          const rv = st.revealTween;
          const rawT = clamp((now - rv.startTime) / rv.duration, 0, 1);
          const eased = solveCubicBezier(0.25, 0.75, 0.2, 1, rawT);
          const r = rv.R * eased;
          const f = Math.max(60, 0.35 * r);
          const mask = `radial-gradient(circle at ${rv.cx}px ${rv.cy}px, #000 ${Math.max(0, r - f)}px, transparent ${r}px)`;
          revealRef.current.style.webkitMaskImage = mask;
          revealRef.current.style.maskImage = mask;

          if (rawT >= 1) {
            document.documentElement.style.setProperty('--flav', rv.color);
            document.documentElement.style.setProperty('--rv', 'transparent');
            revealRef.current.style.webkitMaskImage = '';
            revealRef.current.style.maskImage = '';
            st.revealTween = null;
          }
        }

        const heroEl = heroRef.current;
        const heroRect = heroEl
          ? heroEl.getBoundingClientRect()
          : new DOMRect(0, 0, vw, vh);
        const heroVisH =
          Math.min(vh, heroRect.bottom) - Math.max(0, heroRect.top);
        const heroRatio = heroVisH / Math.max(1, heroRect.height);

        if (
          st.heroEntered &&
          st.autoplayEnabled &&
          !st.dragging &&
          !st.slideTween &&
          document.visibilityState === 'visible' &&
          heroRatio >= 0.6
        ) {
          if (now - st.lastInteractTime >= 3200) {
            st.lastInteractTime = now;
            goTo(st.target + 1);
          }
        }

        const insideEl = insideRef.current;
        const shopEl = shopRef.current;
        const rangeEl = rangeRef.current;

        const insideRect = insideEl
          ? insideEl.getBoundingClientRect()
          : new DOMRect(0, vh, vw, vh * 5);
        const shopRect = shopEl
          ? shopEl.getBoundingClientRect()
          : new DOMRect(0, vh * 6, vw, vh);
        const rangeRect = rangeEl
          ? rangeEl.getBoundingClientRect()
          : new DOMRect(0, vh * 7, vw, vh);

        if (st.navScrollTween && st.navScrollTween.targetSection) {
          const lockedSec = st.navScrollTween.targetSection;
          setActiveSection((prev) => (prev === lockedSec ? prev : lockedSec));
        } else {
          const thresholdY = vh * 0.35;
          let nextSec: 'flavors' | 'inside' | 'shop' | 'range' = 'flavors';
          if (insideRect.top <= thresholdY) nextSec = 'inside';
          if (shopRect.top <= thresholdY) nextSec = 'shop';
          if (rangeRect.top <= thresholdY) nextSec = 'range';
          setActiveSection((prev) => (prev === nextSec ? prev : nextSec));
        }

        let nextTheme: 'default' | 'light' | 'dark' = 'default';
        if (shopRect.top <= 80) {
          nextTheme = 'light';
        }
        setNavTheme((prev) => (prev === nextTheme ? prev : nextTheme));

        if (shopRect.top <= vh * 0.82) {
          setShopRevealed((prev) => (prev ? prev : true));
        }

        if (rangeRect.top <= vh * 0.7) {
          setRangeRevealed((prev) => (prev ? prev : true));
          if (!st.packAutoFilled && !st.userTouchedPack) {
            st.packAutoFilled = true;
            const f0 = mod5(Math.round(st.target));
            const f1 = mod5(f0 + 1);
            const f2 = mod5(f0 + 2);
            window.setTimeout(() => {
              if (!animRef.current.userTouchedPack) {
                setPackSlots((p) => [f0, p[1], p[2]]);
              }
            }, 250);
            window.setTimeout(() => {
              if (!animRef.current.userTouchedPack) {
                setPackSlots((p) => [p[0], f1, p[2]]);
              }
            }, 410);
            window.setTimeout(() => {
              if (!animRef.current.userTouchedPack) {
                setPackSlots((p) => [p[0], p[1], f2]);
              }
            }, 570);
          }
        }

        const insideState = computeInsideScrollState(
          insideRect.top,
          insideRect.bottom,
          insideRect.height,
          vh
        );

        if (inFrontRef.current) {
          if (insideState.inView) {
            inFrontRef.current.style.visibility = 'visible';
            inFrontRef.current.style.transform = `translateY(${insideState.pinY}px)`;
          } else {
            inFrontRef.current.style.visibility = 'hidden';
          }
        }

        if (insideState.step !== st.currentStep) {
          st.currentStep = insideState.step;
          setInsideStep(insideState.step);

          const targetAngle = INSIDE_STEPS[insideState.step].ry;
          if (reduced) {
            st.flipRy = targetAngle;
            st.flipTween = null;
            setDisplayStep(insideState.step);
          } else {
            const halfTurns = clamp(
              Math.abs(targetAngle - st.flipRy) / 180,
              0.4,
              2
            );
            const dur = halfTurns * 720;
            st.flipTween = {
              from: st.flipRy,
              to: targetAngle,
              startTime: now,
              duration: dur,
            };

            const textDelay = 0.38 * Math.min(dur, 720);
            const nextStepVal = insideState.step;
            window.setTimeout(() => {
              const els = [
                inHeadRef.current,
                inNumRef.current,
                inCapRef.current,
              ];
              els.forEach((el) => {
                el?.animate(
                  [
                    { translate: '0px 0px', opacity: 1 },
                    { translate: '0px -10px', opacity: 0 },
                  ],
                  {
                    duration: 240,
                    easing: 'cubic-bezier(.5,0,.75,0)',
                    fill: 'forwards',
                  }
                );
              });
              window.setTimeout(() => {
                setDisplayStep(nextStepVal);
                setDisplayStepFlavor(mod5(Math.round(animRef.current.target)));
                els.forEach((el) => {
                  el?.animate(
                    [
                      { translate: '0px 14px', opacity: 0 },
                      { translate: '0px 0px', opacity: 1 },
                    ],
                    {
                      duration: 460,
                      easing: 'cubic-bezier(.22,1,.36,1)',
                      fill: 'forwards',
                    }
                  );
                });
              }, 280);
            }, textDelay);
          }
        }

        if (st.flipTween) {
          const ft = st.flipTween;
          const rawT = clamp((now - ft.startTime) / ft.duration, 0, 1);
          st.flipRy = lerp(ft.from, ft.to, easeInOutSine(rawT));
          if (rawT >= 1) {
            st.flipRy = ft.to;
            st.flipTween = null;
          }
        }

        const q = insideState.q;
        const frameFade = 1 - clamp(4 * q, 0, 1);
        if (inFrontFrameRef.current) {
          inFrontFrameRef.current.style.opacity = String(frameFade);
        }
        if (inNumRef.current) {
          inNumRef.current.style.opacity = String(frameFade);
        }
        if (inDarkRef.current) {
          inDarkRef.current.style.opacity = String(clamp(3.5 * q, 0, 1) * 0.42);
        }

        STORM_SPECS.forEach((spec, idx) => {
          const el = stormPieceRefs.current[idx];
          if (!el) return;
          if (reduced || q <= 0 || q >= 1) {
            el.style.display = 'none';
            return;
          }
          const tr = computeStormPieceTransform(spec, q, vw, vh);
          if (!tr.visible) {
            el.style.display = 'none';
            return;
          }
          el.style.display = 'block';
          el.style.width = `${tr.size}px`;
          el.style.height = `${tr.size}px`;
          el.style.opacity = String(tr.op);
          el.style.transform = `translate(${tr.x - tr.size / 2}px, ${tr.y - tr.size / 2}px) rotate(${tr.rot}deg)`;
        });

        const isPhone = vw < 820;
        const heroH = heroRect.height || vh;
        const heroU = isPhone
          ? Math.min(vw / 560, heroH / 980)
          : Math.min(vw / 1440, heroH / 900);
        const xSpread = isPhone ? 1.02 : 1;
        const arcCx = vw / 2;
        const arcCy =
          heroRect.top + (isPhone ? heroH * 0.4 : heroH / 2 - 78 * heroU);

        const p1 = clamp(1 - insideRect.top / vh, 0, 1);
        const p3 = clamp((vh - shopRect.top) / (0.52 * vh), 0, 1);
        const otherHeroFade = 1 - clamp(1.6 * p1, 0, 1);

        if (isPhone && p3 > 0 && !st.hasCenteredMobileShop) {
          st.hasCenteredMobileShop = true;
          const fSel = mod5(Math.round(st.target));
          const cardEl = cardRefs.current[fSel];
          const stripEl = shopGridRef.current;
          if (cardEl && stripEl) {
            const targetLeft =
              cardEl.offsetLeft - (stripEl.clientWidth - cardEl.clientWidth) / 2;
            stripEl.scrollTo({ left: targetLeft, behavior: 'smooth' });
          }
        } else if (p3 <= 0) {
          st.hasCenteredMobileShop = false;
        }

        const kTilt = 1 - Math.exp(-dt / 55);
        for (let idx = 0; idx < 5; idx++) {
          const t = st.cardTilts[idx];
          t.curX += (t.x - t.curX) * kTilt;
          t.curY += (t.y - t.curY) * kTilt;
          if (Math.abs(t.x - t.curX) < 0.0005) t.curX = t.x;
          if (Math.abs(t.y - t.curY) < 0.0005) t.curY = t.y;
          const cardEl = cardRefs.current[idx];
          if (cardEl) {
            const isActiveTilt =
              Math.abs(t.curX) > 0.001 ||
              Math.abs(t.curY) > 0.001 ||
              t.pressed;
            if (!isActiveTilt) {
              if (cardEl.style.transform) cardEl.style.transform = '';
              if (cardEl.style.boxShadow) cardEl.style.boxShadow = '';
            } else {
              const hoverMag = Math.min(1, Math.hypot(t.curX, t.curY) * 3.2);
              const liftY = -8 * (t.pressed ? 0.5 : Math.max(0.35, hoverMag));
              const scaleStr = t.pressed ? ' scale(0.97)' : '';
              cardEl.style.transform = `perspective(900px) translateY(${liftY.toFixed(2)}px) rotateX(${(-t.curY * 12).toFixed(2)}deg) rotateY(${(t.curX * 12).toFixed(2)}deg)${scaleStr}`;
              cardEl.style.boxShadow = '0 24px 40px -18px rgba(40,30,20,.35)';
            }
          }
        }

        const jT = Math.round(st.target);
        const baseJ = Math.floor(st.pos);
        const fT = mod5(jT);
        const camD = computeCameraParams(vw, vh).D;

        const getHeroBarState = (j: number): BarScreenState => {
          const k = j - st.pos;
          const slot = computeArcSlot(k, heroU, xSpread);
          const b = reduced
            ? 0
            : Math.sin((now / 4600) * Math.PI * 2 + 1.37 * j);
          const floatY = reduced ? 0 : (0.5 * b + 0.5) * 9 * heroU;
          const floatRz = reduced ? 0 : 0.4 * b;
          return {
            x: arcCx + slot.dx,
            y: arcCy + slot.dy - floatY,
            h: slot.h,
            rz: slot.rz + floatRz,
            ry: slot.ry,
            rx: 0,
            z: slot.z,
            op: slot.op,
            sx: 1,
            sy: 1,
            shadow: 1,
          };
        };

        const getShopCardBarState = (
          fIdx: number,
          baseTurnDeg: number,
          isTraveller: boolean
        ): BarScreenState => {
          const cardEl = cardRefs.current[fIdx];
          const pkEl = cardPkRefs.current[fIdx];
          const cardRect = cardEl
            ? cardEl.getBoundingClientRect()
            : new DOMRect(vw / 2 - 120, vh / 2 - 195, 240, 390);
          const pkRect = pkEl
            ? pkEl.getBoundingClientRect()
            : new DOMRect(vw / 2 - 60, vh / 2 - 127, 121, 255);

          const cx = cardRect.left + cardRect.width / 2;
          const cy = pkRect.top + pkRect.height / 2;
          const h = pkEl && pkEl.offsetHeight > 10 ? pkEl.offsetHeight : pkRect.height;

          const wx = cx - vw / 2;
          const wy = vh / 2 - cy;
          const camYawDeg = (-Math.atan2(wx, camD) * 180) / Math.PI;
          const camPitchDeg = (Math.atan2(wy, camD) * 180) / Math.PI;

          const t = st.cardTilts[fIdx];
          let pokeSx = 1;
          let pokeSy = 1;
          if (t && t.pokeStart > 0) {
            const pt = (now - t.pokeStart) / 500;
            if (pt >= 1) {
              t.pokeStart = -1;
            } else if (pt < 0.3) {
              const u0 = pt / 0.3;
              pokeSx = lerp(1, 1.07, u0);
              pokeSy = lerp(1, 0.92, u0);
            } else if (pt < 0.6) {
              const u1 = (pt - 0.3) / 0.3;
              pokeSx = lerp(1.07, 0.96, u1);
              pokeSy = lerp(0.92, 1.05, u1);
            } else {
              const u2 = (pt - 0.6) / 0.4;
              pokeSx = lerp(0.96, 1, u2);
              pokeSy = lerp(1.05, 1, u2);
            }
          }

          const op = isTraveller ? 1 : clamp(p3 * 1.4, 0, 1);

          return {
            x: cx,
            y: cy,
            h,
            rz: 0,
            ry: baseTurnDeg + camYawDeg + (t ? t.curX * 15 : 0),
            rx: camPitchDeg - (t ? t.curY * 15 : 0),
            z: 0,
            op,
            sx: pokeSx,
            sy: pokeSy,
            shadow: 0.72,
          };
        };

        const shopInView =
          otherHeroFade <= 0.001 &&
          shopRect.top < vh * 1.05 &&
          shopRect.bottom > -40;

        if (shopInView) {
          let poolIdx = 0;
          for (let f = 0; f < 5; f++) {
            if (f === fT) continue;
            const barInst = ctrl.pool[poolIdx++];
            barInst.slotJ = -100 - f;
            const stShop = getShopCardBarState(f, 0, false);
            ctrl.updateBar(barInst, f, stShop, vw, vh);
          }
          for (let i = poolIdx; i < 11; i++) {
            const barInst = ctrl.pool[i];
            barInst.slotJ = -999;
            ctrl.updateBar(
              barInst,
              0,
              {
                x: 0,
                y: 0,
                h: 0,
                rz: 0,
                ry: 0,
                rx: 0,
                z: 0,
                op: 0,
                sx: 1,
                sy: 1,
                shadow: 0,
              },
              vw,
              vh
            );
          }
        } else {
          for (let i = 0; i < 11; i++) {
            const j = baseJ - 5 + i;
            const barInst = ctrl.pool[i];
            barInst.slotJ = j;
            if (j === jT) {
              ctrl.updateBar(
                barInst,
                mod5(j),
                {
                  x: 0,
                  y: 0,
                  h: 0,
                  rz: 0,
                  ry: 0,
                  rx: 0,
                  z: 0,
                  op: 0,
                  sx: 1,
                  sy: 1,
                  shadow: 0,
                },
                vw,
                vh
              );
              continue;
            }
            const stHero = getHeroBarState(j);
            stHero.op *= otherHeroFade;
            ctrl.updateBar(barInst, mod5(j), stHero, vw, vh);
          }
        }

        ctrl.traveller.slotJ = jT;
        const stateA = getHeroBarState(jT);

        const inBarRect = inBarRef.current
          ? inBarRef.current.getBoundingClientRect()
          : new DOMRect(vw / 2 - 165, vh / 2 - 347, 330, 694);
        const bobY = reduced ? 0 : Math.sin((now / 2600) * Math.PI * 2) * 6;
        const stormSpin = reduced ? 0 : 720 * q;
        const bRy = st.flipRy + stormSpin;

        const stateB: BarScreenState = {
          x: inBarRect.left + inBarRect.width / 2,
          y: inBarRect.top + inBarRect.height / 2 + bobY,
          h: inBarRect.height,
          rz: 14 * (1 - clamp(p3 * 1.6, 0, 1)),
          ry: bRy,
          rx: 0,
          z: 0,
          op: 1,
          sx: 1,
          sy: 1,
          shadow: 1,
        };

        const nearestTurn = Math.round(bRy / 360) * 360;
        const stateC = getShopCardBarState(fT, nearestTurn, true);

        let travState = stateA;
        if (p1 > 0) {
          travState = lerpBarState(stateA, stateB, easeInOutSine(p1));
        }
        if (p3 > 0) {
          travState = lerpBarState(travState, stateC, easeInOutSine(p3));
        }

        ctrl.updateBar(ctrl.traveller, fT, travState, vw, vh);
        ctrl.render();

        if (ctrl.isSoftwareGl) {
          ctrl.afterDraw(tick);
        } else {
          rafId = requestAnimationFrame(tick);
        }
      };

      rafId = requestAnimationFrame(tick);

      return () => {
        window.removeEventListener('resize', onResize);
      };
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      sceneCtrlRef.current?.dispose();
    };
  }, [goTo, triggerFlavorChangeVisuals, updateTitleFontSize]);

  const onArcPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const st = animRef.current;
    st.pointerId = e.pointerId;
    st.downX = e.clientX;
    st.downY = e.clientY;
    st.pos0 = st.pos;
    st.lastDragX = e.clientX;
    st.lastDragTime = performance.now();
    st.velSlotsPerMs = 0;
    st.dragging = false;
    st.lastInteractTime = performance.now();
  };

  const onArcPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = animRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (st.pointerId !== e.pointerId) {
      if (e.pointerType === 'mouse' && sceneCtrlRef.current && heroRef.current) {
        const hitJ = sceneCtrlRef.current.raycastHeroBar(
          e.clientX,
          e.clientY,
          vw,
          vh
        );
        heroRef.current.classList.toggle('bar-hover', hitJ !== null);
      }
      return;
    }

    const dx = e.clientX - st.downX;
    if (!st.dragging && Math.abs(dx) > 6) {
      st.dragging = true;
      st.slideTween = null;
      document.body.classList.add('dragging');
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    if (st.dragging) {
      st.lastInteractTime = performance.now();
      const heroH = heroRef.current?.clientHeight || vh;
      const isPhone = vw < 820;
      const heroU = isPhone
        ? Math.min(vw / 560, heroH / 980)
        : Math.min(vw / 1440, heroH / 900);
      const xSpread = isPhone ? 1.02 : 1;
      const slotPx = Math.max(40, 245 * heroU * xSpread);

      const now = performance.now();
      const dt = Math.max(1, now - st.lastDragTime);
      const stepDx = e.clientX - st.lastDragX;
      const instantVel = -stepDx / slotPx / dt;
      st.velSlotsPerMs = lerp(st.velSlotsPerMs, instantVel, 0.4);
      st.lastDragX = e.clientX;
      st.lastDragTime = now;

      st.pos = st.pos0 - dx / slotPx;
    }
  };

  const finishArcPointer = (
    e: React.PointerEvent<HTMLDivElement>,
    isCancel: boolean
  ) => {
    const st = animRef.current;
    if (st.pointerId !== e.pointerId) return;
    st.pointerId = -1;
    document.body.classList.remove('dragging');

    if (st.dragging) {
      st.dragging = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      if (isCancel && Math.abs(st.pos - Math.round(st.pos)) <= 0.02) {
        st.pos = Math.round(st.pos);
        st.target = st.pos;
        return;
      }
      const flickOffset = clamp(st.velSlotsPerMs * 220, -2, 2);
      const snapTo = Math.round(st.pos + flickOffset);
      const dur = Math.max(
        380,
        650 * Math.min(1, Math.abs(snapTo - st.pos) + 0.35)
      );
      goTo(snapTo, dur);
    } else if (!isCancel) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const hitJ = sceneCtrlRef.current?.raycastHeroBar(
        e.clientX,
        e.clientY,
        vw,
        vh
      );
      if (hitJ !== null && hitJ !== undefined) {
        const k = hitJ - Math.round(st.target);
        if (k !== 0) {
          goTo(st.target + k);
        }
      }
    }
  };

  const scrollToSection = (id: 'flavors' | 'inside' | 'shop' | 'range') => {
    const st = animRef.current;
    st.smoothScrollActive = false;
    setActiveSection(id);

    const el = document.getElementById(id);
    if (!el) return;

    const startY = window.scrollY;
    const rect = el.getBoundingClientRect();
    let targetY = Math.max(0, startY + rect.top);

    if (id === 'flavors') {
      targetY = 0;
    } else if (id === 'inside') {
      targetY = Math.max(0, startY + rect.top + Math.round(window.innerHeight * 0.06));
    }

    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );
    targetY = clamp(targetY, 0, maxScroll);

    if (reducedMotionRef.current || Math.abs(targetY - startY) < 2) {
      st.navScrollTween = null;
      window.scrollTo(0, targetY);
      st.smoothScrollCurrent = targetY;
      st.smoothScrollTarget = targetY;
      return;
    }

    const dist = Math.abs(targetY - startY);
    const duration = clamp(480 + dist * 0.07, 520, 920);
    st.navScrollTween = {
      from: startY,
      to: targetY,
      startTime: performance.now(),
      duration,
      targetSection: id,
    };
  };

  const scrollToInsideStep = (stepIdx: number) => {
    const st = animRef.current;
    st.smoothScrollActive = false;
    const insideEl = insideRef.current;
    if (!insideEl) return;
    const startY = window.scrollY;
    const rect = insideEl.getBoundingClientRect();
    const absTop = startY + rect.top;
    const scrollable = Math.max(1, insideEl.offsetHeight - window.innerHeight);
    const targetP = (stepIdx + 0.5) * 0.19;
    const targetY = absTop + targetP * scrollable;

    if (reducedMotionRef.current || Math.abs(targetY - startY) < 2) {
      st.navScrollTween = null;
      window.scrollTo(0, targetY);
      return;
    }

    const dist = Math.abs(targetY - startY);
    const duration = clamp(420 + dist * 0.12, 460, 780);
    st.navScrollTween = {
      from: startY,
      to: targetY,
      startTime: performance.now(),
      duration,
      targetSection: 'inside',
    };
  };

  const onCardPointerMove = (
    idx: number,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    if (e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5);
    const y = clamp((e.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5);
    animRef.current.cardTilts[idx].x = x;
    animRef.current.cardTilts[idx].y = y;
  };

  const onCardPointerLeave = (idx: number) => {
    animRef.current.cardTilts[idx].x = 0;
    animRef.current.cardTilts[idx].y = 0;
    animRef.current.cardTilts[idx].pressed = false;
  };

  const onCardPointerDown = (idx: number) => {
    animRef.current.cardTilts[idx].pressed = true;
  };

  const onCardPointerUp = (idx: number) => {
    animRef.current.cardTilts[idx].pressed = false;
  };

  const onCardPoke = (idx: number) => {
    animRef.current.cardTilts[idx].pokeStart = performance.now();
    if (!document.body.classList.contains('gl')) {
      setPokingCard(idx);
      window.setTimeout(() => {
        setPokingCard((prev) => (prev === idx ? null : prev));
      }, 500);
    }
  };

  const triggerBasketBump = useCallback(() => {
    setBasketBump(false);
    requestAnimationFrame(() => setBasketBump(true));
    window.setTimeout(() => setBasketBump(false), 340);
  }, []);

  const onAddBagFromCard = (
    idx: number,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();
    const pkEl = cardPkRefs.current[idx];
    if (!pkEl) {
      setCartCount((c) => c + 1);
      return;
    }
    flyBarsToCart(
      [pkEl],
      basketRef.current,
      reducedMotionRef.current,
      () => triggerBasketBump(),
      () => setCartCount((c) => c + 1)
    );
  };

  const onRemoveSlot = (slotIdx: number) => {
    if (buyJustAdded) return;
    animRef.current.userTouchedPack = true;
    setPackSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
  };

  const onAddThumbToPack = (flavorIdx: number) => {
    if (buyJustAdded) return;
    animRef.current.userTouchedPack = true;
    setPackSlots((prev) => {
      const emptyIdx = prev.findIndex((s) => s === null);
      if (emptyIdx === -1) return prev;
      const next = [...prev];
      next[emptyIdx] = flavorIdx;
      return next;
    });
  };

  const emptySlotCount = packSlots.filter((s) => s === null).length;

  const onBuyPack = () => {
    if (emptySlotCount > 0 || buyJustAdded) return;
    animRef.current.userTouchedPack = true;
    const sources = slotBarRefs.current.filter(
      (el): el is HTMLDivElement => el !== null
    );

    flyBarsToCart(
      sources,
      basketRef.current,
      reducedMotionRef.current,
      () => triggerBasketBump(),
      () => {
        setCartCount((c) => c + 1);
      }
    );

    window.setTimeout(() => {
      setPackSlots([null, null, null]);
      setBuyJustAdded(true);
      window.setTimeout(() => {
        setBuyJustAdded(false);
      }, 1600);
    }, 60);
  };

  const stepHeadLines =
    displayStep === 3
      ? FLAVORS[displayStepFlavor].name.toUpperCase().split(' ')
      : INSIDE_STEPS[displayStep].headLines;

  return (
    <>
      {introVisible && (
        <div id="intro" className={stampMode ? 'stamp-bg' : ''}>
          {!stampMode && (
            <video
              ref={videoRef}
              src={INTRO_VIDEO_URL}
              muted
              playsInline
              preload="auto"
            />
          )}
          {stampMode && (
            <div className="intro-stamp">
              <BrandMark className="stamp-mark" />
              <span className="stamp-word">STRIDE</span>
            </div>
          )}
          <button
            type="button"
            className="skip-btn"
            onClick={enterHero}
          >
            Skip intro
          </button>
        </div>
      )}

      <nav
        id="nav"
        className={`${!heroEntered ? 'nav-hidden' : ''} ${
          navTheme === 'dark' ? 'dark' : navTheme === 'light' ? 'light' : ''
        }`}
        aria-label="Primary"
      >
        <a
          href="#flavors"
          className="nav-brand"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('flavors');
          }}
        >
          <BrandMark
            className="nav-mark"
            inverted={navTheme === 'dark'}
          />
          <span className="nav-wordmark">STRIDE</span>
          <span
            className="brand-flav-dot"
            aria-hidden="true"
            title={FLAVORS[activeFlavor].name}
          />
        </a>

        <div
          ref={navPillRef}
          className={`nav-pill ${!heroEntered ? 'nav-hidden' : ''} ${
            navTheme === 'dark' ? 'dark' : navTheme === 'light' ? 'light' : ''
          }`}
        >
          <div
            ref={navHlRef}
            className="nav-hl"
            style={{
              width: `${navHlStyle.width}px`,
              transform: `translate3d(${navHlStyle.left}px, 0, 0)`,
            }}
          />
          {(
            [
              ['flavors', 'Flavors'],
              ['inside', 'Inside'],
              ['shop', 'Shop'],
              ['range', 'Range'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              ref={(el) => {
                navLinkRefs.current[id] = el;
              }}
              type="button"
              className={`nav-link ${activeSection === id ? 'active' : ''}`}
              onClick={() => scrollToSection(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="nav-right">
          <button
            type="button"
            className="chip-off"
            onClick={() => scrollToSection('range')}
          >
            % OFF
          </button>
          <button
            ref={basketRef}
            id="basket"
            type="button"
            className={`chip-basket ${basketBump ? 'bump' : ''}`}
            aria-label={`Cart (${cartCount} items)`}
            onClick={() => scrollToSection('shop')}
          >
            <BasketIcon />
            {cartCount > 0 && (
              <span key={cartCount} className="cart-badge">
                {cartCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className="chip-dibs"
            onClick={() => scrollToSection('range')}
          >
            First dibs
          </button>
        </div>
      </nav>

      <section id="flavors" ref={heroRef}>
        <div ref={revealRef} className="reveal" />
        <div className={`rings ${!heroEntered ? 'pre-enter' : ''}`} />
        <div className="bits" aria-hidden="true">
          {HERO_BITS.map((hb, i) => {
            const crop = getSpriteCrop(BITS[hb.bit], 0);
            return (
              <div
                key={i}
                className={`spr hero-bit ${heroEntered ? 'entered' : ''} ${
                  hb.hideOnPhone ? 'hide-phone' : ''
                }`}
                style={{
                  left: `${hb.x * 100}%`,
                  top: `${hb.y * 100}%`,
                  width: `calc(${hb.size} * var(--u))`,
                  height: `calc(${hb.size} * var(--u))`,
                  transform: `translate(-50%, -50%) rotate(${hb.rot}deg)`,
                  transitionDelay: `${300 + 90 * i}ms`,
                  animation: heroEntered
                    ? `bitDrift${i} ${7000 + 900 * i}ms ease-in-out infinite`
                    : 'none',
                  ...crop,
                }}
              />
            );
          })}
        </div>
        <div
          ref={arcHitRef}
          className="arc"
          onPointerDown={onArcPointerDown}
          onPointerMove={onArcPointerMove}
          onPointerUp={(e) => finishArcPointer(e, false)}
          onPointerCancel={(e) => finishArcPointer(e, true)}
        />
        <button
          id="play"
          type="button"
          aria-label="Next flavour"
          className={!heroEntered ? 'pre-enter' : ''}
          style={{ transitionDelay: heroEntered ? '500ms' : '0ms' }}
          onClick={() => goTo(animRef.current.target + 1)}
        >
          <ArrowRightIcon />
        </button>
        <h1
          id="title"
          ref={titleRef}
          className="disp"
          aria-live="polite"
          aria-label={FLAVORS[activeFlavor].name}
        />
        <div
          id="count"
          ref={countRef}
          className={!heroEntered ? 'pre-enter' : ''}
          style={{ transitionDelay: heroEntered ? '620ms' : '0ms' }}
        >
          02
        </div>
        <button
          id="auto"
          type="button"
          aria-pressed={autoplay}
          className={!heroEntered ? 'pre-enter' : ''}
          style={{ transitionDelay: heroEntered ? '740ms' : '0ms' }}
          onClick={() => {
            animRef.current.lastInteractTime = performance.now();
            setAutoplay((a) => !a);
          }}
        >
          <span className="auto-ring">
            {autoplay ? <PauseGlyph /> : <PlayGlyph />}
          </span>
          <span>AUTOPLAY</span>
        </button>
      </section>

      <section id="inside" ref={insideRef}>
        <div className="pin">
          <div ref={inDarkRef} className="in-dark" />
          <div ref={inBackFrameRef} className="in-frame">
            <div ref={inNumRef} className="in-num">
              {INSIDE_STEPS[displayStep].num}
            </div>
            <div id="inBar" ref={inBarRef} />
          </div>
        </div>
      </section>

      <div id="inFront" ref={inFrontRef} style={{ visibility: 'hidden' }}>
        <div ref={inFrontFrameRef} className="in-frame">
          <h2 ref={inHeadRef} className="in-head disp">
            {stepHeadLines.map((line, idx) => (
              <span
                key={idx}
                className={
                  displayStep === 3 && line.length > 9 ? 'long-word' : ''
                }
                style={{ display: 'block' }}
              >
                {line}
              </span>
            ))}
          </h2>

          <div className="in-icons" role="group" aria-label="Inside steps">
            {[0, 1, 2, 3].map((idx) => (
              <button
                key={idx}
                type="button"
                className={`in-icon-btn ${insideStep === idx ? 'active' : ''}`}
                aria-label={`Step 0${idx + 1}`}
                aria-pressed={insideStep === idx}
                onClick={() => scrollToInsideStep(idx)}
              >
                <StepIcon index={idx} />
              </button>
            ))}
          </div>

          <p ref={inCapRef} className="in-cap">
            {INSIDE_STEPS[displayStep].captionLines[0]}
            <br />
            {INSIDE_STEPS[displayStep].captionLines[1]}
          </p>
        </div>

        <div className="storm-layer" aria-hidden="true">
          {STORM_SPECS.map((spec, idx) => {
            const bitIdx = spec.useSelectedBit
              ? FLAVORS[activeFlavor].bit
              : spec.fallbackBit;
            const crop = getSpriteCrop(BITS[bitIdx], 0);
            return (
              <div
                key={spec.id}
                ref={(el) => {
                  stormPieceRefs.current[idx] = el;
                }}
                className="spr storm-piece"
                style={{
                  display: 'none',
                  ...crop,
                }}
              />
            );
          })}
        </div>
      </div>

      <section id="shop" ref={shopRef}>
        <h2 className={`shop-head disp ${shopRevealed ? 'revealed' : ''}`}>
          <span className="line-mask">
            <span className="line-inner">GRAB</span>
          </span>
          <span className="line-mask">
            <span
              className="line-inner"
              style={{ transitionDelay: '80ms' }}
            >
              A BAG
            </span>
          </span>
        </h2>

        <p className={`shop-cap ${shopRevealed ? 'revealed' : ''}`}>
          Five bold flavours. Same
          <br />
          real ingredients. Pick your
          <br />
          favourite (or try them all).
        </p>

        <div ref={shopGridRef} className="shop-grid">
          {FLAVORS.map((flav, idx) => {
            const isLive = activeFlavor === idx;
            const crop = getSpriteCrop(flav.box, 4);
            return (
              <div
                key={flav.index}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                className={`card ${isLive ? 'live' : ''} ${
                  shopRevealed ? 'revealed' : ''
                }`}
                style={{
                  backgroundColor: flav.color,
                  transitionDelay:
                    !shopEntranceDone && shopRevealed ? `${idx * 70}ms` : '0ms',
                }}
                onPointerMove={(e) => onCardPointerMove(idx, e)}
                onPointerLeave={() => onCardPointerLeave(idx)}
                onPointerDown={() => onCardPointerDown(idx)}
                onPointerUp={() => onCardPointerUp(idx)}
                onClick={() => onCardPoke(idx)}
              >
                <h3 className="card-title disp">
                  {flav.lines[0]}
                  <br />
                  {flav.lines[1]}
                </h3>
                <div
                  ref={(el) => {
                    cardPkRefs.current[idx] = el;
                  }}
                  className={`spr pk ${pokingCard === idx ? 'poking' : ''}`}
                  style={crop}
                />
                <button
                  type="button"
                  className="card-add"
                  aria-label={`Add a bag of ${flav.name} to the cart`}
                  onClick={(e) => onAddBagFromCard(idx, e)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 3V13M3 8H13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section id="range" ref={rangeRef}>
        <div className="range-left">
          <h2 className={`range-head disp ${rangeRevealed ? 'revealed' : ''}`}>
            <span className="line-mask">
              <span className="line-inner">BUILD YOUR</span>
            </span>
            <span className="line-mask">
              <span
                className="line-inner"
                style={{ transitionDelay: '80ms' }}
              >
                <span className="pack-badge">3</span> PACK &amp;
              </span>
            </span>
            <span className="line-mask">
              <span
                className="line-inner"
                style={{ transitionDelay: '160ms' }}
              >
                SAVE $1.49
              </span>
            </span>
          </h2>

          <div className="thumbs-row">
            {FLAVORS.map((flav, idx) => {
              const countInPack = packSlots.filter((s) => s === idx).length;
              const crop = getSpriteCrop(flav.box, 4);
              return (
                <button
                  key={flav.index}
                  type="button"
                  className="thumb-btn"
                  aria-label={`Add ${flav.name} to 3 pack`}
                  onClick={() => onAddThumbToPack(idx)}
                >
                  <div
                    className="thumb-box"
                    style={{ backgroundColor: flav.color }}
                  >
                    <div className="spr thumb-spr" style={crop} />
                  </div>
                  <span className="thumb-name">{flav.name}</span>
                  <span
                    className={`thumb-ring ${
                      countInPack > 0 ? 'has-item' : ''
                    }`}
                  >
                    {countInPack === 1
                      ? '✓'
                      : countInPack > 1
                      ? countInPack
                      : ''}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            id="buy"
            type="button"
            disabled={emptySlotCount > 0 && !buyJustAdded}
            className={buyJustAdded ? 'added' : ''}
            onClick={onBuyPack}
          >
            {buyJustAdded ? (
              <span>Added to cart</span>
            ) : emptySlotCount > 0 ? (
              <span>Pick {emptySlotCount} more</span>
            ) : (
              <>
                <span>Add to cart</span>
                <span className="buy-price">$7.48</span>
              </>
            )}
          </button>
        </div>

        <div className="range-glow">
          {SLOT_POSITIONS.map(([leftPct, topPct], slotIdx) => {
            const flavIdx = packSlots[slotIdx];
            const isFilled = flavIdx !== null;
            const crop = isFilled
              ? getSpriteCrop(FLAVORS[flavIdx].box, 4)
              : undefined;
            return (
              <div
                key={slotIdx}
                className={`range-slot ${isFilled ? 'filled' : ''}`}
                style={{ left: leftPct, top: topPct }}
              >
                {isFilled && (
                  <div
                    ref={(el) => {
                      slotBarRefs.current[slotIdx] = el;
                    }}
                    className="spr slot-bar"
                    style={crop}
                  />
                )}
                <button
                  type="button"
                  className="slot-remove"
                  aria-label={
                    isFilled
                      ? `Remove ${FLAVORS[flavIdx].name} from slot ${slotIdx + 1}`
                      : `Empty slot ${slotIdx + 1}`
                  }
                  onClick={() => {
                    if (isFilled) {
                      onRemoveSlot(slotIdx);
                    }
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 3L11 11M11 3L3 11"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
