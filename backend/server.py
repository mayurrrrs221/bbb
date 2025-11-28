from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize Firebase Admin (mock initialization for now)
try:
    if not firebase_admin._apps:
        # Using default app without credentials for now
        firebase_admin.initialize_app()
except Exception as e:
    logging.warning(f"Firebase initialization skipped: {e}")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    uid: str
    email: str
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # 'income' or 'expense'
    amount: float
    category: str
    description: Optional[str] = None
    date: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    type: str
    amount: float
    category: str
    description: Optional[str] = None
    date: str

class Income(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    source: str
    amount: float
    frequency: str  # 'monthly', 'weekly', 'yearly'
    next_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IncomeCreate(BaseModel):
    source: str
    amount: float
    frequency: str
    next_date: Optional[str] = None

class Subscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    amount: float
    billing_cycle: str
    next_billing_date: datetime
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubscriptionCreate(BaseModel):
    name: str
    amount: float
    billing_cycle: str
    next_billing_date: str

class Alert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Conversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    messages: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

# Auth Middleware
async def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    token = credentials.credentials
    try:
        # Try to verify with Firebase
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        # For development, extract uid from token (mock)
        logging.warning(f"Firebase auth failed, using mock: {e}")
        # Mock user for development
        return {"uid": "mock-user-123", "email": "user@example.com"}

# Auth Routes
@api_router.get("/auth/me")
async def get_me(user = Depends(verify_token)):
    uid = user.get('uid')
    db_user = await db.users.find_one({"uid": uid}, {"_id": 0})
    
    if not db_user:
        new_user = User(uid=uid, email=user.get('email', 'unknown'))
        await db.users.insert_one(new_user.model_dump())
        return {"ok": True, "data": new_user.model_dump()}
    
    return {"ok": True, "data": db_user}

# Transaction Routes
@api_router.post("/transactions", response_model=Dict)
async def create_transaction(transaction: TransactionCreate, user = Depends(verify_token)):
    uid = user.get('uid')
    trans = Transaction(
        user_id=uid,
        type=transaction.type,
        amount=transaction.amount,
        category=transaction.category,
        description=transaction.description,
        date=datetime.fromisoformat(transaction.date.replace('Z', '+00:00'))
    )
    
    doc = trans.model_dump()
    doc['date'] = doc['date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.transactions.insert_one(doc)
    return {"ok": True, "data": doc}

@api_router.get("/transactions", response_model=Dict)
async def get_transactions(user = Depends(verify_token)):
    uid = user.get('uid')
    transactions = await db.transactions.find({"user_id": uid}, {"_id": 0}).to_list(1000)
    
    for t in transactions:
        if isinstance(t.get('date'), str):
            t['date'] = datetime.fromisoformat(t['date'])
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
    
    # Sort by date descending
    transactions.sort(key=lambda x: x['date'], reverse=True)
    
    return {"ok": True, "data": transactions}

@api_router.delete("/transactions/{transaction_id}", response_model=Dict)
async def delete_transaction(transaction_id: str, user = Depends(verify_token)):
    uid = user.get('uid')
    result = await db.transactions.delete_one({"id": transaction_id, "user_id": uid})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {"ok": True, "message": "Transaction deleted"}

# Income Routes
@api_router.post("/income", response_model=Dict)
async def create_income(income: IncomeCreate, user = Depends(verify_token)):
    uid = user.get('uid')
    inc = Income(
        user_id=uid,
        source=income.source,
        amount=income.amount,
        frequency=income.frequency,
        next_date=datetime.fromisoformat(income.next_date.replace('Z', '+00:00')) if income.next_date else None
    )
    
    doc = inc.model_dump()
    if doc.get('next_date'):
        doc['next_date'] = doc['next_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.income.insert_one(doc)
    return {"ok": True, "data": doc}

@api_router.get("/income", response_model=Dict)
async def get_income(user = Depends(verify_token)):
    uid = user.get('uid')
    incomes = await db.income.find({"user_id": uid}, {"_id": 0}).to_list(100)
    return {"ok": True, "data": incomes}

@api_router.delete("/income/{income_id}", response_model=Dict)
async def delete_income(income_id: str, user = Depends(verify_token)):
    uid = user.get('uid')
    result = await db.income.delete_one({"id": income_id, "user_id": uid})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Income not found")
    
    return {"ok": True, "message": "Income deleted"}

# Subscription Routes
@api_router.post("/subscriptions", response_model=Dict)
async def create_subscription(sub: SubscriptionCreate, user = Depends(verify_token)):
    uid = user.get('uid')
    subscription = Subscription(
        user_id=uid,
        name=sub.name,
        amount=sub.amount,
        billing_cycle=sub.billing_cycle,
        next_billing_date=datetime.fromisoformat(sub.next_billing_date.replace('Z', '+00:00'))
    )
    
    doc = subscription.model_dump()
    doc['next_billing_date'] = doc['next_billing_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.subscriptions.insert_one(doc)
    return {"ok": True, "data": doc}

@api_router.get("/subscriptions", response_model=Dict)
async def get_subscriptions(user = Depends(verify_token)):
    uid = user.get('uid')
    subs = await db.subscriptions.find({"user_id": uid, "active": True}, {"_id": 0}).to_list(100)
    return {"ok": True, "data": subs}

@api_router.delete("/subscriptions/{sub_id}", response_model=Dict)
async def delete_subscription(sub_id: str, user = Depends(verify_token)):
    uid = user.get('uid')
    result = await db.subscriptions.update_one(
        {"id": sub_id, "user_id": uid},
        {"$set": {"active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    return {"ok": True, "message": "Subscription cancelled"}

# Dashboard Routes
@api_router.get("/dashboard", response_model=Dict)
async def get_dashboard(user = Depends(verify_token)):
    uid = user.get('uid')
    
    # Get all transactions
    transactions = await db.transactions.find({"user_id": uid}, {"_id": 0}).to_list(1000)
    
    # Calculate totals
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    total_expenses = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    balance = total_income - total_expenses
    
    # Get subscriptions
    subscriptions = await db.subscriptions.find({"user_id": uid, "active": True}, {"_id": 0}).to_list(100)
    monthly_subscriptions = sum(s['amount'] for s in subscriptions)
    
    # Category breakdown
    category_totals = {}
    for t in transactions:
        if t['type'] == 'expense':
            cat = t['category']
            category_totals[cat] = category_totals.get(cat, 0) + t['amount']
    
    # Recent transactions
    recent = sorted(transactions, key=lambda x: x.get('date', ''), reverse=True)[:5]
    
    return {
        "ok": True,
        "data": {
            "balance": round(balance, 2),
            "total_income": round(total_income, 2),
            "total_expenses": round(total_expenses, 2),
            "monthly_subscriptions": round(monthly_subscriptions, 2),
            "category_breakdown": category_totals,
            "recent_transactions": recent,
            "transaction_count": len(transactions)
        }
    }

# AI Chat Routes
@api_router.post("/ai/chat", response_model=Dict)
async def ai_chat(chat_req: ChatRequest, user = Depends(verify_token)):
    uid = user.get('uid')
    message = chat_req.message
    conversation_id = chat_req.conversation_id
    
    # Get or create conversation
    if conversation_id:
        conv = await db.conversations.find_one({"id": conversation_id, "user_id": uid}, {"_id": 0})
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        messages = conv.get('messages', [])
    else:
        messages = []
        conversation_id = str(uuid.uuid4())
    
    # Add user message
    messages.append({
        "role": "user",
        "content": message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Get user's financial context
    transactions = await db.transactions.find({"user_id": uid}, {"_id": 0}).sort("date", -1).limit(20).to_list(20)
    
    total_expenses = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    
    context = f"User's recent financial summary: Total income: ${total_income:.2f}, Total expenses: ${total_expenses:.2f}. Recent transactions: {len(transactions)}"
    
    # Generate AI response using emergentintegrations
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        llm_chat = LlmChat(
            api_key=api_key,
            session_id=conversation_id,
            system_message=f"You are Finote AI, a helpful personal finance assistant. Help users manage their finances, understand spending patterns, and make better financial decisions. Be concise, supportive, and actionable. {context}"
        )
        llm_chat.with_model("openai", "gpt-4o-mini")
        
        user_msg = UserMessage(text=message)
        ai_response = await llm_chat.send_message(user_msg)
        assistant_reply = ai_response
    except Exception as e:
        logging.error(f"AI error: {e}")
        assistant_reply = "I'm here to help with your finances! Ask me about your spending, savings goals, or budgeting tips."
    
    # Add assistant message
    messages.append({
        "role": "assistant",
        "content": assistant_reply,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Save conversation
    conv_data = {
        "id": conversation_id,
        "user_id": uid,
        "title": message[:50] if len(messages) <= 2 else conv.get('title', message[:50]),
        "messages": messages,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if await db.conversations.find_one({"id": conversation_id}):
        await db.conversations.update_one(
            {"id": conversation_id},
            {"$set": conv_data}
        )
    else:
        conv_data['created_at'] = datetime.now(timezone.utc).isoformat()
        await db.conversations.insert_one(conv_data)
    
    return {
        "ok": True,
        "data": {
            "reply": assistant_reply,
            "conversationId": conversation_id
        }
    }

@api_router.get("/ai/conversations", response_model=Dict)
async def get_conversations(user = Depends(verify_token)):
    uid = user.get('uid')
    convs = await db.conversations.find({"user_id": uid}, {"_id": 0}).sort("updated_at", -1).to_list(50)
    return {"ok": True, "data": convs}

# AI Twin Simulation
@api_router.post("/ai/twin", response_model=Dict)
async def ai_twin(user = Depends(verify_token)):
    uid = user.get('uid')
    
    # Get financial data
    transactions = await db.transactions.find({"user_id": uid}, {"_id": 0}).to_list(1000)
    incomes = await db.income.find({"user_id": uid}, {"_id": 0}).to_list(100)
    subscriptions = await db.subscriptions.find({"user_id": uid, "active": True}, {"_id": 0}).to_list(100)
    
    total_income = sum(i['amount'] for i in incomes)
    total_expenses = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    total_subscriptions = sum(s['amount'] for s in subscriptions)
    
    avg_monthly_expense = total_expenses / max(1, len(set(t.get('date', '')[:7] for t in transactions)))
    savings_rate = ((total_income - avg_monthly_expense) / max(total_income, 1)) * 100 if total_income > 0 else 0
    
    def generate_scenario(income, expense, rate, growth):
        months = []
        balance = 0
        for i in range(1, 13):
            monthly_income = income * growth
            monthly_saving = (monthly_income * rate) / 100
            balance += monthly_saving
            months.append({
                "month": i,
                "income": round(monthly_income, 2),
                "expenses": round(expense, 2),
                "savings": round(monthly_saving, 2),
                "balance": round(balance, 2)
            })
        return {"months": months, "finalBalance": round(balance, 2)}
    
    scenarios = {
        "baseline": generate_scenario(total_income, avg_monthly_expense, savings_rate, 1.0),
        "optimistic": generate_scenario(total_income, avg_monthly_expense, savings_rate + 10, 1.05),
        "conservative": generate_scenario(total_income, avg_monthly_expense, max(0, savings_rate - 5), 0.95),
        "aggressive": generate_scenario(total_income, avg_monthly_expense, savings_rate + 20, 1.1)
    }
    
    return {
        "ok": True,
        "data": {
            "currentMetrics": {
                "monthlyIncome": round(total_income, 2),
                "monthlyExpense": round(avg_monthly_expense, 2),
                "savingsRate": round(savings_rate, 1),
                "subscriptionsCost": round(total_subscriptions, 2)
            },
            "scenarios": scenarios
        }
    }

# Alerts Routes
@api_router.get("/alerts", response_model=Dict)
async def get_alerts(user = Depends(verify_token)):
    uid = user.get('uid')
    alerts = await db.alerts.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"ok": True, "data": alerts}

@api_router.post("/alerts/{alert_id}/read", response_model=Dict)
async def mark_alert_read(alert_id: str, user = Depends(verify_token)):
    uid = user.get('uid')
    await db.alerts.update_one(
        {"id": alert_id, "user_id": uid},
        {"$set": {"is_read": True}}
    )
    return {"ok": True}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()