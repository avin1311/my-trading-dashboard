import re

with open('/home/z/my-project/src/app/page.tsx', 'r') as f:
    code = f.read()

def replace_simple_template(m):
    full = m.group(0)
    attr = m.group(1)
    inner = m.group(2)
    parts = inner.split('${')
    if len(parts) < 2:
        return full
    result_parts = []
    for i, part in enumerate(parts):
        if i == 0:
            result_parts.append(repr(part))
        else:
            end_idx = part.index('}')
            expr = part[:end_idx]
            rest = part[end_idx+1:]
            result_parts.append('(' + expr + ')')
            if rest:
                result_parts.append(repr(rest))
    return attr + '={' + ' + '.join(result_parts) + '}'

pattern = r'(\w+)=\{`([^`]*)`'
code = re.sub(pattern, replace_simple_template, code)

code = code.replace('`${pct}%`', "pct + '%'")

with open('/home/z/my-project/src/app/page.tsx', 'w') as f:
    f.write(code)

print('Done')