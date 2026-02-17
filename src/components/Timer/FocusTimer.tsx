import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Clock, CheckCircle } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useStartSession, useEndSession } from '../../hooks/useWorkSessions';
import { useAppStore } from '../../store/appStore';
import toast from 'react-hot-toast';

type TimerMode = 'pomodoro' | 'short_break' | 'long_break';

const TIMER_DURATIONS: Record<TimerMode, number> = {
  pomodoro: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

export const FocusTimer = () => {
  const { data: tasks } = useTasks();
  const startSession = useStartSession();
  const endSession = useEndSession();
  const currentSession = useAppStore((state) => state.currentSession);

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.pomodoro);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  const activeTasks = Array.isArray(tasks)
    ? tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress')
    : [];

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          toast.success('Timer completed!');
          if (currentSession) {
            endSession.mutate({ sessionId: currentSession.id, completed: true });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, currentSession, endSession]);

  const handleStart = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
      if (mode === 'pomodoro') {
        startSession.mutate({
          taskId: selectedTaskId || null,
          duration: TIMER_DURATIONS.pomodoro,
          sessionType: 'pomodoro',
        });
      }
    } else {
      setIsRunning(false);
    }
  }, [isRunning, mode, selectedTaskId, startSession]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(TIMER_DURATIONS[mode]);
    if (currentSession) {
      endSession.mutate({ sessionId: currentSession.id, completed: false });
    }
  }, [mode, currentSession, endSession]);

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(TIMER_DURATIONS[newMode]);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = 1 - timeLeft / TIMER_DURATIONS[mode];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900 mb-1">Focus Timer</h2>
        <p className="text-gray-500 text-sm">Stay focused and productive</p>
      </div>

      {/* Mode selector */}
      <div className="flex items-center justify-center gap-2">
        {(['pomodoro', 'short_break', 'long_break'] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              mode === m
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {m === 'pomodoro' ? 'Pomodoro' : m === 'short_break' ? 'Short Break' : 'Long Break'}
          </button>
        ))}
      </div>

      {/* Timer display */}
      <div className="flex justify-center">
        <div className="relative w-64 h-64">
          <svg className="w-64 h-64 transform -rotate-90" viewBox="0 0 256 256">
            <circle cx="128" cy="128" r="110" stroke="#f3f4f6" strokeWidth="8" fill="none" />
            <circle
              cx="128" cy="128" r="110"
              stroke="#10b981"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${progress * 691.15} ${691.15 - progress * 691.15}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-gray-900 tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-xs text-gray-400 uppercase tracking-wider mt-1">
              {mode.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleReset}
          className="p-3 rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStart}
          className="px-8 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200 flex items-center gap-2"
        >
          {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {isRunning ? 'Pause' : 'Start'}
        </motion.button>
      </div>

      {/* Task selector */}
      {mode === 'pomodoro' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            Focus on task
          </label>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full mt-2 px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
          >
            <option value="">No specific task</option>
            {activeTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>

          {activeTasks.length === 0 && (
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              All tasks completed!
            </p>
          )}
        </div>
      )}
    </div>
  );
};
