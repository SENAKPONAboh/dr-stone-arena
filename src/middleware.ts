import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';

const publicRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Vérifier si la route est publique
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route));

  // Récupérer le cookie de session
  const sessionCookie = request.cookies.get('session')?.value;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;

  // Rediriger vers login si non connecté sur une route protégée
  if (!isPublicRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Rediriger vers le bon dashboard si déjà connecté et sur une route publique
  if (isPublicRoute && session) {
    if (session.role === 'ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
    if (session.role === 'CORRECTEUR') return NextResponse.redirect(new URL('/correcteur', request.url));
    return NextResponse.redirect(new URL('/etudiant', request.url));
  }

  // Protection des routes par rôle
  if (pathname.startsWith('/admin') && session?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/etudiant', request.url));
  }
  if (pathname.startsWith('/correcteur') && session?.role !== 'CORRECTEUR' && session?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/etudiant', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};