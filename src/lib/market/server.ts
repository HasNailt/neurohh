import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { optionalAuth } from "@/lib/market/optional-auth";
import { decodedImageSize, isRaster, psdSize, sniffMagic } from "@/lib/market/images";
import {
  FILE_MAX,
  MAX_DIM,
  MAX_FILES,
  MAX_PREVIEWS,
  PAGE_SIZE,
  PREVIEW_MAX,
  SNIPE_OPTIONS,
  UUID_RE,
  cleanHandle,
  slugHandle,
  likeContains,
  parseFeedQuery,
  parsePrice,
  tagParts,
  asRole,
  isStaff,
  asBadges,
  asLinks,
  asStatus,
  type AdminData,
  type BidRow,
  type DealDetail,
  type DealStatus,
  type DealSummary,
  type FeedResult,
  type ListingCard,
  type ListingDetail,
  type ListingStatus,
  type Me,
  type MediaMeta,
  type Notice,
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
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
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
};

function mapProfile(row: ProfileRow): Profile {
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
  };
}

async function ensureProfile(sql: Sql, userId: string): Promise<Profile> {
  const found = await sql<ProfileRow>`
    select user_id, handle, display_name, bio, role, banned, status, links, badges
    from profiles where user_id = ${userId}
  `;
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
      const again = await sql<ProfileRow>`
        select user_id, handle, display_name, bio, role, banned, status, links, badges
        from profiles where user_id = ${userId}
      `;
      if (again[0]) return mapProfile(again[0]);
    }
  }

  const ready = await sql<ProfileRow>`
    select user_id, handle, display_name, bio, role, banned, status, links, badges
    from profiles where user_id = ${userId}
  `;
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
  await sql`
    insert into messages (id, deal_id, sender_id, body)
    values (
      ${crypto.randomUUID()},
      ${dealId},
      'system',
      ${`Сделка ${publicNo ? `#${publicNo}` : ""} открыта. Оплата проходит вне площадки. Когда перевод дойдёт, обе стороны нажимают «Оплата прошла» — после этого покупатель видит файлы и полное описание.`}
    )
  `;
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
  coalesce((
    select json_agg(json_build_object('slug', t.slug, 'label', t.label) order by t.label)
    from listing_tags lt
    join tags t on t.id = lt.tag_id
    where lt.listing_id = l.id
  ), '[]'::json) as tags
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
  tags: unknown;
  like_count: number;
  pinned: boolean;
};

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
    endsAt: isoOrNull(row.ends_at),
    status: row.status,
    sellerId: row.seller_id,
    sellerHandle: row.seller_handle,
    sellerName: row.seller_name,
    previewId: row.preview_id,
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
    const offset = (data.page - 1) * PAGE_SIZE;
    const order =
      data.sort === "ending"
        ? "order by l.ends_at asc nulls last, l.created_at desc"
        : data.sort === "price"
          ? "order by coalesce(l.current_bid, l.price) asc, l.created_at desc"
          : "order by l.created_at desc";
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
      [...params, PAGE_SIZE, offset],
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
      CardRow & { blurb: string; anti_snipe_minutes: number; created_at: unknown }
    >(
      `select ${CARD_SQL}, l.blurb, l.anti_snipe_minutes, l.created_at
       from listings l
       left join profiles p on p.user_id = l.seller_id
       where l.id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    const isSeller = userId != null && userId === row.seller_id;
    let staff = false;
    if (userId && !isSeller && row.status === "removed") {
      const viewer = await sql<{ role: string }>`
        select role from profiles where user_id = ${userId}
      `;
      staff = isStaff(asRole(viewer[0]?.role));
    }
    if (row.status === "removed" && !isSeller && !staff) return null;

    const previews = await sql<{ id: string }>`
      select id from media where listing_id = ${id} and kind = 'preview' order by created_at asc
    `;
    const bids = await sql<{ id: string; amount: number; handle: string; created_at: unknown }>`
      select b.id, b.amount, p.handle, b.created_at
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
      }>`
        select c.id, c.body, c.created_at, a.handle as author_handle, a.display_name as author_name
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
      createdAt: iso(b.created_at),
    }));
    return {
      ...likedCards[0],
      blurb: row.blurb,
      winnerId: row.winner_id,
      antiSnipeMinutes: num(row.anti_snipe_minutes),
      createdAt: iso(row.created_at),
      previews: previews.map((p) => ({ id: p.id })),
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
        }),
      ),
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
  const blurb = cleanText(typeof o.blurb === "string" ? o.blurb : "", 400);
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
    fail("Выберите окно антиснайпа");
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
        'active'
      )
    `;
    await attachTags(sql, id, data.tags);
    return { id };
  });

