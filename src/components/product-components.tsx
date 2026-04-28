'use client';

import { PaginationControls } from '@/components/catalogo/PaginationControls';
import { PriceDisplay } from '@/components/catalogo/PriceDisplay';
import { ProductCard } from '@/components/catalogo/ProductCard';
import ProductCardSkeleton from '@/components/catalogo/ProductCardSkeleton';
import { SmartImage } from '@/components/catalogo/SmartImage';
import { useStore } from '@/components/catalogo/store-context';
import { useLayoutStore } from '@/components/catalogo/store-layout';
import { Button } from '@/components/ui/button';
import { LazyProductImage } from '@/components/ui/LazyProductImage';
import { getProductImageUrl } from '@/lib/imageUtils';
import { Product } from '@/lib/types'; // Importando tipo centralizado
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  ImageOff,
  LayoutGrid,
  List,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Sun,
  User,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// --- Interfaces ---
interface SlideData {
  id: number;
  imageUrl: string;
  linkUrl: string;
  altText: string;
}

// Normalization helper used across category/type logic (moved to module scope)
const normalizeForTypeModule = (x: any) => {
  try {
    let s = String(x || '')
      .toLowerCase()
      .trim();

    // 1. Semantic mapping for Clip-on variants
    if (
      s.includes('clipon') ||
      (s.includes('clip') && s.includes('on')) ||
      s.includes('clion') ||
      s.includes('clpon') ||
      s.includes('clip-on')
    ) {
      return 'clipon';
    }

    // 2. Standard normalization: remove non-alphanumeric and leading 'opt'
    const cleaned = s.replace(/[^a-z0-9]+/gi, '');
    return cleaned.replace(/^opt+/, '');
  } catch (e) {
    return String(x || '').toLowerCase();
  }
};

// Back-compat alias for any runtime references (HMR/dev overlay protection)
// Keep `normalizeForType` name for modules that may still reference it during hot reload.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeForType: (x: any) => string = normalizeForTypeModule as any;

function OutsideCloseEffect({
  openType,
  openGender,
  openMore,
  openMaterial,
  onCloseAll,
}: {
  openType: boolean;
  openGender: boolean;
  openMore: boolean;
  openMaterial: boolean;
  onCloseAll: () => void;
}) {
  useEffect(() => {
    if (!openType && !openGender && !openMore && !openMaterial) return;
    const onDocDown = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return onCloseAll();
      if (
        target.closest('[data-menu]') ||
        target.closest('[data-menu-trigger]')
      )
        return;
      onCloseAll();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseAll();
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openType, openGender, openMore, openMaterial, onCloseAll]);
  return null;
}

