import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'app/data/grants-db.json');

export async function GET() {
  try {
    const data = JSON.parse(readFileSync(FILE, 'utf-8'));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({});
  }
}
