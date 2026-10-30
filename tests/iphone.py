"""Mobile regressions for notebook icons, focused text, public diary and natural end highlights.
Run after npm run build: python3 tests/iphone.py [webkit|chromium]. Default WebKit uses the Safari engine.
"""
import functools, http.server, pathlib, sys, threading
from playwright.sync_api import sync_playwright
import cov
ROOT = pathlib.Path(__file__).resolve().parent.parent
engine = sys.argv[1] if len(sys.argv) > 1 else 'webkit'
assert engine in ('webkit', 'chromium')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'dist')))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{srv.server_address[1]}'
try:
    with sync_playwright() as p:
        browser = getattr(p, engine).launch()
        context = browser.new_context(viewport={'width': 393, 'height': 852}, device_scale_factor=3, is_mobile=True, has_touch=True, reduced_motion='reduce', color_scheme='dark')
        page = context.new_page(); errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        if engine == 'chromium': cov.start(page)
        page.goto(base); page.wait_for_function('window.__APP && window.__APP.S')
        page.evaluate('''() => {
          const a = window.__APP, names = ['Lucas', 'Truman', 'Eisenhower', 'Tiglate-Pileser', 'Franklin Roosevelt'];
          const flags = [false, true, true, true, true];
          a.S.names = names; a.S.ai = flags; a.S.game = a.Core.newGame(names, a.Core.seeded(42), { ai: flags, train: 'liberal' }).game;
          Object.assign(a.S.game, {phase:'vote',pres:1,chanc:2,reveal:5}); a.ui.think = 60000;
        }''')
        page.click('#rulestoggle'); page.click('#notestoggle')
        assert page.locator('#drawer').is_visible()
        controls = page.locator('#notes .side button')
        for c in controls.all():
            box = c.bounding_box()
            assert box and box['width'] >= 40 and box['height'] >= 40, box
            assert c.get_attribute('aria-label')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.locator('[data-act=court][data-i="1"]').dispatch_event('click'); page.locator('#accuse').dispatch_event('click')
        if page.locator('#contra').count(): page.locator('#contra').dispatch_event('click')
        assert page.locator('#heard').is_visible(), 'a button click must repaint even while Safari keeps the editor focused'
        assert page.locator('#notes [data-act=court][data-i="1"]').count() == 0
        assert 'Lucas' in page.inner_text('#speech-peek') and 'Truman' in page.inner_text('#speech-peek')
        page.click('#speech-peek')
        assert page.locator('#diary').is_visible() and not page.locator('#drawer').is_visible()
        assert page.locator('#diary article').count() >= 4
        assert page.locator('#diary .reputation-note').count() == 1 and page.locator('#speech-peek .reputation-cue').count() == 1
        assert 'Truman é fascista.' in page.inner_text('#diary')
        assert 'PRIVATE_REASON' not in page.inner_text('#diary'), 'a private notebook reason is never a public transcript'
        shots = ROOT / 'tests/shots'; shots.mkdir(exist_ok=True)
        page.screenshot(path=str(shots / f'iphone-diary-{engine}.png'))
        page.click('#diarytoggle'); page.click('#notestoggle')
        page.screenshot(path=str(shots / f'iphone-notes-{engine}.png'))
        # Make the ending concrete: the same characters appear in the headline and the decisive event.
        page.evaluate('''() => { const g=window.__APP.S.game;
          g.players[0].role='liberal'; g.players[1].role='hitler';
          g.phase='over';g.winner='L';g.why='Lucas eliminou Truman: os liberais venceram.';
          g.hist=[{k:'gov',pres:2,chanc:3,law:'F'},{k:'gov',pres:2,chanc:3,law:'F'},{k:'gov',pres:2,chanc:3,law:'F'},{k:'exec',by:0,target:1,role:'hitler'}];
        }''')
        page.click('#notestoggle')
        assert 'O tiro que encerrou o jogo' in page.inner_text('#highlights')
        assert 'Lucas' in page.inner_text('#highlights') and 'Truman' in page.inner_text('#highlights')
        assert 'Momento ' not in page.inner_text('#highlights')
        assert 'Eisenhower' in page.inner_text('#highlights') and 'Tiglate-Pileser' in page.inner_text('#highlights')
        page.screenshot(path=str(shots / f'iphone-ending-{engine}.png'))
        assert not errors, errors
        if engine == 'chromium': cov.stop(page, 'iphone')
        browser.close()
finally:
    srv.shutdown(); srv.server_close()
print(f'iphone UI ok ({engine}): consistent touch targets, focused editor, accusation, persistent summary, exact public diary, contextual ending')
