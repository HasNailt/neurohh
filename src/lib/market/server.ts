import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { optionalAuth } from "@/lib/market/optional-auth";
import { decodedImageSize, isRaster, psdSize, sniffMagic } from "@/lib/market/images";
import { asAccent, asFrame, asOverlay, asSideShape, asTheme, premiumActive } from "@/lib/market/themes";
import {
  ACTIVE_AUCTION_LIMIT,
  ACTIVE_FIXED_LIMIT,
  AVATAR_DIM,
  AVATAR_MAX,
  PROFILE_DECOR_DIM,
  PROFILE_DECOR_MAX,
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
  PREMIUM_AUCTION_LIMIT,
  PREMIUM_FIXED_LIMIT,
  PREMIUM_BLURB_MAX,
  PREMIUM_PREVIEWS,
  PREVIEW_MAX,
  PROFILE_LOT_PAGE,
  SNIPE_OPTIONS,
  TOP_LIMIT,
  UUID_RE,
  POST_IMAGE_MAX,
  asEngine,
  asShowcase,
  cleanHandle,
  mentionHandles,
  slugHandle,
  likeContains,
  parseFeedQuery,
  parsePrice,
  tagParts,
  asRole,
  asPay,
  formatPrice,
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
  type LotSlot,
  type ListingStatus,
  type Me,
  type MediaMeta,
  type NewsPost,
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
  side_left_shape: string;
  side_right_shape: string;
  side_left_framed: boolean;
  side_right_framed: boolean;
  showcase: string;
};

const PROFILE_SELECT = `user_id, handle, display_name, bio, role, banned, status, links, badges, premium_forever, premium_until, theme, accent, avatar_frame, banner_overlay, side_left_shape, side_right_shape, side_left_framed, side_right_framed, showcase`;

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
    showcase: asShowcase(row.showcase),
    theme: asTheme(row.theme),
    accent: asAccent(row.accent),
    avatarFrame: asFrame(row.avatar_frame),
    bannerOverlay: asOverlay(row.banner_overlay),
    sideLeftShape: asSideShape(row.side_left_shape),
    sideRightShape: asSideShape(row.side_right_shape),
    sideLeftFramed: row.side_left_framed !== false,
    sideRightFramed: row.side_right_framed !== false,
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

async function mentionPeople(
  sql: Sql,
  actorId: string,
  actorHandle: string,
  source: string,
  href: string,
  texts: string[],
  allowIds?: string[],
) {
  try {
    const handles = mentionHandles(texts.filter(Boolean).join("\n"));
    const people = handles.length
      ? await sql<{ user_id: string; handle: string }>`
          select user_id, handle from profiles where handle = any(${handles}::text[])
        `
      : [];
    const allow = allowIds ? new Set(allowIds) : null;
    const targets = people.filter((person) => person.user_id !== actorId && (!allow || allow.has(person.user_id)));
    const ids = targets.map((person) => person.user_id);
    if (ids.length === 0) {
      await sql`delete from mentions where source = ${source}`;
      return;
    }
    await sql`
      delete from mentions
      where source = ${source} and not (user_id = any(${ids}::text[]))
    `;
    const preview = texts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 120);
    for (const person of targets) {
      const inserted = await sql<{ user_id: string }>`
        insert into mentions (id, user_id, actor_id, source, href)
        values (${crypto.randomUUID()}, ${person.user_id}, ${actorId}, ${source}, ${href})
        on conflict (user_id, source) do nothing
        returning user_id
      `;
      if (!inserted[0]) continue;
      await notify(
        sql,
        person.user_id,
        "mention",
        "Вас упомянули",
        preview ? `@${actorHandle}: ${preview}` : `@${actorHandle} упомянул(а) вас`,
        href,
      );
    }
  } catch (err) {
    console.error("[mention] failed", source, err);
  }
}

async function listingMentionText(sql: Sql, id: string): Promise<string[]> {
  const rows = await sql<{ title: string; blurb: string; rules: string }>`
    select title, blurb, coalesce(rules, '') as rules from listings where id = ${id}
  `;
  const items = await sql<{ title: string }>`select title from listing_items where listing_id = ${id}`;
  const row = rows[0];
  if (!row) return [];
  return [row.title, row.blurb, row.rules, ...items.map((item) => item.title)];
}

type CloseRow = {
  id: string;
  title: string;
  seller_id: string;
  winner_id: string | null;
  amount: number;
  currency: "rub" | "sw";
};

async function openDeal(sql: Sql, row: CloseRow): Promise<string | null> {
  if (!row.winner_id || row.winner_id === row.seller_id) return null;
  const id = crypto.randomUUID();
  const inserted = await sql<{ id: string; public_no: number }>`
    insert into deals (id, listing_id, seller_id, buyer_id, amount, currency, status, listing_title)
    values (${id}, ${row.id}, ${row.seller_id}, ${row.winner_id}, ${num(row.amount)}, ${asPay(row.currency)}, 'awaiting_payment', ${row.title})
    on conflict (listing_id) where item_id is null do nothing
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
  const body = `«${row.title}» · #${publicNo} · ${formatPrice(num(row.amount), asPay(row.currency))}`;
  await notify(sql, row.seller_id, "deal", "Новая сделка", body, href);
  if (row.winner_id !== row.seller_id) {
    await notify(sql, row.winner_id, "deal", "Вы забрали лот", body, href);
  }
  return dealId;
}

type LotteryRow = {
  id: string;
  title: string;
  seller_id: string;
  winner_count: number;
  currency: string;
  require_follow: boolean;
  require_like: boolean;
  require_comment: boolean;
};

async function lotteryEligible(
  sql: Sql,
  userId: string,
  row: { listing_id?: string; id?: string; seller_id: string; require_follow: boolean; require_like: boolean; require_comment: boolean },
): Promise<boolean> {
  const listingId = row.listing_id ?? row.id;
  if (!listingId) return false;
  if (row.require_follow) {
    const follow = await sql`
      select 1 as ok from follows where follower_id = ${userId} and following_id = ${row.seller_id}
    `;
    if (!follow[0]) return false;
  }
  if (row.require_like) {
    const like = await sql`
      select 1 as ok from listing_likes where listing_id = ${listingId} and user_id = ${userId}
    `;
    if (!like[0]) return false;
  }
  if (row.require_comment) {
    const comment = await sql`
      select 1 as ok from listing_comments where listing_id = ${listingId} and author_id = ${userId}
    `;
    if (!comment[0]) return false;
  }
  return true;
}

async function reviewLotteryEntries(sql: Sql, userId: string, filter: { listingId?: string; sellerId?: string }) {
  const rows = await sql<{
    listing_id: string;
    title: string;
    seller_id: string;
    require_follow: boolean;
    require_like: boolean;
    require_comment: boolean;
  }>`
    select e.listing_id, l.title, l.seller_id, l.require_follow, l.require_like, l.require_comment
    from lottery_entries e
    join listings l on l.id = e.listing_id
    where e.user_id = ${userId}
      and e.removed_at is null
      and e.won = false
      and l.status = 'active'
      and l.kind = 'lottery'
      and (${filter.listingId ?? null}::text is null or e.listing_id = ${filter.listingId ?? null})
      and (${filter.sellerId ?? null}::text is null or l.seller_id = ${filter.sellerId ?? null})
  `;
  for (const row of rows) {
    if (await lotteryEligible(sql, userId, row)) continue;
    const removed = await sql`
      update lottery_entries
      set removed_at = now()
      where listing_id = ${row.listing_id} and user_id = ${userId} and removed_at is null and won = false
      returning listing_id
    `;
    if (!removed[0]) continue;
    await notify(
      sql,
      userId,
      "system",
      "Система",
      `Вы сняты с лотереи «${row.title}» из-за нарушения правил`,
      `/lot/${row.listing_id}`,
    );
  }
}

async function openLotteryDeal(sql: Sql, row: LotteryRow, buyerId: string) {
  const existing = await sql<{ id: string }>`
    select d.id
    from deals d
    join listing_items i on i.id = d.item_id
    where d.listing_id = ${row.id} and i.buyer_id = ${buyerId}
    limit 1
  `;
  if (existing[0]) return;
  const pos = await sql<{ n: number }>`
    select coalesce(max(position), 0)::int + 1 as n from listing_items where listing_id = ${row.id}
  `;
  const position = Math.max(1, num(pos[0]?.n));
  const itemId = crypto.randomUUID();
  await sql`
    insert into listing_items (id, listing_id, position, title, price, status, buyer_id)
    values (${itemId}, ${row.id}, ${position}, ${`Приз ${position}`}, 1, 'sold', ${buyerId})
  `;
  const id = crypto.randomUUID();
  const inserted = await sql<{ id: string; public_no: number }>`
    insert into deals (id, listing_id, item_id, seller_id, buyer_id, amount, currency, status, listing_title)
    values (${id}, ${row.id}, ${itemId}, ${row.seller_id}, ${buyerId}, 0, ${asPay(row.currency)}, 'awaiting_payment', ${row.title})
    returning id, public_no
  `;
  const deal = inserted[0];
  if (!deal) return;
  const href = `/deals/${deal.id}`;
  const body = `«${row.title}» · #${num(deal.public_no)} · приз ${position}`;
  await notify(sql, row.seller_id, "deal", "Новая сделка", body, href);
  await notify(sql, buyerId, "deal", "Вы выиграли лотерею", body, href);
}

