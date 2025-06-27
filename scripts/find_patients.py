"""
Find patients with a specific mention in the MIMIC-IV notes.

Usage:
python find_patients.py --mention "cancer"
"""
import os
import pandas as pd
import argparse

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mention', type=str, required=True)
    return parser.parse_args()

if __name__ == '__main__':
    args = parse_args()

    df = pd.read_csv('../data/mimiciv-notes/discharge.csv')

    match_count = 0
    patient_ids = set()
    for idx, row in df.iterrows():
        if row['subject_id'] in patient_ids:
            continue
        if args.mention.lower() in row['text'].lower():
            print(row['subject_id'])
            # Print surrounding 100 characters around the word 'crc'
            print(row['text'][max(0, idx - 100):min(len(row['text']), idx + 100)])
            print('-' * 100)
            patient_ids.add(row['subject_id'])
        
        if len(patient_ids) > 10:
            break

    print(f"Patients: {patient_ids}")