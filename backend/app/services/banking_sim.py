from app.schemas.banking import (
    BankingSummaryResponse,
    SimulatedAccount,
    SimulatedTransaction,
)

# Strictly simulated fake Nigerian banking data for hackathon demonstration.
# Never connects to a real bank, never requests PINs, passwords, or OTPs.
DEMO_ACCOUNT = SimulatedAccount(
    is_simulation=True,
    bank_name="ANYA Demo MicroBank (Simulation)",
    account_name="Chinedu Okafor (Demo)",
    masked_account_number="**** 4821",
    currency="NGN",
    available_balance=45500,
    spoken_balance=(
        "This is your simulated demo bank account. "
        "Your available balance is ₦45,500."
    ),
    disclaimer=(
        "Simulation only: This screen uses fake Nigerian banking data for demonstration. "
        "ANYA never requests bank PINs, passwords, or OTPs and cannot perform real transfers."
    ),
)

DEMO_TRANSACTIONS: list[SimulatedTransaction] = [
    SimulatedTransaction(
        id="tx-101",
        date="Today, 09:15 AM",
        description="Shoprite Lekki POS",
        category="Groceries",
        type="debit",
        amount=6500,
    ),
    SimulatedTransaction(
        id="tx-102",
        date="Yesterday, 06:40 PM",
        description="Transfer from Ada Okafor",
        category="Family",
        type="credit",
        amount=15000,
    ),
    SimulatedTransaction(
        id="tx-103",
        date="Yesterday, 01:10 PM",
        description="MTN Airtime & Data",
        category="Utilities",
        type="debit",
        amount=2000,
    ),
    SimulatedTransaction(
        id="tx-104",
        date="2 days ago",
        description="IKEDC Prepaid Electricity",
        category="Bills",
        type="debit",
        amount=5000,
    ),
    SimulatedTransaction(
        id="tx-105",
        date="4 days ago",
        description="Monthly Stipend Credit",
        category="Income",
        type="credit",
        amount=44000,
    ),
]


def get_demo_account() -> SimulatedAccount:
    return DEMO_ACCOUNT


def get_demo_transactions() -> list[SimulatedTransaction]:
    return DEMO_TRANSACTIONS


def get_demo_banking_summary() -> BankingSummaryResponse:
    top_three = DEMO_TRANSACTIONS[:3]
    spoken_items = [
        f"a {tx.type} of ₦{tx.amount:,} for {tx.description} on {tx.date}"
        for tx in top_three
    ]
    spoken_tx = (
        "In your simulated demo account, your 3 most recent transactions are: "
        + "; ".join(spoken_items)
        + "."
    )
    return BankingSummaryResponse(
        is_simulation=True,
        account=DEMO_ACCOUNT,
        transactions=DEMO_TRANSACTIONS,
        spoken_transactions_summary=spoken_tx,
    )
