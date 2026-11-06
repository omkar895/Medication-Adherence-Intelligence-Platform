export interface User {
  id: string;
  display_name: string;
  email: string | null;
  role: 'patient' | 'caregiver' | 'admin';
  locale: string;
}

export interface DoseEvent {
  id: string;
  schedule_version_id: string;
  medication_id: string;
  medication_name?: string;
  patient_id: string;
  scheduled_at: string;
  status: 'scheduled' | 'taken' | 'not_taken' | 'unresolved';
  responded_at?: string;
  response_source?: string;
  reason_code?: string;
  is_late: boolean;
  idempotency_key: string;
  sync_status: string;
  is_synthetic?: boolean;
}

export interface Medication {
  id: string;
  patient_id: string;
  display_name: string;
  prescribed_instruction_text: string;
  form?: string;
  start_date: string;
  end_date?: string;
  notes?: string;
  verification_status: string;
  verified_at?: string;
  active: boolean;
  is_synthetic: boolean;
  created_at: string;
  current_schedule?: {
    id: string;
    dose_times: string[];
    frequency_rule: { type: string; days?: string[] };
    timezone: string;
    response_window_minutes: number;
  };
}

export interface PeriodSummary {
  period: string;
  start_date: string;
  end_date: string;
  S: number;
  T: number;
  N: number;
  U: number;
  confirmed_pct: number | null;
  not_taken_pct: number | null;
  unresolved_pct: number | null;
  outcome_coverage_pct: number | null;
  sync_pending_count: number;
  small_sample_warning: boolean;
}

export interface Insight {
  id: string;
  rule_id: string;
  medication_id?: string;
  medication_name?: string;
  evidence_event_ids: string[];
  date_range: { start?: string; end?: string };
  generated_at: string;
  dismissed: boolean;
  useful?: boolean | null;
  description: string;
}

export interface ConsentGrant {
  id: string;
  patient_id: string;
  patient_name?: string;
  caregiver_id: string;
  caregiver_name?: string;
  scopes: string[];
  alert_preferences: Record<string, boolean>;
  granted_at: string;
  revoked_at?: string | null;
}

