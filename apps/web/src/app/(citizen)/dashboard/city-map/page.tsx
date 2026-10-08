'use client';

import { PageHeader } from '@/components/common/page';
import { CityMapView } from '@/components/maps/city-map-view';

export default function CitizenCityMapPage() {
  return (
    <>
      <PageHeader
        title="City map"
        description="Reported issues across the city. Only public details are shown; your own reports open their tracking page."
      />
      <CityMapView linkFor={(c) => (c.isMine ? `/dashboard/complaints/${c.id}` : null)} />
    </>
  );
}
