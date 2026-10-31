#!/usr/bin/env python3
"""The person's moves at a table with app players, with motion on (D73): turning a vote in the window after the votes
open, pointing at who an app player should eliminate, and saying "I am liberal" with a proof. The same game every run
(window.__SEED). Opens dist/index.html from the disk, like the other screen tests."""
import json, pathlib
from playwright.sync_api import sync_playwright
import cov

ROOT = pathlib.Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 393, 'height': 852}, color_scheme='dark')
    ctx.add_init_script('window.__SEED = 11')
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    cov.start(pg)
    pg.goto((ROOT / 'dist/index.html').as_uri()); pg.wait_for_function('window.__APP')
    G = lambda: pg.evaluate('window.__APP.S.game')
    pg.click('[data-act=quickgame]'); pg.wait_for_timeout(200)
    setup = lambda extra: pg.evaluate("(x) => { const A = window.__APP, g = A.S.game; A.ui.think = 600000; g.reveal = g.players.length; for (const p of g.players) p.alive = true; Object.assign(g, x); document.querySelector('[data-act]').click(); }", extra)
    me = [i for i, q in enumerate(G()['players']) if not q.get('ai')][0]
    others = [i for i, q in enumerate(G()['players']) if q.get('ai')]

    # "I am liberal" opens the proofs; one proof, and each app player says whether it believes
    setup({'phase': 'nominate', 'pres': others[0], 'chanc': None})
    pg.locator('#selfclaim').dispatch_event('click'); assert pg.locator('#proofs .krow').count() >= 1, 'the proofs open'
    pg.locator('#proofs [data-act=tproof]').first.click()
    h = G()['hist'][-1]; assert h['k'] == 'self' and len(h['re']) == len(others) and pg.locator('#selfclaim[disabled]').count() == 1

    # an app player about to eliminate: the person points at someone, with the reason the record gives
    setup({'phase': 'execute', 'pres': others[0], 'target': None})
    H = pg.locator('[data-act=help]').first; H.dispatch_event('click'); H.dispatch_event('click')
    assert pg.locator('#asknow .krow').count() >= 1, 'who to eliminate, each with its reason'
    pg.locator('#asknow [data-act=tkill]').first.click(); assert G()['hist'][-1]['k'] == 'ask' and G()['hist'][-1]['what'] == 'kill'

    # turning a vote: the votes open, then the window; tap an app player's vote, pick a reason, the count follows
    setup({'phase': 'vote', 'pres': others[0], 'chanc': others[1]})
    pg.evaluate('window.__APP.ui.think = 600000')
    H = pg.locator('[data-act=help]').first; H.dispatch_event('click'); H.dispatch_event('click')
    pg.locator('#phase [data-act=myvote]').first.click()
    pg.wait_for_selector('#sway', timeout=8000); pg.screenshot(path=str(ROOT / 'tests/shots/social-sway.png'))
    pg.locator('#ballot .b-seat.tap').first.dispatch_event('click'); pg.wait_for_selector('#swayopts [data-act=swaysay]'); pg.screenshot(path=str(ROOT / 'tests/shots/social-sway-reasons.png'))
    pg.locator('#swayopts [data-act=swaysay]').first.dispatch_event('click'); pg.wait_for_selector('.sway-res')
    pg.wait_for_function("!document.getElementById('ballot')", timeout=8000)
    log = G()['log']; assert any('mudo meu voto' in l or 'mantenho meu voto' in l for l in log[-6:]) and any(l.startswith('Votos.') for l in log[-6:]), log[-6:]
    cov.stop(pg, 'social')
    assert not errs, errs
    b.close()
print('social ok: sou liberal com prova, sugerir eliminação com motivo, virar um voto')
