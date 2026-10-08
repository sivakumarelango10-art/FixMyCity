import { describe, expect, it } from 'vitest';
import {
  allowedStatusUpdates,
  canUpdateStatus,
  classifyWithRules,
  COMPLAINT_STATUSES,
  formatTrackingId,
  haversineMeters,
  isValidTransition,
  createComplaintBodySchema,
  registerSchema,
  STATUS_TRANSITIONS,
  textSimilarity,
  TRACKING_ID_PATTERN,
} from '../index';

describe('rule-based classifier', () => {
  it('classifies the reference water pipeline example', () => {
    const result = classifyWithRules({
      description: 'Water pipeline burst near our street. Water has been leaking continuously.',
    });
    expect(result.suggestedCategory).toBe('WATER_LEAKAGE');
    expect(result.suggestedDepartmentCode).toBe('WATER');
    expect(result.suggestedDepartmentName).toBe('Water Supply Department');
    expect(result.suggestedPriority).toBe('HIGH');
    expect(result.source).toBe('RULE_BASED');
    expect(result.explanation).toMatch(/water infrastructure/i);
  });

  it('classifies the MG Road pothole example to road maintenance', () => {
    const result = classifyWithRules({
      title: 'Large pothole near MG Road',
      description: 'Large pothole near MG Road affecting daily commuters.',
    });
    expect(result.suggestedCategory).toBe('POTHOLES');
    expect(result.suggestedDepartmentCode).toBe('ROADS');
    expect(result.suggestedPriority).toBe('HIGH');
  });

  it('flags exposed wiring as critical', () => {
    const result = classifyWithRules({
      title: 'Streetlight pole with exposed wires',
      description: 'The streetlight is not working and there are exposed wires at the base of the pole.',
    });
    expect(result.suggestedCategory).toBe('STREETLIGHT_FAILURE');
    expect(result.suggestedPriority).toBe('CRITICAL');
  });

  it('falls back to the citizen choice when the text is unclear', () => {
    const result = classifyWithRules({ description: 'Please look into this issue soon, it is bothering us.', category: 'PUBLIC_PROPERTY_DAMAGE' });
    expect(result.suggestedCategory).toBe('PUBLIC_PROPERTY_DAMAGE');
    expect(result.explanation).toMatch(/chosen by the citizen/);
  });

  it('routes unclear complaints without a choice to general services', () => {
    const result = classifyWithRules({ description: 'Something needs attention in our area please help.' });
    expect(result.suggestedCategory).toBe('OTHER');
    expect(result.suggestedDepartmentCode).toBe('GENERAL');
  });

  it('never reports numeric confidence', () => {
    const result = classifyWithRules({ description: 'Garbage has not been collected for 5 days near the market.' });
    expect(JSON.stringify(result)).not.toMatch(/confidence|probability|%/i);
    expect(result.suggestedCategory).toBe('GARBAGE_COLLECTION');
  });
});

describe('status state machine', () => {
  it('only allows defined edges', () => {
    expect(isValidTransition('SUBMITTED', 'UNDER_REVIEW')).toBe(true);
    expect(isValidTransition('SUBMITTED', 'RESOLVED')).toBe(false);
    expect(isValidTransition('IN_PROGRESS', 'RESOLVED')).toBe(true);
    expect(isValidTransition('RESOLVED', 'IN_PROGRESS')).toBe(false);
  });

  it('every target status is a known status', () => {
    for (const from of COMPLAINT_STATUSES) {
      for (const to of STATUS_TRANSITIONS[from]) expect(COMPLAINT_STATUSES).toContain(to);
    }
  });

  it('restricts officers to work statuses', () => {
    expect(allowedStatusUpdates('DEPARTMENT_OFFICER', 'ASSIGNED')).toEqual(['IN_PROGRESS']);
    expect(canUpdateStatus('DEPARTMENT_OFFICER', 'SUBMITTED', 'REJECTED')).toBe(false);
    expect(canUpdateStatus('DEPARTMENT_OFFICER', 'IN_PROGRESS', 'RESOLVED')).toBe(true);
  });

  it('citizens can only reopen resolved complaints', () => {
    expect(allowedStatusUpdates('CITIZEN', 'RESOLVED')).toEqual(['REOPENED']);
    expect(allowedStatusUpdates('CITIZEN', 'SUBMITTED')).toEqual([]);
  });

  it('never exposes ASSIGNED through the status update action', () => {
    for (const from of COMPLAINT_STATUSES) {
      expect(allowedStatusUpdates('ADMIN', from)).not.toContain('ASSIGNED');
    }
  });
});

describe('helpers', () => {
  it('formats tracking ids', () => {
    expect(formatTrackingId(2026, 1)).toBe('FMC-2026-000001');
    expect(TRACKING_ID_PATTERN.test(formatTrackingId(2026, 1234567))).toBe(true);
  });

  it('computes distances', () => {
    const d = haversineMeters({ latitude: 12.9716, longitude: 77.5946 }, { latitude: 12.9726, longitude: 77.5946 });
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });

  it('scores text similarity', () => {
    expect(textSimilarity('large pothole near MG Road', 'pothole on MG road is large')).toBeGreaterThan(0.5);
    expect(textSimilarity('streetlight not working', 'garbage overflowing')).toBe(0);
  });

  it('treats blank multipart coordinates as missing, not as 0', () => {
    const base = { title: 'Large pothole near MG Road', description: 'A large pothole that affects daily commuters.', category: 'POTHOLES', address: 'MG Road' };
    expect(createComplaintBodySchema.safeParse({ ...base, latitude: '', longitude: '77.6' }).success).toBe(false);
    expect(createComplaintBodySchema.safeParse({ ...base, latitude: '  ', longitude: '' }).success).toBe(false);
    const ok = createComplaintBodySchema.safeParse({ ...base, latitude: '12.97', longitude: '77.6' });
    expect(ok.success && ok.data.latitude).toBe(12.97);
  });

  it('validates registration input', () => {
    expect(registerSchema.safeParse({ name: 'Asha Rao', email: 'ASHA@example.com', password: 'abc12345' }).success).toBe(true);
    expect(registerSchema.safeParse({ name: 'A', email: 'bad', password: 'short' }).success).toBe(false);
  });
});
