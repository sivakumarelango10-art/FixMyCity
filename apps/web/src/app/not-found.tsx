import Link from 'next/link';
import { MapPinLine } from '@phosphor-icons/react/dist/ssr';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container-page flex h-16 items-center">
        <Logo />
      </header>
      <main id="main" className="grid flex-1 place-items-center px-4 pb-16">
        <div className="grid max-w-md justify-items-center gap-5 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-panel border border-line bg-surface-2 text-fg-subtle" aria-hidden>
            <MapPinLine size={26} />
          </span>
          <div className="grid gap-2">
            <p className="font-mono text-sm text-fg-subtle">404</p>
            <h1 className="type-page text-fg">This page does not exist</h1>
            <p className="text-fg-muted">The link may be out of date, or this record is not available to your account.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/">Return home</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
