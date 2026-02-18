import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasks } from '../../hooks/useTasks';
import { AIService } from '../../services/aiService';
import {
  Sparkles, Lightbulb, TrendingUp, AlertTriangle, Loader2,
  Brain, Target, Zap, Calendar, Clock, BarChart3, ArrowRight,
  CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronUp,
  Flame, Award, Activity,
} from 'lucide-react';

export const AIInsights = () => {
  const { data: tasks } = useTasks();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [dailyPlan, setDailyPlan] = useState<{ id: string; title: string; priority: string; estimated_time?: number }[]>([]);
  const [productivityScore, setProductivityScore] = useState<ReturnType<typeof AIService.calculateProductivityScore> | null>(null);
  const [patterns, setPatterns] = useState<ReturnType<typeof AIService.analyzePatterns> | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('daily-plan');
  const [hasGenerated, setHasGenerated] = useState(false);

  // Auto-calculate productivity score when tasks load
  useEffect(() => {
    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      setProductivityScore(AIService.calculateProductivityScore(tasks));
      setPatterns(AIService.analyzePatterns(tasks));
    }
  }, [tasks]);

  const generateInsights = async () => {
    if (!tasks || !Array.isArray(tasks)) return;
    setLoading(true);
    try {
      const [missedInsights, weeklySuggestions, plan] = await Promise.all([
        AIService.analyzeMissedTasks(tasks),
        AIService.getWeeklySuggestions(tasks),
        AIService.generateDailyPlan(tasks),
      ]);
      setInsights(missedInsights);
      setSuggestions(weeklySuggestions);
      setDailyPlan(plan);
      setHasGenerated(true);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (id: string) => setExpandedSection((prev) => (prev === id ? null : id));

  const taskList = tasks && Array.isArray(tasks) ? tasks : [];
  const totalTasks = taskList.length;
  const completedTasks = taskList.filter((t) => t.status === 'completed').length;
  const inProgressTasks = taskList.filter((t) => t.status === 'in_progress').length;
  const overdueTasks = taskList.filter((t) => {
    if (t.status === 'completed' || !t.due_date) return false;
    const due = t.due_date instanceof Date ? t.due_date : new Date(t.due_date as unknown as string);
    return due < new Date();
  }).length;

  const priorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'text-red-500 bg-red-50 border-red-100';
      case 'high': return 'text-orange-500 bg-orange-50 border-orange-100';
      case 'medium': return 'text-blue-500 bg-blue-50 border-blue-100';
      default: return 'text-gray-500 bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-linear-to-br from-amber-50 to-orange-50 border border-amber-100">
              <Brain className="w-6 h-6 text-amber-500" />
            </div>
            AI Insights
          </h1>
          <p className="text-gray-500 text-sm mt-1 ml-14">Smart analysis of your productivity patterns and tasks</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={generateInsights}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
          ) : (
            <>{hasGenerated ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />} {hasGenerated ? 'Refresh' : 'Generate Insights'}</>
          )}
        </motion.button>
      </div>

      {/* Productivity Score + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Productivity Score Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Productivity Score</h3>
          </div>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none"
                  stroke={(productivityScore?.score || 0) >= 80 ? '#10b981' : (productivityScore?.score || 0) >= 60 ? '#3b82f6' : (productivityScore?.score || 0) >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${((productivityScore?.score || 0) / 100) * 97.4} 97.4`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{productivityScore?.score || 0}</span>
                <span className="text-xs text-gray-500 font-medium">{productivityScore?.level || 'N/A'}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2 rounded-xl bg-emerald-50/60">
              <p className="text-lg font-bold text-emerald-600">{productivityScore?.completedToday || 0}</p>
              <p className="text-[10px] text-gray-500 font-medium">Done Today</p>
            </div>
            <div className="p-2 rounded-xl bg-orange-50/60">
              <p className="text-lg font-bold text-orange-600">{productivityScore?.streakDays || 0}</p>
              <p className="text-[10px] text-gray-500 font-medium">Day Streak</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats Grid */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatsCard icon={Target} label="Total Tasks" value={totalTasks} color="blue" />
          <StatsCard icon={CheckCircle2} label="Completed" value={completedTasks} color="green" />
          <StatsCard icon={Activity} label="In Progress" value={inProgressTasks} color="amber" />
          <StatsCard icon={XCircle} label="Overdue" value={overdueTasks} color="red" />
          <div className="col-span-2 sm:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <PatternCard icon={Calendar} label="Peak Day" value={patterns?.peakDay || 'N/A'} sub="Most productive" />
            <PatternCard icon={BarChart3} label="Daily Avg" value={`${patterns?.avgTasksPerDay || 0}`} sub="Tasks per day" />
            <PatternCard icon={Flame} label="Burnout Risk" value={patterns?.burnoutRisk || 'low'}
              sub={patterns?.burnoutRisk === 'high' ? 'Take a break!' : patterns?.burnoutRisk === 'medium' ? 'Watch out' : 'Looking good'}
              valueColor={patterns?.burnoutRisk === 'high' ? 'text-red-600' : patterns?.burnoutRisk === 'medium' ? 'text-amber-600' : 'text-emerald-600'}
            />
            <PatternCard icon={Zap} label="Top Category" value={patterns?.mostProductiveCategory || 'General'} sub="Most tasks" />
          </div>
        </motion.div>
      </div>

      {/* Loading */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Brain className="w-8 h-8 text-amber-500 animate-pulse" />
              </div>
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin absolute -top-1 -right-1" />
            </div>
            <p className="text-gray-600 font-medium mt-4">Analyzing your tasks...</p>
            <p className="text-gray-400 text-sm mt-1">Running AI analysis on {totalTasks} tasks</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Content */}
      {!loading && hasGenerated && (
        <div className="space-y-4">
          {dailyPlan.length > 0 && (
            <CollapsibleSection id="daily-plan" icon={TrendingUp} iconColor="text-emerald-500" iconBg="bg-emerald-50 border-emerald-100"
              title="AI-Generated Daily Plan" subtitle={`${dailyPlan.length} tasks optimized for today`}
              expanded={expandedSection === 'daily-plan'} onToggle={() => toggleSection('daily-plan')}>
              <div className="space-y-2">
                {dailyPlan.map((task, index) => (
                  <motion.div key={task.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50/80 border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0">{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md border ${priorityColor(task.priority)}`}>{task.priority}</span>
                        {task.estimated_time && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{task.estimated_time}m</span>}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </motion.div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {insights.length > 0 && (
            <CollapsibleSection id="insights" icon={AlertTriangle} iconColor="text-orange-500" iconBg="bg-orange-50 border-orange-100"
              title="Task Analysis" subtitle={`${insights.length} insight${insights.length > 1 ? 's' : ''} found`}
              expanded={expandedSection === 'insights'} onToggle={() => toggleSection('insights')}>
              <div className="space-y-2">
                {insights.map((insight, index) => (
                  <motion.div key={index} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-orange-50/40 border border-orange-100/60">
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
                  </motion.div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {suggestions.length > 0 && (
            <CollapsibleSection id="suggestions" icon={Lightbulb} iconColor="text-amber-500" iconBg="bg-amber-50 border-amber-100"
              title="Weekly Improvement Suggestions" subtitle={`${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''}`}
              expanded={expandedSection === 'suggestions'} onToggle={() => toggleSection('suggestions')}>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <motion.div key={index} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/40 border border-amber-100/60">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700 leading-relaxed">{suggestion}</p>
                  </motion.div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && !hasGenerated && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-linear-to-br from-amber-50 to-orange-50 border border-amber-100 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">AI-Powered Insights</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            Click "Generate Insights" to get a personalized daily plan, task analysis, and weekly improvement suggestions.
          </p>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={generateInsights}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5" /> Generate Insights
          </motion.button>
        </motion.div>
      )}
    </div>
  );
};

// ─── Sub Components ───

function StatsCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: 'blue' | 'green' | 'amber' | 'red' }) {
  const colors = {
    blue: 'from-blue-50 to-indigo-50 border-blue-100 text-blue-600',
    green: 'from-emerald-50 to-green-50 border-emerald-100 text-emerald-600',
    amber: 'from-amber-50 to-yellow-50 border-amber-100 text-amber-600',
    red: 'from-red-50 to-pink-50 border-red-100 text-red-600',
  };
  const iconColors = { blue: 'text-blue-500', green: 'text-emerald-500', amber: 'text-amber-500', red: 'text-red-500' };
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className={`bg-linear-to-br ${colors[color]} border rounded-2xl p-4 shadow-sm`}>
      <Icon className={`w-5 h-5 ${iconColors[color]} mb-2`} />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
    </motion.div>
  );
}

function PatternCard({ icon: Icon, label, value, sub, valueColor }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; valueColor?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-sm font-bold capitalize ${valueColor || 'text-gray-900'}`}>{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function CollapsibleSection({ icon: Icon, iconColor, iconBg, title, subtitle, children, expanded, onToggle }: {
  id: string; icon: React.ComponentType<{ className?: string }>; iconColor: string; iconBg: string;
  title: string; subtitle: string; children: React.ReactNode;
  expanded: boolean; onToggle: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50/50 transition-colors">
        <div className={`p-2 rounded-xl border ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