async function finishLottery(sql: Sql, row: LotteryRow) {
  const limit = Math.max(1, Math.min(20, num(row.winner_count) || 1));
  const already = await sql<{ user_id: string }>`
    select user_id from lottery_entries where listing_id = ${row.id} and won
  `;
  let winners = already;
  if (winners.length < limit) {
    const more = await sql<{ user_id: string }>`
      select e.user_id
      from lottery_entries e
      where e.listing_id = ${row.id}
        and e.removed_at is null
        and e.won = false
        and e.user_id <> ${row.seller_id}
        and (not ${Boolean(row.require_follow)} or exists (
          select 1 from follows f where f.follower_id = e.user_id and f.following_id = ${row.seller_id}
        ))
        and (not ${Boolean(row.require_like)} or exists (
          select 1 from listing_likes lk where lk.listing_id = e.listing_id and lk.user_id = e.user_id
        ))
        and (not ${Boolean(row.require_comment)} or exists (
          select 1 from listing_comments c where c.listing_id = e.listing_id and c.author_id = e.user_id
        ))
      order by random()
      limit ${limit - winners.length}
    `;
    for (const winner of more) {
      await sql`
        update lottery_entries set won = true, removed_at = null
        where listing_id = ${row.id} and user_id = ${winner.user_id}
      `;
    }
    winners = [...winners, ...more];
  }
  for (const winner of winners) await openLotteryDeal(sql, row, winner.user_id);
  await sql`
    update listings
    set status = ${winners.length > 0 ? "sold" : "ended"},
        winner_id = ${winners[0]?.user_id ?? null},
        updated_at = now()
    where id = ${row.id} and status = 'active'
  `;
  if (winners.length === 0) {
    await notify(
      sql,
      row.seller_id,
      "lottery_end",
      "Лотерея завершена",
      `«${row.title}» закрыта без победителей`,
      `/lot/${row.id}`,
    );
  }
}

async function drawLotteries(sql: Sql) {
  const claimed = await sql<LotteryRow>`
    update listings
    set drawn_at = now(), updated_at = now()
    where status = 'active' and kind = 'lottery' and ends_at is not null and ends_at <= now() and drawn_at is null
    returning id, title, seller_id, winner_count, currency, require_follow, require_like, require_comment
  `;
  const pending = await sql<LotteryRow>`
    select id, title, seller_id, winner_count, currency, require_follow, require_like, require_comment
    from listings
    where kind = 'lottery' and status = 'active' and drawn_at is not null
  `;
  const seen = new Set<string>();
  for (const row of [...claimed, ...pending]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    await finishLottery(sql, row);
  }
}

async function retainChats(sql: Sql) {
  try {
    await sql`delete from dm_message_images where created_at < now() - interval '30 days'`;
    await sql`delete from message_images where created_at < now() - interval '30 days'`;
    await sql`
      delete from messages
      where deal_id in (
        select id from deals
        where status = 'completed'
          and completed_at is not null
          and completed_at < now() - interval '2 months'
      )
    `;
  } catch (err) {
    console.error("[chat] retain failed", err);
  }
}

async function settle(sql: Sql) {
  try {
    await retainChats(sql);
    await drawLotteries(sql);
    const closed = await sql<CloseRow>`
      update listings
      set status = case when current_bidder_id is null then 'ended' else 'sold' end,
          winner_id = current_bidder_id,
          updated_at = now()
      where status = 'active' and kind = 'auction' and ends_at is not null and ends_at <= now()
      returning id, title, seller_id, winner_id, coalesce(current_bid, price) as amount, currency
    `;
    for (const row of closed) {
      if (row.winner_id && row.winner_id !== row.seller_id) {
        await openDeal(sql, row);
      } else {
        await notify(
          sql,
          row.seller_id,
          "auction_end",
          "Аукцион завершён",
          row.winner_id ? `«${row.title}» закрыт без сделки` : `«${row.title}» закрыт без ставок`,
          `/lot/${row.id}`,
        );
      }
    }
    const missing = await sql<CloseRow>`
      select l.id, l.title, l.seller_id, l.winner_id, coalesce(l.current_bid, l.price) as amount, l.currency
      from listings l
      left join deals d on d.listing_id = l.id and d.item_id is null
      where l.kind = 'auction' and l.status = 'sold' and l.winner_id is not null
        and l.winner_id <> l.seller_id and d.id is null
    `;
    for (const row of missing) await openDeal(sql, row);
  } catch (err) {
    console.error("[feed] settle failed", err);
  }
}

const CARD_SQL = `
  l.id, l.title, l.kind, l.price, l.buy_now, l.current_bid, l.bid_count, l.bid_step, l.currency,
  l.ends_at, l.status, l.seller_id, l.winner_id, l.pinned,
  coalesce(l.winner_count, 1) as winner_count,
  coalesce(l.require_follow, false) as require_follow,
  coalesce(l.require_like, false) as require_like,
  coalesce(l.require_comment, false) as require_comment,
  (select count(*)::int from lottery_entries e where e.listing_id = l.id and e.removed_at is null) as entry_count,
  (select count(*)::int from listing_likes lk where lk.listing_id = l.id) as like_count,
  coalesce(p.handle, '') as seller_handle, coalesce(p.display_name, '') as seller_name,
  (
    select m.id from media m
    where m.listing_id = l.id and m.kind = 'preview'
    order by m.is_cover desc, m.created_at asc
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
    order by m.is_cover desc, m.created_at asc
    limit 1
  ) as preview_inline,
  coalesce((
    select json_agg(json_build_object('slug', t.slug, 'label', t.label) order by t.label)
    from listing_tags lt
    join tags t on t.id = lt.tag_id
    where lt.listing_id = l.id
  ), '[]'::json) as tags,
  (l.boosted_until is not null and l.boosted_until > now()) as boosted,
  (coalesce(p.premium_forever, false) or (p.premium_until is not null and p.premium_until > now())) as seller_premium,
  coalesce((
    select string_agg(b.handle, ', ' order by b.handle)
    from (
      select distinct p2.handle as handle
      from listing_items i
      join profiles p2 on p2.user_id = i.buyer_id
      where i.listing_id = l.id and i.status = 'sold' and i.buyer_id is not null
      union
      select wp.handle
      from profiles wp
      where wp.user_id = l.winner_id
    ) b
  ), '') as buyer_handles
`;

