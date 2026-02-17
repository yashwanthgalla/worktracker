import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useProductivityMetrics, useTaskAnalytics } from '../../hooks/useAnalytics';
import { useTasks } from '../../hooks/useTasks';
import { useTodaySessions } from '../../hooks/useWorkSessions';
import {
  Clock, ArrowUpRight, CheckCircle, Timer, TrendingUp,
  ArrowDownLeft, ChevronDown,
} from 'lucide-react';
import { formatDuration } from '../../utils/helpers';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';

export const Dashboard = () => {
  const { data: productivityMetrics } = useProductivityMetrics();
  const { data: analytics } = useTaskAnalytics();
  const { data: tasks } = useTasks();
  const { data: sessions } = useTodaySessions();
  const user = useAppStore((state) => state.user);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeTasks = Array.isArray(tasks)
    ? tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length
    : 0;

  const completedToday = Array.isArray(tasks)
    ? tasks.filter(
        (t) =>
          t.status === 'completed' &&
          t.completed_at &&
          new Date(t.completed_at as unknown as string).toDateString() === new Date().toDateString()
      ).length
    : 0;

  const totalTasks = Array.isArray(tasks) ? tasks.length : 0;
  const completedTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'completed').length : 0;
  const pendingTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'pending').length : 0;
  const inProgressTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'in_progress').length : 0;
  const overdueTasks = analytics?.overdue_count || 0;

  const totalFocusTime = sessions?.reduce((sum, s) => sum + s.duration, 0) || 0;
  const avgFocusTime = sessions && sessions.length > 0 ? Math.round(totalFocusTime / sessions.length) : 0;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const todayProgress = activeTasks + completedToday > 0 ? Math.round((completedToday / (activeTasks + completedToday)) * 100) : 0;

  const greeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Recent tasks for team-like table
  const recentTasks = Array.isArray(tasks) ? tasks.slice(0, 5) : [];

  // Sessions for working history
  const recentSessions = sessions?.slice(0, 5) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex items-start justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-gray-900"
          >
            {greeting()}, {userName}!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-sm text-gray-500 mt-1"
          >
            You have <span className="text-blue-600 font-medium">{activeTasks} active tasks</span> pending.
          </motion.p>
        </div>

        {/* Current Time Widget */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 bg-gray-900 text-white rounded-xl px-5 py-3"
        >
          <div>
            <p className="text-xs text-gray-400">Current time</p>
            <p className="text-sm font-semibold">{formatDate(currentTime)}, {formatTime(currentTime)}</p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-gray-600 flex items-center justify-center">
            <Clock className="w-5 h-5 text-gray-300" />
          </div>
        </motion.div>
      </div>

      {/* Top Row: Today + Stats + Productivity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Today Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-5 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Today</h3>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              completedToday > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {completedToday > 0 ? 'Active' : 'Idle'}
            </span>
          </div>

          <div className="flex items-center justify-center my-4">
            {/* Donut Chart */}
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" stroke="#f3f4f6" strokeWidth="10" fill="none" />
                <circle
                  cx="60" cy="60" r="50"
                  stroke="#fbbf24"
                  strokeWidth="10"
                  fill="none"
                  strokeDasharray={`${todayProgress * 3.14} ${314 - todayProgress * 3.14}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{todayProgress}%</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">done</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-red-500 font-medium mb-3">
              <Timer className="w-3 h-3 inline mr-1" />
              {activeTasks} tasks remaining
            </p>
            <Link
              to="/tasks"
              className="block w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors text-center"
            >
              View Tasks
            </Link>
          </div>
        </motion.div>

        {/* Middle Stats */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          {/* Average Focus Time */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-gray-200 p-5"
          >
            <div className="flex items-center justify-center mb-3">
              <div className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center">
                <Clock className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">Average Focus</p>
            <p className="text-xl font-bold text-gray-900 text-center">{formatDuration(avgFocusTime)}</p>
          </motion.div>

          {/* Completion Rate */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-gray-200 p-5"
          >
            <div className="flex items-center justify-center mb-3">
              <div className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">Completion Rate</p>
            <p className="text-xl font-bold text-gray-900 text-center">{completionRate}%</p>
          </motion.div>

          {/* Tasks Completed */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl border border-gray-200 p-5"
          >
            <div className="flex items-center justify-center mb-3">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-200 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">Completed Today</p>
            <p className="text-xl font-bold text-gray-900 text-center">{completedToday}</p>
          </motion.div>

          {/* Sessions Today */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-gray-200 p-5"
          >
            <div className="flex items-center justify-center mb-3">
              <div className="w-10 h-10 rounded-full border-2 border-blue-200 flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">Focus Sessions</p>
            <p className="text-xl font-bold text-gray-900 text-center">{sessions?.length || 0}</p>
          </motion.div>
        </div>

        {/* My Productivity - Donut */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">My Productivity</h3>
            <Link to="/analytics" className="text-xs text-blue-600 font-medium hover:text-blue-700">
              View Stats
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-600">{completedTasks} completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-600">{inProgressTasks} in progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                <span className="text-xs text-gray-600">{pendingTasks} pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <span className="text-xs text-gray-600">{overdueTasks} overdue</span>
              </div>
            </div>

            {/* Donut chart */}
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="45" stroke="#f3f4f6" strokeWidth="12" fill="none" />
                {(() => {
                  const total = totalTasks || 1;
                  const circumference = 2 * Math.PI * 45;
                  let offset = 0;
                  const segments = [
                    { value: completedTasks, color: '#22c55e' },
                    { value: inProgressTasks, color: '#3b82f6' },
                    { value: pendingTasks, color: '#f59e0b' },
                    { value: overdueTasks, color: '#ef4444' },
                  ];
                  return segments.map((seg, i) => {
                    const pct = seg.value / total;
                    const dashLength = pct * circumference;
                    const dashOffset = -offset;
                    offset += dashLength;
                    return (
                      <circle
                        key={i}
                        cx="60" cy="60" r="45"
                        stroke={seg.color}
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-gray-900">{totalTasks}</span>
                <span className="text-[9px] text-gray-400">TOTAL</span>
              </div>
            </div>
          </div>

          {/* Score comparison */}
          <div className="mt-4 flex items-center gap-2 text-xs">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            <span className="text-gray-500">
              Score: <span className="font-semibold text-gray-900">{productivityMetrics?.daily_score || 0}/100</span>
            </span>
          </div>
        </motion.div>
      </div>

      {/* Bottom Row: Recent Tasks + Work History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Tasks (like My Team table) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div className="p-5 pb-3">
            <h3 className="text-base font-semibold text-gray-900">Recent Tasks</h3>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                completed
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                in progress
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                pending
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                overdue
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-gray-100">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Task</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Due</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.length > 0 ? recentTasks.map((task) => (
                  <tr key={task.id} className="border-b border-gray-50 hover:bg-gray-25 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getStatusDot(task.status)}`}></div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm truncate max-w-45">{task.title}</p>
                          <p className="text-xs text-gray-400 truncate max-w-45">{task.category || 'General'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-md ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">
                      No tasks yet. Create your first task!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Working History */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div className="p-5 pb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Working History</h3>
            <button className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
              Show all <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-4 px-5 pb-3 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              completed
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              in progress
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              focus time
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-gray-100">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Start</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">End</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.length > 0 ? recentSessions.map((session, i) => {
                  const startDate = new Date(session.started_at);
                  const endDate = session.ended_at ? new Date(session.ended_at) : null;
                  const isToday = startDate.toDateString() === new Date().toDateString();
                  const durationMin = Math.round(session.duration / 60);
                  const maxDuration = 120; // 2 hours as max reference
                  const progress = Math.min(durationMin / maxDuration, 1);

                  return (
                    <tr key={session.id || i} className="border-b border-gray-50 hover:bg-gray-25 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-5">{isToday ? '' : startDate.getDate()}</span>
                          <span className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                            {isToday ? 'Today' : startDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">
                        {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">
                        {endDate
                          ? endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                          : '— Still working —'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="text-right">
                            <p className="text-xs font-medium text-gray-900">{formatDuration(session.duration)}</p>
                          </div>
                          {/* Progress ring */}
                          <div className="relative w-7 h-7">
                            <svg className="w-7 h-7 transform -rotate-90" viewBox="0 0 28 28">
                              <circle cx="14" cy="14" r="11" stroke="#f3f4f6" strokeWidth="2.5" fill="none" />
                              <circle
                                cx="14" cy="14" r="11"
                                stroke={progress >= 0.8 ? '#22c55e' : progress >= 0.5 ? '#3b82f6' : '#f59e0b'}
                                strokeWidth="2.5"
                                fill="none"
                                strokeDasharray={`${progress * 69.1} ${69.1 - progress * 69.1}`}
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">
                      No work sessions yet. Start a focus timer!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/tasks">
          <motion.div
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:border-emerald-200 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Manage Tasks</h4>
                <p className="text-xs text-gray-400">View & organize tasks</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-emerald-500 transition-colors" />
            </div>
          </motion.div>
        </Link>

        <Link to="/timer">
          <motion.div
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Timer className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Start Focus</h4>
                <p className="text-xs text-gray-400">Begin a Pomodoro session</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-blue-500 transition-colors" />
            </div>
          </motion.div>
        </Link>

        <Link to="/analytics">
          <motion.div
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:border-violet-200 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                <TrendingUp className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">View Analytics</h4>
                <p className="text-xs text-gray-400">Track your progress</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-violet-500 transition-colors" />
            </div>
          </motion.div>
        </Link>
      </div>
    </div>
  );
};
