import { compare } from 'bcrypt-ts';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import { getUser, createGuestUser } from '@/lib/db/queries';
import { DUMMY_PASSWORD } from '@/lib/constants';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: any) {
        const users = await getUser(credentials.email);

        if (users.length === 0) {
          await compare(credentials.password, DUMMY_PASSWORD);
          return null;
        }

        const [user] = users;

        if (!user.password) {
          await compare(credentials.password, DUMMY_PASSWORD);
          return null;
        }

        const passwordsMatch = await compare(credentials.password, user.password);
        if (!passwordsMatch) return null;

        return { ...user, type: 'regular' };
      },
    }),

    CredentialsProvider({
      id: 'guest',
      name: 'Guest',
      credentials: {},
      async authorize() {
        const [guestUser] = await createGuestUser();
        return { ...guestUser, type: 'guest' };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.type = user.type;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.type = token.type as 'guest' | 'regular';
      }
      return session;
    },
  },
};
