// ═══════════════════════════════════════════════════════════════
// Email templates matching the app's Apple + Sahara AI light theme
// ═══════════════════════════════════════════════════════════════

const brandStyles = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      background-color: #f5f5f7;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .email-card {
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    }
    .header-gradient {
      background: linear-gradient(135deg, #f43f6e 0%, #fb923c 50%, #fbbf24 100%);
      padding: 40px 32px 28px;
      text-align: center;
    }
    .header-gradient h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.3px;
    }
    .header-gradient p {
      color: rgba(255, 255, 255, 0.85);
      font-size: 14px;
      margin: 8px 0 0;
    }
    .logo-icon {
      width: 56px;
      height: 56px;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      font-size: 28px;
    }
    .content {
      padding: 32px;
    }
    .content h2 {
      color: #1d1d1f;
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 8px;
      letter-spacing: -0.2px;
    }
    .content p {
      color: #6e6e73;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 16px;
    }
    .btn-primary {
      display: inline-block;
      background: #1d1d1f;
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 980px;
      letter-spacing: -0.1px;
      transition: background 0.2s;
    }
    .btn-primary:hover {
      background: #333336;
    }
    .btn-gradient {
      display: inline-block;
      background: linear-gradient(135deg, #f43f6e, #fb923c, #fbbf24);
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 980px;
      letter-spacing: -0.1px;
    }
    .info-card {
      background: rgba(0, 0, 0, 0.02);
      border: 1px solid rgba(0, 0, 0, 0.04);
      border-radius: 16px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-card .label {
      color: #86868b;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 4px;
    }
    .info-card .value {
      color: #1d1d1f;
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    .task-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: rgba(0, 0, 0, 0.02);
      border: 1px solid rgba(0, 0, 0, 0.04);
      border-radius: 12px;
      margin-bottom: 8px;
    }
    .task-priority {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .priority-urgent { background: #ef4444; }
    .priority-high { background: #f97316; }
    .priority-medium { background: #f59e0b; }
    .priority-low { background: #3b82f6; }
    .task-title {
      color: #1d1d1f;
      font-size: 14px;
      font-weight: 500;
      flex: 1;
    }
    .task-due {
      color: #86868b;
      font-size: 12px;
      white-space: nowrap;
    }
    .task-due.overdue {
      color: #ef4444;
      font-weight: 600;
    }
    .divider {
      height: 1px;
      background: rgba(0, 0, 0, 0.06);
      margin: 24px 0;
    }
    .footer {
      padding: 24px 32px;
      text-align: center;
      background: #fafafa;
    }
    .footer p {
      color: #86868b;
      font-size: 12px;
      margin: 0;
      line-height: 1.5;
    }
    .footer a {
      color: #f43f6e;
      text-decoration: none;
    }
    .stats-grid {
      display: flex;
      gap: 12px;
      margin: 20px 0;
    }
    .stat-box {
      flex: 1;
      background: rgba(0, 0, 0, 0.02);
      border: 1px solid rgba(0, 0, 0, 0.04);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .stat-value {
      color: #1d1d1f;
      font-size: 22px;
      font-weight: 700;
      margin: 0;
    }
    .stat-label {
      color: #86868b;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin: 4px 0 0;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 980px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-urgent { background: #fef2f2; color: #ef4444; }
    .badge-overdue { background: #fef2f2; color: #ef4444; }
    .badge-due-today { background: #fffbeb; color: #d97706; }
    .badge-upcoming { background: #eff6ff; color: #3b82f6; }
    .badge-completed { background: #f0fdf4; color: #16a34a; }
  </style>
`;

function wrapTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${brandStyles}
</head>
<body>
  <div class="email-wrapper">
    <div class="email-card">
      ${content}
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <p style="color: #86868b; font-size: 11px; margin: 0;">
        Built with ❤️ by WorkTracker
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ═══════════════════════════════ TEMPLATES ═══════════════════════════════

/** Email verification / Confirm signup */
export function verificationEmail(params: {
  userName: string;
  confirmUrl: string;
}): string {
  return wrapTemplate(`
    <div class="header-gradient">
      <div class="logo-icon">✓</div>
      <h1>Verify Your Email</h1>
      <p>Almost there — just one click</p>
    </div>
    <div class="content">
      <h2>Hi ${params.userName || 'there'} 👋</h2>
      <p>
        Welcome to <strong>WorkTracker</strong>! You're one step away from unlocking
        smarter task management, focus timers, and AI-powered productivity insights.
      </p>
      <p>Click the button below to verify your email address:</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${params.confirmUrl}" class="btn-gradient">Verify Email Address</a>
      </div>
      <p style="font-size: 13px; color: #86868b;">
        This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      <p>
        WorkTracker — Your personal productivity command center<br />
        <a href="${params.confirmUrl}">Verify manually</a>
      </p>
    </div>
  `);
}

/** Password reset email */
export function passwordResetEmail(params: {
  userName: string;
  resetUrl: string;
}): string {
  return wrapTemplate(`
    <div class="header-gradient">
      <div class="logo-icon">🔑</div>
      <h1>Reset Your Password</h1>
      <p>Secure access to your account</p>
    </div>
    <div class="content">
      <h2>Hi ${params.userName || 'there'}</h2>
      <p>
        We received a request to reset the password for your WorkTracker account.
        Click the button below to set a new password:
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${params.resetUrl}" class="btn-primary">Reset Password</a>
      </div>
      <p style="font-size: 13px; color: #86868b;">
        This link expires in 1 hour. If you didn't request this, your account is safe — no action needed.
      </p>
    </div>
    <div class="footer">
      <p>WorkTracker — Your personal productivity command center</p>
    </div>
  `);
}

/** Due date reminder email */
export function dueDateReminderEmail(params: {
  userName: string;
  tasks: Array<{
    title: string;
    priority: string;
    due_date: string;
    status: 'overdue' | 'due_today' | 'upcoming';
  }>;
  appUrl: string;
}): string {
  const overdue = params.tasks.filter((t) => t.status === 'overdue');
  const dueToday = params.tasks.filter((t) => t.status === 'due_today');
  const upcoming = params.tasks.filter((t) => t.status === 'upcoming');

  const renderTasks = (tasks: typeof params.tasks, badgeClass: string, badgeLabel: string) =>
    tasks
      .map(
        (t) => `
      <div class="task-item">
        <div class="task-priority priority-${t.priority}"></div>
        <span class="task-title">${t.title}</span>
        <span class="badge ${badgeClass}">${badgeLabel}</span>
      </div>`
      )
      .join('');

  return wrapTemplate(`
    <div class="header-gradient">
      <div class="logo-icon">📋</div>
      <h1>Task Reminder</h1>
      <p>You have tasks that need attention</p>
    </div>
    <div class="content">
      <h2>Hey ${params.userName || 'there'} 👋</h2>
      <p>
        Here's a quick update on your upcoming and overdue tasks.
        Stay on track and keep up the great work!
      </p>

      <div class="stats-grid">
        <div class="stat-box">
          <p class="stat-value" style="color: #ef4444;">${overdue.length}</p>
          <p class="stat-label">Overdue</p>
        </div>
        <div class="stat-box">
          <p class="stat-value" style="color: #d97706;">${dueToday.length}</p>
          <p class="stat-label">Due Today</p>
        </div>
        <div class="stat-box">
          <p class="stat-value" style="color: #3b82f6;">${upcoming.length}</p>
          <p class="stat-label">Upcoming</p>
        </div>
      </div>

      ${
        overdue.length > 0
          ? `<h3 style="color: #ef4444; font-size: 14px; font-weight: 600; margin: 24px 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">⚠️ Overdue</h3>
             ${renderTasks(overdue, 'badge-overdue', 'Overdue')}`
          : ''
      }

      ${
        dueToday.length > 0
          ? `<h3 style="color: #d97706; font-size: 14px; font-weight: 600; margin: 24px 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">📌 Due Today</h3>
             ${renderTasks(dueToday, 'badge-due-today', 'Today')}`
          : ''
      }

      ${
        upcoming.length > 0
          ? `<h3 style="color: #3b82f6; font-size: 14px; font-weight: 600; margin: 24px 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">🔮 Coming Up</h3>
             ${renderTasks(upcoming, 'badge-upcoming', 'Soon')}`
          : ''
      }

      <div style="text-align: center; margin: 28px 0;">
        <a href="${params.appUrl}/tasks" class="btn-primary">View All Tasks →</a>
      </div>
    </div>
    <div class="footer">
      <p>
        You're receiving this because you have tasks due soon.<br />
        <a href="${params.appUrl}/settings">Manage notification preferences</a>
      </p>
    </div>
  `);
}

/** Task completion celebration email */
export function taskCompletedEmail(params: {
  userName: string;
  taskTitle: string;
  completedCount: number;
  totalTasks: number;
  streak?: number;
  appUrl: string;
}): string {
  const percentage = params.totalTasks
    ? Math.round((params.completedCount / params.totalTasks) * 100)
    : 0;

  return wrapTemplate(`
    <div class="header-gradient">
      <div class="logo-icon">🎉</div>
      <h1>Task Completed!</h1>
      <p>Great work staying productive</p>
    </div>
    <div class="content">
      <h2>Nice job, ${params.userName || 'there'}! 🙌</h2>
      <p>
        You just completed <strong>"${params.taskTitle}"</strong>. Keep the momentum going!
      </p>

      <div class="info-card" style="text-align: center;">
        <p style="font-size: 48px; margin: 0; line-height: 1;">✅</p>
        <p style="color: #1d1d1f; font-size: 18px; font-weight: 600; margin: 12px 0 4px;">
          ${params.completedCount} of ${params.totalTasks} tasks done
        </p>
        <div style="background: rgba(0,0,0,0.04); border-radius: 980px; height: 8px; margin: 12px 0;">
          <div style="background: linear-gradient(90deg, #f43f6e, #fb923c, #fbbf24); height: 100%; border-radius: 980px; width: ${percentage}%;"></div>
        </div>
        <p style="color: #86868b; font-size: 13px; margin: 4px 0 0;">${percentage}% complete</p>
      </div>

      ${
        params.streak && params.streak > 1
          ? `<div class="info-card" style="text-align: center; background: #fffbeb; border-color: #fde68a;">
               <p style="font-size: 13px; color: #d97706; font-weight: 600; margin: 0;">
                 🔥 ${params.streak}-day productivity streak!
               </p>
             </div>`
          : ''
      }

      <div style="text-align: center; margin: 28px 0;">
        <a href="${params.appUrl}" class="btn-gradient">View Dashboard →</a>
      </div>
    </div>
    <div class="footer">
      <p>WorkTracker — Your personal productivity command center</p>
    </div>
  `);
}

/** Daily digest email */
export function dailyDigestEmail(params: {
  userName: string;
  date: string;
  completedToday: number;
  focusMinutes: number;
  productivityScore: number;
  overdueCount: number;
  upcomingTasks: Array<{ title: string; priority: string; due_date: string }>;
  appUrl: string;
}): string {
  const scoreColor =
    params.productivityScore >= 80
      ? '#16a34a'
      : params.productivityScore >= 60
      ? '#d97706'
      : '#ef4444';

  return wrapTemplate(`
    <div class="header-gradient">
      <div class="logo-icon">📊</div>
      <h1>Daily Digest</h1>
      <p>${params.date}</p>
    </div>
    <div class="content">
      <h2>Good evening, ${params.userName || 'there'} 🌙</h2>
      <p>Here's how your day went — let's review your productivity:</p>

      <div class="stats-grid">
        <div class="stat-box">
          <p class="stat-value" style="color: ${scoreColor};">${params.productivityScore}</p>
          <p class="stat-label">Score</p>
        </div>
        <div class="stat-box">
          <p class="stat-value" style="color: #16a34a;">${params.completedToday}</p>
          <p class="stat-label">Completed</p>
        </div>
        <div class="stat-box">
          <p class="stat-value" style="color: #a855f7;">${params.focusMinutes}m</p>
          <p class="stat-label">Focus</p>
        </div>
      </div>

      ${
        params.overdueCount > 0
          ? `<div class="info-card" style="background: #fef2f2; border-color: #fecaca;">
               <p style="color: #ef4444; font-size: 14px; font-weight: 600; margin: 0;">
                 ⚠️ You have ${params.overdueCount} overdue task${params.overdueCount > 1 ? 's' : ''}
               </p>
             </div>`
          : ''
      }

      ${
        params.upcomingTasks.length > 0
          ? `<h3 style="color: #1d1d1f; font-size: 14px; font-weight: 600; margin: 24px 0 12px;">Tomorrow's Tasks</h3>
             ${params.upcomingTasks
               .map(
                 (t) => `
               <div class="task-item">
                 <div class="task-priority priority-${t.priority}"></div>
                 <span class="task-title">${t.title}</span>
               </div>`
               )
               .join('')}`
          : '<p style="color: #16a34a; font-weight: 500;">✨ No tasks due tomorrow — enjoy your evening!</p>'
      }

      <div style="text-align: center; margin: 28px 0;">
        <a href="${params.appUrl}/analytics" class="btn-primary">View Full Report →</a>
      </div>
    </div>
    <div class="footer">
      <p>
        Sent daily at 8:00 PM · <a href="${params.appUrl}/settings">Unsubscribe</a>
      </p>
    </div>
  `);
}

// Re-export all as namespace
export const EmailTemplates = {
  verificationEmail,
  passwordResetEmail,
  dueDateReminderEmail,
  taskCompletedEmail,
  dailyDigestEmail,
};
