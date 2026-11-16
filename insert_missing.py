import os
with open('.claude/team/BLUEPRINT.md', 'r', encoding='utf-8') as f:
    current = f.read()

missing = 'SECTIONS'

idx = current.find('## 8. Build Sequence')
if idx > 0:
    new_content = current[:idx] + missing + current[idx:]
    with open('.claude/team/BLUEPRINT.md', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Inserted')
else:
    print('Not found')
