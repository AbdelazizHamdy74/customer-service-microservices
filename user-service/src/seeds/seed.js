const mongoose = require("mongoose");
const dotenv = require("dotenv");

const Agent = require("../models/Agent");

dotenv.config();

const agents = [
  {
    firstName: "Ahmed",
    lastName: "Hassan",
    email: "ahmed.hassan@csm.com",
    phone: "+201001112233",
    role: "ADMIN",
    status: "ACTIVE",
    team: "Operations",
    skills: ["Escalations", "Reporting"],
    performance: {
      ticketsHandled: 120,
      ticketsResolved: 110,
      avgResponseTimeMinutes: 6,
      avgResolutionTimeMinutes: 45,
      customerSatisfaction: 4.6,
      lastActiveAt: new Date(),
      lastUpdatedAt: new Date(),
    },
    authUserId: "admin@csm.com", // Plain login: Password123 - Linked to auth-service ADMIN user
    createdBy: "seed-script",
  },
  {
    firstName: "Mona",
    lastName: "Ali",
    email: "mona.ali@csm.com",
    phone: "+201002223344",
    role: "SUPERVISOR",
    status: "ACTIVE",
    team: "Support",
    skills: ["Coaching", "QA"],
    performance: {
      ticketsHandled: 90,
      ticketsResolved: 84,
      avgResponseTimeMinutes: 8,
      avgResolutionTimeMinutes: 55,
      customerSatisfaction: 4.3,
      lastActiveAt: new Date(),
      lastUpdatedAt: new Date(),
    },
    authUserId: "supervisor@csm.com", // Plain login: Password123 - Linked to auth-service SUPERVISOR user
    createdBy: "seed-script",
  },
  {
    firstName: "Youssef",
    lastName: "Mahmoud",
    email: "youssef.mahmoud@csm.com",
    phone: "+201003334455",
    role: "AGENT",
    status: "ACTIVE",
    team: "Support",
    skills: ["Billing", "Arabic"],
    performance: {
      ticketsHandled: 60,
      ticketsResolved: 52,
      avgResponseTimeMinutes: 10,
      avgResolutionTimeMinutes: 70,
      customerSatisfaction: 4.1,
      lastActiveAt: new Date(),
      lastUpdatedAt: new Date(),
    },
    authUserId: "agent@csm.com", // Plain login: Password123 - Linked to auth-service AGENT user
    createdBy: "seed-script",
  },
  {
    firstName: "Sara",
    lastName: "Ibrahim",
    email: "sara.ibrahim@csm.com",
    phone: "+201004445566",
    role: "AGENT",
    status: "INACTIVE",
    team: "Support",
    skills: ["Onboarding"],
    performance: {
      ticketsHandled: 15,
      ticketsResolved: 12,
      avgResponseTimeMinutes: 14,
      avgResolutionTimeMinutes: 90,
      customerSatisfaction: 3.8,
      lastActiveAt: null,
      lastUpdatedAt: new Date(),
    },
    authUserId: "test@csm.com", // Plain login: Test@123 - Linked to auth-service test user
    createdBy: "seed-script",
  },
];

async function seedAgents() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    await Agent.deleteMany({});
    console.log("Cleared agents collection");

    await Agent.insertMany(agents);
    console.log("Inserted agents successfully");

    console.log("\nSeeded agents:");
    agents.forEach((agent, index) => {
      console.log(
        `${index + 1}) ${agent.firstName} ${agent.lastName} - ${agent.role} (authUserId: ${agent.authUserId})`,
      );
    });
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

seedAgents();
