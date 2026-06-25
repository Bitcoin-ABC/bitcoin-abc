# e.Cash Website

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Copy `env.sample` to `.env` before running the dev server or building. Edit values as needed.

```bash
# Run from the /web/e.cash/ directory
cp env.sample .env
```

Then, run the development server:

```bash
# From repository root
pnpm install --frozen-lockfile
pnpm --filter ecashaddrjs build
pnpm --filter chronik-client build
pnpm --filter e.cash run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Build

Ensure `.env` exists (copy from `env.sample` if you have not already), then create an optimized production build:

```bash
pnpm --filter e.cash run build
```
