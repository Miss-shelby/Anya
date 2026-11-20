from typing import List
from fastapi import APIRouter

from app.schemas.banking import (
    BankingSummaryResponse,
    SimulatedAccount,
    SimulatedTransaction,
)
from app.services.banking_sim import (
    get_demo_account,
    get_demo_banking_summary,
    get_demo_transactions,
)

router = APIRouter(prefix="/api/banking/demo", tags=["banking-simulation"])


@router.get("/balance", response_model=SimulatedAccount)
def read_demo_balance():
    return get_demo_account()


@router.get("/transactions", response_model=List[SimulatedTransaction])
def read_demo_transactions():
    return get_demo_transactions()


@router.get("/summary", response_model=BankingSummaryResponse)
def read_demo_summary():
    return get_demo_banking_summary()