export function CategoryBar() {
  const {
    categories = [],
    selectedCategory,
    setSelectedCategory,
    initialProducts = [],
    showOnlyNew,
    setShowOnlyNew,
    showOnlyBestsellers,
    setShowOnlyBestsellers,
    selectedBrand,
    selectedMaterial,
    setSelectedMaterial,
    materials = [],
    filterPolarizado,
    setFilterPolarizado,
    filterFotocromatico,
    setFilterFotocromatico,
  } = useStore();
  // prod: removed debug logs
  const { genders = [], selectedGender, setSelectedGender } = useStore();

  const hasBestSellers = useMemo(
    () => initialProducts.some((p: Product) => (p as any).bestseller),
    [initialProducts]
  );
  const hasPolarizado = useMemo(
    () => initialProducts.some((p: Product) => (p as any).polarizado),
    [initialProducts]
  );
  const hasFotocromatico = useMemo(
    () => initialProducts.some((p: Product) => (p as any).fotocromatico),
    [initialProducts]
  );

  const displayGenders = useMemo(() => {
    const activeBrand = Array.isArray(selectedBrand)
      ? (selectedBrand[0] as string)
      : (selectedBrand as string | undefined);
    const productsForBrand =
      activeBrand && activeBrand !== 'all'
        ? initialProducts.filter(
            (p: Product) =>
              (p.brand || '').toString().trim().toLowerCase() ===
              (activeBrand || '').toString().trim().toLowerCase()
          )
        : initialProducts;
    const ND_PATTERNS = ['n/d', '#n/d', 'nd', 'n.d', 'n.d.', '-', ''];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const p of productsForBrand) {
      const raw = ((p as any).gender || '').toString().trim();
      if (!raw || ND_PATTERNS.includes(raw.toLowerCase())) continue;
      const upper = raw.toUpperCase();
      if (!seen.has(upper)) {
        seen.add(upper);
        result.push(upper);
      }
    }
    return result;
  }, [initialProducts, selectedBrand]);

  const displayCategories = useMemo(() => {
    const activeBrand = Array.isArray(selectedBrand)
      ? (selectedBrand[0] as string)
      : (selectedBrand as string | undefined);
    const productsForBrand =
      activeBrand && activeBrand !== 'all'
        ? initialProducts.filter(
            (p: Product) =>
              (p.brand || '').toString().trim().toLowerCase() ===
              (activeBrand || '').toString().trim().toLowerCase()
          )
        : initialProducts;
    // If there are categories in the dedicated table, merge them with
    // categories derived from products so deleting rows doesn't hide product-backed categories.
    const tableCats =
      categories && categories.length > 0
        ? categories.map((c: any) =>
            typeof c === 'string' ? c : c?.name || String(c)
          )
        : [];
    const ND_PATTERNS = ['n/d', '#n/d', 'nd', 'n.d', 'n.d.', '-', ''];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const p of productsForBrand) {
      const raw = (p.category || '').toString().trim();
      if (!raw || ND_PATTERNS.includes(raw.toLowerCase())) continue;
      const upper = raw.toUpperCase();
      if (!seen.has(upper)) {
        seen.add(upper);
        result.push(upper);
      }
    }
    // Merge table categories and product-derived categories, preserving order: table first
    const merged = [...tableCats.map((t: string) => String(t)), ...result];
    // Deduplicate case-insensitively while preserving first appearance
    const uniq: string[] = [];
    const seenLower = new Set<string>();
    for (const v of merged) {
      const k = String(v || '')
        .trim()
        .toLowerCase();
      if (!k) continue;
      if (!seenLower.has(k)) {
        seenLower.add(k);
        // Return in Title Case for UI consistency
        const title = String(v)
          .trim()
          .split(/\s+/)
          .map((w) =>
            w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''
          )
          .join(' ');
        uniq.push(title);
      }
    }
    return uniq;
  }, [categories, initialProducts, selectedBrand]);

  const displayTypes = useMemo(() => {
    const activeBrand = Array.isArray(selectedBrand)
      ? (selectedBrand[0] as string)
      : (selectedBrand as string | undefined);

    const productsForBrand =
      activeBrand && activeBrand !== 'all'
        ? initialProducts.filter(
            (p: Product) =>
              (p.brand || '').toString().trim().toLowerCase() ===
              (activeBrand || '').toString().trim().toLowerCase()
          )
        : initialProducts;

    const seen = new Set<string>();
    const result: string[] = [];

    // 1) Include categories coming from product records (these should be considered types)
    productsForBrand.forEach((p: any) => {
      const cat = String(p.category || '').trim();
      if (!cat) return;
      const key = cat.toUpperCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(cat);
      }
    });

    // 2) Also include class_core entries (de-duplicated)
    productsForBrand.forEach((p: any) => {
      const core = String((p as any).class_core || '').trim();
      if (!core) return;
      const key = core.toUpperCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(core);
      }
    });

    // Sort for deterministic order
    return result.sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
  }, [initialProducts, selectedBrand]);

  const isSelectedType = (t: any) => {
    if (!t) return false;
    return (
      normalizeForTypeModule(selectedCategory) === normalizeForTypeModule(t)
    );
  };
  const normalizeSimple = (s: any) =>
    String(s || '')
      .trim()
      .toLowerCase();
  const isSelectedGender = (g: any) =>
    normalizeSimple(selectedGender) === normalizeSimple(g);
  const isSelectedMaterial = (m: any) =>
    normalizeSimple(selectedMaterial) === normalizeSimple(m);

  // Avoid rendering loose category chips — force empty visibleCategories
  const visibleCategories = useMemo(() => [], []);

  const [openTypeMenu, setOpenTypeMenu] = useState(false);
  const [openGenderMenu, setOpenGenderMenu] = useState(false);
  const [openMoreMenu, setOpenMoreMenu] = useState(false);
  const [openMaterialMenu, setOpenMaterialMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const typeBtnRef = useRef<HTMLButtonElement | null>(null);
  const genderBtnRef = useRef<HTMLButtonElement | null>(null);
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const materialBtnRef = useRef<HTMLButtonElement | null>(null);
  const [typeMenuRect, setTypeMenuRect] = useState<null | {
    left: number;
    top: number;
    width: number;
  }>(null);
  const [genderMenuRect, setGenderMenuRect] = useState<null | {
    left: number;
    top: number;
    width: number;
  }>(null);
  const [materialMenuRect, setMaterialMenuRect] = useState<null | {
    left: number;
    top: number;
    width: number;
  }>(null);
  const [moreMenuRect, setMoreMenuRect] = useState<null | {
    left: number;
    top: number;
    width: number;
  }>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // (store banner meta is handled in StoreBanners component)
  const router = useRouter();

  if (!displayCategories || displayCategories.length === 0) return null;

  // Mobile: render compact bar without horizontal scroll
  if (isMobile) {
    return (
      <div className="w-full bg-white border-b border-gray-100 py-3 sticky top-0 z-30">
        <div className="w-full px-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all border ${
                selectedCategory === 'all'
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              Todos
            </button>

            <button
              ref={moreBtnRef}
              data-menu-trigger="more"
              onClick={() => {
                const next = !openMoreMenu;
                setOpenMoreMenu(next);
                setOpenTypeMenu(false);
                setOpenGenderMenu(false);
                if (next && moreBtnRef.current) {
                  const r = moreBtnRef.current.getBoundingClientRect();
                  setMoreMenuRect({
                    left: r.left,
                    top: r.bottom + 8,
                    width: Math.max(220, r.width * 2),
                  });
                }
              }}
              aria-expanded={openMoreMenu}
              className="ml-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors text-gray-600 border border-gray-200 hover:bg-gray-50"
            >
              Mais ▾
            </button>
          </div>

          <div className="text-sm text-gray-600">
            {selectedCategory && selectedCategory !== 'all'
              ? `Categoria: ${selectedCategory}`
              : 'Filtros'}
          </div>
        </div>

        {openMoreMenu && moreMenuRect && (
          <div className="px-4 pt-3 pb-4 bg-white border-t">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-2">Tipo</h4>
                <div className="flex flex-col gap-2 pr-2">
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setOpenMoreMenu(false);
                    }}
                    className={`text-sm text-left px-2 py-1 rounded hover:bg-gray-50 ${selectedCategory === 'all' ? 'font-bold' : ''}`}
                  >
                    TODOS OS TIPOS
                  </button>
                  {(displayTypes && displayTypes.length
                    ? displayTypes
                    : []
                  ).map((t: string) => (
                    <button
                      key={t}
                      onClick={() => {
                        setSelectedCategory(t);
                        setOpenMoreMenu(false);
                      }}
                      className={`text-sm text-left px-2 py-1 rounded hover:bg-gray-50 ${isSelectedType(t) ? 'bg-[var(--primary)] text-white' : ''}`}
                    >
                      {String(t).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-2">Gênero</h4>
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={() => {
                      setSelectedGender('all');
                      setOpenMoreMenu(false);
                    }}
                    className="text-sm text-left px-2 py-1 rounded hover:bg-gray-50"
                  >
                    TODOS OS GÊNEROS
                  </button>
                  {(displayGenders && displayGenders.length
                    ? displayGenders
                    : genders
                  ).map((g: string) => (
                    <button
                      key={g}
                      onClick={() => {
                        setSelectedGender(g);
                        setOpenMoreMenu(false);
                      }}
                      className="text-sm text-left px-2 py-1 rounded hover:bg-gray-50"
                    >
                      {String(g).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-2">
                  Material
                </h4>
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={() => {
                      setSelectedMaterial('all');
                      setOpenMoreMenu(false);
                    }}
                    className="text-sm text-left px-2 py-1 rounded hover:bg-gray-50"
                  >
                    TODOS OS MATERIAIS
                  </button>
                  {(materials && materials.length ? materials : []).map(
                    (m: any) => (
                      <button
                        key={m}
                        onClick={() => {
                          setSelectedMaterial(m);
                          setOpenMoreMenu(false);
                        }}
                        className="text-sm text-left px-2 py-1 rounded hover:bg-gray-50"
                      >
                        {String(m).toUpperCase()}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 border-t pt-3">
              <button
                onClick={() => {
                  const next = !showOnlyBestsellers;
                  setShowOnlyBestsellers && setShowOnlyBestsellers(next);
                  try {
                    const params = new URLSearchParams(window.location.search);
                    if (next) params.set('bs', '1');
                    else params.delete('bs');
                    const url = params.toString()
                      ? `${window.location.pathname}?${params.toString()}`
                      : window.location.pathname;
                    router.replace(url);
                  } catch (e) {
                    // ignore
                  }
                  setOpenMoreMenu(false);
                }}
                className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 flex items-center gap-2"
              >
                <Star size={14} /> Best Sellers
              </button>

              <button
                onClick={() => {
                  const next = !showOnlyNew;
                  setShowOnlyNew && setShowOnlyNew(next);
                  try {
                    const params = new URLSearchParams(window.location.search);
                    if (next) params.set('new', '1');
                    else params.delete('new');
                    const url = params.toString()
                      ? `${window.location.pathname}?${params.toString()}`
                      : window.location.pathname;
                    router.replace(url);
                  } catch (e) {
                    // ignore
                  }
                  setOpenMoreMenu(false);
                }}
                className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 flex items-center gap-2 mt-2"
              >
                <Zap size={14} /> Lançamentos
              </button>

              <button
                onClick={() => {
                  const next = !filterPolarizado;
                  setFilterPolarizado && setFilterPolarizado(next);
                  try {
                    const params = new URLSearchParams(window.location.search);
                    if (next) params.set('polarizado', '1');
                    else params.delete('polarizado');
                    const url = params.toString()
                      ? `${window.location.pathname}?${params.toString()}`
                      : window.location.pathname;
                    router.replace(url);
                  } catch (e) {
                    // ignore
                  }
                  setOpenMoreMenu(false);
                }}
                className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 flex items-center gap-2 mt-2"
              >
                <span className="inline-flex items-center gap-2">
                  <Sun size={14} /> Polarizado
                </span>
              </button>

              <button
                onClick={() => {
                  const next = !filterFotocromatico;
                  setFilterFotocromatico && setFilterFotocromatico(next);
                  try {
                    const params = new URLSearchParams(window.location.search);
                    if (next) params.set('fotocromatico', '1');
                    else params.delete('fotocromatico');
                    const url = params.toString()
                      ? `${window.location.pathname}?${params.toString()}`
                      : window.location.pathname;
                    router.replace(url);
                  } catch (e) {
                    // ignore
                  }
                  setOpenMoreMenu(false);
                }}
                className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 flex items-center gap-2 mt-2"
              >
                <span className="inline-flex items-center gap-2">
                  <ImageIcon size={14} /> Fotocromático
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-white border-b border-gray-100 py-3 sticky top-0 z-30 shadow-sm md:shadow-none">
      <div className="w-full px-4 lg:px-8 flex items-center gap-4 lg:gap-6 overflow-x-auto scrollbar-hide select-none scroll-px-4">
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0 pr-2">
              Categoria:
            </span>

            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all border ${
                selectedCategory === 'all'
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              Todos
            </button>

            {/* categories rendered after the main filter buttons (see below) */}

            {/* Tipo: botão com dropdown no desktop; no mobile permanece dentro de 'Mais' */}
            {!isMobile && (
              <>
                <button
                  ref={typeBtnRef}
                  data-menu-trigger="type"
                  onClick={() => {
                    const next = !openTypeMenu;
                    setOpenTypeMenu(next);
                    setOpenGenderMenu(false);
                    setOpenMaterialMenu(false);
                    setOpenMoreMenu(false);
                    if (next && typeBtnRef.current) {
                      const r = typeBtnRef.current.getBoundingClientRect();
                      setTypeMenuRect({
                        left: r.left,
                        top: r.bottom + 8,
                        width: Math.max(240, r.width * 2),
                      });
                    }
                  }}
                  aria-expanded={openTypeMenu}
                  className="ml-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors text-gray-600 border border-gray-200 hover:bg-gray-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <LayoutGrid size={14} /> Tipo ▾
                  </span>
                </button>
              </>
            )}

            <button
              ref={genderBtnRef}
              data-menu-trigger="gender"
              onClick={() => {
                const next = !openGenderMenu;
                setOpenGenderMenu(next);
                setOpenTypeMenu(false);
                setOpenMaterialMenu(false);
                setOpenMoreMenu(false);
                if (next && genderBtnRef.current) {
                  const r = genderBtnRef.current.getBoundingClientRect();
                  setGenderMenuRect({
                    left: r.left,
                    top: r.bottom + 8,
                    width: Math.max(220, r.width * 2),
                  });
                }
              }}
              aria-expanded={openGenderMenu}
              className="ml-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors text-gray-600 border border-gray-200 hover:bg-gray-50"
            >
              <span className="inline-flex items-center gap-2">
                <User size={14} /> Gênero ▾
              </span>
            </button>

            {materials && materials.length > 0 && (
              <button
                ref={materialBtnRef}
                data-menu-trigger="material"
                onClick={() => {
                  const next = !openMaterialMenu;
                  setOpenMaterialMenu(next);
                  setOpenTypeMenu(false);
                  setOpenGenderMenu(false);
                  setOpenMoreMenu(false);
                  if (next && materialBtnRef.current) {
                    const r = materialBtnRef.current.getBoundingClientRect();
                    setMaterialMenuRect({
                      left: r.left,
                      top: r.bottom + 8,
                      width: Math.max(220, r.width * 2),
                    });
                  }
                }}
                aria-expanded={openMaterialMenu}
                className="ml-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors text-gray-600 border border-gray-200 hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Archive size={14} /> Material ▾
                </span>
              </button>
            )}

            {isMobile && (
              <button
                ref={moreBtnRef}
                data-menu-trigger="more"
                onClick={() => {
                  const next = !openMoreMenu;
                  setOpenMoreMenu(next);
                  setOpenTypeMenu(false);
                  setOpenGenderMenu(false);
                  if (next && moreBtnRef.current) {
                    const r = moreBtnRef.current.getBoundingClientRect();
                    setMoreMenuRect({
                      left: r.left,
                      top: r.bottom + 8,
                      width: Math.max(180, r.width * 2),
                    });
                  }
                }}
                aria-expanded={openMoreMenu}
                className="ml-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors text-gray-600 border border-gray-200 hover:bg-gray-50"
              >
                Mais ▾
              </button>
            )}

            {/* Render category chips after main filter buttons */}
            {visibleCategories.slice(0, 6).map((cat: any) => (
              <button
                key={typeof cat === 'string' ? cat : cat?.name}
                onClick={() =>
                  setSelectedCategory(typeof cat === 'string' ? cat : cat?.name)
                }
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border ${
                  selectedCategory ===
                  (typeof cat === 'string' ? cat : cat?.name)
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {(typeof cat === 'string' ? cat : cat?.name || '')
                  .toString()
                  .toUpperCase()}
              </button>
            ))}

            <button
              onClick={() => {
                const next = !showOnlyNew;
                setShowOnlyNew && setShowOnlyNew(next);
                try {
                  const params = new URLSearchParams(window.location.search);
                  if (next) params.set('new', '1');
                  else params.delete('new');
                  const url = params.toString()
                    ? `${window.location.pathname}?${params.toString()}`
                    : window.location.pathname;
                  router.replace(url);
                } catch (e) {
                  // ignore
                }
              }}
              aria-pressed={!!showOnlyNew}
              className={`ml-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                showOnlyNew
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Zap size={14} /> Lançamentos
              </span>
            </button>

            {hasBestSellers && (
              <button
                onClick={() => {
                  const next = !showOnlyBestsellers;
                  setShowOnlyBestsellers && setShowOnlyBestsellers(next);
                  try {
                    const params = new URLSearchParams(window.location.search);
                    if (next) params.set('bs', '1');
                    else params.delete('bs');
                    const url = params.toString()
                      ? `${window.location.pathname}?${params.toString()}`
                      : window.location.pathname;
                    router.replace(url);
                  } catch (e) {
                    // ignore
                  }
                }}
                aria-pressed={!!showOnlyBestsellers}
                className={`ml-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  showOnlyBestsellers
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Star size={14} /> Best Sellers
                </span>
              </button>
            )}

            {hasPolarizado && (
              <button
                onClick={() => {
                  const next = !filterPolarizado;
                  setFilterPolarizado && setFilterPolarizado(next);
                  try {
                    const params = new URLSearchParams(window.location.search);
                    if (next) params.set('polarizado', '1');
                    else params.delete('polarizado');
                    const url = params.toString()
                      ? `${window.location.pathname}?${params.toString()}`
                      : window.location.pathname;
                    router.replace(url);
                  } catch (e) {
                    // ignore
                  }
                }}
                aria-pressed={!!filterPolarizado}
                className={`ml-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  filterPolarizado
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Sun size={14} /> Polarizado
                </span>
              </button>
            )}

            {hasFotocromatico && (
              <button
                onClick={() => {
                  const next = !filterFotocromatico;
                  setFilterFotocromatico && setFilterFotocromatico(next);
                  try {
                    const params = new URLSearchParams(window.location.search);
                    if (next) params.set('fotocromatico', '1');
                    else params.delete('fotocromatico');
                    const url = params.toString()
                      ? `${window.location.pathname}?${params.toString()}`
                      : window.location.pathname;
                    router.replace(url);
                  } catch (e) {
                    // ignore
                  }
                }}
                aria-pressed={!!filterFotocromatico}
                className={`ml-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  filterFotocromatico
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <ImageIcon size={14} /> Fotocromático
                </span>
              </button>
            )}
          </div>

          {/* Fixed overlays for Tipo and Gênero - rendered as fixed so they overlay content */}
          {/* Tipo overlay (desktop dropdown) */}
          {typeMenuRect && (
            <div
              role="dialog"
              aria-modal="false"
              data-menu="type"
              className={`fixed bg-white border rounded-lg shadow-lg p-4 z-[9999] max-h-[60vh] overflow-auto transition-all duration-200 transform origin-top ${openTypeMenu ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
              style={{
                left: typeMenuRect.left,
                top: typeMenuRect.top,
                width: Math.min(typeMenuRect.width, 600),
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div>
                <div className="w-full flex items-center justify-between text-sm font-bold text-gray-700 mb-2">
                  <span>Tipo</span>
                  <button
                    onClick={() => setOpenTypeMenu(false)}
                    className="text-xs text-gray-400"
                    aria-label="Fechar Tipo"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-col gap-2 pr-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setOpenTypeMenu(false);
                      }}
                      className={`text-sm text-left px-2 py-1 rounded hover:bg-gray-50 ${selectedCategory === 'all' ? 'font-bold' : ''}`}
                    >
                      TODOS OS TIPOS
                    </button>
                    {selectedCategory && selectedCategory !== 'all' && (
                      <button
                        onClick={() => {
                          setSelectedCategory('all');
                          setOpenTypeMenu(false);
                        }}
                        className="text-xs text-gray-500 ml-2"
                      >
                        Remover filtro
                      </button>
                    )}
                  </div>
                  {displayTypes.map((t: any) => (
                    <button
                      key={t}
                      onClick={() => {
                        setSelectedCategory(t);
                        setOpenTypeMenu(false);
                      }}
                      className={`text-sm text-left px-2 py-1 rounded hover:bg-gray-50 ${isSelectedType(t) ? 'bg-[var(--primary)] text-white' : ''}`}
                    >
                      {String(t)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {genderMenuRect && (
            <div
              role="dialog"
              aria-modal="false"
              data-menu="gender"
              className={`fixed bg-white border rounded-lg shadow-lg p-4 z-[9999] max-h-[60vh] overflow-auto transition-all duration-200 transform origin-top ${openGenderMenu ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
              style={{
                left: genderMenuRect.left,
                top: genderMenuRect.top,
                width: Math.min(genderMenuRect.width, 420),
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div>
                <div className="w-full flex items-center justify-between text-sm font-bold text-gray-700 mb-2">
                  <span>Gênero</span>
                  <button
                    onClick={() => setOpenGenderMenu(false)}
                    className="text-xs text-gray-400"
                    aria-label="Fechar Gênero"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-col gap-2 pr-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedGender('all');
                        setOpenGenderMenu(false);
                      }}
                      className={`text-sm text-left px-2 py-1 rounded hover:bg-gray-50 ${selectedGender === 'all' ? 'font-bold' : ''}`}
                    >
                      TODOS OS GÊNEROS
                    </button>
                    {selectedGender && selectedGender !== 'all' && (
                      <button
                        onClick={() => {
                          setSelectedGender('all');
                          setOpenGenderMenu(false);
                        }}
                        className="text-xs text-gray-500 ml-2"
                      >
                        Remover filtro
                      </button>
                    )}
                  </div>
                  {(displayGenders && displayGenders.length
                    ? displayGenders
                    : genders
                  ).map((g: string) => (
                    <button
                      key={g}
                      onClick={() => {
                        setSelectedGender(g);
                        setOpenGenderMenu(false);
                      }}
                      className={`text-sm text-left px-2 py-1 rounded hover:bg-gray-50 ${isSelectedGender(g) ? 'bg-[var(--primary)] text-white' : ''}`}
                    >
                      {String(g).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {materialMenuRect && (
            <div
              role="dialog"
              aria-modal="false"
              data-menu="material"
              className={`fixed bg-white border rounded-lg shadow-lg p-4 z-[9999] max-h-[60vh] overflow-auto transition-all duration-200 transform origin-top ${openMaterialMenu ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
              style={{
                left: materialMenuRect.left,
                top: materialMenuRect.top,
                width: Math.min(materialMenuRect.width, 600),
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div>
                <div className="w-full flex items-center justify-between text-sm font-bold text-gray-700 mb-2">
                  <span>Material</span>
                  <button
                    onClick={() => setOpenMaterialMenu(false)}
                    className="text-xs text-gray-400"
                    aria-label="Fechar Material"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-col gap-2 pr-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedMaterial('all');
                        setOpenMaterialMenu(false);
                      }}
                      className={`text-sm text-left px-2 py-1 rounded hover:bg-gray-50 ${selectedMaterial === 'all' ? 'font-bold' : ''}`}
                    >
                      TODOS OS MATERIAIS
                    </button>
                    {selectedMaterial && selectedMaterial !== 'all' && (
                      <button
                        onClick={() => {
                          setSelectedMaterial('all');
                          setOpenMaterialMenu(false);
                        }}
                        className="text-xs text-gray-500 ml-2"
                      >
                        Remover filtro
                      </button>
                    )}
                  </div>
                  {(materials && materials.length ? materials : []).map(
                    (m: any) => (
                      <button
                        key={m}
                        onClick={() => {
                          setSelectedMaterial(m);
                          setOpenMaterialMenu(false);
                        }}
                        className={`text-sm text-left px-2 py-1 rounded hover:bg-gray-50 ${isSelectedMaterial(m) ? 'bg-[var(--primary)] text-white' : ''}`}
                      >
                        {String(m).toUpperCase()}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {moreMenuRect && (
            <div
              role="dialog"
              aria-modal="false"
              data-menu="more"
              className={`fixed bg-white border rounded-lg shadow-lg p-4 z-[9999] max-h-[40vh] overflow-auto transition-all duration-200 transform origin-top ${openMoreMenu ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
              style={{
                left: moreMenuRect.left,
                top: moreMenuRect.top,
                width: Math.min(moreMenuRect.width, 320),
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div>
                <div className="w-full flex items-center justify-between text-sm font-bold text-gray-700 mb-2">
                  <span>Mais</span>
                  <button
                    onClick={() => setOpenMoreMenu(false)}
                    className="text-xs text-gray-400"
                    aria-label="Fechar Mais"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-col gap-2 pr-2">
                  <button
                    onClick={() => {
                      const next = !showOnlyBestsellers;
                      setShowOnlyBestsellers && setShowOnlyBestsellers(next);
                      try {
                        const params = new URLSearchParams(
                          window.location.search
                        );
                        if (next) params.set('bs', '1');
                        else params.delete('bs');
                        const url = params.toString()
                          ? `${window.location.pathname}?${params.toString()}`
                          : window.location.pathname;
                        router.replace(url);
                      } catch (e) {
                        // ignore
                      }
                      setOpenMoreMenu(false);
                    }}
                    className="text-sm text-left px-2 py-1 rounded hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Star size={14} /> Best Sellers
                  </button>

                  <button
                    onClick={() => {
                      const next = !showOnlyNew;
                      setShowOnlyNew && setShowOnlyNew(next);
                      try {
                        const params = new URLSearchParams(
                          window.location.search
                        );
                        if (next) params.set('new', '1');
                        else params.delete('new');
                        const url = params.toString()
                          ? `${window.location.pathname}?${params.toString()}`
                          : window.location.pathname;
                        router.replace(url);
                      } catch (e) {
                        // ignore
                      }
                      setOpenMoreMenu(false);
                    }}
                    className="text-sm text-left px-2 py-1 rounded hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Zap size={14} /> Lançamentos
                  </button>
                </div>
              </div>
            </div>
          )}
          <OutsideCloseEffect
            openType={openTypeMenu}
            openGender={openGenderMenu}
            openMore={openMoreMenu}
            openMaterial={openMaterialMenu}
            onCloseAll={() => {
              setOpenTypeMenu(false);
              setOpenGenderMenu(false);
              setOpenMoreMenu(false);
              setOpenMaterialMenu(false);
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface CarouselProps {
  slides: SlideData[];
  interval?: number;
  bannerMetaOverride?: any;
}

// --- Componente Carrossel ---
function Carousel({
  slides,
  interval = 5000,
  bannerMetaOverride = null,
}: CarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [bannerMeta, setBannerMeta] = useState<any>(null);
  const [isSmallViewport, setIsSmallViewport] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, interval);
    return () => clearInterval(timer);
  }, [nextSlide, interval, isPaused]);

  // Load store-level banner meta from localStorage (if present) so editor preview
  // choices like 'fit' are respected in the public carousel during client render.
  useEffect(() => {
    if (bannerMetaOverride) {
      setBannerMeta(bannerMetaOverride);
      return;
    }
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('store_banner_meta');
        if (raw) setBannerMeta(JSON.parse(raw));
      }
    } catch (e) {
      // ignore
    }
  }, [bannerMetaOverride]);

  useEffect(() => {
    const onResize = () =>
      setIsSmallViewport(
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
      );
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (slides.length === 0) return null;

  return (
    <div
      className="relative w-full h-full overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="flex w-full h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="min-w-full w-full h-full relative flex-shrink-0"
          >
            {(() => {
              const useFit =
                bannerMeta && bannerMeta.mode === 'fit' && isSmallViewport;
              if (useFit) {
                return (
                  // Use plain img for fit-on-mobile so image determines height
                  <img
                    src={slide.imageUrl}
                    alt={slide.altText}
                    className="w-full h-auto object-contain relative"
                    loading={slide.id === 0 ? 'eager' : 'lazy'}
                    style={
                      bannerMeta && bannerMeta.focusX
                        ? {
                            objectPosition: `${bannerMeta.focusX}% ${bannerMeta.focusY ?? 50}%`,
                            transform: `scale(${(bannerMeta.zoom ?? 100) / 100})`,
                          }
                        : undefined
                    }
                  />
                );
              }

              return typeof slide.imageUrl === 'string' &&
                slide.imageUrl.startsWith('http') &&
                !(
                  typeof slide.imageUrl === 'string' &&
                  slide.imageUrl.includes('supabase.co/storage')
                ) ? (
                <img
                  src={slide.imageUrl}
                  alt={slide.altText}
                  className={`absolute inset-0 w-full h-full ${bannerMeta?.mode === 'fit' ? 'object-contain' : 'object-cover'}`}
                  loading={slide.id === 0 ? 'eager' : 'lazy'}
                  style={
                    bannerMeta && bannerMeta.mode !== 'fit' && bannerMeta.focusX
                      ? {
                          objectPosition: `${bannerMeta.focusX}% ${bannerMeta.focusY ?? 50}%`,
                          transform: `scale(${(bannerMeta.zoom ?? 100) / 100})`,
                        }
                      : undefined
                  }
                />
              ) : (
                <Image
                  src={slide.imageUrl}
                  alt={slide.altText}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1920px) 90vw, 1920px"
                  className={
                    bannerMeta?.mode === 'fit'
                      ? 'object-contain'
                      : 'object-cover'
                  }
                  priority={slide.id === 0}
                  unoptimized={
                    typeof slide.imageUrl === 'string' &&
                    slide.imageUrl.includes('supabase.co/storage')
                  }
                  style={
                    bannerMeta && bannerMeta.mode !== 'fit' && bannerMeta.focusX
                      ? {
                          objectPosition: `${bannerMeta.focusX}% ${bannerMeta.focusY ?? 50}%`,
                          transform: `scale(${(bannerMeta.zoom ?? 100) / 100})`,
                        }
                      : undefined
                  }
                />
              );
            })()}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none opacity-50" />
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 hover:bg-black/50 backdrop-blur-sm text-white z-20 opacity-0 group-hover:opacity-100 transition-all border border-white/30"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 hover:bg-black/50 backdrop-blur-sm text-white z-20 opacity-0 group-hover:opacity-100 transition-all border border-white/30"
          >
            <ChevronRight size={24} />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all shadow-sm ${idx === currentSlide ? 'bg-white w-8' : 'bg-white/50 w-2 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Container de Banners ---
export function StoreBanners() {
  const { store, selectedBrand } = useStore();
  const [isMobile, setIsMobile] = useState(false);
  const [storeBannerMeta, setStoreBannerMeta] = useState<any>(
    (store as any)?.store_banner_meta || null
  );
  const { brandsWithLogos } = useStore();

  // Detectar mobile no client-side
  useEffect(() => {
    let tid: number | null = null;
    const checkMobile = () => {
      if (tid) window.clearTimeout(tid);
      tid = window.setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
        tid = null;
      }, 120);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      if (tid) window.clearTimeout(tid);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    setStoreBannerMeta((store as any)?.store_banner_meta || null);
  }, [store]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('store_banner_meta');
        if (raw) setStoreBannerMeta(JSON.parse(raw));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Verifica se existem banners (comuns ou mobile)
  const hasBanners = store.banners && store.banners.length > 0;
  const hasMobileBanners =
    store.banners_mobile && store.banners_mobile.length > 0;

  // Se não houver nenhum banner, não renderiza
  if (!hasBanners && !hasMobileBanners) return null;
  // If a brand is selected, show the brand-specific banner/description instead
  const hasBrandSelection = Array.isArray(selectedBrand)
    ? selectedBrand.length > 0
    : selectedBrand && selectedBrand !== 'all';
  if (hasBrandSelection) {
    const normalize = (s: unknown) =>
      String(s || '')
        .trim()
        .toLowerCase();
    const findName =
      Array.isArray(selectedBrand) && selectedBrand.length > 0
        ? (selectedBrand[0] as string)
        : (selectedBrand as string);
    const brandObj = (brandsWithLogos || []).find(
      (b: any) => normalize(b.name) === normalize(findName)
    );
    // If we don't have a brand object, fall back to the main store banners
    // (do not hide the carousel). If we have a brand object, render its
    // banner or a compact header as fallback.
    if (!brandObj) {
      // No metadata for this brand in `brandsWithLogos` — let the function
      // continue and render the normal store banners below.
    } else {
      const bannerUrl = brandObj.banner_url;

      if (bannerUrl) {
        // Garante que pegamos a string da URL, mesmo que venha como objeto
        const resolvedBannerUrl =
          typeof bannerUrl === 'object'
            ? bannerUrl.variants?.desktop?.url ||
              bannerUrl.original ||
              bannerUrl.url ||
              null
            : bannerUrl;
        // Try to load saved banner meta from localStorage (client-only, synchronous)
        let bannerMeta: {
          mode?: string;
          focusX?: number;
          focusY?: number;
          zoom?: number;
        } | null = null;
        try {
          if (typeof window !== 'undefined') {
            const raw = window.localStorage.getItem(
              `brand_banner_meta:${brandObj.id}`
            );
            if (raw) bannerMeta = JSON.parse(raw);
          }
        } catch {
          // ignore
        }

        const imgStyle: React.CSSProperties = bannerMeta
          ? bannerMeta.mode === 'fit'
            ? { objectFit: 'contain', objectPosition: '50% 50%' }
            : bannerMeta.mode === 'stretch'
              ? { objectFit: 'fill', objectPosition: '50% 50%' }
              : {
                  objectPosition: `${bannerMeta.focusX ?? 50}% ${bannerMeta.focusY ?? 50}%`,
                  transform: `scale(${(bannerMeta.zoom ?? 100) / 100})`,
                }
          : {};

        const containerClass =
          bannerMeta && bannerMeta.mode === 'fit' && isMobile
            ? 'w-full relative overflow-hidden bg-gray-100 rounded-md'
            : 'w-full aspect-[4/1] min-h-[160px] md:min-h-[200px] relative overflow-hidden bg-gray-100 rounded-md';

        const imgClass =
          bannerMeta && bannerMeta.mode === 'fit'
            ? 'object-contain relative inset-0 w-full h-auto'
            : 'object-cover absolute inset-0 w-full h-full';

        return (
          <div className="w-full">
            <SmartImage
              product={{ image_url: resolvedBannerUrl, name: brandObj.name }}
              className={containerClass}
              imgClassName={imgClass}
              imgStyle={imgStyle}
              variant="hero"
              priority={true}
            />
            {brandObj.description ? (
              <div className="absolute left-6 bottom-6 bg-black/60 text-white px-4 py-2 rounded-md max-w-xl">
                <h3 className="font-bold text-sm">{brandObj.name}</h3>
                <p className="text-xs mt-1 line-clamp-2">
                  {brandObj.description}
                </p>
              </div>
            ) : null}
          </div>
        );
      }

      // No banner image: render compact brand header with logo/initials and
      // optional description. This will appear above the products but will not
      // hide the main carousel area elsewhere.
      return (
        <div className="w-full">
          <div className="w-full px-4 lg:px-8 py-4 flex items-center gap-4 bg-white rounded-md shadow-sm">
            <div className="flex-shrink-0">
              {brandObj.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brandObj.logo_url}
                  alt={brandObj.name}
                  className="w-40 h-20 object-contain"
                />
              ) : (
                <div className="w-40 h-20 bg-gray-100 flex items-center justify-center font-bold text-lg text-gray-700">
                  {brandObj.name
                    ?.split(' ')
                    .map((s: string) => s[0])
                    .slice(0, 2)
                    .join('')}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{brandObj.name}</h3>
              {brandObj.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {brandObj.description}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  // 📱 Lógica de seleção de banners (com fallback mais permissivo):
  // - Mobile: prefere `banners_mobile`, senão usa `banners` (fallback)
  // - Desktop: prefere `banners`, mas se estiver vazio tenta `banners_mobile` antes de não renderizar
  const activeBanners = (() => {
    const desktopBanners =
      Array.isArray(store.banners) && store.banners.length > 0
        ? store.banners
        : null;
    const mobileBanners =
      Array.isArray(store.banners_mobile) && store.banners_mobile.length > 0
        ? store.banners_mobile
        : null;

    if (isMobile) return mobileBanners ?? desktopBanners ?? [];
    return desktopBanners ?? mobileBanners ?? [];
  })();

  // Mapeia apenas os banners que foram feitos upload (1, 2, 3... N banners)
  // Não é obrigatório ter 5 banners - renderiza quantos existirem
  const slides: SlideData[] = (activeBanners || []).map(
    (url: string, index: number) => ({
      id: index,
      imageUrl: url, // URL já normalizada pelo store-context
      linkUrl: '#',
      altText: `Banner Promocional ${index + 1}`,
    })
  );

  // Se não houver slides após o mapeamento, não renderiza
  if (slides.length === 0) return null;

  return (
    <div className="w-full">
      {storeBannerMeta && storeBannerMeta.mode === 'fit' && isMobile ? (
        <div className="w-full relative overflow-hidden bg-gray-100">
          <Carousel
            slides={slides}
            interval={5000}
            bannerMetaOverride={storeBannerMeta}
          />
        </div>
      ) : (
        <div className="w-full aspect-[3/1] md:aspect-[4/1] lg:aspect-[5/1] min-h-[180px] md:min-h-[220px] relative overflow-hidden bg-gray-100">
          <Carousel
            slides={slides}
            interval={5000}
            bannerMetaOverride={storeBannerMeta}
          />
        </div>
      )}
    </div>
  );
}

// --- Grade de Produtos ---
export function ProductGrid() {
  const {
    displayProducts,
    totalProducts,
    currentPage,
    totalPages,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    toggleFavorite,
    favorites,
    addToCart,
    setModal,
    isFilterOpen,
    setIsFilterOpen,
    selectedBrand,
    setSelectedBrand,
    selectedCategory,
    setSelectedCategory,
    selectedGender,
    setSelectedGender,
    searchTerm,
    setSearchTerm,
    showOnlyNew,
    setShowOnlyNew,
    showOnlyBestsellers,
    setShowOnlyBestsellers,
    showFavorites,
    setShowFavorites,
    selectedMaterial,
    setSelectedMaterial,
    filterPolarizado,
    setFilterPolarizado,
    filterFotocromatico,
    setFilterFotocromatico,
    sortOrder,
    setSortOrder,
    store,
    viewMode,
    setViewMode,
    hideImages,
    setHideImages,
    imagePriorityCount,
    imageSizes,
    isPricesVisible,
    isLoadingSearch,
  } = useStore();

  const toggleSidebar = useLayoutStore((s: any) => s.toggleSidebar);

  const router = useRouter();

  // Detect if the currently selectedCategory is actually a 'type' (class_core)
  const isSelectedCategoryType = React.useMemo(() => {
    try {
      if (typeof selectedCategory !== 'string' || selectedCategory === 'all')
        return false;
      const selectedNorm = normalizeForTypeModule(selectedCategory);
      return (displayProducts || []).some((p: any) => {
        const productTypeNorm = normalizeForTypeModule(
          (p as any).class_core || ''
        );
        return productTypeNorm === selectedNorm && productTypeNorm !== '';
      });
    } catch (e) {
      return false;
    }
  }, [displayProducts, selectedCategory]);

  // Tipagem corrigida de 'any' para 'Product'
  const isOutOfStock = (product: Product) => {
    if (!store.enable_stock_management) return false;
    if (store.global_allow_backorder) return false;
    return (product.stock_quantity || 0) <= 0;
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Barra de Controle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <p className="text-sm text-gray-600">
            Mostrando <strong>{displayProducts.length}</strong> de{' '}
            <strong>{totalProducts}</strong> produtos
          </p>
          {/* ADICIONADO: seletor rápido de itens por página */}
          <div className="hidden sm:block ml-4">
            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
              Mostrar:
              {[24, 48, 72].map((num) => (
                <button
                  key={num}
                  onClick={() => setItemsPerPage(num)}
                  className={`ml-2 hover:text-primary transition-colors ${itemsPerPage === num ? 'text-primary' : ''}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleSidebar}
            className="hidden ml-4"
            leftIcon={<SlidersHorizontal size={16} />}
          >
            <span className="max-[380px]:hidden">Filtros</span>
          </Button>
        </div>

        {/* Filtros Ativos */}
        <div className="mt-2 sm:mt-0 sm:ml-4 flex items-center gap-2 flex-wrap">
          {selectedMaterial && selectedMaterial !== 'all' && (
            <button
              onClick={() => setSelectedMaterial('all')}
              className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700 flex items-center gap-2"
            >
              <span className="font-bold">Material:</span> {selectedMaterial}
              <span className="ml-2 text-xs text-gray-400">✕</span>
            </button>
          )}

          {typeof selectedCategory === 'string' &&
            selectedCategory !== 'all' &&
            (() => {
              try {
                if (isSelectedCategoryType) {
                  return (
                    <button
                      onClick={() =>
                        setSelectedCategory && setSelectedCategory('all')
                      }
                      className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700 flex items-center gap-2"
                    >
                      <span className="font-bold">Tipo:</span>{' '}
                      {selectedCategory}
                      <span className="ml-2 text-xs text-gray-400">✕</span>
                    </button>
                  );
                }
              } catch (e) {
                // if anything fails, fall back to showing as category
              }
              return (
                <button
                  onClick={() =>
                    setSelectedCategory && setSelectedCategory('all')
                  }
                  className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700 flex items-center gap-2"
                >
                  <span className="font-bold">Categoria:</span>{' '}
                  {selectedCategory}
                  <span className="ml-2 text-xs text-gray-400">✕</span>
                </button>
              );
            })()}

          {typeof selectedGender === 'string' && selectedGender !== 'all' && (
            <button
              onClick={() => setSelectedGender && setSelectedGender('all')}
              className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700 flex items-center gap-2"
            >
              <span className="font-bold">Gênero:</span> {selectedGender}
              <span className="ml-2 text-xs text-gray-400">✕</span>
            </button>
          )}

          {searchTerm && searchTerm.trim().length > 0 && (
            <button
              onClick={() => setSearchTerm && setSearchTerm('')}
              className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700 flex items-center gap-2"
            >
              Busca: {searchTerm}
              <span className="ml-2 text-xs text-gray-400">✕</span>
            </button>
          )}

          {showOnlyNew && (
            <button
              onClick={() => setShowOnlyNew && setShowOnlyNew(false)}
              className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700 flex items-center gap-2"
            >
              Lançamentos <span className="ml-2 text-xs text-gray-400">✕</span>
            </button>
          )}

          {showOnlyBestsellers && (
            <button
              onClick={() =>
                setShowOnlyBestsellers && setShowOnlyBestsellers(false)
              }
              className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700 flex items-center gap-2"
            >
              Mais vendidos{' '}
              <span className="ml-2 text-xs text-gray-400">✕</span>
            </button>
          )}

          {showFavorites && (
            <button
              onClick={() => setShowFavorites && setShowFavorites(false)}
              className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700 flex items-center gap-2"
            >
              Favoritos <span className="ml-2 text-xs text-gray-400">✕</span>
            </button>
          )}

          {filterPolarizado && (
            <button
              onClick={() => setFilterPolarizado(false)}
              className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700 flex items-center gap-2"
            >
              Polarizado <span className="ml-2 text-xs text-gray-400">✕</span>
            </button>
          )}
          {Array.isArray(selectedBrand) &&
            selectedBrand.length > 0 &&
            selectedBrand[0] !== 'all' &&
            selectedBrand.map((b) => (
              <button
                key={`brand-${b}`}
                onClick={() => {
                  const next = Array.isArray(selectedBrand)
                    ? selectedBrand.filter((s) => s !== b)
                    : [];
                  setSelectedBrand &&
                    setSelectedBrand(next.length === 0 ? 'all' : next);
                }}
                className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700 flex items-center gap-2"
              >
                {b} <span className="ml-2 text-xs text-gray-400">✕</span>
              </button>
            ))}
          {typeof selectedBrand === 'string' && selectedBrand !== 'all' && (
            <button
              onClick={() => setSelectedBrand && setSelectedBrand('all')}
              className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700 flex items-center gap-2"
            >
              {selectedBrand}{' '}
              <span className="ml-2 text-xs text-gray-400">✕</span>
            </button>
          )}

          {filterFotocromatico && (
            <button
              onClick={() => setFilterFotocromatico(false)}
              className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700 flex items-center gap-2"
            >
              Fotocromático{' '}
              <span className="ml-2 text-xs text-gray-400">✕</span>
            </button>
          )}
          {/* Botão Limpar filtros na área de resumo */}
          {((selectedCategory && selectedCategory !== 'all') ||
            (selectedGender && selectedGender !== 'all') ||
            (selectedMaterial && selectedMaterial !== 'all') ||
            !!filterPolarizado ||
            !!filterFotocromatico ||
            !!showOnlyNew ||
            !!showOnlyBestsellers ||
            !!showFavorites ||
            (!!searchTerm && String(searchTerm).trim() !== '') ||
            (Array.isArray(selectedBrand) &&
              selectedBrand.length > 0 &&
              selectedBrand[0] !== 'all') ||
            (typeof selectedBrand === 'string' && selectedBrand !== 'all')) && (
            <button
              onClick={() => {
                try {
                  setSelectedCategory && setSelectedCategory('all');
                  setSelectedGender && setSelectedGender('all');
                  setSelectedMaterial && setSelectedMaterial('all');
                  setFilterPolarizado && setFilterPolarizado(false);
                  setFilterFotocromatico && setFilterFotocromatico(false);
                  setShowOnlyNew && setShowOnlyNew(false);
                  setShowOnlyBestsellers && setShowOnlyBestsellers(false);
                  setShowFavorites && setShowFavorites(false);
                  setSearchTerm && setSearchTerm('');
                  setSelectedBrand && setSelectedBrand('all');

                  const params = new URLSearchParams(window.location.search);
                  params.delete('bs');
                  params.delete('new');
                  params.delete('polarizado');
                  params.delete('fotocromatico');
                  params.delete('category');
                  params.delete('type');
                  const url = params.toString()
                    ? `${window.location.pathname}?${params.toString()}`
                    : window.location.pathname;
                  router.replace(url);
                } catch (e) {
                  // ignore
                }
              }}
              className="px-3 py-1 rounded-full bg-white border border-gray-200 text-sm text-gray-700 flex items-center gap-2"
            >
              Limpar filtros ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <div className="flex gap-1 sm:gap-1 border-r border-gray-200 pr-2 sm:pr-4">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-[var(--primary)]' : 'text-gray-400 hover:text-gray-600'}`}
              title="Grade"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gray-100 text-[var(--primary)]' : 'text-gray-400 hover:text-gray-600'}`}
              title="Lista"
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-gray-100 text-[var(--primary)]' : 'text-gray-400 hover:text-gray-600'}`}
              title="Tabela Compacta"
            >
              <SlidersHorizontal size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2 pl-2 sm:pl-3">
            <button
              onClick={() => setHideImages(!hideImages)}
              className={`p-2 rounded-lg transition-all ${hideImages ? 'bg-amber-100 text-[var(--primary)]' : 'text-gray-400 hover:text-gray-600'}`}
              title={hideImages ? 'Mostrar Fotos' : 'Ocultar Fotos'}
            >
              {hideImages ? <ImageOff size={18} /> : <ImageIcon size={18} />}
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-sm text-gray-500 hidden xl:inline">
              Ordenar:
            </span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="p-2 border-none bg-transparent text-sm font-medium text-gray-900 outline-none cursor-pointer hover:bg-gray-50 rounded-lg"
            >
              <option value="name">Nome (A-Z)</option>
              <option value="price_asc">Menor Preço</option>
              <option value="price_desc">Maior Preço</option>
              <option value="ref_asc">Referência (A-Z)</option>
              <option value="ref_desc">Referência (Z-A)</option>
              <option value="created_desc">Lançamentos</option>
            </select>
          </div>
        </div>
      </div>

      {displayProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="p-4 bg-gray-50 rounded-full mb-4">
            <Search size={40} className="text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Nenhum produto encontrado
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            Tente ajustar seus filtros de busca.
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            (() => {
              const parse = (v: any, fallback: number) => {
                if (v == null) return fallback;
                const n = Number(v);
                if (Number.isNaN(n) || n < 1) return fallback;
                return Math.max(1, Math.min(6, Math.floor(n)));
              };

              // Apenas `grid_cols_default` (mobile/base) e `grid_cols_md` (desktop)
              // são editáveis nas configurações. Os outros breakpoints usam
              // valores padrão fixos para consistência.
              const cDefault = parse((store as any).grid_cols_default, 2);
              const cMd = parse((store as any).grid_cols_md, 4);

              // Padrões fixos solicitados: sm=3, lg=4, xl=4 (notebooks menores)
              const cSm = 3;
              const cLg = 4;
              const cXl = 4;

              // Use explicit class mappings to ensure Tailwind includes all
              // possible `grid-cols-*` variants in the generated CSS. Avoid
              // computed template strings that Tailwind can't detect.
              const COLS = [
                'grid-cols-0',
                'grid-cols-1',
                'grid-cols-2',
                'grid-cols-3',
                'grid-cols-4',
                'grid-cols-5',
                'grid-cols-6',
              ];
              const SM = [
                'sm:grid-cols-0',
                'sm:grid-cols-1',
                'sm:grid-cols-2',
                'sm:grid-cols-3',
                'sm:grid-cols-4',
                'sm:grid-cols-5',
                'sm:grid-cols-6',
              ];
              const MD = [
                'md:grid-cols-0',
                'md:grid-cols-1',
                'md:grid-cols-2',
                'md:grid-cols-3',
                'md:grid-cols-4',
                'md:grid-cols-5',
                'md:grid-cols-6',
              ];
              const LG = [
                'lg:grid-cols-0',
                'lg:grid-cols-1',
                'lg:grid-cols-2',
                'lg:grid-cols-3',
                'lg:grid-cols-4',
                'lg:grid-cols-5',
                'lg:grid-cols-6',
              ];
              const XL = [
                'xl:grid-cols-0',
                'xl:grid-cols-1',
                'xl:grid-cols-2',
                'xl:grid-cols-3',
                'xl:grid-cols-4',
                'xl:grid-cols-5',
                'xl:grid-cols-6',
              ];

              const safeIndex = (n: number) =>
                Math.max(0, Math.min(6, Math.floor(Number(n) || 0)));
              const gridClass = [
                COLS[safeIndex(cDefault)],
                SM[safeIndex(cSm)],
                MD[safeIndex(cMd)],
                LG[safeIndex(cLg)],
                XL[safeIndex(cXl)],
              ].join(' ');

              return (
                <div className={`grid ${gridClass} gap-4 sm:gap-6`}>
                  {isLoadingSearch
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <ProductCardSkeleton key={`skeleton-${i}`} />
                      ))
                    : displayProducts.map((product: any) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          storeSettings={store}
                          isFavorite={favorites.includes(product.id)}
                          isPricesVisible={isPricesVisible}
                          onAddToCart={(p) => addToCart(p)}
                          onToggleFavorite={(id) => toggleFavorite(id)}
                          onViewDetails={(p) => setModal('product', p)}
                        />
                      ))}
                </div>
              );
            })()
          ) : viewMode === 'table' ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full min-w-[640px] text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <th className="px-2 sm:px-4 py-3 min-w-[80px]">
                      Referência
                    </th>
                    <th className="px-2 sm:px-4 py-3 min-w-[180px]">
                      Produto / Marca
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-right min-w-[100px]">
                      Preço
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-center min-w-[100px]">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayProducts.map((product: any) => {
                    const outOfStock = isOutOfStock(product);
                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                      >
                        <td className="px-2 sm:px-4 py-2 align-middle font-mono text-xs text-gray-400">
                          {product.reference_code || '-'}
                        </td>
                        <td className="px-2 sm:px-4 py-2 align-middle">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 group-hover:text-[var(--primary)]">
                              {product.name}
                            </span>
                            <span className="text-[10px] uppercase font-medium text-gray-400">
                              {product.brand}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 align-middle text-right">
                          <PriceDisplay
                            value={product.price}
                            isPricesVisible={isPricesVisible}
                            size="small"
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-2 align-middle text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!outOfStock) addToCart(product);
                              }}
                              title="Adicionar"
                              className="p-2 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white rounded-lg transition-all"
                            >
                              <ShoppingCart size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setModal('product', product);
                              }}
                              title="Ver detalhes"
                              className="p-2 text-gray-400 hover:text-gray-600"
                            >
                              <Search size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            // --- MODO LISTA (Responsivo Mobile) ---
            <div className="flex flex-col gap-3 sm:gap-4">
              {displayProducts.map((product: any) => {
                const outOfStock = isOutOfStock(product);
                return (
                  <div
                    key={product.id}
                    onClick={() => setModal('product', product)}
                    className={`bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row overflow-hidden group cursor-pointer relative ${outOfStock ? 'opacity-80' : ''}`}
                  >
                    {/* Imagem - Horizontal no mobile, Lateral no desktop */}
                    <div className="w-full sm:w-32 md:w-48 aspect-[3/2] sm:aspect-square md:aspect-auto flex-shrink-0 bg-gray-50 relative sm:border-r border-gray-100">
                      {outOfStock && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
                          <span className="bg-gray-800 text-white px-2 py-1 rounded text-[10px] font-bold shadow flex gap-1 items-center">
                            <Archive size={12} /> ESGOTADO
                          </span>
                        </div>
                      )}
                      {hideImages ? (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 p-4">
                          <div className="text-sm font-bold">
                            {(product.reference_code || '').slice(0, 12) ||
                              product.name?.slice(0, 12)}
                          </div>
                        </div>
                      ) : (
                        (() => {
                          const { src, isExternal } = getProductImageUrl(
                            product as any
                          );
                          if (src) {
                            if (isExternal) {
                              return (
                                <div className="w-full h-full">
                                  <LazyProductImage
                                    src={src}
                                    alt={product.name}
                                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                                    fallbackSrc="/images/default-logo.png"
                                  />
                                </div>
                              );
                            }

                            return (
                              <Image
                                src={src}
                                alt={product.name}
                                fill
                                sizes="192px"
                                className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                              />
                            );
                          }

                          return (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <img
                                src="/api/proxy-image?url=https%3A%2F%2Faawghxjbipcqefmikwby.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fimages%2Fplaceholder.png&fmt=webp&q=70"
                                alt="Sem imagem"
                                className="w-16 h-16 object-contain opacity-80"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    '/images/default-logo.png';
                                }}
                              />
                            </div>
                          );
                        })()
                      )}

                      {product.is_launch && (
                        <span className="absolute top-2 left-2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                          Lançamento
                        </span>
                      )}
                    </div>

                    <div className="flex-1 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                            {product.brand || 'Genérico'}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(product.id);
                            }}
                            className="text-gray-300 hover:text-red-500 sm:hidden p-1"
                          >
                            <Heart
                              size={18}
                              className={
                                favorites.includes(product.id)
                                  ? 'fill-red-500 text-red-500'
                                  : ''
                              }
                            />
                          </button>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 group-hover:text-[var(--primary)] transition-colors truncate">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-sm text-gray-500 line-clamp-2 mb-3 max-w-xl hidden sm:block">
                            {product.description}
                          </p>
                        )}
                        {product.reference_code && (
                          <p className="text-xs text-gray-400 font-mono">
                            Ref: {product.reference_code}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 sm:min-w-[160px] border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0 mt-auto sm:mt-0">
                        <div className="text-right">
                          <PriceDisplay
                            value={product.price}
                            size="large"
                            isPricesVisible={isPricesVisible}
                          />
                        </div>
                        <Button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (!outOfStock) addToCart(product);
                          }}
                          disabled={outOfStock}
                          variant="primary"
                          className="w-full sm:w-auto shadow-md"
                          leftIcon={<ShoppingCart size={16} />}
                        >
                          {outOfStock ? 'Indisponível' : 'Adicionar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ✅ PAGINAÇÃO PREMIUM */}
          <PaginationControls
            totalProducts={totalProducts}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            loading={isLoadingSearch}
            onPageChange={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onItemsPerPageChange={(items) => setItemsPerPage(items)}
          />
        </>
      )}
    </div>
  );
}
