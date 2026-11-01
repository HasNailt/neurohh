import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { optionalAuth } from "@/lib/market/optional-auth";
import { decodedImageSize, isRaster, psdSize, sniffMagic } from "@/lib/market/images";
import { asAccent, asFrame, asOverlay, asTheme, premiumActive } from "@/lib/market/themes";
import {
  ACTIVE_LOT_LIMIT,
  BLURB_MAX,
  CHAT_IMAGE_COUNT,
  CHAT_IMAGE_DIM,
  CHAT_IMAGE_MAX,
  FILE_MAX,
  MAX_DIM,
  MAX_FILES,
  MAX_PREVIEWS,
  GRID_PAGE,
  PAGE_SIZE,
  PIN_LIMIT,
  PREMIUM_ACTIVE_LOT_LIMIT,
  PREMIUM_BLURB_MAX,
  PREMIUM_PREVIEWS,
  PREVIEW_MAX,
  PROFILE_LOT_PAGE,
  SNIPE_OPTIONS,
  TOP_LIMIT,
  UUID_RE,
  cleanHandle,
  slugHandle,
  likeContains,
  parseFeedQuery,
  parsePrice,
  tagParts,
  asRole,
  isStaff,
  isNewAccount,
  asBadges,
  asLinks,
  asStatus,
  type AdminData,
  type AuthorPost,
  type BidRow,
  type ChatImage,
  type ChatMessage,
  type DealDetail,
  type DealStatus,
  type DealSummary,
  type FeedEntry,
  type FeedResult,
  type ListingCard,
  type ListingDetail,
  type ListingStatus,
  type Me,
  type MediaMeta,
  type Notice,
  type PersonHit,
  type Profile,
  type ProfileComment,
  type ProfileImageKind,
  type PublicProfile,
  type Role,
  type SocialLink,
  type StaffDeal,
  type Tag,
  type ThreadDetail,
  type ThreadPreview,
} from "@/lib/market/shared";

function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString();
}

function isoOrNull(v: unknown): string | null {
  if (v == null) return null;
  return iso(v);
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asTags(v: unknown): Tag[] {
  const raw = typeof v === "string" ? (JSON.parse(v) as unknown) : v;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((t) => {
    if (!t || typeof t !== "object") return [];
    const slug = "slug" in t && typeof t.slug === "string" ? t.slug : "";
    const label = "label" in t && typeof t.label === "string" ? t.label : "";
    return slug && label ? [{ slug, label }] : [];
  });
}

function cleanText(s: string, max: number): string {
  const cleaned = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  return Array.from(cleaned).slice(0, max).join("");
}

function fail(message: string): never {
  throw new Error(message);
}

type ProfileRow = {
  user_id: string;
  handle: string;
  display_name: string;
  bio: string;
  role: string;
  banned: boolean;
  status: string;
  links: unknown;
  badges: unknown;
  premium_forever: boolean;
  premium_until: unknown;
  theme: string;
  accent: string;
  avatar_frame: string;
  banner_overlay: string;
};

const PROFILE_SELECT = `user_id, handle, display_name, bio, role, banned, status, links, badges, premium_forever, premium_until, theme, accent, avatar_frame, banner_overlay`;

function mapProfile(row: ProfileRow): Profile {
  const until = row.premium_until == null ? null : iso(row.premium_until);
  const forever = Boolean(row.premium_forever);
  return {
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio,
    role: asRole(row.role),
    banned: Boolean(row.banned),
    status: asStatus(row.status),
    links: asLinks(row.links),
    badges: asBadges(row.badges),
    premium: premiumActive(forever, until),
    premiumUntil: until,
    premiumForever: forever,
    theme: asTheme(row.theme),
    accent: asAccent(row.accent),
    avatarFrame: asFrame(row.avatar_frame),
    bannerOverlay: asOverlay(row.banner_overlay),
  };
}

async function ensureProfile(sql: Sql, userId: string): Promise<Profile> {
  const found = await sql.query<ProfileRow>(`select ${PROFILE_SELECT} from profiles where user_id = $1`, [userId]);
  if (found[0]) return mapProfile(found[0]);

  const users = await sql<{ name: string; email: string }>`
    select name, email from "user" where id = ${userId}
  `;
  const name = cleanText(users[0]?.name || "Художник", 40) || "Художник";
  const email = users[0]?.email ?? "";
  const seed = slugHandle(name) ?? slugHandle(email.split("@")[0] ?? "") ?? "artist";
  const base = seed.length >= 3 ? seed : "artist";

  for (let i = 0; i < 8; i += 1) {
    const handle =
      i === 0 ? base.slice(0, 20) : `${base.slice(0, 14)}${1000 + Math.floor(Math.random() * 9000)}`;
    try {
      const count = await sql<{ n: number }>`select count(*)::int as n from profiles`;
      const first = num(count[0]?.n) === 0;
      const role: Role = first ? "admin" : "user";
      await sql`
        insert into profiles (user_id, handle, display_name, bio, is_admin, role)
        values (${userId}, ${handle}, ${name}, '', ${first}, ${role})
      `;
      break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/duplicate|unique/i.test(msg)) throw e;
      const again = await sql.query<ProfileRow>(`select ${PROFILE_SELECT} from profiles where user_id = $1`, [userId]);
      if (again[0]) return mapProfile(again[0]);
    }
  }

  const ready = await sql.query<ProfileRow>(`select ${PROFILE_SELECT} from profiles where user_id = $1`, [userId]);
  if (!ready[0]) fail("Не удалось создать профиль");
  return mapProfile(ready[0]);
}

function assertLive(profile: Profile) {
  if (profile.banned) fail("Аккаунт ограничен модерацией");
}

async function notify(
  sql: Sql,
  userId: string,
  kind: string,
  title: string,
  body: string,
  href: string,
) {
  await sql`
    insert into notifications (id, user_id, kind, title, body, href)
    values (
      ${crypto.randomUUID()},
      ${userId},
      ${kind},
      ${title.slice(0, 140)},
      ${body.slice(0, 280)},
      ${href}
    )
  `;
}

type CloseRow = {
  id: string;
  title: string;
  seller_id: string;
  winner_id: string | null;
  amount: number;
};

async function openDeal(sql: Sql, row: CloseRow): Promise<string | null> {
  if (!row.winner_id) return null;
  const id = crypto.randomUUID();
  const inserted = await sql<{ id: string; public_no: number }>`
    insert into deals (id, listing_id, seller_id, buyer_id, amount, status)
    values (${id}, ${row.id}, ${row.seller_id}, ${row.winner_id}, ${num(row.amount)}, 'awaiting_payment')
    on conflict (listing_id) do nothing
    returning id, public_no
  `;
  const dealId =
    inserted[0]?.id ??
    (
      await sql<{ id: string }>`select id from deals where listing_id = ${row.id}`
    )[0]?.id;
  if (!dealId || !inserted[0]) return dealId ?? null;
  const publicNo = num(inserted[0].public_no);
  const href = `/deals/${dealId}`;
  const body = `«${row.title}» · #${publicNo} · ${num(row.amount)} ₽`;
  await notify(sql, row.seller_id, "deal", "Новая сделка", body, href);
  if (row.winner_id !== row.seller_id) {
    await notify(sql, row.winner_id, "deal", "Вы забрали лот", body, href);
  }
  return dealId;
}

async function settle(sql: Sql) {
  try {
    const closed = await sql<CloseRow>`
      update listings
      set status = case when current_bidder_id is null then 'ended' else 'sold' end,
          winner_id = current_bidder_id,
          updated_at = now()
      where status = 'active' and kind = 'auction' and ends_at is not null and ends_at <= now()
      returning id, title, seller_id, winner_id, coalesce(current_bid, price) as amount
    `;
    for (const row of closed) {
      if (row.winner_id) {
        await openDeal(sql, row);
      } else {
        await notify(
          sql,
          row.seller_id,
          "auction_end",
          "Аукцион завершён",
          `«${row.title}» закрыт без ставок`,
          `/lot/${row.id}`,
        );
      }
    }
    const missing = await sql<CloseRow>`
      select l.id, l.title, l.seller_id, l.winner_id, coalesce(l.current_bid, l.price) as amount
      from listings l
      left join deals d on d.listing_id = l.id
      where l.status = 'sold' and l.winner_id is not null and d.id is null
    `;
    for (const row of missing) await openDeal(sql, row);
  } catch (err) {
    console.error("[feed] settle failed", err);
  }
}

const CARD_SQL = `
  l.id, l.title, l.kind, l.price, l.buy_now, l.current_bid, l.bid_count,
  l.ends_at, l.status, l.seller_id, l.winner_id, l.pinned,
  (select count(*)::int from listing_likes lk where lk.listing_id = l.id) as like_count,
  coalesce(p.handle, '') as seller_handle, coalesce(p.display_name, '') as seller_name,
  (
    select m.id from media m
    where m.listing_id = l.id and m.kind = 'preview'
    order by m.created_at asc
    limit 1
  ) as preview_id,
  (
    select case
      when m.card_b64 is not null and length(m.card_b64) < 400000 then 'image/jpeg|' || m.card_b64
      when m.view_b64 is not null and length(m.view_b64) < 400000 then 'image/jpeg|' || m.view_b64
      else null
    end
    from media m
    where m.listing_id = l.id and m.kind = 'preview'
    order by m.created_at asc
    limit 1
  ) as preview_inline,
  coalesce((
    select json_agg(json_build_object('slug', t.slug, 'label', t.label) order by t.label)
    from listing_tags lt
    join tags t on t.id = lt.tag_id
    where lt.listing_id = l.id
  ), '[]'::json) as tags,
  (l.boosted_until is not null and l.boosted_until > now()) as boosted,
  (coalesce(p.premium_forever, false) or (p.premium_until is not null and p.premium_until > now())) as seller_premium
`;

type CardRow = {
  id: string;
  title: string;
  kind: "fixed" | "auction";
  price: number;
  buy_now: number | null;
  current_bid: number | null;
  bid_count: number;
  ends_at: unknown;
  status: ListingStatus;
  seller_id: string;
  winner_id: string | null;
  seller_handle: string;
  seller_name: string;
  preview_id: string | null;
  preview_inline: string | null;
  tags: unknown;
  like_count: number;
  pinned: boolean;
  boosted: boolean;
  seller_premium: boolean;
};

function inlineImage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cut = value.indexOf("|");
  if (cut < 6) return null;
  const mime = value.slice(0, cut);
  const b64 = value.slice(cut + 1);
  if (!mime.startsWith("image/") || b64.length < 32) return null;
  return `data:${mime};base64,${b64}`;
}

function mapCard(row: CardRow): ListingCard {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    price: num(row.price),
    buyNow: row.buy_now == null ? null : num(row.buy_now),
    currentBid: row.current_bid == null ? null : num(row.current_bid),
    bidCount: num(row.bid_count),
    likeCount: num(row.like_count),
    liked: false,
    pinned: Boolean(row.pinned),
    boosted: Boolean(row.boosted),
    sellerPremium: Boolean(row.seller_premium),
    endsAt: isoOrNull(row.ends_at),
    status: row.status,
    sellerId: row.seller_id,
    sellerHandle: row.seller_handle,
    sellerName: row.seller_name,
    previewId: row.preview_id,
    previewSrc: inlineImage(row.preview_inline),
    tags: asTags(row.tags),
  };
}

async function markLiked(sql: Sql, userId: string | null, cards: ListingCard[]): Promise<ListingCard[]> {
  if (!userId || cards.length === 0) return cards;
  const ids = cards.map((c) => c.id);
  const params: unknown[] = [userId, ...ids];
  const slots = ids.map((_, i) => `$${i + 2}`).join(", ");
  const rows = await sql.query<{ listing_id: string }>(
    `select listing_id from listing_likes where user_id = $1 and listing_id in (${slots})`,
    params,
  );
  const set = new Set(rows.map((r) => r.listing_id));
  return cards.map((c) => ({ ...c, liked: set.has(c.id) }));
}

async function attachTags(sql: Sql, listingId: string, raws: string[]) {
  const seen = new Set<string>();
  for (const raw of raws) {
    const parts = tagParts(raw);
    if (!parts || seen.has(parts.slug)) continue;
    seen.add(parts.slug);
    await sql`
      insert into tags (slug, label) values (${parts.slug}, ${parts.label})
      on conflict (slug) do nothing
    `;
    const tag = await sql<{ id: number }>`select id from tags where slug = ${parts.slug}`;
    if (!tag[0]) continue;
    await sql`
      insert into listing_tags (listing_id, tag_id) values (${listingId}, ${tag[0].id})
      on conflict do nothing
    `;
  }
}

