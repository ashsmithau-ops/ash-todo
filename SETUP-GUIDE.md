# Ash To Do — Complete Setup Guide
### From files on your computer → live on the web → on your phone

---

## What you'll need (all free)

| Account | Website | Cost |
|---|---|---|
| GitHub | github.com | Free |
| Supabase | supabase.com | Free |
| Vercel | vercel.com | Free |

Set aside about **45 minutes** the first time. After that, the app just works.

---

## PART 1 — Set up GitHub (your code storage)

GitHub is where your app's files live. Think of it like a Google Drive just for code.

1. Go to **github.com** and click **Sign up**
2. Enter your email, create a password, choose a username
3. Verify your email address
4. Once logged in, click the green **New** button on the left
5. Under "Repository name" type: `ash-todo`
6. Leave everything else as default
7. Click **Create repository** (green button at the bottom)

You now have an empty project. Leave this tab open.

---

## PART 2 — Set up Supabase (your database)

Supabase is where all your tasks and priorities are saved permanently.

### 2a — Create your account

1. Go to **supabase.com**
2. Click **Start your project**
3. Sign up with your GitHub account (easiest — click "Continue with GitHub")
4. Click **New project**
5. Fill in:
   - **Name:** `ash-todo`
   - **Database password:** choose a strong password and save it somewhere safe
   - **Region:** pick the one closest to you (e.g. London for UK)
6. Click **Create new project** — it takes about 2 minutes to set up

### 2b — Create the database tables

Once your project is ready, you need to create two tables: one for tasks, one for preferences.

1. In the left sidebar, click **SQL Editor**
2. Click **New query**
3. Copy and paste the entire block below into the editor:

```sql
-- Tasks table
create table tasks (
  id           text primary key,
  type         text not null check (type in ('do','delegate')),
  title        text not null,
  priority     text not null default 'Medium',
  owner        text,
  action       text,
  notes        text,
  deadline     text,
  done         boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Preferences table (stores top five priorities)
create table preferences (
  key    text primary key,
  value  jsonb
);

-- Allow public read/write (safe since this is personal, not shared)
alter table tasks       enable row level security;
alter table preferences enable row level security;

create policy "allow all" on tasks       for all using (true) with check (true);
create policy "allow all" on preferences for all using (true) with check (true);
```

4. Click **Run** (or press Cmd+Enter on Mac / Ctrl+Enter on Windows)
5. You should see "Success. No rows returned" — that's correct

### 2c — Get your secret keys

1. In the left sidebar, click **Project Settings** (gear icon at the bottom)
2. Click **API**
3. You'll see two things you need — copy them somewhere (e.g. a note on your phone):
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long string starting with `eyJ...`

---

## PART 3 — Prepare your files

You have a folder of files from the download above called `ash-todo`. Inside it:

```
ash-todo/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    ├── supabase.js   ← you need to edit this one
    └── App.jsx
```

### 3a — Add your Supabase keys

1. Open the file `src/supabase.js` in a text editor
   - On Mac: right-click the file → Open With → TextEdit
   - On Windows: right-click → Open With → Notepad
2. You'll see these two lines:
   ```
   const SUPABASE_URL  = 'YOUR_SUPABASE_URL'
   const SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY'
   ```
3. Replace `YOUR_SUPABASE_URL` with your Project URL (keep the quotes)
4. Replace `YOUR_SUPABASE_ANON_KEY` with your anon public key (keep the quotes)
5. It should look like:
   ```
   const SUPABASE_URL  = 'https://abcdefgh.supabase.co'
   const SUPABASE_ANON = 'eyJhbGci...(long string)...'
   ```
6. Save the file

---

## PART 4 — Upload to GitHub

1. Go back to your `ash-todo` repository on github.com
2. Click **uploading an existing file**
3. Open the `ash-todo` folder on your computer
4. Select **all the files and folders inside it** (Cmd+A on Mac, Ctrl+A on Windows)
5. Drag them into the GitHub upload area in your browser
6. Wait for them to upload (you'll see a list appear)
7. At the bottom of the page, click **Commit changes**

Your code is now saved on GitHub.

---

## PART 5 — Publish with Vercel

Vercel takes your GitHub code and puts it live on the web — automatically.

1. Go to **vercel.com**
2. Click **Sign up** → choose **Continue with GitHub**
3. Authorise Vercel to access your GitHub
4. Click **Add New Project**
5. You'll see `ash-todo` in the list — click **Import**
6. Vercel will detect it's a Vite/React project automatically
7. Don't change any settings — just click **Deploy**
8. Wait about 60 seconds
9. You'll see a "Congratulations!" screen with your live URL

Your URL will look like: **`ash-todo-yourname.vercel.app`**

Open it — your app is live on the internet! 🎉

---

## PART 6 — Add to your phone as an app

This makes it feel like a real installed app with its own icon.

### iPhone

1. Open **Safari** (must be Safari, not Chrome) on your iPhone
2. Go to your Vercel URL
3. Tap the **Share** button at the bottom (box with an arrow pointing up)
4. Scroll down and tap **Add to Home Screen**
5. Name it `Ash To Do` and tap **Add**
6. It now appears on your home screen like any app

### Android

1. Open **Chrome** on your Android phone
2. Go to your Vercel URL
3. Tap the **three dots** in the top right corner
4. Tap **Add to Home screen**
5. Tap **Add**

---

## Cost summary

Everything above is **completely free**. The only optional cost is if you want a custom web address (like `ashtodo.com` instead of `ash-todo-yourname.vercel.app`), which costs around £10–15/year from a site like **Namecheap** (namecheap.com).

---

## How it works day-to-day

- Open the app on any device (phone, tablet, computer) via your Vercel URL
- Tasks and priorities **save automatically** to Supabase every time you make a change
- You'll see "Saving…" then "✓ Saved" in the top bar confirming it worked
- Everything syncs across all your devices instantly

---

## If something goes wrong

**"Sync error" appears in the app:**
- Check that you pasted your Supabase URL and key correctly in `supabase.js`
- Make sure you ran the SQL in Step 2b successfully

**Tasks don't load:**
- Go to your Supabase dashboard → Table Editor → check that `tasks` and `preferences` tables exist

**Vercel deployment failed:**
- Go to your Vercel project → click on the failed deployment → read the error log
- Most common cause: a typo in `supabase.js`

---

## Updating the app in future

If you ever want to change something in the app (e.g. ask for a new feature here in Claude), just:
1. Replace the updated `App.jsx` file in your GitHub repository
2. Vercel will automatically redeploy — takes about 60 seconds
3. Refresh the page and the new version is live
