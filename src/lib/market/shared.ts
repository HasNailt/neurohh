import type { AccentId, AvatarFrame, BannerOverlay, ThemeId } from "@/lib/market/themes";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PREVIEW_MAX = 4 * 1024 * 1024;
export const FILE_MAX = 4 * 1024 * 1024;
export const MAX_DIM = 4000;
export const MAX_PREVIEWS = 4;
export const PREMIUM_PREVIEWS = 8;
export const MAX_FILES = 6;
export const BLURB_MAX = 400;
export const PREMIUM_BLURB_MAX = 1200;
export const ACTIVE_LOT_LIMIT = 5;
export const PREMIUM_ACTIVE_LOT_LIMIT = 15;
export const PIN_LIMIT = 3;
export const CHAT_IMAGE_MAX = 3 * 1024 * 1024;
export const CHAT_IMAGE_DIM = 3000;
export const CHAT_IMAGE_COUNT = 10;
export const AVATAR_MAX = 2 * 1024 * 1024;
export const AVATAR_DIM = 1000;
export const PAGE_SIZE = 12;
export const GRID_PAGE = 60;
export const TOP_LIMIT = 30;
export const PROFILE_LOT_PAGE = 60;
export const NEW_USER_MS = 30 * 24 * 60 * 60 * 1000;

export const DURATIONS = [
  { hours: 1, label: "1 час" },
  { hours: 6, label: "6 часов" },
  { hours: 12, label: "12 часов" },
  { hours: 24, label: "1 день" },
  { hours: 72, label: "3 дня" },
  { hours: 168, label: "7 дней" },
] as const;

export const SNIPE_OPTIONS = [0, 10, 30, 60] as const;

export type Tag = { slug: string; label: string };
export type ListingStatus = "active" | "sold" | "ended" | "removed" | "draft";
export type DealStatus = "awaiting_payment" | "confirmed" | "files_released" | "completed";
export type Role = "user" | "moderator" | "admin";
export type ArtistStatus = "open" | "busy" | "closed" | "away";
export type BadgeId = "verified" | "top";
export type SocialLink = { label: string; url: string };
export type ProfileImageKind = "avatar" | "banner" | "background";

export type Look = {
  theme: ThemeId;
  accent: AccentId;
  avatarFrame: AvatarFrame;
  bannerOverlay: BannerOverlay;
};

export function asRole(value: unknown): Role {
  return value === "admin" || value === "moderator" || value === "user" ? value : "user";
}

export function isStaff(role: Role): boolean {
  return role === "admin" || role === "moderator";
}

export function formatDealNo(n: number): string {
  return `#${n}`;
}

export function providerLabel(id: string): string {
  switch (id) {
    case "credential":
      return "email";
    case "google":
    case "grok-google":
      return "Google";
    case "vk":
      return "ВКонтакте";
    case "telegram":
      return "Telegram";
    case "grok-gate":
      return "Grok";
    default:
      return id;
  }
}

export function roleLabel(role: Role): string {
  if (role === "admin") return "администратор";
  if (role === "moderator") return "модератор";
  return "участник";
}

export function asStatus(value: unknown): ArtistStatus {
  if (value === "busy" || value === "closed" || value === "away" || value === "open") return value;
  return "open";
}

export function statusLabel(status: ArtistStatus): string {
  if (status === "busy") return "занят";
  if (status === "closed") return "закрыт к заказам";
  if (status === "away") return "не на связи";
  return "открыт к заказам";
}

export function badgeLabel(badge: BadgeId): string {
  return badge === "verified" ? "Проверенный" : "Топ-продавец";
}

export function listingStatusLabel(status: ListingStatus): string {
  if (status === "active") return "идёт";
  if (status === "sold") return "продан";
  if (status === "ended") return "завершён";
  if (status === "removed") return "снят";
  return "черновик";
}

export function dealStatusLabel(status: DealStatus): string {
  if (status === "completed") return "закрыта";
  if (status === "confirmed") return "подтверждено";
  if (status === "files_released") return "файлы выданы";
  return "открыта";
}

export type PayKind = "rub" | "sw";

export function asPay(value: unknown): PayKind {
  return value === "sw" ? "sw" : "rub";
}

export function payLabel(kind: PayKind): string {
  return kind === "sw" ? "Токены SW" : "Денежная ставка";
}

