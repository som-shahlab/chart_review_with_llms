import datetime
from typing import Optional
from dataclasses import dataclass

@dataclass
class Note:
    note_id: str
    text: str
    note_type: Optional[str] = None
    chartdatetime: Optional[datetime.datetime] = None
    hadm_id: Optional[str] = None
    patient_id: Optional[str] = None