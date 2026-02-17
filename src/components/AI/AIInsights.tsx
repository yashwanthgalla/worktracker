import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTasks } from '../../hooks/useTasks';
import { AIService } from '../../services/aiService';
import { Sparkles, Lightbulb, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';

export const AIInsights = () => {
  const { data: tasks } = useTasks();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [dailyPlan, setDailyPlan] = useState<{ id: string; title: string; priority: string; estimated_time?: number }[]>([]);

  const generateInsights = async () => {
    if (!tasks || !Array.isArray(tasks)) return;
    setLoading(true);

    try {
      const missedInsights = await AIService.analyzeMissedTasks(tasks);
      const weeklySuggestions = await AIService.getWeeklySuggestions(tasks);
      const plan = await AIService.generateDailyPlan(tasks);

      setInsights(missedInsights);
      setSuggestions(weeklySuggestions);
      setDailyPlan(plan);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-text-primary mb-1 flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-100">
              <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
            AI Insights
          </h1>
          <p className="text-text-tertiary text-[0.9375rem] ml-14">
            Get intelligent recommendations powered by AI
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={generateInsights}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Insights
            </>
          )}
        </motion.button>
      </div>

      {/* Daily Plan */}
      {dailyPlan.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h3 className="text-[1.0625rem] font-semibold text-text-primary mb-2 flex items-center gap-2">
            <TrendingUp className="w-4.5 h-4.5 text-rose-500" />
            AI-Generated Daily Plan
          </h3>
          <p className="text-text-tertiary text-[0.8125rem] mb-5">
            Optimized task sequence based on priority, deadlines, and estimated time
          </p>
          <div className="space-y-2.5">
            {dailyPlan.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className="rounded-2xl p-4 flex items-center gap-4 bg-black/2 border border-black/4"
              >
                <div className="w-9 h-9 rounded-full bg-text-primary text-white flex items-center justify-center text-[0.8125rem] font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="text-[0.9375rem] font-medium text-text-primary mb-0.5">{task.title}</h4>
                  <div className="flex items-center gap-2 text-[0.75rem] text-text-tertiary">
                    <span className="capitalize px-2 py-0.5 rounded-full bg-black/4 border border-black/6 text-text-secondary">
                      {task.priority}
                    </span>
                    {task.estimated_time && (
                      <span>{task.estimated_time}m</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Weekly Suggestions */}
      {suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h3 className="text-[1.0625rem] font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Lightbulb className="w-4.5 h-4.5 text-amber-500" />
            Weekly Improvement Suggestions
          </h3>
          <div className="space-y-2.5">
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className="rounded-2xl p-4 flex items-start gap-3 bg-black/2 border border-black/4"
              >
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[0.875rem] text-text-secondary leading-relaxed">{suggestion}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Task Analysis */}
      {insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h3 className="text-[1.0625rem] font-semibold text-text-primary mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4.5 h-4.5 text-orange-500" />
            Task Analysis & Insights
          </h3>
          <div className="space-y-2.5">
            {insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className="rounded-2xl p-4 flex items-start gap-3 bg-black/2 border border-black/4"
              >
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-[0.875rem] text-text-secondary leading-relaxed">{insight}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {insights.length === 0 && suggestions.length === 0 && dailyPlan.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-semibold text-text-primary mb-1.5">AI-Powered Insights</h3>
          <p className="text-text-tertiary text-[0.9375rem] mb-6">
            Click the button above to generate personalized insights and recommendations
          </p>
        </motion.div>
      )}
    </div>
  );
};
