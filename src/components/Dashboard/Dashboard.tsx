import { useState, useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useProductivityMetrics, useTaskAnalytics } from '../../hooks/useAnalytics';
import { useTasks } from '../../hooks/useTasks';
import { useTodaySessions } from '../../hooks/useWorkSessions';
import { useRealTimeClock, useProductivityScore, useSmoothScroll } from '../../hooks/useScrollEffects';
import { DashboardScene } from '../3D/SceneComponents';
import {
  Clock, ArrowUpRight, CheckCircle, Timer, TrendingUp,
  Zap, Target, BarChart3, Brain, Flame,
  ChevronRight, Sparkles, ArrowRight,
} from 'lucide-react';
import { formatDuration } from '../../utils/helpers';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export const Dashboard = () => {
  const { data: metrics } = useProductivityMetrics();
  const { data: analytics } = useTaskAnalytics();
  const { data: tasks } = useTasks();
  const { data: sessions } = useTodaySessions();
  const user = useAppStore((state) => state.user);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useSmoothScroll(scrollRef);
  const currentTime = useRealTimeClock();
  const { score: productivityScore, trend: scoreTrend } = useProductivityScore(tasks as any[], sessions as any[]);

  const activeTasks = Array.isArray(tasks) ? tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length : 0;
  const completedToday = Array.isArray(tasks) ? tasks.filter((t) => t.status === 'completed' && t.completed_at && new Date(t.completed_at).toDateString() === new Date().toDateString()).length : 0;
  const totalTasks = Array.isArray(tasks) ? tasks.length : 0;
  const completedTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'completed').length : 0;
  const pendingTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'pending').length : 0;
  const inProgressTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'in_progress').length : 0;
  const overdueTasks = analytics?.overdue_count || 0;
  const totalFocusTime = sessions?.reduce((sum, s) => sum + s.duration, 0) || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const todayProgress = activeTasks + completedToday > 0 ? Math.round((completedToday / (activeTasks + completedToday)) * 100) : 0;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const greeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const recentTasks = Array.isArray(tasks) ? tasks.filter(t => t.status !== 'completed').slice(0, 5) : [];
  const recentSessions = sessions?.slice(0, 4) || [];

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-amber-500';
      default: return 'bg-gray-400';
    }
  };

  const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayTasks = Array.isArray(tasks) ? tasks.filter(t =>
      t.completed_at && new Date(t.completed_at).toDateString() === date.toDateString()
    ).length : 0;
    return { day: date.toLocaleDateString('en-US', { weekday: 'short' }), count: dayTasks };
  });
  const maxWeekly = Math.max(...weeklyActivity.map(w => w.count), 1);

  return (
    <div ref={scrollRef} className="relative min-h-screen overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
      <Suspense fallback={null}>
        <div className="fixed inset-0 opacity-30 pointer-events-none">
          <DashboardScene scrollProgress={scrollProgress} />
        </div>
      </Suspense>

      <div className="relative z-10 space-y-8 pb-12">
        {/* Hero Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative overflow-hidden rounded-3xl p-8 mesh-gradient-1"
        >
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-sm font-medium text-[#6e6e73] mb-1">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </motion.p>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="text-4xl font-bold text-[#1d1d1f] tracking-tight">
                {greeting()}, <span className="text-gradient">{userName}</span>
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2 text-[#6e6e73] text-base">
                {activeTasks > 0
                  ? <>You have <span className="font-semibold text-[#1d1d1f]">{activeTasks} tasks</span> to focus on today.</>
                  : <><Sparkles className="w-4 h-4 inline mr-1" />All caught up! Great work.</>}
              </motion.p>
            </div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="glass-card px-6 py-4 flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-[#1d1d1f] tabular-nums tracking-tight">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </p>
                <p className="text-xs text-[#86868b]">{currentTime.toLocaleTimeString('en-US', { second: '2-digit' }).split(' ')[0].split(':').pop()}s</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Productivity Score + Quick Stats */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <motion.div variants={fadeUp} className="lg:col-span-4">
            <div className="glass-card p-6 h-full relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400/10 to-blue-400/10 blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">Productivity Score</h3>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${scoreTrend === 'up' ? 'bg-green-50 text-green-600' : scoreTrend === 'down' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500'}`}>
                    {scoreTrend === 'up' ? '↑ Rising' : scoreTrend === 'down' ? '↓ Falling' : '→ Stable'}
                  </span>
                </div>
                <div className="flex items-center justify-center my-4">
                  <div className="relative w-36 h-36">
                    <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" stroke="rgba(0,0,0,0.04)" strokeWidth="8" fill="none" />
                      <circle cx="60" cy="60" r="50" stroke="url(#scoreGrad)" strokeWidth="8" fill="none"
                        strokeDasharray={`${productivityScore * 3.14} ${314 - productivityScore * 3.14}`}
                        strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
                      <defs>
                        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-[#1d1d1f]">{productivityScore}</span>
                      <span className="text-[10px] text-[#86868b] uppercase tracking-widest">Score</span>
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs text-[#86868b]">
                  <Flame className="w-3 h-3 inline text-orange-400 mr-1" />{completedToday} completed today
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Active Tasks', value: activeTasks, icon: Target, color: 'from-blue-500 to-blue-600' },
              { label: 'Completed', value: completedToday, icon: CheckCircle, color: 'from-emerald-500 to-emerald-600' },
              { label: 'Focus Time', value: formatDuration(totalFocusTime), icon: Timer, color: 'from-violet-500 to-violet-600' },
              { label: 'Completion', value: `${completionRate}%`, icon: TrendingUp, color: 'from-amber-500 to-amber-600' },
            ].map((stat) => (
              <motion.div key={stat.label} variants={fadeUp} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="glass-card p-5 relative overflow-hidden group cursor-default">
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 shadow-lg`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-[#1d1d1f] tracking-tight">{stat.value}</p>
                <p className="text-xs text-[#86868b] mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Weekly Activity + Today Progress + Distribution */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <motion.div variants={fadeUp} className="lg:col-span-4">
            <div className="glass-card p-6 h-full">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-[#1d1d1f]">Today's Progress</h3>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${todayProgress >= 80 ? 'bg-green-50 text-green-600' : todayProgress >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>
                  {todayProgress >= 80 ? 'On Track' : todayProgress >= 40 ? 'In Progress' : 'Getting Started'}
                </span>
              </div>
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-28 h-28">
                  <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" stroke="rgba(0,0,0,0.04)" strokeWidth="10" fill="none" />
                    <circle cx="60" cy="60" r="50" stroke="#fbbf24" strokeWidth="10" fill="none"
                      strokeDasharray={`${todayProgress * 3.14} ${314 - todayProgress * 3.14}`}
                      strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-[#1d1d1f]">{todayProgress}%</span>
                    <span className="text-[9px] text-[#86868b] uppercase">Done</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#86868b]">Completed</span><span className="font-semibold text-green-600">{completedToday}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#86868b]">Remaining</span><span className="font-semibold text-[#1d1d1f]">{activeTasks}</span>
                </div>
                {overdueTasks > 0 && <div className="flex items-center justify-between text-xs">
                  <span className="text-red-400">Overdue</span><span className="font-semibold text-red-500">{overdueTasks}</span>
                </div>}
              </div>
              <Link to="/tasks" className="mt-4 block w-full py-2.5 btn-primary text-center text-sm">View Tasks</Link>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="lg:col-span-4">
            <div className="glass-card p-6 h-full">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-[#1d1d1f]">Weekly Activity</h3>
                <BarChart3 className="w-4 h-4 text-[#86868b]" />
              </div>
              <div className="flex items-end justify-between gap-2 h-32 mb-4">
                {weeklyActivity.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max((day.count / maxWeekly) * 100, 8)}%` }}
                      transition={{ delay: i * 0.05, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className={`w-full rounded-lg ${i === 6 ? 'bg-gradient-to-t from-emerald-500 to-emerald-400' : 'bg-gradient-to-t from-gray-200 to-gray-100'}`}
                      style={{ minHeight: '4px' }} />
                    <span className={`text-[10px] ${i === 6 ? 'text-emerald-600 font-semibold' : 'text-[#86868b]'}`}>{day.day}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-[#86868b]">
                <Zap className="w-3 h-3 text-emerald-500" />
                <span>{weeklyActivity.reduce((s, d) => s + d.count, 0)} tasks this week</span>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="lg:col-span-4">
            <div className="glass-card p-6 h-full">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-[#1d1d1f]">Distribution</h3>
                <Link to="/analytics" className="text-xs text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1">Details <ChevronRight className="w-3 h-3" /></Link>
              </div>
              <div className="flex items-center gap-5">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="45" stroke="rgba(0,0,0,0.04)" strokeWidth="14" fill="none" />
                    {(() => {
                      const total = totalTasks || 1;
                      const circumference = 2 * Math.PI * 45;
                      let offset = 0;
                      return [
                        { value: completedTasks, color: '#22c55e' },
                        { value: inProgressTasks, color: '#3b82f6' },
                        { value: pendingTasks, color: '#f59e0b' },
                        { value: overdueTasks, color: '#ef4444' },
                      ].map((seg, i) => {
                        const pct = seg.value / total;
                        const dashLength = pct * circumference;
                        const dashOffset = -offset;
                        offset += dashLength;
                        return <circle key={i} cx="60" cy="60" r="45" stroke={seg.color} strokeWidth="14" fill="none" strokeDasharray={`${dashLength} ${circumference - dashLength}`} strokeDashoffset={dashOffset} strokeLinecap="round" />;
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-[#1d1d1f]">{totalTasks}</span>
                    <span className="text-[8px] text-[#86868b] uppercase">Total</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2.5">
                  {[
                    { label: 'Completed', value: completedTasks, color: 'bg-green-500' },
                    { label: 'In Progress', value: inProgressTasks, color: 'bg-blue-500' },
                    { label: 'Pending', value: pendingTasks, color: 'bg-amber-500' },
                    { label: 'Overdue', value: overdueTasks, color: 'bg-red-500' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-xs text-[#6e6e73] flex-1">{item.label}</span>
                      <span className="text-xs font-semibold text-[#1d1d1f]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Recent Tasks + Sessions */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <motion.div variants={fadeUp} className="glass-card overflow-hidden">
            <div className="p-5 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1d1d1f]">Active Tasks</h3>
              <Link to="/tasks" className="text-xs text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1">See All <ArrowRight className="w-3 h-3" /></Link>
            </div>
            <div className="divide-y divide-black/[0.04]">
              {recentTasks.length > 0 ? recentTasks.map((task) => (
                <motion.div key={task.id} whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }} className="px-5 py-3.5 flex items-center gap-3 transition-colors cursor-pointer">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusDot(task.status)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1d1d1f] truncate">{task.title}</p>
                    <p className="text-xs text-[#86868b]">{task.category || 'General'}</p>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${task.priority === 'high' || task.priority === 'urgent' ? 'bg-red-50 text-red-500' : task.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-500'}`}>{task.priority}</span>
                </motion.div>
              )) : (
                <div className="px-5 py-12 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 flex items-center justify-center"><CheckCircle className="w-7 h-7 text-emerald-400" /></div>
                  <p className="text-sm font-medium text-[#1d1d1f]">All caught up!</p>
                  <p className="text-xs text-[#86868b] mt-1">No active tasks. Create one to get started.</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="glass-card overflow-hidden">
            <div className="p-5 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1d1d1f]">Focus Sessions</h3>
              <Link to="/timer" className="text-xs text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1">Start Timer <ArrowRight className="w-3 h-3" /></Link>
            </div>
            <div className="divide-y divide-black/[0.04]">
              {recentSessions.length > 0 ? recentSessions.map((session, i) => {
                const startDate = new Date(session.started_at);
                const durationMin = Math.round(session.duration / 60);
                const progress = Math.min(durationMin / 120, 1);
                const isToday = startDate.toDateString() === new Date().toDateString();
                return (
                  <motion.div key={session.id || i} whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }} className="px-5 py-3.5 flex items-center gap-3 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center flex-shrink-0">
                      <Timer className="w-5 h-5 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1d1d1f]">
                        {isToday ? 'Today' : startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }} transition={{ delay: 0.2 + i * 0.1, duration: 0.8 }} className="h-full rounded-full bg-gradient-to-r from-violet-400 to-blue-400" />
                        </div>
                        <span className="text-xs font-medium text-[#6e6e73]">{formatDuration(session.duration)}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="px-5 py-12 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-violet-50 flex items-center justify-center"><Timer className="w-7 h-7 text-violet-400" /></div>
                  <p className="text-sm font-medium text-[#1d1d1f]">No sessions yet</p>
                  <p className="text-xs text-[#86868b] mt-1">Start a focus timer to track deep work.</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { to: '/tasks', icon: CheckCircle, title: 'Tasks', desc: 'Manage your work', gradient: 'from-emerald-500 to-teal-600' },
            { to: '/timer', icon: Timer, title: 'Focus', desc: 'Start deep work', gradient: 'from-blue-500 to-indigo-600' },
            { to: '/analytics', icon: BarChart3, title: 'Analytics', desc: 'Track progress', gradient: 'from-violet-500 to-purple-600' },
            { to: '/ai', icon: Brain, title: 'AI Insights', desc: 'Smart analysis', gradient: 'from-orange-500 to-rose-600' },
          ].map((action) => (
            <Link key={action.to} to={action.to}>
              <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }} whileTap={{ scale: 0.98 }} className="glass-card p-5 cursor-pointer group relative overflow-hidden">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-[#1d1d1f] text-sm">{action.title}</h4>
                <p className="text-xs text-[#86868b] mt-0.5">{action.desc}</p>
                <ArrowUpRight className="w-4 h-4 text-[#aeaeb2] absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  );
};
