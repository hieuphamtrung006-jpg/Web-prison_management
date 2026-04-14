# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import core, economy, legal,schedule,auth # Import 3 file router mới
import models
from database import engine

app = FastAPI(title="Prison Management API")

# Cấu hình CORS để React gọi không bị chặn
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Đang để mở cho mọi Frontend, sau này đưa lên mạng thì giới hạn lại
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gắn các Routers vào App
app.include_router(core.router)
app.include_router(economy.router)
app.include_router(legal.router)

@app.get("/")
def read_root():
    return {"message": "Server FastAPI đang chạy ổn định!"}

app.include_router(schedule.router)
app.include_router(auth.router)