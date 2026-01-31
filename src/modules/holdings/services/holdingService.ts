import { db } from "../../../database/drizzle";
import { and, asc, desc, eq, inArray, sql, count } from "drizzle-orm";
import { holdings, holding_types } from "../../../database/schemas/postgre/schema";
import type {
  DuplicateHoldingPayload,
  HoldingCreate,
  HoldingUpdate,
} from "../validation";
import { Errors } from "../../../utils/error";

export class HoldingService {
  async createHolding(userId: string, data: HoldingCreate) {
    return db
      .insert(holdings)
      .values({
        ...data,
        user_id: userId,
        invested_amount: String(data.invested_amount),
        current_value: String(data.current_value),
        units: data.units ? String(data.units) : undefined,
        avg_buy_price: data.avg_buy_price ? String(data.avg_buy_price) : undefined,
        current_price: data.current_price ? String(data.current_price) : undefined,
        month: data.month === null ? undefined : data.month,
        year: data.year === null ? undefined : data.year,
      })
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
        orderByClause =
          order === "asc" ? asc(holdings.name) : desc(holdings.name);
        break;
      case "platform":
        orderByClause =
          order === "asc" ? asc(holdings.platform) : desc(holdings.platform);
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
      case "holding_type":
        orderByClause =
          order === "asc" ? asc(holding_types.name) : desc(holding_types.name);
        break;
      case "updated_at":
        orderByClause =
          order === "asc"
            ? asc(holdings.updated_at)
            : desc(holdings.updated_at);
        break;
      case "created_at":
      default:
        orderByClause =
          order === "asc"
            ? asc(holdings.created_at)
            : desc(holdings.created_at);
        break;
    }

    const results = await db
      .select({
        holding: holdings,
        holding_type: holding_types,
      })
      .from(holdings)
      .leftJoin(holding_types, eq(holdings.holding_type_id, holding_types.id))
      .where(and(...where))
      .orderBy(orderByClause);

