# Setup Instructions

## Important: Before Running the Application

### 1. Create `.env.local` file

Create a file named `.env.local` in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Setup Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once your project is created, go to the SQL Editor
3. Copy the entire contents of `supabase-schema.sql`
4. Paste and execute it in the SQL Editor
5. Wait for the confirmation message

### 3. Get Your Supabase Credentials

1. In your Supabase project, go to `Settings` → `API`
2. Copy the `Project URL` (this is your `VITE_SUPABASE_URL`)
3. Copy the `anon public` key (this is your `VITE_SUPABASE_ANON_KEY`)
4. Add these to your `.env.local` file

### 4. Install Dependencies and Run

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:5173`

## Features Overview

- ✅ Advanced task management with CRUD operations
- 📊 Status tracking and priority levels
- ⏲️ Pomodoro focus timer
- 📈 Analytics dashboard with charts
- 🤖 AI-powered insights and suggestions
- 🎨 Modern 3D glassmorphism UI
- 🔐 Secure authentication with Supabase
- 📱 Fully responsive design

## Troubleshooting

### Database Connection Issues
- Make sure your `.env.local` file exists in the root directory
- Verify your Supabase URL and anon key are correct
- Check that you've executed the database schema SQL

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Delete `node_modules` and run `npm install` again if needed
- Make sure you're using Node.js 18 or higher

### Authentication Issues
- Check your Supabase project settings
- Verify that email authentication is enabled in Supabase
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
└── lib/            # Library setup (Supabase)
```

## Tech Stack

- React 19 + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Framer Motion for animations
- Supabase for backend
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
