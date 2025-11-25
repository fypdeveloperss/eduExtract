import React, { useEffect, useState, useMemo } from 'react';
import api from '../utils/axios';
import {
  Activity,
  AlertTriangle,
  Cpu,
  Gauge,
  RefreshCw,
  ShieldCheck,
  Zap,
  Target,
  Clock,
  TrendingUp
} from 'lucide-react';

const formatNumber = (value, fallback = '—') => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return fallback;
  }
  if (Number(value) >= 1000) {
    return Number(value).toLocaleString();
  }
  return Number(value).toString();
};

const formatPercent = (value, fallback = '—%') => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return fallback;
  }
  return `${Number(value).toFixed(1)}%`;
};

const AdminAIMonitor = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics(false);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
      setError('');
    }
    try {
      const response = await api.get('/api/admin/ai-metrics');
      setMetrics(response.data || {});
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load AI metrics right now.');
    } finally {
      setLoading(false);
    }
  };

  const contentBreakdown = useMemo(() => {
    if (!metrics?.byContentType) return [];
    return Object.entries(metrics.byContentType).map(([type, data]) => ({
      type,
      count: data.count || 0,
      success: data.success || 0,
      avgTime: data.avgTime || 0,
      trend: data.trend || 0
    }));
  }, [metrics]);

  const totalRequests = metrics?.totalGenerations || 0;
  const successRate = metrics?.successRate || 0;
  const errorRate = metrics?.errorRate || 0;
  const averageResponse = metrics?.averageResponseTime || 0;
  const tokenUsage = metrics?.totalTokensUsed || 0;

  const healthScore = Math.max(
    40,
    Math.min(
      99,
      successRate * 0.6 + (100 - errorRate) * 0.3 + Math.max(0, 1200 - averageResponse) * 0.02
    )
  );

  const latencyStatus =
    averageResponse < 1500 ? 'Optimal' : averageResponse < 2500 ? 'Acceptable' : 'Degraded';

  const pulseInsights = [
    {
      label: 'System Health',
      value: `${Math.round(healthScore)}%`,
      icon: ShieldCheck,
      hint: successRate > 80 ? 'Models are stable' : 'Monitor error clusters',
      accent: 'from-emerald-500/20 via-emerald-500/10 to-transparent'
    },
    {
      label: 'Latency',
      value: `${averageResponse} ms`,
      icon: Clock,
      hint: `Pipeline latency is ${latencyStatus.toLowerCase()}`,
      accent: 'from-sky-500/20 via-sky-500/10 to-transparent'
    },
    {
      label: 'Error Rate',
      value: formatPercent(errorRate),
      icon: AlertTriangle,
      hint: errorRate > 5 ? 'Spike detected' : 'Within safe margins',
      accent: 'from-rose-500/20 via-rose-500/10 to-transparent'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#17171766] dark:text-[#fafafa66]">
            Live Ops
          </p>
          <h1 className="text-3xl font-bold text-[#171717] dark:text-white">
            AI Monitoring Suite
          </h1>
          <p className="text-sm text-[#17171799] dark:text-[#fafafacc] max-w-2xl mt-2">
            Monitor generation throughput, latency, and stability across every AI workflow in real
            time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchMetrics()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-[#2E2E2E] px-4 py-2 text-sm font-semibold text-[#171717] dark:text-white hover:bg-gray-50 dark:hover:bg-[#1f1f1f]"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-gradient-to-br from-[#171717] via-[#0f0f0f] to-[#050505] text-white p-6 shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_65%)]" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.3em] text-white/60">Signal Pulse</p>
              <span className="text-xs text-white/60">
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Awaiting data'}
              </span>
            </div>
            <h2 className="text-4xl font-bold">{Math.round(healthScore)}%</h2>
            <p className="text-sm text-white/70">
              Combined score based on success rate, latency, and error pressure across AI pipelines.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs text-white/60">Total Requests</p>
                <p className="text-2xl font-semibold mt-1">{formatNumber(totalRequests)}</p>
                <p className="text-xs text-emerald-300 mt-1">24h rolling window</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs text-white/60">Tokens Used</p>
                <p className="text-2xl font-semibold mt-1">{formatNumber(tokenUsage)}</p>
                <p className="text-xs text-white/70 mt-1">All content types</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {pulseInsights.map((insight) => (
            <div
              key={insight.label}
              className={`rounded-2xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#1a1a1a] p-4 shadow relative overflow-hidden`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${insight.accent}`} />
              <div className="relative flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gray-100 dark:bg-[#222222]">
                  <insight.icon className="w-5 h-5 text-[#171717] dark:text-white" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#17171766] dark:text-[#fafafa66]">
                    {insight.label}
                  </p>
                  <p className="text-xl font-semibold text-[#171717] dark:text-white">
                    {insight.value}
                  </p>
                  <p className="text-xs text-[#17171799] dark:text-[#fafafacc]">{insight.hint}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-6 shadow-lg">
          <p className="text-sm font-semibold text-[#171717] dark:text-white">Pipeline Mix</p>
          <p className="text-xs text-[#17171799] dark:text-[#fafafacc] mb-4">
            Distribution of AI workloads by content type.
          </p>
          <div className="space-y-3">
            {contentBreakdown.length === 0 && (
              <p className="text-sm text-[#17171799] dark:text-[#fafafacc]">No data available.</p>
            )}
            {contentBreakdown.map((item) => (
              <div key={item.type}>
                <div className="flex items-center justify-between text-sm text-[#171717] dark:text-white">
                  <span className="capitalize font-semibold">{item.type}</span>
                  <span className="text-xs text-[#17171799] dark:text-[#fafafacc]">
                    {formatNumber(item.count)} req • {item.avgTime}ms
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-[#2E2E2E] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                    style={{
                      width: `${Math.min(100, (item.count / Math.max(totalRequests, 1)) * 100)}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#171717] dark:text-white">Performance</h3>
            <Cpu className="w-5 h-5 text-[#17171799] dark:text-[#fafafacc]" />
          </div>
          <ul className="space-y-4">
            <PerformanceRow
              icon={Gauge}
              label="Average response time"
              value={`${averageResponse} ms`}
              trend={latencyStatus}
            />
            <PerformanceRow
              icon={Zap}
              label="Throughput"
              value={`${formatNumber(totalRequests)} req`}
              trend="24h rolling"
            />
            <PerformanceRow
              icon={Activity}
              label="Success rate"
              value={formatPercent(successRate)}
              trend={successRate > 85 ? 'Healthy' : 'Investigate'}
            />
            <PerformanceRow
              icon={AlertTriangle}
              label="Error pressure"
              value={formatPercent(errorRate)}
              trend={errorRate > 5 ? 'High' : 'Nominal'}
            />
          </ul>
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#171717] dark:text-white">Content Pipelines</h3>
            <Target className="w-5 h-5 text-[#17171799] dark:text-[#fafafacc]" />
          </div>
          <div className="space-y-3">
            {contentBreakdown.map((item) => (
              <div
                key={item.type}
                className="flex items-center justify-between rounded-2xl border border-gray-100 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1f1f1f] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#171717] dark:text-white capitalize">
                    {item.type}
                  </p>
                  <p className="text-xs text-[#17171799] dark:text-[#fafafacc]">
                    {formatNumber(item.success)} successful • {item.avgTime}ms avg
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    item.trend > 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : item.trend < 0
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-[#2E2E2E] dark:text-[#fafafa]'
                  }`}
                >
                  {item.trend > 0 ? '+' : ''}
                  {item.trend}%
                </span>
              </div>
            ))}
            {contentBreakdown.length === 0 && (
              <p className="text-sm text-[#17171799] dark:text-[#fafafacc]">No breakdown data.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#171717] dark:text-white">Alerts & Issues</h3>
            <TrendingUp className="w-5 h-5 text-[#17171799] dark:text-[#fafafacc]" />
          </div>
          <div className="space-y-3">
            <AlertRow
              title="Latency watchdog"
              status={latencyStatus}
              description={
                latencyStatus === 'Degraded'
                  ? 'Investigate queue depth and GPU load.'
                  : 'Response time is within target thresholds.'
              }
            />
            <AlertRow
              title="Error anomalies"
              status={errorRate > 5 ? 'Elevated' : 'Clear'}
              description={
                errorRate > 5
                  ? 'Spike detected across pipelines. Review logs.'
                  : 'No unusual error patterns detected.'
              }
            />
            <AlertRow
              title="Usage pressure"
              status={totalRequests > 2000 ? 'High' : 'Normal'}
              description={
                totalRequests > 2000
                  ? 'Throughput nearing capacity. Monitor quotas.'
                  : 'Ample headroom available.'
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const PerformanceRow = ({ icon: Icon, label, value, trend }) => (
  <li className="flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-[#1f1f1f] border border-gray-100 dark:border-[#2E2E2E] p-3">
    <div className="p-2 rounded-xl bg-white dark:bg-[#2E2E2E]">
      <Icon className="w-4 h-4 text-[#171717] dark:text-white" />
    </div>
    <div className="flex-1">
      <p className="text-sm font-semibold text-[#171717] dark:text-white">{label}</p>
      <p className="text-xs text-[#17171799] dark:text-[#fafafacc]">{trend}</p>
    </div>
    <span className="text-sm font-semibold text-[#171717] dark:text-white">{value}</span>
  </li>
);

const AlertRow = ({ title, status, description }) => {
  const isCritical = status === 'Elevated' || status === 'Degraded' || status === 'High';
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1f1f1f] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#171717] dark:text-white">{title}</p>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            isCritical
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
          }`}
        >
          {status}
        </span>
      </div>
      <p className="text-xs text-[#17171799] dark:text-[#fafafacc] mt-2">{description}</p>
    </div>
  );
};

export default AdminAIMonitor;

