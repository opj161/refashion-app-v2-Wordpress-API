"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Ensure this is from 'next/navigation'
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';
import { loginUser } from '@/actions/authActions'; // Your server action

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    
    try {
      const result = await loginUser(formData); // Server action

      // If loginUser returns a value, it means it didn't redirect and there was an error.
      if (result?.error) {
        setError(result.error);
      }
      // If loginUser successfully redirects, it throws a NEXT_REDIRECT error,
      // which will be caught by the catch block. Nothing else to do in the 'try' success path.

    } catch (e: unknown) {
      // Check if it's the special redirect error that Next.js throws
      const errorWithDigest = e as { digest?: string };
      if (errorWithDigest.digest?.includes('NEXT_REDIRECT')) {
        // This is an expected error when redirect() is called.
        // Next.js handles the actual navigation, so we don't need to do anything
        console.log('Login successful, redirecting...');
        return; // Exit early, don't set loading to false
      } else if (e instanceof Error) {
        // It's a different, actual error
        console.error("Login error:", e.message);
        setError(e.message);
      } else {
        console.error("Login handleSubmit caught unexpected error:", e);
        setError('An unexpected error occurred during login.');
      }
    } finally {
      // This will run regardless of success or if a redirect is in progress.
      // If the component unmounts due to redirect, setting state here is a no-op or very brief.
      setLoading(false);
    }
  };
  // ... rest of your component
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-var(--header-height,80px))] p-4 bg-gradient-to-br from-background-accent to-background">
      <Card variant="glass" className="w-full max-w-md shadow-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
              <LogIn className="h-8 w-8 text-primary" />
              Login
            </CardTitle>
            <CardDescription>Enter your credentials to access the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" type="text" placeholder="admin" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}