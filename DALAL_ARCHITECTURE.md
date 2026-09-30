# KrishiFlow: System Architecture & Dalal Workflow

This document provides a high-level overview of the KrishiFlow platform architecture, with a specific focus on the newly introduced **Dalal (Mandi Broker)** role and their operational workflow.

## System Components

KrishiFlow is built on a modern, decoupled microservices architecture designed for resilience and performance:

1. **Frontend**: React (Vite) + Zustand for state management, Tailwind CSS for styling.
2. **Backend Orchestrator**: Node.js + Express, interacting with MongoDB Atlas.
3. **AI Engine**: Python FastAPI service running optimization algorithms (Google OR-Tools) and LightGBM for price predictions.
4. **Database**: MongoDB Atlas (Cloud) storing user accounts, telemetry, and transactions.

---

## Dalal Workflow Overview

The **Dalal** acts as the crucial middleman at the APMC Mandi gate. They grade incoming shipments from farmers, record deals with buyers, and track real-time analytics.

### Key Functionalities

- **Live Arrivals Dashboard**: Real-time view of shipments arriving at their specific mandi.
- **Grading & Deal Recording**: Assign grades (A, B, C) to farmers' produce and instantly record the agreed rate/deal.
- **Rate Postings (Buy-Side)**: Post rate requirements on behalf of APMC buyers to attract farmers.
- **Mandi Analytics**: View 7-day transaction volumes, commission earned, and crop breakdowns.
- **Farmer CRM**: Keep track of frequent farmers, their average grades, and total transactions.

---

## Architecture Diagram

The Mermaid diagram below illustrates how the Dalal fits into the overall system data flow:

```mermaid
flowchart TD
    %% Actors
    Farmer[Farmer App]
    Fleet[Fleet Owner App]
    Dalal[Dalal / Broker App]
    Buyer[APMC Buyer App]

    %% Microservices
    NodeBackend[Node.js Orchestrator Core]
    AIEngine[Python AI Engine (OR-Tools / ML)]
    
    %% Databases & External
    MongoDB[(MongoDB Atlas)]
    Agmarknet[(Agmarknet Feed)]

    %% Connections
    Farmer -- "Check Prices & Book Transport" --> NodeBackend
    Fleet -- "Dispatch & Route Mgmt" --> NodeBackend
    Dalal -- "Grade Arrivals & Record Deals" --> NodeBackend
    Buyer -- "Monitor Inbound Shipments" --> NodeBackend

    NodeBackend <-- "Optimize VRP Routing" --> AIEngine
    NodeBackend <-- "Predict Prices" --> AIEngine
    NodeBackend <-- "CRUD Operations" --> MongoDB
    AIEngine <-- "Fetch Live Prices" --> Agmarknet

    %% Dalal Specific Flow
    subgraph Mandi Gate Operations
        Dalal
        Buyer
    end
```

## Data Persistence & Integrity
As a standard behavior of KrishiFlow, all data (including user logins, shipments, and the Dalal's recorded deals) is stored securely in **MongoDB Atlas**. Even when components of the system encounter temporary issues (e.g. AI Engine downtime), the backend gracefully falls back to mock/cached data, ensuring the Dalal can continue recording transactions seamlessly at the gate.
