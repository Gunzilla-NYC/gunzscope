import { NextRequest, NextResponse } from 'next/server';
import {
  listReleases, createRelease, updateRelease, deleteRelease,
  listItems, createItem, bulkCreateItems, deleteItem,
  listMatchRules, createMatchRule, deleteMatchRule,
} from '@/lib/services/itemOriginService';
import { invalidateItemOriginsCache } from '@/app/api/item-origins/route';

/**
 * Admin CRUD for item origins (releases, items, match rules).
 *
 * Auth: Bearer {ADMIN_SECRET}
 *
 * GET    ?entity=releases|items|rules[&releaseSlug=...]
 * POST   { entity, ...data }
 * PATCH  { entity: 'release', slug, ...fields }
 * DELETE { entity, ...identifier }
 */

function verifyAdmin(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  if (!auth) return false;
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  return token === secret;
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// ─── GET ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorized();

  const { searchParams } = new URL(request.url);
  const entity = searchParams.get('entity') ?? 'releases';
  const releaseSlug = searchParams.get('releaseSlug') ?? undefined;

  switch (entity) {
    case 'releases': {
      const releases = await listReleases();
      return NextResponse.json({ releases });
    }
    case 'items': {
      const items = await listItems(releaseSlug);
      return NextResponse.json({ items });
    }
    case 'rules': {
      const rules = await listMatchRules(releaseSlug);
      return NextResponse.json({ rules });
    }
    default:
      return NextResponse.json({ error: 'Invalid entity. Use: releases, items, rules' }, { status: 400 });
  }
}

// ─── POST ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorized();

  const body = await request.json();
  const { entity, ...data } = body;

  switch (entity) {
    case 'release': {
      const { slug, name, shortName, category, date, description } = data;
      if (!slug || !name || !shortName || !category) {
        return NextResponse.json({ error: 'Missing required fields: slug, name, shortName, category' }, { status: 400 });
      }
      const release = await createRelease({ slug, name, shortName, category, date, description });
      if (!release) {
        return NextResponse.json({ error: 'Release with this slug already exists' }, { status: 409 });
      }
      invalidateItemOriginsCache();
      return NextResponse.json({ release }, { status: 201 });
    }

    case 'item': {
      const { itemName, quality, releaseSlug } = data;
      if (!itemName || !releaseSlug) {
        return NextResponse.json({ error: 'Missing required fields: itemName, releaseSlug' }, { status: 400 });
      }
      const item = await createItem({ itemName, quality, releaseSlug });
      if (!item) {
        return NextResponse.json({ error: 'Item mapping already exists for this name+quality' }, { status: 409 });
      }
      invalidateItemOriginsCache();
      return NextResponse.json({ item }, { status: 201 });
    }

    case 'items': {
      const { items } = data;
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'items must be a non-empty array of { itemName, releaseSlug, quality? }' }, { status: 400 });
      }
      const result = await bulkCreateItems(items);
      invalidateItemOriginsCache();
      return NextResponse.json(result, { status: 201 });
    }

    case 'rule': {
      const { type, pattern, releaseSlug, priority } = data;
      if (!type || !pattern || !releaseSlug) {
        return NextResponse.json({ error: 'Missing required fields: type, pattern, releaseSlug' }, { status: 400 });
      }
      if (type !== 'prefix' && type !== 'contains') {
        return NextResponse.json({ error: 'type must be "prefix" or "contains"' }, { status: 400 });
      }
      const rule = await createMatchRule({ type, pattern, releaseSlug, priority });
      if (!rule) {
        return NextResponse.json({ error: 'Match rule already exists for this type+pattern' }, { status: 409 });
      }
      invalidateItemOriginsCache();
      return NextResponse.json({ rule }, { status: 201 });
    }

    default:
      return NextResponse.json({ error: 'Invalid entity. Use: release, item, items, rule' }, { status: 400 });
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorized();

  const body = await request.json();
  const { entity, slug, ...fields } = body;

  if (entity !== 'release' || !slug) {
    return NextResponse.json({ error: 'PATCH only supports entity: "release" with a slug' }, { status: 400 });
  }

  const release = await updateRelease(slug, fields);
  if (!release) {
    return NextResponse.json({ error: 'Release not found' }, { status: 404 });
  }
  invalidateItemOriginsCache();
  return NextResponse.json({ release });
}

// ─── DELETE ─────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorized();

  const body = await request.json();
  const { entity, ...identifier } = body;

  switch (entity) {
    case 'release': {
      const { slug } = identifier;
      if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
      const ok = await deleteRelease(slug);
      if (!ok) return NextResponse.json({ error: 'Release not found' }, { status: 404 });
      invalidateItemOriginsCache();
      return NextResponse.json({ deleted: true });
    }

    case 'item': {
      const { itemName, quality } = identifier;
      if (!itemName) return NextResponse.json({ error: 'Missing itemName' }, { status: 400 });
      const ok = await deleteItem(itemName, quality);
      if (!ok) return NextResponse.json({ error: 'Item mapping not found' }, { status: 404 });
      invalidateItemOriginsCache();
      return NextResponse.json({ deleted: true });
    }

    case 'rule': {
      const { type, pattern } = identifier;
      if (!type || !pattern) return NextResponse.json({ error: 'Missing type and pattern' }, { status: 400 });
      const ok = await deleteMatchRule(type, pattern);
      if (!ok) return NextResponse.json({ error: 'Match rule not found' }, { status: 404 });
      invalidateItemOriginsCache();
      return NextResponse.json({ deleted: true });
    }

    default:
      return NextResponse.json({ error: 'Invalid entity. Use: release, item, rule' }, { status: 400 });
  }
}
