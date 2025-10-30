# Your App - Fresh Start 🚀

A clean Next.js 15 starter with UI components, Supabase, and Echo SDK ready to go.

## What's Included

### ✅ UI/UX
- **Shadcn/ui Components** - 50+ pre-built components in `components/ui/`
- **Tailwind CSS** - Configured and ready
- **Responsive Design** - Mobile-first approach
- **Audio Visualizer** - Reusable component in `components/audio-visualizer.tsx`

### ✅ Database
- **Supabase** - PostgreSQL database
  - Client: `lib/supabase/client.ts`
  - Server: `lib/supabase/server.ts`
- Ready for real-time subscriptions and RLS policies

### ✅ Authentication
- **Echo SDK** - Authentication and billing
  - Provider configured in `app/layout.tsx`
  - Login page: `/auth/login`
  - Signup page: `/auth/sign-up`
  - Hook: `useEcho()` from `@merit-systems/echo-react-sdk`

### ✅ Configuration
- **TypeScript** - Full type safety
- **Next.js 15** - App router
- **ESLint** - Code quality
- **Environment Variables** - `.env.local` for secrets

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Echo SDK
NEXT_PUBLIC_ECHO_CLIENT_ID=your_echo_client_id
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout with Echo provider
│   ├── page.tsx            # Home page
│   ├── globals.css         # Global styles
│   └── auth/               # Auth pages (login, signup)
├── components/
│   ├── ui/                 # Shadcn/ui components
│   ├── echo/               # Echo SDK components
│   ├── providers/          # React providers
│   └── audio-visualizer.tsx # Reusable visualizer
├── lib/
│   ├── supabase/           # Database clients
│   └── config/
│       └── echo.ts         # Echo configuration
└── middleware.ts           # Next.js middleware
```

---

## Building Your App

### Create a New Page
1. Create file in `app/your-page/page.tsx`
2. Use client or server component as needed
3. Access UI components from `@/components/ui/`

Example:
```tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function YourPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <h1>Your Page</h1>
        <Button>Click Me</Button>
      </Card>
    </div>
  )
}
```

### Use Supabase
```tsx
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Query data
const { data } = await supabase
  .from('your_table')
  .select('*')
```

### Use Echo Auth
```tsx
import { useEcho } from '@merit-systems/echo-react-sdk'

const { isLoggedIn, user } = useEcho()
```

---

## Available Components

### Shadcn/ui Components
All available in `components/ui/`:
- `Button`, `Card`, `Dialog`, `Input`, `Label`
- `Select`, `Checkbox`, `RadioGroup`, `Switch`
- `Alert`, `Badge`, `Avatar`, `Separator`
- `Sheet`, `Tabs`, `Tooltip`, `Popover`
- ...and 40+ more!

### Custom Components
- `AudioVisualizer` - Animated visual feedback
- `ThemeProvider` - Dark mode support

---

## Next Steps

1. **Define Your Database Schema**
   - Go to Supabase dashboard
   - Create tables in SQL Editor
   - Set up Row Level Security (RLS)

2. **Create Your Pages**
   - Add pages to `app/` directory
   - Use server components for data fetching
   - Use client components for interactivity

3. **Add API Routes**
   - Create in `app/api/your-route/route.ts`
   - Use POST, GET, etc. handlers

4. **Customize Styling**
   - Edit `app/globals.css`
   - Modify Tailwind config if needed

---

## Useful Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

---

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth & Billing**: Echo SDK
- **Deployment**: Vercel (recommended)

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/ui](https://ui.shadcn.com)
- [Supabase Docs](https://supabase.com/docs)
- [Echo SDK Docs](https://docs.echo.merit.systems)

---

Happy building! 🎉
