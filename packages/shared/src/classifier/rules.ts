import {
  CATEGORY_META,
  COMPLAINT_CATEGORIES,
  DEPARTMENT_DEFAULTS,
  PRIORITY_LABELS,
  type ComplaintCategory,
  type Priority,
} from '../constants/domain';
import type { ClassificationResult } from '../types/api';

/**
 * Deterministic keyword classifier.
 *
 * This is a transparent rule set, not a trained model. It scores each
 * category by the signals found in the text and reports exactly which
 * signals it matched. It never produces probabilities.
 */

interface Signal {
  pattern: RegExp;
  label: string;
  weight: number;
}

const s = (pattern: RegExp, label: string, weight = 2): Signal => ({ pattern, label, weight });

const CATEGORY_SIGNALS: Record<ComplaintCategory, Signal[]> = {
  POTHOLES: [
    s(/\bpot ?holes?\b/, 'pothole', 4),
    s(/\bcraters?\b/, 'crater', 3),
    s(/\b(deep )?pit\b/, 'pit in road', 2),
    s(/\bhole in (the )?road\b/, 'hole in road', 3),
  ],
  ROAD_DAMAGE: [
    s(/\broad (is )?(damaged|broken|cracked|caved)\b/, 'damaged road', 3),
    s(/\b(cracks?|cracked)\b/, 'cracks', 1),
    s(/\bfoot ?paths?\b|\bpavements?\b|\bsidewalks?\b/, 'footpath', 2),
    s(/\basphalt\b|\btarmac\b|\bresurfac/, 'road surface', 2),
    s(/\bcave[ds]? in\b|\bsinkhole\b/, 'cave-in', 3),
    s(/\broad\b|\bstreet surface\b/, 'road', 1),
  ],
  WATER_LEAKAGE: [
    s(/\bpipe ?lines?\b|\bpipes?\b/, 'pipeline', 3),
    s(/\bleak(s|ing|age|ed)?\b/, 'leak', 3),
    s(/\bburst\b/, 'burst', 3),
    s(/\bwater (supply|connection|main|valve|meter)\b/, 'water supply', 3),
    s(/\bno water\b|\bwater (cut|shortage)\b/, 'supply loss', 3),
    s(/\bcontaminated\b|\bmuddy water\b|\bdirty water\b/, 'water quality', 2),
    s(/\bwater\b/, 'water', 1),
  ],
  GARBAGE_COLLECTION: [
    s(/\bgarbage\b|\btrash\b|\brubbish\b/, 'garbage', 4),
    s(/\bwaste\b/, 'waste', 2),
    s(/\b(dust ?bins?|bins?)\b/, 'bin', 2),
    s(/\bnot (been )?(collected|picked)\b|\bmissed (pickup|collection)\b/, 'missed collection', 3),
    s(/\bdump(ing|ed)?\b|\bdumping ground\b/, 'dumping', 2),
    s(/\boverflow(ing)? (bin|dustbin)\b/, 'overflowing bin', 3),
  ],
  STREETLIGHT_FAILURE: [
    s(/\bstreet ?lights?\b|\bstreet ?lamps?\b/, 'streetlight', 4),
    s(/\blamp ?posts?\b|\blight poles?\b/, 'lamp post', 3),
    s(/\bflicker(ing|s)?\b/, 'flickering', 2),
    s(/\b(lights?|lamp) (not working|out|off|broken|fused)\b/, 'light out', 3),
    s(/\bdark (stretch|road|street)\b|\bpitch dark\b/, 'dark stretch', 2),
  ],
  DRAINAGE: [
    s(/\bdrain(s|age)?\b/, 'drain', 4),
    s(/\bsewer(s|age)?\b|\bsewage\b/, 'sewage', 3),
    s(/\bmanholes?\b/, 'manhole', 3),
    s(/\bclog(ged)?\b|\bblock(ed|age)\b|\bchoked\b/, 'blockage', 2),
    s(/\bwater ?logg(ed|ing)\b|\bflood(ed|ing)?\b|\bstagnant\b/, 'waterlogging', 3),
    s(/\bstorm ?water\b|\brain ?water\b|\bheavy rain/, 'stormwater', 2),
  ],
  PUBLIC_SANITATION: [
    s(/\b(public )?toilets?\b|\burinals?\b|\blavator(y|ies)\b/, 'public toilet', 4),
    s(/\bunhygienic\b|\bfilth(y)?\b|\bstench\b|\bsmell(s|ing)?\b/, 'hygiene', 2),
    s(/\bdead (animal|dog|cat|cow)\b|\bcarcass\b/, 'dead animal', 4),
    s(/\bmosquito(es)?\b|\bopen defecation\b/, 'sanitation risk', 2),
  ],
  TRAFFIC_INFRASTRUCTURE: [
    s(/\btraffic (signal|light)s?\b|\bsignals?\b/, 'traffic signal', 4),
    s(/\bsign ?boards?\b|\broad signs?\b/, 'signboard', 3),
    s(/\bzebra crossing\b|\broad markings?\b|\blane markings?\b/, 'road markings', 3),
    s(/\bspeed breakers?\b|\bmedians?\b|\bdividers?\b/, 'traffic fixture', 2),
    s(/\btraffic\b|\bjunction\b|\bintersection\b/, 'traffic', 1),
  ],
  PUBLIC_PROPERTY_DAMAGE: [
    s(/\bbench(es)?\b|\bbus (stop|shelter)s?\b/, 'public fixture', 3),
    s(/\bpark\b|\bplayground\b|\bswings?\b/, 'park', 2),
    s(/\bvandali[sz](ed|m)\b|\bgraffiti\b/, 'vandalism', 3),
    s(/\bcompound wall\b|\brailings?\b|\bfence\b/, 'railing', 2),
    s(/\bpublic property\b|\bstatue\b/, 'public property', 3),
  ],
  OTHER: [],
};