type UploadBody = {
  listingId: string;
  kind: "preview" | "file";
  filename: string;
  b64: string;
};

function parseUpload(input: unknown): UploadBody {
  if (!input || typeof input !== "object") fail("Пустой файл");
  const o = input as Record<string, unknown>;
  if (typeof o.listingId !== "string" || !UUID_RE.test(o.listingId)) fail("Некорректный лот");
  if (o.kind !== "preview") fail("Полные файлы через площадку больше не принимаются");
  if (typeof o.filename !== "string" || typeof o.b64 !== "string") fail("Файл не прочитан");
  if (o.b64.length > 12_000_000) fail("Файл больше 4 МБ");
  return {
    listingId: o.listingId,
    kind: o.kind,
    filename: o.filename,
    b64: o.b64.replace(/^data:[^,]*,/, "").replace(/\s/g, ""),
  };
}

export const uploadMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseUpload)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    assertLive(profile);
    const owned = await sql<{ id: string }>`
      select id from listings
      where id = ${data.listingId} and seller_id = ${context.userId} and status = 'active'
    `;
    if (!owned[0]) fail("Лот нельзя дополнять");
    const counts = await sql<{ n: number }>`
      select count(*)::int as n from media where listing_id = ${data.listingId} and kind = ${data.kind}
    `;
    const cap = data.kind === "preview" ? MAX_PREVIEWS : MAX_FILES;
    if (num(counts[0]?.n) >= cap) fail(data.kind === "preview" ? "Уже 4 превью" : "Уже 6 файлов");

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
    await sql`
      insert into media (id, listing_id, kind, filename, mime, data_b64, width, height, size_bytes)
      values (
        ${id},
        ${data.listingId},
        ${data.kind},
        ${filename},
        ${magic},
        ${buf.toString("base64")},
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
  const blurb = cleanText(typeof o.blurb === "string" ? o.blurb : "", 400);
  if (title.length < 3) fail("Название — хотя бы 3 символа");
  const tags = Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === "string").slice(0, 8) : [];
  return { id: o.id, title, blurb, tags };
}

export const updateListingCopy = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parseCopy)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
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
      where id = ${id} and seller_id = ${context.userId} and status = 'active' and bid_count = 0
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
    if (lot.current_bidder_id === context.userId) fail("Вы уже лидер. Дождитесь другой ставки.");
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
            when ends_at <= now() + (anti_snipe_minutes * interval '1 minute')
            then now() + (anti_snipe_minutes * interval '1 minute')
            else ends_at
          end,
          updated_at = now()
      where id = ${data.listingId}
        and status = 'active'
        and kind = 'auction'
        and ends_at > now()
        and (current_bidder_id is null or current_bidder_id <> ${context.userId})
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
  .validator((handle: unknown) => {
    const h = typeof handle === "string" ? handle.trim().toLocaleLowerCase("ru") : "";
    if (!cleanHandle(h)) fail("Некорректный профиль");
    return h;
  })
  .handler(async ({ data: handle }): Promise<PublicProfile | null> => {
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
    }>`
      select user_id, display_name, bio, role, status, links, badges, created_at
      from profiles where handle = ${handle}
    `;
    if (!rows[0]) return null;
    const items = await sql.query<CardRow>(
      `select ${CARD_SQL}
       from listings l
       left join profiles p on p.user_id = l.seller_id
       where l.seller_id = $1 and l.status in ('active', 'sold', 'ended')
       order by l.pinned desc, l.created_at desc
       limit 60`,
      [rows[0].user_id],
    );
    const cards = items.map(mapCard);
    const images = await sql<{ kind: string }>`
      select kind from profile_images where user_id = ${rows[0].user_id}
    `;
    const kinds = new Set(images.map((r) => r.kind));
    const comments = await sql<{
      id: string;
      body: string;
      created_at: unknown;
      author_handle: string;
      author_name: string;
    }>`
      select c.id, c.body, c.created_at, a.handle as author_handle, a.display_name as author_name
      from profile_comments c
      join profiles a on a.user_id = c.author_id
      where c.profile_id = ${rows[0].user_id}
      order by c.created_at desc
      limit 40
    `;
    const pinned = cards.filter((c) => c.pinned);
    return {
      handle,
      displayName: rows[0].display_name,
      bio: rows[0].bio,
      role: asRole(rows[0].role),
      status: asStatus(rows[0].status),
      links: asLinks(rows[0].links),
      badges: asBadges(rows[0].badges),
      createdAt: iso(rows[0].created_at),
      hasAvatar: kinds.has("avatar"),
      hasBanner: kinds.has("banner"),
      hasBackground: kinds.has("background"),
      pinned,
      active: cards.filter((c) => c.status === "active" && !c.pinned),
      done: cards.filter((c) => c.status !== "active" && !c.pinned),
      comments: comments.map(
        (c): ProfileComment => ({
          id: c.id,
          body: c.body,
          createdAt: iso(c.created_at),
          authorHandle: c.author_handle,
          authorName: c.author_name,
        }),
      ),
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
      created_at: unknown;
    }>`
      select d.id, d.public_no, d.listing_id, l.title, d.amount, d.status, d.seller_id,
             d.created_at, sp.handle as seller_handle, bp.handle as buyer_handle,
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
      youAre: youAre(r.seller_id, context.userId),
      createdAt: iso(r.created_at),
    }));
  });

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
    seller_confirmed_at: unknown;
    buyer_confirmed_at: unknown;
    private_description: string;
    preview_id: string | null;
  }>`
    select d.id, d.public_no, d.listing_id, l.title, d.amount, d.status,
           d.seller_id, d.buyer_id,
           sp.handle as seller_handle, sp.display_name as seller_name,
           bp.handle as buyer_handle, bp.display_name as buyer_name,
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
  }>`
    select m.id, m.sender_id, m.body, m.created_at, p.handle
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
    seller: { id: d.seller_id, handle: d.seller_handle, name: d.seller_name },
    buyer: { id: d.buyer_id, handle: d.buyer_handle, name: d.buyer_name },
    sellerConfirmed: d.seller_confirmed_at != null,
    buyerConfirmed: d.buyer_confirmed_at != null,
    privateDescription: showSecret ? d.private_description : null,
    files: showSecret ? await loadFiles(sql, d.listing_id) : null,
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      handle: m.sender_id === "system" ? null : m.handle,
      body: m.body,
      createdAt: iso(m.created_at),
      system: m.sender_id === "system",
    })),
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
    }>`
      select d.id, d.public_no, l.title, d.amount, d.status,
             sp.handle as seller_handle, sp.display_name as seller_name,
             bp.handle as buyer_handle, bp.display_name as buyer_name
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
    }>`
      select m.id, m.sender_id, m.body, m.created_at, p.handle
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
      seller: { handle: d.seller_handle, name: d.seller_name },
      buyer: { handle: d.buyer_handle, name: d.buyer_name },
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        handle: m.sender_id === "system" ? null : m.handle,
        body: m.body,
        createdAt: iso(m.created_at),
        system: m.sender_id === "system",
      })),
    };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") fail("Пустое сообщение");
    const o = input as Record<string, unknown>;
    if (typeof o.dealId !== "string" || !UUID_RE.test(o.dealId)) fail("Некорректная сделка");
    const body = cleanText(typeof o.body === "string" ? o.body : "", 2000);
    if (!body) fail("Напишите сообщение");
    return { dealId: o.dealId, body };
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
    await sql`
      insert into messages (id, deal_id, sender_id, body)
      values (${crypto.randomUUID()}, ${data.dealId}, ${context.userId}, ${data.body})
    `;
    const other = d.seller_id === context.userId ? d.buyer_id : d.seller_id;
    await notify(
      sql,
      other,
      "message",
      "Новое сообщение",
      `${profile.handle}: ${data.body.slice(0, 140)}`,
      `/deals/${data.dealId}`,
    );
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

