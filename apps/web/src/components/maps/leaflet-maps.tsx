'use client';

/**
 * Leaflet implementations. Import through ./index (next/dynamic, ssr: false):
 * Leaflet touches `window` at import time.
 */
import * as React from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import Link from 'next/link';
import { Crosshair, MapPin } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { CATEGORY_META, DEMO_CITY, STATUS_LABELS, type PublicMapComplaint } from '@fixmycity/shared';
import { CATEGORY_ICONS, routeStage } from '@/components/common/complaint-meta';
import { cn, timeAgo } from '@/lib/utils';

// Standard OpenStreetMap tiles by default. Deployments can point at another
// OSM-based provider (and must keep its attribution) through these variables.
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Base tiles. Both themes filter the tile pane in globals.css (calmer in light,
 * inverted to midnight in dark) so markers carry the color. If tiles cannot be
 * fetched, a notice explains the blank background while markers keep working.
 */
function Tiles() {
  const [failed, setFailed] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);
  return (
    <>
      <TileLayer
        attribution={TILE_ATTRIBUTION}
        url={TILE_URL}
        maxZoom={19}
        eventHandlers={{
          tileload: () => setLoaded(true),
          tileerror: () => setFailed((n) => n + 1),
        }}
      />
      {failed >= 4 && !loaded && (
        <div className="leaflet-bottom leaflet-left">
          <div className="leaflet-control m-3 max-w-[260px] rounded-control border border-line bg-surface-elevated px-3 py-2 text-xs text-fg-muted shadow-[var(--shadow-pop)]">
            Map tiles could not be loaded on this network. Issue markers are still shown.
          </div>
        </div>
      )}
    </>
  );
}

const iconCache = new Map<string, L.DivIcon>();

/** Rounded plate colored by route stage, carrying the category glyph. */
function markerIcon(c: Pick<PublicMapComplaint, 'category' | 'status' | 'isMine' | 'createdAt'>) {
  const stage = routeStage(c.status);
  const fresh = Date.now() - new Date(c.createdAt).getTime() < 48 * 3_600_000 && stage === 'open';
  const key = `${c.category}-${stage}-${fresh}-${c.isMine}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const Icon = CATEGORY_ICONS[c.category];
  const svg = renderToStaticMarkup(<Icon size={15} weight="bold" color="currentColor" />);
  const icon = L.divIcon({
    className: cn('fmc-marker', c.isMine && 'mine'),
    html: `<div class="wrap" data-stage="${stage}" style="position:relative;width:30px;height:30px">${fresh ? '<span class="ring"></span>' : ''}<div class="pin">${svg}</div></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });
  iconCache.set(key, icon);
  return icon;
}

function FitToMarkers({ points }: { points: { latitude: number; longitude: number }[] }) {
  const map = useMap();
  const signature = points.map((p) => `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`).join('|');
  React.useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0]!.latitude, points[0]!.longitude], 15, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
    // Instant, not animated: an animated fit that is still running when the page
    // navigates away makes Leaflet read positions from removed panes (_leaflet_pos).
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: false });
    // Refit only when the set of points changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, map]);
  return null;
}

function LocateButton({ onLocated }: { onLocated?: (lat: number, lng: number) => void }) {
  const map = useMap();
  const [busy, setBusy] = React.useState(false);
  const locate = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Location is not available in this browser. Pick the spot on the map instead.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 17, { duration: 0.8 });
        onLocated?.(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setBusy(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. You can still drop the pin manually.'
            : 'Could not get your location. Drop the pin manually instead.',
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };
  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control m-3">
        <button
          type="button"
          onClick={locate}
          disabled={busy}
          className="flex h-10 items-center gap-2 rounded-control border border-line-strong bg-surface-elevated px-3 text-[13px] font-semibold text-fg shadow-[var(--shadow-pop)] transition-colors hover:bg-surface-2 disabled:opacity-60"
          aria-label="Use my current location"
        >
          <Crosshair size={16} weight="bold" className={busy ? 'motion-safe:animate-spin' : 'text-accent-text'} />
          {busy ? 'Locating' : 'My location'}
        </button>
      </div>
    </div>
  );
}

/** Flies to the selected report and opens its popup (list and map stay in sync). */
function FocusMarker({ id, markers }: { id: string | null | undefined; markers: React.RefObject<Map<string, L.Marker>> }) {
  const map = useMap();
  React.useEffect(() => {
    if (!id) return;
    const marker = markers.current.get(id);
    if (!marker) return;
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 16), { duration: 0.6 });
    const t = setTimeout(() => marker.openPopup(), 650);
    return () => clearTimeout(t);
  }, [id, map, markers]);
  return null;
}