export function formatPrice(n: number, currency: PayKind = "rub"): string {
  const value = Math.round(n).toLocaleString("ru-RU");
  return currency === "sw" ? `${value} SW` : `${value} ₽`;
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function formatLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${days}д ${pad(hours)}:${pad(minutes)}`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function cleanHandle(raw: string): string | null {
  const handle = raw.trim().toLocaleLowerCase("ru");
  if (!/^[\p{L}\p{N}_]{3,20}$/u.test(handle)) return null;
  return handle;
}

export function slugHandle(raw: string): string | null {
  const slug = raw
    .trim()
    .toLocaleLowerCase("ru")
    .replace(/[^\p{L}\p{N}_]+/gu, "")
    .slice(0, 20);
  return slug.length >= 3 ? slug : null;
}

export function likeContains(q: string): string {
  return `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

export function parsePrice(value: unknown): number | null {
  const raw = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/\s/g, "")) : NaN;
  if (!Number.isInteger(raw) || raw < 1 || raw > 100_000_000) return null;
  return raw;
}

export function tagParts(raw: string): { slug: string; label: string } | null {
  const label = raw.replace(/\s+/g, " ").trim().slice(0, 24);
  if (!/^[\p{L}\p{N} _-]{2,24}$/u.test(label)) return null;
  return { slug: label.toLocaleLowerCase("ru"), label };
}

export function asBadges(value: unknown): BadgeId[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.replace(/[{}"]/g, "").split(",").map((item) => item.trim()).filter(Boolean)
      : [];
  const out: BadgeId[] = [];
  for (const item of raw) {
    if ((item === "verified" || item === "top") && !out.includes(item)) out.push(item);
  }
  return out;
}

export function asLinks(value: unknown): SocialLink[] {
  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const out: SocialLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.label !== "string" || typeof rec.url !== "string") continue;
    if (!rec.label || !rec.url) continue;
    out.push({ label: rec.label, url: rec.url });
  }
  return out;
}

export function profileImageUrl(handle: string, kind: ProfileImageKind): string {
  return `/api/profile-image/${encodeURIComponent(handle)}?kind=${kind}`;
}

export function isNewAccount(createdAt: string, now = Date.now()): boolean {
  const time = new Date(createdAt).getTime();
  return Number.isFinite(time) && now - time >= 0 && now - time < NEW_USER_MS;
}

export function errText(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string" && err.message) {
    return err.message;
  }
  if (typeof err === "string" && err) return err;
  return "Что-то пошло не так";
}

export type ListingCard = {
  id: string;
  title: string;
  kind: "fixed" | "auction";
  price: number;
  buyNow: number | null;
  currentBid: number | null;
  bidCount: number;
  bidStep: number;
  currency: PayKind;
  likeCount: number;
  liked: boolean;
  pinned: boolean;
  boosted: boolean;
  sellerPremium: boolean;
  endsAt: string | null;
  status: ListingStatus;
  sellerId: string;
  sellerHandle: string;
  sellerName: string;
  previewId: string | null;
  previewSrc: string | null;
  tags: Tag[];
};

export type FeedQuery = {
  q: string;
  tag: string;
  kind: "all" | "fixed" | "auction";
  sort: "new" | "ending" | "price";
  page: number;
};

export type FeedResult = { items: ListingCard[]; total: number; hasMore: boolean };

export type BidRow = { id: string; amount: number; handle: string; premium: boolean; createdAt: string };

export type MediaMeta = { id: string; filename: string; mime: string; sizeBytes: number };

export type ListingDetail = ListingCard & {
  blurb: string;
  winnerId: string | null;
  antiSnipeMinutes: number;
  createdAt: string;
  previews: { id: string; src: string | null; card: string | null }[];
  bids: BidRow[];
  dealId: string | null;
  privateDescription: string | null;
  files: MediaMeta[] | null;
  comments: ProfileComment[];
  currentBidderId: string | null;
};

export type Profile = {
  userId: string;
  handle: string;
  displayName: string;
  bio: string;
  role: Role;
  banned: boolean;
  status: ArtistStatus;
  links: SocialLink[];
  badges: BadgeId[];
  premium: boolean;
  premiumUntil: string | null;
  premiumForever: boolean;
} & Look;

export type Me = Profile & {
  unread: number;
  hasAvatar: boolean;
  hasBanner: boolean;
  hasBackground: boolean;
};

export type ProfileComment = {
  id: string;
  body: string;
  createdAt: string;
  authorHandle: string;
  authorName: string;
  authorPremium: boolean;
};

export type PublicProfile = {
  handle: string;
  displayName: string;
  bio: string;
  role: Role;
  status: ArtistStatus;
  links: SocialLink[];
  badges: BadgeId[];
  createdAt: string;
  isNew: boolean;
  following: boolean;
  hasAvatar: boolean;
  hasBanner: boolean;
  hasBackground: boolean;
  premium: boolean;
  lots: ListingCard[];
  lotTotal: number;
  posts: AuthorPost[];
  followers: number;
} & Look;

export type PostComment = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  authorHandle: string;
  authorName: string;
  authorPremium: boolean;
};

export type PostImage = { id: string; src: string };

