import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text", placeholder: "admin@enose.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                // En una aplicación real esto debe verificar contra la BD
                if (credentials?.username === "admin@enose.com" && credentials?.password === "admin") {
                    return { id: "1", name: "Admin E-NOSE", email: "admin@enose.com" };
                }
                return null; // Return null if user data could not be retrieved
            }
        })
    ],
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: '/login',
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
