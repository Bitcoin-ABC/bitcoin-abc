#!/usr/bin/env python3

import subprocess
import os
import argparse

parser = argparse.ArgumentParser(description='Produce a dep file from ninja.')
parser.add_argument(
    '--build-dir',
    help='The build directory.',
    required=True)
parser.add_argument(
    '--base-dir',
    help='The directory for which dependencies are rewriten.',
    required=True)
parser.add_argument('--ninja', help='The ninja executable to use.')
parser.add_argument(
    'base_target',
    help="The target from the base's perspective.")
parser.add_argument(
    'targets', nargs='+',
    help='The target for which dependencies are extracted.')
parser.add_argument(
    '--extra-deps', nargs='+',
    help='Extra dependencies.')

args = parser.parse_args()
build_dir = os.path.abspath(args.build_dir)
base_dir = os.path.abspath(args.base_dir)
ninja = args.ninja
base_target = args.base_target
targets = args.targets
extra_deps = args.extra_deps

# Make sure we operate in the right folder.
os.chdir(build_dir)

if ninja is None:
    ninja = subprocess.check_output(['command', '-v', 'ninja'])[:-1]

# Construct the set of all targets
all_targets = set()
doto_targets = set()
for t in subprocess.check_output([ninja, '-t', 'targets', 'all']).splitlines():
    t, r = t.split(b':')
    all_targets.add(t)
    if r[:13] == b' C_COMPILER__' or r[:15] == b' CXX_COMPILER__':
        doto_targets.add(t)


def parse_ninja_query(query):
    deps = dict()
    lines = query.splitlines()

    while len(lines):
        line = lines.pop(0)
        if line[0] == ord(' '):
            continue

        # We have a new target
        target = line.split(b':')[0]
        assert lines.pop(0)[:8] == b'  input:'

        inputs = set()
        while True:
            i = lines.pop(0)
            if i[:4] != b'    ':
                break

            '''
            ninja has 3 types of input:
              1. Explicit dependencies, no prefix;
              2. Implicit dependencies, | prefix.
              3. Order only dependencies, || prefix.

            Order only dependency do not require the target to be rebuilt
            and so we ignore them.
            '''
            i = i[4:]
            if i[0] == ord('|'):
                if i[1] == ord('|'):
                    # We reached the order only dependencies.
                    break
                i = i[2:]

            inputs.add(i)

        deps[target] = inputs

    return deps


def extract_deps(workset):
    # Recursively extract the dependencies of the target.
    deps = dict()
    while len(workset) > 0:
        query = subprocess.check_output([ninja, '-t', 'query'] + list(workset))
        target_deps = parse_ninja_query(query)
        deps.update(target_deps)

        workset = set()
        for d in target_deps.values():
            workset.update(t for t in d if t in all_targets and t not in deps)

    # Extract build time dependencies.
    bt_targets = [t for t in deps if t in doto_targets]
    if len(bt_targets) == 0:
        return deps

    ndeps = subprocess.check_output(
        [ninja, '-t', 'deps'] + bt_targets,
        stderr=subprocess.DEVNULL)

    lines = ndeps.splitlines()
    while len(lines) > 0:
        line = lines.pop(0)
        t, m = line.split(b':')
        if m == b' deps not found':
            continue

        inputs = set()
        while True:
            i = lines.pop(0)
            if i == b'':
                break

            assert i[:4] == b'    '
            inputs.add(i[4:])

        deps[t] = inputs

    return deps


base_dir = base_dir.encode()


def rebase_deps(deps):
    rebased = dict()
    cache = dict()

    def rebase(path):
        if path in cache:
            return cache[path]

        abspath = os.path.abspath(path)
        newpath = path if path == abspath else os.path.relpath(
            abspath, base_dir)
        cache[path] = newpath
        return newpath

    for t, s in deps.items():
        rebased[rebase(t)] = set(rebase(d) for d in s)

    return rebased


deps = extract_deps(set(targets))
deps = rebase_deps(deps)


def dump(deps):
    for t, d in deps.items():
        if len(d) == 0:
            continue

        str = t.decode() + ": \\\n  "
        str += " \\\n  ".join(sorted(map((lambda x: x.decode()), d)))

        print(str)


# Collapse everything under the base target.
basedeps = set() if extra_deps is None else set(d.encode() for d in extra_deps)
for d in deps.values():
    basedeps.update(d)

base_target = base_target.encode()
basedeps.discard(base_target)

dump({base_target: basedeps})
