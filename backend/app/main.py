"""
FastAPI Application Factory & Core Server Initialization.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.routers import (
    auth_router,
    profile_router,
    conversations_router,
    chat_router
)


def create_app() -> FastAPI:
    """Application factory for DrugGuide Clinical RAG API."""
    application = FastAPI(
        title=settings.PROJECT_NAME,
        description="Enterprise Clinical Pharmacological Decision Support RAG API with Complete Role-Based Segregation",
        version=settings.VERSION,
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # CORS configuration
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition"]
    )

    @application.on_event("startup")
    def on_startup():
        init_db()
        print("DrugGuide Clinical API online with 1,987 verified medical chunks loaded!")

    @application.get("/", summary="Health Check", tags=["System Health"])
    def root_health():
        return {
            "status": "online",
            "system": settings.PROJECT_NAME,
            "version": settings.VERSION
        }

    # Mount modular routers
    application.include_router(auth_router)
    application.include_router(profile_router)
    application.include_router(conversations_router)
    application.include_router(chat_router)

    return application


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
