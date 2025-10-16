# e.Cash Website

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First set up the mandatory environment variables:

```bash
# Run from the /web/e.cash/ directory
echo NEXT_PUBLIC_SITE_URL=https://e.cash > .env
echo NEXT_PUBLIC_STRAPI_URL=https://strapi.e.cash >> .env
echo NEXT_PUBLIC_STRAPI_SCORECARD_URL=https://api.scorecard.cash >> .env
```

Then, run the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Build

To create an optimized production build: `npm run build`
