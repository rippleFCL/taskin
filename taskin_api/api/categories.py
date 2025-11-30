from fastapi import APIRouter, Depends, HTTPException
from models import Category, get_db
from schemas import CategoryWithTodos
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/categories", response_model=list[CategoryWithTodos])
def get_categories(db: Session = Depends(get_db)):
    """Get all categories with their todos"""
    categories = db.query(Category).all()
    return categories


@router.get("/categories/{category_id}", response_model=CategoryWithTodos)
def get_category(category_id: int, db: Session = Depends(get_db)):
    """Get a specific category with its todos"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category
