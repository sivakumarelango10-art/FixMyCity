'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/primitives';
import type { IssuesMapProps, LocationPickerProps } from './leaflet-maps';

function MapSkeleton() {
  return (
    <div className="grid h-full w-full place-items-center">
      <Skeleton className="h-full w-full rounded-none" />
    </div>
  );
}

export const IssuesMap = dynamic<IssuesMapProps>(() => import('./leaflet-maps').then((m) => m.IssuesMapImpl), {
  ssr: false,
  loading: MapSkeleton,
});

export const LocationPicker = dynamic<LocationPickerProps>(() => import('./leaflet-maps').then((m) => m.LocationPickerImpl), {
  ssr: false,
  loading: MapSkeleton,
});
