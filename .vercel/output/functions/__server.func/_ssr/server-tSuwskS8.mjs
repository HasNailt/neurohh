import { C as parsePrice, D as slugHandle, S as parseFeedQuery, a as SNIPE_OPTIONS, b as likeContains, c as asLinks, f as cleanHandle, i as PREVIEW_MAX, k as tagParts, l as asRole, n as FILE_MAX, o as UUID_RE, r as MAX_DIM, s as asBadges, u as asStatus, y as isStaff } from "./shared-CQ2SO6Dv.mjs";
import { r as createServerFn } from "./ssr.mjs";
import { n as optionalAuth, t as authMiddleware } from "./optional-auth-DFwMHPYX.mjs";
import { i as getSql } from "./db-BGazDrk_.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/server-tSuwskS8.js
var IMAGE_MAGICS = /* @__PURE__ */ new Set([
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp"
]);
function isRaster(magic) {
	return IMAGE_MAGICS.has(magic);
}
function sniffMagic(bytes) {
	if (bytes.length < 12) return null;
	if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return "image/png";
	if (bytes[0] === 255 && bytes[1] === 216) return "image/jpeg";
	if (bytes[0] === 71 && bytes[1] === 73 && bytes[2] === 70) return "image/gif";
	if (bytes[0] === 82 && bytes[1] === 73 && bytes[8] === 87 && bytes[9] === 69) return "image/webp";
	if (bytes[0] === 80 && bytes[1] === 75 && (bytes[2] === 3 || bytes[2] === 5 || bytes[2] === 7)) return "application/zip";
	if (bytes[0] === 56 && bytes[1] === 66 && bytes[2] === 80 && bytes[3] === 83) return "image/vnd.adobe.photoshop";
	return null;
}
function viewOf(bytes) {
	return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
function positive(width, height) {
	if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
	if (width < 1 || height < 1 || width > 3e4 || height > 3e4) return null;
	return {
		width,
		height
	};
}
function psdSize(bytes) {
	if (bytes.length < 22) return null;
	if (sniffMagic(bytes) !== "image/vnd.adobe.photoshop") return null;
	const view = viewOf(bytes);
	return positive(view.getUint32(18), view.getUint32(14));
}
/** Raster dimensions from file headers. Null if the file isn't a known image. */
function decodedImageSize(bytes) {
	if (bytes.length < 16) return null;
	if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
		if (bytes.length < 24) return null;
		const view = viewOf(bytes);
		return positive(view.getUint32(16), view.getUint32(20));
	}
	if (bytes[0] === 71 && bytes[1] === 73 && bytes[2] === 70) return positive(bytes[6] | bytes[7] << 8, bytes[8] | bytes[9] << 8);
	if (bytes[0] === 255 && bytes[1] === 216) {
		let i = 2;
		while (i + 9 < bytes.length) {
			if (bytes[i] !== 255) {
				i += 1;
				continue;
			}
			const marker = bytes[i + 1];
			if (marker === 0 || marker === 255) {
				i += 1;
				continue;
			}
			if (marker === 216 || marker === 217) {
				i += 2;
				continue;
			}
			const len = bytes[i + 2] << 8 | bytes[i + 3];
			if (len < 2 || i + 2 + len > bytes.length) return null;
			if (marker >= 192 && marker <= 195 || marker >= 197 && marker <= 199 || marker >= 201 && marker <= 203 || marker >= 205 && marker <= 207) {
				const height = bytes[i + 5] << 8 | bytes[i + 6];
				return positive(bytes[i + 7] << 8 | bytes[i + 8], height);
			}
			i += 2 + len;
		}
		return null;
	}
	if (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 && bytes.length > 30 && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) {
		const tag = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
		if (tag === "VP8X") return positive(1 + (bytes[24] | bytes[25] << 8 | bytes[26] << 16), 1 + (bytes[27] | bytes[28] << 8 | bytes[29] << 16));
		if (tag === "VP8L" && bytes[20] === 47) {
			const b0 = bytes[21];
			const b1 = bytes[22];
			const b2 = bytes[23];
			const b3 = bytes[24];
			return positive(1 + (b0 | (b1 & 63) << 8), 1 + ((b1 & 192) >> 6 | b2 << 2 | (b3 & 15) << 10));
		}
		if (tag === "VP8 ") {
			const end = Math.min(bytes.length - 8, 96);
			for (let j = 20; j < end; j += 1) if (bytes[j] === 157 && bytes[j + 1] === 1 && bytes[j + 2] === 42) return positive((bytes[j + 3] | bytes[j + 4] << 8) & 16383, (bytes[j + 5] | bytes[j + 6] << 8) & 16383);
		}
	}
	return null;
}
function iso(v) {
	if (v instanceof Date) return v.toISOString();
	const d = new Date(String(v));
	return Number.isNaN(d.getTime()) ? String(v) : d.toISOString();
}
function isoOrNull(v) {
	if (v == null) return null;
	return iso(v);
}
function num(v) {
	const n = typeof v === "number" ? v : Number(v);
	return Number.isFinite(n) ? n : 0;
}
function asTags(v) {
	const raw = typeof v === "string" ? JSON.parse(v) : v;
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((t) => {
		if (!t || typeof t !== "object") return [];
		const slug = "slug" in t && typeof t.slug === "string" ? t.slug : "";
		const label = "label" in t && typeof t.label === "string" ? t.label : "";
		return slug && label ? [{
			slug,
			label
		}] : [];
	});
}
function cleanText(s, max) {
	return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}
