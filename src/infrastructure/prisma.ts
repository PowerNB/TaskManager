import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "#root/config.js";

const adapter = new PrismaPg({
    connectionString: config.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });
