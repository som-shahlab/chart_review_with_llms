from tqdm import tqdm
from typing import Any, Dict, List, Optional
from pathlib import Path
from ehrllm.backend.app.models import Note
from ehrllm.utils import get_rel_path
from ehrllm.backend.app.config import IS_DEBUG, PATH_TO_N2C22018_DIR
from loguru import logger
import re
import xml.etree.ElementTree as ET
from datetime import datetime
from dataclasses import dataclass
from typing import List
from ehrllm.backend.app.databases.base import BaseDatabase

@dataclass
class Criterion:
    name: str
    is_met: bool

@dataclass
class Patient:
    id: str
    notes: List[Note]
    labels: List[Criterion]

def parse_patient_xml(file_path: Path) -> Patient:
    # Parse the XML file
    tree = ET.parse(file_path)
    root = tree.getroot()
    
    # Extract the patient ID from the file name
    patient_id = file_path.stem
    
    # Extract the text content
    text_element = root.find('TEXT')
    if text_element is None or text_element.text is None:
        text_content = ""
    else:
        text_content = text_element.text
        # Remove CDATA wrapper if present
        if text_content.startswith('<![CDATA[') and text_content.endswith(']]>'):
            text_content = text_content[9:-3]
    
    # Split the text into separate notes using the separator
    separator = "****************************************************************************************************"
    note_texts = text_content.split(separator)
    note_texts = [note.strip() for note in note_texts if note.strip()]
    
    # Instances of 2+ newlines in a row, collapse to 2 newlines
    note_texts = [re.sub(r'\n\s*\n', '\n\n', note) for note in note_texts]
    
    # Create Note objects
    notes = []
    for i, note_text in enumerate(note_texts):
        # Extract date using regex
        date_match = re.search(r'Record date:\s*(\d{4}-\d{2}-\d{2})', note_text)
        if date_match:
            date_str = date_match.group(1)
            date = datetime.strptime(date_str, '%Y-%m-%d')
        else:
            date = None
        
        notes.append(Note(
            note_id=patient_id + "_" + str(i),
            text=note_text,
            chartdatetime=date,
            note_type="n2c2-2018",
            patient_id=patient_id,
        ))
    
    # Extract criteria from tags
    labels = []
    tags_element = root.find('TAGS')
    if tags_element is not None:
        for tag in tags_element:
            name = tag.tag
            is_met = tag.get('met') == 'met'
            labels.append(Criterion(name=name, is_met=is_met))
    
    # Create and return Patient object
    return Patient(id=patient_id, notes=notes, labels=labels)

class N2C22018CTMatchingDatabase(BaseDatabase):
    name: str = "n2c2-2018"
    _instance: Optional['N2C22018CTMatchingDatabase'] = None
    patients: Dict[int, Patient] = {}

    def load_data(self) -> None:
        """Load all XML files into memory"""
        data_dir = get_rel_path(PATH_TO_N2C22018_DIR)
        xml_files = sorted(list(Path(data_dir).glob('*.xml')))
        logger.info(f"Found {len(xml_files)} XML files from {data_dir}")
        
        if IS_DEBUG:
            # Limit to top 10 if IS_DEBUG is True
            xml_files = xml_files[:10]
        
        for file in tqdm(xml_files, desc="Loading patients"):
            patient = parse_patient_xml(file)
            self.patients[patient.id] = patient
        logger.info(f"Loaded {len(self.patients)} patients")
        logger.info(f"First 10 patient IDs: {list(self.patients.keys())[:10]}")

    def is_patient_exists(self, patient_id: str) -> bool:
        return patient_id in self.patients
    
    def get_patient(self, patient_id: str) -> Patient:
        return self.patients[patient_id]
    
    def get_patient_metadata(self, patient_id: str) -> Dict[str, Any]:
        patient = self.get_patient(patient_id)
        return {
            "id": patient_id,
            "labels": [ { 'name': label.name, 'is_met': label.is_met } for label in patient.labels ],
            "name" : "Unknown",
            "age" : "Unknown",
            "mrn" : patient_id,
        }
    
    def get_patient_notes(self, patient_id: str) -> List[Note]:
        patient = self.get_patient(patient_id)
        # Sort notes by chartdatetime in descending order
        return sorted(patient.notes, key=lambda x: x.chartdatetime, reverse=True)

# Example usage
if __name__ == "__main__":
    patient = parse_patient_xml("101.xml")
    
    # Print patient information
    print(f"Patient has {len(patient.notes)} clinical notes:")
    for i, note in enumerate(patient.notes, 1):
        print(f"Note {i} - Date: {note.date}")
    
    print(f"\nPatient has {len(patient.labels)} criteria:")
    for criterion in patient.labels:
        status = "Met" if criterion.is_met else "Not Met"
        print(f"{criterion.name}: {status}")
        
        