export const listListings = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .validator((input: unknown) => parseFeedQuery(input))
  .handler(async ({ data, context }): Promise<FeedResult> => {
    const sql = await getSql();
    await settle(sql);
    const like = data.q ? likeContains(data.q) : "%";
    const pageSize = data.kind === "auction" || data.kind === "fixed" ? GRID_PAGE : PAGE_SIZE;
    const offset = (data.page - 1) * pageSize;
    const boostRank = "(l.boosted_until is not null and l.boosted_until > now()) desc";
    const premiumRank =
      "(coalesce(p.premium_forever, false) or (p.premium_until is not null and p.premium_until > now())) desc";
    const order =
      data.sort === "ending"
        ? `order by l.ends_at asc nulls last, ${premiumRank}, l.created_at desc`
        : data.sort === "price"
          ? `order by coalesce(l.current_bid, l.price) asc, ${premiumRank}, l.created_at desc`
          : `order by ${boostRank}, ${premiumRank}, l.created_at desc`;
    const where = `
      from listings l
      left join profiles p on p.user_id = l.seller_id
      where l.status = 'active'
        and ($1::text = '' or l.title ilike $2 escape '\\' or l.blurb ilike $2 escape '\\')
        and ($3::text = '' or exists (
          select 1 from listing_tags lt
          join tags t on t.id = lt.tag_id
          where lt.listing_id = l.id and t.slug = $3
        ))
        and ($4::text = 'all' or l.kind = $4)
    `;
    const params = [data.q, like, data.tag, data.kind];
    const totalRows = await sql.query<{ n: number }>(`select count(*)::int as n ${where}`, params);
    const items = await sql.query<CardRow>(
      `select ${CARD_SQL} ${where} ${order} limit $5 offset $6`,
      [...params, pageSize, offset],
    );
    const total = num(totalRows[0]?.n);
    const mapped = await markLiked(sql, context.userId, items.map(mapCard));
    return { items: mapped, total, hasMore: offset + items.length < total };
  });

export const listPopularTags = createServerFn({ method: "GET" }).handler(async (): Promise<Tag[]> => {
  const sql = await getSql();
  const rows = await sql<{ slug: string; label: string }>`
    select t.slug, t.label
    from tags t
    join listing_tags lt on lt.tag_id = t.id
    join listings l on l.id = lt.listing_id and l.status = 'active'
    group by t.id
    order by count(*) desc, t.label asc
    limit 18
  `;
  return rows.map((r) => ({ slug: r.slug, label: r.label }));
});

export const searchPeople = createServerFn({ method: "GET" })
  .validator((q: unknown) => (typeof q === "string" ? q.trim().replace(/^@+/, "").slice(0, 40) : ""))
  .handler(async ({ data: q }): Promise<PersonHit[]> => {
    if (q.length < 1) return [];
    const sql = await getSql();
    const like = likeContains(q);
    const rows = await sql<{ handle: string; display_name: string; premium: boolean }>`
      select handle, display_name,
        (coalesce(premium_forever, false) or (premium_until is not null and premium_until > now())) as premium
      from profiles
      where handle ilike ${like} escape '\\' or display_name ilike ${like} escape '\\'
      order by premium desc, handle asc
      limit 24
    `;
    return rows.map((row) => ({ handle: row.handle, displayName: row.display_name, premium: Boolean(row.premium) }));
  });

export const suggestTags = createServerFn({ method: "GET" })
  .validator((q: unknown) => (typeof q === "string" ? q : ""))
  .handler(async ({ data }): Promise<Tag[]> => {
    const sql = await getSql();
    const q = data.trim().toLocaleLowerCase("ru").replace(/[\\%_]/g, "").slice(0, 24);
    if (!q) return [];
    return sql<{ slug: string; label: string }>`
      select slug, label from tags
      where slug like ${`${q}%`}
      order by length(slug), label
      limit 8
    `;
  });

export const getListing = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
    return id;
  })
  .handler(async ({ data: id, context }): Promise<ListingDetail | null> => {
    const sql = await getSql();
    await settle(sql);
    const userId = context.userId;
    const rows = await sql.query<
      CardRow & {
        blurb: string;
        anti_snipe_minutes: number;
        created_at: unknown;
        current_bidder_id: string | null;
      }
    >(
      `select ${CARD_SQL}, l.blurb, l.anti_snipe_minutes, l.created_at, l.current_bidder_id
       from listings l
       left join profiles p on p.user_id = l.seller_id
       where l.id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    const isSeller = userId != null && userId === row.seller_id;
    if (row.status === "draft" && !isSeller) return null;
    let staff = false;
    if (userId && !isSeller && row.status === "removed") {
      const viewer = await sql<{ role: string }>`
        select role from profiles where user_id = ${userId}
      `;
      staff = isStaff(asRole(viewer[0]?.role));
    }
    if (row.status === "removed" && !isSeller && !staff) return null;

    const previews = await sql<{ id: string; card_b64: string | null; view_b64: string | null }>`
      select id, card_b64, view_b64
      from media
      where listing_id = ${id} and kind = 'preview'
      order by created_at asc
    `;
    const bids = await sql<{ id: string; amount: number; handle: string; premium: boolean; created_at: unknown }>`
      select b.id, b.amount, p.handle, b.created_at,
        (coalesce(p.premium_forever, false) or (p.premium_until is not null and p.premium_until > now())) as premium
      from bids b
      join profiles p on p.user_id = b.bidder_id
      where b.listing_id = ${id}
      order by b.created_at desc
      limit 40
    `;
    let dealId: string | null = null;
    if (userId) {
      const deal = await sql<{ id: string }>`
        select id from deals
        where listing_id = ${id} and (seller_id = ${userId} or buyer_id = ${userId})
      `;
      dealId = deal[0]?.id ?? null;
    }
    let privateDescription: string | null = null;
    let files: MediaMeta[] | null = null;
    if (isSeller) {
      const priv = await sql<{ private_description: string }>`
        select private_description from listings where id = ${id} and seller_id = ${userId}
      `;
      privateDescription = priv[0]?.private_description ?? "";
      files = await loadFiles(sql, id);
    }
    const card = mapCard(row);
    const [likedCards, comments] = await Promise.all([
      markLiked(sql, userId, [card]),
      sql<{
        id: string;
        body: string;
        created_at: unknown;
        author_handle: string;
        author_name: string;
        author_premium: boolean;
      }>`
        select c.id, c.body, c.created_at, a.handle as author_handle, a.display_name as author_name,
          (coalesce(a.premium_forever, false) or (a.premium_until is not null and a.premium_until > now())) as author_premium
        from listing_comments c
        join profiles a on a.user_id = c.author_id
        where c.listing_id = ${id}
        order by c.created_at asc
        limit 80
      `,
    ]);
    const bidRows: BidRow[] = bids.map((b) => ({
      id: b.id,
      amount: num(b.amount),
      handle: b.handle,
      premium: Boolean(b.premium),
      createdAt: iso(b.created_at),
    }));
    return {
      ...likedCards[0],
      blurb: row.blurb,
      winnerId: row.winner_id,
      antiSnipeMinutes: num(row.anti_snipe_minutes),
      createdAt: iso(row.created_at),
      previews: previews.map((p) => ({
        id: p.id,
        src: p.view_b64 ? `data:image/jpeg;base64,${p.view_b64}` : p.card_b64 ? `data:image/jpeg;base64,${p.card_b64}` : null,
        card: p.card_b64 ? `data:image/jpeg;base64,${p.card_b64}` : null,
      })),
      bids: bidRows,
      dealId,
      privateDescription,
      files,
      comments: comments.map(
        (c): ProfileComment => ({
          id: c.id,
          body: c.body,
          createdAt: iso(c.created_at),
          authorHandle: c.author_handle,
          authorName: c.author_name,
          authorPremium: Boolean(c.author_premium),
        }),
      ),
      currentBidderId: row.current_bidder_id,
    };
  });

async function loadFiles(sql: Sql, listingId: string): Promise<MediaMeta[]> {
  const rows = await sql<{ id: string; filename: string; mime: string; size_bytes: number }>`
    select id, filename, mime, size_bytes from media
    where listing_id = ${listingId} and kind = 'file'
    order by created_at asc
  `;
  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    mime: r.mime,
    sizeBytes: num(r.size_bytes),
  }));
}

type CreateBody = {
  title: string;
  blurb: string;
  privateDescription: string;
  kind: "fixed" | "auction";
  price: number;
  buyNow: number | null;
  durationHours: number;
  antiSnipeMinutes: number;
  tags: string[];
};

function parseCreate(input: unknown): CreateBody {
  if (!input || typeof input !== "object") fail("Пустая форма");
  const o = input as Record<string, unknown>;
  const title = cleanText(typeof o.title === "string" ? o.title : "", 80);
  const blurb = cleanText(typeof o.blurb === "string" ? o.blurb : "", PREMIUM_BLURB_MAX);
  const privateDescription = cleanText(
    typeof o.privateDescription === "string" ? o.privateDescription : "",
    8000,
  );
  if (title.length < 3) fail("Название — хотя бы 3 символа");
  const kind = o.kind === "auction" ? "auction" : o.kind === "fixed" ? "fixed" : null;
  if (!kind) fail("Выберите аукцион или фиксированную цену");
  const price = parsePrice(o.price);
  if (price == null) fail("Цена — целое число от 1");
  let buyNow: number | null = null;
  if (kind === "auction" && o.buyNow != null && o.buyNow !== "") {
    buyNow = parsePrice(o.buyNow);
    if (buyNow == null || buyNow <= price) fail("«Купить сейчас» должно быть выше стартовой цены");
  }
  const durationHours = Number(o.durationHours);
  if (kind === "auction" && ![1, 6, 12, 24, 72, 168].includes(durationHours)) {
    fail("Выберите длительность аукциона");
  }
  const anti = Number(o.antiSnipeMinutes);
  if (kind === "auction" && !(SNIPE_OPTIONS as readonly number[]).includes(anti)) {
    fail("Выберите антиснайп: выключить, 10 минут, 30 минут или 1 час");
  }
  const tags = Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === "string") : [];
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
    tags,
  };
}

export const createListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseCreate)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertLive(profile);
    if (!profile.premium && data.blurb.length > BLURB_MAX) {
      fail(`Описание длиннее ${BLURB_MAX} символов. С Premium — до ${PREMIUM_BLURB_MAX}.`);
    }
    const id = crypto.randomUUID();
    const hours = data.kind === "auction" ? data.durationHours : 0;
    await sql`
      insert into listings (
        id, seller_id, title, blurb, private_description, kind, price, buy_now,
        anti_snipe_minutes, ends_at, status
      ) values (
        ${id},
        ${context.userId},
        ${data.title},
        ${data.blurb},
        ${data.privateDescription},
        ${data.kind},
        ${data.price},
        ${data.buyNow},
        ${data.antiSnipeMinutes},
        case when ${data.kind} = 'auction' then now() + (${hours} * interval '1 hour') else null end,
        'draft'
      )
    `;
    await attachTags(sql, id, data.tags);
    return { id };
  });

/** A draft stays hidden until it has a cover. No cover — the lot is deleted. */
export const publishListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
    return id;
  })
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const owned = await sql<{ status: string; bid_count: number }>`
      select status, bid_count from listings where id = ${id} and seller_id = ${context.userId}
    `;
    const row = owned[0];
    if (!row) fail("Лот не найден");
    const covers = await sql<{ n: number }>`
      select count(*)::int as n from media where listing_id = ${id} and kind = 'preview'
    `;
    if (num(covers[0]?.n) < 1) {
      if (row.status === "draft" || (row.status === "active" && num(row.bid_count) === 0)) {
        await sql`delete from listings where id = ${id} and seller_id = ${context.userId} and bid_count = 0`;
      }
      fail("Нужна обложка");
    }
    if (row.status === "draft") {
      const limit = profile.premium ? PREMIUM_ACTIVE_LOT_LIMIT : ACTIVE_LOT_LIMIT;
      const active = await sql<{ n: number }>`
        select count(*)::int as n from listings
        where seller_id = ${context.userId} and status = 'active'
      `;
      if (num(active[0]?.n) >= limit) {
        fail(profile.premium ? `Уже ${limit} активных лотов` : `Одновременно можно ${limit} активных лотов. С Premium — ${PREMIUM_ACTIVE_LOT_LIMIT}.`);
      }
      await sql`
        update listings set status = 'active', updated_at = now()
        where id = ${id} and seller_id = ${context.userId} and status = 'draft'
      `;
    }
    return { ok: true };
  });

type UploadBody = {
  listingId: string;
  kind: "preview" | "file";
  filename: string;
  b64: string;
  cardB64: string | null;
};

function parseUpload(input: unknown): UploadBody {
  if (!input || typeof input !== "object") fail("Пустой файл");
  const o = input as Record<string, unknown>;
  if (typeof o.listingId !== "string" || !UUID_RE.test(o.listingId)) fail("Некорректный лот");
  if (o.kind !== "preview") fail("Полные файлы через площадку больше не принимаются");
  if (typeof o.filename !== "string" || typeof o.b64 !== "string") fail("Файл не прочитан");
  if (o.b64.length > 12_000_000) fail("Файл больше 4 МБ");
  let cardB64: string | null = null;
  if (typeof o.cardB64 === "string") {
    const cleaned = o.cardB64.replace(/^data:[^,]*,/, "").replace(/\s/g, "");
    if (cleaned.length > 80 && cleaned.length < 700_000) cardB64 = cleaned;
  }
  return {
    listingId: o.listingId,
    kind: o.kind,
    filename: o.filename,
    b64: o.b64.replace(/^data:[^,]*,/, "").replace(/\s/g, ""),
    cardB64,
  };
}

export const imageData = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Нет изображения");
    const id = (input as { id?: unknown }).id;
    const variant = (input as { variant?: unknown }).variant;
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный файл");
    return { id, variant: variant === "view" ? ("view" as const) : ("card" as const) };
  })
  .handler(async ({ data }): Promise<{ src: string | null }> => {
    try {
      const { resolvePreview } = await import("@/lib/market/preview-store");
      const sql = await getSql();
      return { src: await resolvePreview(sql, data.id, data.variant) };
    } catch (err) {
      console.error("[image]", err instanceof Error ? err.message : err);
      return { src: null };
    }
  });

export const uploadMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseUpload)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertLive(profile);
    const owned = await sql<{ id: string }>`
      select id from listings
      where id = ${data.listingId} and seller_id = ${context.userId} and status in ('active', 'draft')
    `;
    if (!owned[0]) fail("Лот нельзя дополнять");
    const counts = await sql<{ n: number }>`
      select count(*)::int as n from media where listing_id = ${data.listingId} and kind = ${data.kind}
    `;
    const cap = data.kind === "preview" ? (profile.premium ? PREMIUM_PREVIEWS : MAX_PREVIEWS) : MAX_FILES;
    if (num(counts[0]?.n) >= cap) fail(data.kind === "preview" ? `Уже ${cap} превью` : "Уже 6 файлов");

    const buf = Buffer.from(data.b64, "base64");
    const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const magic = sniffMagic(bytes);
    if (!magic) fail("Формат не поддерживается. Нужны PNG, JPG, WEBP, GIF, ZIP или PSD.");
    const max = data.kind === "preview" ? PREVIEW_MAX : FILE_MAX;
    if (buf.length > max) {
      fail(data.kind === "preview" ? "Превью больше 4 МБ" : "Файл больше 4 МБ");
    }
    if (data.kind === "preview" && !isRaster(magic)) fail("Превью — только PNG, JPG, WEBP или GIF");
    if (buf.length < 32) fail("Файл пустой");

    let width: number | null = null;
    let height: number | null = null;
    if (isRaster(magic)) {
      const size = decodedImageSize(bytes);
      if (!size) fail("Не удалось прочитать размер изображения");
      if (size.width > MAX_DIM || size.height > MAX_DIM) fail(`Максимум ${MAX_DIM}×${MAX_DIM}`);
      width = size.width;
      height = size.height;
    } else if (magic === "image/vnd.adobe.photoshop") {
      const size = psdSize(bytes);
      if (!size) fail("Не удалось прочитать PSD");
      if (size.width > MAX_DIM || size.height > MAX_DIM) fail(`PSD больше ${MAX_DIM}×${MAX_DIM}`);
      width = size.width;
      height = size.height;
    }

    const filename = data.filename.replace(/[^\p{L}\p{N}._\- ()]+/gu, "_").slice(0, 80) || "file";
    const id = crypto.randomUUID();
    let cardB64: string | null = null;
    if (data.cardB64) {
      const card = Buffer.from(data.cardB64, "base64");
      if (card.length > 32 && card.length < 400_000 && card[0] === 0xff && card[1] === 0xd8) {
        cardB64 = card.toString("base64");
      }
    }
    let viewB64: string | null = null;
    if (data.kind === "preview") {
      try {
        const { thumbsFromOriginal } = await import("@/lib/market/preview-store");
        const made = thumbsFromOriginal(buf, magic);
        cardB64 = cardB64 ?? made.card;
        viewB64 = made.view;
      } catch (err) {
        console.error("[upload] thumb", err instanceof Error ? err.message : err);
      }
    }
    await sql`
      insert into media (id, listing_id, kind, filename, mime, data_b64, card_b64, view_b64, width, height, size_bytes)
      values (
        ${id},
        ${data.listingId},
        ${data.kind},
        ${filename},
        ${magic},
        ${buf.toString("base64")},
        ${cardB64},
        ${viewB64},
        ${width},
        ${height},
        ${buf.length}
      )
    `;
    return { id };
  });

export const deleteMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный файл");
    return id;
  })
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      select m.id
      from media m
      join listings l on l.id = m.listing_id
      where m.id = ${id} and l.seller_id = ${context.userId} and l.status = 'active'
    `;
    if (!rows[0]) fail("Нельзя удалить этот файл");
    await sql`delete from media where id = ${id}`;
    return { ok: true };
  });

type CopyBody = { id: string; title: string; blurb: string; tags: string[] };

function parseCopy(input: unknown): CopyBody {
  if (!input || typeof input !== "object") fail("Пустая форма");
  const o = input as Record<string, unknown>;
  if (typeof o.id !== "string" || !UUID_RE.test(o.id)) fail("Некорректный лот");
  const title = cleanText(typeof o.title === "string" ? o.title : "", 80);
  const blurb = cleanText(typeof o.blurb === "string" ? o.blurb : "", PREMIUM_BLURB_MAX);
  if (title.length < 3) fail("Название — хотя бы 3 символа");
  const tags = Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === "string").slice(0, 8) : [];
  return { id: o.id, title, blurb, tags };
}

