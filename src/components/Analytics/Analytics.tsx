import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useProductivityMetrics, useTaskAnalytics } from '../../hooks/useAnalytics';
import { useTasks } from '../../hooks/useTasks';
import { useTodaySessions } from '../../hooks/useWorkSessions';
import { formatDuration } from '../../utils/helpers';

export const Analytics = () => {
  const { data: metrics } = useProductivityMetrics();
  const { data: analytics } = useTaskAnalytics();
  const { data: tasks } = useTasks();
  const { data: sessions } = useTodaySessions();

  const totalTasks = Array.isArray(tasks) ? tasks.length : 0;
  const completedTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'completed').length : 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalFocusTime = sessions?.reduce((sum, s) => sum + s.duration, 0) || 0;

  const stats = [
    {
      label: 'Daily Score',
      value: `${metrics?.daily_score || 0}/100`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Tasks Completed',
      value: completedTasks.toString(),
      icon: CheckCircle,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Focus Time',
      value: formatDuration(totalFocusTime),
      icon: Clock,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      icon: BarChart3,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Missed Deadlines',
      value: (analytics?.overdue_count || 0).toString(),
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900 mb-1">Analytics</h2>
        <p className="text-gray-500 text-sm">Track your productivity and progress</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl border border-gray-200 p-5"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Task Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <h3 className="text-base font-semibold text-gray-900 mb-4">Task Breakdown</h3>
        <div className="space-y-3">
          {[
            { label: 'Completed', count: completedTasks, color: 'bg-green-500', total: totalTasks },
            { label: 'In Progress', count: Array.isArray(tasks) ? tasks.filter(t => t.status === 'in_progress').length : 0, color: 'bg-blue-500', total: totalTasks },
            { label: 'Pending', count: Array.isArray(tasks) ? tasks.filter(t => t.status === 'pending').length : 0, color: 'bg-amber-500', total: totalTasks },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-24">{item.label}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full transition-all duration-500`}
                  style={{ width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 w-8 text-right">{item.count}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Sessions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
      >
        <div className="p-6 pb-3">
          <h3 className="text-base font-semibold text-gray-900">Recent Focus Sessions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-b border-gray-100">
                <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
              </tr>
            </thead>
            <tbody>
              {sessions && sessions.length > 0 ? sessions.slice(0, 10).map((session, i) => (
                <tr key={session.id || i} className="border-b border-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-700">
                    {new Date(session.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700">{formatDuration(session.duration)}</td>
                  <td className="px-3 py-3">
                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-emerald-100 text-emerald-700">
                      {session.session_type || 'focus'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-400">
                    No focus sessions yet. Start a timer!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};
