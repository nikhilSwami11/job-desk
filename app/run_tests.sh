#!/bin/bash
# Runs every check: Python tests, TypeScript type-check, React tests. Run from anywhere.
set -e
cd "$(dirname "$0")"
echo "== Python =="; python3 -m unittest discover -s tests -t . 2>&1 | tail -4
cd web
echo "== TypeScript =="; npx tsc --noEmit && echo "types ok"
echo "== React =="; npx vitest run 2>&1 | grep -E "Test Files|Tests "
