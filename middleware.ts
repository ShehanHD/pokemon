import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

const protectedPrefixes = ['/dashboard', '/collection', '/wishlist', '/analytics', '/settings']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))

  if (isProtected && !req.auth) {
    const loginUrl = new URL('/browse', req.url)
    loginUrl.searchParams.set('login', '1')
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