export const completeDeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректная сделка");
    return id;
  })
  .handler(async ({ data: id, context }): Promise<DealDetail> => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const updated = await sql<{ seller_id: string; buyer_id: string }>`
      update deals
      set status = 'completed', completed_at = now()
      where id = ${id}
        and status <> 'completed'
        and (seller_id = ${context.userId} or buyer_id = ${context.userId})
      returning seller_id, buyer_id
    `;
    if (updated[0]) {
      await sql`
        insert into messages (id, deal_id, sender_id, body)
        values (${crypto.randomUUID()}, ${id}, 'system', 'Сделка отмечена как завершённая.')
      `;
      const other = updated[0].seller_id === context.userId ? updated[0].buyer_id : updated[0].seller_id;
      await notify(sql, other, "done", "Сделка завершена", "Вторая сторона закрыла сделку", `/deals/${id}`);
    }
    const loaded = await loadDeal(sql, id, context.userId);
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
      limit 20
    `;
    const people = await sql<{
      user_id: string;
      handle: string;
      display_name: string;
      banned: boolean;
      role: string;
      badges: unknown;
    }>`
      select user_id, handle, display_name, banned, role, badges
      from profiles
      order by created_at desc
      limit 80
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
      limit 30
    `;
    const accounts = await sql<{ user_id: string; provider_id: string }>`
      select "userId" as user_id, "providerId" as provider_id
      from account
      where "userId" in (select user_id from profiles order by created_at desc limit 80)
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
            limit 40
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
    fail("Некорректное действие");
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const actor = await requireStaff(sql, context.userId);
    if (data.action === "remove-listing") {
      await sql`
        update listings set status = 'removed', updated_at = now()
        where id = ${data.listingId} and status <> 'sold'
      `;
      await sql`
        update reports set status = 'actioned'
        where listing_id = ${data.listingId} and status = 'open'
      `;
    } else if (data.action === "dismiss-report") {
      await sql`update reports set status = 'dismissed' where id = ${data.reportId}`;
    } else if (data.action === "action-report") {
      const report = await sql<{ listing_id: string | null }>`
        select listing_id from reports where id = ${data.reportId}
      `;
      await sql`update reports set status = 'actioned' where id = ${data.reportId}`;
      if (report[0]?.listing_id) {
        await sql`
          update listings set status = 'removed', updated_at = now()
          where id = ${report[0].listing_id} and status <> 'sold'
        `;
      }
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
    }
    return { ok: true };
  });

