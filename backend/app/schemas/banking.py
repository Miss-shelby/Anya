from typing import List, Literal
from pydantic import BaseModel, Field


class SimulatedTransaction(BaseModel):
    id: str
    date: str
    description: str
    category: str
    type: Literal["credit", "debit"]
    amount: int = Field(..., ge=0)


class SimulatedAccount(BaseModel):
    is_simulation: bool = True
    bank_name: str
    account_name: str
    masked_account_number: str
    currency: str = "NGN"
    available_balance: int
    spoken_balance: str
    disclaimer: str


class BankingSummaryResponse(BaseModel):
    is_simulation: bool = True
    account: SimulatedAccount
    transactions: List[SimulatedTransaction]
    spoken_transactions_summary: str