    return results.map((r) => ({
      ...r.holding,
      holding_type: r.holding_type,
    }));
  }

  async updateHolding(id: number, data: HoldingUpdate) {
    const existing = await this.getHoldingById(id);
    if (!existing) {
      throw Errors.NotFound("Holding");
    }

    const updateData: any = { ...data };
    if (data.invested_amount !== undefined)
      updateData.invested_amount = String(data.invested_amount);
    if (data.current_value !== undefined)
      updateData.current_value = String(data.current_value);
    if (data.avg_buy_price !== undefined && data.avg_buy_price !== null)
      updateData.avg_buy_price = String(data.avg_buy_price);
    if (data.current_price !== undefined && data.current_price !== null)
      updateData.current_price = String(data.current_price);
    if (data.units !== undefined && data.units !== null)
      updateData.units = String(data.units);
    
    if (data.month === null) delete updateData.month;
    if (data.year === null) delete updateData.year;

    return db
      .update(holdings)
      .set({ ...updateData, updated_at: new Date().toISOString() })
      .where(eq(holdings.id, BigInt(id)))
      .returning();
  }

  async deleteHolding(id: number) {
    const existing = await this.getHoldingById(id);
    if (!existing) {
      throw Errors.NotFound("Holding");
    }
    return db
      .delete(holdings)
      .where(eq(holdings.id, BigInt(id)))
      .returning();
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

  async getSummary(userId: string, month?: number, year?: number) {
    const where = [eq(holdings.user_id, userId)];
    if (month) where.push(eq(holdings.month, month));
    if (year) where.push(eq(holdings.year, year));

    const [totals] = await db
      .select({
        totalInvested: sql<number>`sum(${holdings.invested_amount})`.mapWith(
          Number
        ),
        totalCurrentValue: sql<number>`sum(${holdings.current_value})`.mapWith(
          Number
        ),
        holdingsCount: count(holdings.id),
      })
      .from(holdings)
      .where(and(...where));

    const totalInvested = totals?.totalInvested || 0;
    const totalCurrentValue = totals?.totalCurrentValue || 0;
    const holdingsCount = totals?.holdingsCount || 0;

    const totalProfitLoss = totalCurrentValue - totalInvested;
    const totalProfitLossPercentage =
      totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    const typeResults = await db
      .select({
        name: holding_types.name,
        invested: sql<number>`sum(${holdings.invested_amount})`.mapWith(Number),
        current: sql<number>`sum(${holdings.current_value})`.mapWith(Number),
      })
      .from(holdings)
      .leftJoin(holding_types, eq(holdings.holding_type_id, holding_types.id))
      .where(and(...where))
      .groupBy(holding_types.name);

    const typeBreakdown = typeResults.map((r) => {
      const invested = r.invested || 0;
      const current = r.current || 0;
      return {
        name: r.name || "Unknown",
        invested,
        current,
        profitLoss: current - invested,
        profitLossPercentage:
          invested > 0 ? ((current - invested) / invested) * 100 : 0,
      };
    });

    const platformResults = await db
      .select({
        name: holdings.platform,
        invested: sql<number>`sum(${holdings.invested_amount})`.mapWith(Number),
        current: sql<number>`sum(${holdings.current_value})`.mapWith(Number),
      })
      .from(holdings)
      .where(and(...where))
      .groupBy(holdings.platform);

    const platformBreakdown = platformResults.map((r) => {
      const invested = r.invested || 0;
      const current = r.current || 0;
      return {
        name: r.name,
        invested,
        current,
        profitLoss: current - invested,
        profitLossPercentage:
          invested > 0 ? ((current - invested) / invested) * 100 : 0,
      };
    });

    return {
      totalInvested,
      totalCurrentValue,
      totalProfitLoss,
      totalProfitLossPercentage,
      holdingsCount,
      typeBreakdown,
      platformBreakdown,
    };
  }

  async getTrends(userId: string, years?: number[]) {
    const where = [eq(holdings.user_id, userId)];
    if (years && years.length > 0) {
      where.push(inArray(holdings.year, years));
    }

    const results = await db
      .select({
        month: holdings.month,
        year: holdings.year,
        invested: sql<number>`sum(${holdings.invested_amount})`.mapWith(Number),
        current: sql<number>`sum(${holdings.current_value})`.mapWith(Number),
      })
      .from(holdings)
      .where(and(...where))
      .groupBy(holdings.year, holdings.month)
      .orderBy(asc(holdings.year), asc(holdings.month));

    return results.map((r) => {
      const invested = r.invested || 0;
      const current = r.current || 0;
      const date = `${r.year}-${String(r.month).padStart(2, "0")}`;
      return {
        date,
        invested,
        current,
        profitLoss: current - invested,
        profitLossPercentage:
          invested > 0 ? ((current - invested) / invested) * 100 : 0,
      };
    });
  }

  async duplicateHoldingsByMonth(
    userId: string,
    data: DuplicateHoldingPayload
  ) {
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
      throw Errors.InvalidInput(
        "source holdings",
        "No holdings found for the source period"
      );
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

  async compareMonths(
    userId: string,
    fromMonth?: number,
    fromYear?: number,
    toMonth?: number,
    toYear?: number
  ) {
    // Default to current month vs previous month if not provided
    const currentDate = new Date();
    const tMonth = toMonth ?? currentDate.getMonth() + 1;
    const tYear = toYear ?? currentDate.getFullYear();

    // If fromMonth not provided, calculate previous month from toMonth
    let fMonth = fromMonth;
    let fYear = fromYear;

    if (fMonth === undefined && fYear === undefined) {
      fMonth = tMonth - 1;
      fYear = tYear;
      if (fMonth === 0) {
        fMonth = 12;
        fYear = tYear - 1;
      }
    } else {
      // If partially provided, default missing parts to current/target date
      if (fMonth === undefined) fMonth = tMonth;
      if (fYear === undefined) fYear = tYear;
    }

    const prevSummary = await this.getSummary(userId, fMonth, fYear);
    const currentSummary = await this.getSummary(userId, tMonth, tYear);

    const investedDiff =
      currentSummary.totalInvested - prevSummary.totalInvested;
    const currentValueDiff =
      currentSummary.totalCurrentValue - prevSummary.totalCurrentValue;
    const profitLossDiff =
      currentSummary.totalProfitLoss - prevSummary.totalProfitLoss;
    const holdingsCountDiff =
      currentSummary.holdingsCount - prevSummary.holdingsCount;

    const investedDiffPercentage =
      prevSummary.totalInvested > 0
        ? (investedDiff / prevSummary.totalInvested) * 100
        : 0;

    const currentValueDiffPercentage =
      prevSummary.totalCurrentValue > 0
        ? (currentValueDiff / prevSummary.totalCurrentValue) * 100
        : 0;

    const holdingsCountDiffPercentage =
      prevSummary.holdingsCount > 0
        ? (holdingsCountDiff / prevSummary.holdingsCount) * 100
        : 0;

    // Helper to compare breakdowns
    const compareBreakdowns = (
      prev: typeof prevSummary.typeBreakdown,
      curr: typeof currentSummary.typeBreakdown
    ) => {
      const prevMap = new Map(prev.map((i) => [i.name, i]));
      const currMap = new Map(curr.map((i) => [i.name, i]));
      const allNames = new Set([...prevMap.keys(), ...currMap.keys()]);

      return Array.from(allNames).map((name) => {
        const prevData = prevMap.get(name) || {
          invested: 0,
          current: 0,
          profitLoss: 0,
          profitLossPercentage: 0,
        };
        const currData = currMap.get(name) || {
          invested: 0,
          current: 0,
          profitLoss: 0,
          profitLossPercentage: 0,
        };

        return {
          name,
          to: { name, ...currData },
          from: { name, ...prevData },
          investedDiff: currData.invested - prevData.invested,
          currentValueDiff: currData.current - prevData.current,
          investedDiffPercentage:
            prevData.invested > 0
              ? ((currData.invested - prevData.invested) / prevData.invested) *
                100
              : 0,
          currentValueDiffPercentage:
            prevData.current > 0
              ? ((currData.current - prevData.current) / prevData.current) * 100
              : 0,
        };
      });
    };

    const typeComparison = compareBreakdowns(
      prevSummary.typeBreakdown,
      currentSummary.typeBreakdown
    );
    const platformComparison = compareBreakdowns(
      prevSummary.platformBreakdown,
      currentSummary.platformBreakdown
    );

    return {
      fromMonth: { month: fMonth, year: fYear },
      toMonth: { month: tMonth, year: tYear },
      summary: {
        from: prevSummary,
        to: currentSummary,
        investedDiff,
        currentValueDiff,
        profitLossDiff,
        holdingsCountDiff,
        investedDiffPercentage,
        currentValueDiffPercentage,
        holdingsCountDiffPercentage,
      },
      typeComparison,
      platformComparison,
    };
  }
}