export const listRecommendations = createServerFn({ method: "GET" }).handler(async (): Promise<ListingCard[]> => {
  const sql = await getSql();
  await settle(sql);
  const items = await sql.query<CardRow>(
    `select ${CARD_SQL}
     from listings l
     left join profiles p on p.user_id = l.seller_id
     where l.status = 'active' and l.kind = 'auction'
     order by (
       -ln(greatest(random(), 0.0000001))
       / (1 + l.bid_count + (select count(*) from listing_likes lk where lk.listing_id = l.id))
     ) asc
     limit 8`,
  );
  return items.map(mapCard);
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
       where l.seller_id = $1 and l.status <> 'removed'
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
      const n = await sql<{ n: number }>`
        select count(*)::int as n from listings
        where seller_id = ${context.userId} and pinned and id <> ${data.id} and status <> 'removed'
      `;
      if (num(n[0]?.n) >= 6) fail("Можно закрепить не больше шести работ");
    }
    const updated = await sql`
      update listings set pinned = ${data.pinned}, updated_at = now()
      where id = ${data.id} and seller_id = ${context.userId} and status <> 'removed'
      returning id
    `;
    if (!updated[0]) fail("Этот лот нельзя закрепить");
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
    if (b64.length > 2_200_000) fail("Файл больше лимита");
    const kind: ProfileImageKind = o.kind;
    return { kind, b64 };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const buf = Buffer.from(data.b64, "base64");
    if (buf.length > IMAGE_MAX[data.kind]) {
      fail(data.kind === "avatar" ? "Аватар больше 500 КБ" : "Картинка больше 1.2 МБ");
    }
    const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const magic = sniffMagic(bytes);
    if (!magic || !isRaster(magic)) fail("Нужны PNG, JPG, WEBP или GIF");
    const size = decodedImageSize(bytes);
    if (!size) fail("Не удалось прочитать изображение");
    const cap = data.kind === "avatar" ? 2000 : MAX_DIM;
    if (size.width > cap || size.height > cap) fail(`Слишком большой кадр, максимум ${cap}px`);
    await sql`
      insert into profile_images (user_id, kind, mime, data_b64)
      values (${context.userId}, ${data.kind}, ${magic}, ${buf.toString("base64")})
      on conflict (user_id, kind) do update set mime = excluded.mime, data_b64 = excluded.data_b64
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
      last_body: string | null;
      updated_at: unknown;
    }>`
      select t.id,
        case when t.low_id = ${context.userId} then hi.handle else lo.handle end as other_handle,
        case when t.low_id = ${context.userId} then hi.display_name else lo.display_name end as other_name,
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
      where t.low_id = ${context.userId} or t.high_id = ${context.userId}
      order by updated_at desc
      limit 40
    `;
    return rows.map((r) => ({
      id: r.id,
      otherHandle: r.other_handle,
      otherName: r.other_name,
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
  }>`
    select t.id, t.low_id, t.high_id,
      case when t.low_id = ${userId} then hi.handle else lo.handle end as other_handle,
      case when t.low_id = ${userId} then hi.display_name else lo.display_name end as other_name
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
    body: string;
    created_at: unknown;
  }>`
    select m.id, m.sender_id, p.handle, m.body, m.created_at
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
    lastBody: last?.body ?? null,
    updatedAt: last ? iso(last.created_at) : new Date().toISOString(),
    messages: messages.map((m) => ({
      id: m.id,
      handle: m.handle,
      body: m.body,
      createdAt: iso(m.created_at),
      mine: m.sender_id === userId,
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
    const id = existing[0]?.id ?? crypto.randomUUID();
    if (!existing[0]) {
      await sql`
        insert into dm_threads (id, low_id, high_id) values (${id}, ${low}, ${high})
      `;
    }
    const loaded = await loadThread(sql, id, context.userId);
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
    if (typeof o.threadId !== "string" || !UUID_RE.test(o.threadId)) fail("Некорректный чат");
    const body = cleanText(typeof o.body === "string" ? o.body : "", 2000);
    if (body.length < 1) fail("Напишите сообщение");
    return { threadId: o.threadId, body };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const me = await ensureProfile(sql, context.userId);
    assertLive(me);
    const thread = await sql<{ low_id: string; high_id: string }>`
      select low_id, high_id from dm_threads
      where id = ${data.threadId} and (low_id = ${context.userId} or high_id = ${context.userId})
    `;
    if (!thread[0]) fail("Нет доступа к чату");
    await sql`
      insert into dm_messages (id, thread_id, sender_id, body)
      values (${crypto.randomUUID()}, ${data.threadId}, ${context.userId}, ${data.body})
    `;
    const other = thread[0].low_id === context.userId ? thread[0].high_id : thread[0].low_id;
    await notify(sql, other, "dm", "Новое сообщение", `${me.handle}: ${data.body.slice(0, 140)}`, "/chats");
    return { ok: true };
  });