export type AuthorPost = {
  id: string;
  body: string;
  createdAt: string;
  pinned: boolean;
  authorHandle: string;
  authorName: string;
  authorIsNew: boolean;
  authorPremium: boolean;
  images: PostImage[];
  comments: PostComment[];
};

export type FeedEntry =
  | { kind: "lot"; at: string; lot: ListingCard; authorIsNew: boolean }
  | { kind: "post"; at: string; post: AuthorPost };

export type PersonHit = {
  handle: string;
  displayName: string;
  premium: boolean;
};

export type DealSummary = {
  id: string;
  publicNo: number;
  listingId: string | null;
  title: string;
  previewId: string | null;
  amount: number;
  currency: PayKind;
  status: DealStatus;
  sellerHandle: string;
  buyerHandle: string;
  sellerPremium: boolean;
  buyerPremium: boolean;
  youAre: "seller" | "buyer";
  createdAt: string;
};

export type ChatImage = {
  id: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  handle: string | null;
  body: string;
  createdAt: string;
  system: boolean;
  premium: boolean;
  images: ChatImage[];
};

export type DealDetail = {
  id: string;
  publicNo: number;
  listingId: string | null;
  listingGone: boolean;
  title: string;
  previewId: string | null;
  amount: number;
  currency: PayKind;
  status: DealStatus;
  youAre: "seller" | "buyer";
  seller: { id: string; handle: string; name: string; premium: boolean };
  buyer: { id: string; handle: string; name: string; premium: boolean };
  sellerConfirmed: boolean;
  buyerConfirmed: boolean;
  privateDescription: string | null;
  files: MediaMeta[] | null;
  messages: ChatMessage[];
};

export type StaffDeal = {
  id: string;
  publicNo: number;
  title: string;
  listingGone: boolean;
  amount: number;
  currency: PayKind;
  status: DealStatus;
  seller: { handle: string; name: string; premium: boolean };
  buyer: { handle: string; name: string; premium: boolean };
  messages: ChatMessage[];
};

export type Notice = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
};

export type DirectMessage = {
  id: string;
  handle: string;
  body: string;
  createdAt: string;
  mine: boolean;
  premium: boolean;
};

export type ThreadPreview = {
  id: string;
  otherHandle: string;
  otherName: string;
  otherPremium: boolean;
  lastBody: string | null;
  updatedAt: string;
};

export type ThreadDetail = ThreadPreview & { messages: DirectMessage[] };

export type AdminAction =
  | { action: "remove-listing"; listingId: string }
  | { action: "dismiss-report"; reportId: string }
  | { action: "action-report"; reportId: string }
  | { action: "ban"; userId: string; banned: boolean }
  | { action: "set-role"; userId: string; role: Role }
  | { action: "set-badges"; userId: string; badges: BadgeId[] }
  | { action: "set-require-invite"; enabled: boolean }
  | { action: "create-invite"; maxUses: number; note: string }
  | { action: "revoke-invite"; inviteId: string }
  | { action: "grant-premium-month"; userId: string }
  | { action: "grant-premium-forever"; userId: string }
  | { action: "revoke-premium"; userId: string };

export type InviteRow = {
  id: string;
  code: string;
  note: string;
  maxUses: number;
  uses: number;
  revoked: boolean;
  createdAt: string;
};

export type AdminData = {
  viewerRole: Role;
  counts: { listings: number; deals: number; openReports: number; users: number };
  requireInvite: boolean;
  invites: InviteRow[];
  reports: {
    id: string;
    reason: string;
    listingId: string | null;
    listingTitle: string | null;
    reporterHandle: string;
    createdAt: string;
  }[];
  listings: { id: string; title: string; status: string; handle: string; kind: string }[];
  deals: {
    id: string;
    publicNo: number;
    title: string;
    status: DealStatus;
    sellerHandle: string;
    buyerHandle: string;
  }[];
  users: {
    userId: string;
    handle: string;
    displayName: string;
    banned: boolean;
    role: Role;
    providers: string[];
    badges: BadgeId[];
    premium: boolean;
    premiumForever: boolean;
    premiumUntil: string | null;
  }[];
};

export function parseFeedQuery(input: unknown): FeedQuery {
  const s = (input ?? {}) as Record<string, unknown>;
  const kind = s.kind === "auction" || s.kind === "fixed" ? s.kind : "all";
  const sort = s.sort === "ending" || s.sort === "price" ? s.sort : "new";
  const pageRaw = Number(s.page);
  const page = Number.isInteger(pageRaw) && pageRaw > 0 && pageRaw < 100 ? pageRaw : 1;
  const q = typeof s.q === "string" ? s.q.trim().slice(0, 80) : "";
  const tag = typeof s.tag === "string" ? s.tag.trim().toLocaleLowerCase("ru").slice(0, 24) : "";
  return { q, tag, kind, sort, page };
}