export const updateListingCopy = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseCopy)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    if (!profile.premium && data.blurb.length > BLURB_MAX) {
      fail(`Описание длиннее ${BLURB_MAX} символов. С Premium — до ${PREMIUM_BLURB_MAX}.`);
    }
    const updated = await sql`
      update listings
      set title = ${data.title},
          blurb = ${data.blurb},
          updated_at = now()
      where id = ${data.id} and seller_id = ${context.userId} and status = 'active'
      returning id
    `;
    if (!updated[0]) fail("Лот уже нельзя править");
    await sql`delete from listing_tags where listing_id = ${data.id}`;
    await attachTags(sql, data.id, data.tags);
    return { ok: true };
  });

export const cancelListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
    return id;
  })
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    const updated = await sql`
      update listings
      set status = 'removed', updated_at = now()
      where id = ${id} and seller_id = ${context.userId} and status = 'active' and bid_count = 0
      returning id
    `;
    if (!updated[0]) fail("Нельзя снять лот, по которому уже есть ставки или он закрыт");
    return { ok: true };
  });

/** Erase a lot and everything attached to it: pictures, bids, chat, deal. */
async function purgeListing(sql: Sql, id: string) {
  const deals = await sql<{ id: string }>`select id from deals where listing_id = ${id}`;
  const dealIds = deals.map((deal) => deal.id);
  if (dealIds.length > 0) {
    const hrefs = dealIds.map((dealId) => `/deals/${dealId}`);
    await sql`delete from notifications where href = any(${hrefs}::text[])`;
    await sql`
      delete from message_images
      where message_id in (select id from messages where deal_id = any(${dealIds}::text[]))
    `;
    await sql`delete from messages where deal_id = any(${dealIds}::text[])`;
    await sql`delete from deals where listing_id = ${id}`;
  }
  await sql`delete from reports where listing_id = ${id}`;
  await sql`delete from notifications where href = ${`/lot/${id}`}`;
  await sql`delete from listings where id = ${id}`;
}

/** Owner can erase any of their lots. Images, bids and the deal go with it. */
export const deleteListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
    return id;
  })
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    const owned = await sql<{ id: string }>`
      select id from listings where id = ${id} and seller_id = ${context.userId}
    `;
    if (!owned[0]) fail("Этот лот уже удалён");
    await purgeListing(sql, id);
    return { ok: true };
  });

/** Drop a lot that was inserted but then failed image checks. Never leaves it active. */
export const discardListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
    return id;
  })
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    const updated = await sql`
      delete from listings
      where id = ${id} and seller_id = ${context.userId} and status in ('active', 'draft') and bid_count = 0
      returning id
    `;
    if (!updated[0]) fail("Лот уже нельзя отменить");
    return { ok: true };
  });

type BidBody = { listingId: string; amount: number };

export const placeBid = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown): BidBody => {
    if (!input || typeof input !== "object") fail("Пустая ставка");
    const o = input as Record<string, unknown>;
    if (typeof o.listingId !== "string" || !UUID_RE.test(o.listingId)) fail("Некорректный лот");
    const amount = parsePrice(o.amount);
    if (amount == null) fail("Ставка — целое число");
    return { listingId: o.listingId, amount };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    await settle(sql);
    const profile = await ensureProfile(sql, context.userId);
    assertLive(profile);
    const before = await sql<{
      ends_at: unknown;
      current_bidder_id: string | null;
      seller_id: string;
      title: string;
      buy_now: number | null;
      status: string;
      kind: string;
    }>`
      select ends_at, current_bidder_id, seller_id, title, buy_now, status, kind
      from listings where id = ${data.listingId}
    `;
    const lot = before[0];
    if (!lot || lot.kind !== "auction" || lot.status !== "active") fail("Аукцион уже закрыт");
    if (lot.buy_now != null && data.amount >= num(lot.buy_now)) {
      fail("Для этой суммы нажмите «Купить сейчас»");
    }
    const prevBidder = lot.current_bidder_id;
    const prevEnd = isoOrNull(lot.ends_at);
    const updated = await sql<{ ends_at: unknown; current_bid: number; bid_count: number }>`
      update listings
      set current_bid = ${data.amount},
          current_bidder_id = ${context.userId},
          bid_count = bid_count + 1,
          ends_at = case
            when anti_snipe_minutes > 0
              and ends_at <= now() + (anti_snipe_minutes * interval '1 minute')
            then now() + (anti_snipe_minutes * interval '1 minute')
            else ends_at
          end,
          updated_at = now()
      where id = ${data.listingId}
        and status = 'active'
        and kind = 'auction'
        and ends_at > now()
        and ${data.amount} >= price
        and ${data.amount} > coalesce(current_bid, price - 1)
        and (buy_now is null or ${data.amount} < buy_now)
      returning ends_at, current_bid, bid_count
    `;
    if (!updated[0]) fail("Ставка не принята — кто-то успел раньше или сумма слишком мала");
    await sql`
      insert into bids (id, listing_id, bidder_id, amount)
      values (${crypto.randomUUID()}, ${data.listingId}, ${context.userId}, ${data.amount})
    `;
    const endsAt = iso(updated[0].ends_at);
    const extended = prevEnd != null && new Date(endsAt).getTime() - new Date(prevEnd).getTime() > 1000;
    const note = extended ? " Аукцион продлён." : "";
    if (lot.seller_id !== context.userId) {
      await notify(
        sql,
        lot.seller_id,
        "bid",
        "Новая ставка",
        `${profile.handle} · ${data.amount} ₽ · «${lot.title}».${note}`,
        `/lot/${data.listingId}`,
      );
    }
    if (prevBidder && prevBidder !== context.userId) {
      await notify(
        sql,
        prevBidder,
        "outbid",
        "Вашу ставку перебили",
        `«${lot.title}» теперь ${data.amount} ₽.${note}`,
        `/lot/${data.listingId}`,
      );
    }
    return {
      currentBid: num(updated[0].current_bid),
      endsAt,
      extended,
      bidCount: num(updated[0].bid_count),
    };
  });

async function takeListing(
  sql: Sql,
  userId: string,
  listingId: string,
  mode: "fixed" | "buy-now",
): Promise<{ dealId: string }> {
  await settle(sql);
  const profile = await ensureProfile(sql, userId);
  assertLive(profile);
  const updated =
    mode === "fixed"
      ? await sql<CloseRow>`
          update listings
          set status = 'sold', winner_id = ${userId}, updated_at = now()
          where id = ${listingId} and status = 'active' and kind = 'fixed' and seller_id <> ${userId}
          returning id, title, seller_id, winner_id, price as amount
        `
      : await sql<CloseRow>`
          update listings
          set status = 'sold',
              winner_id = ${userId},
              current_bid = buy_now,
              current_bidder_id = ${userId},
              updated_at = now()
          where id = ${listingId}
            and status = 'active'
            and kind = 'auction'
            and buy_now is not null
            and ends_at > now()
            and seller_id <> ${userId}
          returning id, title, seller_id, winner_id, buy_now as amount
        `;
  if (!updated[0]) fail("Лот уже забрали или он закрыт");
  const dealId = await openDeal(sql, updated[0]);
  if (!dealId) fail("Не удалось открыть сделку");
  return { dealId };
}

export const buyFixed = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
    return id;
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    return takeListing(sql, context.userId, data, "fixed");
  });

export const buyNow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
    return id;
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    return takeListing(sql, context.userId, data, "buy-now");
  });