function ComplaintPopup({ c, href }: { c: PublicMapComplaint; href: string | null }) {
  return (
    <div className="grid min-w-[210px] max-w-[260px] gap-1.5">
      <p className="text-[11.5px] font-semibold text-fg-subtle">{CATEGORY_META[c.category].label}</p>
      <p className="text-sm font-semibold leading-snug text-fg">{c.title}</p>
      <p className="text-xs text-fg-subtle">{c.address}</p>
      <p className="text-xs text-fg-muted">
        <span className="font-semibold text-fg">{STATUS_LABELS[c.status]}</span>, reported {timeAgo(c.createdAt)}
      </p>
      <p className="font-mono text-[11px] text-fg-subtle">
        {c.trackingId}
        {c.isDemo ? ' (demo record)' : ''}
      </p>
      {href && (
        <Link href={href} className="link mt-1 text-xs">
          Open tracking page
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Issues map                                                          */
/* ------------------------------------------------------------------ */

export interface IssuesMapProps {
  complaints: PublicMapComplaint[];
  className?: string;
  interactive?: boolean;
  /** Scroll-wheel zoom; off where the map sits inside a scrolling page. */
  scrollZoom?: boolean;
  showLocate?: boolean;
  /** Builds the detail link for complaints the viewer is allowed to open. */
  linkFor?: (c: PublicMapComplaint) => string | null;
  ariaLabel?: string;
  /** Report to fly to and open. */
  selectedId?: string | null;
}

export function IssuesMapImpl({
  complaints,
  className,
  interactive = true,
  scrollZoom,
  showLocate,
  linkFor,
  ariaLabel = 'Map of reported civic issues',
  selectedId,
}: IssuesMapProps) {
  const markers = React.useRef(new Map<string, L.Marker>());
  return (
    <div className={cn('relative isolate overflow-hidden', className)} role="region" aria-label={ariaLabel}>
      <MapContainer
        center={[DEMO_CITY.center.latitude, DEMO_CITY.center.longitude]}
        zoom={DEMO_CITY.defaultZoom}
        scrollWheelZoom={scrollZoom ?? interactive}
        dragging={interactive}
        zoomControl={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        keyboard={interactive}
        className="h-full w-full"
      >
        <Tiles />
        <FitToMarkers points={complaints} />
        <FocusMarker id={selectedId} markers={markers} />
        {showLocate && <LocateButton />}
        {complaints.map((c) => (
          <Marker
            key={c.id}
            position={[c.latitude, c.longitude]}
            icon={markerIcon(c)}
            title={`${CATEGORY_META[c.category].label}: ${c.title}`}
            ref={(m) => {
              if (m) markers.current.set(c.id, m);
              else markers.current.delete(c.id);
            }}
          >
            <Popup>
              <ComplaintPopup c={c} href={linkFor?.(c) ?? null} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Location picker                                                     */
/* ------------------------------------------------------------------ */

const pickerIcon = () =>
  L.divIcon({
    className: 'fmc-marker picker',
    html: `<div class="pin">${renderToStaticMarkup(<MapPin size={20} weight="fill" color="currentColor" />)}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 46],
  });

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ value }: { value: { latitude: number; longitude: number } | null }) {
  const map = useMap();
  const first = React.useRef(true);
  React.useEffect(() => {
    if (value && first.current) {
      map.setView([value.latitude, value.longitude], 16);
      first.current = false;
    }
  }, [value, map]);
  return null;
}

export interface LocationPickerProps {
  value: { latitude: number; longitude: number } | null;
  onChange: (lat: number, lng: number) => void;
  nearby?: PublicMapComplaint[];
  className?: string;
}

export function LocationPickerImpl({ value, onChange, nearby = [], className }: LocationPickerProps) {
  const icon = React.useMemo(() => pickerIcon(), []);
  return (
    <div className={cn('relative isolate overflow-hidden', className)} role="application" aria-label="Pick the issue location on the map. Click the map or drag the pin.">
      <MapContainer
        center={value ? [value.latitude, value.longitude] : [DEMO_CITY.center.latitude, DEMO_CITY.center.longitude]}
        zoom={value ? 16 : DEMO_CITY.defaultZoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <Tiles />
        <ClickToPlace onPick={onChange} />
        <Recenter value={value} />
        <LocateButton onLocated={onChange} />
        {nearby.map((c) => (
          <Marker key={c.id} position={[c.latitude, c.longitude]} icon={markerIcon(c)} title={c.title}>
            <Popup>
              <p className="text-[13px] font-semibold text-fg">{c.title}</p>
              <p className="text-xs text-fg-subtle">
                {STATUS_LABELS[c.status]}, {c.trackingId}
              </p>
            </Popup>
          </Marker>
        ))}
        {value && (
          <Marker
            position={[value.latitude, value.longitude]}
            icon={icon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                onChange(ll.lat, ll.lng);
              },
            }}
            title="Selected location"
          />
        )}
      </MapContainer>
      {!value && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[500] flex justify-center px-3">
          <p className="rounded-control border border-line bg-surface-elevated px-3 py-2 text-[13px] font-medium text-fg shadow-[var(--shadow-pop)]">
            Tap the map to drop a pin
          </p>
        </div>
      )}
    </div>
  );
}
