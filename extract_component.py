import json
import re

with open(r'C:\Users\data\.claude\projects\x--Projects-GUNZILLA-GUNZSCOPE\1093f66e-d1a5-435a-b4d2-b65e30a032c6.jsonl', 'r', encoding='utf-8') as f:
    lines = f.readlines()

data = json.loads(lines[33141])
content = data['message']['content'][0]
bash_command = content['input']['command']

print(f'Bash command length: {len(bash_command)}')

# Look for the component code
comp_start = bash_command.find('export default function PortfolioSummaryBar')
if comp_start != -1:
    print(f'Found component at position {comp_start}')

    # Find the ending - look for EOF or similar
    remaining = bash_command[comp_start:]

    # Try to find EOF marker
    eof_match = re.search(r'\\nEOF|EOF\\n', remaining)
    if eof_match:
        end_pos = eof_match.start()
        component = remaining[:end_pos]
        print(f'Found EOF at position {end_pos}')
    else:
        # Take a large chunk
        component = remaining[:50000]
        print('No EOF found, taking 50k chars')

    print(f'Component length: {len(component)} chars')

    # Unescape newlines
    component = component.replace('\\n', '\n')

    with open(r'x:\Projects\GUNZILLA\GUNZSCOPE\extracted_component.tsx', 'w', encoding='utf-8') as out:
        out.write(component)
    print('Extracted to extracted_component.tsx')
else:
    print('Component not found')
