# 🧩 Notification Producer – Plain English Workflow

## 🔹 Main Concept

This project is a **serverless notification producer**.
Its job is to **trigger and manage notification events** (mostly emails) whenever something happens — for example, a new test, a report, or a system event.

It doesn’t actually send the email itself.
Instead, it **pushes notification tasks into a queue** (Redis), and another service (the consumer) picks them up later to process or send.

So, this producer is like the “dispatcher” — it says *“Hey, send this email”* and puts that message in a queue.

---

## ⚙️ File-by-File Workflow (Plain English)

### 🏁 `src/index.ts`

* This is the **entry point** for the Azure Function App.
* It **imports all serverless function handlers** like:

  * `health/index.js` – for checking if the service is running.
  * `initiate-email-notification/index.js` – to trigger email workflows.
  * `notify-new-test/index.js` – to notify when a new test is available.
* Then it logs a message confirming everything loaded properly.

---

## 🧱 Shared Folder

### 📂 `shared/db/index.ts`

This file deals with **Supabase**, which is the main database for this system.

#### 1. `createSupabaseClient()`

* Creates a Supabase client using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from environment variables.
* It verifies both values are present and safely handles any missing ones.
* This client is used to query the Supabase database securely.

#### 2. `getOrgNameFromOrgId(orgId)`

* Given an organization ID, it fetches that organization’s **name** from the `organizations` table.
* Handles cases where it can’t find a match or where there’s a database error.

#### 3. `getOrgCandidates(orgId)`

* Finds all **members of an organization** whose role is `college_candidate`.
* Then it fetches their **user info (email, name, metadata)** from Supabase Auth.
* It does this in **batches of 200 users** at a time.
* Finally, it combines both tables (members + user info) into one list of clean, readable user data.
* This is used when sending email notifications to specific user groups.

So this file’s purpose is:

> *“Get clean, readable data about an organization and its people from Supabase.”*

---

### 📂 `shared/queue/connection.ts`

This sets up a **Redis Cluster connection** using `ioredis`.

Redis here is used as a **message queue system**, meaning the producer drops “tasks” into Redis for the consumer to pick up later.

* It connects to a **Redis cluster** using the `REDIS_URL` and `REDIS_ACCESS_KEY`.
* Includes all the necessary **security and retry configurations** (TLS, reconnect, etc.).
* Listens for events like:

  * `ready` → Redis connected and ready.
  * `error` → Some issue with Redis.
  * `reconnecting` → Trying to reconnect.
  * `+node / -node` → Cluster nodes joining or leaving.

Exports three ready-to-use connection objects:

* `queueConnection` → for queue operations (BullMQ)
* `workerConnection` → for consumers/workers
* `cacheClient` → for cache operations (if needed later)

---

### 📂 `shared/queue/emailQueue.ts`

Defines a specific queue just for email notifications.

* It uses BullMQ’s `Queue` class and attaches it to the Redis cluster.
* The queue name is `'{email-notification-invitation-dev}'`.
* It uses **lazy initialization** — meaning it only connects when it’s first needed.
* Once ready, other parts of the app can access it via `emailQueue.value`.

So this is basically:

> *“The dedicated email notification queue.”*

---

### 📂 `shared/queue/index.ts`

This file exposes the main helper function used to push jobs into the queue.

#### 1. `ensureQueueReady()`

* Checks if Redis credentials exist.
* Doesn’t open the connection immediately, just verifies readiness.

#### 2. `pushToEmailQueue(payload)`

* Main function that **pushes an email job** into the queue.
* Steps:

  1. Checks if the system is ready and payload is valid.
  2. Verifies Redis is configured.
  3. Gets the email queue from `emailQueue.value`.
  4. Pushes the job into the queue with retry and backoff settings:

     * Up to 5 attempts.
     * Waits longer between retries (exponential backoff).
     * Automatically removes completed jobs.
  5. Logs the success or failure.

If something’s missing (like Redis not configured), it logs and safely skips pushing.

So this file is:

> *“The interface to send messages (email jobs) into the queue.”*

---

## 🧭 Overall Flow Summary

1. A serverless function (like “initiate email notification”) is triggered.
2. It gathers data from Supabase (like which users to notify).
3. Then it calls `pushToEmailQueue()` with that payload.
4. The queue logic sends it to Redis.
5. Later, the **consumer** (another service) picks it up from Redis and processes it — usually by sending an email.

---

## 🔁 What’s Next

Your task will be to:

1. Replace Redis (BullMQ + ioredis) with **Azure Queue Storage or Azure Service Bus**.
2. Convert the consumer side to serverless as well (so it processes messages automatically when queued).

---

> ✅ Think of this producer as:
> “Find who to notify → package the info → drop it into a message queue.”

Once we swap out Redis for Azure queues, the logic will stay mostly the same — just the message transport layer will change.