export const reportListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустая жалоба");
    const o = input as Record<string, unknown>;
    if (typeof o.listingId !== "string" || !UUID_RE.test(o.listingId)) fail("Некорректный лот");
    const reason = cleanText(typeof o.reason === "string" ? o.reason : "", 500);
    if (reason.length < 4) fail("Опишите причину чуть подробнее");
    return { listingId: o.listingId, reason };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertLive(profile);
    const lot = await sql<{ seller_id: string }>`select seller_id from listings where id = ${data.listingId}`;
    if (!lot[0]) fail("Лот не найден");
    if (lot[0].seller_id === context.userId) fail("Это ваш лот");
    const open = await sql`
      select id from reports
      where reporter_id = ${context.userId} and listing_id = ${data.listingId} and status = 'open'
    `;
    if (open[0]) fail("Жалоба уже отправлена");
    await sql`
      insert into reports (id, reporter_id, listing_id, reason)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.listingId}, ${data.reason})
    `;
    return { ok: true };
  });

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Me> => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const unread = await sql<{ n: number }>`
      select count(*)::int as n from notifications where user_id = ${context.userId} and read_at is null
    `;
    const images = await sql<{ kind: string }>`
      select kind from profile_images where user_id = ${context.userId}
    `;
    const kinds = new Set(images.map((r) => r.kind));
    return {
      ...profile,
      unread: num(unread[0]?.n),
      hasAvatar: kinds.has("avatar"),
      hasBanner: kinds.has("banner"),
      hasBackground: kinds.has("background"),
    };
  });

function parseLinksInput(value: unknown): SocialLink[] {
  if (value == null) return [];
  if (!Array.isArray(value)) fail("Ссылки указаны неверно");
  const out: SocialLink[] = [];
  for (const item of value.slice(0, 5)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const label = cleanText(typeof rec.label === "string" ? rec.label : "", 24);
    const url = cleanText(typeof rec.url === "string" ? rec.url : "", 200);
    if (!label && !url) continue;
    if (!label || !/^https?:\/\/\S+$/i.test(url)) fail("У каждой ссылки нужны подпись и адрес http(s)");
    out.push({ label, url });
  }
  return out;
}

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустая форма");
    const o = input as Record<string, unknown>;
    const handle = cleanHandle(typeof o.handle === "string" ? o.handle : "");
    const displayName = cleanText(typeof o.displayName === "string" ? o.displayName : "", 40);
    const bio = cleanText(typeof o.bio === "string" ? o.bio : "", 400);
    const status = asStatus(o.status);
    if (o.status != null && !["open", "busy", "closed", "away"].includes(String(o.status))) {
      fail("Неизвестный статус");
    }
    if (!handle) fail("Ник: 3–20 букв, цифр или _");
    if (displayName.length < 2) fail("Имя слишком короткое");
    return { handle, displayName, bio, status, links: parseLinksInput(o.links) };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    try {
      await sql`
        update profiles
        set handle = ${data.handle},
            display_name = ${data.displayName},
            bio = ${data.bio},
            status = ${data.status},
            links = ${JSON.stringify(data.links)}::jsonb
        where user_id = ${context.userId}
      `;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/duplicate|unique/i.test(msg)) fail("Этот ник уже занят");
      throw e;
    }
    return { ok: true };
  });

export const getPublicProfile = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .validator((input: unknown) => {
    const raw = typeof input === "string" ? { handle: input, page: 1 } : input;
    if (!raw || typeof raw !== "object") fail("Некорректный профиль");
    const o = raw as Record<string, unknown>;
    const handle = typeof o.handle === "string" ? o.handle.trim().toLocaleLowerCase("ru") : "";
    if (!cleanHandle(handle)) fail("Некорректный профиль");
    const page = Number(o.page);
    return { handle, page: Number.isInteger(page) && page > 0 && page < 500 ? page : 1 };
  })
  .handler(async ({ data, context }): Promise<PublicProfile | null> => {
    const sql = await getSql();
    await settle(sql);
    const rows = await sql<{
      display_name: string;
      bio: string;
      role: string;
      status: string;
      links: unknown;
      badges: unknown;
      created_at: unknown;
      user_id: string;
      premium_forever: boolean;
      premium_until: unknown;
      theme: string;
      accent: string;
      avatar_frame: string;
      banner_overlay: string;
    }>`
      select user_id, display_name, bio, role, status, links, badges, created_at,
        premium_forever, premium_until, theme, accent, avatar_frame, banner_overlay
      from profiles where handle = ${data.handle}
    `;
    if (!rows[0]) return null;
    const userId = rows[0].user_id;
    const offset = (data.page - 1) * PROFILE_LOT_PAGE;
    const [items, totalRow, images, posts, followRow, followCount] = await Promise.all([
      sql.query<CardRow>(
        `select ${CARD_SQL}
         from listings l
         left join profiles p on p.user_id = l.seller_id
         where l.seller_id = $1 and l.status in ('active', 'sold', 'ended')
         order by l.pinned desc, l.created_at desc
         limit $2 offset $3`,
        [userId, PROFILE_LOT_PAGE, offset],
      ),
      sql<{ n: number }>`
        select count(*)::int as n from listings
        where seller_id = ${userId} and status in ('active', 'sold', 'ended')
      `,
      sql<{ kind: string }>`select kind from profile_images where user_id = ${userId}`,
      loadAuthorPosts(sql, userId),
      context.userId
        ? sql<{ ok: number }>`
            select 1 as ok from follows
            where follower_id = ${context.userId} and following_id = ${userId}
          `
        : Promise.resolve([] as { ok: number }[]),
      sql<{ n: number }>`select count(*)::int as n from follows where following_id = ${userId}`,
    ]);
    const kinds = new Set(images.map((r) => r.kind));
    const createdAt = iso(rows[0].created_at);
    const forever = Boolean(rows[0].premium_forever);
    const until = rows[0].premium_until == null ? null : iso(rows[0].premium_until);
    const premium = premiumActive(forever, until);
    return {
      handle: data.handle,
      displayName: rows[0].display_name,
      bio: rows[0].bio,
      role: asRole(rows[0].role),
      status: asStatus(rows[0].status),
      links: asLinks(rows[0].links),
      badges: asBadges(rows[0].badges),
      createdAt,
      isNew: isNewAccount(createdAt),
      following: followRow.length > 0,
      hasAvatar: kinds.has("avatar"),
      hasBanner: kinds.has("banner"),
      hasBackground: kinds.has("background"),
      premium,
      theme: premium ? asTheme(rows[0].theme) : "classic",
      accent: premium ? asAccent(rows[0].accent) : "wine",
      avatarFrame: premium ? asFrame(rows[0].avatar_frame) : "thin",
      bannerOverlay: premium ? asOverlay(rows[0].banner_overlay) : "gradient",
      lots: items.map(mapCard),
      lotTotal: num(totalRow[0]?.n),
      posts,
      followers: num(followCount[0]?.n),
    };
  });

function youAre(sellerId: string, uid: string): "seller" | "buyer" {
  return sellerId === uid ? "seller" : "buyer";
}

export const listDeals = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DealSummary[]> => {
    const sql = await getSql();
    await settle(sql);
    await ensureProfile(sql, context.userId);
    const rows = await sql<{
      id: string;
      public_no: number;
      listing_id: string;
      title: string;
      preview_id: string | null;
      amount: number;
      status: DealStatus;
      seller_id: string;
      seller_handle: string;
      buyer_handle: string;
      seller_premium: boolean;
      buyer_premium: boolean;
      created_at: unknown;
    }>`
      select d.id, d.public_no, d.listing_id, l.title, d.amount, d.status, d.seller_id,
             d.created_at, sp.handle as seller_handle, bp.handle as buyer_handle,
             (coalesce(sp.premium_forever, false) or (sp.premium_until is not null and sp.premium_until > now())) as seller_premium,
             (coalesce(bp.premium_forever, false) or (bp.premium_until is not null and bp.premium_until > now())) as buyer_premium,
             (
               select m.id from media m
               where m.listing_id = l.id and m.kind = 'preview'
               order by m.created_at asc limit 1
             ) as preview_id
      from deals d
      join listings l on l.id = d.listing_id
      join profiles sp on sp.user_id = d.seller_id
      join profiles bp on bp.user_id = d.buyer_id
      where d.seller_id = ${context.userId} or d.buyer_id = ${context.userId}
      order by d.created_at desc
    `;
    return rows.map((r) => ({
      id: r.id,
      publicNo: num(r.public_no),
      listingId: r.listing_id,
      title: r.title,
      previewId: r.preview_id,
      amount: num(r.amount),
      status: r.status,
      sellerHandle: r.seller_handle,
      buyerHandle: r.buyer_handle,
      sellerPremium: Boolean(r.seller_premium),
      buyerPremium: Boolean(r.buyer_premium),
      youAre: youAre(r.seller_id, context.userId),
      createdAt: iso(r.created_at),
    }));
  });

type RawMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: unknown;
  handle: string | null;
  premium: boolean;
};

async function hydrateMessages(sql: Sql, rows: RawMessage[]): Promise<ChatMessage[]> {
  const images = new Map<string, ChatImage[]>();
  if (rows.length > 0) {
    const ids = rows.map((row) => row.id);
    const pics = await sql<{
      id: string;
      message_id: string;
      filename: string;
      mime: string;
      size_bytes: number;
      width: number | null;
      height: number | null;
    }>`
      select id, message_id, filename, mime, size_bytes, width, height
      from message_images
      where message_id = any(${ids}::text[])
      order by sort asc, created_at asc
    `;
    for (const pic of pics) {
      const list = images.get(pic.message_id) ?? [];
      list.push({
        id: pic.id,
        filename: pic.filename,
        mime: pic.mime,
        sizeBytes: num(pic.size_bytes),
        width: pic.width == null ? null : num(pic.width),
        height: pic.height == null ? null : num(pic.height),
      });
      images.set(pic.message_id, list);
    }
  }
  return rows
    .filter((m) => !(m.sender_id === "system" && m.body.includes("Оплата проходит вне площадки")))
    .map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    handle: m.sender_id === "system" ? null : m.handle,
    body: m.body,
    createdAt: iso(m.created_at),
    system: m.sender_id === "system",
    premium: Boolean(m.premium),
    images: images.get(m.id) ?? [],
  }));
}

async function loadDeal(sql: Sql, id: string, uid: string): Promise<DealDetail | null> {
  const rows = await sql<{
    id: string;
    public_no: number;
    listing_id: string;
    title: string;
    amount: number;
    status: DealStatus;
    seller_id: string;
    buyer_id: string;
    seller_handle: string;
    seller_name: string;
    buyer_handle: string;
    buyer_name: string;
    seller_premium: boolean;
    buyer_premium: boolean;
    seller_confirmed_at: unknown;
    buyer_confirmed_at: unknown;
    private_description: string;
    preview_id: string | null;
  }>`
    select d.id, d.public_no, d.listing_id, l.title, d.amount, d.status,
           d.seller_id, d.buyer_id,
           sp.handle as seller_handle, sp.display_name as seller_name,
           bp.handle as buyer_handle, bp.display_name as buyer_name,
           (coalesce(sp.premium_forever, false) or (sp.premium_until is not null and sp.premium_until > now())) as seller_premium,
           (coalesce(bp.premium_forever, false) or (bp.premium_until is not null and bp.premium_until > now())) as buyer_premium,
           d.seller_confirmed_at, d.buyer_confirmed_at, l.private_description,
           (
             select m.id from media m
             where m.listing_id = l.id and m.kind = 'preview'
             order by m.created_at asc limit 1
           ) as preview_id
    from deals d
    join listings l on l.id = d.listing_id
    join profiles sp on sp.user_id = d.seller_id
    join profiles bp on bp.user_id = d.buyer_id
    where d.id = ${id}
  `;
  const d = rows[0];
  if (!d) return null;
  if (d.seller_id !== uid && d.buyer_id !== uid) return null;
  const side = youAre(d.seller_id, uid);
  const released = d.status === "files_released" || d.status === "completed" || d.status === "confirmed";
  const showSecret = side === "seller" || released;
  const messages = await sql<{
    id: string;
    sender_id: string;
    body: string;
    created_at: unknown;
    handle: string | null;
    premium: boolean;
  }>`
    select m.id, m.sender_id, m.body, m.created_at, p.handle,
      (coalesce(p.premium_forever, false) or (p.premium_until is not null and p.premium_until > now())) as premium
    from messages m
    left join profiles p on p.user_id = m.sender_id
    where m.deal_id = ${id}
    order by m.created_at asc
    limit 500
  `;
  await sql`
    update notifications set read_at = now()
    where user_id = ${uid} and href = ${`/deals/${id}`} and read_at is null
  `;
  return {
    id: d.id,
    publicNo: num(d.public_no),
    listingId: d.listing_id,
    title: d.title,
    previewId: d.preview_id,
    amount: num(d.amount),
    status: d.status,
    youAre: side,
    seller: { id: d.seller_id, handle: d.seller_handle, name: d.seller_name, premium: Boolean(d.seller_premium) },
    buyer: { id: d.buyer_id, handle: d.buyer_handle, name: d.buyer_name, premium: Boolean(d.buyer_premium) },
    sellerConfirmed: d.seller_confirmed_at != null,
    buyerConfirmed: d.buyer_confirmed_at != null,
    privateDescription: showSecret ? d.private_description : null,
    files: showSecret ? await loadFiles(sql, d.listing_id) : null,
    messages: await hydrateMessages(sql, messages),
  };
}

