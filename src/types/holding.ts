
export type HoldingCreate = {
  name: string;
  platform: string;
  holding_type_id: number;
  currency: string;
  invested_amount: string;
  current_value: string;
  units?: string;
  avg_buy_price?: string;
  current_price?: string;
  last_updated?: string;
  notes?: string;
  month?: number;
  year?: number;
};

export type HoldingUpdate = {
  name?: string;
  platform?: string;
  holding_type_id?: number;
  currency?: string;
  invested_amount?: string;
  current_value?: string;
  units?: string;
  avg_buy_price?: string;
  current_price?: string;
  last_updated?: string;
  notes?: string;
  month?: number;
  year?: number;
};

export type DuplicateHoldingPayload = {
  fromMonth: number;
  fromYear: number;
  toMonth: number;
  toYear: number;
  overwrite?: boolean;
};