import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { google } from "googleapis";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { Account } from "next-auth";

interface ExtendedToken extends JWT {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
}

interface ExtendedSession extends Session {
  accessToken?: string;
  error?: string;
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }: { token: ExtendedToken; account: Account | null }) {
      if (account) {
        token.accessToken = (account.access_token as string) || undefined;
        token.refreshToken = (account.refresh_token as string) || undefined;
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : undefined;
      }

      // If token has expired, try to refresh it
      if (token.expiresAt && Date.now() > token.expiresAt) {
        try {
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
          );

          oauth2Client.setCredentials({
            refresh_token: token.refreshToken,
          });

          const { credentials } = await oauth2Client.refreshAccessToken();
          
          token.accessToken = credentials.access_token;
          token.expiresAt = Date.now() + (credentials.expiry_date || 3600 * 1000);
        } catch (error) {
          console.error("Error refreshing access token", error);
          return token;
        }
      }

      return token;
    },
    async session({ session, token }: { session: ExtendedSession; token: ExtendedToken }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 