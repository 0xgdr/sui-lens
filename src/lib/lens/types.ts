export type EvidenceLevel = 'observed' | 'decoded' | 'inferred';

export interface EvidenceItem {
  label: string;
  value: string;
  raw?: string;
  emphasis?: 'total';
}

export interface LensAnswer {
  id: 'actor' | 'inputs' | 'commands' | 'effects' | 'cost';
  number: string;
  question: string;
  answer: string;
  level: EvidenceLevel;
  evidence: EvidenceItem[];
  lessonHref: string;
  lessonLabel: string;
}

export interface LensReport {
  digest: string;
  network: 'mainnet' | 'testnet' | 'devnet';
  status: 'success' | 'failure';
  summary: string;
  answers: LensAnswer[];
  rawJson: string;
}

export interface NormalizedOwner {
  kind: string;
  value: string;
}

export interface NormalizedInput {
  index: number;
  kind: string;
  summary: string;
  raw: string;
}

export interface NormalizedCommand {
  index: number;
  kind: string;
  summary: string;
  raw: string;
}

export interface NormalizedObjectChange {
  objectId: string;
  lifecycle: 'created' | 'mutated' | 'deleted' | 'other';
  objectType?: string;
  inputVersion: string | null;
  outputVersion: string | null;
  inputOwner: NormalizedOwner | null;
  outputOwner: NormalizedOwner | null;
}

export interface NormalizedBalanceChange {
  address: string;
  coinType: string;
  amount: string;
}

export interface NormalizedTransaction {
  digest: string;
  network: LensReport['network'];
  status: LensReport['status'];
  error: string | null;
  sender: string | null;
  gasOwner: string | null;
  gasPayments: Array<{ objectId: string; version: string; digest: string }>;
  inputs: NormalizedInput[];
  commands: NormalizedCommand[];
  objectChanges: NormalizedObjectChange[];
  balanceChanges: NormalizedBalanceChange[];
  gas: {
    computationCost: string;
    storageCost: string;
    storageRebate: string;
    nonRefundableStorageFee: string;
  } | null;
  rawJson: string;
}

export interface TransactionSource<TRaw = unknown> {
  getTransaction(digest: string): Promise<TRaw>;
}

export interface TransactionExplainer<TRaw = unknown> {
  explain(raw: TRaw): LensReport;
}
