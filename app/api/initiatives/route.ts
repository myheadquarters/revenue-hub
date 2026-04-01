import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'app/data/initiatives.json');

export async function GET() {
  try {
    const data = JSON.parse(readFileSync(FILE, 'utf-8'));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ grants: [], sponsors: [], partnerships: [], speaking: [], memberships: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    writeFileSync(FILE, JSON.stringify(body, null, 2));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
