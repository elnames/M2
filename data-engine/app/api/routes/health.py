from fastapi import APIRouter
router = APIRouter()

@router.get("/")
def health_check():
    return {"status": "ok", "service": "clave-data-engine", "version": "1.0.0"}
