import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  response.cookies.delete("session");
  return response;
}

// On autorise aussi la méthode GET pour que le lien <a href> fonctionne
export async function GET() {
  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  response.cookies.delete("session");
  return response;
}