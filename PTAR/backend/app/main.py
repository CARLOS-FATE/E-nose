from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.core.database import Base, engine

# Create the database tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="E-NOSE AI Platform",
    description="API for water quality prediction and ML orchestration",
    version="1.0.0"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, restrict this to frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Welcome to E-NOSE AI Platform API. Check /docs for interactive documentation."}
