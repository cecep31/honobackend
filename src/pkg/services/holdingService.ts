import { db } from "../../database/drizzel";
import { desc, eq } from "drizzle-orm";
import { holdings, holdingTypes } from "../../database/schemas/postgre/schema";
import type { HoldingCreate, HoldingUpdate } from "../../types/holding";
import { Errors } from "../../utils/error";

export class HoldingService {
  async createHolding(userId: string, data: HoldingCreate) {
    return db
      .insert(holdings)
      .values({ ...data, userId })
      .returning();
  }

  async getHoldingById(id: number) {
    const holding = await db.query.holdings.findFirst({
      where: eq(holdings.id, BigInt(id)),
      with: {
        holdingType: true,
      },
    });
    if (!holding) {
      throw Errors.NotFound("Holding");
    }
    return holding;
  }

  async getHoldingsByUserId(userId: string, month?: number, year?: number) {
    const where = [eq(holdings.userId, userId)];
    if (month) {
      where.push(eq(holdings.month, month));
    }
    if (year) {
      where.push(eq(holdings.year, year));
    }

    return db.query.holdings.findMany({
      where: (_, { and }) => and(...where),
      with: {
        holdingType: true,
      },
      orderBy: [desc(holdings.createdAt)],
    });
  }

  async updateHolding(id: number, data: HoldingUpdate) {
    const existing = await this.getHoldingById(id);
    if (!existing) {
      throw Errors.NotFound("Holding");
    }
    return db
      .update(holdings)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(holdings.id, BigInt(id)))
      .returning();
  }

  async deleteHolding(id: number) {
    const existing = await this.getHoldingById(id);
    if (!existing) {
      throw Errors.NotFound("Holding");
    }
    return db.delete(holdings).where(eq(holdings.id, BigInt(id))).returning();
  }

  async getHoldingTypes() {
    return db.query.holdingTypes.findMany();
  }

  async getHoldingTypeById(id: number) {
    const holdingType = await db.query.holdingTypes.findFirst({
      where: eq(holdingTypes.id, id),
    });
    if (!holdingType) {
      throw Errors.NotFound("Holding Type");
    }
    return holdingType;
  }
}