export const getDeal = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректная сделка");
    return id;
  })
  .handler(async ({ data, context }): Promise<DealDetail | null> => {
    const sql = await getSql();
    await settle(sql);
    await ensureProfile(sql, context.userId);
    return loadDeal(sql, data, context.userId);
  });

export const getStaffDeal = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const raw = typeof input === "number" ? input : typeof input === "string" ? Number(input.replace(/^#/, "")) : NaN;
    if (!Number.isInteger(raw) || raw < 1 || raw > 2_000_000_000) fail("Некорректный номер сделки");
    return raw;
  })
  .handler(async ({ data: publicNo, context }): Promise<StaffDeal | null> => {
    const sql = await getSql();
    await requireStaff(sql, context.userId);
    const rows = await sql<{
      id: string;
      public_no: number;
      title: string;
      amount: number;
      status: DealStatus;
      seller_handle: string;
      seller_name: string;
      buyer_handle: string;
      buyer_name: string;
      seller_premium: boolean;
      buyer_premium: boolean;
    }>`
      select d.id, d.public_no, l.title, d.amount, d.status,
             sp.handle as seller_handle, sp.display_name as seller_name,
             bp.handle as buyer_handle, bp.display_name as buyer_name,
             (coalesce(sp.premium_forever, false) or (sp.premium_until is not null and sp.premium_until > now())) as seller_premium,
             (coalesce(bp.premium_forever, false) or (bp.premium_until is not null and bp.premium_until > now())) as buyer_premium
      from deals d
      join listings l on l.id = d.listing_id
      join profiles sp on sp.user_id = d.seller_id
      join profiles bp on bp.user_id = d.buyer_id
      where d.public_no = ${publicNo}
    `;
    const d = rows[0];
    if (!d) return null;
    const messages = await sql<{
      id: string;
      sender_id: string;
      body: string;
      created_at: unknown;
      handle: string | null;
      premium: boolean;
    }>`
      select m.id, m.sender_id, m.body, m.created_at, p.handle,
      (coalesce(p.premium_forever, false) or (p.premium_until is not null and p.premium_until > now())) as premium
      from messages m
      left join profiles p on p.user_id = m.sender_id
      where m.deal_id = ${d.id}
      order by m.created_at asc
      limit 500
    `;
    return {
      id: d.id,
      publicNo: num(d.public_no),
      title: d.title,
      amount: num(d.amount),
      status: d.status,
      seller: { handle: d.seller_handle, name: d.seller_name, premium: Boolean(d.seller_premium) },
      buyer: { handle: d.buyer_handle, name: d.buyer_name, premium: Boolean(d.buyer_premium) },
      messages: await hydrateMessages(sql, messages),
    };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустое сообщение");
    const o = input as Record<string, unknown>;
    if (typeof o.dealId !== "string" || !UUID_RE.test(o.dealId)) fail("Некорректная сделка");
    const body = cleanText(typeof o.body === "string" ? o.body : "", 2000);
    const withImages = o.withImages === true;
    if (!body && !withImages) fail("Напишите сообщение или приложите картинку");
    return { dealId: o.dealId, body, withImages };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertLive(profile);
    const deal = await sql<{ seller_id: string; buyer_id: string; title: string }>`
      select d.seller_id, d.buyer_id, l.title
      from deals d join listings l on l.id = d.listing_id
      where d.id = ${data.dealId}
    `;
    const d = deal[0];
    if (!d || (d.seller_id !== context.userId && d.buyer_id !== context.userId)) fail("Нет доступа");
    const id = crypto.randomUUID();
    await sql`
      insert into messages (id, deal_id, sender_id, body)
      values (${id}, ${data.dealId}, ${context.userId}, ${data.body})
    `;
    const other = d.seller_id === context.userId ? d.buyer_id : d.seller_id;
    const preview = data.body ? data.body.slice(0, 140) : "картинка";
    await notify(sql, other, "message", "Новое сообщение", `${profile.handle}: ${preview}`, `/deals/${data.dealId}`);
    return { id };
  });

export const attachDealImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустой файл");
    const o = input as Record<string, unknown>;
    if (typeof o.messageId !== "string" || !UUID_RE.test(o.messageId)) fail("Некорректное сообщение");
    if (typeof o.filename !== "string" || typeof o.b64 !== "string") fail("Файл не прочитан");
    const b64 = o.b64.replace(/^data:[^,]*,/, "").replace(/\s/g, "");
    if (b64.length > 4_600_000) fail("Картинка больше 3 МБ");
    return {
      messageId: o.messageId,
      filename: o.filename,
      b64,
    };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertLive(profile);
    const message = await sql<{ id: string }>`
      select m.id
      from messages m
      join deals d on d.id = m.deal_id
      where m.id = ${data.messageId}
        and m.sender_id = ${context.userId}
        and (d.seller_id = ${context.userId} or d.buyer_id = ${context.userId})
    `;
    if (!message[0]) fail("Это сообщение нельзя дополнить");
    const counts = await sql<{ n: number }>`
      select count(*)::int as n from message_images where message_id = ${data.messageId}
    `;
    if (num(counts[0]?.n) >= CHAT_IMAGE_COUNT) fail("Не больше 10 картинок в одном сообщении");
    const buf = Buffer.from(data.b64, "base64");
    if (buf.length > CHAT_IMAGE_MAX) fail("Картинка больше 3 МБ");
    if (buf.length < 32) fail("Файл пустой");
    const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const magic = sniffMagic(bytes);
    if (!magic || !isRaster(magic)) fail("В чат — только PNG, JPG, WEBP или GIF");
    const size = decodedImageSize(bytes);
    if (!size) fail("Не удалось прочитать размер изображения");
    if (size.width > CHAT_IMAGE_DIM || size.height > CHAT_IMAGE_DIM) {
      fail(`Картинка больше ${CHAT_IMAGE_DIM}×${CHAT_IMAGE_DIM}`);
    }
    const filename = data.filename.replace(/[^\p{L}\p{N}._\- ()]+/gu, "_").slice(0, 80) || "image";
    const id = crypto.randomUUID();
    await sql`
      insert into message_images (id, message_id, filename, mime, data_b64, width, height, size_bytes, sort)
      values (
        ${id},
        ${data.messageId},
        ${filename},
        ${magic},
        ${buf.toString("base64")},
        ${size.width},
        ${size.height},
        ${buf.length},
        ${num(counts[0]?.n)}
      )
    `;
    return { id };
  });

export const discardBlankMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректное сообщение");
    return id;
  })
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    await sql`
      delete from messages
      where id = ${id}
        and sender_id = ${context.userId}
        and body = ''
        and not exists (select 1 from message_images where message_id = ${id})
    `;
    return { ok: true };
  });

export const confirmPayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректная сделка");
    return id;
  })
  .handler(async ({ data: id, context }): Promise<DealDetail> => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertLive(profile);
    const rows = await sql<{
      seller_id: string;
      buyer_id: string;
      status: DealStatus;
      seller_confirmed_at: unknown;
      buyer_confirmed_at: unknown;
      title: string;
    }>`
      select d.seller_id, d.buyer_id, d.status, d.seller_confirmed_at, d.buyer_confirmed_at, l.title
      from deals d join listings l on l.id = d.listing_id
      where d.id = ${id}
    `;
    const d = rows[0];
    if (!d || (d.seller_id !== context.userId && d.buyer_id !== context.userId)) fail("Нет доступа");
    if (d.status === "completed") {
      const loaded = await loadDeal(sql, id, context.userId);
      if (!loaded) fail("Нет доступа");
      return loaded;
    }
    const side = d.seller_id === context.userId ? "seller" : "buyer";
    const already = side === "seller" ? d.seller_confirmed_at : d.buyer_confirmed_at;
    if (!already && (d.status === "awaiting_payment" || d.status === "confirmed")) {
      await sql`
        update deals set
          seller_confirmed_at = case
            when ${side} = 'seller' then coalesce(seller_confirmed_at, now())
            else seller_confirmed_at
          end,
          buyer_confirmed_at = case
            when ${side} = 'buyer' then coalesce(buyer_confirmed_at, now())
            else buyer_confirmed_at
          end
        where id = ${id}
      `;
      const now = await sql<{
        seller_confirmed_at: unknown;
        buyer_confirmed_at: unknown;
        status: DealStatus;
      }>`
        select seller_confirmed_at, buyer_confirmed_at, status from deals where id = ${id}
      `;
      const both = now[0]?.seller_confirmed_at && now[0]?.buyer_confirmed_at;
      if (both && now[0]?.status === "awaiting_payment") {
        await sql`
          update deals
          set status = 'files_released', files_released_at = now()
          where id = ${id} and status = 'awaiting_payment'
        `;
        await sql`
          insert into messages (id, deal_id, sender_id, body)
          values (
            ${crypto.randomUUID()},
            ${id},
            'system',
            'Обе стороны подтвердили оплату. Файлы и полное описание открыты покупателю.'
          )
        `;
        const href = `/deals/${id}`;
        await notify(sql, d.seller_id, "files", "Файлы выданы", `«${d.title}»`, href);
        await notify(sql, d.buyer_id, "files", "Файлы открыты", `«${d.title}»`, href);
      } else if (!both) {
        const other = side === "seller" ? d.buyer_id : d.seller_id;
        await sql`
          insert into messages (id, deal_id, sender_id, body)
          values (
            ${crypto.randomUUID()},
            ${id},
            'system',
            ${`${profile.handle} подтвердил(а) оплату. Ждём вторую сторону.`}
          )
        `;
        await notify(
          sql,
          other,
          "payment",
          "Контрагент подтвердил оплату",
          `«${d.title}». Нажмите «Оплата прошла», если перевод дошёл.`,
          `/deals/${id}`,
        );
      }
    }
    const loaded = await loadDeal(sql, id, context.userId);
    if (!loaded) fail("Нет доступа");
    return loaded;
  });

export const setDealOpen = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустой статус");
    const o = input as Record<string, unknown>;
    if (typeof o.id !== "string" || !UUID_RE.test(o.id)) fail("Некорректная сделка");
    if (typeof o.open !== "boolean") fail("Некорректный статус");
    return { id: o.id, open: o.open };
  })
  .handler(async ({ data, context }): Promise<DealDetail> => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const note = data.open ? "Сделка снова открыта." : "Сделка закрыта.";
    const updated = data.open
      ? await sql<{ seller_id: string; buyer_id: string }>`
          update deals
          set status = 'awaiting_payment', completed_at = null
          where id = ${data.id}
            and status = 'completed'
            and (seller_id = ${context.userId} or buyer_id = ${context.userId})
          returning seller_id, buyer_id
        `
      : await sql<{ seller_id: string; buyer_id: string }>`
          update deals
          set status = 'completed', completed_at = now()
          where id = ${data.id}
            and status <> 'completed'
            and (seller_id = ${context.userId} or buyer_id = ${context.userId})
          returning seller_id, buyer_id
        `;
    if (updated[0]) {
      await sql`
        insert into messages (id, deal_id, sender_id, body)
        values (${crypto.randomUUID()}, ${data.id}, 'system', ${note})
      `;
      const other = updated[0].seller_id === context.userId ? updated[0].buyer_id : updated[0].seller_id;
      await notify(sql, other, "done", data.open ? "Сделка открыта" : "Сделка закрыта", note, `/deals/${data.id}`);
    }
    const loaded = await loadDeal(sql, data.id, context.userId);
    if (!loaded) fail("Нет доступа");
    return loaded;
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Notice[]> => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const rows = await sql<{
      id: string;
      kind: string;
      title: string;
      body: string;
      href: string;
      read_at: unknown;
      created_at: unknown;
    }>`
      select id, kind, title, body, href, read_at, created_at
      from notifications
      where user_id = ${context.userId}
      order by created_at desc
      limit 60
    `;
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      href: r.href,
      read: r.read_at != null,
      createdAt: iso(r.created_at),
    }));
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`
      update notifications set read_at = now()
      where user_id = ${context.userId} and read_at is null
    `;
    return { ok: true };
  });

async function requireStaff(sql: Sql, userId: string) {
  const profile = await ensureProfile(sql, userId);
  if (!isStaff(profile.role)) fail("Только для модерации");
  return profile;
}

export const addProfileComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустой комментарий");
    const o = input as Record<string, unknown>;
    const handle = cleanHandle(typeof o.handle === "string" ? o.handle : "");
    const body = cleanText(typeof o.body === "string" ? o.body : "", 500);
    if (!handle) fail("Некорректный профиль");
    if (body.length < 1) fail("Напишите комментарий");
    return { handle, body };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const me = await ensureProfile(sql, context.userId);
    assertLive(me);
    const target = await sql<{ user_id: string; handle: string }>`
      select user_id, handle from profiles where handle = ${data.handle}
    `;
    if (!target[0]) fail("Профиль не найден");
    if (target[0].user_id === context.userId) fail("Свой профиль комментировать нельзя");
    await sql`
      insert into profile_comments (id, profile_id, author_id, body)
      values (${crypto.randomUUID()}, ${target[0].user_id}, ${context.userId}, ${data.body})
    `;
    await notify(
      sql,
      target[0].user_id,
      "comment",
      "Новый комментарий",
      `@${me.handle}: ${data.body.slice(0, 140)}`,
      `/u/${target[0].handle}`,
    );
    return { ok: true };
  });

