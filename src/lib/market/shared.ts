export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PREVIEW_MAX = 4 * 1024 * 1024;
export const FILE_MAX = 4 * 1024 * 1024;
export const MAX_DIM = 4000;
export const MAX_PREVIEWS = 4;
export const MAX_FILES = 6;
export const BLURB_MAX = 400;
export const CHAT_IMAGE_MAX = 3 * 1024 * 1024;
export const CHAT_IMAGE_DIM = 3000;
export const CHAT_IMAGE_COUNT = 10;
export const PAGE_SIZE = 12;
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

export const SNIPE_OPTIONS = [2, 3, 5, 10] as const;

export type Tag = { slug: string; label: string };
export type ListingStatus = "active" | "sold" | "ended" | "removed" | "draft";
export type DealStatus = "awaiting_payment" | "confirmed" | "files_released" | "completed";
export type Role = "user" | "moderator" | "admin";
export type ArtistStatus = "open" | "busy" | "closed" | "away";
export type BadgeId = "verified" | "top";
export type SocialLink = { label: string; url: string };
export type ProfileImageKind = "avatar" | "banner" | "background";

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
  if (status === "closed") return "не беру заказы";
  if (status === "away") return "пауза";
  return "открыт к заказам";
}

export function badgeLabel(id: BadgeId): string {
  return id === "verified" ? "Проверенный" : "Топ-продавец";
}

export function isNewAccount(createdAt: string): boolean {
  const at = new Date(createdAt).getTime();
  if (Number.isNaN(at)) return false;
  return Date.now() - at < NEW_USER_MS;
}

export function asBadges(value: unknown): BadgeId[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value
          .replace(/[{}"]/g, "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  const out: BadgeId[] = [];
  for (const item of raw) {
    if ((item === "verified" || item === "top") && !out.includes(item)) out.push(item);
  }
  return out;
}

export function asLinks(value: unknown): SocialLink[] {
  let raw: unknown = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value) as unknown;
    } catch {
      raw = [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const out: SocialLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const label = "label" in item && typeof item.label === "string" ? item.label : "";
    const url = "url" in item && typeof item.url === "string" ? item.url : "";
    if (!label || !/^https?:\/\//i.test(url)) continue;
    out.push({ label, url });
    if (out.length === 5) break;
  }
  return out;
}

export function profileImageUrl(handle: string, kind: ProfileImageKind): string {
  return `/api/profile-image/${encodeURIComponent(handle)}?kind=${kind}`;
}

export type ListingCard = {
  id: string;
  title: string;
  kind: "fixed" | "auction";
  price: number;
  buyNow: number | null;
  currentBid: number | null;
  bidCount: number;
  likeCount: number;
  liked: boolean;
  pinned: boolean;
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

export type BidRow = { id: string; amount: number; handle: string; createdAt: string };

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
};

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
  lots: ListingCard[];
  lotTotal: number;
  posts: AuthorPost[];
};

export type PostComment = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  authorHandle: string;
  authorName: string;
};

export type PostImage = { id: string; src: string };

export type AuthorPost = {
  id: string;
  body: string;
  createdAt: string;
  authorHandle: string;
  authorName: string;
  authorIsNew: boolean;
  images: PostImage[];
  comments: PostComment[];
};

export type FeedEntry =
  | { kind: "lot"; at: string; lot: ListingCard; authorIsNew: boolean }
  | { kind: "post"; at: string; post: AuthorPost };

export type DealSummary = {
  id: string;
  publicNo: number;
  listingId: string;
  title: string;
  previewId: string | null;
  amount: number;
  status: DealStatus;
  sellerHandle: string;
  buyerHandle: string;
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
  images: ChatImage[];
};

export type DealDetail = {
  id: string;
  publicNo: number;
  listingId: string;
  title: string;
  previewId: string | null;
  amount: number;
  status: DealStatus;
  youAre: "seller" | "buyer";
  seller: { id: string; handle: string; name: string };
  buyer: { id: string; handle: string; name: string };
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
  amount: number;
  status: DealStatus;
  seller: { handle: string; name: string };
  buyer: { handle: string; name: string };
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
};

export type ThreadPreview = {
  id: string;
  otherHandle: string;
  otherName: string;
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
  | { action: "revoke-invite"; inviteId: string };

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
  }[];
};

export function parseFeedQuery(input: unknown): FeedQuery {
  const s = (input ?? {}) as Record<string, unknown>;
  const kind = s.kind === "auction" || s.kind === "fixed" ? s.kind : "all";
  const sort = s.sort === "ending" || s.sort === "price" ? s.sort : "new";
  const pageRaw = Number(s.page);
  const page = Number.isInteger(pageRaw) && pageRaw > 0 && pageRaw < 100 ? pageRaw : 1;
  const q = typeof s.q === "string" ? s.q.trim().slice(0, 80) : "";
  const tag =
    typeof s.tag === "string" ? s.tag.trim().toLocaleLowerCase("ru").slice(0, 24) : "";
  return { q, tag, kind, sort, page };
}

export function tagParts(raw: string): { slug: string; label: string } | null {
  const label = raw.trim().replace(/\s+/g, " ");
  const slug = label.toLocaleLowerCase("ru");
  if (slug.length < 2 || slug.length > 24) return null;
  if (!/^[\p{L}\p{N} ]+$/u.test(label)) return null;
  return { slug, label };
}

export function cleanHandle(raw: string): string | null {
  const h = raw.trim().toLocaleLowerCase("ru");
  if (!/^[\p{L}\p{N}_]{3,20}$/u.test(h)) return null;
  return h;
}

/** Auto nick from a display name or email: drops spaces and punctuation. */
export function slugHandle(raw: string): string | null {
  const h = raw.trim().toLocaleLowerCase("ru").replace(/[^\p{L}\p{N}_]+/gu, "").slice(0, 20);
  if (h.length < 3) return null;
  return h;
}

export function parsePrice(n: unknown): number | null {
  const x = typeof n === "number" ? n : typeof n === "string" && n.trim() ? Number(n) : NaN;
  if (!Number.isInteger(x) || x < 1 || x > 1e8) return null;
  return x;
}

export function formatPrice(n: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(n)}\u00a0₽`;
}

export function formatLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (v: number) => String(v).padStart(2, "0");
  if (d > 0) return `${d}д ${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} Б`;
  if (n < 1048576) return `${Math.round(n / 102.4) / 10} КБ`;
  return `${Math.round(n / 104857.6) / 10} МБ`;
}

export function dealStatusLabel(status: DealStatus): string {
  return status === "completed" ? "Закрыто" : "Открыто";
}

export function listingStatusLabel(status: ListingStatus): string {
  switch (status) {
    case "active":
      return "Активен";
    case "sold":
      return "Продан";
    case "ended":
      return "Завершён";
    case "removed":
      return "Снят";
    case "draft":
      return "Черновик";
  }
}

export function likeContains(s: string): string {
  return `%${s.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

export function errText(e: unknown): string {
  if (e instanceof Error && e.message) {
    if (e.message === "Unauthorized") return "Нужно войти";
    return e.message;
  }
  return "Что-то пошло не так";
}
