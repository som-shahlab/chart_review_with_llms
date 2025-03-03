import os
from enum import Enum
from ehrllm.backend.app.databases.base import BaseDatabase
from ehrllm.backend.app.models import Note
import polars as pl
from typing import Any, Dict, List, Optional
from ehrllm.utils import get_rel_path
from ehrllm.backend.app.config import IS_DEBUG, PATH_TO_MIMICIV_NOTES_DIR
from loguru import logger

class MIMICIVNoteType(Enum):
    DISCHARGE = "discharge"
    RADIOLOGY = "radiology"

class MIMICIVNotesDatabase(BaseDatabase):
    name: str = "mimiciv-notes"
    _instance: Optional['MIMICIVNotesDatabase'] = None
    df_notes: Optional[pl.DataFrame] = None
    df_patients: Optional[pl.DataFrame] = None

    def load_data(self) -> None:
        """Load CSV data into memory"""
        data_dir = get_rel_path(PATH_TO_MIMICIV_NOTES_DIR)
        
        # Load discharge notes
        path_to_discharge_notes = os.path.join(data_dir, 'discharge.csv')
        path_to_radiology_notes = os.path.join(data_dir, 'radiology.csv')
        logger.info(f"Loading notes from {path_to_discharge_notes} and {path_to_radiology_notes}")
        self.df_notes = pl.concat([pl.scan_csv(f) for f in [path_to_discharge_notes, path_to_radiology_notes]])
        
        # Set patient_id column to string
        self.df_notes = self.df_notes.with_columns(
            pl.col('subject_id').cast(pl.Utf8)
        )
        
        if IS_DEBUG:
            # Limit to top 100 if IS_DEBUG is True
            self.df_notes = self.df_notes.limit(100)
        
        self.df_notes = self.df_notes.collect()
        logger.info(f"Loaded notes with shape: {self.df_notes.shape}")
        logger.info(f"Column names: {self.df_notes.columns}")
        logger.info(f"First 10 patient IDs: {self.df_notes['subject_id'].unique().head(10).to_list()}")

    def get_patient_notes(self, patient_id: str) -> List[Note]:
        """Get all notes for a specific patient"""
        if self.df_notes is None:
            return []
        
        df_patient_notes = self.df_notes.filter(
            pl.col('subject_id') == patient_id
        ).sort('charttime', descending=True)
        logger.info(f"Found {len(df_patient_notes)} notes for patient {patient_id}")
        
        note_dicts = df_patient_notes.select([
            pl.col('note_id'),
            pl.col('charttime'),
            pl.col('hadm_id'),
            pl.col("note_type").replace("DS", MIMICIVNoteType.DISCHARGE.value).replace("LR", MIMICIVNoteType.RADIOLOGY.value).alias("note_type"),
            pl.col('text')
        ]).to_dicts()
        
        # Convert to Note objects
        notes: List[Note] = [
            Note(
                note_id=n['note_id'],
                text=n['text'],
                chartdatetime=n['charttime'],
                note_type=n['note_type'],
                hadm_id=n['hadm_id'],
                patient_id=patient_id
            )
            for n in note_dicts
        ]
        # Sort notes by chartdatetime in descending order
        notes.sort(key=lambda x: x.chartdatetime, reverse=True)
        return notes

    def get_patient_metadata(self, patient_id: str) -> dict:
        """Get patient demographic information"""
        if self.df_patients is None:
            # Return mock data if no patient data loaded
            return {
                "name": "Unknown",
                "age": "Unknown",
                "mrn": patient_id
            }

        # In reality, you would query self._patients_df here
        patient = self.df_patients.filter(
            pl.col('subject_id') == patient_id
        ).iloc[0]
        
        return {
            "name": f"{patient['first_name']} {patient['last_name']}",
            "age": patient['age'],
            "mrn": patient_id
        }
    
    def is_patient_exists(self, patient_id: str) -> bool:
        """Check if a patient exists in the database"""
        if self.df_notes is None:
            return False
        return patient_id in self.df_notes['subject_id'].unique().to_list()