type CardRow = {
  id: string;
  title: string;
  kind: "fixed" | "auction" | "lottery";
  price: number;
  buy_now: number | null;
  current_bid: number | null;
  bid_count: number;
  bid_step: number;
  currency: string;
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
  buyer_handles: string | null;
  winner_count?: number | null;
  entry_count?: number | null;
  require_follow?: boolean | null;
  require_like?: boolean | null;
  require_comment?: boolean | null;
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
    kind: row.kind === "auction" || row.kind === "lottery" ? row.kind : "fixed",
    price: num(row.price),
    buyNow: row.buy_now == null ? null : num(row.buy_now),
    currentBid: row.current_bid == null ? null : num(row.current_bid),
    bidCount: num(row.bid_count),
    bidStep: Math.max(1, num(row.bid_step)),
    currency: asPay(row.currency),
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
    buyerHandles: row.buyer_handles ? row.buyer_handles : null,
    winnerCount: Math.max(1, num(row.winner_count ?? 1)),
    entryCount: num(row.entry_count),
    requireFollow: Boolean(row.require_follow),
    requireLike: Boolean(row.require_like),
    requireComment: Boolean(row.require_comment),
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
    const pageSize = data.kind === "auction" || data.kind === "fixed" || data.kind === "lottery" || data.tag || data.pay ? GRID_PAGE : PAGE_SIZE;
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
        and ($5::text = '' or l.currency = $5)
    `;
    const params = [data.q, like, data.tag, data.kind, data.pay];
    const totalRows = await sql.query<{ n: number }>(`select count(*)::int as n ${where}`, params);
    const items = await sql.query<CardRow>(
      `select ${CARD_SQL} ${where} ${order} limit $6 offset $7`,
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

export const suggestHandles = createServerFn({ method: "GET" })
  .validator((q: unknown) => (typeof q === "string" ? q : ""))
  .handler(async ({ data }): Promise<PersonHit[]> => {
    const q = data.trim().toLocaleLowerCase("ru").replace(/[^\p{L}\p{N}_]/gu, "").slice(0, 20);
    const sql = await getSql();
    const rows = q
      ? await sql<{ handle: string; display_name: string; premium: boolean }>`
          select handle, display_name,
            (coalesce(premium_forever, false) or (premium_until is not null and premium_until > now())) as premium
          from profiles
          where handle like ${`${q}%`}
          order by handle asc
          limit 6
        `
      : await sql<{ handle: string; display_name: string; premium: boolean }>`
          select handle, display_name,
            (coalesce(premium_forever, false) or (premium_until is not null and premium_until > now())) as premium
          from profiles
          order by created_at desc
          limit 6
        `;
    return rows.map((row) => ({ handle: row.handle, displayName: row.display_name, premium: Boolean(row.premium) }));
  });

export const resolveHandles = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    const raw = Array.isArray(input) ? input : [];
    const handles = raw
      .filter((item): item is string => typeof item === "string")
      .map((item) => cleanHandle(item))
      .filter((item): item is string => Boolean(item));
    return [...new Set(handles)].slice(0, 80);
  })
  .handler(async ({ data }): Promise<string[]> => {
    if (data.length === 0) return [];
    const sql = await getSql();
    const rows = await sql<{ handle: string }>`
      select handle from profiles where handle = any(${data}::text[])
    `;
    return rows.map((row) => row.handle);
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
        price2: number | null;
        price2_label: string | null;
        engine: string | null;
        buy_now_currency: string | null;
        rules: string | null;
        require_follow: boolean | null;
        require_like: boolean | null;
        require_comment: boolean | null;
      }
    >(
      `select ${CARD_SQL}, l.blurb, l.anti_snipe_minutes, l.created_at, l.current_bidder_id,
              l.price2, l.price2_label, l.engine, l.buy_now_currency,
              l.rules, l.require_follow, l.require_like, l.require_comment
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

    const previews = await sql<{ id: string; card_b64: string | null; view_b64: string | null; is_cover: boolean }>`
      select id, card_b64, view_b64, is_cover
      from media
      where listing_id = ${id} and kind = 'preview'
      order by is_cover desc, created_at asc
    `;
    const bids = await sql<{
      id: string;
      amount: number;
      handle: string;
      premium: boolean;
      created_at: unknown;
      note: string;
      seller_note: string;
      bidder_id: string;
    }>`
      select b.id, b.amount, p.handle, b.created_at, b.note, b.seller_note, b.bidder_id,
        (coalesce(p.premium_forever, false) or (p.premium_until is not null and p.premium_until > now())) as premium
      from bids b
      join profiles p on p.user_id = b.bidder_id
      where b.listing_id = ${id}
      order by b.created_at desc
      limit 40
    `;
    let dealId: string | null = null;
    const slotRows = await sql<{
      id: string;
      title: string;
      price: number;
      status: string;
      buyer_id: string | null;
      deal_id: string | null;
      buyer_handle: string | null;
      buyer_premium: boolean;
    }>`
      select i.id, i.title, i.price, i.status, i.buyer_id, d.id as deal_id,
        bp.handle as buyer_handle,
        (coalesce(bp.premium_forever, false) or (bp.premium_until is not null and bp.premium_until > now())) as buyer_premium
      from listing_items i
      left join deals d on d.item_id = i.id
      left join profiles bp on bp.user_id = i.buyer_id
      where i.listing_id = ${id}
      order by i.position asc
    `;
    const slots: LotSlot[] =
      slotRows.length > 0
        ? slotRows.map((item) => ({
            id: item.id,
            title: item.title,
            price: num(item.price),
            status: item.status === "sold" ? "sold" : "open",
            dealId:
              userId && (isSeller || item.buyer_id === userId) ? (item.deal_id ?? null) : null,
            buyerHandle: item.buyer_handle,
            buyerPremium: Boolean(item.buyer_premium),
          }))
        : row.kind === "fixed"
          ? [
              {
                id: row.id,
                title: row.title,
                price: num(row.price),
                status: row.status === "sold" ? "sold" : "open",
                dealId: null,
                buyerHandle: row.buyer_handles ? row.buyer_handles.split(", ")[0] || null : null,
                buyerPremium: false,
              },
            ]
          : [];
    if (userId && slotRows.length === 0) {
      const deal = await sql<{ id: string }>`
        select id from deals
        where listing_id = ${id} and item_id is null and (seller_id = ${userId} or buyer_id = ${userId})
        limit 1
      `;
      dealId = deal[0]?.id ?? null;
      if (slots[0] && row.kind === "fixed") slots[0].dealId = dealId;
    } else if (userId) {
      dealId = slots.find((item) => item.dealId)?.dealId ?? null;
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
        author_id: string;
        author_handle: string;
        author_name: string;
        author_premium: boolean;
      }>`
        select c.id, c.body, c.created_at, c.author_id, a.handle as author_handle, a.display_name as author_name,
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
      note: b.note ?? "",
      sellerNote: b.seller_note ?? "",
      bidderId: b.bidder_id,
    }));
    const entry = userId
      ? await sql<{ removed_at: unknown }>`
          select removed_at from lottery_entries where listing_id = ${id} and user_id = ${userId}
        `
      : [];
    return {
      ...likedCards[0],
      blurb: row.blurb,
      winnerId: row.winner_id,
      antiSnipeMinutes: num(row.anti_snipe_minutes),
      createdAt: iso(row.created_at),
      engine: row.engine,
      buyNowCurrency: asPay(row.buy_now_currency ?? likedCards[0].currency),
      previews: previews.map((p) => ({
        id: p.id,
        src: p.view_b64 ? `data:image/jpeg;base64,${p.view_b64}` : p.card_b64 ? `data:image/jpeg;base64,${p.card_b64}` : null,
        card: p.card_b64 ? `data:image/jpeg;base64,${p.card_b64}` : null,
        cover: Boolean(p.is_cover),
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
          authorId: c.author_id,
          authorHandle: c.author_handle,
          authorName: c.author_name,
          authorPremium: Boolean(c.author_premium),
        }),
      ),
      currentBidderId: row.current_bidder_id,
      slots,
      rules: row.rules ?? "",
      requireFollow: Boolean(row.require_follow),
      requireLike: Boolean(row.require_like),
      requireComment: Boolean(row.require_comment),
      entered: Boolean(entry[0] && entry[0].removed_at == null),
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
  kind: "fixed" | "auction" | "lottery";
  price: number;
  buyNow: number | null;
  durationHours: number;
  antiSnipeMinutes: number;
  bidStep: number;
  currency: "rub" | "sw";
  tags: string[];
  items: { title: string; price: number }[];
  engine: string;
  buyNowCurrency: "rub" | "sw";
  endsAt: string | null;
  winnerCount: number | null;
  rules: string;
  requireFollow: boolean;
  requireLike: boolean;
  requireComment: boolean;
};

function parseSlots(value: unknown): { title: string; price: number }[] {
  if (!Array.isArray(value) || value.length < 1) fail("Добавьте хотя бы одну позицию");
  if (value.length > 10) fail("Не больше 10 позиций");
  const items: { title: string; price: number }[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") fail("Позиция указана неверно");
    const rec = raw as Record<string, unknown>;
    const title = cleanText(typeof rec.title === "string" ? rec.title : "", 80);
    const price = parsePrice(rec.price);
    if (title.length < 1) fail("У каждой позиции нужно название");
    if (price == null) fail("У каждой позиции нужна цена больше 0");
    items.push({ title, price });
  }
  return items;
}

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
  const kind = o.kind === "auction" ? "auction" : o.kind === "fixed" ? "fixed" : o.kind === "lottery" ? "lottery" : null;
  if (!kind) fail("Выберите аукцион, фикс или лотерею");
  const items = kind === "fixed" ? parseSlots(o.items) : [];
  const price = kind === "lottery" ? 0 : kind === "auction" ? parsePrice(o.price) : Math.min(...items.map((item) => item.price));
  if (price == null) fail("Цена — целое число от 1");
  const currency = kind === "lottery" ? "rub" : o.currency === "sw" ? "sw" : o.currency === "rub" ? "rub" : null;
  if (!currency) fail("Выберите денежную ставку или токены SW");
  const mixed = kind === "auction" && currency === "sw" && o.mixed === true;
  let buyNow: number | null = null;
  if (kind === "auction" && o.buyNow != null && o.buyNow !== "") {
    buyNow = parsePrice(o.buyNow);
    if (buyNow == null) fail("«Купить сейчас» — целое число больше 0");
    if (!mixed && buyNow <= price) fail("«Купить сейчас» должно быть выше стартовой цены");
  }
  const durationHours = Number(o.durationHours);
  if (kind === "auction" && ![12, 24, 48, 72].includes(durationHours)) {
    fail("Выберите длительность: 12 часов, 1 день, 2 дня или 3 дня");
  }
  const anti = Number(o.antiSnipeMinutes);
  if (kind === "auction" && !(SNIPE_OPTIONS as readonly number[]).includes(anti)) {
    fail("Выберите антиснайп");
  }
  let endsAt: string | null = null;
  let winnerCount: number | null = null;
  const rules = cleanText(typeof o.rules === "string" ? o.rules : "", 2000);
  const requireFollow = o.requireFollow === true;
  const requireLike = o.requireLike === true;
  const requireComment = o.requireComment === true;
  if (kind === "lottery") {
    const ends = new Date(typeof o.endsAt === "string" ? o.endsAt : "");
    if (!Number.isFinite(ends.getTime())) fail("Укажите дату и время окончания");
    if (ends.getTime() < Date.now() + 10 * 60 * 1000) fail("Окончание — хотя бы через 10 минут");
    if (ends.getTime() > Date.now() + 90 * 24 * 60 * 60 * 1000) fail("Лотерея не длиннее 90 дней");
    const count = Number(o.winnerCount);
    if (!Number.isInteger(count) || count < 1 || count > 20) fail("Победителей — от 1 до 20");
    endsAt = ends.toISOString();
    winnerCount = count;
  }
  const engine = asEngine(o.engine);
  if (!engine) fail("Выберите нейросеть");
  const bidStep = kind === "auction" ? parsePrice(o.bidStep) : 1;
  if (kind === "auction" && bidStep == null) fail("Шаг ставки — целое число больше 0");
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
    bidStep: bidStep ?? 1,
    currency,
    tags,
    items,
    engine,
    buyNowCurrency: mixed && buyNow != null ? "rub" : currency,
    endsAt,
    winnerCount,
    rules,
    requireFollow: kind === "lottery" && requireFollow,
    requireLike: kind === "lottery" && requireLike,
    requireComment: kind === "lottery" && requireComment,
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
        bid_step, currency, anti_snipe_minutes, ends_at, status,
        price2, price2_label, engine, buy_now_currency,
        winner_count, rules, require_follow, require_like, require_comment
      ) values (
        ${id},
        ${context.userId},
        ${data.title},
        ${data.blurb},
        ${data.privateDescription},
        ${data.kind},
        ${data.price},
        ${data.buyNow},
        ${data.bidStep},
        ${data.currency},
        ${data.antiSnipeMinutes},
        case
          when ${data.kind} = 'lottery' then ${data.endsAt}::timestamptz
          when ${data.kind} = 'auction' then now() + (${hours} * interval '1 hour')
          else null
        end,
        'draft',
        ${null},
        ${null},
        ${data.engine},
        ${data.buyNowCurrency},
        ${data.winnerCount},
        ${data.rules},
        ${data.requireFollow},
        ${data.requireLike},
        ${data.requireComment}
      )
    `;
    for (let i = 0; i < data.items.length; i += 1) {
      const item = data.items[i];
      await sql`
        insert into listing_items (id, listing_id, position, title, price, status)
        values (${crypto.randomUUID()}, ${id}, ${i + 1}, ${item.title}, ${item.price}, 'open')
      `;
    }
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
    const owned = await sql<{ status: string; bid_count: number; kind: string }>`
      select status, bid_count, kind from listings where id = ${id} and seller_id = ${context.userId}
    `;
    const row = owned[0];
    if (!row) fail("Лот не найден");
    const covers = await sql<{ n: number }>`
      select count(*)::int as n from media where listing_id = ${id} and kind = 'preview' and is_cover
    `;
    if (num(covers[0]?.n) < 1) {
      if (row.status === "draft" || (row.status === "active" && num(row.bid_count) === 0)) {
        await sql`delete from listings where id = ${id} and seller_id = ${context.userId} and bid_count = 0`;
      }
      fail("Нужна обложка");
    }
    if (row.status === "draft") {
      const auction = row.kind === "auction";
      const lottery = row.kind === "lottery";
      const limit = profile.premium
        ? auction
          ? PREMIUM_AUCTION_LIMIT
          : PREMIUM_FIXED_LIMIT
        : auction
          ? ACTIVE_AUCTION_LIMIT
          : ACTIVE_FIXED_LIMIT;
      const premiumLimit = auction ? PREMIUM_AUCTION_LIMIT : PREMIUM_FIXED_LIMIT;
      const label = lottery ? "лотерей" : auction ? "аукционов" : "фиксов";
      const active = await sql<{ n: number }>`
        select count(*)::int as n from listings
        where seller_id = ${context.userId} and status = 'active' and kind = ${row.kind}
      `;
      if (num(active[0]?.n) >= limit) {
        fail(
          profile.premium
            ? `Уже ${limit} активных ${label}`
            : `Одновременно можно ${limit} активных ${label}. С Premium — ${premiumLimit}.`,
        );
      }
      await sql`
        update listings set status = 'active', updated_at = now()
        where id = ${id} and seller_id = ${context.userId} and status = 'draft'
      `;
    }
    await mentionPeople(
      sql,
      context.userId,
      profile.handle,
      `lot:${id}`,
      `/lot/${id}`,
      await listingMentionText(sql, id),
    );
    return { ok: true };
  });

