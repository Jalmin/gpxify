"""
Pydantic models for request/response schemas
"""
from pydantic import BaseModel


# TODO: Define your Pydantic models here
# Example models:
class ExampleBase(BaseModel):
    """Base example schema"""

    name: str


class ExampleCreate(ExampleBase):
    """Schema for creating an example"""

    pass


class ExampleResponse(ExampleBase):
    """Schema for example response"""

    id: int

    class Config:
        from_attributes = True  # Allows ORM model to Pydantic model conversion
