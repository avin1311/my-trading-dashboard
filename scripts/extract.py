import json, re, sys

with open('/home/z/my-project/src/lib/stock-data.ts') as f:
    code = f.read()

eq_start = code.index('const EQUITY_DATA')
eq_end = code.index('\n// ==================== NSE INDICES')
eq_arr = code[eq_start:eq_end].strip().rstrip(',').rstrip(';').replace('?number', '')

idx_start = code.index('const INDEX_DATA')
idx_end = code.index('\n// Combined list')
idx_arr = code[idx_start:idx_end].strip().rstrip(',').rstrip(';').replace('?number', '')

ou_start = code.index('OPTION_UNDERLYINGS')
ou_arr = code[ou_start:].strip().rstrip(';')

equities = [{"s": e[0], "n": e[1], "sec": e[2], "bp": float(e[3]), "v": float(e[4]), "ls": e[5] or 0} for e in eval('(' + eq_arr + ')')]
indices = [{"s": e[0], "n": e[1], "bp": float(e[2]), "v": float(e[3]), "ls": int(e[4])} for e in eval('(' + idx_arr + ')')]
ou = eval('(' + ou_arr + ')')

with open('/home/z/my-project/src/lib/stock-list.json', 'w') as f:
    json.dump({"equities": equities, "indices": indices, "optionUnderlyings": ou}, f)
print(f'OK: {len(equities)} eq, {len(indices)} idx, {len(ou)} ou', flush=True)