type UploadBody = {
  listingId: string;
  kind: "preview" | "file";
  filename: string;
  b64: string;
  cardB64: string | null;
  cover: boolean;
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
    cover: o.cover === true,
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
      if (card.length > 32 && card.length <= 400 * 1024 && card[0] === 0xff && card[1] === 0xd8) {
        cardB64 = card.toString("base64");
      }
    }
    let viewB64: string | null = null;
    let outBuf = buf;
    let outMime = magic;
    let outW = width;
    let outH = height;
    let outName = filename;
    const coverLong = Math.max(width ?? 0, height ?? 0);
    const coverReady =
      data.cover && magic === "image/jpeg" && coverLong > 0 && coverLong <= 1200 && buf.length <= 400 * 1024;
    if (coverReady) {
      viewB64 = buf.toString("base64");
    } else if (data.cover && isRaster(magic)) {
      try {
        const { compressCoverImage } = await import("@/lib/preview-thumb.server");
        const made = compressCoverImage(buf, magic);
        if (made) {
          outBuf = Buffer.from(made.jpeg);
          outMime = "image/jpeg";
          outW = made.width;
          outH = made.height;
          outName = filename.replace(/\.[^.]+$/, "") + ".jpg";
          viewB64 = made.jpeg.toString("base64");
        }
      } catch (err) {
        console.error("[upload] cover", err instanceof Error ? err.message : err);
      }
    }
    if (viewB64 && data.cover) {
      cardB64 = null;
      try {
        const { jpegThumb } = await import("@/lib/preview-thumb.server");
        const small = jpegThumb(outBuf, "image/jpeg", 640);
        if (small) cardB64 = small.toString("base64");
      } catch (err) {
        console.error("[upload] cover card", err instanceof Error ? err.message : err);
      }
    }
    if (data.kind === "preview" && !viewB64) {
      try {
        const { thumbsFromOriginal } = await import("@/lib/market/preview-store");
        const made = thumbsFromOriginal(outBuf, outMime);
        cardB64 = cardB64 ?? made.card;
        viewB64 = made.view;
      } catch (err) {
        console.error("[upload] thumb", err instanceof Error ? err.message : err);
      }
    }
    if (data.cover) {
      await sql`
        update media set is_cover = false
        where listing_id = ${data.listingId} and kind = 'preview' and is_cover
      `;
    }
    await sql`
      insert into media (id, listing_id, kind, filename, mime, data_b64, card_b64, view_b64, width, height, size_bytes, is_cover)
      values (
        ${id},
        ${data.listingId},
        ${data.kind},
        ${outName},
        ${outMime},
        ${outBuf.toString("base64")},
        ${cardB64},
        ${viewB64},
        ${outW},
        ${outH},
        ${outBuf.length},
        ${data.cover}
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
    await mentionPeople(
      sql,
      context.userId,
      profile.handle,
      `lot:${data.id}`,
      `/lot/${data.id}`,
      await listingMentionText(sql, data.id),
    );
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

/** Erase the lot and its pictures. A deal chat stays, with the listing link cleared. */
async function purgeListing(sql: Sql, id: string) {
  await sql`
    update deals
    set listing_title = coalesce(nullif(listing_title, ''), (select title from listings where id = ${id}))
    where listing_id = ${id}
  `;
  await sql`delete from reports where listing_id = ${id}`;
  await sql`delete from notifications where href = ${`/lot/${id}`}`;
  await sql`delete from listings where id = ${id}`;
}

/** Owner can erase any of their lots. The deal chat is kept. */
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

type BidBody = { listingId: string; amount: number; note: string };

export const placeBid = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown): BidBody => {
    if (!input || typeof input !== "object") fail("Пустая ставка");
    const o = input as Record<string, unknown>;
    if (typeof o.listingId !== "string" || !UUID_RE.test(o.listingId)) fail("Некорректный лот");
    const amount = parsePrice(o.amount);
    if (amount == null) fail("Ставка — целое число");
    const note = cleanText(typeof o.note === "string" ? o.note : "", 200);
    return { listingId: o.listingId, amount, note };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    await settle(sql);
    const profile = await ensureProfile(sql, context.userId);
    assertLive(profile);
    const before = await sql<{
      ends_at: unknown;
      current_bidder_id: string | null;
      current_bid: number | null;
      price: number;
      bid_step: number;
      currency: string;
      seller_id: string;
      title: string;
      buy_now: number | null;
      buy_now_currency: string | null;
      status: string;
      kind: string;
    }>`
      select ends_at, current_bidder_id, current_bid, price, bid_step, currency, seller_id, title, buy_now, buy_now_currency, status, kind
      from listings where id = ${data.listingId}
    `;
    const lot = before[0];
    if (!lot || lot.kind !== "auction" || lot.status !== "active") fail("Аукцион уже закрыт");
    const currency = asPay(lot.currency);
    const step = Math.max(1, num(lot.bid_step));
    const standing = lot.current_bid == null ? null : num(lot.current_bid);
    const floor = standing == null ? num(lot.price) : standing + step;
    if (data.amount < floor) fail(`Минимальная ставка ${formatPrice(floor, currency)}`);
    const sameBuy = lot.buy_now != null && asPay(lot.buy_now_currency ?? lot.currency) === currency;
    if (sameBuy && data.amount >= num(lot.buy_now)) {
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
        and ${data.amount} >= case when current_bid is null then price else current_bid + bid_step end
        and (
          buy_now is null
          or coalesce(buy_now_currency, currency) <> currency
          or ${data.amount} < buy_now
        )
      returning ends_at, current_bid, bid_count
    `;
    if (!updated[0]) fail("Ставка не принята — кто-то успел раньше или сумма слишком мала");
    const bidId = crypto.randomUUID();
    await sql`
      insert into bids (id, listing_id, bidder_id, amount, note)
      values (${bidId}, ${data.listingId}, ${context.userId}, ${data.amount}, ${data.note})
    `;
    await mentionPeople(sql, context.userId, profile.handle, `bid:${bidId}`, `/lot/${data.listingId}`, [data.note]);
    const endsAt = iso(updated[0].ends_at);
    const extended = prevEnd != null && new Date(endsAt).getTime() - new Date(prevEnd).getTime() > 1000;
    const note = extended ? " Аукцион продлён." : "";
    if (lot.seller_id !== context.userId) {
      await notify(
        sql,
        lot.seller_id,
        "bid",
        "Новая ставка",
        `${profile.handle} · ${formatPrice(data.amount, currency)} · «${lot.title}».${note}`,
        `/lot/${data.listingId}`,
      );
    }
    if (prevBidder && prevBidder !== context.userId) {
      await notify(
        sql,
        prevBidder,
        "outbid",
        "Вашу ставку перебили",
        `«${lot.title}» теперь ${formatPrice(data.amount, currency)}.${note}`,
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

export const setBidNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустой комментарий");
    const o = input as Record<string, unknown>;
    if (typeof o.bidId !== "string" || !UUID_RE.test(o.bidId)) fail("Некорректная ставка");
    const note = cleanText(typeof o.note === "string" ? o.note : "", 200);
    if (!note) fail("Напишите комментарий");
    return { bidId: o.bidId, note };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const rows = await sql<{ bidder_id: string; seller_id: string; listing_id: string }>`
      select b.bidder_id, l.seller_id, b.listing_id
      from bids b
      join listings l on l.id = b.listing_id
      where b.id = ${data.bidId}
    `;
    const row = rows[0];
    if (!row) fail("Ставка не найдена");
    const ownBid = row.bidder_id === context.userId;
    const seller = row.seller_id === context.userId;
    if (!ownBid && !seller) fail("Комментарий может оставить участник ставки или автор лота");
    const me = await ensureProfile(sql, context.userId);
    if (ownBid) {
      await sql`update bids set note = ${data.note} where id = ${data.bidId}`;
    } else {
      await sql`update bids set seller_note = ${data.note} where id = ${data.bidId}`;
    }
    await mentionPeople(
      sql,
      context.userId,
      me.handle,
      ownBid ? `bid:${data.bidId}` : `bid-seller:${data.bidId}`,
      `/lot/${row.listing_id}`,
      [data.note],
    );
    return { ok: true };
  });

