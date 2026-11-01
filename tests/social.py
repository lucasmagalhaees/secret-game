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
    assert pg.locator('#sway [data-act=swayskip]').count() == 1, 'the window can be skipped (D74)'
    pg.locator('#ballot .b-seat.tap').first.dispatch_event('click'); pg.wait_for_selector('#swayopts [data-act=swaysay]'); pg.screenshot(path=str(ROOT / 'tests/shots/social-sway-reasons.png'))
    pg.locator('#swayopts [data-act=swaysay]').first.dispatch_event('click'); pg.wait_for_selector('.sway-res')
    pg.wait_for_function("!document.getElementById('ballot')", timeout=8000)
    log = G()['log']; assert any('mudo meu voto' in l or 'mantenho meu voto' in l for l in log[-6:]) and any(l.startswith('Votos.') for l in log[-6:]), log[-6:]
    # a combo accusation (D81): tap two proofs, the meter shows, "Acusar com tudo" throws both at once
    t3 = others[2]
    setup({'phase': 'nominate', 'pres': others[0], 'chanc': None, 'laws': {'L': 1, 'F': 2}, 'hist': [{'k': 'gov', 'pres': others[1], 'chanc': t3, 'law': 'F', 'pc': 2, 'cc': 1}, {'k': 'gov', 'pres': t3, 'chanc': others[3], 'law': 'F', 'pc': 2, 'cc': 1}]})
    pg.evaluate('window.__APP.ui.frozen = 0'); pg.locator(f'[data-act=court][data-i="{t3}"]').first.dispatch_event('click'); pg.wait_for_selector('#court')
    for k in range(2): pg.locator('#court [data-act=courtproof]').nth(k).click()
    assert pg.locator('#combo').count() == 1 and 'tudo' in pg.locator('#accuse').inner_text().lower(); pg.screenshot(path=str(ROOT / 'tests/shots/social-combo.png'))
    pg.locator('#accuse').click(); h = [e for e in G()['hist'] if e['k'] == 'talk'][-1]; assert len(h.get('proofs', [])) == 2, h

    # the reply as a combo (D82): mark two arguments with +, answer with all of them
    pg.wait_for_selector('#debate [data-act=dcombo]', timeout=15000)
    for k in range(2): pg.locator('#debate [data-act=dcombo]').nth(k).dispatch_event('click')
    pg.locator('[data-act=dall]').dispatch_event('click'); pg.wait_for_function("(() => { const t = window.__APP.S.game.hist.filter(e => e.k === 'talk').at(-1); return (t.deb || []).some(l => l.id.includes('+')); })()")
    cov.stop(pg, 'social')
    assert not errs, errs
    b.close()
print('social ok: sou liberal com prova, sugerir eliminação com motivo, virar um voto, acusação e réplica em combo')
