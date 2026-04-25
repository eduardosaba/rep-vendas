"use client";

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Settings as SettingsIcon, Palette, Building2, Images, Package, Globe, Plus, Trash2, Pencil } from 'lucide-react';
import PageBuilder from '@/components/dashboard/company/PageBuilder';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { TabGeneral } from '@/app/dashboard/settings/components/TabGeneral';
import { TabAppearance } from '@/app/dashboard/settings/components/TabAppearance';
import { TabInstitucional } from '@/app/dashboard/settings/components/TabInstitucional';
import { TabDisplay } from '@/app/dashboard/settings/components/TabDisplay';
import { TabGaleria } from '@/app/dashboard/settings/components/TabGaleria';
import { TabStock } from '@/app/dashboard/settings/components/TabStock';

type Props = {
  context?: 'company' | 'representative';
  targetId?: string | null;
  ownerSettingsUserId?: string | null;
};

export default function SystemSettingsForm({ context = 'representative', targetId = null, ownerSettingsUserId = null }: Props) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'institucional' | 'gallery' | 'display' | 'stock' | 'pages' | 'sync'>('general');
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userCanManageCatalog, setUserCanManageCatalog] = useState<boolean>(false);

  // placeholder catalog settings used by tabs that expect catalog-related props
  const defaultCatalogSettings = {
    show_top_benefit_bar: false,
    top_benefit_text: '',
    top_benefit_mode: 'static',
    top_benefit_animation: 'scroll_left',
    top_benefit_speed: 'medium',
    top_benefit_text_color: '#111827',
    top_benefit_bg_color: '#F3F4F6',
    top_benefit_image_url: '',
    top_benefit_image_fit: 'cover',
    top_benefit_image_scale: 100,
    top_benefit_image_align: 'center',
    top_benefit_text_align: 'center',
    top_benefit_height: 36,
    top_benefit_text_size: 14,
    show_installments: false,
    max_installments: null,
    show_sale_price: false,
    show_cost_price: false,
    price_unlock_mode: 'none',
    banners: [] as string[],
    banners_mobile: [] as string[],
    gallery_urls: [] as string[],
    enable_stock_management: false,
    global_allow_backorder: false,
    manage_stock: false,
  } as const;

  const [catalogSettings, setCatalogSettings] = useState<any>({ ...defaultCatalogSettings });

  const [pagesLoading, setPagesLoading] = useState(false);
  const [companyPages, setCompanyPages] = useState<Array<any>>([]);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<{ id?: string; title: string; slug: string; content: unknown; is_active: boolean }>({ title: '', slug: '', content: '{}', is_active: true });
  const [newPageDraft, setNewPageDraft] = useState<{ title: string; slug: string; content: unknown; is_active: boolean }>({ title: '', slug: '', content: '{}', is_active: true });

  const handleCatalogSettingsChange = (e: any) => {
    if (e?.target) {
      const { name, value, checked, type } = e.target;
      setCatalogSettings((p: any) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  // Display preview states for TabDisplay
  const [topBenefitImagePreview, setTopBenefitImagePreview] = useState<string | null>(null);
  const [topBenefitHeight, setTopBenefitHeight] = useState<number>(36);
  const [topBenefitTextSize, setTopBenefitTextSize] = useState<number>(14);
  const [topBenefitBgColor, setTopBenefitBgColor] = useState<string>('#F3F4F6');
  const [topBenefitTextColor, setTopBenefitTextColor] = useState<string>('#111827');
  const [topBenefitImageFit, setTopBenefitImageFit] = useState<string>('cover');
  const [topBenefitImageScale, setTopBenefitImageScale] = useState<number>(100);
  const [topBenefitTextAlign, setTopBenefitTextAlign] = useState<string>('center');
  const [topBenefitImageAlign, setTopBenefitImageAlign] = useState<string>('center');

  const initialForm: any = {
    name: '',
    phone: '',
    email: '',
    catalog_slug: '',
    price_password: '',
    footer_message: '',
    headline: '',
    primary_color: '',
    font_family: '',
    gallery_urls: [],
  };

  const [formData, setFormData] = useState<any>(initialForm);
  const [originalData, setOriginalData] = useState<any>(initialForm);
  const slugRef = useRef<HTMLInputElement | null>(null);

  // Presets de tema exibidos na aba Aparência (fallback local)
  const THEME_PRESETS = [
    { name: 'RepVendas', primary: '#b9722e', secondary: '#0d1b2c', header: '#ffffff' },
    { name: 'Blue', primary: '#2563eb', secondary: '#111827', header: '#ffffff' },
    { name: 'Varejo Hot (Ofertas)', primary: '#F59E0B', secondary: '#DC2626', header: '#ffffff' },
    { name: 'Natureza & Saúde', primary: '#6EE7B7', secondary: '#15803D', header: '#ffffff' },
    { name: 'Luxo & Gold', primary: '#D4AF37', secondary: '#111827', header: '#ffffff' },
    { name: 'Moda & Boutique', primary: '#FBCFE8', secondary: '#BE185D', header: '#ffffff' },
  ];

  const [selectedThemeName, setSelectedThemeName] = useState<string | null>(null);

  const applyTheme = (theme: any) => {
    if (!theme) return;
    setSelectedThemeName(theme.name || null);
    setFormData((p: any) => ({ ...p, primary_color: theme.primary || p.primary_color, secondary_color: theme.secondary || p.secondary_color }));
    setCatalogSettings((p: any) => ({ ...(p||{}), primary_color: theme.primary, secondary_color: theme.secondary }));
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        // Load settings from DB for the target user (company admin)
        const authRes = await supabase.auth.getUser();
        const currentUser = authRes?.data?.user;
        const targetUserId = targetId || currentUser?.id;
        // detect if current user is company admin (so reps who are admins see extra tabs)
        try {
          if (currentUser) {
            const profileRes = await supabase.from('profiles').select('role,company_id').eq('id', currentUser.id).maybeSingle();
            const profile = profileRes?.data as any | null;
            if (profile) {
                const role = profile.role || '';
                setUserRole(role || null);
                setUserCanManageCatalog(Boolean(profile.can_manage_catalog));
              const isCompanyAdminRole = role === 'admin_company' || role === 'master';
              const hasCompanyLink = Boolean(profile.company_id);
              // Treat master users as company admins even when they don't have a company link
              setIsCompanyAdmin(Boolean(isCompanyAdminRole) && (hasCompanyLink || role === 'master'));
            }
          }
        } catch (e) {
          // ignore profile fetch failures for admin detection
        }
        if (!targetUserId) return;

        // Attempt unified load from companies (joins settings and public_catalogs)
        // Prefer company-based config when available to keep public/catalog admin in sync
        let companyId: string | null = null;
        try {
          const profileRes = await supabase.from('profiles').select('company_id').eq('id', targetUserId).maybeSingle();
          companyId = (profileRes?.data as any)?.company_id ?? null;
        } catch (e) {
          companyId = null;
        }

        if (companyId) {
          // Load company without relational expand (some DBs may lack FK relations for PostgREST)
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .maybeSingle();

          if (!mounted) return;

          if (!companyError && companyData) {
            const companyPlain: any = { ...companyData };

            // fetch settings separately (by user_id)
            let settingsRow: any = null;
            try {
              const userIdForSettings = companyPlain.user_id || null;
              if (userIdForSettings) {
                const { data: s } = await supabase.from('settings').select('*').eq('user_id', userIdForSettings).maybeSingle();
                settingsRow = s || null;
              }
            } catch (e) {
              settingsRow = null;
            }

            // fetch public_catalogs separately (by user_id)
            let publicCatalogRow: any = null;
            try {
              const userIdForCatalog = companyPlain.user_id || null;
              if (userIdForCatalog) {
                const { data: pc } = await supabase.from('public_catalogs').select('*').eq('user_id', userIdForCatalog).maybeSingle();
                publicCatalogRow = pc || null;
              }
            } catch (e) {
              publicCatalogRow = null;
            }

            // fill formData from company (branding/identity)
            const companyFields = { ...(companyPlain as any) };
            setFormData((p: any) => ({ ...p, ...companyFields }));
            setOriginalData((od: any) => ({ ...(od || {}), ...companyFields }));

            // if settings exist, populate catalogSettings and preview states
            if (settingsRow) {
              const settingsData = settingsRow;
              const normalized: any = {};
              Object.keys(settingsData).forEach((k) => {
                const v = (settingsData as any)[k];
                normalized[k] = v === null ? '' : v;
              });
              // merge normalized into formData and originalData
              setFormData((p: any) => ({ ...p, ...normalized }));
              setOriginalData((od: any) => ({ ...(od || {}), ...normalized }));

              // build catalogSettings from settingsRow (respecting nested catalog_settings)
              const rawCatalog = (settingsData.catalog_settings || {});
              const normalizedCatalog: any = { ...defaultCatalogSettings };
              Object.keys(defaultCatalogSettings).forEach((k) => {
                const topLevelVal = (settingsData as any)[k];
                const nestedVal = (rawCatalog as any)[k];
                const val = typeof topLevelVal !== 'undefined' && topLevelVal !== null ? topLevelVal : (typeof nestedVal !== 'undefined' && nestedVal !== null ? nestedVal : undefined);
                if (typeof val !== 'undefined') normalizedCatalog[k] = val;
              });
              normalizedCatalog.banners = Array.isArray(settingsData.banners) ? settingsData.banners : normalizedCatalog.banners;
              normalizedCatalog.banners_mobile = Array.isArray(settingsData.banners_mobile) ? settingsData.banners_mobile : normalizedCatalog.banners_mobile;
              normalizedCatalog.gallery_urls = Array.isArray(settingsData.gallery_urls) ? settingsData.gallery_urls : normalizedCatalog.gallery_urls;
              setCatalogSettings(normalizedCatalog);

              setTopBenefitHeight(Number(normalizedCatalog.top_benefit_height || defaultCatalogSettings.top_benefit_height));
              setTopBenefitTextSize(Number(normalizedCatalog.top_benefit_text_size || defaultCatalogSettings.top_benefit_text_size));
              setTopBenefitBgColor(normalizedCatalog.top_benefit_bg_color || defaultCatalogSettings.top_benefit_bg_color);
              setTopBenefitTextColor(normalizedCatalog.top_benefit_text_color || defaultCatalogSettings.top_benefit_text_color);
              setTopBenefitImageFit(normalizedCatalog.top_benefit_image_fit || defaultCatalogSettings.top_benefit_image_fit);
              setTopBenefitImageScale(Number(normalizedCatalog.top_benefit_image_scale ?? defaultCatalogSettings.top_benefit_image_scale));
              setTopBenefitTextAlign(normalizedCatalog.top_benefit_text_align || defaultCatalogSettings.top_benefit_text_align);
              setTopBenefitImageAlign(normalizedCatalog.top_benefit_image_align || defaultCatalogSettings.top_benefit_image_align);
              setTopBenefitImagePreview(normalizedCatalog.top_benefit_image_url || null);
              // banners
              // (these are already applied in normalizedCatalog.banners / banners_mobile)
            } else if (publicCatalogRow) {
              // No settings row; use public_catalogs as fallback for catalogSettings
              const pc = publicCatalogRow;
              const normalizedCatalog: any = { ...defaultCatalogSettings };
              // map common fields if present
              if (pc.top_benefit_bg_color) normalizedCatalog.top_benefit_bg_color = pc.top_benefit_bg_color;
              if (pc.top_benefit_text_color) normalizedCatalog.top_benefit_text_color = pc.top_benefit_text_color;
              if (Array.isArray(pc.banners)) normalizedCatalog.banners = pc.banners;
              if (Array.isArray(pc.banners_mobile)) normalizedCatalog.banners_mobile = pc.banners_mobile;
              if (Array.isArray(pc.gallery_urls)) normalizedCatalog.gallery_urls = pc.gallery_urls;
              normalizedCatalog.logo_url = pc.logo_url || null;
              setCatalogSettings(normalizedCatalog);
              setTopBenefitHeight(Number(normalizedCatalog.top_benefit_height || defaultCatalogSettings.top_benefit_height));
              setTopBenefitTextSize(Number(normalizedCatalog.top_benefit_text_size || defaultCatalogSettings.top_benefit_text_size));
              setTopBenefitBgColor(normalizedCatalog.top_benefit_bg_color || defaultCatalogSettings.top_benefit_bg_color);
              setTopBenefitTextColor(normalizedCatalog.top_benefit_text_color || defaultCatalogSettings.top_benefit_text_color);
              setTopBenefitImageFit(normalizedCatalog.top_benefit_image_fit || defaultCatalogSettings.top_benefit_image_fit);
              setTopBenefitImageScale(Number(normalizedCatalog.top_benefit_image_scale ?? defaultCatalogSettings.top_benefit_image_scale));
              setTopBenefitTextAlign(normalizedCatalog.top_benefit_text_align || defaultCatalogSettings.top_benefit_text_align);
              setTopBenefitImageAlign(normalizedCatalog.top_benefit_image_align || defaultCatalogSettings.top_benefit_image_align);
              setTopBenefitImagePreview(normalizedCatalog.top_benefit_image_url || null);
            }
          } else {
            // fallback to previous behavior: load settings by user_id
            const { data: settingsData, error } = await supabase
              .from('settings')
              .select('*')
              .eq('user_id', targetUserId)
              .maybeSingle();

            if (!mounted) return;

            if (!error && settingsData) {
              const normalized: any = {};
              Object.keys(settingsData).forEach((k) => {
                const v = (settingsData as any)[k];
                normalized[k] = v === null ? '' : v;
              });
              setFormData((p: any) => ({ ...p, ...normalized }));
              setOriginalData(normalized);
              const rawCatalog = (settingsData.catalog_settings || {});
              const normalizedCatalog: any = { ...defaultCatalogSettings };
              Object.keys(defaultCatalogSettings).forEach((k) => {
                const topLevelVal = (settingsData as any)[k];
                const nestedVal = (rawCatalog as any)[k];
                const val = typeof topLevelVal !== 'undefined' && topLevelVal !== null ? topLevelVal : (typeof nestedVal !== 'undefined' && nestedVal !== null ? nestedVal : undefined);
                if (typeof val !== 'undefined') normalizedCatalog[k] = val;
              });
              normalizedCatalog.banners = Array.isArray(settingsData.banners) ? settingsData.banners : normalizedCatalog.banners;
              normalizedCatalog.banners_mobile = Array.isArray(settingsData.banners_mobile) ? settingsData.banners_mobile : normalizedCatalog.banners_mobile;
              normalizedCatalog.gallery_urls = Array.isArray(settingsData.gallery_urls) ? settingsData.gallery_urls : normalizedCatalog.gallery_urls;
              setCatalogSettings(normalizedCatalog);
              setTopBenefitHeight(Number(normalizedCatalog.top_benefit_height || defaultCatalogSettings.top_benefit_height));
              setTopBenefitTextSize(Number(normalizedCatalog.top_benefit_text_size || defaultCatalogSettings.top_benefit_text_size));
              setTopBenefitBgColor(normalizedCatalog.top_benefit_bg_color || defaultCatalogSettings.top_benefit_bg_color);
              setTopBenefitTextColor(normalizedCatalog.top_benefit_text_color || defaultCatalogSettings.top_benefit_text_color);
              setTopBenefitImageFit(normalizedCatalog.top_benefit_image_fit || defaultCatalogSettings.top_benefit_image_fit);
              setTopBenefitImageScale(Number(normalizedCatalog.top_benefit_image_scale ?? defaultCatalogSettings.top_benefit_image_scale));
              setTopBenefitTextAlign(normalizedCatalog.top_benefit_text_align || defaultCatalogSettings.top_benefit_text_align);
              setTopBenefitImageAlign(normalizedCatalog.top_benefit_image_align || defaultCatalogSettings.top_benefit_image_align);
              setTopBenefitImagePreview(normalizedCatalog.top_benefit_image_url || null);
            } else {
              setOriginalData(initialForm);
              setFormData(initialForm);
            }
          }
        } else {
          // no companyId: fallback to original settings load
          const { data: settingsData, error } = await supabase
            .from('settings')
            .select('*')
            .eq('user_id', targetUserId)
            .maybeSingle();

          if (!mounted) return;

          if (!error && settingsData) {
            const normalized: any = {};
            Object.keys(settingsData).forEach((k) => {
              const v = (settingsData as any)[k];
              normalized[k] = v === null ? '' : v;
            });
            setFormData((p: any) => ({ ...p, ...normalized }));
            setOriginalData(normalized);
            const rawCatalog = (settingsData.catalog_settings || {});
            const normalizedCatalog: any = { ...defaultCatalogSettings };
            Object.keys(defaultCatalogSettings).forEach((k) => {
              const topLevelVal = (settingsData as any)[k];
              const nestedVal = (rawCatalog as any)[k];
              const val = typeof topLevelVal !== 'undefined' && topLevelVal !== null ? topLevelVal : (typeof nestedVal !== 'undefined' && nestedVal !== null ? nestedVal : undefined);
              if (typeof val !== 'undefined') normalizedCatalog[k] = val;
            });
            normalizedCatalog.banners = Array.isArray(settingsData.banners) ? settingsData.banners : normalizedCatalog.banners;
            normalizedCatalog.banners_mobile = Array.isArray(settingsData.banners_mobile) ? settingsData.banners_mobile : normalizedCatalog.banners_mobile;
            normalizedCatalog.gallery_urls = Array.isArray(settingsData.gallery_urls) ? settingsData.gallery_urls : normalizedCatalog.gallery_urls;
            setCatalogSettings(normalizedCatalog);
            setTopBenefitHeight(Number(normalizedCatalog.top_benefit_height || defaultCatalogSettings.top_benefit_height));
            setTopBenefitTextSize(Number(normalizedCatalog.top_benefit_text_size || defaultCatalogSettings.top_benefit_text_size));
            setTopBenefitBgColor(normalizedCatalog.top_benefit_bg_color || defaultCatalogSettings.top_benefit_bg_color);
            setTopBenefitTextColor(normalizedCatalog.top_benefit_text_color || defaultCatalogSettings.top_benefit_text_color);
            setTopBenefitImageFit(normalizedCatalog.top_benefit_image_fit || defaultCatalogSettings.top_benefit_image_fit);
            setTopBenefitImageScale(Number(normalizedCatalog.top_benefit_image_scale ?? defaultCatalogSettings.top_benefit_image_scale));
            setTopBenefitTextAlign(normalizedCatalog.top_benefit_text_align || defaultCatalogSettings.top_benefit_text_align);
            setTopBenefitImageAlign(normalizedCatalog.top_benefit_image_align || defaultCatalogSettings.top_benefit_image_align);
            setTopBenefitImagePreview(normalizedCatalog.top_benefit_image_url || null);
          } else {
            setOriginalData(initialForm);
            setFormData(initialForm);
          }
        }
      } catch (e) {
        console.warn('load settings failed', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [context, targetId]);

  const refreshPages = async () => {
    setPagesLoading(true);
    try {
      const res = await fetch('/api/company/pages');
      const json = await res.json();
      if (json?.success) setCompanyPages(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      console.warn('refreshPages failed', e);
    } finally {
      setPagesLoading(false);
    }
  };

  const handleChange = (e: any) => setFormData((p: any) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((p: any) => ({ ...p, catalog_slug: e.target.value }));
  };

  const onToggleActive = () => setFormData((p: any) => ({ ...p, is_active: !p.is_active }));

  const quickSave = async (partial: Record<string, any>, saveScope: 'tab' | 'full' = 'tab') => {
    // Use server-side endpoint to save settings so mirroring to companies/public_catalogs works
    const targetUserId = targetId || (await (await supabase.auth.getUser()).data.user)?.id;
    if (!targetUserId) throw new Error('Usuário alvo não identificado');
    try {
      // prepare payload: merge partial with catalogSettings defaults to avoid sending nulls for required DB columns
      const payload: any = {
        ...partial,
        context: context === 'company' ? 'company' : 'representative',
        targetId: targetUserId,
        ...(saveScope === 'tab' ? { save_scope: 'tab' } : {}),
      };

      try {
        Object.keys(defaultCatalogSettings).forEach((k) => {
          if (payload[k] === undefined || payload[k] === null) {
            // prefer current catalogSettings value, otherwise fallback to defaultCatalogSettings
            payload[k] = (catalogSettings as any)?.[k] ?? (defaultCatalogSettings as any)[k];
          }
        });
      } catch (e) {
        // if something is off with defaultCatalogSettings, ignore and proceed
      }

      // Normalize types for known keys to avoid DB check violations
      try {
        // numeric fields
        const numericKeys = ['top_benefit_image_scale', 'top_benefit_height', 'top_benefit_text_size', 'max_installments'];
        numericKeys.forEach((k) => {
          if (payload[k] !== undefined && payload[k] !== null) {
            const n = Number(payload[k]);
            payload[k] = Number.isFinite(n) ? n : (defaultCatalogSettings as any)[k];
          }
        });

        // enforce DB constraint range for image_scale (50..200)
        if (payload.top_benefit_image_scale === undefined || payload.top_benefit_image_scale === null) payload.top_benefit_image_scale = (defaultCatalogSettings as any).top_benefit_image_scale;
        if (Number(payload.top_benefit_image_scale) < 50) payload.top_benefit_image_scale = (defaultCatalogSettings as any).top_benefit_image_scale;
        if (Number(payload.top_benefit_image_scale) > 200) payload.top_benefit_image_scale = 200;

        // boolean fields
        const boolKeys = ['show_top_benefit_bar', 'show_installments', 'show_sale_price', 'show_cost_price', 'enable_stock_management', 'global_allow_backorder'];
        boolKeys.forEach((k) => {
          if (payload[k] !== undefined && payload[k] !== null) payload[k] = Boolean(payload[k]);
        });

        // arrays
        const arrayKeys = ['banners', 'banners_mobile', 'gallery_urls'];
        arrayKeys.forEach((k) => {
          if (payload[k] === null || typeof payload[k] === 'undefined') payload[k] = (defaultCatalogSettings as any)[k];
          else if (!Array.isArray(payload[k])) payload[k] = Array.isArray((catalogSettings as any)[k]) ? (catalogSettings as any)[k] : (defaultCatalogSettings as any)[k];
        });
      } catch (e) {
        // normalization best-effort — ignore on error
      }

      const res = await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let j: any = null;
      try { j = text ? JSON.parse(text) : null; } catch (_) { j = null; }

      if (!res.ok) {
        const serverMessage = j?.error || j?.message || text || `HTTP ${res.status}`;
        const err = new Error(serverMessage);
        (err as any).status = res.status;
        toast.error('Erro ao salvar: ' + serverMessage);
        throw err;
      }

      // refresh local originalData by merging partial
      const merged = { ...(originalData || {}), ...partial };
      setOriginalData(merged);
      setFormData((p: any) => ({ ...p, ...partial }));

      // Provide frontend feedback about public_catalog sync when available
      const pubSync = j?.public_catalog_sync;
      if (pubSync) {
        if (pubSync.skipped) {
          toast.warning('Sincronização pública ignorada: ' + (pubSync.reason || 'motivo desconhecido'));
        } else if (pubSync.attempted && pubSync.result) {
          const slug = (pubSync.result && pubSync.result.catalog_slug) || (j?.public_catalog && j.public_catalog.catalog_slug) || null;
          toast.success('Sincronização pública realizada' + (slug ? ` (slug: ${slug})` : ''));
        } else if (pubSync.error) {
          toast.error('Erro na sincronização pública: ' + String(pubSync.error));
        }
      }

      return { success: true, public_catalog_sync: pubSync || null };
    } catch (e: any) {
      // network or unexpected error
      toast.error('Erro ao salvar: ' + (e?.message || String(e)));
      throw e;
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const auth = await supabase.auth.getUser();
      const actingUser = auth?.data?.user || null;
      if (!actingUser) {
        toast.error('Usuário não identificado para salvar.');
        setSaving(false);
        return;
      }

      // -------------------------------------------------------
      // 1. Descobrir o role do usuário logado e o company_id
      // -------------------------------------------------------
      let actingRole: string | null = userRole || null;
      let companyId: string | null = null;
      try {
        const pRes = await supabase
          .from('profiles')
          .select('role,company_id,can_manage_catalog')
          .eq('id', actingUser.id)
          .maybeSingle();
        const p = pRes?.data as any | null;
        if (p) {
          actingRole = p.role || actingRole;
          companyId = p.company_id || null;
        }
      } catch (_) {}

      const now = new Date().toISOString();

      // Mescla catalogSettings + formData para campos de exibição/catálogo
      const mergedCatalog: any = {
        ...(catalogSettings || {}),
        ...(formData || {}),
        banners: Array.isArray((catalogSettings as any)?.banners) ? (catalogSettings as any).banners : (formData.banners || []),
        banners_mobile: Array.isArray((catalogSettings as any)?.banners_mobile) ? (catalogSettings as any).banners_mobile : (formData.banners_mobile || []),
        top_benefit_bg_color: topBenefitBgColor || (catalogSettings as any)?.top_benefit_bg_color || null,
        top_benefit_text_color: topBenefitTextColor || (catalogSettings as any)?.top_benefit_text_color || null,
        top_benefit_height: typeof topBenefitHeight !== 'undefined' ? topBenefitHeight : (catalogSettings as any)?.top_benefit_height || null,
        top_benefit_image_url: topBenefitImagePreview ?? (catalogSettings as any)?.top_benefit_image_url ?? null,
        updated_at: now,
      };

      // banner_mode agora existe no schema (migration SQL). Garantir que seja incluído.
      // Nenhuma ação adicional necessária aqui — mantemos `mergedCatalog.banner_mode`.

      // Normalização de tipos
      const numericKeys = ['top_benefit_image_scale', 'top_benefit_height', 'top_benefit_text_size', 'max_installments'];
      numericKeys.forEach((k) => {
        if (mergedCatalog[k] != null) mergedCatalog[k] = Number(mergedCatalog[k]) || null;
      });
      if (!mergedCatalog.top_benefit_image_scale || mergedCatalog.top_benefit_image_scale < 50) mergedCatalog.top_benefit_image_scale = 100;
      if (mergedCatalog.top_benefit_image_scale > 200) mergedCatalog.top_benefit_image_scale = 200;
      ['show_top_benefit_bar', 'show_installments', 'show_sale_price', 'show_cost_price', 'enable_stock_management', 'global_allow_backorder'].forEach((k) => {
        if (mergedCatalog[k] != null) mergedCatalog[k] = Boolean(mergedCatalog[k]);
      });

      // -------------------------------------------------------
      // 2. Estratégia de herança — salvar no lugar certo
      // -------------------------------------------------------
      const tasks: Array<Promise<any>> = [];

      // helper: sanitize payloads to avoid sending empty-strings to PostgREST
      const sanitizeEmptyStrings = (o: Record<string, any>) => {
        const out: Record<string, any> = {};
        Object.keys(o).forEach((k) => {
          const v = o[k];
          if (v === '') out[k] = null;
          else out[k] = v;
        });
        return out;
      };

      // --- CENÁRIO A: admin_company ou master ↔ salva na tabela `companies` ---
      const isCompanyAdmin = actingRole === 'admin_company' || actingRole === 'master';
      if (isCompanyAdmin && companyId) {
        // A identidade visual da distribuidora fica em `companies`.
        // Todos os representantes vinculados herdarão automaticamente pelo catálogo.
        const companyPayload: any = {
          name: formData.name || null,
          phone: formData.phone || null,
          email: formData.email || null,
          primary_color: formData.primary_color || null,
          secondary_color: formData.secondary_color || null,
          logo_url: formData.logo_url || null,
          cover_image: formData.cover_image || null,
          headline: formData.headline || null,
          about_text: formData.about_text || null,
          welcome_text: formData.welcome_text || null,
          footer_message: formData.footer_message || null,
          footer_background_color: formData.footer_background_color || null,
          footer_text_color: formData.footer_text_color || null,
          font_family: formData.font_family || null,
          font_url: formData.font_url || null,
          banners: mergedCatalog.banners,
          banners_mobile: mergedCatalog.banners_mobile,
          gallery_urls: Array.isArray(formData.gallery_urls) ? formData.gallery_urls : null,
          show_top_benefit_bar: mergedCatalog.show_top_benefit_bar,
          top_benefit_text: mergedCatalog.top_benefit_text || null,
          top_benefit_bg_color: mergedCatalog.top_benefit_bg_color || null,
          top_benefit_text_color: mergedCatalog.top_benefit_text_color || null,
          top_benefit_height: mergedCatalog.top_benefit_height,
          top_benefit_text_size: mergedCatalog.top_benefit_text_size,
          top_benefit_image_url: mergedCatalog.top_benefit_image_url || null,
          show_installments: mergedCatalog.show_installments,
          max_installments: mergedCatalog.max_installments,
          show_sale_price: mergedCatalog.show_sale_price,
          show_cost_price: mergedCatalog.show_cost_price,
          enable_stock_management: mergedCatalog.enable_stock_management,
          updated_at: now,
        };
        tasks.push(supabase.from('companies').update(sanitizeEmptyStrings(companyPayload)).eq('id', companyId) as any);
      }

      // --- CENÁRIO B: representante / rep ---
      // settings é a personalização individual — salva sempre para todos os roles
      const settingsPayload: any = {
        user_id: actingUser.id,
        ...mergedCatalog,
        // campos de identidade
        name: formData.name || null,
        phone: formData.phone || null,
        email: formData.email || null,
        catalog_slug: formData.catalog_slug || null,
        is_active: formData.is_active ?? true,
        representative_name: formData.representative_name || formData.name || null,
        whatsapp_url: formData.whatsapp_url || null,
        footer_message: formData.footer_message || null,
        updated_at: now,
      };
      // sanitize before upsert: convert empty strings to null to avoid Postgres integer parse errors
      const settingsPayloadSanitized = sanitizeEmptyStrings({ ...settingsPayload });

      // remove campos técnicos antes de salvar em settings (aplica na cópia sanitizada)
      delete settingsPayloadSanitized.header_background_color;
      delete settingsPayloadSanitized.header_text_color;
      tasks.push(
        supabase.from('settings').upsert([settingsPayloadSanitized], { onConflict: 'user_id' }) as any
      );

      // --- ÍNDICE PÚBLICO: public_catalogs guarda apenas slug + is_active ---
      // Design é lido por herança: settings → companies
      tasks.push(
        supabase.from('public_catalogs').upsert(
          [{ user_id: actingUser.id, catalog_slug: formData.catalog_slug || null, is_active: formData.is_active ?? true, updated_at: now }],
          { onConflict: 'user_id' }
        ) as any
      );

      // -------------------------------------------------------
      // 3. Executar e avaliar resultados
      // -------------------------------------------------------
      const results = await Promise.allSettled(tasks);

      const failed = results.filter(
        (r) => r.status === 'rejected' || ((r as any).value?.error)
      );

      if (failed.length === 0) {
        setOriginalData((od: any) => ({ ...(od || {}), ...mergedCatalog }));
        setFormData((fd: any) => ({ ...(fd || {}), ...mergedCatalog }));
        toast.success('Configurações salvas com sucesso!');
      } else {
        failed.forEach((r) => console.error('[handleSaveAll] erro:', (r as any).reason || (r as any).value?.error));
        // atualiza o que salvou com sucesso
        setOriginalData((od: any) => ({ ...(od || {}), ...mergedCatalog }));
        setFormData((fd: any) => ({ ...(fd || {}), ...mergedCatalog }));
        toast.warning('Salvo com alertas — verifique o console para detalhes.');
      }
    } catch (err: any) {
      console.error('Erro crítico no salvamento:', err);
      toast.error('Falha grave ao salvar. Verifique sua conexão.');
    } finally {
      setSaving(false);
    }
  };

  const getFieldsForTab = (tabId: string) => {
    switch (tabId) {
      case 'general':
        return ['name','phone','email','catalog_slug','price_password','headline','footer_message','is_active'];
      case 'appearance':
        return ['primary_color','secondary_color','font_family','font_url','logo_url','footer_background_color','footer_text_color','banners','banners_mobile','banner_mode'];
      
      case 'institucional':
        return ['about_text','welcome_text','cover_image','store_banner_meta','gallery_urls','gallery_title','gallery_subtitle'];
      case 'display':
        return [
          'show_top_benefit_bar',
          'top_benefit_text',
          'top_benefit_mode',
          'top_benefit_speed',
          'top_benefit_animation',
          'top_benefit_bg_color',
          'top_benefit_text_color',
          'top_benefit_height',
          'top_benefit_text_size',
          'top_benefit_image_url',
          'top_benefit_image_fit',
          'top_benefit_image_scale',
          'top_benefit_text_align',
          'top_benefit_image_align',
          // Pricing/display fields
          'show_sale_price',
          'show_cost_price',
          'price_unlock_mode',
          'show_installments',
          'max_installments',
        ];
      case 'gallery':
        return ['gallery_urls','gallery_title','gallery_subtitle','gallery_title_color','gallery_subtitle_color'];
      case 'stock':
        return ['enable_stock_management','global_allow_backorder','manage_stock','show_cost_price','show_sale_price'];
      default:
        return [];
    }
  };

  const saveActiveTab = async () => {
    setSaving(true);
    try {
      const fields = getFieldsForTab(activeTab);
      const partial: any = {};
      fields.forEach((f) => {
        // For robust detection, prefer explicit user edits in formData,
        // then catalogSettings, then fall back to originalData.
        if (formData && Object.prototype.hasOwnProperty.call(formData, f) && formData[f] !== undefined) {
          partial[f] = formData[f];
        } else if (catalogSettings && Object.prototype.hasOwnProperty.call(catalogSettings, f) && (catalogSettings as any)[f] !== undefined) {
          partial[f] = (catalogSettings as any)[f];
        } else if (originalData && Object.prototype.hasOwnProperty.call(originalData, f)) {
          partial[f] = originalData[f];
        } else {
          partial[f] = undefined;
        }
      });
      // compute diff against originalData
      const diff: any = {};
      // Include display-specific local states not stored in formData/catalogSettings
      if (activeTab === 'display') {
        try {
          // topBenefit local preview/state variables
          partial.top_benefit_bg_color = topBenefitBgColor ?? (catalogSettings as any)?.top_benefit_bg_color ?? originalData?.top_benefit_bg_color;
          partial.top_benefit_text_color = topBenefitTextColor ?? (catalogSettings as any)?.top_benefit_text_color ?? originalData?.top_benefit_text_color;
          partial.top_benefit_height = typeof topBenefitHeight !== 'undefined' ? topBenefitHeight : (catalogSettings as any)?.top_benefit_height ?? originalData?.top_benefit_height;
          partial.top_benefit_image_url = topBenefitImagePreview ?? (catalogSettings as any)?.top_benefit_image_url ?? originalData?.top_benefit_image_url;
          partial.top_benefit_image_scale = (catalogSettings as any)?.top_benefit_image_scale ?? originalData?.top_benefit_image_scale;
        } catch (e) {
          // ignore
        }
      }
      Object.keys(partial).forEach(k => {
        const a = typeof partial[k] === 'undefined' || partial[k] === null ? '' : partial[k];
        const b = typeof originalData?.[k] === 'undefined' || originalData?.[k] === null ? '' : originalData?.[k];
        try {
          if (JSON.stringify(a) !== JSON.stringify(b)) diff[k] = partial[k];
        } catch (e) {
          if (String(a) !== String(b)) diff[k] = partial[k];
        }
      });
      if (Object.keys(diff).length === 0) {
        toast.info('Nenhuma alteração nesta aba.');
        return;
      }
      await quickSave(diff);
      toast.success('Aba salva com sucesso.');
    } catch (err: any) {
      console.error('saveActiveTab error', err);
    } finally {
      setSaving(false);
    }
  };

  const { hasTab, loading: permsLoading } = usePermissions();

  const allTabs = [
    { id: 'general', label: 'Geral', icon: SettingsIcon },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'display', label: 'Exibição', icon: Palette },
    { id: 'institucional', label: 'Institucional', icon: Building2 },
    { id: 'gallery', label: 'Galeria', icon: Images },
    { id: 'pages', label: 'Páginas', icon: Globe },
    { id: 'stock', label: 'Estoque', icon: Package },
  ];

  // Filter tabs by permission; while permissions are loading, show all tabs (safe fallback)
  const tabs = allTabs.filter((t) => (permsLoading ? true : hasTab(t.id)));

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 p-4">
      <div className="flex items-center justify-between sticky top-0 z-40 bg-gray-50/90 dark:bg-slate-950/90 py-4 border-b">
        <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight">
          <SettingsIcon className="text-primary" /> Ajustes do Sistema
        </h1>
        <div className="flex items-center gap-3">
          <Button onClick={saveActiveTab} disabled={saving} variant="outline">
            {saving ? 'Salvando...' : 'Salvar Aba'}
          </Button>
          <Button onClick={handleSaveAll} disabled={saving} leftIcon={<Save size={16} />} variant="primary">
            {saving ? 'Salvando...' : 'Salvar Tudo'}
          </Button>
        </div>
      </div>

      <nav className="hidden md:flex space-x-1 border-b">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`py-4 px-6 font-black text-[10px] uppercase ${activeTab === tab.id ? 'border-b-2 border-primary text-primary' : 'text-gray-400'}`}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'general' && (
        <TabGeneral
          formData={formData}
          nameFieldLabel={context === 'company' ? 'Nome da Distribuidora' : 'Nome do Representante'}
          nameFieldPlaceholder={context === 'company' ? 'Ex: Distribuidora Óptica XYZ' : 'Ex: João da Silva'}
          handleChange={handleChange}
          handleSlugChange={handleSlugChange}
          slugRef={slugRef}
          showPassword={false}
          onToggleShowPassword={() => {}}
          isActive={!!formData.is_active}
          onToggleActive={onToggleActive}
          isCompanyAdmin={isCompanyAdmin}
          userRole={userRole}
        />
      )}

      {activeTab === 'appearance' && (
        (permsLoading || hasTab('appearance')) ? (
          <TabAppearance
            THEME_PRESETS={THEME_PRESETS}
            applyTheme={applyTheme}
            selectedThemeName={selectedThemeName}
            logoPreview={formData.logo_url || (catalogSettings && catalogSettings.logo_url) || null}
            supabase={supabase}
            setLogoPreview={(url: string | null) => {
              setFormData((p: any) => ({ ...p, logo_url: url }));
              setCatalogSettings((p: any) => ({ ...(p || {}), logo_url: url }));
            }}
            formData={formData}
            setFormData={setFormData}
            applyDashboardFont={() => {}}
            catalogSettings={catalogSettings}
            setCatalogSettings={setCatalogSettings}
            uploadBannersToStorage={async (files: File[], which: 'desktop' | 'mobile') => {
              try {
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) throw new Error('Usuário não autenticado');

                // For banners we produce a single optimized image at 1200w
                const targetWidth = 1200;
                const quality = 0.82;

                const toWebpBlob = async (file: File) => {
                  // decode image
                  const imgBitmap = await createImageBitmap(file);
                  // calculate scale preserving aspect ratio
                  const scale = imgBitmap.width > targetWidth ? targetWidth / imgBitmap.width : 1;
                  const w = Math.max(1, Math.round(imgBitmap.width * scale));
                  const h = Math.max(1, Math.round(imgBitmap.height * scale));

                  // prefer OffscreenCanvas when available
                  const canvas: HTMLCanvasElement | OffscreenCanvas = (typeof OffscreenCanvas !== 'undefined')
                    ? new OffscreenCanvas(w, h)
                    : (document.createElement('canvas') as HTMLCanvasElement);

                  if (canvas instanceof HTMLCanvasElement) {
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('Canvas 2D not available');
                    ctx.drawImage(imgBitmap, 0, 0, w, h);
                    return await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), 'image/webp', quality));
                  } else {
                    // OffscreenCanvas
                    const ctx = (canvas as OffscreenCanvas).getContext('2d');
                    if (!ctx) throw new Error('OffscreenCanvas 2D not available');
                    ctx.drawImage(imgBitmap, 0, 0, w, h);
                    // @ts-ignore OffscreenCanvas.prototype.convertToBlob exists in many browsers
                    if (typeof (canvas as any).convertToBlob === 'function') {
                      return await (canvas as any).convertToBlob({ type: 'image/webp', quality });
                    }
                    return null;
                  }
                };

                const uploadedUrls: string[] = [];
                for (let i = 0; i < files.length; i++) {
                  const file = files[i];
                  try {
                    const webpBlob = await toWebpBlob(file);
                    const ext = 'webp';
                    const fileName = `banner-${which}-${Date.now()}-${i}-1200w.${ext}`;
                    const filePath = `${user.id}/banners/${which}/${fileName}`;

                    const uploadFile = webpBlob ? new File([webpBlob], fileName, { type: 'image/webp' }) : file;

                    const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, uploadFile, { upsert: true });
                    if (uploadError) throw uploadError;
                    let publicUrl: string | null = null;
                    try {
                      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
                      publicUrl = urlData?.publicUrl || null;
                    } catch (e) {}
                    if (!publicUrl) {
                      try {
                        const { data: signedData, error: signedErr } = await supabase.storage.from('product-images').createSignedUrl(filePath, 60 * 60);
                        if (!signedErr) publicUrl = (signedData && signedData.signedUrl) || null;
                      } catch (e) {
                        // ignore
                      }
                    }
                    if (!publicUrl) {
                      try {
                        const clientUrl = (supabase as any).url || (supabase as any).supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                        if (clientUrl) publicUrl = `${clientUrl.replace(/\/$/, '')}/storage/v1/object/public/product-images/${filePath}`;
                      } catch (e) {}
                    }
                    if (publicUrl) uploadedUrls.push(publicUrl);
                  } catch (err) {
                    // on error, continue with original file upload as fallback
                    try {
                      const fileExt = file.name.split('.').pop();
                      const fileName = `banner-${which}-${Date.now()}-${i}.${fileExt || 'jpg'}`;
                      const filePath = `${user.id}/banners/${which}/${fileName}`;
                      const { error: uploadError2 } = await supabase.storage.from('product-images').upload(filePath, file, { upsert: true });
                      if (!uploadError2) {
                        let publicUrl2: string | null = null;
                        try {
                          const { data: urlData2 } = supabase.storage.from('product-images').getPublicUrl(filePath);
                          publicUrl2 = urlData2?.publicUrl || null;
                        } catch (e) {}
                        if (!publicUrl2) {
                          try {
                            const { data: signedData2, error: signedErr2 } = await supabase.storage.from('product-images').createSignedUrl(filePath, 60 * 60);
                            if (!signedErr2) publicUrl2 = (signedData2 && signedData2.signedUrl) || null;
                          } catch (e) {}
                        }
                        if (!publicUrl2) {
                          try {
                            const clientUrl2 = (supabase as any).url || (supabase as any).supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                            if (clientUrl2) publicUrl2 = `${clientUrl2.replace(/\/$/, '')}/storage/v1/object/public/product-images/${filePath}`;
                          } catch (e) {}
                        }
                        if (publicUrl2) {
                          uploadedUrls.push(publicUrl2);
                          continue;
                        }
                      }
                    } catch (e) {}
                    console.warn('uploadBannersToStorage: failed to process file', file.name, err);
                  }
                }

                return uploadedUrls;
              } catch (e) {
                console.error('uploadBannersToStorage failed', e);
                return [];
              }
            }}
            currentBanners={(catalogSettings && catalogSettings.banners) || []}
            setCurrentBanners={(next: string[]) => setCatalogSettings((p: any) => ({ ...(p||{}), banners: next }))}
            currentBannersMobile={(catalogSettings && catalogSettings.banners_mobile) || []}
            setCurrentBannersMobile={(next: string[]) => setCatalogSettings((p: any) => ({ ...(p||{}), banners_mobile: next }))}
            moveBanner={(index: number, dir: 'up' | 'down') => {
              const arr = (catalogSettings && catalogSettings.banners) || [];
              const to = dir === 'up' ? index - 1 : index + 1;
              if (to < 0 || to >= arr.length) return;
              const next = [...arr];
              const [item] = next.splice(index, 1);
              next.splice(to, 0, item);
              setCatalogSettings((p: any) => ({ ...(p||{}), banners: next }));
            }}
            moveBannerMobile={(index: number, dir: 'up' | 'down') => {
              const arr = (catalogSettings && catalogSettings.banners_mobile) || [];
              const to = dir === 'up' ? index - 1 : index + 1;
              if (to < 0 || to >= arr.length) return;
              const next = [...arr];
              const [item] = next.splice(index, 1);
              next.splice(to, 0, item);
              setCatalogSettings((p: any) => ({ ...(p||{}), banners_mobile: next }));
            }}
          />
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">Acesso negado a esta aba.</div>
        )
      )}

      {activeTab === 'institucional' && (
        (permsLoading || hasTab('institucional')) ? (
          <TabInstitucional
            supabase={supabase}
            formData={formData}
            setFormData={setFormData}
            quickSave={quickSave}
          />
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">Acesso negado a esta aba.</div>
        )
      )}

      {activeTab === 'display' && (permsLoading || hasTab('display')) && (
        <TabDisplay
          catalogSettings={catalogSettings}
          setCatalogSettings={setCatalogSettings}
          handleCatalogSettingsChange={handleCatalogSettingsChange}
          topBenefitImagePreview={topBenefitImagePreview}
          setTopBenefitImagePreview={setTopBenefitImagePreview}
          topBenefitHeight={topBenefitHeight}
          setTopBenefitHeight={setTopBenefitHeight}
          topBenefitTextSize={topBenefitTextSize}
          setTopBenefitTextSize={setTopBenefitTextSize}
          topBenefitBgColor={topBenefitBgColor}
          setTopBenefitBgColor={setTopBenefitBgColor}
          topBenefitTextColor={topBenefitTextColor}
          setTopBenefitTextColor={setTopBenefitTextColor}
          topBenefitImageFit={topBenefitImageFit}
          setTopBenefitImageFit={setTopBenefitImageFit}
          topBenefitImageScale={topBenefitImageScale}
          setTopBenefitImageScale={setTopBenefitImageScale}
          topBenefitTextAlign={topBenefitTextAlign}
          setTopBenefitTextAlign={setTopBenefitTextAlign}
          topBenefitImageAlign={topBenefitImageAlign}
          loading={loading}
        />
      )}
      {activeTab === 'display' && !permsLoading && !hasTab('display') && (
        <div className="p-8 text-center text-sm text-slate-500">Acesso negado a esta aba.</div>
      )}

      {activeTab === 'gallery' && (
        (permsLoading || hasTab('gallery')) ? (
          <TabGaleria
            formData={formData}
            setFormData={setFormData}
            supabase={supabase}
          />
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">Acesso negado a esta aba.</div>
        )
      )}

      {activeTab === 'pages' && (
        (permsLoading || hasTab('pages')) ? (
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1 bg-white p-4 rounded-xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold">Páginas</h4>
              <button className="text-sm text-slate-500" onClick={() => refreshPages()}>{pagesLoading ? 'Atualizando...' : 'Atualizar'}</button>
            </div>
            {pagesLoading ? (
              <div>Carregando páginas...</div>
            ) : (
              <ul className="space-y-2">
                {companyPages.length === 0 ? <li className="text-sm text-slate-500">Nenhuma página encontrada.</li> : companyPages.map((p: any) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{p.title || p.slug}</div>
                      <div className="text-xs text-slate-400">{p.slug}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600" onClick={() => { setEditingPageId(p.id); setEditingDraft({ id: p.id, title: p.title || '', slug: p.slug || '', content: p.content || '{}', is_active: !!p.is_active }); }}><Pencil size={14} /></button>
                      <button className="text-red-600" onClick={async () => { if (!confirm('Remover página?')) return; try { const res = await fetch('/api/company/pages', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id }) }); const json = await res.json(); if (!res.ok || !json?.success) { toast.error(json?.error || 'Falha ao remover página'); return; } toast.success('Página removida'); await refreshPages(); } catch { toast.error('Erro ao remover página'); } }}><Trash2 size={14} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="col-span-2 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="font-bold">Editar Página</h4>
                <div className="flex items-center gap-2">
                  <button className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm" onClick={() => { setEditingPageId(null); setEditingDraft({ title: '', slug: '', content: '{}', is_active: true }); }}>Novo</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <input value={editingDraft.title} onChange={(e) => setEditingDraft((p) => ({ ...(p||{}), title: e.target.value }))} placeholder="Título" className="p-3 bg-slate-50 rounded-xl border border-slate-200" />
                <input value={editingDraft.slug} onChange={(e) => setEditingDraft((p) => ({ ...(p||{}), slug: e.target.value }))} placeholder="Slug (ex: sobre)" className="p-3 bg-slate-50 rounded-xl border border-slate-200" />
              </div>

              <div className="mt-3">
                <PageBuilder value={editingDraft.content} pageTitle={editingDraft.title} onChange={(c) => setEditingDraft((p) => ({ ...(p||{}), content: c }))} />
              </div>

              <div className="flex items-center gap-2 mt-3">
                <Button variant="primary" onClick={async () => {
                  try {
                    const payload: any = { title: editingDraft.title, slug: editingDraft.slug, content: editingDraft.content, is_active: !!editingDraft.is_active };
                    let res: Response;
                    if (editingPageId) {
                      payload.id = editingPageId;
                      res = await fetch('/api/company/pages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    } else {
                      res = await fetch('/api/company/pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    }
                    const json = await res.json();
                    if (!res.ok || !json?.success) { toast.error(json?.error || 'Falha ao salvar página'); return; }
                    toast.success('Página salva');
                    setEditingPageId(null);
                    setEditingDraft({ title: '', slug: '', content: '{}', is_active: true });
                    await refreshPages();
                  } catch (e) {
                    toast.error('Erro ao salvar página');
                  }
                }}>
                  Salvar Página
                </Button>
                <Button variant="outline" onClick={() => { setEditingPageId(null); setEditingDraft({ title: '', slug: '', content: '{}', is_active: true }); }}>
                  Cancelar
                </Button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100">
              <h4 className="font-bold">Criar Nova Página Rápida</h4>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={newPageDraft.title} onChange={(e) => setNewPageDraft((p) => ({ ...p, title: e.target.value }))} placeholder="Título" className="p-3 bg-slate-50 rounded-xl border border-slate-200" />
                <input value={newPageDraft.slug} onChange={(e) => setNewPageDraft((p) => ({ ...p, slug: e.target.value }))} placeholder="Slug" className="p-3 bg-slate-50 rounded-xl border border-slate-200" />
              </div>
              <div className="mt-3">
                <PageBuilder value={newPageDraft.content} pageTitle={newPageDraft.title} onChange={(c) => setNewPageDraft((p) => ({ ...p, content: c }))} />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Button variant="primary" onClick={async () => {
                  if (!newPageDraft.title.trim() || !newPageDraft.slug.trim()) { toast.error('Título e slug são obrigatórios'); return; }
                  try {
                    const res = await fetch('/api/company/pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPageDraft) });
                    const json = await res.json();
                    if (!res.ok || !json?.success) { toast.error(json?.error || 'Falha ao criar página'); return; }
                    toast.success('Página criada');
                    setNewPageDraft({ title: '', slug: '', content: '{}', is_active: true });
                    await refreshPages();
                  } catch {
                    toast.error('Erro ao criar página');
                  }
                }}>
                  Criar Página
                </Button>
              </div>
            </div>
          </div>
        </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">Acesso negado a esta aba.</div>
        )
      )}

      {activeTab === 'stock' && (
        (permsLoading || hasTab('stock')) ? (
          <TabStock
            catalogSettings={catalogSettings}
            handleCatalogSettingsChange={handleCatalogSettingsChange}
          />
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">Acesso negado a esta aba.</div>
        )
      )}
    </div>
  );
}