/** Base urgency per category before severity signals. */
const BASE_PRIORITY: Record<ComplaintCategory, Priority> = {
  POTHOLES: 'MEDIUM',
  ROAD_DAMAGE: 'MEDIUM',
  WATER_LEAKAGE: 'MEDIUM',
  GARBAGE_COLLECTION: 'MEDIUM',
  STREETLIGHT_FAILURE: 'MEDIUM',
  DRAINAGE: 'MEDIUM',
  PUBLIC_SANITATION: 'MEDIUM',
  TRAFFIC_INFRASTRUCTURE: 'MEDIUM',
  PUBLIC_PROPERTY_DAMAGE: 'LOW',
  OTHER: 'LOW',
};

const CRITICAL_SIGNALS: Signal[] = [
  s(/\belectrocut/, 'electrocution risk'),
  s(/\blive wires?\b|\bexposed wir(e|es|ing)\b|\bsparking\b|\bsparks\b/, 'exposed live wiring'),
  s(/\b(someone|people|person|child|biker|rider)s? (was |were |got )?(injured|hurt)\b|\binjur(y|ies|ed)\b/, 'injury reported'),
  s(/\bgas leak\b|\bfire\b/, 'fire or gas hazard'),
  s(/\bcollaps(e|ed|ing)\b/, 'structural collapse'),
  s(/\bopen manhole\b|\buncovered manhole\b/, 'open manhole'),
];

const HIGH_SIGNALS: Signal[] = [
  s(/\baccidents?\b/, 'accident risk'),
  s(/\bdanger(ous)?\b|\bhazard(ous)?\b|\bunsafe\b|\brisk\b/, 'safety hazard'),
  s(/\bburst\b/, 'burst'),
  s(/\bcontinuous(ly)?\b|\bnon[- ]?stop\b|\bfor (\d+|several|many) days\b|\bsince (\d+|last) (days|week)/, 'ongoing for a long time'),
  s(/\bflood(ed|ing)?\b|\boverflow(ing)?\b|\bsewage\b/, 'flooding or overflow'),
  s(/\bschools?\b|\bhospitals?\b|\bchildren\b|\belderly\b/, 'near vulnerable people'),
  s(/\bmain road\b|\bhighway\b|\barterial\b|\bcommuters?\b|\bheavy traffic\b/, 'busy road'),
  s(/\blarge\b|\bhuge\b|\bdeep\b|\bmassive\b|\bbig\b/, 'large in size'),
  s(/\bdark (stretch|road|street)\b|\bpitch dark\b|\bwomen\b/, 'personal safety at night'),
];

