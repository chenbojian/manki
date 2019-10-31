#!/usr/bin/env python3

from subprocess import run

with open('out/books.txt', 'r') as f:
    for line in f:
        run(['yarn', 'start', line.strip()])

run(['./upload.sh'])
