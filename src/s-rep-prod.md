# 🧭 Overview — What This Repo Does

This service acts as a **trigger and dispatcher**.
It listens for changes in the Supabase database (like “a new interview report event is pending”) and then sends a message to the correct **Azure Service Bus Queue**, telling the right **consumer service** to start generating the interview report.

In simple terms:

> “Whenever Supabase says an interview report is pending, I’ll find out what kind it is and send a message to the correct worker that can handle it.”

So it doesn’t generate the reports itself — it just **routes jobs** to the appropriate consumer.

---

# ⚙️ The Step-by-Step Flow

Here’s how everything happens, from start to finish:

1. **Supabase sends a webhook**

   * Supabase detects a new record in the table `interview_report_event` with status `"pending"`.
   * It triggers a webhook request to this service.

2. **Azure Function receives the webhook**

   * The webhook hits the endpoint `/webhook/report-producer`.
   * The `reportProducerWebhookHandler()` function handles this.

3. **It validates the event**

   * Checks that the table is `interview_report_event`.
   * Checks that the record’s status is `pending`.
   * If not, the function stops right there.

4. **It identifies the interview type**

   * Using `getInterviewType(interviewId)` (from `shared/db/index.ts`), it queries Supabase to find:

     * The `interviewType` (e.g. one-way, coding, technical, etc.)
     * The `interviewCategory` (like role-based or soft-skill).

5. **It updates the event status**

   * Calls `processingReport(eventId)` to mark the event as `"processing"`.
   * This prevents duplicate triggers while the report is being prepared.

6. **It prepares the message payload**

   ```json
   {
     "interviewId": "abc123",
     "eventId": "xyz789",
     "interviewType": "Technical",
     "interviewCategory": "soft-skill"
   }
   ```

7. **It pushes the message to Azure Service Bus**

   * Calls `pushToReportConsumer(payload, interviewType, interviewCategory)` (from `shared/queue/index.ts`).
   * This function decides which queue to send the message to:

     * `kodemaster-one-way-interview-report`
     * `kodemaster-technical-interview-report`
     * `kodemaster-soft-skill-interview-report`
     * `kodemaster-coding-interview-report`
     * `kodemaster-role-based-interview-report`

8. **Azure handles delivery**

   * The message sits in the correct queue until the matching **consumer function** picks it up and generates the actual report.

9. **Producer finishes**

   * Returns `{ success: true, message: "Report consumer pushed to queue" }` to confirm the job is queued successfully.

---

# 🧩 How Each File Fits Together

### **`src/index.ts`**

* The main entry point.
* Registers all Azure Functions (like the webhook and health check).
* Logs when everything is loaded successfully.

---

### **`functions/health/index.ts`**

* A simple health check endpoint.
* Returns service status and a timestamp — used for uptime monitoring.
* Example output:

  ```json
  {
    "status": "healthy",
    "service": "report-producer-service",
    "timestamp": "2025-11-04T10:00:00.000Z"
  }
  ```

---

### **`functions/report-producer-webhook/index.ts`**

* The main logic that listens for new report events from Supabase.
* Steps:

  1. Reads the webhook body.
  2. Validates it.
  3. Finds interview type from Supabase.
  4. Marks the event as `processing`.
  5. Pushes a message to the right Azure queue.

---

### **`shared/db/index.ts`**

Handles all database-related work.
It connects to **Supabase** and exposes three helper functions:

1. **`createSupabaseClient()`** — creates a new Supabase connection.
2. **`processingReport(eventId)`** — updates an interview event’s status to `"processing"`.
3. **`getInterviewType(interviewId)`** — fetches the type (`technical`, `coding`, etc.) and category (`soft-skill`, `role-based`, etc.) of the interview.

These keep the main function clean and avoid repeating database logic.

---

### **`shared/queue/connection.ts`**

Creates and caches connections to **Azure Service Bus**:

* `getServiceBusClient()` — builds one main connection for efficiency.
* `getServiceBusSender(queueName)` — gets (or reuses) a sender for a given queue.
* Also defines queue names for both production and dev environments:

  * `kodemaster-one-way-interview-report`
  * `kodemaster-technical-interview-report`
  * `kodemaster-soft-skill-interview-report`
  * `kodemaster-coding-interview-report`
  * `kodemaster-role-based-interview-report`

---

### **`shared/queue/index.ts`**

Handles the logic for actually **sending messages** to Azure Service Bus.

* Builds the right queue name based on the interview type and category.
* Uses the sender from `connection.ts` to send the message.
* Logs success or error messages.

In short:

> “Given an interview type and category, I’ll send a message to the right Azure queue so that the correct consumer can start working on it.”

---

# 🧠 The Big Picture (Simplified)

```
Supabase → Report Producer (this repo) → Azure Queue → Report Consumer → Supabase
```

### Story version:

1. Supabase: “Hey, a new interview report is pending.”
2. Producer: “Got it — checking what kind it is.”
3. Producer: “It’s a technical soft-skill interview. Sending that job to the technical queue.”
4. Azure Queue: “I’ll hold this message until the right worker picks it up.”
5. Consumer: “I got the message! Generating the report now.”
6. Supabase: “Report complete — event marked as done.”

---

# 🧾 Summary

| Role                            | Description                                                  |
| ------------------------------- | ------------------------------------------------------------ |
| **Report Producer (this repo)** | Receives webhook → Identifies interview → Sends job to queue |
| **Azure Service Bus**           | Holds and routes messages between services                   |
| **Report Consumer**             | Picks up job → Processes data → Creates report               |
| **Supabase**                    | Stores interviews, events, and reports                       |

In short:

> This repo is the **dispatcher** — the bridge between Supabase (data) and Azure (processing).
> It makes sure every interview report request goes to the right worker at the right time.
