import os
import re

d = r'd:\Cart\backend\alembic\versions'
files = os.listdir(d)
revisions = {}

for f in files:
    if f.endswith('.py'):
        with open(os.path.join(d, f), 'r') as file:
            content = file.read()
            rev = re.search(r"revision.*[\'\"]([a-zA-Z0-9_]+)[\'\"]", content)
            down = re.search(r"down_revision.*[\'\"]([a-zA-Z0-9_]+)[\'\"]", content)
            
            if rev:
                r_id = rev.group(1)
                d_id = down.group(1) if down else None
                revisions[r_id] = d_id

heads = set(revisions.keys())
for r, d_rev in revisions.items():
    if d_rev in heads:
        heads.remove(d_rev)

print('Heads:', heads)
print('Revisions mapping:')
for r, d_rev in revisions.items():
    print(f'{r} -> {d_rev}')
