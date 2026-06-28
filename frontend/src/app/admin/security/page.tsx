'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Clock, Database, RefreshCw, Server, Shield, Wifi } from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import {
  RedisHealthStatus,
  SecurityAlert,
  SecurityAlertWindow,
  SecurityEventSummary,
  SecurityEventsResponse,
  SecurityHealthResponse,
  SecurityHealthStatus,
  SecuritySeverity,
} from '../../../lib/types';
import { hasAdminPermission } from '../../../lib/adminPermissions';
import { useAuth } from '../../../hooks/useAuth';
import { DataTable } from '../../../components/admin/DataTable';

type HealthStatus = SecurityHealthStatus | RedisHealthStatus;
type SeverityFilter = '' | SecuritySeverity;

const alertWindows: SecurityAlertWindow[] = ['15m', '1h', '24h'];
const severityOptions: SeverityFilter[] = ['', 'critical', 'high', 'warning', 'info'];

const severityClasses: Record<SecuritySeverity, string> = {
  critical: 'border-red-200 bg-red-50 text-red-700',
  high: 'border-orange-200 bg-orange-50 text-orange-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
};

const statusClasses: Record<HealthStatus, string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  disabled: 'border-slate-200 bg-slate-50 text-slate-600',
  down: 'border-red-200 bg-red-50 text-red-700',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `${value.length} values`;
  }
  return 'summary object';
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
}

function StatusBadge({ status }: { status: HealthStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses[status]}`}>
      {status}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: SecuritySeverity }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${severityClasses[severity]}`}>
      {severity}
    </span>
  );
}

