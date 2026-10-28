//#region node_modules/.nitro/vite/services/ssr/assets/shared-CQ2SO6Dv.js
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var PREVIEW_MAX = 4194304;
var FILE_MAX = 4194304;
var MAX_DIM = 4e3;
var DURATIONS = [
	{
		hours: 1,
		label: "1 час"
	},
	{
		hours: 6,
		label: "6 часов"
	},
	{
		hours: 12,
		label: "12 часов"
	},
	{
		hours: 24,
		label: "1 день"
	},
	{
		hours: 72,
		label: "3 дня"
	},
	{
		hours: 168,
		label: "7 дней"
	}
];
var SNIPE_OPTIONS = [
	2,
	3,
	5,
	10
];
function asRole(value) {
	return value === "admin" || value === "moderator" || value === "user" ? value : "user";
}
function isStaff(role) {
	return role === "admin" || role === "moderator";
}
function formatDealNo(n) {
	return `#${n}`;
}
function providerLabel(id) {
	switch (id) {
		case "credential": return "email";
		case "grok-google": return "Google";
		case "vk": return "ВКонтакте";
		case "telegram": return "Telegram";
		case "grok-gate": return "Grok";
		default: return id;
	}
}
function roleLabel(role) {
	if (role === "admin") return "администратор";
	if (role === "moderator") return "модератор";
	return "участник";
}
function asStatus(value) {
	if (value === "busy" || value === "closed" || value === "away" || value === "open") return value;
	return "open";
}
function statusLabel(status) {
	if (status === "busy") return "занят";
	if (status === "closed") return "не беру заказы";
	if (status === "away") return "пауза";
	return "открыт к заказам";
}
function badgeLabel(id) {
	return id === "verified" ? "Проверенный" : "Топ-продавец";
}
function asBadges(value) {
	const raw = Array.isArray(value) ? value : typeof value === "string" ? value.replace(/[{}"]/g, "").split(",").map((s) => s.trim()).filter(Boolean) : [];
	const out = [];
	for (const item of raw) if ((item === "verified" || item === "top") && !out.includes(item)) out.push(item);
	return out;
}
function asLinks(value) {
	let raw = value;
	if (typeof value === "string") try {
		raw = JSON.parse(value);
	} catch {
		raw = [];
	}
	if (!Array.isArray(raw)) return [];
	const out = [];
	for (const item of raw) {
		if (!item || typeof item !== "object") continue;
		const label = "label" in item && typeof item.label === "string" ? item.label : "";
		const url = "url" in item && typeof item.url === "string" ? item.url : "";
		if (!label || !/^https?:\/\//i.test(url)) continue;
		out.push({
			label,
			url
		});
		if (out.length === 5) break;
	}
	return out;
}
function profileImageUrl(handle, kind) {
	return `/api/profile-image/${encodeURIComponent(handle)}?kind=${kind}`;
}
function parseFeedQuery(input) {
	const s = input ?? {};
	const kind = s.kind === "auction" || s.kind === "fixed" ? s.kind : "all";
	const sort = s.sort === "ending" || s.sort === "price" ? s.sort : "new";
	const pageRaw = Number(s.page);
	const page = Number.isInteger(pageRaw) && pageRaw > 0 && pageRaw < 100 ? pageRaw : 1;
	return {
		q: typeof s.q === "string" ? s.q.trim().slice(0, 80) : "",
		tag: typeof s.tag === "string" ? s.tag.trim().toLocaleLowerCase("ru").slice(0, 24) : "",
		kind,
		sort,
		page
	};
}
function tagParts(raw) {
	const label = raw.trim().replace(/\s+/g, " ");
	const slug = label.toLocaleLowerCase("ru");
	if (slug.length < 2 || slug.length > 24) return null;
	if (!/^[\p{L}\p{N} ]+$/u.test(label)) return null;
	return {
		slug,
		label
	};
}
function cleanHandle(raw) {
	const h = raw.trim().toLocaleLowerCase("ru");
	if (!/^[\p{L}\p{N}_]{3,20}$/u.test(h)) return null;
	return h;
}
/** Auto nick from a display name or email: drops spaces and punctuation. */
function slugHandle(raw) {
	const h = raw.trim().toLocaleLowerCase("ru").replace(/[^\p{L}\p{N}_]+/gu, "").slice(0, 20);
	if (h.length < 3) return null;
	return h;
}
function parsePrice(n) {
	const x = typeof n === "number" ? n : typeof n === "string" && n.trim() ? Number(n) : NaN;
	if (!Number.isInteger(x) || x < 1 || x > 1e8) return null;
	return x;
}
function formatPrice(n) {
	return `${new Intl.NumberFormat("ru-RU").format(n)}\u00a0₽`;
}
function formatLeft(iso) {
	const ms = new Date(iso).getTime() - Date.now();
	if (ms <= 0) return "00:00:00";
	const s = Math.floor(ms / 1e3);
	const d = Math.floor(s / 86400);
	const h = Math.floor(s % 86400 / 3600);
	const m = Math.floor(s % 3600 / 60);
	const sec = s % 60;
	const pad = (v) => String(v).padStart(2, "0");
	if (d > 0) return `${d}д ${pad(h)}:${pad(m)}:${pad(sec)}`;
	return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}
function formatWhen(iso) {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit"
	}).format(d);
}
function dealStatusLabel(status) {
	switch (status) {
		case "awaiting_payment": return "Ожидание оплаты";
		case "confirmed": return "Подтверждено обеими";
		case "files_released": return "Файлы выданы";
		case "completed": return "Завершено";
	}
}
function listingStatusLabel(status) {
	switch (status) {
		case "active": return "Активен";
		case "sold": return "Продан";
		case "ended": return "Завершён";
		case "removed": return "Снят";
	}
}
function likeContains(s) {
	return `%${s.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}
function errText(e) {
	if (e instanceof Error && e.message) {
		if (e.message === "Unauthorized") return "Нужно войти";
		return e.message;
	}
	return "Что-то пошло не так";
}
//#endregion
export { parsePrice as C, slugHandle as D, roleLabel as E, statusLabel as O, parseFeedQuery as S, providerLabel as T, formatPrice as _, SNIPE_OPTIONS as a, likeContains as b, asLinks as c, badgeLabel as d, cleanHandle as f, formatLeft as g, formatDealNo as h, PREVIEW_MAX as i, tagParts as k, asRole as l, errText as m, FILE_MAX as n, UUID_RE as o, dealStatusLabel as p, MAX_DIM as r, asBadges as s, DURATIONS as t, asStatus as u, formatWhen as v, profileImageUrl as w, listingStatusLabel as x, isStaff as y };