const LOW_SIGNALS: Signal[] = [
  s(/\bminor\b|\bsmall\b|\bslight(ly)?\b|\bcosmetic\b|\bfaded\b/, 'minor issue'),
];

function matchSignals(text: string, signals: Signal[]) {
  const matched: Signal[] = [];
  for (const signal of signals) {
    if (signal.pattern.test(text)) matched.push(signal);
  }
  return matched;
}

function joinLabels(labels: string[]): string {
  const unique = [...new Set(labels)];
  if (unique.length <= 1) return unique.join('');
  return `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]}`;
}

export interface RuleClassifierInput {
  title?: string;
  description: string;
  category?: ComplaintCategory;
}

export function classifyWithRules(input: RuleClassifierInput): ClassificationResult {
  const title = (input.title ?? '').toLowerCase();
  const description = input.description.toLowerCase();
  const text = `${title}\n${description}`;

  let best: { category: ComplaintCategory; score: number; matched: Signal[] } = {
    category: 'OTHER',
    score: 0,
    matched: [],
  };

  for (const category of COMPLAINT_CATEGORIES) {
    const signals = CATEGORY_SIGNALS[category];
    let score = 0;
    const matched: Signal[] = [];
    for (const signal of signals) {
      const inTitle = signal.pattern.test(title);
      const inBody = signal.pattern.test(description);
      if (inTitle || inBody) {
        matched.push(signal);
        score += signal.weight * (inTitle ? 1.5 : 1);
      }
    }
    // The citizen's own choice acts as a light tie-breaker, never an override.
    if (input.category === category && score > 0) score += 1;
    if (score > best.score) best = { category, score, matched };
  }

  // Weak evidence: fall back to the citizen's choice when present.
  const weak = best.score < 2;
  const category: ComplaintCategory = weak ? (input.category ?? 'OTHER') : best.category;
  const meta = CATEGORY_META[category];

  const critical = matchSignals(text, CRITICAL_SIGNALS);
  const high = matchSignals(text, HIGH_SIGNALS);
  const low = matchSignals(text, LOW_SIGNALS);

  let priority: Priority = BASE_PRIORITY[category];
  let priorityReason = 'no severity signals were found, so the usual priority for this category applies';
  if (critical.length > 0) {
    priority = 'CRITICAL';
    priorityReason = `the report mentions ${joinLabels(critical.map((m) => m.label))}`;
  } else if (high.length >= 1) {
    priority = 'HIGH';
    priorityReason = `the report indicates ${joinLabels(high.map((m) => m.label))}`;
  } else if (low.length > 0) {
    priority = 'LOW';
    priorityReason = `the report describes a ${joinLabels(low.map((m) => m.label))}`;
  }

  const categorySignals = weak ? [] : best.matched.map((m) => m.label);
  const departmentName = DEPARTMENT_DEFAULTS[meta.departmentCode].name;

  let explanation: string;
  if (weak && !input.category) {
    explanation = `No clear category signals were found, so it is routed to ${departmentName} for manual review. Priority is ${PRIORITY_LABELS[priority]} because ${priorityReason}.`;
  } else if (weak && input.category) {
    explanation = `The text did not contain strong signals, so the category chosen by the citizen (${meta.label}) is kept. Priority is ${PRIORITY_LABELS[priority]} because ${priorityReason}.`;
  } else {
    explanation = `The report mentions ${joinLabels(categorySignals)}, which points to ${meta.group.toLowerCase()} handled by the ${departmentName}. Priority is ${PRIORITY_LABELS[priority]} because ${priorityReason}.`;
  }

  return {
    suggestedCategory: category,
    suggestedDepartmentCode: meta.departmentCode,
    suggestedDepartmentName: departmentName,
    suggestedPriority: priority,
    explanation,
    source: 'RULE_BASED',
    model: null,
    signals: [...new Set([...categorySignals, ...critical.map((m) => m.label), ...high.map((m) => m.label)])],
  };
}