export const deleteProfileComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный комментарий");
    return id;
  })
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    const me = await ensureProfile(sql, context.userId);
    const row = await sql<{ author_id: string }>`
      select author_id from profile_comments where id = ${id}
    `;
    if (!row[0]) fail("Комментарий уже удалён");
    if (row[0].author_id !== context.userId && !isStaff(me.role)) fail("Нельзя удалить этот комментарий");
    await sql`delete from profile_comments where id = ${id}`;
    return { ok: true };
  });

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AdminData> => {
    const sql = await getSql();
    const viewer = await requireStaff(sql, context.userId);
    const [listings, deals, openReports, users] = await Promise.all([
      sql<{ n: number }>`select count(*)::int as n from listings`,
      sql<{ n: number }>`select count(*)::int as n from deals`,
      sql<{ n: number }>`select count(*)::int as n from reports where status = 'open'`,
      sql<{ n: number }>`select count(*)::int as n from profiles`,
    ]);
    const reports = await sql<{
      id: string;
      reason: string;
      listing_id: string | null;
      listing_title: string | null;
      handle: string;
      created_at: unknown;
    }>`
      select r.id, r.reason, r.listing_id, l.title as listing_title, p.handle, r.created_at
      from reports r
      join profiles p on p.user_id = r.reporter_id
      left join listings l on l.id = r.listing_id
      where r.status = 'open'
      order by r.created_at desc
      limit 40
    `;
    const recentLots = await sql<{
      id: string;
      title: string;
      status: string;
      handle: string;
      kind: string;
    }>`
      select l.id, l.title, l.status, l.kind, p.handle
      from listings l
      left join profiles p on p.user_id = l.seller_id
      order by l.created_at desc
      limit 120
    `;
    const people = await sql<{
      user_id: string;
      handle: string;
      display_name: string;
      banned: boolean;
      role: string;
      badges: unknown;
      premium_forever: boolean;
      premium_until: unknown;
    }>`
      select user_id, handle, display_name, banned, role, badges, premium_forever, premium_until
      from profiles
      order by created_at desc
      limit 200
    `;
    const recentDeals = await sql<{
      id: string;
      public_no: number;
      title: string;
      status: string;
      seller_handle: string;
      buyer_handle: string;
    }>`
      select d.id, d.public_no, l.title, d.status, sp.handle as seller_handle, bp.handle as buyer_handle
      from deals d
      join listings l on l.id = d.listing_id
      join profiles sp on sp.user_id = d.seller_id
      join profiles bp on bp.user_id = d.buyer_id
      order by d.public_no desc
      limit 200
    `;
    const accounts = await sql<{ user_id: string; provider_id: string }>`
      select "userId" as user_id, "providerId" as provider_id
      from account
      where "userId" in (select user_id from profiles order by created_at desc limit 200)
    `;
    const settings = await sql<{ value: string }>`
      select value from site_settings where key = 'require_invite'
    `;
    const inviteRows =
      viewer.role === "admin"
        ? await sql<{
            id: string;
            code: string;
            note: string;
            max_uses: number;
            uses: number;
            revoked: boolean;
            created_at: unknown;
          }>`
            select id, code, note, max_uses, uses, revoked, created_at
            from invite_codes
            order by created_at desc
            limit 200
          `
        : [];
    return {
      viewerRole: viewer.role,
      counts: {
        listings: num(listings[0]?.n),
        deals: num(deals[0]?.n),
        openReports: num(openReports[0]?.n),
        users: num(users[0]?.n),
      },
      requireInvite: settings[0]?.value === "true",
      invites: inviteRows.map((row) => ({
        id: row.id,
        code: row.code,
        note: row.note,
        maxUses: num(row.max_uses),
        uses: num(row.uses),
        revoked: Boolean(row.revoked),
        createdAt: iso(row.created_at),
      })),
      reports: reports.map((r) => ({
        id: r.id,
        reason: r.reason,
        listingId: r.listing_id,
        listingTitle: r.listing_title,
        reporterHandle: r.handle,
        createdAt: iso(r.created_at),
      })),
      listings: recentLots,
      deals: recentDeals.map((d) => ({
        id: d.id,
        publicNo: num(d.public_no),
        title: d.title,
        status: d.status as DealStatus,
        sellerHandle: d.seller_handle,
        buyerHandle: d.buyer_handle,
      })),
      users: people.map((p) => ({
        userId: p.user_id,
        handle: p.handle,
        displayName: p.display_name,
        banned: Boolean(p.banned),
        role: asRole(p.role),
        providers: accounts.filter((a) => a.user_id === p.user_id).map((a) => a.provider_id),
        badges: asBadges(p.badges),
        premiumForever: Boolean(p.premium_forever),
        premiumUntil: p.premium_until == null ? null : iso(p.premium_until),
        premium: premiumActive(Boolean(p.premium_forever), p.premium_until == null ? null : iso(p.premium_until)),
      })),
    };
  });

export const adminModerate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустое действие");
    const o = input as Record<string, unknown>;
    if (o.action === "remove-listing" && typeof o.listingId === "string" && UUID_RE.test(o.listingId)) {
      return { action: "remove-listing" as const, listingId: o.listingId };
    }
    if (
      (o.action === "dismiss-report" || o.action === "action-report") &&
      typeof o.reportId === "string" &&
      UUID_RE.test(o.reportId)
    ) {
      return { action: o.action, reportId: o.reportId };
    }
    if (o.action === "ban" && typeof o.userId === "string" && typeof o.banned === "boolean") {
      return { action: "ban" as const, userId: o.userId, banned: o.banned };
    }
    if (
      o.action === "set-role" &&
      typeof o.userId === "string" &&
      (o.role === "user" || o.role === "moderator" || o.role === "admin")
    ) {
      return { action: "set-role" as const, userId: o.userId, role: o.role };
    }
    if (o.action === "set-badges" && typeof o.userId === "string" && Array.isArray(o.badges)) {
      const badges = asBadges(o.badges);
      if (badges.length !== o.badges.length) fail("Неизвестный значок");
      return { action: "set-badges" as const, userId: o.userId, badges };
    }
    if (o.action === "set-require-invite" && typeof o.enabled === "boolean") {
      return { action: "set-require-invite" as const, enabled: o.enabled };
    }
    if (o.action === "create-invite") {
      const maxUses = Number(o.maxUses);
      const note = typeof o.note === "string" ? o.note.replace(/\s+/g, " ").trim().slice(0, 80) : "";
      if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100) fail("Число использований — от 1 до 100");
      return { action: "create-invite" as const, maxUses, note };
    }
    if (o.action === "revoke-invite" && typeof o.inviteId === "string" && UUID_RE.test(o.inviteId)) {
      return { action: "revoke-invite" as const, inviteId: o.inviteId };
    }
    if (
      (o.action === "grant-premium-month" || o.action === "grant-premium-forever" || o.action === "revoke-premium") &&
      typeof o.userId === "string"
    ) {
      return { action: o.action, userId: o.userId };
    }
    fail("Некорректное действие");
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const actor = await requireStaff(sql, context.userId);
    if (data.action === "remove-listing") {
      const listingId = data.listingId;
      if (!listingId) fail("Некорректный лот");
      await purgeListing(sql, listingId);
    } else if (data.action === "dismiss-report") {
      await sql`update reports set status = 'dismissed' where id = ${data.reportId}`;
    } else if (data.action === "action-report") {
      const report = await sql<{ listing_id: string | null }>`
        select listing_id from reports where id = ${data.reportId}
      `;
      await sql`update reports set status = 'actioned' where id = ${data.reportId}`;
      if (report[0]?.listing_id) await purgeListing(sql, report[0].listing_id);
    } else if (data.action === "ban") {
      if (data.userId === context.userId) fail("Нельзя ограничить себя");
      const target = await sql<{ role: string }>`
        select role from profiles where user_id = ${data.userId}
      `;
      if (!target[0]) fail("Пользователь не найден");
      const targetRole = asRole(target[0].role);
      if (actor.role !== "admin" && targetRole !== "user") {
        fail("Модератор может ограничивать только участников");
      }
      await sql`update profiles set banned = ${data.banned} where user_id = ${data.userId}`;
    } else if (data.action === "set-role") {
      if (actor.role !== "admin") fail("Роли назначает только администратор");
      if (data.userId === context.userId) fail("Нельзя сменить свою роль");
      const updated = await sql`
        update profiles
        set role = ${data.role}, is_admin = ${data.role === "admin"}
        where user_id = ${data.userId}
      `;
      if (updated.length === 0) {
        const exists = await sql<{ user_id: string }>`
          select user_id from profiles where user_id = ${data.userId}
        `;
        if (!exists[0]) fail("Пользователь не найден");
      }
    } else if (data.action === "set-badges") {
      if (actor.role !== "admin") fail("Значки выдаёт только администратор");
      const badges = data.badges ?? [];
      const flag = `{${badges.join(",")}}`;
      const updated = await sql`
        update profiles set badges = ${flag}::text[] where user_id = ${data.userId} returning user_id
      `;
      if (!updated[0]) fail("Пользователь не найден");
    } else if (data.action === "set-require-invite" || data.action === "create-invite" || data.action === "revoke-invite") {
      if (actor.role !== "admin") fail("Инвайты настраивает только администратор");
      if (data.action === "set-require-invite") {
        const value = data.enabled ? "true" : "false";
        await sql`
          insert into site_settings (key, value)
          values ('require_invite', ${value})
          on conflict (key) do update set value = excluded.value
        `;
      } else if (data.action === "create-invite") {
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const bytes = crypto.getRandomValues(new Uint8Array(8));
          const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
          code = `GLYPH-${chars.slice(0, 4)}-${chars.slice(4)}`;
          try {
            await sql`
              insert into invite_codes (id, code, created_by, note, max_uses)
              values (${crypto.randomUUID()}, ${code}, ${context.userId}, ${data.note}, ${data.maxUses})
            `;
            return { ok: true, code };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (!/duplicate|unique/i.test(msg) || attempt === 4) throw err;
          }
        }
      } else {
        await sql`update invite_codes set revoked = true where id = ${data.inviteId}`;
      }
    } else if (data.action === "grant-premium-month" || data.action === "grant-premium-forever" || data.action === "revoke-premium") {
      if (actor.role !== "admin") fail("Premium выдаёт только администратор");
      if (data.action === "grant-premium-month") {
        await sql`
          update profiles
          set premium_forever = false,
              premium_until = greatest(coalesce(premium_until, now()), now()) + interval '1 month'
          where user_id = ${data.userId}
        `;
      } else if (data.action === "grant-premium-forever") {
        await sql`
          update profiles set premium_forever = true, premium_until = null where user_id = ${data.userId}
        `;
      } else {
        await sql`
          update profiles set premium_forever = false, premium_until = null where user_id = ${data.userId}
        `;
      }
    }
    return { ok: true };
  });

export const listRecommendations = createServerFn({ method: "GET" }).handler(async (): Promise<ListingCard[]> => {
  const sql = await getSql();
  await settle(sql);
  const hot = await sql.query<CardRow>(
    `select ${CARD_SQL}
     from listings l
     left join profiles p on p.user_id = l.seller_id
     where l.status = 'active' and l.kind = 'auction'
       and (l.bid_count >= 1 or (l.boosted_until is not null and l.boosted_until > now()))
     order by (l.boosted_until is not null and l.boosted_until > now()) desc, l.bid_count desc, l.created_at desc
     limit ${TOP_LIMIT}`,
  );
  return hot.map(mapCard);
});

export const listMine = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ListingCard[]> => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const items = await sql.query<CardRow>(
      `select ${CARD_SQL}
       from listings l
       left join profiles p on p.user_id = l.seller_id
       where l.seller_id = $1 and l.status not in ('removed', 'draft')
       order by (l.kind = 'auction') desc, l.pinned desc, l.created_at desc
       limit 80`,
      [context.userId],
    );
    return markLiked(sql, context.userId, items.map(mapCard));
  });

export const setPinned = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пусто");
    const o = input as Record<string, unknown>;
    if (typeof o.id !== "string" || !UUID_RE.test(o.id)) fail("Некорректный лот");
    if (typeof o.pinned !== "boolean") fail("Некорректный флаг");
    return { id: o.id, pinned: o.pinned };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    if (data.pinned) {
      const profile = await ensureProfile(sql, context.userId);
      if (!profile.premium) fail("Закреп на профиле доступен с Premium");
      const n = await sql<{ n: number }>`
        select count(*)::int as n from listings
        where seller_id = ${context.userId} and pinned and id <> ${data.id} and status <> 'removed'
      `;
      if (num(n[0]?.n) >= PIN_LIMIT) fail(`Можно закрепить не больше ${PIN_LIMIT} лотов`);
    }
    const updated = await sql`
      update listings set pinned = ${data.pinned}, updated_at = now()
      where id = ${data.id} and seller_id = ${context.userId} and status <> 'removed'
      returning id
    `;
    if (!updated[0]) fail("Этот лот нельзя закрепить");
    return { ok: true };
  });

