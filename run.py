#!/usr/bin/env python3

from subprocess import run

with open('out/books.txt', 'r') as f:
    for line in f:
        if line.startswith(';'):
            continue
        run(['yarn', 'start', line.strip()])

# run(['./upload.sh'])
