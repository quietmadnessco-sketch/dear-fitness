Dear Fitness
A workout + progressive-overload tracker built with React, Vite, and Tailwind.
Dashboard-style layout (sidebar nav), not a mobile app shell.
Run locally
npm install
npm run dev
Build
npm run build
Deploy
Push to GitHub, then import the repo into Vercel (framework preset: Vite).
No env vars needed — everything is stored in the browser's localStorage.
What's in this build
Sidebar dashboard layout: Overview, Workout, Progress, Analytics, Body, Skip log, Settings
Weekly workout plan (exercise, day, rep range, rest time per exercise)
Set logging with a rest timer (browser notification + sound when rest ends)
Weight PR, rep PR, and session-volume PR detection
Double-progression suggestion banner (3 sessions at top of rep range → suggests +2.5kg)
Plateau/"stalled" detection (configurable threshold, default 60 days with no weight PR)
Analytics: 8-week consistency heatmap, all-time PR leaderboard, full workout history, plateau list
Body weight tracking with 7-day average + trend chart
Body measurements (waist, chest, hips, thigh, arms, calves, shoulders, neck) with change-over-time
Skip log — reason, frequency, monthly summary, soft nudges
Streak with flame intensity + milestone badges (3/7/14/30 days), weekly-goal progress bar
Settings: weekly goal, plateau threshold, default rest time, exercise management, data reset
Export/import full data as JSON (manual backup — see note below)
Known limitation
Everything lives in this browser's localStorage only. No backend, no multi-device sync,
no photo storage. Export a JSON backup from Settings periodically. If you outgrow this,
next step is a real backend (Supabase/Firebase) — needed before progress photos or
cross-device sync make sense.
Not in scope (by design)
Nutrition / calorie tracking
Exercise-form tutorials/library
