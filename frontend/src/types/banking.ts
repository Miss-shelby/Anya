export interface SimulatedTransaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'credit' | 'debit';
  amount: number;
}

export interface SimulatedAccount {
  is_simulation: boolean;
  bank_name: string;
  account_name: string;
  masked_account_number: string;
  currency: string;
  available_balance: number;
  spoken_balance: string;
  disclaimer: string;
}

export interface BankingSummaryResponse {
  is_simulation: boolean;
  account: SimulatedAccount;
  transactions: SimulatedTransaction[];
  spoken_transactions_summary: string;
}
