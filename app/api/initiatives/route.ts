import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'app/data/initiatives.json');
const DEFAULT = { grants: [], sponsors: [], partnerships: [], speaking: [], memberships: [] };

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvGet() {
  try {
    const res = await fetch(`${KV_URL}/get/initiatives`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: 'no-store',
    });
    const { result } = await res.json();
    return result ? JSON.parse(result) : null;
  } catch { return null; }
}

async function kvSet(value: unknown) {
  const res = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', 'initiatives', JSON.stringify(value)]]),
  });
  return res.ok;
}

export async function GET() {
  try {
    if (KV_URL && KV_TOKEN) {
      const kv = await kvGet();
      if (kv) return NextResponse.json(kv);
    }
    // Fall back to bundled JSON (used on first run or local dev)
    const data = JSON.parse(readFileSync(FILE, 'utf-8'));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(DEFAULT);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (KV_URL && KV_TOKEN) {
      await kvSet(body);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: 'KV not configured' }, { status: 500 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
