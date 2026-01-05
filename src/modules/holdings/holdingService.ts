import { db } from "../../database/drizzle";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { holdings, holding_types } from "../../database/schemas/postgre/schema";
import type {
  DuplicateHoldingPayload,
  HoldingCreate,
  HoldingUpdate,
} from "../../types/holding";
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

    const results = await db
      .select({
        invested_amount: holdings.invested_amount,
        current_value: holdings.current_value,
        holding_type: holding_types.name,
        platform: holdings.platform,
      })
      .from(holdings)
      .leftJoin(holding_types, eq(holdings.holding_type_id, holding_types.id))
      .where(and(...where));

    // Get holdings count
    const countResult = await db
      .select({ count: holdings.id })
      .from(holdings)
      .where(and(...where));
    
    const holdingsCount = countResult.length;

    let totalInvested = 0;
    let totalCurrentValue = 0;
    const typeBreakdown: Record<string, { invested: number; current: number }> =
      {};
    const platformBreakdown: Record<
      string,
      { invested: number; current: number }
    > = {};

    results.forEach((r) => {
      const invested = Number(r.invested_amount);
      const current = Number(r.current_value);
      totalInvested += invested;
      totalCurrentValue += current;

      const type = r.holding_type || "Unknown";
      if (!typeBreakdown[type])
        typeBreakdown[type] = { invested: 0, current: 0 };
      typeBreakdown[type].invested += invested;
      typeBreakdown[type].current += current;

      const platform = r.platform;
      if (!platformBreakdown[platform])
        platformBreakdown[platform] = { invested: 0, current: 0 };
      platformBreakdown[platform].invested += invested;
      platformBreakdown[platform].current += current;
    });

    const totalProfitLoss = totalCurrentValue - totalInvested;
    const totalProfitLossPercentage =
      totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalCurrentValue,
      totalProfitLoss,
      totalProfitLossPercentage,
      holdingsCount,
      typeBreakdown: Object.entries(typeBreakdown).map(([name, data]) => ({
        name,
        ...data,
        profitLoss: data.current - data.invested,
        profitLossPercentage:
          data.invested > 0
            ? ((data.current - data.invested) / data.invested) * 100
            : 0,
      })),
      platformBreakdown: Object.entries(platformBreakdown).map(
        ([name, data]) => ({
          name,
          ...data,
          profitLoss: data.current - data.invested,
          profitLossPercentage:
            data.invested > 0
              ? ((data.current - data.invested) / data.invested) * 100
              : 0,
        })
      ),
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
        invested_amount: holdings.invested_amount,
        current_value: holdings.current_value,
      })
      .from(holdings)
      .where(and(...where))
      .orderBy(asc(holdings.year), asc(holdings.month));

    const trends: Record<string, { invested: number; current: number }> = {};

    results.forEach((r) => {
      const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
      if (!trends[key]) trends[key] = { invested: 0, current: 0 };
      trends[key].invested += Number(r.invested_amount);
      trends[key].current += Number(r.current_value);
    });

    return Object.entries(trends).map(([date, data]) => ({
      date,
      ...data,
      profitLoss: data.current - data.invested,
      profitLossPercentage:
        data.invested > 0
          ? ((data.current - data.invested) / data.invested) * 100
          : 0,
    }));
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

  async compareMonths(userId: string, fromMonth?: number, fromYear?: number, toMonth?: number, toYear?: number) {
    // Default to current month vs previous month if not provided
    const currentDate = new Date();
    const currentMonth = toMonth ?? currentDate.getMonth() + 1;
    const currentYear = toYear ?? currentDate.getFullYear();
    
    // If fromMonth not provided, calculate previous month from toMonth
    let prevMonth = fromMonth;
    let prevYear = fromYear;
    if (!prevMonth || !prevYear) {
      prevMonth = currentMonth - 1;
      prevYear = currentYear;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = currentYear - 1;
      }
    }

    // Get data for both months
    const currentSummary = await this.getSummary(userId, currentMonth, currentYear);
    const prevSummary = await this.getSummary(userId, prevMonth, prevYear);

    // Calculate differences
    const investedDiff = currentSummary.totalInvested - prevSummary.totalInvested;
    const currentValueDiff = currentSummary.totalCurrentValue - prevSummary.totalCurrentValue;
    const profitLossDiff = currentSummary.totalProfitLoss - prevSummary.totalProfitLoss;
    const holdingsCountDiff = currentSummary.holdingsCount - prevSummary.holdingsCount;

    const investedDiffPercentage = prevSummary.totalInvested > 0 
      ? (investedDiff / prevSummary.totalInvested) * 100 
      : 0;
    
    const currentValueDiffPercentage = prevSummary.totalCurrentValue > 0 
      ? (currentValueDiff / prevSummary.totalCurrentValue) * 100 
      : 0;

    const holdingsCountDiffPercentage = prevSummary.holdingsCount > 0 
      ? (holdingsCountDiff / prevSummary.holdingsCount) * 100 
      : 0;

    // Compare type breakdowns
    const typeComparison = currentSummary.typeBreakdown.map(currentType => {
      const prevType = prevSummary.typeBreakdown.find(t => t.name === currentType.name);
      const prevInvested = prevType?.invested || 0;
      const prevCurrent = prevType?.current || 0;
      
      return {
        name: currentType.name,
        to: currentType,
        from: prevType || { name: currentType.name, invested: 0, current: 0, profitLoss: 0, profitLossPercentage: 0 },
        investedDiff: currentType.invested - prevInvested,
        currentValueDiff: currentType.current - prevCurrent,
        investedDiffPercentage: prevInvested > 0 ? ((currentType.invested - prevInvested) / prevInvested) * 100 : 0,
        currentValueDiffPercentage: prevCurrent > 0 ? ((currentType.current - prevCurrent) / prevCurrent) * 100 : 0,
      };
    });

    // Compare platform breakdowns
    const platformComparison = currentSummary.platformBreakdown.map(currentPlatform => {
      const prevPlatform = prevSummary.platformBreakdown.find(p => p.name === currentPlatform.name);
      const prevInvested = prevPlatform?.invested || 0;
      const prevCurrent = prevPlatform?.current || 0;
      
      return {
        name: currentPlatform.name,
        to: currentPlatform,
        from: prevPlatform || { name: currentPlatform.name, invested: 0, current: 0, profitLoss: 0, profitLossPercentage: 0 },
        investedDiff: currentPlatform.invested - prevInvested,
        currentValueDiff: currentPlatform.current - prevCurrent,
        investedDiffPercentage: prevInvested > 0 ? ((currentPlatform.invested - prevInvested) / prevInvested) * 100 : 0,
        currentValueDiffPercentage: prevCurrent > 0 ? ((currentPlatform.current - prevCurrent) / prevCurrent) * 100 : 0,
      };
    });

    return {
      fromMonth: { month: prevMonth, year: prevYear },
      toMonth: { month: currentMonth, year: currentYear },
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
