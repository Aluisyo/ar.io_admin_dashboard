import NextAuth from "next-auth" // Standard import for NextAuth
import CredentialsProvider from "next-auth/providers/credentials"
import type { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Debugging logs to trace authorization flow
        console.log("Attempting to authorize:", credentials?.username);
        if (!credentials?.username || !credentials?.password) {
          console.log("Missing credentials");
          return null
        }

        // Get credentials from environment variables
        const adminUsername = process.env.ADMIN_USERNAME || "admin"
        const adminPassword = process.env.ADMIN_PASSWORD || "admin"

        if (credentials.username === adminUsername && credentials.password === adminPassword) {
          console.log("Authorization successful for:", credentials.username);
          return {
            id: "1",
            name: "Admin",
            email: "admin@ar.io"
          }
        }
        
        console.log("Invalid credentials for:", credentials.username);
        return null
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  callbacks: {
    async redirect({ url, baseUrl }) {
      // If url starts with /, it's a relative URL - use baseUrl
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      }
      
      // If url is absolute and on same origin as baseUrl, allow it
      try {
        const urlOrigin = new URL(url).origin
        const baseOrigin = new URL(baseUrl).origin
        if (urlOrigin === baseOrigin) {
          return url
        }
      } catch {
        // Invalid URL, fallback to baseUrl
      }
      
      // Default fallback - return baseUrl
      return baseUrl
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    }
  }
}

// The NextAuth function is called with the authOptions
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
