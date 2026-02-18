# Setup Instructions

## Important: Before Running the Application

### 1. Firebase Project Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project
2. Enable **Authentication** → Sign-in methods: Email/Password, Google, Phone
3. Enable **Cloud Firestore** in production mode
4. Copy your Firebase config from Project Settings → General → Your apps → Web app

### 2. Deploy Firestore Rules & Indexes

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

### 3. Install Dependencies and Run

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:5173`

## Firestore Schema

All data is stored in Cloud Firestore with the following collections:

### Per-User Subcollections (`users/{uid}/...`)

| Subcollection | Document Fields |
|---|---|
| `tasks/{taskId}` | `user_id`, `title`, `description`, `status` (pending/in_progress/completed), `priority` (low/medium/high/urgent), `due_date`, `estimated_time`, `actual_time`, `parent_task_id`, `is_recurring`, `recurrence_rule`, `auto_priority_score`, `category`, `tags[]`, `checklist[]`, `attachments[]`, `time_blocks[]`, `created_at`, `updated_at`, `completed_at` |
| `task_dependencies/{depId}` | `task_id`, `depends_on_task_id`, `created_at` |
| `work_sessions/{sessionId}` | `user_id`, `task_id`, `session_type` (pomodoro/custom/break), `duration`, `started_at`, `ended_at`, `completed`, `notes`, `mood`, `distractions`, `created_at` |
| `activity_logs/{logId}` | `user_id`, `task_id`, `action`, `details`, `created_at` |
| `ai_suggestions/{sugId}` | `user_id`, `task_id`, `suggestion_type`, `content`, `applied`, `created_at` |
| `notifications/{notifId}` | `user_id`, `type`, `title`, `body`, `data`, `read`, `created_at` |

### Top-Level Collections

| Collection | Document Fields |
|---|---|
| `user_profiles/{uid}` | `id`, `email`, `full_name`, `username`, `avatar_url`, `status` (online/offline/away/busy), `last_seen`, `is_private`, `bio`, `phone`, `created_at`, `updated_at` |
| `friendships/{id}` | `requester_id`, `addressee_id`, `status` (pending/accepted/rejected/blocked), `created_at`, `updated_at` |
| `conversations/{id}` | `name`, `is_group`, `created_by`, `participants[]`, `last_message`, `created_at`, `updated_at` |
| `conversations/{id}/messages/{msgId}` | `conversation_id`, `sender_id`, `content`, `message_type` (text/image/file/system), `metadata`, `is_edited`, `created_at`, `updated_at` |
| `follows/{id}` | `follower_id`, `following_id`, `status` (requested/accepted/rejected), `created_at`, `updated_at` |
| `follow_history/{id}` | `follower_id`, `following_id`, `action`, `metadata`, `created_at` |
| `user_blocks/{id}` | `blocker_id`, `blocked_id`, `created_at` |

### Composite Indexes (auto-deployed via `firestore.indexes.json`)

- `conversations`: participants (array-contains) + updated_at DESC
- `follows`: follower_id + status, following_id + status, follower_id + following_id
- `friendships`: requester_id + status, addressee_id + status, requester_id + addressee_id
- `user_blocks`: blocker_id + blocked_id
- `tasks` (subcollection): parent_task_id + created_at
- `ai_suggestions` (subcollection): applied + created_at DESC
- `task_dependencies` (subcollection): task_id + created_at

## Security Rules

Firestore rules are defined in `firestore.rules`:
- **User data** (`users/{uid}/**`): read/write only by owner
- **Notifications**: owner can read/update/delete; any authenticated user can create (for cross-user notifications)
- **Profiles**: any authenticated user can read; only owner can write
- **Friendships/Follows**: any authenticated user can read/create; only participants can update/delete
- **Conversations**: only participants can read/update; messages writable by any authenticated user, editable/deletable by sender only

## Features Overview

- ✅ Advanced task management with CRUD operations
- 📊 Status tracking and priority levels
- ⏲️ Pomodoro focus timer
- 📈 Analytics dashboard with charts
- 🤖 AI-powered insights and suggestions
- 🎨 Modern 3D glassmorphism UI
- 🔐 Secure authentication with Firebase
- 📱 Fully responsive design

## Troubleshooting

### Database Connection Issues
- Make sure your `.env.local` file exists in the root directory
- Verify your Firebase config is correct

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Delete `node_modules` and run `npm install` again if needed
- Make sure you're using Node.js 18 or higher

### Authentication Issues
- Check your Firebase project settings
- Verify that email authentication is enabled in Firebase
- Check browser console for any error messages

## Project Structure

```
src/
├── components/      # React components (Auth, Dashboard, Tasks, etc.)
├── services/        # Business logic & API calls
├── hooks/           # Custom React hooks
├── store/           # Zustand state management  
├── types/           # TypeScript definitions
├── utils/           # Helper functions
├── config/         # Configuration files
└── lib/            # Library setup (Firebase)
```

## Tech Stack

- React 19 + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Framer Motion for animations
- Firebase for backend
- Zustand for state management
- React Query for data fetching
- Recharts for analytics

## Next Steps

1. Sign up for an account in the app
2. Create your first task
3. Try the focus timer
4. Explore the analytics dashboard
5. Get AI-powered insights

Enjoy using WorkTracker! 🚀
