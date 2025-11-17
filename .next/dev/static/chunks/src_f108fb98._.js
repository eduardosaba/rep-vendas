(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/supabaseClient.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.2_@babel+core@7.2_ac612d167d9caedc69b237559ab43d82/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$81$2e$1$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@supabase+supabase-js@2.81.1/node_modules/@supabase/supabase-js/dist/module/index.js [app-client] (ecmascript) <locals>");
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://aawghxjbipcqefmikwby.supabase.co") || "YOUR_SUPABASE_URL";
const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhd2doeGpiaXBjcWVmbWlrd2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NjI3NTgsImV4cCI6MjA3ODUzODc1OH0.Ml1sIc2rpkXAh-DuILaNKwFRmI6-COOeZY-HoBILJUw") || "YOUR_SUPABASE_ANON_KEY";
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$81$2e$1$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseAnonKey);
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/storage.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "deleteImage",
    ()=>deleteImage,
    "getImageUrl",
    ()=>getImageUrl,
    "uploadImage",
    ()=>uploadImage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabaseClient.ts [app-client] (ecmascript)");
;
const uploadImage = async (file, bucket, userId, customFileName = null)=>{
    try {
        const fileExt = file.name.split(".").pop();
        const fileName = customFileName || `${userId}_${Date.now()}.${fileExt}`;
        const filePath = `${bucket}/${fileName}`;
        const { error: uploadError } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].storage.from(bucket).upload(filePath, file);
        if (uploadError) {
            throw uploadError;
        }
        const { data } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].storage.from(bucket).getPublicUrl(filePath);
        return {
            success: true,
            publicUrl: data.publicUrl,
            filePath: filePath
        };
    } catch (error) {
        console.error("Erro ao fazer upload:", error);
        return {
            success: false,
            error: error.message
        };
    }
};
const deleteImage = async (bucket, filePath)=>{
    try {
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].storage.from(bucket).remove([
            filePath
        ]);
        if (error) {
            throw error;
        }
        return {
            success: true
        };
    } catch (error) {
        console.error("Erro ao deletar imagem:", error);
        return {
            success: false,
            error: error.message
        };
    }
};
const getImageUrl = (bucket, filePath)=>{
    const { data } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/settings/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SettingsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.2_@babel+core@7.2_ac612d167d9caedc69b237559ab43d82/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.2_@babel+core@7.2_ac612d167d9caedc69b237559ab43d82/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabaseClient.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/storage.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.2_@babel+core@7.2_ac612d167d9caedc69b237559ab43d82/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$553$2e$0_react$40$19$2e$2$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.553.0_react@19.2.0/node_modules/lucide-react/dist/esm/icons/upload.js [app-client] (ecmascript) <export default as Upload>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$553$2e$0_react$40$19$2e$2$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.553.0_react@19.2.0/node_modules/lucide-react/dist/esm/icons/settings.js [app-client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$553$2e$0_react$40$19$2e$2$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.553.0_react@19.2.0/node_modules/lucide-react/dist/esm/icons/save.js [app-client] (ecmascript) <export default as Save>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$553$2e$0_react$40$19$2e$2$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.553.0_react@19.2.0/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
function SettingsPage() {
    _s();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [settings, setSettings] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        name: "",
        email: "",
        phone: "",
        logo_url: "",
        banner_url: "",
        primary_color: "#3B82F6",
        secondary_color: "#6B7280",
        header_color: "#FFFFFF",
        font_family: "Inter, sans-serif",
        title_color: "#111827",
        icon_color: "#4B5563",
        email_provider: "resend",
        email_api_key: "",
        email_from: "",
        show_shipping: true,
        show_installments: true,
        show_delivery_address: true,
        show_installments_checkout: true,
        show_discount: true,
        show_old_price: true,
        show_filter_price: true,
        show_filter_category: true,
        show_filter_bestseller: true,
        show_filter_new: true,
        show_delivery_address_checkout: true,
        show_payment_method_checkout: true
    });
    const [uploading, setUploading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        logo: false,
        banner: false,
        product: false,
        brand: false
    });
    const [message, setMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SettingsPage.useEffect": ()=>{
            const getUser = {
                "SettingsPage.useEffect.getUser": async ()=>{
                    const { data: { user } } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
                    if (!user) {
                        router.push("/login");
                    } else {
                        setUser(user);
                        loadSettings(user.id);
                    }
                }
            }["SettingsPage.useEffect.getUser"];
            getUser();
        }
    }["SettingsPage.useEffect"], [
        router
    ]);
    const loadSettings = async (userId)=>{
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("settings").select("*").eq("user_id", userId).single();
        if (data && !error) {
            // Garantir que todos os valores sejam strings ou valores apropriados
            setSettings({
                name: data.name || "",
                email: data.email || "",
                phone: data.phone || "",
                logo_url: data.logo_url || "",
                banner_url: data.banner_url || "",
                primary_color: data.primary_color || "#3B82F6",
                secondary_color: data.secondary_color || "#6B7280",
                header_color: data.header_color || "#FFFFFF",
                font_family: data.font_family || "Inter, sans-serif",
                title_color: data.title_color || "#111827",
                icon_color: data.icon_color || "#4B5563",
                email_provider: data.email_provider || "resend",
                email_api_key: data.email_api_key || "",
                email_from: data.email_from || "",
                show_shipping: data.show_shipping !== undefined ? data.show_shipping : true,
                show_installments: data.show_installments !== undefined ? data.show_installments : true,
                show_delivery_address: data.show_delivery_address !== undefined ? data.show_delivery_address : true,
                show_installments_checkout: data.show_installments_checkout !== undefined ? data.show_installments_checkout : true,
                show_discount: data.show_discount !== undefined ? data.show_discount : true,
                show_old_price: data.show_old_price !== undefined ? data.show_old_price : true,
                show_filter_price: data.show_filter_price !== undefined ? data.show_filter_price : true,
                show_filter_category: data.show_filter_category !== undefined ? data.show_filter_category : true,
                show_filter_bestseller: data.show_filter_bestseller !== undefined ? data.show_filter_bestseller : true,
                show_filter_new: data.show_filter_new !== undefined ? data.show_filter_new : true,
                show_delivery_address_checkout: data.show_delivery_address_checkout !== undefined ? data.show_delivery_address_checkout : true,
                show_payment_method_checkout: data.show_payment_method_checkout !== undefined ? data.show_payment_method_checkout : true
            });
        }
    };
    const uploadImageToBucket = async (file, bucket, field)=>{
        if (!user) return;
        setUploading((prev)=>({
                ...prev,
                [field]: true
            }));
        setMessage("");
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["uploadImage"])(file, bucket, user.id);
        if (result.success) {
            if (field === "logo") {
                setSettings((prev)=>({
                        ...prev,
                        logo_url: result.publicUrl
                    }));
            } else if (field === "banner") {
                setSettings((prev)=>({
                        ...prev,
                        banner_url: result.publicUrl
                    }));
            }
            setMessage(`Imagem enviada com sucesso para ${bucket}!`);
        } else {
            setMessage(`Erro ao fazer upload: ${result.error}`);
        }
        setUploading((prev)=>({
                ...prev,
                [field]: false
            }));
    };
    const handleFileUpload = (event, bucket, field)=>{
        const file = event.target.files?.[0];
        if (file) {
            uploadImageToBucket(file, bucket, field);
        }
    };
    const saveSettings = async ()=>{
        if (!user) return;
        try {
            // Primeiro, tentar atualizar se já existe
            const { data: existing } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("settings").select("id").eq("user_id", user.id).single();
            let result;
            if (existing) {
                // Atualizar registro existente
                result = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("settings").update({
                    name: settings.name || null,
                    email: settings.email || null,
                    phone: settings.phone || null,
                    logo_url: settings.logo_url || null,
                    banner_url: settings.banner_url || null,
                    primary_color: settings.primary_color || "#3B82F6",
                    secondary_color: settings.secondary_color || "#6B7280",
                    header_color: settings.header_color || "#FFFFFF",
                    font_family: settings.font_family || "Inter, sans-serif",
                    title_color: settings.title_color || "#111827",
                    icon_color: settings.icon_color || "#4B5563",
                    email_provider: settings.email_provider || "resend",
                    email_api_key: settings.email_api_key || null,
                    email_from: settings.email_from || null,
                    show_shipping: settings.show_shipping !== undefined ? settings.show_shipping : true,
                    show_installments: settings.show_installments !== undefined ? settings.show_installments : true,
                    show_delivery_address: settings.show_delivery_address !== undefined ? settings.show_delivery_address : true,
                    show_installments_checkout: settings.show_installments_checkout !== undefined ? settings.show_installments_checkout : true,
                    show_discount: settings.show_discount !== undefined ? settings.show_discount : true,
                    show_old_price: settings.show_old_price !== undefined ? settings.show_old_price : true,
                    show_filter_price: settings.show_filter_price !== undefined ? settings.show_filter_price : true,
                    show_filter_category: settings.show_filter_category !== undefined ? settings.show_filter_category : true,
                    show_filter_bestseller: settings.show_filter_bestseller !== undefined ? settings.show_filter_bestseller : true,
                    show_filter_new: settings.show_filter_new !== undefined ? settings.show_filter_new : true,
                    show_delivery_address_checkout: settings.show_delivery_address_checkout !== undefined ? settings.show_delivery_address_checkout : true,
                    show_payment_method_checkout: settings.show_payment_method_checkout !== undefined ? settings.show_payment_method_checkout : true
                }).eq("user_id", user.id);
            } else {
                // Inserir novo registro
                result = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("settings").insert({
                    user_id: user.id,
                    name: settings.name || null,
                    email: settings.email || null,
                    phone: settings.phone || null,
                    logo_url: settings.logo_url || null,
                    banner_url: settings.banner_url || null,
                    primary_color: settings.primary_color || "#3B82F6",
                    secondary_color: settings.secondary_color || "#6B7280",
                    header_color: settings.header_color || "#FFFFFF",
                    font_family: settings.font_family || "Inter, sans-serif",
                    title_color: settings.title_color || "#111827",
                    icon_color: settings.icon_color || "#4B5563",
                    email_provider: settings.email_provider || "resend",
                    email_api_key: settings.email_api_key || null,
                    email_from: settings.email_from || null,
                    show_shipping: settings.show_shipping !== undefined ? settings.show_shipping : true,
                    show_installments: settings.show_installments !== undefined ? settings.show_installments : true,
                    show_delivery_address: settings.show_delivery_address !== undefined ? settings.show_delivery_address : true,
                    show_installments_checkout: settings.show_installments_checkout !== undefined ? settings.show_installments_checkout : true,
                    show_discount: settings.show_discount !== undefined ? settings.show_discount : true,
                    show_old_price: settings.show_old_price !== undefined ? settings.show_old_price : true,
                    show_filter_price: settings.show_filter_price !== undefined ? settings.show_filter_price : true,
                    show_filter_category: settings.show_filter_category !== undefined ? settings.show_filter_category : true,
                    show_filter_bestseller: settings.show_filter_bestseller !== undefined ? settings.show_filter_bestseller : true,
                    show_filter_new: settings.show_filter_new !== undefined ? settings.show_filter_new : true,
                    show_delivery_address_checkout: settings.show_delivery_address_checkout !== undefined ? settings.show_delivery_address_checkout : true,
                    show_payment_method_checkout: settings.show_payment_method_checkout !== undefined ? settings.show_payment_method_checkout : true
                });
            }
            if (result.error) throw result.error;
            setMessage("Configurações salvas com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar configurações:", error);
            setMessage(`Erro ao salvar configurações: ${error.message}`);
        }
    };
    const ImageUploadCard = ({ title, bucket, field, currentUrl, description })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white p-6 rounded-lg shadow-sm border",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                    className: "text-lg font-medium text-gray-900 mb-4",
                    children: title
                }, void 0, false, {
                    fileName: "[project]/src/app/settings/page.tsx",
                    lineNumber: 378,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-sm text-gray-600 mb-4",
                    children: description
                }, void 0, false, {
                    fileName: "[project]/src/app/settings/page.tsx",
                    lineNumber: 379,
                    columnNumber: 7
                }, this),
                currentUrl && currentUrl.trim() !== "" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-4",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: currentUrl,
                        alt: title,
                        className: "w-full h-40 object-cover rounded"
                    }, void 0, false, {
                        fileName: "[project]/src/app/settings/page.tsx",
                        lineNumber: 383,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/settings/page.tsx",
                    lineNumber: 382,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center space-x-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$553$2e$0_react$40$19$2e$2$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"], {
                                    className: "h-4 w-4 mr-2"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/settings/page.tsx",
                                    lineNumber: 393,
                                    columnNumber: 11
                                }, this),
                                uploading[field] ? "Enviando..." : "Escolher imagem",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "file",
                                    accept: "image/*",
                                    onChange: (e)=>handleFileUpload(e, bucket, field),
                                    className: "hidden",
                                    disabled: uploading[field]
                                }, void 0, false, {
                                    fileName: "[project]/src/app/settings/page.tsx",
                                    lineNumber: 395,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/settings/page.tsx",
                            lineNumber: 392,
                            columnNumber: 9
                        }, this),
                        currentUrl && currentUrl.trim() !== "" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>{
                                if (field === "logo") {
                                    setSettings((prev)=>({
                                            ...prev,
                                            logo_url: ""
                                        }));
                                } else if (field === "banner") {
                                    setSettings((prev)=>({
                                            ...prev,
                                            banner_url: ""
                                        }));
                                }
                            },
                            className: "flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$553$2e$0_react$40$19$2e$2$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                    className: "h-4 w-4 mr-2"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/settings/page.tsx",
                                    lineNumber: 414,
                                    columnNumber: 13
                                }, this),
                                "Remover"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/settings/page.tsx",
                            lineNumber: 404,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/settings/page.tsx",
                    lineNumber: 391,
                    columnNumber: 7
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/settings/page.tsx",
            lineNumber: 377,
            columnNumber: 5
        }, this);
    if (!user) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: "Carregando..."
        }, void 0, false, {
            fileName: "[project]/src/app/settings/page.tsx",
            lineNumber: 423,
            columnNumber: 12
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-gray-100",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "bg-white shadow",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex justify-between items-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$553$2e$0_react$40$19$2e$2$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"], {
                                        className: "h-8 w-8 text-gray-600 mr-3"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 433,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                className: "text-2xl font-bold text-gray-900",
                                                children: "Configurações"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 435,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm text-gray-600",
                                                children: "Gerencie suas imagens e configurações"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 438,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 434,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 432,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>router.push("/dashboard"),
                                className: "bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700",
                                children: "Voltar ao Dashboard"
                            }, void 0, false, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 443,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/settings/page.tsx",
                        lineNumber: 431,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/settings/page.tsx",
                    lineNumber: 430,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/settings/page.tsx",
                lineNumber: 429,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8",
                children: [
                    message && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `mb-6 p-4 rounded-lg ${message.includes("Erro") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`,
                        children: message
                    }, void 0, false, {
                        fileName: "[project]/src/app/settings/page.tsx",
                        lineNumber: 455,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white p-6 rounded-lg shadow-sm border mb-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-lg font-medium text-gray-900 mb-4",
                                children: "Configurações de Email"
                            }, void 0, false, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 464,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 md:grid-cols-2 gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-gray-700 mb-1",
                                                children: "Provedor de Email"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 469,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                value: settings.email_provider || "resend",
                                                onChange: (e)=>setSettings((prev)=>({
                                                            ...prev,
                                                            email_provider: e.target.value
                                                        })),
                                                className: "w-full border border-gray-300 rounded px-3 py-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "resend",
                                                        children: "Resend (Recomendado)"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/settings/page.tsx",
                                                        lineNumber: 482,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "sendgrid",
                                                        children: "SendGrid"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/settings/page.tsx",
                                                        lineNumber: 483,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "mailgun",
                                                        children: "Mailgun"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/settings/page.tsx",
                                                        lineNumber: 484,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "aws-ses",
                                                        children: "AWS SES"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/settings/page.tsx",
                                                        lineNumber: 485,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "smtp",
                                                        children: "SMTP Personalizado"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/settings/page.tsx",
                                                        lineNumber: 486,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 472,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 468,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-gray-700 mb-1",
                                                children: "Email do Remetente"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 490,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "email",
                                                value: settings.email_from || "",
                                                onChange: (e)=>setSettings((prev)=>({
                                                            ...prev,
                                                            email_from: e.target.value
                                                        })),
                                                className: "w-full border border-gray-300 rounded px-3 py-2",
                                                placeholder: "noreply@suaempresa.com"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 493,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 489,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "md:col-span-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-gray-700 mb-1",
                                                children: "Chave API"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 507,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "password",
                                                value: settings.email_api_key || "",
                                                onChange: (e)=>setSettings((prev)=>({
                                                            ...prev,
                                                            email_api_key: e.target.value
                                                        })),
                                                className: "w-full border border-gray-300 rounded px-3 py-2",
                                                placeholder: "Sua chave API do provedor de email"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 510,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-gray-500 mt-1",
                                                children: "A chave API é armazenada de forma segura e usada apenas para envio de emails."
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 522,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 506,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 467,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: saveSettings,
                                className: "mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$553$2e$0_react$40$19$2e$2$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__["Save"], {
                                        className: "h-4 w-4 mr-2"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 532,
                                        columnNumber: 13
                                    }, this),
                                    "Salvar Configurações de Email"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 528,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/settings/page.tsx",
                        lineNumber: 463,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white p-6 rounded-lg shadow-sm border mb-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-lg font-medium text-gray-900 mb-4",
                                children: "Informações Básicas"
                            }, void 0, false, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 537,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 md:grid-cols-2 gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-gray-700 mb-1",
                                                children: "Nome da Empresa"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 542,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "text",
                                                value: settings.name || "",
                                                onChange: (e)=>setSettings((prev)=>({
                                                            ...prev,
                                                            name: e.target.value
                                                        })),
                                                className: "w-full border border-gray-300 rounded px-3 py-2",
                                                placeholder: "Nome da sua empresa"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 545,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 541,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-gray-700 mb-1",
                                                children: "Email"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 556,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "email",
                                                value: settings.email || "",
                                                onChange: (e)=>setSettings((prev)=>({
                                                            ...prev,
                                                            email: e.target.value
                                                        })),
                                                className: "w-full border border-gray-300 rounded px-3 py-2",
                                                placeholder: "seu@email.com"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 559,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 555,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-gray-700 mb-1",
                                                children: "Telefone"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 570,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "tel",
                                                value: settings.phone || "",
                                                onChange: (e)=>setSettings((prev)=>({
                                                            ...prev,
                                                            phone: e.target.value
                                                        })),
                                                className: "w-full border border-gray-300 rounded px-3 py-2",
                                                placeholder: "(11) 99999-9999"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 573,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 569,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 540,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: saveSettings,
                                className: "mt-4 flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$553$2e$0_react$40$19$2e$2$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__["Save"], {
                                        className: "h-4 w-4 mr-2"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 588,
                                        columnNumber: 13
                                    }, this),
                                    "Salvar Configurações"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 584,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/settings/page.tsx",
                        lineNumber: 536,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white p-6 rounded-lg shadow-sm border mb-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-lg font-medium text-gray-900 mb-4",
                                children: "Personalização do Tema"
                            }, void 0, false, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 595,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 md:grid-cols-2 gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-gray-700 mb-1",
                                                children: "Cor Primária (Botões)"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 600,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "color",
                                                value: settings.primary_color || "#3B82F6",
                                                onChange: (e)=>setSettings((prev)=>({
                                                            ...prev,
                                                            primary_color: e.target.value
                                                        })),
                                                className: "w-full h-10 border border-gray-300 rounded"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 603,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 599,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-gray-700 mb-1",
                                                children: "Cor Secundária"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 616,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "color",
                                                value: settings.secondary_color || "#6B7280",
                                                onChange: (e)=>setSettings((prev)=>({
                                                            ...prev,
                                                            secondary_color: e.target.value
                                                        })),
                                                className: "w-full h-10 border border-gray-300 rounded"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 619,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 615,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-gray-700 mb-1",
                                                children: "Cor do Cabeçalho"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 632,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "color",
                                                value: settings.header_color || "#FFFFFF",
                                                onChange: (e)=>setSettings((prev)=>({
                                                            ...prev,
                                                            header_color: e.target.value
                                                        })),
                                                className: "w-full h-10 border border-gray-300 rounded"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 635,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 631,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-gray-700 mb-1",
                                                children: "Cor do Título"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 648,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "color",
                                                value: settings.title_color || "#111827",
                                                onChange: (e)=>setSettings((prev)=>({
                                                            ...prev,
                                                            title_color: e.target.value
                                                        })),
                                                className: "w-full h-10 border border-gray-300 rounded"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 651,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 647,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block text-sm font-medium text-gray-700 mb-1",
                                                children: "Cor dos Ícones"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 664,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "color",
                                                value: settings.icon_color || "#4B5563",
                                                onChange: (e)=>setSettings((prev)=>({
                                                            ...prev,
                                                            icon_color: e.target.value
                                                        })),
                                                className: "w-full h-10 border border-gray-300 rounded"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 667,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 663,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 598,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: saveSettings,
                                className: "mt-4 flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$553$2e$0_react$40$19$2e$2$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__["Save"], {
                                        className: "h-4 w-4 mr-2"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 684,
                                        columnNumber: 13
                                    }, this),
                                    "Salvar Tema"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 680,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/settings/page.tsx",
                        lineNumber: 594,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-1 md:grid-cols-2 gap-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ImageUploadCard, {
                                title: "Logo da Empresa",
                                bucket: "logos",
                                field: "logo",
                                currentUrl: settings.logo_url,
                                description: "Logo que aparece no catálogo e cabeçalho"
                            }, void 0, false, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 691,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ImageUploadCard, {
                                title: "Banner Principal",
                                bucket: "banner",
                                field: "banner",
                                currentUrl: settings.banner_url,
                                description: "Banner exibido no topo do catálogo"
                            }, void 0, false, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 699,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/settings/page.tsx",
                        lineNumber: 690,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white p-6 rounded-lg shadow-sm border mb-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-lg font-medium text-gray-900 mb-4",
                                children: "Configurações de Catálogo"
                            }, void 0, false, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 710,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "checkbox",
                                                id: "show_filter_price",
                                                checked: settings.show_filter_price !== undefined ? settings.show_filter_price : true,
                                                onChange: (e)=>setSettings((prev)=>({
                                                            ...prev,
                                                            show_filter_price: e.target.checked
                                                        })),
                                                className: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 715,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                htmlFor: "show_filter_price",
                                                className: "ml-2 block text-sm text-gray-900",
                                                children: "Mostrar filtro de preço no catálogo"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 731,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 714,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "checkbox",
                                                id: "show_filter_category",
                                                checked: settings.show_filter_category !== undefined ? settings.show_filter_category : true,
                                                onChange: (e)=>setSettings((prev)=>({
                                                            ...prev,
                                                            show_filter_category: e.target.checked
                                                        })),
                                                className: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 739,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                htmlFor: "show_filter_category",
                                                className: "ml-2 block text-sm text-gray-900",
                                                children: "Mostrar filtro de categoria/marca no catálogo"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 755,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 738,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "checkbox",
                                                id: "show_filter_bestseller",
                                                checked: settings.show_filter_bestseller !== undefined ? settings.show_filter_bestseller : true,
                                                onChange: (e)=>setSettings((prev)=>({
                                                            ...prev,
                                                            show_filter_bestseller: e.target.checked
                                                        })),
                                                className: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 763,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                htmlFor: "show_filter_bestseller",
                                                className: "ml-2 block text-sm text-gray-900",
                                                children: "Mostrar filtro de produtos bestseller no catálogo"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 779,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 762,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "checkbox",
                                                id: "show_filter_new",
                                                checked: settings.show_filter_new !== undefined ? settings.show_filter_new : true,
                                                onChange: (e)=>setSettings((prev)=>({
                                                            ...prev,
                                                            show_filter_new: e.target.checked
                                                        })),
                                                className: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 787,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                htmlFor: "show_filter_new",
                                                className: "ml-2 block text-sm text-gray-900",
                                                children: "Mostrar filtro de lançamentos no catálogo"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 803,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 786,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 713,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: saveSettings,
                                className: "mt-4 flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$553$2e$0_react$40$19$2e$2$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__["Save"], {
                                        className: "h-4 w-4 mr-2"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 815,
                                        columnNumber: 13
                                    }, this),
                                    "Salvar Configurações de Catálogo"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 811,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/settings/page.tsx",
                        lineNumber: 709,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-xl font-bold text-gray-900 mb-4",
                                children: "Gerenciamento de Imagens"
                            }, void 0, false, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 822,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 md:grid-cols-2 gap-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bg-white p-6 rounded-lg shadow-sm border",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-lg font-medium text-gray-900 mb-4",
                                                children: "Imagens de Produtos"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 827,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm text-gray-600 mb-4",
                                                children: 'Faça upload de imagens de produtos no bucket "produtos". As imagens são associadas aos produtos no cadastro.'
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 830,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-sm text-gray-500",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                        children: "Bucket:"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/settings/page.tsx",
                                                        lineNumber: 835,
                                                        columnNumber: 17
                                                    }, this),
                                                    " produtos",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                                        fileName: "[project]/src/app/settings/page.tsx",
                                                        lineNumber: 836,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                        children: "Uso:"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/settings/page.tsx",
                                                        lineNumber: 837,
                                                        columnNumber: 17
                                                    }, this),
                                                    " Imagens dos produtos no catálogo"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 834,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 826,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bg-white p-6 rounded-lg shadow-sm border",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-lg font-medium text-gray-900 mb-4",
                                                children: "Logos de Marcas"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 842,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm text-gray-600 mb-4",
                                                children: 'Faça upload dos logos das marcas no bucket "marcas". Os logos aparecem nas categorias do catálogo.'
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 845,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-sm text-gray-500",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                        children: "Bucket:"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/settings/page.tsx",
                                                        lineNumber: 850,
                                                        columnNumber: 17
                                                    }, this),
                                                    " marcas",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                                        fileName: "[project]/src/app/settings/page.tsx",
                                                        lineNumber: 851,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                        children: "Uso:"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/settings/page.tsx",
                                                        lineNumber: 852,
                                                        columnNumber: 17
                                                    }, this),
                                                    " Logos das marcas/categorias"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/settings/page.tsx",
                                                lineNumber: 849,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/settings/page.tsx",
                                        lineNumber: 841,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/settings/page.tsx",
                                lineNumber: 825,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/settings/page.tsx",
                        lineNumber: 821,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/settings/page.tsx",
                lineNumber: 453,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/settings/page.tsx",
        lineNumber: 427,
        columnNumber: 5
    }, this);
}
_s(SettingsPage, "NyvJ3s81tClWg+7OdnPtnPoC7bk=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$2_$40$babel$2b$core$40$7$2e$2_ac612d167d9caedc69b237559ab43d82$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = SettingsPage;
var _c;
__turbopack_context__.k.register(_c, "SettingsPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_f108fb98._.js.map