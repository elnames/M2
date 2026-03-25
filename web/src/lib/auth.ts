import NextAuth from 'next-auth'
import Resend from 'next-auth/providers/resend'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { render } from '@react-email/render'
import { MagicLinkEmail } from '@/emails/MagicLinkEmail'

const prisma = new PrismaClient()

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user || !user.password) return null
        const valid = await bcrypt.compare(credentials.password as string, user.password)
        if (!valid) return null
        return user
      },
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY!,
      from: process.env.RESEND_FROM ?? 'alertas@nmsdev.tech',
      async sendVerificationRequest({ identifier: email, url, provider }) {
        const { Resend: ResendSDK } = await import('resend')
        const resend = new ResendSDK(provider.apiKey)
        const safeUrl = url ?? ''
        const host = new URL(safeUrl).host

        const html = await render(MagicLinkEmail({ url: safeUrl, host }))

        await resend.emails.send({
          from: provider.from ?? process.env.RESEND_FROM ?? "alertas@nmsdev.tech",
          to: email,
          subject: '🔐 Tu enlace de acceso a m²',
          html,
        })
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id as string } })
        token.id = user.id
        token.role = dbUser?.role ?? 'USER'
        token.plan = dbUser?.plan ?? 'EXPLORADOR'
        token.selectedCommunes = dbUser?.selectedCommunes ?? []
        token.onboardingDone = dbUser?.onboardingDone ?? false
      }
      if (trigger === 'update' && session) {
        if (session.onboardingDone !== undefined) token.onboardingDone = session.onboardingDone
        if (session.selectedCommunes) token.selectedCommunes = session.selectedCommunes
      }
      return token
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).plan = token.plan
        ;(session.user as any).selectedCommunes = token.selectedCommunes
        ;(session.user as any).onboardingDone = token.onboardingDone
      }
      return session
    },
  },
  trustHost: true,
})
