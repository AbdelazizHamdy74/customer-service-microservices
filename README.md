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
3. `User Service`
4. `Email Service`
5. `Ticket Service`
6. `Notification Service`
7. `Report Service`

---

## Current Services

### 1) Auth Service (`auth-service`)
Main APIs:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh-token`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/invite/customer` (Admin/Supervisor)
- `POST /api/v1/auth/invite/agent` (Admin/Supervisor)

Technical notes:

- Uses `asyncHandler` for all controllers.
- Stores refresh-token sessions in Redis.
- Publishes Kafka events:
  - `auth.login`, `auth.logout`, `auth.forgot-password`, `auth.password-reset`
  - `customer.invited`, `agent.invited`
- Consumes Kafka events:
  - `customer.provisioned`, `agent.provisioned`
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
- JWT-protected routes with role-based access.
- Redis caching for `getCustomer` and search results.
- Publishes Kafka events (`customer.created`, `customer.updated`, `customer.deleted`, `customer.provisioned`).
- Consumes Kafka events: `customer.invited`.
- Structured folders: `config`, `controller`, `models`, `routes`, `middleware`, `utils`.

### 3) User Service (`user-service`)
Main APIs:

- `POST /api/v1/agents` (create agent)
- `PUT /api/v1/agents/:id` (update agent)
- `DELETE /api/v1/agents/:id` (delete agent)
- `GET /api/v1/agents/:id` (agent details)
- `PUT /api/v1/agents/:id/role` (assign role)
- `GET /api/v1/agents/:id/performance` (agent performance)

Technical notes:

- JWT-protected routes with role-based access.
- Publishes Kafka events (`agent.created`, `agent.updated`, `agent.deleted`, `agent.provisioned`).
- Consumes Kafka events: `agent.invited`.

### 4) Email Service (`email-service`)
Purpose:

- Sends real invite emails to Customers and Agents using **Brevo**.

Technical notes:

- Consumes Kafka events: `customer.invited`, `agent.invited`.
- Uses `BREVO_API_KEY` to send email.

### 5) Ticket Service (`ticket-service`)
Main APIs:

- `POST /api/v1/tickets` (create ticket)
- `PUT /api/v1/tickets/:id` (update ticket)
- `PUT /api/v1/tickets/:id/assign` (assign ticket)
- `PUT /api/v1/tickets/:id/close` (close ticket)
- `PUT /api/v1/tickets/:id/reopen` (reopen ticket)
- `POST /api/v1/tickets/:id/comments` (add comment)
- `GET /api/v1/tickets/:id/history` (ticket history)
- `GET /api/v1/tickets` (list visible tickets)
- `GET /api/v1/tickets/filter` (filter tickets)

Technical notes:

- Uses `asyncHandler` for all controllers.
- JWT-protected routes with role-aware access for Admin/Supervisor/Agent/Customer.
- Redis caching for ticket lists, filtered results, and ticket history.
- Publishes Kafka events (`ticket.created`, `ticket.updated`, `ticket.assigned`, `ticket.closed`, `ticket.reopened`, `ticket.commented`).
- Tracks ticket comments and audit history in the same document.
- Supports ticket statuses: `OPEN`, `IN_PROGRESS`, `WAITING_CUSTOMER`, `RESOLVED`, `CLOSED`.

### 6) Notification Service (`notification-service`)
Main APIs:

- `GET /api/v1/notifications` (list notifications for current user or all for Admin/Supervisor)
- `GET /api/v1/notifications/:id` (notification details)
- `PATCH /api/v1/notifications/:id/read` (mark notification as read)
- `PATCH /api/v1/notifications/read-all` (mark all visible notifications as read)
- `POST /api/v1/notifications` (manual in-app notification)
- `POST /api/v1/notifications/email` (send email notification and store it)
- `POST /api/v1/notifications/sms` (send SMS notification and store it)
- `POST /api/v1/notifications/ticket-update` (send ticket update notifications)

Technical notes:

- Stores every notification in MongoDB.
- Consumes Kafka events from Auth, Customer, User, and Ticket services.
- Automatically creates in-app notifications for system actions and ticket lifecycle updates.
- Supports multi-channel delivery: `IN_APP`, `EMAIL`, and `SMS`.
- Email uses **Brevo** when configured, while SMS supports `mock` mode or **Brevo SMS**.

### 7) Report Service (`report-service`)
Main APIs:

- `GET /api/v1/reports/tickets-per-day`
- `GET /api/v1/reports/agent-performance`
- `GET /api/v1/reports/customer-satisfaction`
- `GET /api/v1/reports/ticket-status-report`

Technical notes:

- Builds reporting read-models from Kafka events only.
- Consumes Kafka events from Customer, User, and Ticket services.
- Stores ticket, agent, customer, and event projections in MongoDB.
- Uses Redis caching for generated report responses.
- Supports management access for operational reports and self-access for agent performance.

---

## Invite Flow (Kafka)

1. Admin invites a Customer/Agent via Auth Service.
2. Auth Service creates a disabled Auth user with a reset token.
3. Auth Service publishes `customer.invited` or `agent.invited`.
4. Customer/User Service consumes the event and creates the profile.
5. Customer/User Service publishes `customer.provisioned` or `agent.provisioned`.
6. Auth Service consumes provisioned event and links `linkedId`.
7. Email Service consumes invite event and sends the real email.
8. User sets password via `POST /api/v1/auth/reset-password` (account becomes active).

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
  user-service/
    src/
      config/
      controller/
      models/
      routes/
      middleware/
      utils/
  ticket-service/
    src/
      config/
      controller/
      models/
      routes/
      middleware/
      utils/
  notification-service/
    src/
      config/
      controller/
      events/
      models/
      routes/
      middleware/
      services/
      utils/
  report-service/
    src/
      config/
      controller/
      events/
      models/
      routes/
      middleware/
      services/
      utils/
  email-service/
    src/
      config/
      events/
      services/
      templates/
      utils/
```

---

## Run Locally

Each service is standalone.

1. Copy `.env.example` to `.env` inside each service folder (or edit `.env`).
2. Install dependencies per service:

```bash
cd auth-service && npm install
cd ../customer-service && npm install
cd ../user-service && npm install
cd ../ticket-service && npm install
cd ../notification-service && npm install
cd ../report-service && npm install
cd ../email-service && npm install
```

3. Run each service:

```bash
cd auth-service && npm run dev
cd ../customer-service && npm run dev
cd ../user-service && npm run dev
cd ../ticket-service && npm run dev
cd ../notification-service && npm run dev
cd ../report-service && npm run dev
cd ../email-service && npm run dev
```

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
