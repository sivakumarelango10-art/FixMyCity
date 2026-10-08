'use client';

import dynamic from 'next/dynamic';
import { MapTrifold } from '@phosphor-icons/react';
import type { IssuesMapProps, LocationPickerProps } from './leaflet-maps';

/** Shown while the map library loads: the map's footprint with a quiet label, never a blank box. */
function MapSkeleton() {
  return (
    <div className="skeleton grid h-full w-full place-items-center rounded-none" role="status" aria-label="Loading map">
      <span className="relative z-10 flex items-center gap-2 text-[13px] font-medium text-fg-subtle">
        <MapTrifold size={18} aria-hidden /> Loading map
      </span>
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
