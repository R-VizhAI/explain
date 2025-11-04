# 🧭 Overview — What This Repo Does

This project is a **serverless backend** that automatically **creates interview reports** whenever a new interview event happens.

It’s part of a bigger system where one service sends messages (the _producer_), and this repo listens for them (the _consumer_).

When an interview is completed, a message gets dropped into a “mailbox” on Azure called a **Service Bus Queue**.  
This consumer receives that message, looks up the interview details from a database (Supabase), processes the answers, calculates results, saves the report, and marks the job as complete.

In plain terms:

> The _producer_ says: “Hey, interview X is done!”  
> The _consumer_ says: “Got it. I’ll make a report for interview X now.”

---

# 🏗 How the Repo Is Structured

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
```

Each folder under `functions/` represents a **different task** the system can perform — each one is an independent “mini worker.”  
All of them are loaded through `src/index.ts`.

---

# 📄 `src/index.ts` — The Entry Point

This file is like a **directory of workers**.  
It doesn’t do any heavy lifting itself — it just _registers_ each worker (function) so that Azure knows what jobs exist.

In plain English:

> “Hey Azure, here are all the workers you can call — one for one-way interview reports, one for coding interviews, one for technical interviews, and so on.”

It also logs a message to confirm everything loaded correctly.

---

# 📄 `src/functions/oneWayReportConsumer/index.js` — The Worker

This is one of those workers — the **One Way Report Consumer**.  
Here’s the story of what it does:

1. **Waits for a message**
    
    - It listens to an Azure mailbox (Service Bus Queue).
        
    - When a new message arrives, Azure automatically wakes this function up.
        
2. **Reads what the message says**
    
    - The message usually looks like:  
        `{ "interviewId": "...", "eventId": "..." }`
        
    - It means “Generate a report for this interview.”
        
3. **Finds interview info**
    
    - It looks up which organization and candidate this interview belongs to in the database.
        
4. **Fetches data**
    
    - Gets all the questions that were asked.
        
    - Gets all the answers the candidate gave.
        
5. **Compares answers**
    
    - Checks which answers were correct.
        
    - Calculates how many were right/wrong.
        
    - Gives a score and a simple “recommended / not recommended” verdict.
        
6. **Saves the report**
    
    - Writes all this information back into the database as a report record.
        
7. **Marks the job done**
    
    - Updates the original “event” as “completed” or “failed,” depending on success.
        
8. **Logs everything**
    
    - Throughout the process, it logs messages for debugging and tracking.
        

In short:

> “When an interview ends, I’ll grab the questions and answers, check how the candidate did, make a report, save it, and tell the system I’m done.”

---

# 🧠 Big Picture of the Flow

1. The **Producer** finishes an interview → sends a message (“Interview X done”) to the queue.
    
2. The **Service Bus Queue** holds that message temporarily.
    
3. The **Consumer (this repo)** picks it up, processes it, and generates the report.
    
4. The **Database (Supabase)** stores all the interview data and reports.
    
5. The **System** marks that event as “completed.”
    

So it’s a simple message-driven workflow:

> Producer → Azure Queue → Consumer → Database → Status Updated