"""
Example API endpoints
Replace this with your actual API routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import ExampleCreate, ExampleResponse
from app.db.models import ExampleModel

router = APIRouter()


@router.get("/example")
async def get_example():
    """
    Example GET endpoint

    Returns a simple message
    """
    return {"message": "Hello from FastAPI! 🚀"}


@router.post("/example", response_model=ExampleResponse)
async def create_example(
    example: ExampleCreate,
    db: Session = Depends(get_db)
):
    """
    Example POST endpoint with database interaction

    Creates a new example in the database
    """
    # Create database object
    db_example = ExampleModel(name=example.name)
    db.add(db_example)
    db.commit()
    db.refresh(db_example)

    return db_example


@router.get("/example/{example_id}", response_model=ExampleResponse)
async def get_example_by_id(
    example_id: int,
    db: Session = Depends(get_db)
):
    """
    Example GET endpoint with path parameter

    Retrieves an example by ID
    """
    db_example = db.query(ExampleModel).filter(ExampleModel.id == example_id).first()

    if not db_example:
        raise HTTPException(status_code=404, detail="Example not found")

    return db_example


# TODO: Add your API endpoints here
