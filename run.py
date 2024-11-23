#!/usr/bin/env python3

from subprocess import run

with open('out/books.txt', 'r') as f:
    for line in f:
        if line.startswith(';'):
            continue
        if 'manhuagui' in line:
            run(['yarn', 'start', line.strip()])
        elif 'veryim' in line:
            run(['node', 'veryim', line.strip()])

# run(['./upload.sh'])
