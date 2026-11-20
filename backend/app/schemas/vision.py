from typing import List, Literal, Optional
from pydantic import BaseModel, Field

NairaDenomination = Literal[5, 10, 20, 50, 100, 200, 500, 1000]


class NairaNoteCount(BaseModel):
    denomination: NairaDenomination = Field(
        ..., description="Nigerian Naira denomination value (5, 10, 20, 50, 100, 200, 500, or 1000)"
    )
    count: int = Field(..., ge=1, description="Number of distinct notes of this denomination")
    subtotal: int = Field(default=0, ge=0, description="denomination * count")


class NairaDetectionResponse(BaseModel):
    is_naira_detected: bool = Field(
        ..., description="True if one or more Nigerian Naira notes are clearly visible"
    )
    is_uncertain: bool = Field(
        default=False,
        description="True if any note is partially visible, blurry, too dark, or confidence is insufficient",
    )
    notes: List[NairaNoteCount] = Field(
        default_factory=list,
        description="List of clearly identified Nigerian Naira denominations and their counts",
    )
    total_amount: int = Field(
        default=0,
        ge=0,
        description="Total Naira value of all clearly identified notes",
    )
    currency: str = Field(default="NGN")
    other_currency_detected: Optional[str] = Field(
        default=None,
        description="Name of another currency if non-Naira banknotes are detected",
    )
    spoken_summary: str = Field(
        ...,
        description="Concise, natural spoken result for a blind or visually impaired user",
    )
    retake_guidance: Optional[str] = Field(
        default=None,
        description="Actionable advice to retake the photo if image quality or visibility is insufficient",
    )


class ObjectRecognitionResponse(BaseModel):
    spoken_summary: str = Field(
        ...,
        description="Concise, clear, spoken-friendly description of the object or scene",
    )
    detected_objects: List[str] = Field(
        default_factory=list,
        description="Short list of clearly visible objects in the image",
    )
    dominant_colors: List[str] = Field(
        default_factory=list,
        description="Key colors visible (especially helpful for clothing or product questions)",
    )
    is_uncertain: bool = Field(
        default=False,
        description="True if the photo is too blurry, dark, or unclear to describe reliably",
    )
    safety_note: str = Field(
        default="ANYA provides visual descriptions for orientation only and cannot guarantee obstacle avoidance or replace a mobility aid.",
    )


class TextEntity(BaseModel):
    label: str = Field(..., description="Category such as Date, Amount, Name, Phone, or Reference")
    value: str = Field(..., description="Extracted value")


class TextReadingResponse(BaseModel):
    has_text: bool = Field(..., description="True if readable text was found in the image")
    extracted_text: str = Field(
        default="",
        description="Full readable text extracted from the document, receipt, sign, or label",
    )
    summary: str = Field(
        default="",
        description="Short, clear summary of the text",
    )
    important_details: List[TextEntity] = Field(
        default_factory=list,
        description="Important details such as dates, amounts, names, and locations",
    )
    spoken_summary: str = Field(
        ...,
        description="Spoken-friendly output ready to be read aloud to the user",
    )
    is_uncertain: bool = Field(
        default=False,
        description="True if parts of the text were blurry, cut off, or difficult to read",
    )
