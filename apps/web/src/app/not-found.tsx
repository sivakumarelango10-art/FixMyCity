import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6">
      <div className="grid max-w-md justify-items-center gap-5 text-center">
        <Logo />
        <p className="font-mono text-sm text-fg-subtle">404</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-fg">This page does not exist</h1>
        <p className="text-fg-muted">The link may be outdated, or you may not have access to this record.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/">Go to home</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
