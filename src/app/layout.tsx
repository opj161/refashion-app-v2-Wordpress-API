import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { getCurrentUser } from '@/actions/authActions';
import type { SessionUser } from '@/lib/types';
import { cookies } from 'next/headers';
import { SiteHeader } from '@/components/SiteHeader'; // Import the new header

// Force dynamic rendering to ensure authentication state is determined at request time
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Refashion AI',
  description: 'Edit images with the power of AI, powered by Google Gemini.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Force dynamic rendering by accessing cookies
  // This ensures the layout is never statically generated at build time
  await cookies();
  
  // Fetch the initial user state on the server at request time
  const initialUser: SessionUser | null = await getCurrentUser();
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#020410" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function setTheme() {
                  try {
                    var theme = localStorage.getItem('theme');
                    var systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    var shouldBeDark = theme === 'dark' || (theme === 'system' && systemPrefersDark) || (!theme && true);
                    var root = document.documentElement;
                    root.classList.remove('light', 'dark');
                    root.classList.add(shouldBeDark ? 'dark' : 'light');
                  } catch (e) {
                    console.error("Error setting initial theme:", e);
                    document.documentElement.classList.add('dark'); // Default fallback
                  }
                }
                setTheme();
              })();
            `,
          }}
        />
      </head>
      <body
        className="antialiased bg-gradient-to-br from-background-accent to-background text-foreground flex flex-col min-h-screen"
        style={{
          '--font-geist-sans': 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
          '--font-geist-mono': 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        } as React.CSSProperties}
      >
        <div className="aurora-bg"></div>
        <AuthProvider initialUser={initialUser}>
          <ThemeProvider>
            <SiteHeader /> {/* Use the new header component here */}
            <main className="flex-1 flex flex-col">
              {children}
            </main>
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
