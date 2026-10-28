import { o as __toESM } from "../_runtime.mjs";
import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { C as useRouter, S as useNavigate, Z as require_react, _ as lazyRouteComponent, b as Link, f as Scripts, g as Outlet, h as createRouter, p as HeadContent, v as createFileRoute, w as require_jsx_runtime, x as Navigate, y as createRootRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as getServerFnById, i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { S as parsePrice, a as SNIPE_OPTIONS, b as optionalAuth, c as cleanHandle, o as UUID_RE, s as authMiddleware, x as parseFeedQuery } from "./shared-DmOvjmfI.mjs";
import { L as string, N as number, P as object, R as union, j as literal } from "../_libs/@better-auth/core+[...].mjs";
import { a as signOut, t as authClient } from "./client-Hb_FAdbz.mjs";
import { a as hasGateSessionMarker, n as auth } from "./server-BKPVAAcp.mjs";
import { a as Bell, n as Search, r as Plus, t as TriangleAlert } from "../_libs/lucide-react.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-current-user-DDtel6t0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
/**
* Current user + loading state. Same behavior in live preview and when deployed:
*   - Auth enabled -> the real signed-in user; `user` is `null` while
*                            the session resolves (`isPending: true`) and when
*                            signed out (`isPending: false`). Session comes from
*                            Better Auth `useSession()` → `/api/auth/get-session`
*                            (cookie when deployed; bearer in live preview).
*   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
*
* Protect a route by waiting out `isPending` before acting on `user` —
* redirecting on `user: null` alone bounces signed-in visitors to sign-in on
* every hard reload:
*
*   import { RedirectToSignIn } from "@/lib/auth/gates";
*   const { user, isPending } = useCurrentUserState();
*   if (isPending) return null;              // still resolving — don't redirect yet
*   if (!user) return <RedirectToSignIn />;  // definitely signed out
*
* `authEnabled` is a module-level constant fixed at load, so the guarded hook
* call keeps a stable hook order across every render of a given component.
*/
function useCurrentUserState() {
	return useSessionUserState();
}
function useSessionUserState() {
	const { data, isPending } = authClient.useSession();
	const id = data?.user.id;
	const displayName = data?.user.name ?? null;
	const primaryEmail = data?.user.email ?? null;
	const profileImageUrl = data?.user.image ?? null;
	const user = (0, import_react.useMemo)(() => id ? {
		id,
		displayName,
		primaryEmail,
		profileImageUrl,
		isDevFallback: false
	} : null, [
		id,
		displayName,
		primaryEmail,
		profileImageUrl
	]);
	return (0, import_react.useMemo)(() => ({
		user,
		isPending
	}), [user, isPending]);
}
/**
* Convenience view of `useCurrentUserState().user` for display (e.g.
* `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
* for redirects/guards use `useCurrentUserState()` and check `isPending`.
*/
function useCurrentUser() {
	return useCurrentUserState().user;
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/server-DE8Nxucw.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function cleanText(s, max) {
	return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}
function fail(message) {
	throw new Error(message);
}
var listListings = createServerFn({ method: "GET" }).validator((input) => parseFeedQuery(input)).handler(createSsrRpc("b6a7d5fa941a65f1e9a29197e264e8903e8885fcb9c2f3769a8c3521e9c927bd"));
var listPopularTags = createServerFn({ method: "GET" }).handler(createSsrRpc("e37e03903636af950f708b1749e1e77323c97006701b22cbc0c719143a338ed1"));
var suggestTags = createServerFn({ method: "GET" }).validator((q) => typeof q === "string" ? q : "").handler(createSsrRpc("56767778d629385039aedf4b7bdf2a4cacdc81e0392c97a9df19ce510b0c285b"));
var getListing = createServerFn({ method: "GET" }).middleware([optionalAuth]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
	return id;
}).handler(createSsrRpc("bda47970204a80cb81982959abc9a9b148110d753a4429f41b0860710fb78fd8"));
function parseCreate(input) {
	if (!input || typeof input !== "object") fail("Пустая форма");
	const o = input;
	const title = cleanText(typeof o.title === "string" ? o.title : "", 80);
	const blurb = cleanText(typeof o.blurb === "string" ? o.blurb : "", 400);
	const privateDescription = cleanText(typeof o.privateDescription === "string" ? o.privateDescription : "", 8e3);
	if (title.length < 3) fail("Название — хотя бы 3 символа");
	if (privateDescription.length < 10) fail("Полное описание — хотя бы 10 символов. Его увидит только покупатель.");
	const kind = o.kind === "auction" ? "auction" : o.kind === "fixed" ? "fixed" : null;
	if (!kind) fail("Выберите аукцион или фиксированную цену");
	const price = parsePrice(o.price);
	if (price == null) fail("Цена — целое число от 1");
	let buyNow = null;
	if (kind === "auction" && o.buyNow != null && o.buyNow !== "") {
		buyNow = parsePrice(o.buyNow);
		if (buyNow == null || buyNow <= price) fail("«Купить сейчас» должно быть выше стартовой цены");
	}
	const durationHours = Number(o.durationHours);
	if (kind === "auction" && ![
		1,
		6,
		12,
		24,
		72,
		168
	].includes(durationHours)) fail("Выберите длительность аукциона");
	const anti = Number(o.antiSnipeMinutes);
	if (kind === "auction" && !SNIPE_OPTIONS.includes(anti)) fail("Выберите окно антиснайпа");
	const tags = Array.isArray(o.tags) ? o.tags.filter((t) => typeof t === "string") : [];
	if (tags.length > 8) fail("Не больше 8 тегов");
	return {
		title,
		blurb,
		privateDescription,
		kind,
		price,
		buyNow,
		durationHours: kind === "auction" ? durationHours : 0,
		antiSnipeMinutes: kind === "auction" ? anti : 3,
		tags
	};
}
var createListing = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parseCreate).handler(createSsrRpc("d4778423fe1e20b569530ff94ff79a175756576f472eac85cd282a23d954012c"));
function parseUpload(input) {
	if (!input || typeof input !== "object") fail("Пустой файл");
	const o = input;
	if (typeof o.listingId !== "string" || !UUID_RE.test(o.listingId)) fail("Некорректный лот");
	if (o.kind !== "preview" && o.kind !== "file") fail("Некорректный тип файла");
	if (typeof o.filename !== "string" || typeof o.b64 !== "string") fail("Файл не прочитан");
	if (o.b64.length > 8e6) fail("Файл больше лимита");
	return {
		listingId: o.listingId,
		kind: o.kind,
		filename: o.filename,
		b64: o.b64.replace(/^data:[^,]*,/, "").replace(/\s/g, "")
	};
}
var uploadMedia = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parseUpload).handler(createSsrRpc("3c04f445076c94152ff8ecde25d59a8f75469b3fb769350e5bac090d62ed247f"));
var deleteMedia = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный файл");
	return id;
}).handler(createSsrRpc("6be05f198e5243be78759153cd8238aa221512c9830515b4fde7861afb228ae5"));
function parseCopy(input) {
	if (!input || typeof input !== "object") fail("Пустая форма");
	const o = input;
	if (typeof o.id !== "string" || !UUID_RE.test(o.id)) fail("Некорректный лот");
	const title = cleanText(typeof o.title === "string" ? o.title : "", 80);
	const blurb = cleanText(typeof o.blurb === "string" ? o.blurb : "", 400);
	const privateDescription = cleanText(typeof o.privateDescription === "string" ? o.privateDescription : "", 8e3);
	if (title.length < 3) fail("Название — хотя бы 3 символа");
	if (privateDescription.length < 10) fail("Полное описание слишком короткое");
	const tags = Array.isArray(o.tags) ? o.tags.filter((t) => typeof t === "string").slice(0, 8) : [];
	return {
		id: o.id,
		title,
		blurb,
		privateDescription,
		tags
	};
}
var updateListingCopy = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parseCopy).handler(createSsrRpc("ef8da5247bebe9205aa96377c2d97ebb3b1fa9804e9e4492bb3003d27eb5bcf8"));
var cancelListing = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
	return id;
}).handler(createSsrRpc("44aa51378a0677e4bcf838d30d8f6444965c3233606ca34e0e50690a362b5a4a"));
var placeBid = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	if (!input || typeof input !== "object") fail("Пустая ставка");
	const o = input;
	if (typeof o.listingId !== "string" || !UUID_RE.test(o.listingId)) fail("Некорректный лот");
	const amount = parsePrice(o.amount);
	if (amount == null) fail("Ставка — целое число");
	return {
		listingId: o.listingId,
		amount
	};
}).handler(createSsrRpc("19da62019141bc7a152f347a6a97e17f14e14e87a431f3d495f91df9d63b7dfd"));
var buyFixed = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
	return id;
}).handler(createSsrRpc("63b5b864df88484631b6b6674019351c41d639751a316b9944f011033c7948fc"));
var buyNow = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
	return id;
}).handler(createSsrRpc("46c6f899b470e984dc3ee7f7334df2a0b3c08b34491d7462682da7791e1ff265"));
var reportListing = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	if (!input || typeof input !== "object") fail("Пустая жалоба");
	const o = input;
	if (typeof o.listingId !== "string" || !UUID_RE.test(o.listingId)) fail("Некорректный лот");
	const reason = cleanText(typeof o.reason === "string" ? o.reason : "", 500);
	if (reason.length < 4) fail("Опишите причину чуть подробнее");
	return {
		listingId: o.listingId,
		reason
	};
}).handler(createSsrRpc("fed956745cb2dd8f463b40bc9b76dab9390b7c6279aa6e3741236077403006f0"));
var getMe = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("6f0c9f686465c4ad6ccc78667dba70797b135a97859fe8fa06b5fb7a3affad54"));
var updateProfile = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	if (!input || typeof input !== "object") fail("Пустая форма");
	const o = input;
	const handle = cleanHandle(typeof o.handle === "string" ? o.handle : "");
	const displayName = cleanText(typeof o.displayName === "string" ? o.displayName : "", 40);
	const bio = cleanText(typeof o.bio === "string" ? o.bio : "", 400);
	if (!handle) fail("Ник: 3–20 букв, цифр или _");
	if (displayName.length < 2) fail("Имя слишком короткое");
	return {
		handle,
		displayName,
		bio
	};
}).handler(createSsrRpc("a5831a3909d9914f532f14668d505f75cdd9b9d265a4d5034350d62366abcf37"));
var getPublicProfile = createServerFn({ method: "GET" }).validator((handle) => {
	const h = typeof handle === "string" ? handle.trim().toLocaleLowerCase("ru") : "";
	if (!cleanHandle(h)) fail("Некорректный профиль");
	return h;
}).handler(createSsrRpc("af93279568551410cd06660a3f5aa6d72b6db81f51523afba7c29807a6c03378"));
var listDeals = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("ba141e203e074965d578de4b8c62735e3bfc7423a51daefffadf33450555158e"));
var getDeal = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректная сделка");
	return id;
}).handler(createSsrRpc("87cb89b952081dd8890bf80fc83f0c6f4b606459a63d45801e993a8cad3037ed"));
var sendMessage = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	if (!input || typeof input !== "object") fail("Пустое сообщение");
	const o = input;
	if (typeof o.dealId !== "string" || !UUID_RE.test(o.dealId)) fail("Некорректная сделка");
	const body = cleanText(typeof o.body === "string" ? o.body : "", 2e3);
	if (!body) fail("Напишите сообщение");
	return {
		dealId: o.dealId,
		body
	};
}).handler(createSsrRpc("cd96842cb005bf8710540dfcd3084259dce0ac050c8f8d7b0eea2eb2832f1c08"));
var confirmPayment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректная сделка");
	return id;
}).handler(createSsrRpc("e1712075d685bc0d0caed9dc60b5ed178cf3013175ed83a7c5c084f3a149173f"));
var completeDeal = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректная сделка");
	return id;
}).handler(createSsrRpc("4d441f15d0c6b718357f0634fc282be5723c39597ff64a575cdeb65284956bc3"));
var listNotifications = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("8eb96d9b05ba7785aee90e337b52ecdbe52aa9e51513b5c9f8a396fe6d97c587"));
var markNotificationsRead = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(createSsrRpc("b013d6dcf10d1862e53f81cbea06421661c4bda7df46d7fc3dbd182fe14c2dbf"));
var adminOverview = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("3df17bac92a5825de719790181e0bc3a35edeee951e478ebd74ad372243e0440"));
var adminModerate = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	if (!input || typeof input !== "object") fail("Пустое действие");
	const o = input;
	if (o.action === "remove-listing" && typeof o.listingId === "string" && UUID_RE.test(o.listingId)) return {
		action: "remove-listing",
		listingId: o.listingId
	};
	if ((o.action === "dismiss-report" || o.action === "action-report") && typeof o.reportId === "string" && UUID_RE.test(o.reportId)) return {
		action: o.action,
		reportId: o.reportId
	};
	if (o.action === "ban" && typeof o.userId === "string" && typeof o.banned === "boolean") return {
		action: "ban",
		userId: o.userId,
		banned: o.banned
	};
	fail("Некорректное действие");
}).handler(createSsrRpc("590fbe4f516b66724926c2bd8bfd9ac4efecf5a9d814134bd7063c7615b4a63e"));
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/router-C6OEj4kx.js
var import_jsx_runtime = require_jsx_runtime();
var FALLBACK_MESSAGE = "Что-то сломалось. Обновите страницу.";
function errorMessage(error) {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string" && error) return error;
	return FALLBACK_MESSAGE;
}
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-6 text-center text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
				className: "size-10",
				strokeWidth: 1.5,
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-2xl",
				children: "Сбой"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-muted",
				children: errorMessage(error)
			})
		]
	});
}
/**
* Path-based preview hosts serve the dev server under `/{port_id}/` and strip
* that prefix before forwarding, so SSR sees `/` while the browser URL keeps the
* prefix. TanStack Start resets `basepath` on hydration, so a `rewrite` keeps
* client routing and generated links aligned with the public URL.
*/
var PATH_BASED_PREVIEW_HOSTS = /* @__PURE__ */ new Set([
	"preview.grok.genai.mil",
	"preview.grok.mil",
	"preview.grokgsac.com"
]);
var PORT_ID_PREFIX = /^\/hds-[a-z0-9]+-\d+-[a-z0-9]+(?=\/|$)/i;
function previewPathPrefix(hostname, pathname) {
	if (!PATH_BASED_PREVIEW_HOSTS.has(hostname.toLowerCase())) return void 0;
	return PORT_ID_PREFIX.exec(pathname)?.[0];
}
function prefixRewrite(prefix) {
	return {
		input: ({ url }) => {
			if (url.pathname === prefix) url.pathname = "/";
			else if (url.pathname.startsWith(`${prefix}/`)) url.pathname = url.pathname.slice(prefix.length);
			return url;
		},
		output: ({ url }) => {
			url.pathname = `${prefix}${url.pathname}`;
			return url;
		}
	};
}
function previewPathRewrite() {
	if (typeof window === "undefined") return void 0;
	const prefix = previewPathPrefix(window.location.hostname, window.location.pathname);
	return prefix ? prefixRewrite(prefix) : void 0;
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
var CONNECTOR_TOKEN_READY_EVENT = "grok:connector-token-ready";
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
var ConnectorTokenReadySchema = EnvelopeSchema.extend({ type: literal("connector-token-ready") });
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Origin of the Grok embedder framing this page, or null when the page runs
* top-level (download/export, local `npm run dev`, deployed sites) or under a
* non-Grok parent. Client-only; null during SSR.
*/
function resolveCurrentEmbedderOrigin() {
	if (typeof window === "undefined") return null;
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	return resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	const parentOrigin = resolveCurrentEmbedderOrigin();
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onHello = (data) => {
		if (!HelloSchema.safeParse(data).success) return;
		announce();
	};
	const onNavigate = (data) => {
		const parsed = NavigateSchema.safeParse(data);
		if (!parsed.success) return;
		navigate(parsed.data.path);
		queueMicrotask(reportLocation);
	};
	const onHistory = (data) => {
		const parsed = HistorySchema.safeParse(data);
		if (!parsed.success) return;
		if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
		window.history.go(parsed.data.delta);
	};
	const onConnectorTokenReady = (data) => {
		if (!ConnectorTokenReadySchema.safeParse(data).success) return;
		window.dispatchEvent(new Event(CONNECTOR_TOKEN_READY_EVENT));
	};
	const hostMessageHandlers = /* @__PURE__ */ new Map([
		["hello", onHello],
		["navigate", onNavigate],
		["history", onHistory],
		["connector-token-ready", onConnectorTokenReady]
	]);
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		hostMessageHandlers.get(envelope.data.type)?.(event.data);
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
var subscribeToNothing = () => () => {};
var noGateSessionOnServer = () => false;
/**
* Auth state components — plain wrappers around `useCurrentUserState()`.
*
* With auth on, visitors are signed out until they authenticate — in the sandbox
* live preview too, which does real sign-in. The shared dev user appears only
* when auth is disabled (`VITE_AUTH_ENABLED=false`, the shipped default).
* While the session is still resolving, gates that care about signed-out state
* render nothing so there's no signed-out flash on hard reload.
*/
/** Where `RedirectToSignIn` sends signed-out visitors. Create this route. */
var SIGN_IN_PATH = "/login";
/**
* Client-side redirect to the sign-in route (TanStack `<Navigate>` — NOT a full
* `window.location` reload). A hard navigation re-bootstraps the SPA and re-runs
* session loading, which feels like a second "Loading…" on /login.
*
* Guard routes by waiting out `isPending` first (see `use-current-user`), then
* render this.
*/
function RedirectToSignIn({ to = SIGN_IN_PATH }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to });
}
/**
* Minimal signed-in identity chip + sign-out. Restyle freely (see the
* `design-ui` skill). Sign-out is only shown when auth is enabled (the
* disabled-auth dev user has nothing to sign out of) and the session is not
* gate-materialized — behind the gate the next request signs the viewer
* straight back in, so a sign-out control there is a broken loop.
*/
function UserButton() {
	const user = useCurrentUser();
	const [signingOut, setSigningOut] = (0, import_react.useState)(false);
	const gateSession = (0, import_react.useSyncExternalStore)(subscribeToNothing, hasGateSessionMarker, noGateSessionOnServer);
	if (!user) return null;
	const label = user.displayName ?? user.primaryEmail ?? "Account";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.profileImageUrl,
				alt: "",
				className: "h-8 w-8 rounded-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20",
				children: label.charAt(0).toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			!gateSession && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: signingOut,
				onClick: () => {
					setSigningOut(true);
					signOut().catch(() => setSigningOut(false));
				},
				className: "cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline disabled:cursor-wait disabled:no-underline",
				children: signingOut ? "Signing out…" : "Sign out"
			})
		]
	});
}
function SearchForm({ className }) {
	const navigate = useNavigate();
	const [q, setQ] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", {
		className,
		role: "search",
		onSubmit: (e) => {
			e.preventDefault();
			navigate({
				to: "/",
				search: {
					q: q.trim(),
					tag: "",
					kind: "all",
					sort: "new",
					page: 1
				}
			});
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "flex min-h-11 items-center gap-2 border border-ink/20 bg-card px-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
				className: "size-4 shrink-0 text-muted",
				"aria-hidden": "true"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				value: q,
				onChange: (e) => setQ(e.target.value),
				placeholder: "Поиск по названию",
				className: "w-full bg-transparent text-sm outline-none placeholder:text-muted",
				suppressHydrationWarning: true
			})]
		})
	});
}
function AppShell({ children }) {
	const { user, isPending } = useCurrentUserState();
	const [me, setMe] = (0, import_react.useState)(null);
	const userId = user?.id;
	(0, import_react.useEffect)(() => {
		if (!userId) {
			setMe(null);
			return;
		}
		let stop = false;
		const load = () => {
			getMe().then((next) => {
				if (!stop) setMe(next);
			}).catch(() => void 0);
		};
		load();
		const timer = window.setInterval(load, 2e4);
		return () => {
			stop = true;
			window.clearInterval(timer);
		};
	}, [userId]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-screen flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: "#content",
				className: "sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-acid focus:px-3 focus:py-2",
				children: "К содержанию"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "border-b border-ink/15 bg-paper/90 backdrop-blur-sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/",
							search: {
								q: "",
								tag: "",
								kind: "all",
								sort: "new",
								page: 1
							},
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "grid size-9 place-items-center bg-acid font-display text-lg leading-none",
								children: "G"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "leading-none",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block font-display text-xl tracking-tight",
									children: "GLYPH"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-xs text-muted",
									children: "ADOPT BOOTH"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchForm, { className: "hidden min-w-0 flex-1 md:block" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
							className: "ml-auto flex items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/notifications",
									"aria-label": me?.unread ? `Уведомления, ${me.unread}` : "Уведомления",
									className: "relative grid size-11 place-items-center border border-ink/15",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "size-4" }), me && me.unread > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "absolute -top-1 -right-1 grid min-w-5 place-items-center bg-acid px-1 font-mono text-xs text-ink",
										children: me.unread > 9 ? "9+" : me.unread
									}) : null]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/sell",
									className: "inline-flex min-h-11 items-center gap-1 rounded-full bg-acid px-4 font-medium text-ink",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "Лот"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "hidden min-h-11 items-center sm:flex",
									children: isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-9 w-24 animate-pulse bg-soft" }) : user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/login",
										className: "inline-flex min-h-11 items-center px-3 font-medium",
										children: "Войти"
									})
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchForm, { className: "w-full md:hidden" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex w-full flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs tracking-wide text-muted uppercase sm:hidden",
							children: isPending ? null : user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/login",
								className: "text-ink",
								children: "Войти"
							})
						})
					]
				})
			}),
			me?.banned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "bg-ink px-4 py-2 text-center text-sm text-paper",
				children: "Аккаунт ограничен модерацией. Новые лоты и ставки недоступны."
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				id: "content",
				className: "mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10",
				children
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "border-t border-ink/15",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 font-mono text-xs text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "GLYPH // OFF-SITE PAY" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/deals",
							className: "hover:text-ink",
							children: "Сделки"
						}),
						me?.handle ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/u/$handle",
							params: { handle: me.handle },
							className: "hover:text-ink",
							children: ["@", me.handle]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/me",
							className: "hover:text-ink",
							children: "Профиль"
						}),
						me?.isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/admin",
							className: "hover:text-ink",
							children: "Модерация"
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/rules",
							className: "hover:text-ink",
							children: "Правила"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/terms",
							className: "hover:text-ink",
							children: "Условия"
						})
					]
				})
			})
		]
	});
}
var styles_default = "/assets/styles-CF4lNZMM.css";
var Route$14 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "GLYPH — маркетплейс адоптов" },
			{
				name: "description",
				content: "Аукцион и фиксированная цена на персонажей. Файлы открываются покупателю только после того, как обе стороны подтвердили оплату."
			},
			{
				name: "theme-color",
				content: "#f2f2ee"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Syne:wght@600;700;800&display=swap"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			}
		]
	}),
	component: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "ru",
		className: "antialiased",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AuthProvider, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
				position: "top-center",
				toastOptions: { style: {
					background: "var(--color-card)",
					color: "var(--color-ink)",
					border: "1px solid var(--color-ink)",
					borderRadius: "2px"
				} }
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
		] })]
	})
});
var $$splitComponentImporter$11 = () => import("./routes-Cf-JR4Mb.mjs");
var Route$13 = createFileRoute("/")({
	validateSearch: (search) => parseFeedQuery(search),
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => Promise.all([listListings({ data: deps }), listPopularTags()]),
	head: () => ({ meta: [{ title: "GLYPH — открытые лоты" }] }),
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
var $$splitComponentImporter$10 = () => import("./admin-BZwe4wYm.mjs");
var Route$12 = createFileRoute("/admin")({
	head: () => ({ meta: [{ title: "Модерация — GLYPH" }] }),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("./login-swiRpWhL.mjs");
var Route$11 = createFileRoute("/login")({
	head: () => ({ meta: [{ title: "Вход — GLYPH" }] }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
var $$splitComponentImporter$8 = () => import("./me-9f6sSh7g.mjs");
var Route$10 = createFileRoute("/me")({
	head: () => ({ meta: [{ title: "Профиль — GLYPH" }] }),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("./notifications-0zaS1SzJ.mjs");
var Route$9 = createFileRoute("/notifications")({
	head: () => ({ meta: [{ title: "Уведомления — GLYPH" }] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
var $$splitComponentImporter$6 = () => import("./rules-DPoRLXCS.mjs");
var Route$8 = createFileRoute("/rules")({
	head: () => ({ meta: [{ title: "Правила — GLYPH" }] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./sell-C5xo05_V.mjs");
var Route$7 = createFileRoute("/sell")({
	head: () => ({ meta: [{ title: "Новый лот — GLYPH" }] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./terms-D0Nbiq59.mjs");
var Route$6 = createFileRoute("/terms")({
	head: () => ({ meta: [{ title: "Условия — GLYPH" }] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./deals.index-hLOockI1.mjs");
var Route$5 = createFileRoute("/deals/")({
	head: () => ({ meta: [{ title: "Сделки — GLYPH" }] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./deals._id-BZEAjovC.mjs");
var Route$4 = createFileRoute("/deals/$id")({
	head: () => ({ meta: [{ title: "Сделка — GLYPH" }] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./lot._id-D6hOExrQ.mjs");
var Route$3 = createFileRoute("/lot/$id")({
	loader: async ({ params }) => {
		if (!UUID_RE.test(params.id)) return null;
		return getListing({ data: params.id });
	},
	head: ({ loaderData }) => ({ meta: [{ title: loaderData?.title ? `${loaderData.title} — GLYPH` : "Лот — GLYPH" }] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./u._handle-BJIbMWKe.mjs");
var Route$2 = createFileRoute("/u/$handle")({
	loader: ({ params }) => getPublicProfile({ data: params.handle }),
	head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `@${loaderData.handle} — GLYPH` : "Профиль — GLYPH" }] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var Route$1 = createFileRoute("/api/auth/$")({ server: { handlers: {
	GET: ({ request }) => auth.handler(request),
	POST: ({ request }) => auth.handler(request)
} } });
var INLINE = /* @__PURE__ */ new Set([
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp"
]);
var Route = createFileRoute("/api/media/$id")({ server: { handlers: { GET: async ({ params }) => {
	if (!UUID_RE.test(params.id)) return new Response("bad", { status: 400 });
	const { getSql } = await import("./shared-DmOvjmfI.mjs").then((n) => n.C).then((n) => n.S);
	const { getSessionUser } = await import("./verify.server-C3JA8dRF.mjs");
	const sql = await getSql();
	const row = (await sql`
          select m.kind, m.mime, m.filename, m.data_b64, m.listing_id, l.status, l.seller_id
          from media m
          join listings l on l.id = m.listing_id
          where m.id = ${params.id}
        `)[0];
	if (!row) return new Response("not found", { status: 404 });
	if (row.kind === "file") {
		const user = await getSessionUser();
		if (!user) return new Response("unauthorized", { status: 401 });
		if (user.id !== row.seller_id) {
			const deal = await sql`
              select status, buyer_id from deals where listing_id = ${row.listing_id}
            `;
			if (!(deal[0] && deal[0].buyer_id === user.id && (deal[0].status === "files_released" || deal[0].status === "completed" || deal[0].status === "confirmed"))) return new Response("forbidden", { status: 403 });
		}
	} else if (row.status === "removed") {
		const user = await getSessionUser();
		if (!user || user.id !== row.seller_id) return new Response("not found", { status: 404 });
	}
	const bytes = Buffer.from(row.data_b64, "base64");
	const inline = INLINE.has(row.mime);
	const safe = row.filename.replace(/["\r\n]/g, "");
	const headers = new Headers({
		"Content-Type": inline ? row.mime : "application/octet-stream",
		"Content-Length": String(bytes.length),
		"X-Content-Type-Options": "nosniff",
		"Cache-Control": row.kind === "preview" ? "public, max-age=3600" : "private, no-store",
		"Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(safe)}"; filename*=UTF-8''${encodeURIComponent(safe)}`
	});
	return new Response(bytes, {
		status: 200,
		headers
	});
} } } });
var IndexRoute = Route$13.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$14
});
var AdminRoute = Route$12.update({
	id: "/admin",
	path: "/admin",
	getParentRoute: () => Route$14
});
var LoginRoute = Route$11.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => Route$14
});
var MeRoute = Route$10.update({
	id: "/me",
	path: "/me",
	getParentRoute: () => Route$14
});
var NotificationsRoute = Route$9.update({
	id: "/notifications",
	path: "/notifications",
	getParentRoute: () => Route$14
});
var RulesRoute = Route$8.update({
	id: "/rules",
	path: "/rules",
	getParentRoute: () => Route$14
});
var SellRoute = Route$7.update({
	id: "/sell",
	path: "/sell",
	getParentRoute: () => Route$14
});
var TermsRoute = Route$6.update({
	id: "/terms",
	path: "/terms",
	getParentRoute: () => Route$14
});
var DealsIndexRoute = Route$5.update({
	id: "/deals/",
	path: "/deals/",
	getParentRoute: () => Route$14
});
var rootRouteChildren = {
	IndexRoute,
	AdminRoute,
	LoginRoute,
	MeRoute,
	NotificationsRoute,
	RulesRoute,
	SellRoute,
	TermsRoute,
	DealsIdRoute: Route$4.update({
		id: "/deals/$id",
		path: "/deals/$id",
		getParentRoute: () => Route$14
	}),
	LotIdRoute: Route$3.update({
		id: "/lot/$id",
		path: "/lot/$id",
		getParentRoute: () => Route$14
	}),
	UHandleRoute: Route$2.update({
		id: "/u/$handle",
		path: "/u/$handle",
		getParentRoute: () => Route$14
	}),
	DealsIndexRoute,
	ApiAuthSplatRoute: Route$1.update({
		id: "/api/auth/$",
		path: "/api/auth/$",
		getParentRoute: () => Route$14
	}),
	ApiMediaIdRoute: Route.update({
		id: "/api/media/$id",
		path: "/api/media/$id",
		getParentRoute: () => Route$14
	})
};
var routeTree = Route$14._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		rewrite: previewPathRewrite(),
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { reportListing as C, updateProfile as D, updateListingCopy as E, uploadMedia as O, placeBid as S, suggestTags as T, getListing as _, Route$13 as a, listNotifications as b, adminOverview as c, cancelListing as d, completeDeal as f, getDeal as g, deleteMedia as h, Route$4 as i, useCurrentUserState as k, buyFixed as l, createListing as m, Route$2 as n, RedirectToSignIn as o, confirmPayment as p, Route$3 as r, adminModerate as s, router_exports as t, buyNow as u, getMe as v, sendMessage as w, markNotificationsRead as x, listDeals as y };