export const cancelBid = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректная ставка");
    return id;
  })
  .handler(async ({ data: bidId, context }) => {
    const sql = await getSql();
    const rows = await sql<{ listing_id: string; seller_id: string; status: string }>`
      select b.listing_id, l.seller_id, l.status
      from bids b
      join listings l on l.id = b.listing_id
      where b.id = ${bidId}
    `;
    const row = rows[0];
    if (!row) fail("Ставка не найдена");
    if (row.seller_id !== context.userId) fail("Отменять ставки может только автор лота");
    if (row.status !== "active") fail("Лот уже закрыт");
    await sql`delete from bids where id = ${bidId}`;
    const left = await sql<{ n: number }>`
      select count(*)::int as n from bids where listing_id = ${row.listing_id}
    `;
    const top = await sql<{ amount: number; bidder_id: string }>`
      select amount, bidder_id from bids
      where listing_id = ${row.listing_id}
      order by amount desc, created_at desc
      limit 1
    `;
    const count = num(left[0]?.n);
    if (top[0]) {
      await sql`
        update listings
        set current_bid = ${num(top[0].amount)},
            current_bidder_id = ${top[0].bidder_id},
            bid_count = ${count},
            updated_at = now()
        where id = ${row.listing_id}
      `;
    } else {
      await sql`
        update listings
        set current_bid = null, current_bidder_id = null, bid_count = 0, updated_at = now()
        where id = ${row.listing_id}
      `;
    }
    return { ok: true };
  });

async function openItemDeal(
  sql: Sql,
  row: {
    listingId: string;
    itemId: string;
    lotTitle: string;
    itemTitle: string;
    sellerId: string;
    buyerId: string;
    amount: number;
    currency: "rub" | "sw";
  },
): Promise<string | null> {
  if (row.buyerId === row.sellerId) return null;
  const id = crypto.randomUUID();
  const title = `${row.lotTitle} — ${row.itemTitle}`.slice(0, 180);
  const inserted = await sql<{ id: string; public_no: number }>`
    insert into deals (id, listing_id, item_id, seller_id, buyer_id, amount, currency, status, listing_title)
    values (
      ${id}, ${row.listingId}, ${row.itemId}, ${row.sellerId}, ${row.buyerId},
      ${row.amount}, ${row.currency}, 'awaiting_payment', ${title}
    )
    on conflict (item_id) where item_id is not null do nothing
    returning id, public_no
  `;
  const dealId =
    inserted[0]?.id ??
    (await sql<{ id: string }>`select id from deals where item_id = ${row.itemId}`)[0]?.id;
  if (!dealId || !inserted[0]) return dealId ?? null;
  const href = `/deals/${dealId}`;
  const body = `«${title}» · #${num(inserted[0].public_no)} · ${formatPrice(row.amount, row.currency)}`;
  await notify(sql, row.sellerId, "deal", "Новая сделка", body, href);
  await notify(sql, row.buyerId, "deal", "Позиция ваша", body, href);
  return dealId;
}

async function takeListing(
  sql: Sql,
  userId: string,
  listingId: string,
  mode: "fixed" | "buy-now",
  itemId: string | null,
): Promise<{ dealId: string | null }> {
  await settle(sql);
  const profile = await ensureProfile(sql, userId);
  assertLive(profile);
  if (mode === "buy-now") {
    const updated = await sql<CloseRow>`
      update listings
      set status = 'sold',
          winner_id = ${userId},
          current_bid = case when coalesce(buy_now_currency, currency) = currency then buy_now else current_bid end,
          current_bidder_id = ${userId},
          bid_count = bid_count + 1,
          updated_at = now()
      where id = ${listingId}
        and status = 'active'
        and kind = 'auction'
        and buy_now is not null
        and ends_at > now()
      returning id, title, seller_id, winner_id, buy_now as amount, coalesce(buy_now_currency, currency) as currency
    `;
    if (!updated[0]) fail("Лот уже забрали или он закрыт");
    await sql`
      insert into bids (id, listing_id, bidder_id, amount)
      select ${crypto.randomUUID()}, id, ${userId}, current_bid
      from listings
      where id = ${listingId}
        and current_bid is not null
        and coalesce(buy_now_currency, currency) = currency
    `;
    const dealId = await openDeal(sql, updated[0]);
    if (!dealId && updated[0].winner_id !== updated[0].seller_id) fail("Не удалось открыть сделку");
    return { dealId };
  }

  const lot = await sql<{ id: string; title: string; seller_id: string; status: string; kind: string; currency: string }>`
    select id, title, seller_id, status, kind, currency from listings where id = ${listingId}
  `;
  const listing = lot[0];
  if (!listing || listing.kind !== "fixed" || listing.status !== "active") fail("Лот уже забрали или он закрыт");
  const own = listing.seller_id === userId;
  const currency = asPay(listing.currency);
  const items = await sql<{ id: string; title: string; price: number; status: string }>`
    select id, title, price, status from listing_items where listing_id = ${listingId} order by position asc
  `;
  if (items.length === 0) {
    const updated = await sql<CloseRow>`
      update listings
      set status = 'sold', winner_id = ${userId}, updated_at = now()
      where id = ${listingId} and status = 'active' and kind = 'fixed'
      returning id, title, seller_id, winner_id, price as amount, currency
    `;
    if (!updated[0]) fail("Лот уже забрали или он закрыт");
    const dealId = own ? null : await openDeal(sql, updated[0]);
    if (!own && !dealId) fail("Не удалось открыть сделку");
    return { dealId };
  }
  const target = itemId ? items.find((item) => item.id === itemId) : items.find((item) => item.status === "open");
  if (!target || target.status !== "open") fail("Эта позиция уже продана");
  const taken = await sql<{ id: string; title: string; price: number }>`
    update listing_items
    set status = 'sold', buyer_id = ${userId}
    where id = ${target.id} and listing_id = ${listingId} and status = 'open'
    returning id, title, price
  `;
  if (!taken[0]) fail("Эту позицию уже забрали");
  const dealId = await openItemDeal(sql, {
    listingId,
    itemId: taken[0].id,
    lotTitle: listing.title,
    itemTitle: taken[0].title,
    sellerId: listing.seller_id,
    buyerId: userId,
    amount: num(taken[0].price),
    currency,
  });
  if (!dealId && !own) fail("Не удалось открыть сделку");
  const left = await sql<{ n: number }>`
    select count(*)::int as n from listing_items where listing_id = ${listingId} and status = 'open'
  `;
  if (num(left[0]?.n) === 0) {
    await sql`
      update listings
      set status = 'sold', winner_id = ${userId}, updated_at = now()
      where id = ${listingId} and status = 'active'
    `;
  }
  return { dealId };
}

export const buyFixed = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (typeof input === "string" && UUID_RE.test(input)) return { id: input, itemId: null as string | null };
    if (!input || typeof input !== "object") fail("Некорректный лот");
    const o = input as Record<string, unknown>;
    if (typeof o.id !== "string" || !UUID_RE.test(o.id)) fail("Некорректный лот");
    const itemId = typeof o.itemId === "string" && UUID_RE.test(o.itemId) ? o.itemId : null;
    return { id: o.id, itemId };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    return takeListing(sql, context.userId, data.id, "fixed", data.itemId);
  });

export const buyNow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
    return id;
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    return takeListing(sql, context.userId, data, "buy-now", null);
  });