function HealthCard({
  title,
  status,
  detail,
  icon,
}: {
  title: string;
  status?: HealthStatus;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-lg font-bold text-[#0B1B48]">{detail}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-accent">
          {icon}
        </div>
      </div>
      {status && (
        <div className="mt-4">
          <StatusBadge status={status} />
        </div>
      )}
    </div>
  );
}

export default function AdminSecurityPage() {
  const { user } = useAuth();
  const canViewSecurity = hasAdminPermission(user?.role, 'security');
  const [health, setHealth] = useState<SecurityHealthResponse['health'] | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState('');
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [alertsWindow, setAlertsWindow] = useState<SecurityAlertWindow>('15m');
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState('');
  const [events, setEvents] = useState<SecurityEventSummary[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsLimit, setEventsLimit] = useState(25);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [eventsPagination, setEventsPagination] = useState<SecurityEventsResponse['pagination']>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  const fetchHealth = useCallback(async () => {
    if (!canViewSecurity) return;
    setHealthLoading(true);
    setHealthError('');
    try {
      const response = await api.get<SecurityHealthResponse>('/api/admin/security/health');
      setHealth(response.health);
    } catch (error) {
      setHealthError(getErrorMessage(error, 'Failed to load system health.'));
    } finally {
      setHealthLoading(false);
    }
  }, [canViewSecurity]);

  const fetchAlerts = useCallback(async () => {
    if (!canViewSecurity) return;
    setAlertsLoading(true);
    setAlertsError('');
    try {
      const response = await api.get<{ success: boolean; alerts: SecurityAlert[] }>('/api/admin/security/alerts', {
        params: { window: alertsWindow },
      });
      setAlerts(response.alerts || []);
    } catch (error) {
      setAlertsError(getErrorMessage(error, 'Failed to load active alerts.'));
    } finally {
      setAlertsLoading(false);
    }
  }, [alertsWindow, canViewSecurity]);

  const fetchEvents = useCallback(async () => {
    if (!canViewSecurity) return;
    setEventsLoading(true);
    setEventsError('');
    try {
      const response = await api.get<SecurityEventsResponse>('/api/admin/security/events', {
        params: {
          page: eventsPage,
          limit: eventsLimit,
          severity: severityFilter || undefined,
          eventType: eventTypeFilter.trim() || undefined,
        },
      });
      setEvents(response.events || []);
      setEventsPagination(response.pagination);
    } catch (error) {
      setEventsError(getErrorMessage(error, 'Failed to load security events.'));
    } finally {
      setEventsLoading(false);
    }
  }, [canViewSecurity, eventTypeFilter, eventsLimit, eventsPage, severityFilter]);

  useEffect(() => {
    void fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const eventColumns = useMemo(() => [
    {
      header: 'Time',
      cell: (event: SecurityEventSummary) => (
        <span className="text-xs text-slate-500">{formatDate(event.createdAt)}</span>
      ),
    },
    {
      header: 'Severity',
      cell: (event: SecurityEventSummary) => <SeverityBadge severity={event.severity} />,
    },
    {
      header: 'Event',
      cell: (event: SecurityEventSummary) => (
        <span className="font-mono text-xs font-semibold text-[#0B1B48]">{event.eventType}</span>
      ),
    },
    {
      header: 'Route',
      cell: (event: SecurityEventSummary) => (
        <div className="max-w-xs whitespace-normal break-words text-xs text-slate-600">
          <span className="font-semibold">{event.method || '-'}</span> {event.route || '-'}
        </div>
      ),
    },
    {
      header: 'Request',
      cell: (event: SecurityEventSummary) => (
        <span className="font-mono text-xs text-slate-500">{event.requestId || '-'}</span>
      ),
    },
    {
      header: 'Summary',
      cell: (event: SecurityEventSummary) => {
        const entries = Object.entries(event.metadataSummary || {});
        if (entries.length === 0) return <span className="text-xs text-slate-400">-</span>;

        return (
          <div className="flex max-w-md flex-wrap gap-1.5 whitespace-normal">
            {entries.map(([key, value]) => (
              <span key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                <span className="font-semibold text-slate-700">{key}:</span> {formatMetadataValue(value)}
              </span>
            ))}
          </div>
        );
      },
    },
  ], []);

  if (!canViewSecurity) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm shadow-slate-200/80">
        <Shield className="mx-auto mb-3 h-10 w-10 text-slate-400" />
        <h1 className="text-xl font-bold text-[#0B1B48]">Security access required</h1>
        <p className="mt-2 text-sm text-slate-500">Your account does not have permission to view security monitoring.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1B48]">Security &amp; Monitoring</h1>
          <p className="mt-2 text-sm text-slate-500">System health, alerts, and security events.</p>
        </div>
        <button
          onClick={() => {
            void fetchHealth();
            void fetchAlerts();
            void fetchEvents();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-glow"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#0B1B48]">System Health</h2>
          <p className="mt-1 text-sm text-slate-500">Current API, database, and cache status.</p>
        </div>

        {healthError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{healthError}</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-5">
          <HealthCard
            title="API"
            status={health?.api.status || (healthLoading ? undefined : 'down')}
            detail={healthLoading ? 'Checking...' : health?.api.status || 'Unavailable'}
            icon={<Server className="h-5 w-5" />}
          />
          <HealthCard
            title="Database"
            status={health?.database.status || (healthLoading ? undefined : 'down')}
            detail={healthLoading ? 'Checking...' : health?.database.latencyMs !== undefined ? `${health.database.latencyMs} ms` : health?.database.status || 'Unavailable'}
            icon={<Database className="h-5 w-5" />}
          />
          <HealthCard
            title="Redis"
            status={health?.redis.status || (healthLoading ? undefined : 'disabled')}
            detail={healthLoading ? 'Checking...' : health?.redis.latencyMs !== undefined ? `${health.redis.latencyMs} ms` : health?.redis.status || 'Unavailable'}
            icon={<Wifi className="h-5 w-5" />}
          />
          <HealthCard
            title="Environment"
            detail={healthLoading ? 'Checking...' : health?.environment || '-'}
            icon={<Activity className="h-5 w-5" />}
          />
          <HealthCard
            title="Last Checked"
            detail={healthLoading ? 'Checking...' : formatDate(health?.lastCheckedAt)}
            icon={<Clock className="h-5 w-5" />}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0B1B48]">Active Alerts</h2>
            <p className="mt-1 text-sm text-slate-500">Aggregated from recent sanitized security events.</p>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
            Window
            <select
              value={alertsWindow}
              onChange={(event) => setAlertsWindow(event.target.value as SecurityAlertWindow)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0B1B48] outline-none transition-colors focus:border-accent"
            >
              {alertWindows.map((window) => (
                <option key={window} value={window}>{window}</option>
              ))}
            </select>
          </label>
        </div>

        {alertsError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{alertsError}</div>
        )}

        {alertsLoading ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[0, 1].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
            <Shield className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <p className="font-semibold text-[#0B1B48]">No active alerts.</p>
            <p className="mt-1 text-sm text-slate-500">Security alerts will appear here when thresholds are reached.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {alerts.map((alert) => (
              <article key={alert.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={alert.severity} />
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {alert.source}
                  </span>
                  {alert.count !== undefined && (
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {alert.count} events
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-base font-bold text-[#0B1B48]">{alert.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{alert.message}</p>
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
                  <p className="font-semibold text-[#0B1B48]">Suggested action</p>
                  <p className="mt-1 leading-6">{alert.suggestedAction}</p>
                </div>
                <p className="mt-3 text-xs text-slate-500">Created {formatDate(alert.createdAt)}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0B1B48]">Recent Security Events</h2>
            <p className="mt-1 text-sm text-slate-500">Sanitized event summaries for review and correlation.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:w-auto">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
              Severity
              <select
                value={severityFilter}
                onChange={(event) => {
                  setEventsPage(1);
                  setSeverityFilter(event.target.value as SeverityFilter);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0B1B48] outline-none transition-colors focus:border-accent"
              >
                {severityOptions.map((severity) => (
                  <option key={severity || 'all'} value={severity}>
                    {severity ? severity : 'All severities'}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
              Event type
              <input
                value={eventTypeFilter}
                onChange={(event) => {
                  setEventsPage(1);
                  setEventTypeFilter(event.target.value);
                }}
                placeholder="auth.login_failed"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0B1B48] outline-none transition-colors focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
              Limit
              <select
                value={eventsLimit}
                onChange={(event) => {
                  setEventsPage(1);
                  setEventsLimit(parseInt(event.target.value, 10));
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0B1B48] outline-none transition-colors focus:border-accent"
              >
                {[10, 25, 50, 100].map((limit) => (
                  <option key={limit} value={limit}>{limit}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {eventsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{eventsError}</div>
        )}

        <DataTable
          data={events}
          columns={eventColumns}
          keyExtractor={(event) => event.id}
          loading={eventsLoading}
          emptyMessage="No security events found"
          renderMobileCard={(event) => (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">{formatDate(event.createdAt)}</span>
                <SeverityBadge severity={event.severity} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-xs font-semibold text-[#0B1B48]">{event.eventType}</span>
                <span className="text-xs text-slate-500">
                  <span className="font-semibold">{event.method || '-'}</span> {event.route || '-'}
                </span>
              </div>
              {event.metadataSummary && Object.entries(event.metadataSummary).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(event.metadataSummary).map(([key, value]) => (
                    <span key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">{key}:</span> {formatMetadataValue(value)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        />

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm shadow-slate-200/80 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Page {eventsPagination.page} of {eventsPagination.totalPages} · {eventsPagination.total} events
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setEventsPage((current) => Math.max(1, current - 1))}
              disabled={eventsPagination.page <= 1 || eventsLoading}
              className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              onClick={() => setEventsPage((current) => Math.min(eventsPagination.totalPages, current + 1))}
              disabled={eventsPagination.page >= eventsPagination.totalPages || eventsLoading}
              className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="hidden sm:inline">Next</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
