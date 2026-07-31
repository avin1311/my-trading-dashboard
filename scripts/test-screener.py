import socket, time, subprocess, json, sys

print('Starting standalone server...', flush=True)
srv = subprocess.Popen(
    ['node', '/home/z/my-project/.next/standalone/server.js'],
    stdout=open('/tmp/next-srv.log', 'w'),
    stderr=subprocess.STDOUT
)
time.sleep(10)
print(f'Server PID={srv.pid}, alive={srv.poll() is None}', flush=True)

if srv.poll() is not None:
    print('SERVER FAILED TO START')
    sys.exit(1)

def http_get(path, timeout=180):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    s.connect(('127.0.0.1', 3000))
    req = f'GET {path} HTTP/1.0\r\nHost: 127.0.0.1\r\n\r\n'
    s.sendall(req.encode())
    resp = b''
    while True:
        try:
            chunk = s.recv(65536)
            if not chunk:
                break
            resp += chunk
            if len(resp) % 10000 < 6500:
                print(f'  received {len(resp)} bytes so far...', flush=True)
        except socket.timeout:
            print('  socket timeout reached', flush=True)
            break
    s.close()
    if b'\r\n\r\n' in resp:
        return resp.split(b'\r\n\r\n', 1)[1]
    return resp

# Test 1: Simple API
print('\n=== Test 1: /api/upstox/status ===', flush=True)
try:
    body = http_get('/api/upstox/status', 15)
    print(f'  OK: {len(body)} bytes', flush=True)
except Exception as e:
    print(f'  FAIL: {e}', flush=True)

print(f'Server alive after test 1: {srv.poll() is None}', flush=True)
if srv.poll() is not None:
    print('Server died on simple request - standalone has issues')
    srv.terminate()
    sys.exit(1)

# Test 2: Screener scan
print('\n=== Test 2: /api/screener?limit=8 ===', flush=True)
start = time.time()
try:
    body = http_get('/api/screener?limit=8', 180)
    elapsed = time.time() - start
    data = json.loads(body)
    results = data.get('results', [])
    print(f'\n  SUCCESS: {len(results)} results in {elapsed:.1f}s', flush=True)
    print(f'  Scanned: {data.get("totalScanned")} stocks', flush=True)
    print(f'  Matched: {data.get("totalMatched")}', flush=True)
    counts = data.get('signalCounts', {})
    print(f'  Signal counts: BUY={counts.get("BUY",0)} STRONG_BUY={counts.get("STRONG_BUY",0)} HOLD={counts.get("HOLD",0)} SELL={counts.get("SELL",0)} STRONG_SELL={counts.get("STRONG_SELL",0)}', flush=True)
    print(f'\n  Top signals:', flush=True)
    for r in results[:8]:
        rsi = r.get('rsi')
        rsi_str = f'{rsi:.1f}' if rsi else '--'
        pe_str = f'{r["pe"]:.1f}' if r.get('pe') else '--'
        print(f'    {r["symbol"]:12s}  Rs.{r["price"]:>10,}  {r["changePct"]:+.2f}%  RSI:{rsi_str:>5s}  PE:{pe_str:>5s}  {r["signal"]}', flush=True)
    
    # Test 3: Cached
    print(f'\n=== Test 3: Cached screener ===', flush=True)
    t2 = time.time()
    body2 = http_get('/api/screener?limit=5', 10)
    data2 = json.loads(body2)
    print(f'  OK: cached={data2.get("cached")}, {len(data2.get("results",[]))} results in {time.time()-t2:.1f}s', flush=True)
    
    print(f'\n========================================', flush=True)
    print(f'  ALL TESTS PASSED - SCREENER WORKS!', flush=True)
    print(f'========================================', flush=True)
except Exception as e:
    elapsed = time.time() - start
    print(f'  FAIL after {elapsed:.1f}s: {e}', flush=True)
    import traceback
    traceback.print_exc()

print(f'\nServer alive at end: {srv.poll() is None}', flush=True)
try:
    srv.terminate()
except:
    pass
