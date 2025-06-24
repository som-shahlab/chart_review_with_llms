#!/bin/bash

conda activate ehrllm

# Flask backend
python ehrllm/backend/wsgi.py

# React frontend
cd ehrllm/frontend
npm run dev