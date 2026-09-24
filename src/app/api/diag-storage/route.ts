import { NextResponse } from 'next/server';

// ROUTE TEMPORAIRE DE DIAGNOSTIC — à supprimer après résolution
export async function GET() {
  return NextResponse.json({
    environnement: process.env.NODE_ENV,
    SUPABASE_URL: process.env.SUPABASE_URL || '❌ ABSENTE',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? `✅ définie (longueur ${process.env.SUPABASE_SERVICE_ROLE_KEY.length})`
      : '❌ ABSENTE',
  });
}