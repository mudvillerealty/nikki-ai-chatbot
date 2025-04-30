import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {},
} satisfies NextAuthConfig;
callbacks: {
  async session({ session, token }) {
    if (token && session.user) {
      session.user.id = token.id;
      session.user.type = token.type || 'guest';
    }
    return session;
  },
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.type = user.type || 'guest';
    }
    return token;
  }
},
process.env.NEXTAUTH_SECRET if not already set in auth.ts.