function fail(message) {
	throw new Error(message);
}
function mapProfile(row) {
	return {
		userId: row.user_id,
		handle: row.handle,
		displayName: row.display_name,
		bio: row.bio,
		role: asRole(row.role),
		banned: Boolean(row.banned),
		status: asStatus(row.status),
		links: asLinks(row.links),
		badges: asBadges(row.badges)
	};
}
async function ensureProfile(sql, userId) {
	const found = await sql`
    select user_id, handle, display_name, bio, role, banned, status, links, badges
    from profiles where user_id = ${userId}
  `;
	if (found[0]) return mapProfile(found[0]);
	const users = await sql`
    select name, email from "user" where id = ${userId}
  `;
	const name = cleanText(users[0]?.name || "Художник", 40) || "Художник";
	const email = users[0]?.email ?? "";
	const seed = slugHandle(name) ?? slugHandle(email.split("@")[0] ?? "") ?? "artist";
	const base = seed.length >= 3 ? seed : "artist";
	for (let i = 0; i < 8; i += 1) {
		const handle = i === 0 ? base.slice(0, 20) : `${base.slice(0, 14)}${1e3 + Math.floor(Math.random() * 9e3)}`;
		try {
			const first = num((await sql`select count(*)::int as n from profiles`)[0]?.n) === 0;
			await sql`
        insert into profiles (user_id, handle, display_name, bio, is_admin, role)
        values (${userId}, ${handle}, ${name}, '', ${first}, ${first ? "admin" : "user"})
      `;
			break;
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (!/duplicate|unique/i.test(msg)) throw e;
			const again = await sql`
        select user_id, handle, display_name, bio, role, banned, status, links, badges
        from profiles where user_id = ${userId}
      `;
			if (again[0]) return mapProfile(again[0]);
		}
	}
	const ready = await sql`
    select user_id, handle, display_name, bio, role, banned, status, links, badges
    from profiles where user_id = ${userId}
  `;
	if (!ready[0]) fail("Не удалось создать профиль");
	return mapProfile(ready[0]);
}
function assertLive(profile) {
	if (profile.banned) fail("Аккаунт ограничен модерацией");
}
async function notify(sql, userId, kind, title, body, href) {
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
async function openDeal(sql, row) {
	if (!row.winner_id) return null;
	const inserted = await sql`
    insert into deals (id, listing_id, seller_id, buyer_id, amount, status)
    values (${crypto.randomUUID()}, ${row.id}, ${row.seller_id}, ${row.winner_id}, ${num(row.amount)}, 'awaiting_payment')
    on conflict (listing_id) do nothing
    returning id, public_no
  `;
	const dealId = inserted[0]?.id ?? (await sql`select id from deals where listing_id = ${row.id}`)[0]?.id;
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
	if (row.winner_id !== row.seller_id) await notify(sql, row.winner_id, "deal", "Вы забрали лот", body, href);
	return dealId;
}
async function settle(sql) {
	try {
		const closed = await sql`
      update listings
      set status = case when current_bidder_id is null then 'ended' else 'sold' end,
          winner_id = current_bidder_id,
          updated_at = now()
      where status = 'active' and kind = 'auction' and ends_at is not null and ends_at <= now()
      returning id, title, seller_id, winner_id, coalesce(current_bid, price) as amount
    `;
		for (const row of closed) if (row.winner_id) await openDeal(sql, row);
		else await notify(sql, row.seller_id, "auction_end", "Аукцион завершён", `«${row.title}» закрыт без ставок`, `/lot/${row.id}`);
		const missing = await sql`
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
var CARD_SQL = `
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
function mapCard(row) {
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
		tags: asTags(row.tags)
	};
}
async function markLiked(sql, userId, cards) {
	if (!userId || cards.length === 0) return cards;
	const ids = cards.map((c) => c.id);
	const params = [userId, ...ids];
	const slots = ids.map((_, i) => `$${i + 2}`).join(", ");
	const rows = await sql.query(`select listing_id from listing_likes where user_id = $1 and listing_id in (${slots})`, params);
	const set = new Set(rows.map((r) => r.listing_id));
	return cards.map((c) => ({
		...c,
		liked: set.has(c.id)
	}));
}
async function attachTags(sql, listingId, raws) {
	const seen = /* @__PURE__ */ new Set();
	for (const raw of raws) {
		const parts = tagParts(raw);
		if (!parts || seen.has(parts.slug)) continue;
		seen.add(parts.slug);
		await sql`
      insert into tags (slug, label) values (${parts.slug}, ${parts.label})
      on conflict (slug) do nothing
    `;
		const tag = await sql`select id from tags where slug = ${parts.slug}`;
		if (!tag[0]) continue;
		await sql`
      insert into listing_tags (listing_id, tag_id) values (${listingId}, ${tag[0].id})
      on conflict do nothing
    `;
	}
}
var listListings_createServerFn_handler = createServerRpc({
	id: "b6a7d5fa941a65f1e9a29197e264e8903e8885fcb9c2f3769a8c3521e9c927bd",
	name: "listListings",
	filename: "src/lib/market/server.ts"
}, (opts) => listListings.__executeServer(opts));
var listListings = createServerFn({ method: "GET" }).middleware([optionalAuth]).validator((input) => parseFeedQuery(input)).handler(listListings_createServerFn_handler, async ({ data, context }) => {
	const sql = await getSql();
	await settle(sql);
	const like = data.q ? likeContains(data.q) : "%";
	const offset = (data.page - 1) * 12;
	const order = data.sort === "ending" ? "order by l.ends_at asc nulls last, l.created_at desc" : data.sort === "price" ? "order by coalesce(l.current_bid, l.price) asc, l.created_at desc" : "order by l.created_at desc";
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
	const params = [
		data.q,
		like,
		data.tag,
		data.kind
	];
	const totalRows = await sql.query(`select count(*)::int as n ${where}`, params);
	const items = await sql.query(`select ${CARD_SQL} ${where} ${order} limit $5 offset $6`, [
		...params,
		12,
		offset
	]);
	const total = num(totalRows[0]?.n);
	return {
		items: await markLiked(sql, context.userId, items.map(mapCard)),
		total,
		hasMore: offset + items.length < total
	};
});
var listPopularTags_createServerFn_handler = createServerRpc({
	id: "e37e03903636af950f708b1749e1e77323c97006701b22cbc0c719143a338ed1",
	name: "listPopularTags",
	filename: "src/lib/market/server.ts"
}, (opts) => listPopularTags.__executeServer(opts));
var listPopularTags = createServerFn({ method: "GET" }).handler(listPopularTags_createServerFn_handler, async () => {
	return (await (await getSql())`
    select t.slug, t.label
    from tags t
    join listing_tags lt on lt.tag_id = t.id
    join listings l on l.id = lt.listing_id and l.status = 'active'
    group by t.id
    order by count(*) desc, t.label asc
    limit 18
  `).map((r) => ({
		slug: r.slug,
		label: r.label
	}));
});
var suggestTags_createServerFn_handler = createServerRpc({
	id: "56767778d629385039aedf4b7bdf2a4cacdc81e0392c97a9df19ce510b0c285b",
	name: "suggestTags",
	filename: "src/lib/market/server.ts"
}, (opts) => suggestTags.__executeServer(opts));
var suggestTags = createServerFn({ method: "GET" }).validator((q) => typeof q === "string" ? q : "").handler(suggestTags_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const q = data.trim().toLocaleLowerCase("ru").replace(/[\\%_]/g, "").slice(0, 24);
	if (!q) return [];
	return sql`
      select slug, label from tags
      where slug like ${`${q}%`}
      order by length(slug), label
      limit 8
    `;
});
var getListing_createServerFn_handler = createServerRpc({
	id: "bda47970204a80cb81982959abc9a9b148110d753a4429f41b0860710fb78fd8",
	name: "getListing",
	filename: "src/lib/market/server.ts"
}, (opts) => getListing.__executeServer(opts));
var getListing = createServerFn({ method: "GET" }).middleware([optionalAuth]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
	return id;
}).handler(getListing_createServerFn_handler, async ({ data: id, context }) => {
	const sql = await getSql();
	await settle(sql);
	const userId = context.userId;
	const row = (await sql.query(`select ${CARD_SQL}, l.blurb, l.anti_snipe_minutes, l.created_at
       from listings l
       left join profiles p on p.user_id = l.seller_id
       where l.id = $1`, [id]))[0];
	if (!row) return null;
	const isSeller = userId != null && userId === row.seller_id;
	let staff = false;
	if (userId && !isSeller && row.status === "removed") {
		const viewer = await sql`
        select role from profiles where user_id = ${userId}
      `;
		staff = isStaff(asRole(viewer[0]?.role));
	}
	if (row.status === "removed" && !isSeller && !staff) return null;
	const previews = await sql`
      select id from media where listing_id = ${id} and kind = 'preview' order by created_at asc
    `;
	const bids = await sql`
      select b.id, b.amount, p.handle, b.created_at
      from bids b
      join profiles p on p.user_id = b.bidder_id
      where b.listing_id = ${id}
      order by b.created_at desc
      limit 40
    `;
	let dealId = null;
	if (userId) dealId = (await sql`
        select id from deals
        where listing_id = ${id} and (seller_id = ${userId} or buyer_id = ${userId})
      `)[0]?.id ?? null;
	let privateDescription = null;
	let files = null;
	if (isSeller) {
		privateDescription = (await sql`
        select private_description from listings where id = ${id} and seller_id = ${userId}
      `)[0]?.private_description ?? "";
		files = await loadFiles(sql, id);
	}
	const card = mapCard(row);
	const [likedCards, comments] = await Promise.all([markLiked(sql, userId, [card]), sql`
        select c.id, c.body, c.created_at, a.handle as author_handle, a.display_name as author_name
        from listing_comments c
        join profiles a on a.user_id = c.author_id
        where c.listing_id = ${id}
        order by c.created_at asc
        limit 80
      `]);
	const bidRows = bids.map((b) => ({
		id: b.id,
		amount: num(b.amount),
		handle: b.handle,
		createdAt: iso(b.created_at)
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
		comments: comments.map((c) => ({
			id: c.id,
			body: c.body,
			createdAt: iso(c.created_at),
			authorHandle: c.author_handle,
			authorName: c.author_name
		}))
	};
});
async function loadFiles(sql, listingId) {
	return (await sql`
    select id, filename, mime, size_bytes from media
    where listing_id = ${listingId} and kind = 'file'
    order by created_at asc
  `).map((r) => ({
		id: r.id,
		filename: r.filename,
		mime: r.mime,
		sizeBytes: num(r.size_bytes)
	}));
}
function parseCreate(input) {
	if (!input || typeof input !== "object") fail("Пустая форма");
	const o = input;
	const title = cleanText(typeof o.title === "string" ? o.title : "", 80);
	const blurb = cleanText(typeof o.blurb === "string" ? o.blurb : "", 400);
	const privateDescription = cleanText(typeof o.privateDescription === "string" ? o.privateDescription : "", 8e3);
	if (title.length < 3) fail("Название — хотя бы 3 символа");
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
var createListing_createServerFn_handler = createServerRpc({
	id: "d4778423fe1e20b569530ff94ff79a175756576f472eac85cd282a23d954012c",
	name: "createListing",
	filename: "src/lib/market/server.ts"
}, (opts) => createListing.__executeServer(opts));
var createListing = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parseCreate).handler(createListing_createServerFn_handler, async ({ data, context }) => {
	const sql = await getSql();
	assertLive(await ensureProfile(sql, context.userId));
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
function parseUpload(input) {
	if (!input || typeof input !== "object") fail("Пустой файл");
	const o = input;
	if (typeof o.listingId !== "string" || !UUID_RE.test(o.listingId)) fail("Некорректный лот");
	if (o.kind !== "preview") fail("Полные файлы через площадку больше не принимаются");
	if (typeof o.filename !== "string" || typeof o.b64 !== "string") fail("Файл не прочитан");
	if (o.b64.length > 12e6) fail("Файл больше 4 МБ");
	return {
		listingId: o.listingId,
		kind: o.kind,
		filename: o.filename,
		b64: o.b64.replace(/^data:[^,]*,/, "").replace(/\s/g, "")
	};
}
var uploadMedia_createServerFn_handler = createServerRpc({
	id: "3c04f445076c94152ff8ecde25d59a8f75469b3fb769350e5bac090d62ed247f",
	name: "uploadMedia",
	filename: "src/lib/market/server.ts"
}, (opts) => uploadMedia.__executeServer(opts));
var uploadMedia = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parseUpload).handler(uploadMedia_createServerFn_handler, async ({ data, context }) => {
	const sql = await getSql();
	assertLive(await ensureProfile(sql, context.userId));
	if (!(await sql`
      select id from listings
      where id = ${data.listingId} and seller_id = ${context.userId} and status = 'active'
    `)[0]) fail("Лот нельзя дополнять");
	const counts = await sql`
      select count(*)::int as n from media where listing_id = ${data.listingId} and kind = ${data.kind}
    `;
	const cap = data.kind === "preview" ? 4 : 6;
	if (num(counts[0]?.n) >= cap) fail(data.kind === "preview" ? "Уже 4 превью" : "Уже 6 файлов");
	const buf = Buffer.from(data.b64, "base64");
	const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
	const magic = sniffMagic(bytes);
	if (!magic) fail("Формат не поддерживается. Нужны PNG, JPG, WEBP, GIF, ZIP или PSD.");
	const max = data.kind === "preview" ? PREVIEW_MAX : FILE_MAX;
	if (buf.length > max) fail(data.kind === "preview" ? "Превью больше 4 МБ" : "Файл больше 4 МБ");
	if (data.kind === "preview" && !isRaster(magic)) fail("Превью — только PNG, JPG, WEBP или GIF");
	if (buf.length < 32) fail("Файл пустой");
	let width = null;
	let height = null;
	if (isRaster(magic)) {
		const size = decodedImageSize(bytes);
		if (!size) fail("Не удалось прочитать размер изображения");
		if (size.width > 4e3 || size.height > 4e3) fail(`Максимум ${MAX_DIM}×${MAX_DIM}`);
		width = size.width;
		height = size.height;
	} else if (magic === "image/vnd.adobe.photoshop") {
		const size = psdSize(bytes);
		if (!size) fail("Не удалось прочитать PSD");
		if (size.width > 4e3 || size.height > 4e3) fail(`PSD больше ${MAX_DIM}×${MAX_DIM}`);
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
var deleteMedia_createServerFn_handler = createServerRpc({
	id: "6be05f198e5243be78759153cd8238aa221512c9830515b4fde7861afb228ae5",
	name: "deleteMedia",
	filename: "src/lib/market/server.ts"
}, (opts) => deleteMedia.__executeServer(opts));
var deleteMedia = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный файл");
	return id;
}).handler(deleteMedia_createServerFn_handler, async ({ data: id, context }) => {
	const sql = await getSql();
	if (!(await sql`
      select m.id
      from media m
      join listings l on l.id = m.listing_id
      where m.id = ${id} and l.seller_id = ${context.userId} and l.status = 'active'
    `)[0]) fail("Нельзя удалить этот файл");
	await sql`delete from media where id = ${id}`;
	return { ok: true };
});
function parseCopy(input) {
	if (!input || typeof input !== "object") fail("Пустая форма");
	const o = input;
	if (typeof o.id !== "string" || !UUID_RE.test(o.id)) fail("Некорректный лот");
	const title = cleanText(typeof o.title === "string" ? o.title : "", 80);
	const blurb = cleanText(typeof o.blurb === "string" ? o.blurb : "", 400);
	if (title.length < 3) fail("Название — хотя бы 3 символа");
	const tags = Array.isArray(o.tags) ? o.tags.filter((t) => typeof t === "string").slice(0, 8) : [];
	return {
		id: o.id,
		title,
		blurb,
		tags
	};
}
var updateListingCopy_createServerFn_handler = createServerRpc({
	id: "ef8da5247bebe9205aa96377c2d97ebb3b1fa9804e9e4492bb3003d27eb5bcf8",
	name: "updateListingCopy",
	filename: "src/lib/market/server.ts"
}, (opts) => updateListingCopy.__executeServer(opts));
var updateListingCopy = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parseCopy).handler(updateListingCopy_createServerFn_handler, async ({ data, context }) => {
	const sql = await getSql();
	if (!(await sql`
      update listings
      set title = ${data.title},
          blurb = ${data.blurb},
          updated_at = now()
      where id = ${data.id} and seller_id = ${context.userId} and status = 'active'
      returning id
    `)[0]) fail("Лот уже нельзя править");
	await sql`delete from listing_tags where listing_id = ${data.id}`;
	await attachTags(sql, data.id, data.tags);
	return { ok: true };
});
var cancelListing_createServerFn_handler = createServerRpc({
	id: "44aa51378a0677e4bcf838d30d8f6444965c3233606ca34e0e50690a362b5a4a",
	name: "cancelListing",
	filename: "src/lib/market/server.ts"
}, (opts) => cancelListing.__executeServer(opts));
var cancelListing = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
	return id;
}).handler(cancelListing_createServerFn_handler, async ({ data: id, context }) => {
	if (!(await (await getSql())`
      update listings
      set status = 'removed', updated_at = now()
      where id = ${id} and seller_id = ${context.userId} and status = 'active' and bid_count = 0
      returning id
    `)[0]) fail("Нельзя снять лот, по которому уже есть ставки или он закрыт");
	return { ok: true };
});
var discardListing_createServerFn_handler = createServerRpc({
	id: "182b4dfad731c9f53e355f459c4f278b0ce5b965be8d02875aabe89eb0ffcb38",
	name: "discardListing",
	filename: "src/lib/market/server.ts"
}, (opts) => discardListing.__executeServer(opts));
var discardListing = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
	return id;
}).handler(discardListing_createServerFn_handler, async ({ data: id, context }) => {
	if (!(await (await getSql())`
      delete from listings
      where id = ${id} and seller_id = ${context.userId} and status = 'active' and bid_count = 0
      returning id
    `)[0]) fail("Лот уже нельзя отменить");
	return { ok: true };
});
var placeBid_createServerFn_handler = createServerRpc({
	id: "19da62019141bc7a152f347a6a97e17f14e14e87a431f3d495f91df9d63b7dfd",
	name: "placeBid",
	filename: "src/lib/market/server.ts"
}, (opts) => placeBid.__executeServer(opts));
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
}).handler(placeBid_createServerFn_handler, async ({ data, context }) => {
	const sql = await getSql();
	await settle(sql);
	const profile = await ensureProfile(sql, context.userId);
	assertLive(profile);
	const lot = (await sql`
      select ends_at, current_bidder_id, seller_id, title, buy_now, status, kind
      from listings where id = ${data.listingId}
    `)[0];
	if (!lot || lot.kind !== "auction" || lot.status !== "active") fail("Аукцион уже закрыт");
	if (lot.current_bidder_id === context.userId) fail("Вы уже лидер. Дождитесь другой ставки.");
	if (lot.buy_now != null && data.amount >= num(lot.buy_now)) fail("Для этой суммы нажмите «Купить сейчас»");
	const prevBidder = lot.current_bidder_id;
	const prevEnd = isoOrNull(lot.ends_at);
	const updated = await sql`
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
	const extended = prevEnd != null && new Date(endsAt).getTime() - new Date(prevEnd).getTime() > 1e3;
	const note = extended ? " Аукцион продлён." : "";
	if (lot.seller_id !== context.userId) await notify(sql, lot.seller_id, "bid", "Новая ставка", `${profile.handle} · ${data.amount} ₽ · «${lot.title}».${note}`, `/lot/${data.listingId}`);
	if (prevBidder && prevBidder !== context.userId) await notify(sql, prevBidder, "outbid", "Вашу ставку перебили", `«${lot.title}» теперь ${data.amount} ₽.${note}`, `/lot/${data.listingId}`);
	return {
		currentBid: num(updated[0].current_bid),
		endsAt,
		extended,
		bidCount: num(updated[0].bid_count)
	};
});
async function takeListing(sql, userId, listingId, mode) {
	await settle(sql);
	assertLive(await ensureProfile(sql, userId));
	const updated = mode === "fixed" ? await sql`
          update listings
          set status = 'sold', winner_id = ${userId}, updated_at = now()
          where id = ${listingId} and status = 'active' and kind = 'fixed' and seller_id <> ${userId}
          returning id, title, seller_id, winner_id, price as amount
        ` : await sql`
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
var buyFixed_createServerFn_handler = createServerRpc({
	id: "63b5b864df88484631b6b6674019351c41d639751a316b9944f011033c7948fc",
	name: "buyFixed",
	filename: "src/lib/market/server.ts"
}, (opts) => buyFixed.__executeServer(opts));
var buyFixed = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
	return id;
}).handler(buyFixed_createServerFn_handler, async ({ data, context }) => {
	return takeListing(await getSql(), context.userId, data, "fixed");
});
var buyNow_createServerFn_handler = createServerRpc({
	id: "46c6f899b470e984dc3ee7f7334df2a0b3c08b34491d7462682da7791e1ff265",
	name: "buyNow",
	filename: "src/lib/market/server.ts"
}, (opts) => buyNow.__executeServer(opts));
var buyNow = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
	return id;
}).handler(buyNow_createServerFn_handler, async ({ data, context }) => {
	return takeListing(await getSql(), context.userId, data, "buy-now");
});
var reportListing_createServerFn_handler = createServerRpc({
	id: "fed956745cb2dd8f463b40bc9b76dab9390b7c6279aa6e3741236077403006f0",
	name: "reportListing",
	filename: "src/lib/market/server.ts"
}, (opts) => reportListing.__executeServer(opts));
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
}).handler(reportListing_createServerFn_handler, async ({ data, context }) => {
	const sql = await getSql();
	assertLive(await ensureProfile(sql, context.userId));
	const lot = await sql`select seller_id from listings where id = ${data.listingId}`;
	if (!lot[0]) fail("Лот не найден");
	if (lot[0].seller_id === context.userId) fail("Это ваш лот");
	if ((await sql`
      select id from reports
      where reporter_id = ${context.userId} and listing_id = ${data.listingId} and status = 'open'
    `)[0]) fail("Жалоба уже отправлена");
	await sql`
      insert into reports (id, reporter_id, listing_id, reason)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.listingId}, ${data.reason})
    `;
	return { ok: true };
});
var getMe_createServerFn_handler = createServerRpc({
	id: "6f0c9f686465c4ad6ccc78667dba70797b135a97859fe8fa06b5fb7a3affad54",
	name: "getMe",
	filename: "src/lib/market/server.ts"
}, (opts) => getMe.__executeServer(opts));
var getMe = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(getMe_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	const profile = await ensureProfile(sql, context.userId);
	const unread = await sql`
      select count(*)::int as n from notifications where user_id = ${context.userId} and read_at is null
    `;
	const images = await sql`
      select kind from profile_images where user_id = ${context.userId}
    `;
	const kinds = new Set(images.map((r) => r.kind));
	return {
		...profile,
		unread: num(unread[0]?.n),
		hasAvatar: kinds.has("avatar"),
		hasBanner: kinds.has("banner"),
		hasBackground: kinds.has("background")
	};
});
function parseLinksInput(value) {
	if (value == null) return [];
	if (!Array.isArray(value)) fail("Ссылки указаны неверно");
	const out = [];
	for (const item of value.slice(0, 5)) {
		if (!item || typeof item !== "object") continue;
		const rec = item;
		const label = cleanText(typeof rec.label === "string" ? rec.label : "", 24);
		const url = cleanText(typeof rec.url === "string" ? rec.url : "", 200);
		if (!label && !url) continue;
		if (!label || !/^https?:\/\/\S+$/i.test(url)) fail("У каждой ссылки нужны подпись и адрес http(s)");
		out.push({
			label,
			url
		});
	}
	return out;
}
var updateProfile_createServerFn_handler = createServerRpc({
	id: "a5831a3909d9914f532f14668d505f75cdd9b9d265a4d5034350d62366abcf37",
	name: "updateProfile",
	filename: "src/lib/market/server.ts"
}, (opts) => updateProfile.__executeServer(opts));
var updateProfile = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	if (!input || typeof input !== "object") fail("Пустая форма");
	const o = input;
	const handle = cleanHandle(typeof o.handle === "string" ? o.handle : "");
	const displayName = cleanText(typeof o.displayName === "string" ? o.displayName : "", 40);
	const bio = cleanText(typeof o.bio === "string" ? o.bio : "", 400);
	const status = asStatus(o.status);
	if (o.status != null && ![
		"open",
		"busy",
		"closed",
		"away"
	].includes(String(o.status))) fail("Неизвестный статус");
	if (!handle) fail("Ник: 3–20 букв, цифр или _");
	if (displayName.length < 2) fail("Имя слишком короткое");
	return {
		handle,
		displayName,
		bio,
		status,
		links: parseLinksInput(o.links)
	};
}).handler(updateProfile_createServerFn_handler, async ({ data, context }) => {
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
var getPublicProfile_createServerFn_handler = createServerRpc({
	id: "af93279568551410cd06660a3f5aa6d72b6db81f51523afba7c29807a6c03378",
	name: "getPublicProfile",
	filename: "src/lib/market/server.ts"
}, (opts) => getPublicProfile.__executeServer(opts));
var getPublicProfile = createServerFn({ method: "GET" }).validator((handle) => {
	const h = typeof handle === "string" ? handle.trim().toLocaleLowerCase("ru") : "";
	if (!cleanHandle(h)) fail("Некорректный профиль");
	return h;
}).handler(getPublicProfile_createServerFn_handler, async ({ data: handle }) => {
	const sql = await getSql();
	await settle(sql);
	const rows = await sql`
      select user_id, display_name, bio, role, status, links, badges, created_at
      from profiles where handle = ${handle}
    `;
	if (!rows[0]) return null;
	const cards = (await sql.query(`select ${CARD_SQL}
       from listings l
       left join profiles p on p.user_id = l.seller_id
       where l.seller_id = $1 and l.status in ('active', 'sold', 'ended')
       order by l.pinned desc, l.created_at desc
       limit 60`, [rows[0].user_id])).map(mapCard);
	const images = await sql`
      select kind from profile_images where user_id = ${rows[0].user_id}
    `;
	const kinds = new Set(images.map((r) => r.kind));
	const comments = await sql`
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
		comments: comments.map((c) => ({
			id: c.id,
			body: c.body,
			createdAt: iso(c.created_at),
			authorHandle: c.author_handle,
			authorName: c.author_name
		}))
	};
});
function youAre(sellerId, uid) {
	return sellerId === uid ? "seller" : "buyer";
}
var listDeals_createServerFn_handler = createServerRpc({
	id: "ba141e203e074965d578de4b8c62735e3bfc7423a51daefffadf33450555158e",
	name: "listDeals",
	filename: "src/lib/market/server.ts"
}, (opts) => listDeals.__executeServer(opts));
var listDeals = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listDeals_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await settle(sql);
	await ensureProfile(sql, context.userId);
	return (await sql`
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
    `).map((r) => ({
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
		createdAt: iso(r.created_at)
	}));
});
async function loadDeal(sql, id, uid) {
	const d = (await sql`
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
  `)[0];
	if (!d) return null;
	if (d.seller_id !== uid && d.buyer_id !== uid) return null;
	const side = youAre(d.seller_id, uid);
	const released = d.status === "files_released" || d.status === "completed" || d.status === "confirmed";
	const showSecret = side === "seller" || released;
	const messages = await sql`
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
		seller: {
			id: d.seller_id,
			handle: d.seller_handle,
			name: d.seller_name
		},
		buyer: {
			id: d.buyer_id,
			handle: d.buyer_handle,
			name: d.buyer_name
		},
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
			system: m.sender_id === "system"
		}))
	};
}
var getDeal_createServerFn_handler = createServerRpc({
	id: "87cb89b952081dd8890bf80fc83f0c6f4b606459a63d45801e993a8cad3037ed",
	name: "getDeal",
	filename: "src/lib/market/server.ts"
}, (opts) => getDeal.__executeServer(opts));
var getDeal = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректная сделка");
	return id;
}).handler(getDeal_createServerFn_handler, async ({ data, context }) => {
	const sql = await getSql();
	await settle(sql);
	await ensureProfile(sql, context.userId);
	return loadDeal(sql, data, context.userId);
});
var getStaffDeal_createServerFn_handler = createServerRpc({
	id: "27ce83a3a55efad8781c21284926e7a95d438c45f156a8d37d59090fb1f548aa",
	name: "getStaffDeal",
	filename: "src/lib/market/server.ts"
}, (opts) => getStaffDeal.__executeServer(opts));
var getStaffDeal = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((input) => {
	const raw = typeof input === "number" ? input : typeof input === "string" ? Number(input.replace(/^#/, "")) : NaN;
	if (!Number.isInteger(raw) || raw < 1 || raw > 2e9) fail("Некорректный номер сделки");
	return raw;
}).handler(getStaffDeal_createServerFn_handler, async ({ data: publicNo, context }) => {
	const sql = await getSql();
	await requireStaff(sql, context.userId);
	const d = (await sql`
      select d.id, d.public_no, l.title, d.amount, d.status,
             sp.handle as seller_handle, sp.display_name as seller_name,
             bp.handle as buyer_handle, bp.display_name as buyer_name
      from deals d
      join listings l on l.id = d.listing_id
      join profiles sp on sp.user_id = d.seller_id
      join profiles bp on bp.user_id = d.buyer_id
      where d.public_no = ${publicNo}
    `)[0];
	if (!d) return null;
	const messages = await sql`
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
		seller: {
			handle: d.seller_handle,
			name: d.seller_name
		},
		buyer: {
			handle: d.buyer_handle,
			name: d.buyer_name
		},
		messages: messages.map((m) => ({
			id: m.id,
			senderId: m.sender_id,
			handle: m.sender_id === "system" ? null : m.handle,
			body: m.body,
			createdAt: iso(m.created_at),
			system: m.sender_id === "system"
		}))
	};
});
var sendMessage_createServerFn_handler = createServerRpc({
	id: "cd96842cb005bf8710540dfcd3084259dce0ac050c8f8d7b0eea2eb2832f1c08",
	name: "sendMessage",
	filename: "src/lib/market/server.ts"
}, (opts) => sendMessage.__executeServer(opts));
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
}).handler(sendMessage_createServerFn_handler, async ({ data, context }) => {
	const sql = await getSql();
	const profile = await ensureProfile(sql, context.userId);
	assertLive(profile);
	const d = (await sql`
      select d.seller_id, d.buyer_id, l.title
      from deals d join listings l on l.id = d.listing_id
      where d.id = ${data.dealId}
    `)[0];
	if (!d || d.seller_id !== context.userId && d.buyer_id !== context.userId) fail("Нет доступа");
	await sql`
      insert into messages (id, deal_id, sender_id, body)
      values (${crypto.randomUUID()}, ${data.dealId}, ${context.userId}, ${data.body})
    `;
	await notify(sql, d.seller_id === context.userId ? d.buyer_id : d.seller_id, "message", "Новое сообщение", `${profile.handle}: ${data.body.slice(0, 140)}`, `/deals/${data.dealId}`);
	return { ok: true };
});
var confirmPayment_createServerFn_handler = createServerRpc({
	id: "e1712075d685bc0d0caed9dc60b5ed178cf3013175ed83a7c5c084f3a149173f",
	name: "confirmPayment",
	filename: "src/lib/market/server.ts"
}, (opts) => confirmPayment.__executeServer(opts));
var confirmPayment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректная сделка");
	return id;
}).handler(confirmPayment_createServerFn_handler, async ({ data: id, context }) => {
	const sql = await getSql();
	const profile = await ensureProfile(sql, context.userId);
	assertLive(profile);
	const d = (await sql`
      select d.seller_id, d.buyer_id, d.status, d.seller_confirmed_at, d.buyer_confirmed_at, l.title
      from deals d join listings l on l.id = d.listing_id
      where d.id = ${id}
    `)[0];
	if (!d || d.seller_id !== context.userId && d.buyer_id !== context.userId) fail("Нет доступа");
	if (d.status === "completed") {
		const loaded = await loadDeal(sql, id, context.userId);
		if (!loaded) fail("Нет доступа");
		return loaded;
	}
	const side = d.seller_id === context.userId ? "seller" : "buyer";
	if (!(side === "seller" ? d.seller_confirmed_at : d.buyer_confirmed_at) && (d.status === "awaiting_payment" || d.status === "confirmed")) {
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
		const now = await sql`
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
			await notify(sql, other, "payment", "Контрагент подтвердил оплату", `«${d.title}». Нажмите «Оплата прошла», если перевод дошёл.`, `/deals/${id}`);
		}
	}
	const loaded = await loadDeal(sql, id, context.userId);
	if (!loaded) fail("Нет доступа");
	return loaded;
});
var completeDeal_createServerFn_handler = createServerRpc({
	id: "4d441f15d0c6b718357f0634fc282be5723c39597ff64a575cdeb65284956bc3",
	name: "completeDeal",
	filename: "src/lib/market/server.ts"
}, (opts) => completeDeal.__executeServer(opts));
var completeDeal = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректная сделка");
	return id;
}).handler(completeDeal_createServerFn_handler, async ({ data: id, context }) => {
	const sql = await getSql();
	await ensureProfile(sql, context.userId);
	const updated = await sql`
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
		await notify(sql, updated[0].seller_id === context.userId ? updated[0].buyer_id : updated[0].seller_id, "done", "Сделка завершена", "Вторая сторона закрыла сделку", `/deals/${id}`);
	}
	const loaded = await loadDeal(sql, id, context.userId);
	if (!loaded) fail("Нет доступа");
	return loaded;
});
var listNotifications_createServerFn_handler = createServerRpc({
	id: "8eb96d9b05ba7785aee90e337b52ecdbe52aa9e51513b5c9f8a396fe6d97c587",
	name: "listNotifications",
	filename: "src/lib/market/server.ts"
}, (opts) => listNotifications.__executeServer(opts));
var listNotifications = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listNotifications_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await ensureProfile(sql, context.userId);
	return (await sql`
      select id, kind, title, body, href, read_at, created_at
      from notifications
      where user_id = ${context.userId}
      order by created_at desc
      limit 60
    `).map((r) => ({
		id: r.id,
		kind: r.kind,
		title: r.title,
		body: r.body,
		href: r.href,
		read: r.read_at != null,
		createdAt: iso(r.created_at)
	}));
});
var markNotificationsRead_createServerFn_handler = createServerRpc({
	id: "b013d6dcf10d1862e53f81cbea06421661c4bda7df46d7fc3dbd182fe14c2dbf",
	name: "markNotificationsRead",
	filename: "src/lib/market/server.ts"
}, (opts) => markNotificationsRead.__executeServer(opts));
var markNotificationsRead = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(markNotificationsRead_createServerFn_handler, async ({ context }) => {
	await (await getSql())`
      update notifications set read_at = now()
      where user_id = ${context.userId} and read_at is null
    `;
	return { ok: true };
});
async function requireStaff(sql, userId) {
	const profile = await ensureProfile(sql, userId);
	if (!isStaff(profile.role)) fail("Только для модерации");
	return profile;
}
var addProfileComment_createServerFn_handler = createServerRpc({
	id: "3e2afcbefb863ae981b7b8b12c98a0b9edb94f93601231440dea35fbc4c1cf15",
	name: "addProfileComment",
	filename: "src/lib/market/server.ts"
}, (opts) => addProfileComment.__executeServer(opts));
var addProfileComment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	if (!input || typeof input !== "object") fail("Пустой комментарий");
	const o = input;
	const handle = cleanHandle(typeof o.handle === "string" ? o.handle : "");
	const body = cleanText(typeof o.body === "string" ? o.body : "", 500);
	if (!handle) fail("Некорректный профиль");
	if (body.length < 1) fail("Напишите комментарий");
	return {
		handle,
		body
	};
}).handler(addProfileComment_createServerFn_handler, async ({ data, context }) => {
	const sql = await getSql();
	const me = await ensureProfile(sql, context.userId);
	assertLive(me);
	const target = await sql`
      select user_id, handle from profiles where handle = ${data.handle}
    `;
	if (!target[0]) fail("Профиль не найден");
	if (target[0].user_id === context.userId) fail("Свой профиль комментировать нельзя");
	await sql`
      insert into profile_comments (id, profile_id, author_id, body)
      values (${crypto.randomUUID()}, ${target[0].user_id}, ${context.userId}, ${data.body})
    `;
	await notify(sql, target[0].user_id, "comment", "Новый комментарий", `@${me.handle}: ${data.body.slice(0, 140)}`, `/u/${target[0].handle}`);
	return { ok: true };
});
var deleteProfileComment_createServerFn_handler = createServerRpc({
	id: "4a91b5260d0122f5f9c36e8f071316af619ca6fff4b83e0033a40d399e952549",
	name: "deleteProfileComment",
	filename: "src/lib/market/server.ts"
}, (opts) => deleteProfileComment.__executeServer(opts));
var deleteProfileComment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный комментарий");
	return id;
}).handler(deleteProfileComment_createServerFn_handler, async ({ data: id, context }) => {
	const sql = await getSql();
	const me = await ensureProfile(sql, context.userId);
	const row = await sql`
      select author_id from profile_comments where id = ${id}
    `;
	if (!row[0]) fail("Комментарий уже удалён");
	if (row[0].author_id !== context.userId && !isStaff(me.role)) fail("Нельзя удалить этот комментарий");
	await sql`delete from profile_comments where id = ${id}`;
	return { ok: true };
});
var adminOverview_createServerFn_handler = createServerRpc({
	id: "3df17bac92a5825de719790181e0bc3a35edeee951e478ebd74ad372243e0440",
	name: "adminOverview",
	filename: "src/lib/market/server.ts"
}, (opts) => adminOverview.__executeServer(opts));
var adminOverview = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(adminOverview_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	const viewer = await requireStaff(sql, context.userId);
	const [listings, deals, openReports, users] = await Promise.all([
		sql`select count(*)::int as n from listings`,
		sql`select count(*)::int as n from deals`,
		sql`select count(*)::int as n from reports where status = 'open'`,
		sql`select count(*)::int as n from profiles`
	]);
	const reports = await sql`
      select r.id, r.reason, r.listing_id, l.title as listing_title, p.handle, r.created_at
      from reports r
      join profiles p on p.user_id = r.reporter_id
      left join listings l on l.id = r.listing_id
      where r.status = 'open'
      order by r.created_at desc
      limit 40
    `;
	const recentLots = await sql`
      select l.id, l.title, l.status, l.kind, p.handle
      from listings l
      left join profiles p on p.user_id = l.seller_id
      order by l.created_at desc
      limit 20
    `;
	const people = await sql`
      select user_id, handle, display_name, banned, role, badges
      from profiles
      order by created_at desc
      limit 80
    `;
	const recentDeals = await sql`
      select d.id, d.public_no, l.title, d.status, sp.handle as seller_handle, bp.handle as buyer_handle
      from deals d
      join listings l on l.id = d.listing_id
      join profiles sp on sp.user_id = d.seller_id
      join profiles bp on bp.user_id = d.buyer_id
      order by d.public_no desc
      limit 30
    `;
	const accounts = await sql`
      select "userId" as user_id, "providerId" as provider_id
      from account
      where "userId" in (select user_id from profiles order by created_at desc limit 80)
    `;
	const settings = await sql`
      select value from site_settings where key = 'require_invite'
    `;
	const inviteRows = viewer.role === "admin" ? await sql`
            select id, code, note, max_uses, uses, revoked, created_at
            from invite_codes
            order by created_at desc
            limit 40
          ` : [];
	return {
		viewerRole: viewer.role,
		counts: {
			listings: num(listings[0]?.n),
			deals: num(deals[0]?.n),
			openReports: num(openReports[0]?.n),
			users: num(users[0]?.n)
		},
		requireInvite: settings[0]?.value === "true",
		invites: inviteRows.map((row) => ({
			id: row.id,
			code: row.code,
			note: row.note,
			maxUses: num(row.max_uses),
			uses: num(row.uses),
			revoked: Boolean(row.revoked),
			createdAt: iso(row.created_at)
		})),
		reports: reports.map((r) => ({
			id: r.id,
			reason: r.reason,
			listingId: r.listing_id,
			listingTitle: r.listing_title,
			reporterHandle: r.handle,
			createdAt: iso(r.created_at)
		})),
		listings: recentLots,
		deals: recentDeals.map((d) => ({
			id: d.id,
			publicNo: num(d.public_no),
			title: d.title,
			status: d.status,
			sellerHandle: d.seller_handle,
			buyerHandle: d.buyer_handle
		})),
		users: people.map((p) => ({
			userId: p.user_id,
			handle: p.handle,
			displayName: p.display_name,
			banned: Boolean(p.banned),
			role: asRole(p.role),
			providers: accounts.filter((a) => a.user_id === p.user_id).map((a) => a.provider_id),
			badges: asBadges(p.badges)
		}))
	};
});
var adminModerate_createServerFn_handler = createServerRpc({
	id: "590fbe4f516b66724926c2bd8bfd9ac4efecf5a9d814134bd7063c7615b4a63e",
	name: "adminModerate",
	filename: "src/lib/market/server.ts"
}, (opts) => adminModerate.__executeServer(opts));
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
	if (o.action === "set-role" && typeof o.userId === "string" && (o.role === "user" || o.role === "moderator" || o.role === "admin")) return {
		action: "set-role",
		userId: o.userId,
		role: o.role
	};
	if (o.action === "set-badges" && typeof o.userId === "string" && Array.isArray(o.badges)) {
		const badges = asBadges(o.badges);
		if (badges.length !== o.badges.length) fail("Неизвестный значок");
		return {
			action: "set-badges",
			userId: o.userId,
			badges
		};
	}
	if (o.action === "set-require-invite" && typeof o.enabled === "boolean") return {
		action: "set-require-invite",
		enabled: o.enabled
	};
	if (o.action === "create-invite") {
		const maxUses = Number(o.maxUses);
		const note = typeof o.note === "string" ? o.note.replace(/\s+/g, " ").trim().slice(0, 80) : "";
		if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100) fail("Число использований — от 1 до 100");
		return {
			action: "create-invite",
			maxUses,
			note
		};
	}
	if (o.action === "revoke-invite" && typeof o.inviteId === "string" && UUID_RE.test(o.inviteId)) return {
		action: "revoke-invite",
		inviteId: o.inviteId
	};
	fail("Некорректное действие");
}).handler(adminModerate_createServerFn_handler, async ({ data, context }) => {
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
	} else if (data.action === "dismiss-report") await sql`update reports set status = 'dismissed' where id = ${data.reportId}`;
	else if (data.action === "action-report") {
		const report = await sql`
        select listing_id from reports where id = ${data.reportId}
      `;
		await sql`update reports set status = 'actioned' where id = ${data.reportId}`;
		if (report[0]?.listing_id) await sql`
          update listings set status = 'removed', updated_at = now()
          where id = ${report[0].listing_id} and status <> 'sold'
        `;
	} else if (data.action === "ban") {
		if (data.userId === context.userId) fail("Нельзя ограничить себя");
		const target = await sql`
        select role from profiles where user_id = ${data.userId}
      `;
		if (!target[0]) fail("Пользователь не найден");
		const targetRole = asRole(target[0].role);
		if (actor.role !== "admin" && targetRole !== "user") fail("Модератор может ограничивать только участников");
		await sql`update profiles set banned = ${data.banned} where user_id = ${data.userId}`;
	} else if (data.action === "set-role") {
		if (actor.role !== "admin") fail("Роли назначает только администратор");
		if (data.userId === context.userId) fail("Нельзя сменить свою роль");
		if ((await sql`
        update profiles
        set role = ${data.role}, is_admin = ${data.role === "admin"}
        where user_id = ${data.userId}
      `).length === 0) {
			if (!(await sql`
          select user_id from profiles where user_id = ${data.userId}
        `)[0]) fail("Пользователь не найден");
		}
	} else if (data.action === "set-badges") {
		if (actor.role !== "admin") fail("Значки выдаёт только администратор");
		if (!(await sql`
        update profiles set badges = ${`{${(data.badges ?? []).join(",")}}`}::text[] where user_id = ${data.userId} returning user_id
      `)[0]) fail("Пользователь не найден");
	} else if (data.action === "set-require-invite" || data.action === "create-invite" || data.action === "revoke-invite") {
		if (actor.role !== "admin") fail("Инвайты настраивает только администратор");
		if (data.action === "set-require-invite") await sql`
          insert into site_settings (key, value)
          values ('require_invite', ${data.enabled ? "true" : "false"})
          on conflict (key) do update set value = excluded.value
        `;
		else if (data.action === "create-invite") {
			const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
			let code = "";
			for (let attempt = 0; attempt < 5; attempt += 1) {
				const chars = [...crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(8))].map((b) => alphabet[b % 32]).join("");
				code = `GLYPH-${chars.slice(0, 4)}-${chars.slice(4)}`;
				try {
					await sql`
              insert into invite_codes (id, code, created_by, note, max_uses)
              values (${crypto.randomUUID()}, ${code}, ${context.userId}, ${data.note}, ${data.maxUses})
            `;
					return {
						ok: true,
						code
					};
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					if (!/duplicate|unique/i.test(msg) || attempt === 4) throw err;
				}
			}
		} else await sql`update invite_codes set revoked = true where id = ${data.inviteId}`;
	}
	return { ok: true };
});
var listRecommendations_createServerFn_handler = createServerRpc({
	id: "6cb7d3aa24d56395e24def35b8f174a54e71185044b1ea2607d7ddf04554471c",
	name: "listRecommendations",
	filename: "src/lib/market/server.ts"
}, (opts) => listRecommendations.__executeServer(opts));
var listRecommendations = createServerFn({ method: "GET" }).handler(listRecommendations_createServerFn_handler, async () => {
	const sql = await getSql();
	await settle(sql);
	return (await sql.query(`select ${CARD_SQL}
     from listings l
     left join profiles p on p.user_id = l.seller_id
     where l.status = 'active' and l.kind = 'auction'
     order by (
       -ln(greatest(random(), 0.0000001))
       / (1 + l.bid_count + (select count(*) from listing_likes lk where lk.listing_id = l.id))
     ) asc
     limit 8`)).map(mapCard);
});
var listMine_createServerFn_handler = createServerRpc({
	id: "5dd13b4e213984ed0f4898b7f7680f2c3f922dc7abdad4bfd93a588d70ec5a4d",
	name: "listMine",
	filename: "src/lib/market/server.ts"
}, (opts) => listMine.__executeServer(opts));
var listMine = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listMine_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await ensureProfile(sql, context.userId);
	const items = await sql.query(`select ${CARD_SQL}
       from listings l
       left join profiles p on p.user_id = l.seller_id
       where l.seller_id = $1 and l.status <> 'removed'
       order by (l.kind = 'auction') desc, l.pinned desc, l.created_at desc
       limit 80`, [context.userId]);
	return markLiked(sql, context.userId, items.map(mapCard));
});
var setPinned_createServerFn_handler = createServerRpc({
	id: "c597ac2176cc3d723d4f53a6b6239749bdd0f9bc93a2f0309ad2c6c2c6678524",
	name: "setPinned",
	filename: "src/lib/market/server.ts"
}, (opts) => setPinned.__executeServer(opts));
var setPinned = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	if (!input || typeof input !== "object") fail("Пусто");
	const o = input;
	if (typeof o.id !== "string" || !UUID_RE.test(o.id)) fail("Некорректный лот");
	if (typeof o.pinned !== "boolean") fail("Некорректный флаг");
	return {
		id: o.id,
		pinned: o.pinned
	};
}).handler(setPinned_createServerFn_handler, async ({ data, context }) => {
	const sql = await getSql();
	if (data.pinned) {
		if (num((await sql`
        select count(*)::int as n from listings
        where seller_id = ${context.userId} and pinned and id <> ${data.id} and status <> 'removed'
      `)[0]?.n) >= 6) fail("Можно закрепить не больше шести работ");
	}
	if (!(await sql`
      update listings set pinned = ${data.pinned}, updated_at = now()
      where id = ${data.id} and seller_id = ${context.userId} and status <> 'removed'
      returning id
    `)[0]) fail("Этот лот нельзя закрепить");
	return { ok: true };
});
var toggleLike_createServerFn_handler = createServerRpc({
	id: "4c6af4b2936811de664c2931b3bb241f81cc1f224eb6ee05e1ed6801d18916f0",
	name: "toggleLike",
	filename: "src/lib/market/server.ts"
}, (opts) => toggleLike.__executeServer(opts));
var toggleLike = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный лот");
	return id;
}).handler(toggleLike_createServerFn_handler, async ({ data: listingId, context }) => {
	const sql = await getSql();
	const profile = await ensureProfile(sql, context.userId);
	assertLive(profile);
	const lot = await sql`
      select seller_id, title from listings where id = ${listingId} and status <> 'removed'
    `;
	if (!lot[0]) fail("Лот не найден");
	if ((await sql`
      select listing_id from listing_likes where listing_id = ${listingId} and user_id = ${context.userId}
    `)[0]) {
		await sql`delete from listing_likes where listing_id = ${listingId} and user_id = ${context.userId}`;
		return { liked: false };
	}
	await sql`insert into listing_likes (listing_id, user_id) values (${listingId}, ${context.userId})`;
	if (lot[0].seller_id !== context.userId) await notify(sql, lot[0].seller_id, "like", "Новый лайк", `${profile.handle} отметил(а) «${lot[0].title}»`, `/lot/${listingId}`);
	return { liked: true };
});
var addListingComment_createServerFn_handler = createServerRpc({
	id: "3308e17acbc6b0713724673e74efd1032146505a6063740ca44937803821778f",
	name: "addListingComment",
	filename: "src/lib/market/server.ts"
}, (opts) => addListingComment.__executeServer(opts));
var addListingComment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	if (!input || typeof input !== "object") fail("Пустой комментарий");
	const o = input;
	if (typeof o.listingId !== "string" || !UUID_RE.test(o.listingId)) fail("Некорректный лот");
	const body = cleanText(typeof o.body === "string" ? o.body : "", 500);
	if (body.length < 1) fail("Напишите комментарий");
	return {
		listingId: o.listingId,
		body
	};
}).handler(addListingComment_createServerFn_handler, async ({ data, context }) => {
	const sql = await getSql();
	const profile = await ensureProfile(sql, context.userId);
	assertLive(profile);
	const lot = await sql`
      select seller_id, title, status from listings where id = ${data.listingId}
    `;
	if (!lot[0] || lot[0].status === "removed") fail("Лот не найден");
	await sql`
      insert into listing_comments (id, listing_id, author_id, body)
      values (${crypto.randomUUID()}, ${data.listingId}, ${context.userId}, ${data.body})
    `;
	if (lot[0].seller_id !== context.userId) await notify(sql, lot[0].seller_id, "comment", "Комментарий к лоту", `${profile.handle}: ${data.body.slice(0, 140)}`, `/lot/${data.listingId}`);
	return { ok: true };
});
var deleteListingComment_createServerFn_handler = createServerRpc({
	id: "8ded6402d743f777c2ab9eedaa9149e43d922deef67b7cf26d186d278e2891e1",
	name: "deleteListingComment",
	filename: "src/lib/market/server.ts"
}, (opts) => deleteListingComment.__executeServer(opts));
var deleteListingComment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный комментарий");
	return id;
}).handler(deleteListingComment_createServerFn_handler, async ({ data: id, context }) => {
	const sql = await getSql();
	const me = await ensureProfile(sql, context.userId);
	const row = await sql`select author_id from listing_comments where id = ${id}`;
	if (!row[0]) fail("Комментарий уже удалён");
	if (row[0].author_id !== context.userId && !isStaff(me.role)) fail("Нельзя удалить этот комментарий");
	await sql`delete from listing_comments where id = ${id}`;
	return { ok: true };
});
var IMAGE_MAX = {
	avatar: 5e5,
	banner: 12e5,
	background: 12e5
};
var uploadProfileImage_createServerFn_handler = createServerRpc({
	id: "ab22b38dd4d8fff1a30b516ea823a188db4c2fede36ac498cc9f2a81a6c59f4a",
	name: "uploadProfileImage",
	filename: "src/lib/market/server.ts"
}, (opts) => uploadProfileImage.__executeServer(opts));
var uploadProfileImage = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	if (!input || typeof input !== "object") fail("Пустой файл");
	const o = input;
	if (o.kind !== "avatar" && o.kind !== "banner" && o.kind !== "background") fail("Неизвестный кадр");
	if (typeof o.b64 !== "string") fail("Файл не прочитан");
	const b64 = o.b64.replace(/^data:[^,]*,/, "").replace(/\s/g, "");
	if (b64.length > 22e5) fail("Файл больше лимита");
	return {
		kind: o.kind,
		b64
	};
}).handler(uploadProfileImage_createServerFn_handler, async ({ data, context }) => {
	const sql = await getSql();
	await ensureProfile(sql, context.userId);
	const buf = Buffer.from(data.b64, "base64");
	if (buf.length > IMAGE_MAX[data.kind]) fail(data.kind === "avatar" ? "Аватар больше 500 КБ" : "Картинка больше 1.2 МБ");
	const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
	const magic = sniffMagic(bytes);
	if (!magic || !isRaster(magic)) fail("Нужны PNG, JPG, WEBP или GIF");
	const size = decodedImageSize(bytes);
	if (!size) fail("Не удалось прочитать изображение");
	const cap = data.kind === "avatar" ? 2e3 : MAX_DIM;
	if (size.width > cap || size.height > cap) fail(`Слишком большой кадр, максимум ${cap}px`);
	await sql`
      insert into profile_images (user_id, kind, mime, data_b64)
      values (${context.userId}, ${data.kind}, ${magic}, ${buf.toString("base64")})
      on conflict (user_id, kind) do update set mime = excluded.mime, data_b64 = excluded.data_b64
    `;
	return { ok: true };
});
var clearProfileImage_createServerFn_handler = createServerRpc({
	id: "d7cf33e6789853507fe940be3f51a5a8a5a18c2c5db9406381b881c1bf8f80fe",
	name: "clearProfileImage",
	filename: "src/lib/market/server.ts"
}, (opts) => clearProfileImage.__executeServer(opts));
var clearProfileImage = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((kind) => {
	if (kind !== "avatar" && kind !== "banner" && kind !== "background") fail("Неизвестный кадр");
	return kind;
}).handler(clearProfileImage_createServerFn_handler, async ({ data: kind, context }) => {
	await (await getSql())`delete from profile_images where user_id = ${context.userId} and kind = ${kind}`;
	return { ok: true };
});
var listThreads_createServerFn_handler = createServerRpc({
	id: "591dd9858617a99fe9f611ddc9c38eaa658b67cc5cfa71c0623e1a668e360a37",
	name: "listThreads",
	filename: "src/lib/market/server.ts"
}, (opts) => listThreads.__executeServer(opts));
var listThreads = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listThreads_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await ensureProfile(sql, context.userId);
	return (await sql`
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
    `).map((r) => ({
		id: r.id,
		otherHandle: r.other_handle,
		otherName: r.other_name,
		lastBody: r.last_body,
		updatedAt: iso(r.updated_at)
	}));
});
async function loadThread(sql, threadId, userId) {
	const thread = (await sql`
    select t.id, t.low_id, t.high_id,
      case when t.low_id = ${userId} then hi.handle else lo.handle end as other_handle,
      case when t.low_id = ${userId} then hi.display_name else lo.display_name end as other_name
    from dm_threads t
    join profiles lo on lo.user_id = t.low_id
    join profiles hi on hi.user_id = t.high_id
    where t.id = ${threadId} and (t.low_id = ${userId} or t.high_id = ${userId})
  `)[0];
	if (!thread) return null;
	const messages = await sql`
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
		updatedAt: last ? iso(last.created_at) : (/* @__PURE__ */ new Date()).toISOString(),
		messages: messages.map((m) => ({
			id: m.id,
			handle: m.handle,
			body: m.body,
			createdAt: iso(m.created_at),
			mine: m.sender_id === userId
		}))
	};
}
var openThread_createServerFn_handler = createServerRpc({
	id: "b024eac2a894659f9a6b8f4a406e3147dd451fd2b5432a5e14e8f663a17cb684",
	name: "openThread",
	filename: "src/lib/market/server.ts"
}, (opts) => openThread.__executeServer(opts));
var openThread = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((handle) => {
	const h = typeof handle === "string" ? handle.trim().toLocaleLowerCase("ru") : "";
	if (!cleanHandle(h)) fail("Некорректный профиль");
	return h;
}).handler(openThread_createServerFn_handler, async ({ data: handle, context }) => {
	const sql = await getSql();
	assertLive(await ensureProfile(sql, context.userId));
	const other = await sql`select user_id from profiles where handle = ${handle}`;
	if (!other[0]) fail("Такого профиля нет");
	if (other[0].user_id === context.userId) fail("Себе написать нельзя");
	const [low, high] = context.userId < other[0].user_id ? [context.userId, other[0].user_id] : [other[0].user_id, context.userId];
	const existing = await sql`
      select id from dm_threads where low_id = ${low} and high_id = ${high}
    `;
	const id = existing[0]?.id ?? crypto.randomUUID();
	if (!existing[0]) await sql`
        insert into dm_threads (id, low_id, high_id) values (${id}, ${low}, ${high})
      `;
	const loaded = await loadThread(sql, id, context.userId);
	if (!loaded) fail("Чат не открылся");
	return loaded;
});
var getThread_createServerFn_handler = createServerRpc({
	id: "a5da4b4a3da29f12d91f8564681332daa72ad187fd2571b6b0ca344e19c68df0",
	name: "getThread",
	filename: "src/lib/market/server.ts"
}, (opts) => getThread.__executeServer(opts));
var getThread = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((id) => {
	if (typeof id !== "string" || !UUID_RE.test(id)) fail("Некорректный чат");
	return id;
}).handler(getThread_createServerFn_handler, async ({ data: id, context }) => {
	const sql = await getSql();
	await ensureProfile(sql, context.userId);
	return loadThread(sql, id, context.userId);
});
var sendDirect_createServerFn_handler = createServerRpc({
	id: "426f068d01555795b1f86860bffec2cc4a8b6fbd0dea3d7e8d197009c66269d1",
	name: "sendDirect",
	filename: "src/lib/market/server.ts"
}, (opts) => sendDirect.__executeServer(opts));
var sendDirect = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	if (!input || typeof input !== "object") fail("Пустое сообщение");
	const o = input;
	if (typeof o.threadId !== "string" || !UUID_RE.test(o.threadId)) fail("Некорректный чат");
	const body = cleanText(typeof o.body === "string" ? o.body : "", 2e3);
	if (body.length < 1) fail("Напишите сообщение");
	return {
		threadId: o.threadId,
		body
	};
}).handler(sendDirect_createServerFn_handler, async ({ data, context }) => {
	const sql = await getSql();
	const me = await ensureProfile(sql, context.userId);
	assertLive(me);
	const thread = await sql`
      select low_id, high_id from dm_threads
      where id = ${data.threadId} and (low_id = ${context.userId} or high_id = ${context.userId})
    `;
	if (!thread[0]) fail("Нет доступа к чату");
	await sql`
      insert into dm_messages (id, thread_id, sender_id, body)
      values (${crypto.randomUUID()}, ${data.threadId}, ${context.userId}, ${data.body})
    `;
	await notify(sql, thread[0].low_id === context.userId ? thread[0].high_id : thread[0].low_id, "dm", "Новое сообщение", `${me.handle}: ${data.body.slice(0, 140)}`, "/chats");
	return { ok: true };
});
//#endregion
export { addListingComment_createServerFn_handler, addProfileComment_createServerFn_handler, adminModerate_createServerFn_handler, adminOverview_createServerFn_handler, buyFixed_createServerFn_handler, buyNow_createServerFn_handler, cancelListing_createServerFn_handler, clearProfileImage_createServerFn_handler, completeDeal_createServerFn_handler, confirmPayment_createServerFn_handler, createListing_createServerFn_handler, deleteListingComment_createServerFn_handler, deleteMedia_createServerFn_handler, deleteProfileComment_createServerFn_handler, discardListing_createServerFn_handler, getDeal_createServerFn_handler, getListing_createServerFn_handler, getMe_createServerFn_handler, getPublicProfile_createServerFn_handler, getStaffDeal_createServerFn_handler, getThread_createServerFn_handler, listDeals_createServerFn_handler, listListings_createServerFn_handler, listMine_createServerFn_handler, listNotifications_createServerFn_handler, listPopularTags_createServerFn_handler, listRecommendations_createServerFn_handler, listThreads_createServerFn_handler, markNotificationsRead_createServerFn_handler, openThread_createServerFn_handler, placeBid_createServerFn_handler, reportListing_createServerFn_handler, sendDirect_createServerFn_handler, sendMessage_createServerFn_handler, setPinned_createServerFn_handler, suggestTags_createServerFn_handler, toggleLike_createServerFn_handler, updateListingCopy_createServerFn_handler, updateProfile_createServerFn_handler, uploadMedia_createServerFn_handler, uploadProfileImage_createServerFn_handler };
