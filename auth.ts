import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        error?: "RefreshTokenError";
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: number;
        error?: "RefreshTokenError";
    }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            authorization: {
                params: {
                    // Request offline access to get refresh token
                    access_type: "offline",
                    // Force consent screen to always get refresh token
                    prompt: "consent",
                    // Request YouTube scopes
                    scope: [
                        "openid",
                        "email",
                        "profile",
                        "https://www.googleapis.com/auth/youtube",
                        "https://www.googleapis.com/auth/youtube.readonly",
                    ].join(" "),
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            // Initial sign in - save tokens
            if (account) {
                return {
                    ...token,
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    expiresAt: account.expires_at,
                };
            }

            // Token is still valid
            if (token.expiresAt && Date.now() < Number(token.expiresAt) * 1000) {
                return token;
            }

            // Token expired, try to refresh
            if (!token.refreshToken) {
                console.error("[Auth] No refresh token available");
                return { ...token, error: "RefreshTokenError" };
            }

            try {
                console.log("[Auth] Refreshing access token...");
                const response = await fetch("https://oauth2.googleapis.com/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        client_id: process.env.AUTH_GOOGLE_ID!,
                        client_secret: process.env.AUTH_GOOGLE_SECRET!,
                        grant_type: "refresh_token",
                        refresh_token: token.refreshToken as string,
                    }),
                });

                const tokensOrError = await response.json();

                if (!response.ok) {
                    console.error("[Auth] Failed to refresh token:", tokensOrError);
                    throw tokensOrError;
                }

                const newTokens = tokensOrError as {
                    access_token: string;
                    expires_in: number;
                    refresh_token?: string;
                };

                console.log("[Auth] ✅ Token refreshed successfully");
                return {
                    ...token,
                    accessToken: newTokens.access_token,
                    expiresAt: Math.floor(Date.now() / 1000 + newTokens.expires_in),
                    // Preserve refresh token if new one not provided
                    refreshToken: newTokens.refresh_token ?? token.refreshToken,
                    error: undefined,
                };
            } catch (error) {
                console.error("[Auth] Error refreshing access token:", error);
                return {
                    ...token,
                    error: "RefreshTokenError",
                };
            }
        },
        async session({ session, token }) {
            // Pass access token to the session for use in the client
            session.accessToken = token.accessToken as string | undefined;
            session.error = token.error as "RefreshTokenError" | undefined;
            return session;
        },
    },
});

