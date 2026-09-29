export type DealerNightOption = { id: string; name: string };

export type TargetRow = {
  customerId: string;
  dealerNightId: string;
  mgCode: string;
  mgName: string;
  depotCode: string;
  depotName: string;
  salesman: string | null;
  spv: string | null;
  targetAwal: number;
  targetEfektif: number;
  delta: number;
  lastAdjustedAt: string | null;
  rank?: number;
};

export type TargetResponse = { dealerNightId: string; rows: TargetRow[] };
