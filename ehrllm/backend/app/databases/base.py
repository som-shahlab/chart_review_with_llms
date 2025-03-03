from typing import Any, Dict, List, Optional

class BaseDatabase:
    name: str = "base"
    _instance: Optional['BaseDatabase'] = None

    def __init__(self):
        raise RuntimeError('Call instance() instead')

    @classmethod
    def instance(cls) -> 'BaseDatabase':
        if cls._instance is None:
            cls._instance = cls.__new__(cls)
            cls._instance.load_data()
        return cls._instance
    
    def load_data(self) -> None:
        raise NotImplementedError('Subclasses must implement this method')
    
    def get_patient_notes(self, patient_id: int) -> List[Dict[str, Any]]:
        raise NotImplementedError('Subclasses must implement this method')

    def get_patient_metadata(self, patient_id: int) -> Dict[str, Any]:
        raise NotImplementedError('Subclasses must implement this method')

    def is_patient_exists(self, patient_id: int) -> bool:
        raise NotImplementedError('Subclasses must implement this method')