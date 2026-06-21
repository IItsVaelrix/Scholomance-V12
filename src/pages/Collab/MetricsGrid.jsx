/**
 * MetricsGrid — Display collaboration metrics at a glance
 * Adapted from PixelBrain AnalysisResults
 */

import { motion, useReducedMotion } from 'framer-motion';
import {
  MetricsIcon,
  ZapIcon,
  LayersIcon,
  GridIcon,
  WarningIcon,
  CheckIcon
} from "../../components/Icons.jsx";

const METRIC_CONFIG = {
  agents: {
    label: 'Agent Presence',
    icon: MetricsIcon,
    format: (value) => `${value.connected} live / ${value.disconnected} down`,
    state: (value) => value.disconnected > value.connected ? 'warning' : 'healthy',
    trend: (value) => value.connected >= value.disconnected ? 'stable' : 'watch'
  },
  tasks: {
    label: 'Active Tasks',
    icon: ZapIcon,
    format: (value) => `${value.active} / ${value.total}`,
    state: (value) => value.active > 0 ? 'info' : 'healthy',
    trend: (value) => value.active > 0 ? 'rising' : 'clear'
  },
  pipelines: {
    label: 'Running Pipelines',
    icon: LayersIcon,
    format: (value) => `${value.running} active`,
    state: (value) => value.running > 0 ? 'healthy' : 'info',
    trend: (value) => value.running > 0 ? 'flow' : 'quiet'
  },
  locks: {
    label: 'File Locks',
    icon: GridIcon,
    format: (value) => `${value.active} locked`,
    state: (value) => value.active > 6 ? 'warning' : 'healthy',
    trend: (value) => value.active > 0 ? 'held' : 'clear'
  },
  bugs: {
    label: 'Bug Artifacts',
    icon: WarningIcon,
    format: (value) => `${value.critical} crit / ${value.total} total`,
    state: (value) => value.critical > 0 ? 'critical' : value.total > 0 ? 'warning' : 'healthy',
    trend: (value) => value.critical > 0 ? 'critical' : 'contained'
  },
  blocked: {
    label: 'Blocked Items',
    icon: WarningIcon,
    format: (value) => `${value.count} blocked`,
    state: (value) => value.count > 0 ? 'warning' : 'healthy',
    trend: (value) => value.count > 0 ? 'blocked' : 'clear'
  },
  completed: {
    label: 'Completed Today',
    icon: CheckIcon,
    format: (value) => `${value.count} done`,
    state: () => 'healthy',
    trend: (value) => value.count > 0 ? 'up' : 'idle'
  },
  mcp_port: {
    label: 'MCP Port Status',
    icon: ZapIcon,
    format: (value) => `${value.throughput || 0} kb/s · ${value.active_bindings || 0} binds`,
    state: (value) => value.active_bindings > 0 ? 'healthy' : 'info',
    trend: (value) => value.active_bindings > 0 ? 'bound' : 'listening'
  }
};

export default function MetricsGrid({ metrics }) {
  const reduceMotion = useReducedMotion();
  if (!metrics) return null;

  return (
    <motion.div
      className="metrics-grid"
      role="list"
      aria-label="Collaboration metrics"
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: reduceMotion ? 0 : 0.04
          }
        }
      }}
    >
      {Object.entries(metrics).map(([key, value]) => {
        const config = METRIC_CONFIG[key];
        if (!config) return null;
        
        const Icon = config.icon;
        const state = config.state ? config.state(value) : 'info';
        const trend = config.trend ? config.trend(value) : 'steady';
        
        return (
          <motion.div 
            key={key} 
            className={`metric-card metric-card--${state}`}
            role="listitem"
            aria-label={`${config.label}: ${config.format(value)}, ${trend}`}
            variants={{
              hidden: { opacity: 0, y: 15 },
              visible: { opacity: 1, y: 0 }
            }}
            whileHover={reduceMotion ? undefined : { scale: 1.02 }}
          >
            <div className="metric-icon-shell" aria-hidden="true">
              <Icon className="metric-icon" />
            </div>
            <div className="metric-content">
              <span className="metric-label">{config.label}</span>
              <span className="metric-value">
                {config.format(value)}
              </span>
              <span className="metric-trend">
                <span className="metric-trend__mark" aria-hidden="true">↑</span>
                {trend}
              </span>
              <span className="metric-sparkline" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
