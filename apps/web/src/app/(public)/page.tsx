import { Benefits } from '@/components/landing/benefits';
import { ClassifierDemo } from '@/components/landing/classifier-demo';
import { DashboardPreview } from '@/components/landing/dashboard-preview';
import { ClosingCta, Faq } from '@/components/landing/faq-closing';
import { Hero } from '@/components/landing/hero';
import { LiveFeed } from '@/components/landing/live-feed';
import { Problem } from '@/components/landing/problem';
import { ServicesBento } from '@/components/landing/services-bento';
import { Workflow } from '@/components/landing/workflow';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <ServicesBento />
      <Workflow />
      <ClassifierDemo />
      <DashboardPreview />
      <Benefits />
      <LiveFeed />
      <Faq />
      <ClosingCta />
    </>
  );
}
