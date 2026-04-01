const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

const User = require("../models/User");

dotenv.config();

const users = [
  {
    name: "Admin User",
    email: "admin@csm.com",
    password: "Password123", // Plain password for login: Password123
    role: "ADMIN",
    isActive: true,
  },
  {
    name: "Supervisor User",
    email: "supervisor@csm.com",
    password: "Password123", // Plain password for login: Password123
    role: "SUPERVISOR",
    isActive: true,
  },
  {
    name: "Agent User",
    email: "agent@csm.com",
    password: "Password123", // Plain password for login: Password123
    role: "AGENT",
    isActive: true,
  },
  {
    name: "Test User",
    email: "test@csm.com",
    password: "Test@123", // Plain password for login: Test@123
    role: "AGENT",
    isActive: true,
  },
];

async function seedAuthUsers() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    await User.deleteMany({});
    console.log("Cleared users collection");

    // insertMany does not run pre('save') middleware, so hash explicitly.
    const hashedUsers = await Promise.all(
      users.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 12),
      })),
    );

    await User.insertMany(hashedUsers);
    console.log("Inserted auth users successfully");

    console.log("\nLogin credentials:");
    console.log("1) admin@csm.com / Password123 (ADMIN)");
    console.log("2) supervisor@csm.com / Password123 (SUPERVISOR)");
    console.log("3) agent@csm.com / Password123 (AGENT)");
    console.log("4) test@csm.com / Test@123 (AGENT)");
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

seedAuthUsers();