export const closeAuctionEarly = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
    return id;
  })
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertLive(profile);
    const updated = await sql<CloseRow>`
      update listings
      set status = case when current_bidder_id is null then 'ended' else 'sold' end,
          winner_id = current_bidder_id,
          ends_at = now(),
          updated_at = now()
      where id = ${id}
        and seller_id = ${context.userId}
        and status = 'active'
        and kind = 'auction'
      returning id, title, seller_id, winner_id, coalesce(current_bid, price) as amount, currency
    `;
    const row = updated[0];
    if (!row) fail("Аукцион уже закрыт");
    if (!row.winner_id) {
      await notify(sql, row.seller_id, "auction_end", "Аукцион закрыт", `«${row.title}» закрыт досрочно без ставок`, `/lot/${row.id}`);
      return { dealId: null as string | null };
    }
    const dealId = await openDeal(sql, row);
    return { dealId };
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
    const images = await sql<{ kind: string; rev: number }>`
      select kind, floor(extract(epoch from updated_at))::int as rev
      from profile_images where user_id = ${context.userId}
    `;
    const kinds = new Set(images.map((r) => r.kind));
    const imageRev: Partial<Record<ProfileImageKind, number>> = {};
    for (const row of images) {
      if (
        row.kind === "avatar" ||
        row.kind === "banner" ||
        row.kind === "background" ||
        row.kind === "side_left" ||
        row.kind === "side_right" ||
        row.kind === "middle"
      ) {
        imageRev[row.kind] = num(row.rev);
      }
    }
    return {
      ...profile,
      unread: num(unread[0]?.n),
      hasAvatar: kinds.has("avatar"),
      hasBanner: kinds.has("banner"),
      hasBackground: kinds.has("background"),
      hasSideLeft: kinds.has("side_left"),
      hasSideRight: kinds.has("side_right"),
      hasMiddle: kinds.has("middle"),
      imageRev,
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
    const showcase = asShowcase(o.showcase);
    return { handle, displayName, bio, status, links: parseLinksInput(o.links), showcase };
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
            showcase = ${data.showcase},
            links = ${JSON.stringify(data.links)}::jsonb
        where user_id = ${context.userId}
      `;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/duplicate|unique/i.test(msg)) fail("Этот ник уже занят");
      throw e;
    }
    await mentionPeople(sql, context.userId, data.handle, `bio:${context.userId}`, `/u/${data.handle}`, [data.bio]);
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
      side_left_shape: string;
      side_right_shape: string;
      side_left_framed: boolean;
      side_right_framed: boolean;
      showcase: string;
    }>`
      select user_id, display_name, bio, role, status, links, badges, created_at,
        premium_forever, premium_until, theme, accent, avatar_frame, banner_overlay,
        side_left_shape, side_right_shape, side_left_framed, side_right_framed, showcase
      from profiles where handle = ${data.handle}
    `;
    if (!rows[0]) return null;
    const userId = rows[0].user_id;
    const showcase = asShowcase(rows[0].showcase);
    const shelf = showcase === "lotteries" ? "lotteries" : "lots";
    const offset = (data.page - 1) * PROFILE_LOT_PAGE;
    const [items, pins, totalRow, images, posts, followRow, followCount] = await Promise.all([
      sql.query<CardRow>(
        `select ${CARD_SQL}
         from listings l
         left join profiles p on p.user_id = l.seller_id
         where l.seller_id = $1 and l.status = 'active'
           and (($4::text = 'lotteries' and l.kind = 'lottery') or ($4::text = 'lots' and l.kind <> 'lottery'))
         order by l.pinned desc, l.created_at desc
         limit $2 offset $3`,
        [userId, PROFILE_LOT_PAGE, offset, shelf],
      ),
      sql.query<CardRow>(
        `select ${CARD_SQL}
         from listings l
         left join profiles p on p.user_id = l.seller_id
         where l.seller_id = $1 and l.status = 'active' and l.pinned
         order by l.created_at desc
         limit 6`,
        [userId],
      ),
      sql<{ n: number }>`
        select count(*)::int as n from listings
        where seller_id = ${userId} and status = 'active'
          and ((${shelf} = 'lotteries' and kind = 'lottery') or (${shelf} = 'lots' and kind <> 'lottery'))
      `,
      sql<{ kind: string; rev: number }>`
        select kind, floor(extract(epoch from updated_at))::int as rev
        from profile_images where user_id = ${userId}
      `,
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
    const imageRev: Partial<Record<ProfileImageKind, number>> = {};
    for (const row of images) {
      if (
        row.kind === "avatar" ||
        row.kind === "banner" ||
        row.kind === "background" ||
        row.kind === "side_left" ||
        row.kind === "side_right" ||
        row.kind === "middle"
      ) {
        imageRev[row.kind] = num(row.rev);
      }
    }
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
      hasSideLeft: kinds.has("side_left"),
      hasSideRight: kinds.has("side_right"),
      hasMiddle: kinds.has("middle"),
      imageRev,
      premium,
      theme: premium ? asTheme(rows[0].theme) : "classic",
      accent: premium ? asAccent(rows[0].accent) : "wine",
      avatarFrame: premium ? asFrame(rows[0].avatar_frame) : "thin",
      bannerOverlay: premium ? asOverlay(rows[0].banner_overlay) : "gradient",
      sideLeftShape: premium ? asSideShape(rows[0].side_left_shape) : "rect",
      sideRightShape: premium ? asSideShape(rows[0].side_right_shape) : "rect",
      sideLeftFramed: premium ? rows[0].side_left_framed !== false : true,
      sideRightFramed: premium ? rows[0].side_right_framed !== false : true,
      lots: items.map(mapCard),
      pins: pins.map(mapCard),
      lotTotal: num(totalRow[0]?.n),
      posts,
      followers: num(followCount[0]?.n),
      showcase,
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
      listing_id: string | null;
      title: string;
      preview_id: string | null;
      amount: number;
      currency: string;
      status: DealStatus;
      seller_id: string;
      seller_handle: string;
      buyer_handle: string;
      seller_premium: boolean;
      buyer_premium: boolean;
      created_at: unknown;
    }>`
      select d.id, d.public_no, d.listing_id,
             coalesce(l.title, d.listing_title, 'Лот удалён') as title,
             d.amount, coalesce(l.currency, d.currency, 'rub') as currency, d.status, d.seller_id,
             d.created_at, sp.handle as seller_handle, bp.handle as buyer_handle,
             (coalesce(sp.premium_forever, false) or (sp.premium_until is not null and sp.premium_until > now())) as seller_premium,
             (coalesce(bp.premium_forever, false) or (bp.premium_until is not null and bp.premium_until > now())) as buyer_premium,
             (
               select m.id from media m
               where m.listing_id = l.id and m.kind = 'preview'
               order by m.is_cover desc, m.created_at asc limit 1
             ) as preview_id
      from deals d
      left join listings l on l.id = d.listing_id
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
      currency: asPay(r.currency),
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
    listing_id: string | null;
    title: string;
    amount: number;
    currency: string;
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
    select d.id, d.public_no, d.listing_id,
           coalesce(l.title, d.listing_title, 'Лот удалён') as title,
           d.amount, coalesce(l.currency, d.currency, 'rub') as currency, d.status,
           d.seller_id, d.buyer_id,
           sp.handle as seller_handle, sp.display_name as seller_name,
           bp.handle as buyer_handle, bp.display_name as buyer_name,
           (coalesce(sp.premium_forever, false) or (sp.premium_until is not null and sp.premium_until > now())) as seller_premium,
           (coalesce(bp.premium_forever, false) or (bp.premium_until is not null and bp.premium_until > now())) as buyer_premium,
           d.seller_confirmed_at, d.buyer_confirmed_at, l.private_description,
           (
             select m.id from media m
             where m.listing_id = l.id and m.kind = 'preview'
             order by m.is_cover desc, m.created_at asc limit 1
           ) as preview_id
    from deals d
    left join listings l on l.id = d.listing_id
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
    listingGone: d.listing_id == null,
    title: d.title,
    previewId: d.preview_id,
    amount: num(d.amount),
    currency: asPay(d.currency),
    status: d.status,
    youAre: side,
    seller: { id: d.seller_id, handle: d.seller_handle, name: d.seller_name, premium: Boolean(d.seller_premium) },
    buyer: { id: d.buyer_id, handle: d.buyer_handle, name: d.buyer_name, premium: Boolean(d.buyer_premium) },
    sellerConfirmed: d.seller_confirmed_at != null,
    buyerConfirmed: d.buyer_confirmed_at != null,
    privateDescription: showSecret ? d.private_description : null,
    files: showSecret && d.listing_id ? await loadFiles(sql, d.listing_id) : null,
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
    await retainChats(sql);
    const rows = await sql<{
      id: string;
      public_no: number;
      title: string;
      listing_id: string | null;
      amount: number;
      currency: string;
      status: DealStatus;
      seller_handle: string;
      seller_name: string;
      buyer_handle: string;
      buyer_name: string;
      seller_premium: boolean;
      buyer_premium: boolean;
    }>`
      select d.id, d.public_no, d.listing_id,
             coalesce(l.title, d.listing_title, 'Лот удалён') as title,
             d.amount, coalesce(l.currency, d.currency, 'rub') as currency, d.status,
             sp.handle as seller_handle, sp.display_name as seller_name,
             bp.handle as buyer_handle, bp.display_name as buyer_name,
             (coalesce(sp.premium_forever, false) or (sp.premium_until is not null and sp.premium_until > now())) as seller_premium,
             (coalesce(bp.premium_forever, false) or (bp.premium_until is not null and bp.premium_until > now())) as buyer_premium
      from deals d
      left join listings l on l.id = d.listing_id
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
      listingGone: d.listing_id == null,
      amount: num(d.amount),
      currency: asPay(d.currency),
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
      select d.seller_id, d.buyer_id, coalesce(l.title, d.listing_title, 'Лот') as title
      from deals d
      left join listings l on l.id = d.listing_id
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
    await mentionPeople(sql, context.userId, profile.handle, `deal-msg:${id}`, `/deals/${data.dealId}`, [data.body], [
      d.seller_id,
      d.buyer_id,
    ]);
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
      select d.seller_id, d.buyer_id, d.status, d.seller_confirmed_at, d.buyer_confirmed_at,
             coalesce(l.title, d.listing_title, 'Лот') as title
      from deals d
      left join listings l on l.id = d.listing_id
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
    const commentId = crypto.randomUUID();
    await sql`
      insert into profile_comments (id, profile_id, author_id, body)
      values (${commentId}, ${target[0].user_id}, ${context.userId}, ${data.body})
    `;
    await notify(
      sql,
      target[0].user_id,
      "comment",
      "Новый комментарий",
      `@${me.handle}: ${data.body.slice(0, 140)}`,
      `/u/${target[0].handle}`,
    );
    await mentionPeople(sql, context.userId, me.handle, `profile-comment:${commentId}`, `/u/${target[0].handle}`, [data.body]);
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
      select d.id, d.public_no, coalesce(l.title, d.listing_title, 'Лот удалён') as title, d.status,
             sp.handle as seller_handle, bp.handle as buyer_handle
      from deals d
      left join listings l on l.id = d.listing_id
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
     where l.status = 'active'
       and (
         (
           l.kind in ('auction', 'lottery')
           and (
             l.created_at > now() - interval '48 hours'
             or (
               l.ends_at is not null
               and l.ends_at > now()
               and l.ends_at < now() + interval '24 hours'
             )
           )
         )
         or (l.kind = 'fixed' and l.created_at > now() - interval '48 hours')
       )
     order by (l.kind in ('auction', 'lottery')) desc,
       (select count(*)::int from listing_likes lk where lk.listing_id = l.id) desc,
       (l.boosted_until is not null and l.boosted_until > now()) desc,
       l.created_at desc
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
      accent: asAccent(o.accent),
      avatarFrame: asFrame(o.avatarFrame),
      bannerOverlay: asOverlay(o.bannerOverlay),
      sideLeftShape: asSideShape(o.sideLeftShape),
      sideRightShape: asSideShape(o.sideRightShape),
      sideLeftFramed: o.sideLeftFramed !== false,
      sideRightFramed: o.sideRightFramed !== false,
    };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    if (!profile.premium) fail("Оформление профиля доступно с Premium");
    await sql`
      update profiles
      set accent = ${data.accent},
          avatar_frame = ${data.avatarFrame},
          banner_overlay = ${data.bannerOverlay},
          side_left_shape = ${data.sideLeftShape},
          side_right_shape = ${data.sideRightShape},
          side_left_framed = ${data.sideLeftFramed},
          side_right_framed = ${data.sideRightFramed}
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
      await reviewLotteryEntries(sql, context.userId, { listingId });
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

export const joinLottery = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
    return id;
  })
  .handler(async ({ data: listingId, context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertLive(profile);
    const rows = await sql<{
      id: string;
      seller_id: string;
      winner_count: number;
      currency: string;
      require_follow: boolean;
      require_like: boolean;
      require_comment: boolean;
      open: boolean;
    }>`
      select id, seller_id, coalesce(winner_count, 1) as winner_count, currency,
        require_follow, require_like, require_comment,
        (kind = 'lottery' and status = 'active' and ends_at is not null and ends_at > now() and drawn_at is null) as open
      from listings
      where id = ${listingId}
    `;
    const row = rows[0];
    if (!row || row.open !== true) fail("Лотерея не идёт");
    if (row.seller_id === context.userId) fail("В своей лотерее участвовать нельзя");
    const missing: string[] = [];
    if (row.require_follow) {
      const follow = await sql`
        select 1 as ok from follows where follower_id = ${context.userId} and following_id = ${row.seller_id}
      `;
      if (!follow[0]) missing.push("подписка на автора");
    }
    if (row.require_like) {
      const like = await sql`
        select 1 as ok from listing_likes where listing_id = ${listingId} and user_id = ${context.userId}
      `;
      if (!like[0]) missing.push("лайк этой записи");
    }
    if (row.require_comment) {
      const comment = await sql`
        select 1 as ok from listing_comments where listing_id = ${listingId} and author_id = ${context.userId}
      `;
      if (!comment[0]) missing.push("комментарий под записью");
    }
    if (missing.length > 0) fail(`Сначала выполните условия: ${missing.join(", ")}`);
    const existing = await sql<{ won: boolean }>`
      select won from lottery_entries where listing_id = ${listingId} and user_id = ${context.userId}
    `;
    if (existing[0]?.won === true) return { ok: true };
    await sql`
      insert into lottery_entries (listing_id, user_id, joined_at, removed_at, won)
      values (${listingId}, ${context.userId}, now(), null, false)
      on conflict (listing_id, user_id) do update
        set removed_at = null, joined_at = now()
        where lottery_entries.won = false
    `;
    return { ok: true };
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
    const commentId = crypto.randomUUID();
    await sql`
      insert into listing_comments (id, listing_id, author_id, body)
      values (${commentId}, ${data.listingId}, ${context.userId}, ${data.body})
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
    await mentionPeople(sql, context.userId, profile.handle, `lot-comment:${commentId}`, `/lot/${data.listingId}`, [data.body]);
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
    const row = await sql<{ author_id: string; listing_id: string }>`
      select author_id, listing_id from listing_comments where id = ${id}
    `;
    if (!row[0]) fail("Комментарий уже удалён");
    if (row[0].author_id !== context.userId && !isStaff(me.role)) fail("Нельзя удалить этот комментарий");
    await sql`delete from listing_comments where id = ${id}`;
    await reviewLotteryEntries(sql, row[0].author_id, { listingId: row[0].listing_id });
    return { ok: true };
  });

const IMAGE_MAX: Record<"banner", number> = {
  banner: 1_200_000,
};

const DECOR_KINDS = new Set<ProfileImageKind>(["background", "side_left", "side_right", "middle"]);
const PREMIUM_DECOR = new Set<ProfileImageKind>(["side_left", "side_right", "middle"]);

function isProfileKind(value: unknown): value is ProfileImageKind {
  return (
    value === "avatar" ||
    value === "banner" ||
    value === "background" ||
    value === "side_left" ||
    value === "side_right" ||
    value === "middle"
  );
}

export const uploadProfileImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустой файл");
    const o = input as Record<string, unknown>;
    if (!isProfileKind(o.kind)) fail("Неизвестный кадр");
    if (typeof o.b64 !== "string") fail("Файл не прочитан");
    const b64 = o.b64.replace(/^data:[^,]*,/, "").replace(/\s/g, "");
    const kind: ProfileImageKind = o.kind;
    if (kind === "avatar") {
      const approx = Math.floor((b64.length * 3) / 4);
      if (approx > 6_000_000) fail("Аватар не подошёл: вес больше 2 МБ");
    } else if (DECOR_KINDS.has(kind)) {
      const approx = Math.floor((b64.length * 3) / 4);
      if (approx > 6_000_000) fail("Картинка больше 3 МБ");
    } else if (b64.length > 4_500_000) {
      fail("Файл больше лимита");
    }
    return { kind, b64 };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const buf = Buffer.from(data.b64, "base64");
    const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const magic = sniffMagic(bytes);
    if (!magic || !isRaster(magic)) fail("Нужны PNG, JPG, WEBP или GIF");
    if (PREMIUM_DECOR.has(data.kind) && !profile.premium) fail("Боковые фоны и фон середины доступны с Premium");
    if (magic === "image/gif" && !profile.premium && data.kind !== "background") {
      fail("GIF в аватарке и шапке доступен с Premium");
    }
    const size = decodedImageSize(bytes);
    if (data.kind === "avatar") {
      const problems: string[] = [];
      if (buf.length > AVATAR_MAX) {
        problems.push(`вес ${(buf.length / (1024 * 1024)).toFixed(1)} МБ, максимум 2 МБ`);
      }
      if (!size) fail(problems.length ? `Аватар не подошёл: ${problems.join(". ")}` : "Не удалось прочитать изображение");
      if (size.width > AVATAR_DIM || size.height > AVATAR_DIM) {
        problems.push(`размер ${size.width}×${size.height} px, максимум ${AVATAR_DIM}×${AVATAR_DIM}`);
      }
      if (problems.length) fail(`Аватар не подошёл: ${problems.join(". ")}`);
    } else if (DECOR_KINDS.has(data.kind)) {
      const problems: string[] = [];
      if (buf.length > PROFILE_DECOR_MAX) problems.push(`вес ${(buf.length / (1024 * 1024)).toFixed(1)} МБ, максимум 3 МБ`);
      if (!size) fail(problems.length ? `Картинка не подошла: ${problems.join(". ")}` : "Не удалось прочитать изображение");
      if (size.width > PROFILE_DECOR_DIM || size.height > PROFILE_DECOR_DIM) {
        problems.push(`размер ${size.width}×${size.height} px, максимум ${PROFILE_DECOR_DIM}×${PROFILE_DECOR_DIM}`);
      }
      if (problems.length) fail(`Картинка не подошла: ${problems.join(". ")}`);
    } else {
      if (!size) fail("Не удалось прочитать изображение");
      if (buf.length > (profile.premium ? 3_000_000 : IMAGE_MAX.banner)) {
        fail(profile.premium ? "Картинка больше лимита Premium" : "Картинка больше 1.2 МБ");
      }
      if (size.width > MAX_DIM || size.height > MAX_DIM) fail(`Слишком большой кадр, максимум ${MAX_DIM}px`);
    }
    await sql`
      insert into profile_images (user_id, kind, mime, data_b64, updated_at)
      values (${context.userId}, ${data.kind}, ${magic}, ${buf.toString("base64")}, now())
      on conflict (user_id, kind) do update
        set mime = excluded.mime, data_b64 = excluded.data_b64, updated_at = now()
    `;
    return { ok: true };
  });

export const clearProfileImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((kind: unknown) => {
    if (!isProfileKind(kind)) fail("Неизвестный кадр");
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
    await retainChats(sql);
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
  const ids = messages.map((m) => m.id);
  const pics = ids.length
    ? await sql<{ id: string; message_id: string; filename: string; mime: string; size_bytes: number; width: number | null; height: number | null }>`
        select id, message_id, filename, mime, size_bytes, width, height
        from dm_message_images
        where message_id = any(${ids}::text[])
        order by sort asc
      `
    : [];
  const byMessage = new Map<string, ChatImage[]>();
  for (const pic of pics) {
    const list = byMessage.get(pic.message_id) ?? [];
    list.push({
      id: pic.id,
      filename: pic.filename,
      mime: pic.mime,
      sizeBytes: num(pic.size_bytes),
      width: pic.width,
      height: pic.height,
    });
    byMessage.set(pic.message_id, list);
  }
  return {
    id: thread.id,
    otherHandle: thread.other_handle,
    otherName: thread.other_name,
    otherPremium: Boolean(thread.other_premium),
    lastBody: last?.body ? last.body : last ? "картинка" : null,
    updatedAt: last ? iso(last.created_at) : new Date().toISOString(),
    messages: messages.map((m) => ({
      id: m.id,
      handle: m.handle,
      body: m.body,
      createdAt: iso(m.created_at),
      mine: m.sender_id === userId,
      premium: Boolean(m.premium),
      images: byMessage.get(m.id) ?? [],
    })),
  };
}

/** Same ordering as dm_threads_order_chk (low_id < high_id), not JavaScript string compare. */
async function orderedDmIds(sql: Sql, a: string, b: string): Promise<{ low: string; high: string }> {
  const rows = await sql<{ low: string | null; high: string | null }>`
    select case when ${a} < ${b} then ${a} when ${b} < ${a} then ${b} else null end as low,
           case when ${a} < ${b} then ${b} when ${b} < ${a} then ${a} else null end as high
  `;
  const pair = rows[0];
  if (!pair?.low || !pair.high || pair.low === pair.high) fail("Себе написать нельзя");
  return { low: pair.low, high: pair.high };
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
    const { low, high } = await orderedDmIds(sql, context.userId, other[0].user_id);
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
    await retainChats(sql);
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
    const withImages = o.withImages === true;
    if (body.length < 1 && !withImages) fail("Напишите сообщение или приложите картинку");
    return { threadId, handle, body, withImages };
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
      const { low, high } = await orderedDmIds(sql, context.userId, other[0].user_id);
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
    const messageId = crypto.randomUUID();
    await sql`
      insert into dm_messages (id, thread_id, sender_id, body)
      values (${messageId}, ${threadId}, ${context.userId}, ${data.body})
    `;
    const other = thread[0].low_id === context.userId ? thread[0].high_id : thread[0].low_id;
    const otherProfile = await sql<{ handle: string }>`select handle from profiles where user_id = ${other}`;
    const preview = data.body ? data.body.slice(0, 140) : "картинка";
    const href = `/chats?with=${encodeURIComponent(otherProfile[0]?.handle ?? "")}`;
    await notify(sql, other, "dm", "Новое сообщение", `${me.handle}: ${preview}`, href);
    await mentionPeople(sql, context.userId, me.handle, `dm:${messageId}`, href, [data.body], [other]);
    return { ok: true, threadId, id: messageId };
  });

export const attachDmImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустой файл");
    const o = input as Record<string, unknown>;
    if (typeof o.messageId !== "string" || !UUID_RE.test(o.messageId)) fail("Некорректное сообщение");
    if (typeof o.filename !== "string" || typeof o.b64 !== "string") fail("Файл не прочитан");
    const b64 = o.b64.replace(/^data:[^,]*,/, "").replace(/\s/g, "");
    if (b64.length > 4_600_000) fail("Картинка больше 3 МБ");
    return { messageId: o.messageId, filename: o.filename, b64 };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertLive(profile);
    const message = await sql<{ id: string }>`
      select m.id
      from dm_messages m
      join dm_threads t on t.id = m.thread_id
      where m.id = ${data.messageId}
        and m.sender_id = ${context.userId}
        and (t.low_id = ${context.userId} or t.high_id = ${context.userId})
    `;
    if (!message[0]) fail("Это сообщение нельзя дополнить");
    const counts = await sql<{ n: number }>`
      select count(*)::int as n from dm_message_images where message_id = ${data.messageId}
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
      insert into dm_message_images (id, message_id, filename, mime, data_b64, width, height, size_bytes, sort)
      values (
        ${id}, ${data.messageId}, ${filename}, ${magic}, ${buf.toString("base64")},
        ${size.width}, ${size.height}, ${buf.length}, ${num(counts[0]?.n)}
      )
    `;
    return { id };
  });

export const discardBlankDm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректное сообщение");
    return id;
  })
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    await sql`
      delete from dm_messages
      where id = ${id}
        and sender_id = ${context.userId}
        and body = ''
        and not exists (select 1 from dm_message_images where message_id = ${id})
    `;
    return { ok: true };
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
    const state = o.state === "closed" ? "closed" : "open";
    const shelf = o.shelf === "lotteries" ? "lotteries" : "lots";
    return { handle, page: Number.isInteger(page) && page > 0 && page < 500 ? page : 1, state, shelf };
  })
  .handler(async ({ data }): Promise<{ items: ListingCard[]; total: number }> => {
    const sql = await getSql();
    const profile = await sql<{ user_id: string }>`select user_id from profiles where handle = ${data.handle}`;
    if (!profile[0]) return { items: [], total: 0 };
    const offset = (data.page - 1) * PROFILE_LOT_PAGE;
    const statuses = data.state === "closed" ? ["sold", "ended"] : ["active"];
    const [items, totalRow] = await Promise.all([
      sql.query<CardRow>(
        `select ${CARD_SQL}
         from listings l
         left join profiles p on p.user_id = l.seller_id
         where l.seller_id = $1 and l.status = any($2::text[])
           and (($5::text = 'lotteries' and l.kind = 'lottery') or ($5::text = 'lots' and l.kind <> 'lottery'))
         order by l.pinned desc, l.created_at desc
         limit $3 offset $4`,
        [profile[0].user_id, statuses, PROFILE_LOT_PAGE, offset, data.shelf],
      ),
      sql<{ n: number }>`
        select count(*)::int as n from listings
        where seller_id = ${profile[0].user_id} and status = any(${statuses}::text[])
          and ((${data.shelf} = 'lotteries' and kind = 'lottery') or (${data.shelf} = 'lots' and kind <> 'lottery'))
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
      await reviewLotteryEntries(sql, context.userId, { sellerId: target[0].user_id });
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
    if (images.length > POST_IMAGE_MAX) fail(`Не больше ${POST_IMAGE_MAX} картинок`);
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
    await mentionPeople(sql, context.userId, me.handle, `post:${id}`, `/u/${me.handle}`, [data.body]);
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
    const commentId = crypto.randomUUID();
    await sql`
      insert into post_comments (id, post_id, author_id, parent_id, body)
      values (${commentId}, ${data.postId}, ${context.userId}, ${parentId}, ${data.body})
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
    await mentionPeople(sql, context.userId, me.handle, `post-comment:${commentId}`, `/u/${post[0].handle}`, [data.body]);
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

async function loadNews(sql: Sql, staff: boolean): Promise<NewsPost[]> {
  const posts = await sql.query<{
    id: string;
    title: string;
    body: string;
    created_at: unknown;
    published: boolean;
  }>(
    `select id, title, body, created_at, published
     from news_posts
     ${staff ? "" : "where published"}
     order by created_at desc
     limit 20`,
  );
  if (posts.length === 0) return [];
  const ids = posts.map((post) => post.id);
  const images = await sql<{ id: string; news_id: string; card_b64: string }>`
    select id, news_id, card_b64
    from news_images
    where news_id = any(${ids}::text[])
    order by sort asc
  `;
  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    body: post.body,
    createdAt: iso(post.created_at),
    published: post.published === true,
    images: images
      .filter((image) => image.news_id === post.id && image.card_b64.length > 32 && image.card_b64.length < 300_000)
      .map((image) => ({ id: image.id, src: `data:image/jpeg;base64,${image.card_b64}` })),
  }));
}

export const listNews = createServerFn({ method: "GET" }).handler(async (): Promise<NewsPost[]> => {
  const sql = await getSql();
  return loadNews(sql, false);
});

export const listStaffNews = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<NewsPost[]> => {
    const sql = await getSql();
    const me = await requireStaff(sql, context.userId);
    if (me.role !== "admin") fail("Новости сайта публикует администратор");
    return loadNews(sql, true);
  });

function parseNewsWrite(input: unknown): { title: string; body: string; images: string[] } {
  if (!input || typeof input !== "object") fail("Пустая новость");
  const o = input as Record<string, unknown>;
  const title = cleanText(typeof o.title === "string" ? o.title : "", 120);
  const body = cleanText(typeof o.body === "string" ? o.body : "", 4000);
  if (title.length < 3) fail("Заголовок — хотя бы 3 символа");
  const images = Array.isArray(o.images) ? o.images.filter((item): item is string => typeof item === "string") : [];
  if (images.length > 4) fail("Не больше 4 картинок");
  return {
    title,
    body,
    images: images.map((item) => item.replace(/^data:[^,]*,/, "").replace(/\s/g, "")),
  };
}

function newsJpeg(images: string[]): string[] {
  const ready: string[] = [];
  for (const raw of images) {
    if (raw.length < 32 || raw.length > 280_000) fail("Картинка новости слишком большая");
    const buf = Buffer.from(raw, "base64");
    if (buf.length < 32 || buf[0] !== 0xff || buf[1] !== 0xd8) fail("Картинка новости должна быть JPEG");
    ready.push(buf.toString("base64"));
  }
  return ready;
}

async function saveNewsImages(sql: Sql, id: string, images: string[]) {
  await sql`delete from news_images where news_id = ${id}`;
  for (let sort = 0; sort < images.length; sort += 1) {
    await sql`
      insert into news_images (id, news_id, card_b64, sort)
      values (${crypto.randomUUID()}, ${id}, ${images[sort]}, ${sort})
    `;
  }
}

async function notifyNewsMentions(sql: Sql, actorId: string, actorHandle: string, id: string, title: string, body: string) {
  const href = `/#news-${id}`;
  const source = `news:${id}`;
  await mentionPeople(sql, actorId, actorHandle, source, href, [title, body]);
  try {
    await sql`update mentions set href = ${href} where source = ${source}`;
    await sql`
      update notifications
      set href = ${href}
      where kind = 'mention' and href = '/' and user_id in (select user_id from mentions where source = ${source})
    `;
  } catch (err) {
    console.error("[mention] news href", source, err);
  }
}

export const publishNews = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseNewsWrite)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const me = await requireStaff(sql, context.userId);
    if (me.role !== "admin") fail("Новости сайта публикует администратор");
    const ready = newsJpeg(data.images);
    const id = crypto.randomUUID();
    await sql`
      insert into news_posts (id, author_id, title, body, published)
      values (${id}, ${me.userId}, ${data.title}, ${data.body}, true)
    `;
    await saveNewsImages(sql, id, ready);
    await notifyNewsMentions(sql, context.userId, me.handle, id, data.title, data.body);
    return { id };
  });

