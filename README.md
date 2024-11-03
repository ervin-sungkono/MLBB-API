# MLBB Wiki API
An API that serves data from MLBB Wiki, currently the available data that can be requested are:
- Heroes Data
- Equipment Data
- Emblem Data

This API also uses cron jobs that automatically updates the data once a week.

**DISCLAIMER:** this project is not affiliated with Moonton or MLBB Wiki and serves as learning purpose only.

## Resources
- [Puppeteer](https://www.npmjs.com/package/puppeteer)
- [P-Limit](https://www.npmjs.com/package/p-limit)
- [LRU Cache](https://www.npmjs.com/package/lru-cache)
- [Vercel Blob](https://www.npmjs.com/package/@vercel/blob)
- [Node Fetch](https://www.npmjs.com/package/node-fetch)

## Documentation
Here are the available endpoints for this API:

1. **[GET]** Return All Hero Data
```sh
https://mlbb-wiki-api.vercel.app/api/heroes
```

2. **[GET]** Return Hero Data by ID
```sh
https://mlbb-wiki-api.vercel.app/api/heroes/[id]
```

3. **[GET]** Return All Equipment Data
```sh
https://mlbb-wiki-api.vercel.app/api/equipment
```

4. **[GET]** Return Equipment Data by ID
```sh
https://mlbb-wiki-api.vercel.app/api/equipment/[id]
```

5. **[GET]** Return All Emblem Data
```sh
https://mlbb-wiki-api.vercel.app/api/emblem
```

## Limitations
1. This API has a rate limit of **120 requests per minute** for each endpoint
2. This API is developed in focus for Vercel Deployment
3. Some limitations when deploying in Vercel (especially when using Hobby Plan) is the timeout duration when executing serverless functions, Vercel allows a maximum duration of 60 seconds and a memory of 1024 MB for serverless functions.
4. This project can only run in production mode, learn more about how to run it locally [here](https://github.com/Sparticuz/chromium?tab=readme-ov-file#running-locally--headlessheadful-mode)

## Installation and Setup
1. Clone this repository
```sh
git clone https://github.com/ervin-sungkono/qr-code-gen.git
```
2. Install dependency
```sh
npm install
```
3. Copy environment variables and fill in the required values
- CRON_SECRET: Random string for running cron jobs in Vercel, [Click Here](https://vercel.com/docs/cron-jobs) to learn about setting cron jobs in Vercel
```sh
cp .env.example .env
```
4. Run the app
```sh
npm run dev
```

## Deployment
This project is deployed using Vercel, to learn more about deploying Next.js app on Vercel [Click Here](https://vercel.com/docs/frameworks/nextjs)