import { db } from "../../database/drizzle";
import { and, asc, desc, eq } from "drizzle-orm";
import { holdings, holding_types } from "../../database/schemas/postgre/schema";
import type { DuplicateHoldingPayload, HoldingCreate, HoldingUpdate } from "../../types/holding";
import { Errors } from "../../utils/error";

export class HoldingService {
  async createHolding(userId: string, data: HoldingCreate) {
    return db
      .insert(holdings)
      .values({ ...data, user_id: userId })
      .returning();
  }

  async getHoldingById(id: number) {
    const holding = await db.query.holdings.findFirst({
      where: eq(holdings.id, BigInt(id)),
      with: {
        holding_type: true,
      },
    });
    if (!holding) {
      throw Errors.NotFound("Holding");
    }
    return holding;
  }

  async getHoldingsByUserId(
    userId: string,
    month?: number,
    year?: number,
    sortBy: string = "created_at",
    order: "asc" | "desc" = "desc"
  ) {
    const where = [eq(holdings.user_id, userId)];
    if (month) {
      where.push(eq(holdings.month, month));
    }
    if (year) {
      where.push(eq(holdings.year, year));
    }

    let orderByClause;
    switch (sortBy) {
      case "name":
        orderByClause = order === "asc" ? asc(holdings.name) : desc(holdings.name);
        break;
      case "invested_amount":
        orderByClause =
          order === "asc"
            ? asc(holdings.invested_amount)
            : desc(holdings.invested_amount);
        break;
      case "current_value":
        orderByClause =
          order === "asc"
            ? asc(holdings.current_value)
            : desc(holdings.current_value);
        break;
      case "month":
        orderByClause = order === "asc" ? asc(holdings.month) : desc(holdings.month);
        break;
      case "year":
        orderByClause = order === "asc" ? asc(holdings.year) : desc(holdings.year);
        break;
      case "updated_at":
        orderByClause =
          order === "asc" ? asc(holdings.updated_at) : desc(holdings.updated_at);
        break;
      case "created_at":
      default:
        orderByClause =
          order === "asc" ? asc(holdings.created_at) : desc(holdings.created_at);
        break;
    }

    return db.query.holdings.findMany({
      where: (_, { and }) => and(...where),
      with: {
        holding_type: true,
      },
      orderBy: [orderByClause],
    });
  }

  async updateHolding(id: number, data: HoldingUpdate) {
    const existing = await this.getHoldingById(id);
    if (!existing) {
      throw Errors.NotFound("Holding");
    }
    return db
      .update(holdings)
      .set({ ...data, updated_at: new Date().toISOString() })
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
    return db.query.holding_types.findMany();
  }

  async getHoldingTypeById(id: number) {
    const holdingType = await db.query.holding_types.findFirst({
      where: eq(holding_types.id, id),
    });
    if (!holdingType) {
      throw Errors.NotFound("Holding Type");
    }
    return holdingType;
  }

  async duplicateHoldingsByMonth(userId: string, data: DuplicateHoldingPayload) {
    const { fromMonth, fromYear, toMonth, toYear, overwrite } = data;

    // 1. Get source holdings
    const sourceHoldings = await db.query.holdings.findMany({
      where: and(
        eq(holdings.user_id, userId),
        eq(holdings.month, fromMonth),
        eq(holdings.year, fromYear)
      ),
    });

    if (sourceHoldings.length === 0) {
      throw Errors.InvalidInput("source holdings", "No holdings found for the source period");
    }

    return await db.transaction(async (tx) => {
      // 2. If overwrite is true, delete existing target holdings
      if (overwrite) {
        await tx
          .delete(holdings)
          .where(
            and(
              eq(holdings.user_id, userId),
              eq(holdings.month, toMonth),
              eq(holdings.year, toYear)
            )
          );
      }

      // 3. Prepare new holdings (excluding 'id', 'created_at', 'updated_at')
      const newHoldings = sourceHoldings.map((h) => ({
        user_id: h.user_id,
        name: h.name,
        platform: h.platform,
        holding_type_id: h.holding_type_id,
        currency: h.currency,
        invested_amount: h.invested_amount,
        current_value: h.current_value,
        units: h.units,
        avg_buy_price: h.avg_buy_price,
        current_price: h.current_price,
        last_updated: h.last_updated,
        notes: h.notes,
        month: toMonth,
        year: toYear,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // 4. Insert new holdings
      return tx.insert(holdings).values(newHoldings).returning();
    });
  }
}
