# Ride Hailing Backend

Backend service for a ride-hailing application built with Node.js, TypeScript, Express, PostgreSQL, Redis, BullMQ, and Socket.IO.


## Demo Video

[![Watch the demo](https://www.loom.com/share/6349816127b44fdfb083d63faa2e6ecb)](https://www.loom.com/share/6349816127b44fdfb083d63faa2e6ecb)

[![Watch the architecture flow](https://www.loom.com/share/1483b3177e6a4f70b9a7c7daa36dd5a3)](https://www.loom.com/share/1483b3177e6a4f70b9a7c7daa36dd5a3)

## Tech Stack

* Node.js
* TypeScript
* Express.js
* PostgreSQL + Prisma
* Redis
* BullMQ
* Socket.IO

## Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run dev

# Start workers
npm run worker
```

## Environment Variables

Create a `.env` file:

```env
see .env.example
```

## Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build project
npm start                # Start production server
npm run worker           # Start background workers
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:deploy    # Deploy migrations
```

## Project Structure

```text
src
├── config
├── controllers
├── middlewares
├── routes
├── services
├── sockets
├── workers
├── utils
└── server.ts
```
