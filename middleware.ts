import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const protectedPrefixes = ['/dashboard', '/browse', '/collection', '/wishlist', '/analytics', '/settings']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))

  if (isProtected && !req.auth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
