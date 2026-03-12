import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuth = !!req.auth

  const publicPaths = ['/login', '/register', '/api/auth']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  if (!isAuth && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isAuth && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-.*\\.png).*)'],
}
