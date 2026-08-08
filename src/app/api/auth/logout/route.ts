import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // On récupère l'URL de base de la requête (que ce soit localhost ou Vercel)
  const url = new URL('/login', request.url);
  
  const response = NextResponse.json({ success: true });
  response.cookies.delete("session");
  
  // On renvoie l'URL au frontend
  return NextResponse.json({ redirectUrl: url.toString() });
}

export async function GET(request: Request) {
  const url = new URL('/login', request.url);
  const response = NextResponse.redirect(url);
  response.cookies.delete("session");
  return response;
}