export const boostListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пусто");
    const o = input as Record<string, unknown>;
    if (typeof o.id !== "string" || !UUID_RE.test(o.id)) fail("Некорректный лот");
    const hours = Number(o.hours);
    if (hours !== 24 && hours !== 48 && hours !== 72) fail("Буст на 24, 48 или 72 часа");
    return { id: o.id, hours };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    if (!profile.premium) fail("Буст лотов доступен с Premium");
    assertLive(profile);
    const updated = await sql<{ boosted_until: unknown }>`
      update listings
      set boosted_until = now() + (${data.hours} * interval '1 hour'), updated_at = now()
      where id = ${data.id} and seller_id = ${context.userId} and status = 'active'
      returning boosted_until
    `;
    if (!updated[0]) fail("Буст только у активного лота");
    return { until: iso(updated[0].boosted_until) };
  });

export const setPostPinned = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пусто");
    const o = input as Record<string, unknown>;
    if (typeof o.id !== "string" || !UUID_RE.test(o.id)) fail("Некорректный пост");
    if (typeof o.pinned !== "boolean") fail("Некорректный флаг");
    return { id: o.id, pinned: o.pinned };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    if (data.pinned && !profile.premium) fail("Закреп постов доступен с Premium");
    if (data.pinned) {
      const n = await sql<{ n: number }>`
        select count(*)::int as n from posts where author_id = ${context.userId} and pinned and id <> ${data.id}
      `;
      if (num(n[0]?.n) >= PIN_LIMIT) fail(`Можно закрепить не больше ${PIN_LIMIT} постов`);
    }
    const updated = await sql`
      update posts set pinned = ${data.pinned}
      where id = ${data.id} and author_id = ${context.userId}
      returning id
    `;
    if (!updated[0]) fail("Этот пост нельзя закрепить");
    return { ok: true };
  });

export const updateProfileLook = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустая форма");
    const o = input as Record<string, unknown>;
    return {
      theme: asTheme(o.theme),
      accent: asAccent(o.accent),
      avatarFrame: asFrame(o.avatarFrame),
      bannerOverlay: asOverlay(o.bannerOverlay),
    };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    if (!profile.premium) fail("Оформление профиля доступно с Premium");
    await sql`
      update profiles
      set theme = ${data.theme},
          accent = ${data.accent},
          avatar_frame = ${data.avatarFrame},
          banner_overlay = ${data.bannerOverlay}
      where user_id = ${context.userId}
    `;
    return { ok: true };
  });

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
    return id;
  })
  .handler(async ({ data: listingId, context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertLive(profile);
    const lot = await sql<{ seller_id: string; title: string }>`
      select seller_id, title from listings where id = ${listingId} and status <> 'removed'
    `;
    if (!lot[0]) fail("Лот не найден");
    const existing = await sql`
      select listing_id from listing_likes where listing_id = ${listingId} and user_id = ${context.userId}
    `;
    if (existing[0]) {
      await sql`delete from listing_likes where listing_id = ${listingId} and user_id = ${context.userId}`;
      return { liked: false };
    }
    await sql`insert into listing_likes (listing_id, user_id) values (${listingId}, ${context.userId})`;
    if (lot[0].seller_id !== context.userId) {
      await notify(
        sql,
        lot[0].seller_id,
        "like",
        "Новый лайк",
        `${profile.handle} отметил(а) «${lot[0].title}»`,
        `/lot/${listingId}`,
      );
    }
    return { liked: true };
  });

export const addListingComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустой комментарий");
    const o = input as Record<string, unknown>;
    if (typeof o.listingId !== "string" || !UUID_RE.test(o.listingId)) fail("Некорректный лот");
    const body = cleanText(typeof o.body === "string" ? o.body : "", 500);
    if (body.length < 1) fail("Напишите комментарий");
    return { listingId: o.listingId, body };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertLive(profile);
    const lot = await sql<{ seller_id: string; title: string; status: string }>`
      select seller_id, title, status from listings where id = ${data.listingId}
    `;
    if (!lot[0] || lot[0].status === "removed") fail("Лот не найден");
    await sql`
      insert into listing_comments (id, listing_id, author_id, body)
      values (${crypto.randomUUID()}, ${data.listingId}, ${context.userId}, ${data.body})
    `;
    if (lot[0].seller_id !== context.userId) {
      await notify(
        sql,
        lot[0].seller_id,
        "comment",
        "Комментарий к лоту",
        `${profile.handle}: ${data.body.slice(0, 140)}`,
        `/lot/${data.listingId}`,
      );
    }
    return { ok: true };
  });

export const deleteListingComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный комментарий");
    return id;
  })
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    const me = await ensureProfile(sql, context.userId);
    const row = await sql<{ author_id: string }>`select author_id from listing_comments where id = ${id}`;
    if (!row[0]) fail("Комментарий уже удалён");
    if (row[0].author_id !== context.userId && !isStaff(me.role)) fail("Нельзя удалить этот комментарий");
    await sql`delete from listing_comments where id = ${id}`;
    return { ok: true };
  });

const IMAGE_MAX: Record<ProfileImageKind, number> = {
  avatar: 500_000,
  banner: 1_200_000,
  background: 1_200_000,
};

export const uploadProfileImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустой файл");
    const o = input as Record<string, unknown>;
    if (o.kind !== "avatar" && o.kind !== "banner" && o.kind !== "background") fail("Неизвестный кадр");
    if (typeof o.b64 !== "string") fail("Файл не прочитан");
    const b64 = o.b64.replace(/^data:[^,]*,/, "").replace(/\s/g, "");
    if (b64.length > 4_500_000) fail("Файл больше лимита");
    const kind: ProfileImageKind = o.kind;
    return { kind, b64 };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const buf = Buffer.from(data.b64, "base64");
    const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const magic = sniffMagic(bytes);
    if (!magic || !isRaster(magic)) fail("Нужны PNG, JPG, WEBP или GIF");
    if (magic === "image/gif" && !profile.premium) fail("GIF в аватарке, шапке и фоне доступен с Premium");
    const max = profile.premium
      ? data.kind === "avatar"
        ? 1_500_000
        : 3_000_000
      : IMAGE_MAX[data.kind];
    if (buf.length > max) {
      fail(profile.premium ? "Картинка больше лимита Premium" : data.kind === "avatar" ? "Аватар больше 500 КБ" : "Картинка больше 1.2 МБ");
    }
    const size = decodedImageSize(bytes);
    if (!size) fail("Не удалось прочитать изображение");
    const cap = data.kind === "avatar" ? 2000 : MAX_DIM;
    if (size.width > cap || size.height > cap) fail(`Слишком большой кадр, максимум ${cap}px`);
    await sql`
      insert into profile_images (user_id, kind, mime, data_b64)
      values (${context.userId}, ${data.kind}, ${magic}, ${buf.toString("base64")})
      on conflict (user_id, kind) do update
        set mime = excluded.mime, data_b64 = excluded.data_b64
    `;
    return { ok: true };
  });

export const clearProfileImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((kind: unknown) => {
    if (kind !== "avatar" && kind !== "banner" && kind !== "background") fail("Неизвестный кадр");
    return kind;
  })
  .handler(async ({ data: kind, context }) => {
    const sql = await getSql();
    await sql`delete from profile_images where user_id = ${context.userId} and kind = ${kind}`;
    return { ok: true };
  });

export const listThreads = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ThreadPreview[]> => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const rows = await sql<{
      id: string;
      other_handle: string;
      other_name: string;
      other_premium: boolean;
      last_body: string | null;
      updated_at: unknown;
    }>`
      select t.id,
        case when t.low_id = ${context.userId} then hi.handle else lo.handle end as other_handle,
        case when t.low_id = ${context.userId} then hi.display_name else lo.display_name end as other_name,
        case when t.low_id = ${context.userId}
          then (coalesce(hi.premium_forever, false) or (hi.premium_until is not null and hi.premium_until > now()))
          else (coalesce(lo.premium_forever, false) or (lo.premium_until is not null and lo.premium_until > now()))
        end as other_premium,
        (
          select m.body from dm_messages m where m.thread_id = t.id order by m.created_at desc limit 1
        ) as last_body,
        coalesce(
          (select m.created_at from dm_messages m where m.thread_id = t.id order by m.created_at desc limit 1),
          t.created_at
        ) as updated_at
      from dm_threads t
      join profiles lo on lo.user_id = t.low_id
      join profiles hi on hi.user_id = t.high_id
      where (t.low_id = ${context.userId} or t.high_id = ${context.userId})
        and exists (select 1 from dm_messages m where m.thread_id = t.id)
      order by updated_at desc
      limit 40
    `;
    return rows.map((r) => ({
      id: r.id,
      otherHandle: r.other_handle,
      otherName: r.other_name,
      otherPremium: Boolean(r.other_premium),
      lastBody: r.last_body,
      updatedAt: iso(r.updated_at),
    }));
  });

async function loadThread(sql: Sql, threadId: string, userId: string): Promise<ThreadDetail | null> {
  const rows = await sql<{
    id: string;
    low_id: string;
    high_id: string;
    other_handle: string;
    other_name: string;
    other_premium: boolean;
  }>`
    select t.id, t.low_id, t.high_id,
      case when t.low_id = ${userId} then hi.handle else lo.handle end as other_handle,
      case when t.low_id = ${userId} then hi.display_name else lo.display_name end as other_name,
      case when t.low_id = ${userId}
        then (coalesce(hi.premium_forever, false) or (hi.premium_until is not null and hi.premium_until > now()))
        else (coalesce(lo.premium_forever, false) or (lo.premium_until is not null and lo.premium_until > now()))
      end as other_premium
    from dm_threads t
    join profiles lo on lo.user_id = t.low_id
    join profiles hi on hi.user_id = t.high_id
    where t.id = ${threadId} and (t.low_id = ${userId} or t.high_id = ${userId})
  `;
  const thread = rows[0];
  if (!thread) return null;
  const messages = await sql<{
    id: string;
    sender_id: string;
    handle: string;
    premium: boolean;
    body: string;
    created_at: unknown;
  }>`
    select m.id, m.sender_id, p.handle, m.body, m.created_at,
      (coalesce(p.premium_forever, false) or (p.premium_until is not null and p.premium_until > now())) as premium
    from dm_messages m
    join profiles p on p.user_id = m.sender_id
    where m.thread_id = ${threadId}
    order by m.created_at asc
    limit 200
  `;
  const last = messages[messages.length - 1];
  return {
    id: thread.id,
    otherHandle: thread.other_handle,
    otherName: thread.other_name,
    otherPremium: Boolean(thread.other_premium),
    lastBody: last?.body ?? null,
    updatedAt: last ? iso(last.created_at) : new Date().toISOString(),
    messages: messages.map((m) => ({
      id: m.id,
      handle: m.handle,
      body: m.body,
      createdAt: iso(m.created_at),
      mine: m.sender_id === userId,
      premium: Boolean(m.premium),
    })),
  };
}

export const openThread = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((handle: unknown) => {
    const h = typeof handle === "string" ? handle.trim().toLocaleLowerCase("ru") : "";
    if (!cleanHandle(h)) fail("Некорректный профиль");
    return h;
  })
  .handler(async ({ data: handle, context }): Promise<ThreadDetail> => {
    const sql = await getSql();
    const me = await ensureProfile(sql, context.userId);
    assertLive(me);
    const other = await sql<{ user_id: string }>`select user_id from profiles where handle = ${handle}`;
    if (!other[0]) fail("Такого профиля нет");
    if (other[0].user_id === context.userId) fail("Себе написать нельзя");
    const [low, high] =
      context.userId < other[0].user_id
        ? [context.userId, other[0].user_id]
        : [other[0].user_id, context.userId];
    const existing = await sql<{ id: string }>`
      select id from dm_threads where low_id = ${low} and high_id = ${high}
    `;
    if (!existing[0]) {
      const person = await sql<{ handle: string; display_name: string; premium: boolean }>`
        select handle, display_name,
          (coalesce(premium_forever, false) or (premium_until is not null and premium_until > now())) as premium
        from profiles where user_id = ${other[0].user_id}
      `;
      return {
        id: "",
        otherHandle: person[0]?.handle ?? handle,
        otherName: person[0]?.display_name ?? handle,
        otherPremium: Boolean(person[0]?.premium),
        lastBody: null,
        updatedAt: new Date().toISOString(),
        messages: [],
      };
    }
    const loaded = await loadThread(sql, existing[0].id, context.userId);
    if (!loaded) fail("Чат не открылся");
    return loaded;
  });

export const getThread = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный чат");
    return id;
  })
  .handler(async ({ data: id, context }): Promise<ThreadDetail | null> => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    return loadThread(sql, id, context.userId);
  });

