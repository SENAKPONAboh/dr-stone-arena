import { NextResponse } from "next/server";
import { siteUrl } from '@/lib/site-origin';

export async function POST(request: Request) {
  const url = siteUrl(request, '/login');
  
  // On crée la réponse
  const response = NextResponse.json({ success: true, redirectUrl: url.toString() });
  
  // On supprime le cookie sur CETTE réponse
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0), // Date dans le passé = supprime le cookie
    path: "/",
  });
  
  return response;
}

export async function GET(request: Request) {
  const url = siteUrl(request, '/login');
  const response = NextResponse.redirect(url);
  
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
  
  return response;
}