export const updateNews = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустая новость");
    const o = input as Record<string, unknown>;
    if (typeof o.id !== "string" || !UUID_RE.test(o.id)) fail("Некорректная новость");
    return { id: o.id, ...parseNewsWrite(input) };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const me = await requireStaff(sql, context.userId);
    if (me.role !== "admin") fail("Новости сайта публикует администратор");
    const ready = newsJpeg(data.images);
    const rows = await sql<{ published: boolean }>`
      update news_posts
      set title = ${data.title}, body = ${data.body}
      where id = ${data.id}
      returning published
    `;
    if (!rows[0]) fail("Новость не найдена");
    await saveNewsImages(sql, data.id, ready);
    if (rows[0].published === true) {
      await notifyNewsMentions(sql, context.userId, me.handle, data.id, data.title, data.body);
    }
    return { id: data.id };
  });

export const deleteNews = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректная новость");
    return id;
  })
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    const me = await requireStaff(sql, context.userId);
    if (me.role !== "admin") fail("Новости сайта публикует администратор");
    await sql`delete from mentions where source = ${`news:${id}`}`;
    const removed = await sql`delete from news_posts where id = ${id} returning id`;
    if (!removed[0]) fail("Новость не найдена");
    return { ok: true };
  });

export const setNewsPublished = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пусто");
    const o = input as Record<string, unknown>;
    if (typeof o.id !== "string" || !UUID_RE.test(o.id)) fail("Некорректная новость");
    if (typeof o.published !== "boolean") fail("Некорректный флаг");
    return { id: o.id, published: o.published };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const me = await requireStaff(sql, context.userId);
    if (me.role !== "admin") fail("Новости сайта публикует администратор");
    const updated = await sql<{ id: string; title: string; body: string }>`
      update news_posts set published = ${data.published} where id = ${data.id}
      returning id, title, body
    `;
    if (!updated[0]) fail("Новость не найдена");
    if (data.published) {
      await notifyNewsMentions(sql, context.userId, me.handle, data.id, updated[0].title, updated[0].body);
    }
    return { ok: true };
  });


