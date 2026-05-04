import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)
}

export async function decrypt(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })
    return payload
  } catch (error) {
    return null
  }
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  return await decrypt(token)
}

export async function setSession(userId: string, email: string, name: string, role: string, modules: string[]) {
  const session = await encrypt({ userId, email, name, role, modules })
  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24,
    path: '/',
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}
