const mongoose = require("mongoose");
const dotenv = require("dotenv");

const Ticket = require("../models/Ticket");

dotenv.config();

const tickets = [
  {
    subject: "Billing issue on latest invoice",
    description:
      "Customer reported an unexpected charge on the March invoice and asked for clarification.",
    customerId: "customer-1001", // Replace with actual Customer _id after seeding customers
    assignedAgentId: "agent-2001", // Replace with actual Agent _id after seeding agents
    status: "IN_PROGRESS",
    createdBy: "seed-script",
    lastUpdatedBy: "seed-script",
    comments: [
      {
        authorId: "agent-2001",
        authorRole: "AGENT",
        message: "Investigating the invoice line items and payment reference.",
      },
    ],
    history: [
      {
        action: "CREATED",
        actorId: "seed-script",
        actorRole: "SYSTEM",
        toStatus: "OPEN",
        note: "Ticket created from seed",
      },
      {
        action: "ASSIGNED",
        actorId: "seed-script",
        actorRole: "SYSTEM",
        note: "Ticket assigned to billing queue",
        meta: {
          fromAssignedAgentId: null,
          toAssignedAgentId: "agent-2001",
        },
      },
      {
        action: "STATUS_CHANGED",
        actorId: "seed-script",
        actorRole: "SYSTEM",
        fromStatus: "OPEN",
        toStatus: "IN_PROGRESS",
        note: "Work started",
      },
    ],
  },
  {
    subject: "Unable to reset password",
    description:
      "Customer cannot complete the password reset flow after receiving the email.",
    customerId: "customer-1002", // Replace with actual Customer _id after seeding customers
    assignedAgentId: "agent-2002", // Replace with actual Agent _id after seeding agents
    status: "WAITING_CUSTOMER",
    createdBy: "seed-script",
    lastUpdatedBy: "seed-script",
    comments: [
      {
        authorId: "agent-2002",
        authorRole: "AGENT",
        message:
          "Asked customer to confirm whether the reset token was already used.",
      },
    ],
    history: [
      {
        action: "CREATED",
        actorId: "seed-script",
        actorRole: "SYSTEM",
        toStatus: "OPEN",
        note: "Ticket created from seed",
      },
      {
        action: "ASSIGNED",
        actorId: "seed-script",
        actorRole: "SYSTEM",
        note: "Assigned to support agent",
        meta: {
          fromAssignedAgentId: null,
          toAssignedAgentId: "agent-2002",
        },
      },
      {
        action: "STATUS_CHANGED",
        actorId: "seed-script",
        actorRole: "SYSTEM",
        fromStatus: "OPEN",
        toStatus: "WAITING_CUSTOMER",
        note: "Waiting for customer confirmation",
      },
    ],
  },
  {
    subject: "Request to reopen closed account complaint",
    description:
      "Customer says the issue recurred after the last closure and needs the case reopened.",
    customerId: "customer-1003", // Replace with actual Customer _id after seeding customers
    assignedAgentId: "agent-2003", // Replace with actual Agent _id after seeding agents
    status: "CLOSED",
    createdBy: "seed-script",
    lastUpdatedBy: "seed-script",
    closedAt: new Date(),
    history: [
      {
        action: "CREATED",
        actorId: "seed-script",
        actorRole: "SYSTEM",
        toStatus: "OPEN",
        note: "Ticket created from seed",
      },
      {
        action: "STATUS_CHANGED",
        actorId: "seed-script",
        actorRole: "SYSTEM",
        fromStatus: "OPEN",
        toStatus: "RESOLVED",
        note: "Ticket resolved",
      },
      {
        action: "CLOSED",
        actorId: "seed-script",
        actorRole: "SYSTEM",
        fromStatus: "RESOLVED",
        toStatus: "CLOSED",
        note: "Ticket closed after confirmation",
      },
    ],
  },
];

async function seedTickets() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    await Ticket.deleteMany({});
    console.log("Cleared tickets collection");

    await Ticket.insertMany(tickets);
    console.log("Inserted tickets successfully");

    console.log("\nSeeded tickets:");
    tickets.forEach((ticket, index) => {
      console.log(`${index + 1}) ${ticket.subject} - ${ticket.status}`);
    });
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

seedTickets();
