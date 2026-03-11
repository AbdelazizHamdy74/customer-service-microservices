const mongoose = require("mongoose");
const dotenv = require("dotenv");

const Customer = require("../models/Customer");

dotenv.config();

const customers = [
  {
    firstName: "Ahmed",
    lastName: "Hassan",
    email: "ahmed.hassan@example.com",
    phone: "+201001112233",
    address: {
      street: "12 Nile Street",
      city: "Cairo",
      state: "Cairo",
      country: "Egypt",
      zipCode: "11511",
    },
    status: "ACTIVE",
    createdBy: "seed-script",
  },
  {
    firstName: "Mona",
    lastName: "Ali",
    email: "mona.ali@example.com",
    phone: "+201002223344",
    address: {
      street: "25 Tanta Road",
      city: "Gharbia",
      state: "Gharbia",
      country: "Egypt",
      zipCode: "31611",
    },
    status: "ACTIVE",
    createdBy: "seed-script",
  },
  {
    firstName: "Youssef",
    lastName: "Mahmoud",
    email: "youssef.mahmoud@example.com",
    phone: "+201003334455",
    address: {
      street: "8 Alexandria Corniche",
      city: "Alexandria",
      state: "Alexandria",
      country: "Egypt",
      zipCode: "21500",
    },
    status: "INACTIVE",
    createdBy: "seed-script",
  },
  {
    firstName: "Sara",
    lastName: "Ibrahim",
    email: "sara.ibrahim@example.com",
    phone: "+201004445566",
    address: {
      street: "44 Suez Street",
      city: "Ismailia",
      state: "Ismailia",
      country: "Egypt",
      zipCode: "41511",
    },
    status: "ACTIVE",
    createdBy: "seed-script",
  },
];

async function seedCustomers() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    await Customer.deleteMany({});
    console.log("Cleared customers collection");

    await Customer.insertMany(customers);
    console.log("Inserted customers successfully");

    console.log("\nSeeded customers:");
    customers.forEach((customer, index) => {
      console.log(`${index + 1}) ${customer.firstName} ${customer.lastName} - ${customer.phone}`);
    });
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

seedCustomers();
