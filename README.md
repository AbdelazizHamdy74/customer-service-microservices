# Customer Service Management System (CSM)

Microservices starter for a **Customer Service Management System** using:

- Node.js + Express
- MongoDB + Mongoose
- Kafka (event-driven communication)
- Redis (cache/session)
- JWT authentication

Implemented now:

1. `Auth Service`
2. `Customer Service`

---

## Current Services

### 1) Auth Service (`auth-service`)
Main APIs:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh-token`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

Technical notes:

- Uses `asyncHandler` for all controllers.
- Stores refresh-token sessions in Redis.
- Publishes Kafka events (`auth.login`, `auth.logout`, `auth.forgot-password`, `auth.password-reset`).
- Structured folders: `config`, `controller`, `models`, `routes`, `middleware`, `utils`.

### 2) Customer Service (`customer-service`)
Main APIs:

- `POST /api/v1/customers` (create customer)
- `PUT /api/v1/customers/:id` (update customer)
- `DELETE /api/v1/customers/:id` (delete customer)
- `GET /api/v1/customers/:id` (customer details)
- `GET /api/v1/customers/search` (search by name/phone/email)

Technical notes:

- Uses `asyncHandler` for all controllers.
- JWT-protected routes through middleware.
- Redis caching for `getCustomer` and search results.
- Publishes Kafka events (`customer.created`, `customer.updated`, `customer.deleted`).
- Structured folders: `config`, `controller`, `models`, `routes`, `middleware`, `utils`.

---

## Folder Structure

```text
Customer-Service-System/
  auth-service/
    src/
      config/
      controller/
      models/
      routes/
      middleware/
      utils/
  customer-service/
    src/
      config/
      controller/
      models/
      routes/
      middleware/
      utils/
```

---

## Run Locally

Each service is standalone.

1. Copy `.env.example` to `.env` inside each service folder.
2. Install dependencies per service:

```bash
cd auth-service && npm install
cd ../customer-service && npm install
```

3. Run each service:

```bash
cd auth-service && npm run dev
cd ../customer-service && npm run dev
```

---

## Future Features (Planned Services)

### User Service

- `createAgent`
- `updateAgent`
- `deleteAgent`
- `getAgent`
- `assignRole`
- `agentPerformance`

### Ticket Service

- `createTicket`
- `updateTicket`
- `assignTicket`
- `closeTicket`
- `reopenTicket`
- `addComment`
- `ticketHistory`
- `getTickets`
- `filterTickets`

Ticket status values:

- `OPEN`
- `IN_PROGRESS`
- `WAITING_CUSTOMER`
- `RESOLVED`
- `CLOSED`

### Notification Service

- `sendEmail`
- `sendSMS`
- `sendNotification`
- `sendTicketUpdate`

### Report Service

- `ticketsPerDay`
- `agentPerformance`
- `customerSatisfaction`
- `ticketStatusReport`

---

## Senior-Level Enhancements (Planned)

- Real-time chat with `Socket.io`
- Ticket priority management
- SLA management
- Auto ticket assignment
- Customer satisfaction rating
- Activity logs
- Audit service
- AI auto reply
- Role-based permissions hardening
- Distributed tracing and centralized logging
