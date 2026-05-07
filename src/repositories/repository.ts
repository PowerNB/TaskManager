import { prisma } from "#root/infrastructure/prisma.js";

class Repository {
    protected client = prisma;
}

export default Repository;
