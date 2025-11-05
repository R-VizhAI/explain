# 🧭 What This Project Does

This project is a **serverless backend** that automatically **creates interview reports** when an interview is finished.

It’s part of a bigger system made of two parts:

* The **Producer** — sends messages when something happens.
* The **Consumer** (this project) — listens for those messages and does the work.

When an interview is done, the producer drops a message into a mailbox on Azure called a **Service Bus Queue**.
This consumer gets that message, looks up interview details in the database (Supabase), checks the answers, calculates the score, saves the report, and marks the work as done.

In simple terms:

> The producer says: “Interview X just finished!”
> The consumer replies: “Okay, I’ll make the report for Interview X.”

---

# 🏗 How the Project Is Organized

```
src/
 ├── index.ts
 └── functions/
      ├── health/
      ├── oneWayReportConsumer/
      ├── codingInterviewReportConsumer/
      ├── RoleBasedInterviewReportConsumer/
      ├── softSkillInterviewReportConsumer/
      └── technicalReportConsumer/
 └── shared/
      ├── db/
      ├── types/
      └── utils/
```

Each folder inside `functions/` is a different small worker (function) that does a specific type of report.
All of them are registered in `src/index.ts`, so Azure knows about them.

---

# 📄 `src/index.ts` — The Starting Point

This file doesn’t do any processing itself.
It just **registers all the workers** so Azure can trigger them when new messages arrive.

In plain English:

> “Azure, here are my workers. Call them whenever a message comes in.”

It also prints a log message to confirm everything is loaded.

---

# 📄 `src/functions/oneWayReportConsumer/index.js` — The Worker That Builds Reports

This is one of the workers — it handles reports for “one-way” interviews.

Here’s what happens step by step:

1. **Waits for a message**

   * It listens to the Azure Service Bus Queue.
   * When a message appears, Azure runs this function automatically.

2. **Reads the message**

   * The message looks like this:

     ```
     { "interviewId": "...", "eventId": "..." }
     ```
   * It basically says: “Please generate a report for this interview.”

3. **Finds interview details**

   * It checks the database to find which organization and candidate the interview belongs to.

4. **Fetches data**

   * Gets the list of questions that were asked.
   * Gets all the candidate’s answers.

5. **Checks answers**

   * Compares each answer with the correct one.
   * Counts how many are correct and wrong.
   * Calculates a total score and decides if the candidate is “recommended” or “not recommended.”

6. **Saves the report**

   * Puts the full result into the database.

7. **Marks the event**

   * Updates the original event record to show the job is completed or failed.

8. **Logs activity**

   * Writes messages to logs for tracking and debugging.

In short:

> “When a message comes in, I’ll grab the interview data, check answers, make a report, save it, and mark it done.”

---

# 🧠 The Whole Workflow (Big Picture)

1. **Producer** finishes an interview → sends a message (“Interview X done”) to the Azure queue.
2. **Service Bus Queue** holds that message.
3. **Consumer (this repo)** picks it up, processes it, and creates the report.
4. **Supabase Database** stores all the questions, answers, and results.
5. **Event status** gets updated to “completed” or “failed.”

So the simple flow is:

> Producer → Azure Queue → Consumer → Supabase → Status Updated

---

# 📦 `shared/db/supabase.ts` — Helper for Talking to the Database

This file is a helper that makes it easy for the workers to use the Supabase database.

In short:

> “If a worker needs to look up interview info or update a job status, it comes here.”

---

## 🧩 What It Contains

### 1. `getOrganisationInterviewId(interviewContextId)`

**Purpose:**
Finds which organization and candidate an interview belongs to.

**Story version:**

> “Given this interview ID, tell me who it belongs to.”

**What it does:**

* Connects to the Supabase database.
* Looks inside the `interview_context` table for that ID.
* Returns the organization and candidate IDs.
* Logs an error and returns nothing if something goes wrong.

---

### 2. `updateInterviewReportEventStatus(eventId, status, message)`

**Purpose:**
Updates the job’s status in the database (for example: completed, failed, etc.).

**Story version:**

> “After finishing (or failing) the report, record what happened.”

**What it does:**

* Connects to Supabase.
* Updates the `interview_report_event` table.
* Sets the `status` and a short message.
* Logs success or failure.

---

## ⚙️ One More Hidden Helper

This file also uses `createSupabaseClient()` from `connection.js`.
That small function just connects to Supabase using secret keys stored in environment variables.

---

## 🔗 How It All Connects

When `oneWayReportConsumer` runs:

1. It first calls `getOrganisationInterviewId()` to find the related organization and candidate.
2. Then it processes everything.
3. Finally, it calls `updateInterviewReportEventStatus()` to mark the job as done.

So the whole story is:

> “Ask the database who this interview belongs to → do the report → tell the database you’re done.”