const TOKEN_KEY = 'maip_auth_token';
const USER_KEY = 'maip_user_data';
const OFFLINE_QUEUE_KEY = 'maip_offline_queue';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAuth(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

// Offline Queue Management
export interface QueuedDoseResponse {
  event_id: string;
  outcome: 'taken' | 'not_taken';
  scheduled_at: string;
  medication_id: string;
  schedule_version_id: string;
  idempotency_key: string;
  timestamp: string;
}

export function getOfflineQueue(): QueuedDoseResponse[] {
  const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
  return data ? JSON.parse(data) : [];
}

export function addToOfflineQueue(item: QueuedDoseResponse) {
  const queue = getOfflineQueue();
  queue.push(item);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorData.message || JSON.stringify(errorData);
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const data = await request<{ access_token: string; user_id: string; display_name: string; role: 'patient' | 'caregiver' | 'admin' }>(
      '/api/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    const user: User = {
      id: data.user_id,
      display_name: data.display_name,
      email,
      role: data.role,
      locale: 'en',
    };
    setStoredAuth(data.access_token, user);
    return user;
  },

  async register(display_name: string, email: string, password: string, role: string) {
    const data = await request<{ access_token: string; user_id: string; display_name: string; role: 'patient' | 'caregiver' | 'admin' }>(
      '/api/v1/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ display_name, email, password, role }),
      }
    );
    const user: User = {
      id: data.user_id,
      display_name: data.display_name,
      email,
      role: data.role,
      locale: 'en',
    };
    setStoredAuth(data.access_token, user);
    return user;
  },

  async getMe(): Promise<User> {
    return request<User>('/api/v1/auth/me');
  },

  // Today & Dose Events
  async getTodayEvents(): Promise<DoseEvent[]> {
    return request<DoseEvent[]>('/api/v1/dose-events/today');
  },

  async listDoseEvents(params: { medication_id?: string; status_filter?: string; limit?: number } = {}): Promise<DoseEvent[]> {
    const query = new URLSearchParams();
    if (params.medication_id) query.append('medication_id', params.medication_id);
    if (params.status_filter) query.append('status_filter', params.status_filter);
    if (params.limit) query.append('limit', params.limit.toString());
    return request<DoseEvent[]>(`/api/v1/dose-events?${query.toString()}`);
  },

  async recordDoseResponse(eventId: string, outcome: 'taken' | 'not_taken', idempotencyKey?: string): Promise<DoseEvent> {
    const key = idempotencyKey || `resp_${eventId}_${Date.now()}`;
    return request<DoseEvent>(`/api/v1/dose-events/${eventId}/response`, {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({ outcome }),
    });
  },

  async snoozeReminder(eventId: string, snoozeMinutes: number = 15) {
    return request<{ message: string; snooze_until: string; status: string }>(
      `/api/v1/dose-events/${eventId}/snooze`,
      {
        method: 'POST',
        body: JSON.stringify({ snooze_minutes: snoozeMinutes }),
      }
    );
  },

  async correctDoseEvent(eventId: string, newStatus: string, reason: string): Promise<DoseEvent> {
    return request<DoseEvent>(`/api/v1/dose-events/${eventId}/correction`, {
      method: 'POST',
      body: JSON.stringify({ new_status: newStatus, reason }),
    });
  },

  async syncOfflineBatch(events: any[]) {
    return request<{ status: string; synced_count: number; conflicts: number }>(
      '/api/v1/sync/dose-events',
      {
        method: 'POST',
        body: JSON.stringify({ events }),
      }
    );
  },

  // Medications
  async listMedications(): Promise<Medication[]> {
    return request<Medication[]>('/api/v1/medications');
  },

  async createMedication(data: {
    display_name: string;
    prescribed_instruction_text: string;
    form: string;
    start_date: string;
    dose_times: string[];
    frequency_type: string;
    frequency_days?: string[];
  }): Promise<Medication> {
    return request<Medication>('/api/v1/medications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async archiveMedication(medicationId: string): Promise<Medication> {
    return request<Medication>(`/api/v1/medications/${medicationId}/archive`, {
      method: 'POST',
    });
  },

  // Analytics & Insights
  async getSummary(days: number = 30): Promise<PeriodSummary> {
    return request<PeriodSummary>(`/api/v1/analytics/summary?days=${days}`);
  },

  async getMedicationSummaries(days: number = 30) {
    return request<any[]>(`/api/v1/analytics/medications?days=${days}`);
  },

  async getTrends(days: number = 14) {
    return request<any[]>(`/api/v1/analytics/trends?days=${days}`);
  },

  async getInsights(): Promise<Insight[]> {
    return request<Insight[]>('/api/v1/analytics/insights');
  },

  async dismissInsight(insightId: string) {
    return request(`/api/v1/analytics/insights/${insightId}/dismiss`, { method: 'POST' });
  },

  async feedbackInsight(insightId: string, useful: boolean) {
    return request(`/api/v1/analytics/insights/${insightId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ useful }),
    });
  },

  // Caregivers & Consent
  async listCaregivers() {
    return request<{ active_caregivers?: any[]; pending_invitations?: any[]; shared_patients?: any[] }>('/api/v1/caregivers');
  },

  async createCaregiverInvite(contact: string, scopes: string[]) {
    return request<{ invitation_id: string; invite_token: string; expires_at: string; scopes: string[] }>(
      '/api/v1/caregivers/invitations',
      {
        method: 'POST',
        body: JSON.stringify({ contact, scopes }),
      }
    );
  },

  async acceptInvite(token: string) {
    return request('/api/v1/caregivers/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  async listConsent(): Promise<ConsentGrant[]> {
    return request<ConsentGrant[]>('/api/v1/consent');
  },

  async revokeConsent(consentId: string): Promise<ConsentGrant> {
    return request<ConsentGrant>(`/api/v1/consent/${consentId}/revoke`, {
      method: 'POST',
    });
  },

  async getCaregiverNotifications(): Promise<any[]> {
    return request('/api/v1/caregiver-notifications');
  },

  // Shared Caregiver Reads
  async getSharedMedications(patientId: string): Promise<any[]> {
    return request(`/api/v1/shared/patients/${patientId}/medications`);
  },

  async getSharedScheduleSummary(patientId: string): Promise<any[]> {
    return request(`/api/v1/shared/patients/${patientId}/schedule-summary`);
  },

  async getSharedDoseStatus(patientId: string): Promise<any> {
    return request(`/api/v1/shared/patients/${patientId}/dose-status-summary`);
  },

  async getSharedHistory(patientId: string): Promise<any[]> {
    return request(`/api/v1/shared/patients/${patientId}/dose-history`);
  },

  async getSharedDashboard(patientId: string): Promise<PeriodSummary> {
    return request(`/api/v1/shared/patients/${patientId}/dashboard`);
  },

  // Dev & Reminders
  async simulateReminder(doseEventId: string) {
    return request('/api/v1/reminders/simulate', {
      method: 'POST',
      body: JSON.stringify({ dose_event_id: doseEventId }),
    });
  },

  async getDiagnostics() {
    return request<any>('/api/v1/reminders/diagnostics');
  },

  async triggerDevSweep() {
    return request<{ status: string; unresolved_swept_count: number }>('/api/v1/dev/sweep', {
      method: 'POST',
    });
  },
};
