/**
 * City information content. FixMyCity ships with a Bengaluru-like demonstration
 * scenario. Everything here is either clearly labeled demo content or widely
 * published national emergency numbers for India.
 */

export const DEMO_CITY = {
  name: 'Bengaluru',
  label: 'Bengaluru (demo scenario)',
  center: { latitude: 12.9716, longitude: 77.5946 },
  defaultZoom: 13,
} as const;

export interface EmergencyContact {
  id: string;
  label: string;
  number: string;
  description: string;
  /** National numbers are real. Demo entries are illustrative and not answered. */
  kind: 'NATIONAL' | 'DEMO';
}

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'erss',
    label: 'Emergency response',
    number: '112',
    description: 'Single national emergency number for police, fire and ambulance in India.',
    kind: 'NATIONAL',
  },
  { id: 'police', label: 'Police', number: '100', description: 'National police helpline.', kind: 'NATIONAL' },
  { id: 'fire', label: 'Fire', number: '101', description: 'National fire and rescue helpline.', kind: 'NATIONAL' },
  {
    id: 'ambulance',
    label: 'Ambulance',
    number: '108',
    description: 'Emergency ambulance service available in most states.',
    kind: 'NATIONAL',
  },
];

export interface CityService {
  id: string;
  title: string;
  summary: string;
  details: string[];
  hours: string;
}

export const CITY_SERVICES: CityService[] = [
  {
    id: 'civic-complaints',
    title: 'Civic complaints',
    summary: 'Report potholes, leaks, garbage, streetlights and drainage problems with a photo and a map pin.',
    details: [
      'Every report gets a tracking ID such as FMC-2026-000001.',
      'Complaints are reviewed and routed to the responsible department.',
      'You can follow every status change on a timeline.',
    ],
    hours: 'Reports accepted around the clock',
  },
  {
    id: 'utility-hub',
    title: 'Utility hub',
    summary: 'See electricity, water, property tax and waste management bills in one place.',
    details: [
      'Bills shown in this prototype are simulated records.',
      'Demo payments never move real money.',
      'Receipts and payment history are stored on your account.',
    ],
    hours: 'Available anytime',
  },
  {
    id: 'city-updates',
    title: 'City updates',
    summary: 'Read maintenance schedules, service advisories and civic event notices.',
    details: [
      'Announcements are published by municipal administrators.',
      'Expired notices are hidden automatically.',
      'Seeded notices are labeled as demonstration content.',
    ],
    hours: 'Updated as notices are published',
  },
  {
    id: 'issue-map',
    title: 'Issue map',
    summary: 'Explore reported issues across the city and check whether a problem is already known.',
    details: [
      'Only public-safe details appear on the map.',
      'Filter by category, status and date.',
      'Duplicate hints appear while you report.',
    ],
    hours: 'Live as reports arrive',
  },
];

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'Is FixMyCity an official government service?',
    a: 'No. FixMyCity is a hackathon prototype built by team Kalvi Coder. Complaints, bills and announcements in this deployment are demonstration data, and it is not connected to any real municipal system.',
  },
  {
    q: 'What happens after I report an issue?',
    a: 'Your report is saved with a tracking ID. An administrator reviews it, assigns it to a department, and the department updates the status as work progresses. You see every change on your timeline.',
  },
  {
    q: 'How does the automatic classification work?',
    a: 'When an AI provider is configured, a language model suggests a category, department and priority. Without one, a transparent keyword-based classifier makes the suggestion. Either way the result is labeled with its source, and an administrator always makes the final decision.',
  },
  {
    q: 'Are utility payments real?',
    a: 'No. The utility hub demonstrates how bill payment would work. Payments are simulated, no card or UPI details are requested, and no money is transferred.',
  },
  {
    q: 'Who can see my complaint?',
    a: 'You, the administrators, and officers of the department it is assigned to. The public map only shows the issue title, category, status and location, never your name or contact details.',
  },
  {
    q: 'Can I reopen a complaint?',
    a: 'Yes. If an issue comes back within 30 days of being marked resolved, you can reopen it with a short explanation and it returns to the department.',
  },
];
