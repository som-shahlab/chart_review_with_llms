# Installation

```bash
conda create -n ehrllm python=3.10 -y
conda activate ehrllm

# Python backend
cd ehrllm/backend
poetry install

# React frontend
cd ehrllm/frontend
npm install
```

# Usage

```bash
conda activate ehrllm

# Python backend
cd ehrllm/backend
python3 wsgi.py

# React frontend
cd ehrllm/frontend
npm run dev
```

## 2. Data

Download data from MIMIC-IV:

```bash
# Download notes
wget -r -N -c -np --user miking98 --ask-password https://physionet.org/files/mimic-iv-note/2.2

# Unzip .csv.gz files
cd mimiciv/physionet.org/files/mimic-iv-note/2.2/note
for file in *.csv.gz; do
    gunzip "$file"
done
```

## 3. Run

```bash
