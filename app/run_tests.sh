#!/bin/bash
# Runs every test: Python (unittest) and JavaScript (node --test). Run from anywhere.
set -e
cd "$(dirname "$0")"
echo "== Python =="; python3 -m unittest discover -s tests -t . 2>&1 | tail -4
echo "== JavaScript =="; node --test tests/ 2>&1 | grep -E "^# (tests|pass|fail)"