export const sendDirect = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустое сообщение");
    const o = input as Record<string, unknown>;
    let threadId = "";
    if (typeof o.threadId === "string" && UUID_RE.test(o.threadId)) threadId = o.threadId;
    const handle = typeof o.handle === "string" ? o.handle.trim().toLocaleLowerCase("ru") : "";
    if (!threadId && !cleanHandle(handle)) fail("Некорректный чат");
    const body = cleanText(typeof o.body === "string" ? o.body : "", 2000);
    if (body.length < 1) fail("Напишите сообщение");
    return { threadId, handle, body };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const me = await ensureProfile(sql, context.userId);
    assertLive(me);
    let threadId = data.threadId;
    if (!threadId) {
      const other = await sql<{ user_id: string }>`select user_id from profiles where handle = ${data.handle}`;
      if (!other[0]) fail("Такого профиля нет");
      if (other[0].user_id === context.userId) fail("Себе написать нельзя");
      const [low, high] =
        context.userId < other[0].user_id
          ? [context.userId, other[0].user_id]
          : [other[0].user_id, context.userId];
      const existing = await sql<{ id: string }>`
        select id from dm_threads where low_id = ${low} and high_id = ${high}
      `;
      threadId = existing[0]?.id ?? crypto.randomUUID();
      if (!existing[0]) {
        await sql`insert into dm_threads (id, low_id, high_id) values (${threadId}, ${low}, ${high})`;
      }
    }
    const thread = await sql<{ low_id: string; high_id: string }>`
      select low_id, high_id from dm_threads
      where id = ${threadId} and (low_id = ${context.userId} or high_id = ${context.userId})
    `;
    if (!thread[0]) fail("Нет доступа к чату");
    await sql`
      insert into dm_messages (id, thread_id, sender_id, body)
      values (${crypto.randomUUID()}, ${threadId}, ${context.userId}, ${data.body})
    `;
    const other = thread[0].low_id === context.userId ? thread[0].high_id : thread[0].low_id;
    await notify(sql, other, "dm", "Новое сообщение", `${me.handle}: ${data.body.slice(0, 140)}`, "/chats");
    return { ok: true, threadId };
  });

async function loadAuthorPosts(sql: Sql, authorId: string): Promise<AuthorPost[]> {
  const rows = await sql<{
    id: string;
    body: string;
    created_at: unknown;
    handle: string;
    display_name: string;
    author_created: unknown;
    pinned: boolean;
    author_premium: boolean;
  }>`
    select p.id, p.body, p.created_at, coalesce(p.pinned, false) as pinned,
      a.handle, a.display_name, a.created_at as author_created,
      (coalesce(a.premium_forever, false) or (a.premium_until is not null and a.premium_until > now())) as author_premium
    from posts p
    join profiles a on a.user_id = p.author_id
    where p.author_id = ${authorId}
    order by p.pinned desc, p.created_at desc
    limit 40
  `;
  return hydratePosts(sql, rows);
}

async function hydratePosts(
  sql: Sql,
  rows: {
    id: string;
    body: string;
    created_at: unknown;
    handle: string;
    display_name: string;
    author_created: unknown;
    pinned?: boolean;
    author_premium?: boolean;
  }[],
): Promise<AuthorPost[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const [images, comments] = await Promise.all([
    sql<{ id: string; post_id: string; card_b64: string }>`
      select id, post_id, card_b64 from post_images
      where post_id = any(${ids}::text[])
      order by sort asc
    `,
    sql<{
      id: string;
      post_id: string;
      parent_id: string | null;
      body: string;
      created_at: unknown;
      handle: string;
      display_name: string;
      author_premium: boolean;
    }>`
      select c.id, c.post_id, c.parent_id, c.body, c.created_at, a.handle, a.display_name,
        (coalesce(a.premium_forever, false) or (a.premium_until is not null and a.premium_until > now())) as author_premium
      from post_comments c
      join profiles a on a.user_id = c.author_id
      where c.post_id = any(${ids}::text[])
      order by c.created_at asc
      limit 400
    `,
  ]);
  return rows.map((row) => {
    const createdAt = iso(row.author_created);
    return {
      id: row.id,
      body: row.body,
      createdAt: iso(row.created_at),
      authorHandle: row.handle,
      authorName: row.display_name,
      authorIsNew: isNewAccount(createdAt),
      authorPremium: Boolean(row.author_premium),
      pinned: Boolean(row.pinned),
      images: images
        .filter((image) => image.post_id === row.id && image.card_b64.length > 32 && image.card_b64.length < 300_000)
        .map((image) => ({ id: image.id, src: `data:image/jpeg;base64,${image.card_b64}` })),
      comments: comments
        .filter((comment) => comment.post_id === row.id)
        .map((comment) => ({
          id: comment.id,
          parentId: comment.parent_id,
          body: comment.body,
          createdAt: iso(comment.created_at),
          authorHandle: comment.handle,
          authorName: comment.display_name,
          authorPremium: Boolean(comment.author_premium),
        })),
    };
  });
}

export const listProfileLots = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Некорректный профиль");
    const o = input as Record<string, unknown>;
    const handle = typeof o.handle === "string" ? o.handle.trim().toLocaleLowerCase("ru") : "";
    if (!cleanHandle(handle)) fail("Некорректный профиль");
    const page = Number(o.page);
    return { handle, page: Number.isInteger(page) && page > 0 && page < 500 ? page : 1 };
  })
  .handler(async ({ data }): Promise<{ items: ListingCard[]; total: number }> => {
    const sql = await getSql();
    const profile = await sql<{ user_id: string }>`select user_id from profiles where handle = ${data.handle}`;
    if (!profile[0]) return { items: [], total: 0 };
    const offset = (data.page - 1) * PROFILE_LOT_PAGE;
    const [items, totalRow] = await Promise.all([
      sql.query<CardRow>(
        `select ${CARD_SQL}
         from listings l
         left join profiles p on p.user_id = l.seller_id
         where l.seller_id = $1 and l.status in ('active', 'sold', 'ended')
         order by l.pinned desc, l.created_at desc
         limit $2 offset $3`,
        [profile[0].user_id, PROFILE_LOT_PAGE, offset],
      ),
      sql<{ n: number }>`
        select count(*)::int as n from listings
        where seller_id = ${profile[0].user_id} and status in ('active', 'sold', 'ended')
      `,
    ]);
    return { items: items.map(mapCard), total: num(totalRow[0]?.n) };
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((handle: unknown) => {
    const h = typeof handle === "string" ? handle.trim().toLocaleLowerCase("ru") : "";
    if (!cleanHandle(h)) fail("Некорректный профиль");
    return h;
  })
  .handler(async ({ data: handle, context }) => {
    const sql = await getSql();
    const me = await ensureProfile(sql, context.userId);
    assertLive(me);
    const target = await sql<{ user_id: string }>`select user_id from profiles where handle = ${handle}`;
    if (!target[0]) fail("Профиль не найден");
    if (target[0].user_id === context.userId) fail("На себя подписаться нельзя");
    const existing = await sql`
      select follower_id from follows
      where follower_id = ${context.userId} and following_id = ${target[0].user_id}
    `;
    if (existing[0]) {
      await sql`
        delete from follows
        where follower_id = ${context.userId} and following_id = ${target[0].user_id}
      `;
      return { following: false };
    }
    await sql`
      insert into follows (follower_id, following_id)
      values (${context.userId}, ${target[0].user_id})
    `;
    return { following: true };
  });

export const listFeed = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<FeedEntry[]> => {
    const sql = await getSql();
    await settle(sql);
    await ensureProfile(sql, context.userId);
    const followed = await sql<{ following_id: string }>`
      select following_id from follows where follower_id = ${context.userId}
    `;
    const ids = [context.userId, ...followed.map((row) => row.following_id)];
    const [lots, postRows] = await Promise.all([
      sql.query<CardRow & { listed_at: unknown; seller_created: unknown }>(
        `select ${CARD_SQL}, l.created_at as listed_at, p.created_at as seller_created
         from listings l
         left join profiles p on p.user_id = l.seller_id
         where l.seller_id = any($1::text[]) and l.status = 'active'
         order by l.created_at desc
         limit 30`,
        [ids],
      ),
      sql<{
        id: string;
        body: string;
        created_at: unknown;
        handle: string;
        display_name: string;
        author_created: unknown;
        pinned: boolean;
        author_premium: boolean;
      }>`
        select p.id, p.body, p.created_at, coalesce(p.pinned, false) as pinned, a.handle, a.display_name, a.created_at as author_created,
          (coalesce(a.premium_forever, false) or (a.premium_until is not null and a.premium_until > now())) as author_premium
        from posts p
        join profiles a on a.user_id = p.author_id
        where p.author_id = any(${ids}::text[])
        order by p.created_at desc
        limit 30
      `,
    ]);
    const posts = await hydratePosts(sql, postRows);
    const entries: FeedEntry[] = [
      ...lots.map((row) => ({
        kind: "lot" as const,
        at: iso(row.listed_at),
        lot: mapCard(row),
        authorIsNew: isNewAccount(iso(row.seller_created)),
      })),
      ...posts.map((post) => ({ kind: "post" as const, at: post.createdAt, post })),
    ];
    entries.sort((a, b) => {
      const boostA = a.kind === "lot" && a.lot.boosted ? 1 : 0;
      const boostB = b.kind === "lot" && b.lot.boosted ? 1 : 0;
      if (boostA !== boostB) return boostB - boostA;
      return a.at < b.at ? 1 : -1;
    });
    return entries.slice(0, 40);
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустой пост");
    const o = input as Record<string, unknown>;
    const body = cleanText(typeof o.body === "string" ? o.body : "", 2000);
    if (body.length < 1) fail("Напишите текст поста");
    const images = Array.isArray(o.images) ? o.images.filter((item): item is string => typeof item === "string") : [];
    if (images.length > 4) fail("Не больше 4 картинок");
    return { body, images: images.map((item) => item.replace(/^data:[^,]*,/, "").replace(/\s/g, "")) };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const me = await ensureProfile(sql, context.userId);
    assertLive(me);
    const ready: Buffer[] = [];
    for (const raw of data.images) {
      if (raw.length < 32 || raw.length > 280_000) fail("Картинка поста слишком большая");
      const buf = Buffer.from(raw, "base64");
      if (buf.length < 32 || buf[0] !== 0xff || buf[1] !== 0xd8) fail("Картинка поста должна быть JPEG");
      ready.push(buf);
    }
    const id = crypto.randomUUID();
    await sql`insert into posts (id, author_id, body) values (${id}, ${context.userId}, ${data.body})`;
    for (let sort = 0; sort < ready.length; sort += 1) {
      await sql`
        insert into post_images (id, post_id, card_b64, sort)
        values (${crypto.randomUUID()}, ${id}, ${ready[sort]!.toString("base64")}, ${sort})
      `;
    }
    return { id };
  });

export const addPostComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустой комментарий");
    const o = input as Record<string, unknown>;
    if (typeof o.postId !== "string" || !UUID_RE.test(o.postId)) fail("Некорректный пост");
    const parentId = typeof o.parentId === "string" && UUID_RE.test(o.parentId) ? o.parentId : null;
    const body = cleanText(typeof o.body === "string" ? o.body : "", 500);
    if (body.length < 1) fail("Напишите комментарий");
    return { postId: o.postId, parentId, body };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const me = await ensureProfile(sql, context.userId);
    assertLive(me);
    const post = await sql<{ id: string; author_id: string; handle: string }>`
      select p.id, p.author_id, a.handle
      from posts p
      join profiles a on a.user_id = p.author_id
      where p.id = ${data.postId}
    `;
    if (!post[0]) fail("Пост не найден");
    let parentId = data.parentId;
    if (parentId) {
      const parent = await sql<{ id: string; parent_id: string | null; post_id: string }>`
        select id, parent_id, post_id from post_comments where id = ${parentId}
      `;
      if (!parent[0] || parent[0].post_id !== data.postId) fail("Некого ответить");
      parentId = parent[0].parent_id ?? parent[0].id;
    }
    await sql`
      insert into post_comments (id, post_id, author_id, parent_id, body)
      values (${crypto.randomUUID()}, ${data.postId}, ${context.userId}, ${parentId}, ${data.body})
    `;
    if (post[0].author_id !== context.userId) {
      await notify(
        sql,
        post[0].author_id,
        "comment",
        "Комментарий к посту",
        `${me.handle}: ${data.body.slice(0, 140)}`,
        `/u/${post[0].handle}`,
      );
    }
    return { ok: true };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный пост");
    return id;
  })
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    const me = await ensureProfile(sql, context.userId);
    const row = await sql<{ author_id: string }>`select author_id from posts where id = ${id}`;
    if (!row[0]) fail("Пост уже удалён");
    if (row[0].author_id !== context.userId && !isStaff(me.role)) fail("Нельзя удалить этот пост");
    await sql`delete from posts where id = ${id}`;
    return { ok: true };
  });


