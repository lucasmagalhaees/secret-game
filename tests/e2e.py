"""End to end, through the screen, in the browser: a whole game played the way a table would, on a phone-sized window.

Usage: python3 tests/e2e.py [dark|light]   (needs dist/ built: npm run build)
Opens dist/index.html from the disk, with the network blocked: the page must not need anything from outside to work.
Chance is taken out of the way by stacking the roles and the deck through window.__APP.S (invented test data); every
action is still a tap on the screen. Screenshots go to tests/shots/.
"""
import json, pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import cov
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / 'tests' / 'shots'; SHOTS.mkdir(exist_ok=True)
THEME = sys.argv[1] if len(sys.argv) > 1 else 'dark'
assert THEME in ('dark', 'light'), THEME
KEY = 'secrethitler.v1'
NAMES = ['Ana', 'Bia', 'Caio', 'Duda', 'Edu', 'Fê', '<b>Gil</b>']

with sync_playwright() as p:
    b = p.chromium.launch()
    # the main run asks for less motion, as a device can: nothing waits for an animation, so every tap acts at once.
    # A short run with motion on, at the end, checks the animations themselves.
    ctx = b.new_context(viewport=dict(width=393, height=852), device_scale_factor=2, color_scheme=THEME, locale='pt-BR', timezone_id='America/Sao_Paulo', has_touch=True, is_mobile=True, reduced_motion='reduce')
    ctx.route('**/*', lambda r: r.abort() if r.request.url.startswith('http') else r.continue_())
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    cov.start(pg)
    pg.goto((ROOT / 'dist' / 'index.html').as_uri()); pg.wait_for_function('window.__APP && window.__APP.S')
    txt = lambda sel: pg.text_content(sel).replace('\xa0', ' ')      # the words in the page; CSS may show them in capitals
    overflow = lambda: pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
    # D17: what pops up over the screen lands on the strip under the header, never on the card of the phase
    over_phase = lambda sel: pg.evaluate('''sel => { scrollTo(0, 0); const o = document.querySelector(sel).getBoundingClientRect(), p = document.querySelector('#phase').getBoundingClientRect();
        return !(o.bottom <= p.top || o.top >= p.bottom || o.right <= p.left || o.left >= p.right); }''', sel)
    # the contrast of each vote button, its text against its own background (WCAG: at least 4.5 to 1)
    vote_contrast = lambda: pg.evaluate('''() => [...document.querySelectorAll('.btn.vote')].map(b => {
        const rgb = c => c.match(/[\\d.]+/g).slice(0, 3).map(Number), lum = c => { const [r, g, b] = rgb(c).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
        const st = getComputedStyle(b), a = lum(st.color), z = lum(st.backgroundColor); return (Math.max(a, z) + .05) / (Math.min(a, z) + .05); })''')
    shot = lambda name: pg.screenshot(path=str(SHOTS / name), full_page=True)
    G = lambda: pg.evaluate('window.__APP.S.game')
    wait = lambda: pg.wait_for_function('window.__APP && window.__APP.S')

    # ---------- the table ----------
    assert pg.locator('#empty').count() == 1 and pg.locator('[data-act=start]').is_disabled(), txt('#view')
    # D18: the home screen is short; the start button says what is missing, and with a name the app fills the table there
    assert 'Faltam 5 para começar' in txt('[data-act=start]') and pg.locator('#fillmin').count() == 0
    assert pg.locator('#ruleslist').count() == 0 and pg.locator('#moreopts').count() == 0 and 'sorteado' in txt('#moresum'), 'the rules and the other choices start closed'
    pg.click('#rulestoggle'); assert pg.locator('#ruleslist li').count() >= 5; pg.click('#rulestoggle'); assert pg.locator('#ruleslist').count() == 0
    pg.fill('#name', 'Xu'); pg.press('#name', 'Enter'); assert 'Faltam 4' in txt('[data-act=start]') and 'Completar com 4 da IA' in txt('#fillmin')
    pg.click('#fillmin'); assert pg.locator('#names li').count() == 5 and not pg.locator('[data-act=start]').is_disabled() and 'Começar com 5 jogadores' in txt('[data-act=start]')
    pg.click('#clear'); assert pg.locator('#names li').count() == 5 and 'Toque de novo' in txt('#clear'), 'clearing the table takes two taps'
    pg.click('#clear'); assert pg.locator('#names li').count() == 0 and pg.locator('#clear').count() == 0
    assert pg.locator('#empty').count() == 1
    assert pg.locator('select').count() == 0, 'no select of the system: its list is drawn by the device, with colours of its own'
    pg.click('[data-act=addname]'); assert 'Escreve um nome' in txt('#msg')
    for i, n in enumerate(NAMES):
        pg.fill('#name', n)
        if i % 2: pg.press('#name', 'Enter')
        else: pg.click('[data-act=addname]')
    assert pg.locator('#names li').count() == 7 and pg.locator('#names b b').count() == 0 and '<b>Gil</b>' in txt('#names'), 'names, and markup shown as text'
    pg.fill('#name', 'ana'); pg.click('[data-act=addname]'); assert 'já está na mesa' in txt('#msg')
    pg.locator('#names li', has_text='Fê').locator('[data-act=rmname]').click()
    assert pg.locator('#names li').count() == 6 and 'Começar com 6' in txt('[data-act=start]')
    pg.fill('#name', 'Fê'); pg.click('[data-act=addname]')
    for extra in ('H', 'I', 'J'): pg.fill('#name', extra); pg.click('[data-act=addname]')
    pg.fill('#name', 'K'); pg.click('[data-act=addname]'); assert 'de 5 a 10' in txt('#msg')
    for extra in ('H', 'I', 'J'): pg.click(f'[aria-label="Tirar {extra}"]')
    assert overflow() == 0, 'nothing wider than the phone'
    shot(f's1-mesa-{THEME}.png')

    # the theme: the device's by default, or the one chosen, which stays
    rgb = lambda: [int(v) for v in re.findall(r'\d+', pg.evaluate('getComputedStyle(document.body).backgroundColor'))[:3]]
    dark = lambda: max(rgb()) < 60
    assert dark() == (THEME == 'dark') and pg.locator('[data-act=theme][data-t=auto]').get_attribute('aria-pressed') == 'true', rgb()
    other = 'light' if THEME == 'dark' else 'dark'
    pg.click(f'[data-act=theme][data-t={other}]'); assert dark() == (other == 'dark') and pg.evaluate('document.documentElement.dataset.theme') == other
    cov.reload(pg); wait(); assert dark() == (other == 'dark'), 'the chosen theme stays'
    assert pg.locator('#names li').count() == 7, 'the table is kept on the device'
    pg.click('[data-act=theme][data-t=auto]'); assert dark() == (THEME == 'dark') and pg.evaluate('document.documentElement.dataset.theme') is None
    # the style: the poster by default, or art deco, which stays
    look = lambda: pg.evaluate('document.documentElement.dataset.look')
    assert look() == 'poster' and pg.locator('[data-act=look][data-l=poster]').get_attribute('aria-pressed') == 'true'
    pg.click('[data-act=look][data-l=deco]'); assert look() == 'deco' and dark() == (THEME == 'dark')
    cov.reload(pg); wait(); assert look() == 'deco', 'the chosen style stays'
    shot(f's0-deco-{THEME}.png')
    pg.click('[data-act=look][data-l=poster]'); assert look() == 'poster' and 'look' not in json.loads(pg.evaluate(f'localStorage.getItem("{KEY}")'))
    # sound and vibration: on by default, off when chosen, and that stays
    saved = lambda: json.loads(pg.evaluate(f'localStorage.getItem("{KEY}")'))
    assert pg.locator('[data-act=fx][data-v=on]').get_attribute('aria-pressed') == 'true'
    pg.click('[data-act=fx][data-v=off]'); assert saved().get('quiet') is True and pg.locator('[data-act=fx][data-v=off]').get_attribute('aria-pressed') == 'true'
    pg.click('[data-act=fx][data-v=on]'); assert 'quiet' not in saved()
    # D20: closing a secret when the phone is face down is off unless the person turns it on (lying down fools the sensor)
    assert pg.locator('[data-act=flip][data-v=off]').get_attribute('aria-pressed') == 'true' and 'flip' not in saved()
    pg.click('[data-act=flip][data-v=on]'); assert saved().get('flip') is True and 'tela para baixo' in txt('#fliptext')
    # opened from the disk there is no service worker, and the screen says so
    assert 'não fica guardado' in txt('#version') and pg.locator('[data-act=checkupdate]').count() == 0, txt('#version')

    # ---------- roles, each behind the gate ----------
    pg.click('[data-act=start]')
    g = G(); assert g['phase'] == 'reveal' and len(g['players']) == 7
    for i in range(7):
        assert 'Passe o celular para' in txt('#phase') and pg.locator('#role').count() == 0, 'the role is not on screen before the tap'
        pg.click('[data-act=open]')
        me = G()['players'][i]
        assert pg.locator('#role svg.art').count() == 1, 'the role card shows its illustration'
        assert pg.locator('#role').count() == 1 and {'liberal': 'LIBERAL', 'fascista': 'FASCISTA', 'hitler': 'HITLER'}[me['role']] in txt('#role').upper(), txt('#phase')
        if me['role'] == 'fascista':
            hitler = next(p['name'] for p in G()['players'] if p['role'] == 'hitler')
            assert hitler in txt('#allies .ally.H'), txt('#phase')
            others = [p['name'] for j, p in enumerate(G()['players']) if p['role'] == 'fascista' and j != i]
            assert all(o in txt('#allies .ally.F') for o in others) and hitler not in txt('#allies .ally.F'), txt('#allies')
        if i == 0: shot(f's2-papel-{THEME}.png')
        pg.click('[data-act=hiderole]')
    assert G()['phase'] == 'nominate'

    # stack the table so the game below is the same every time: Ana is Hitler, Bia and Caio fascists; Duda presides
    pg.evaluate('''() => { const g = window.__APP.S.game; g.players.forEach((p, i) => { p.role = i === 0 ? 'hitler' : i < 3 ? 'fascista' : 'liberal'; }); g.pres = 3; }''')
    pg.evaluate(f'localStorage.setItem("{KEY}", JSON.stringify(window.__APP.S))')
    cov.reload(pg); wait()
    assert G()['pres'] == 3 and 'Duda' in txt('#phase') and 'Duda' in txt('#status'), 'the game in course comes back after a reload'
    assert pg.locator('#board .slot.new').count() == 0, 'a reload stamps nothing'
    stack = lambda deck: pg.evaluate('(d) => { window.__APP.S.game.deck = d.split(""); }', deck)

    def nominate(i):
        pg.click(f'#phase [data-act=nominate][data-i="{i}"]'); assert G()['phase'] == 'vote'
    def votes(elected):
        pg.click(f'[data-act=elect][data-v="{1 if elected else 0}"]')
    def hand(role, keep):
        """Through the gate, the president or the chancellor throws away a law that is not `keep` if there is one."""
        assert pg.locator('#phase .law').count() == 0 and 'Passe o celular para' in txt('#phase'), 'the laws are not on screen before the tap'
        pg.click('[data-act=open]')
        h = G()['hand']; k = next((j for j, l in enumerate(h) if l != keep), 0)
        assert pg.locator('#phase .law').count() == len(h) and pg.locator(f'[data-act={role}discard]').is_disabled()
        pg.click(f'#phase [data-act=pick][data-k="{k}"]')
    def govern(chanc, law):
        nominate(chanc); votes(True); assert G()['phase'] == 'president', G()['log'][-1]
        hand('p', law); pg.click('[data-act=pdiscard]'); assert G()['phase'] == 'chancellor'
        g0 = G(); hand('c', law); pg.click('[data-act=cdiscard]')
        assert pg.locator('#board .slot.new').count() == (0 if G()['phase'] == 'over' else 1), 'the new law stamps onto the board'
        made = 'liberal' if G()['laws']['L'] > g0['laws']['L'] else 'fascista'
        who = f"{g0['players'][g0['pres']]['name']} e {g0['players'][g0['chanc']]['name']}"
        assert pg.locator('#decree:not([hidden])').count() == 1 and who in txt('#decree') and f'lei {made}' in txt('#decree'), ('who approved the law, over the screen', txt('#decree'))
        if G()['phase'] != 'over': assert not over_phase('#decree .decree-card'), 'the law that passed shows over the strip at the top, not over the phase'

    # three governments rejected: the top law goes in by itself
    # help for the phase, open and closed
    pg.click('[data-act=help]'); assert 'escolhe quem vai ser o chanceler' in txt('#helptext')
    pg.click('[data-act=help]'); assert pg.locator('#helptext').count() == 0
    # a nomination and a vote result can be taken back, until something else happens
    nominate(4); assert pg.locator('#undo').count() == 1
    pg.click('#undo'); assert G()['phase'] == 'nominate' and G()['chanc'] is None and pg.locator('#undo').count() == 0
    nominate(4); votes(False)
    assert pg.evaluate('document.getElementById("stamp").hidden') is False and 'Rejeitado' in txt('#stamp'), 'the vote result is stamped on the screen'
    assert not over_phase('#stamp'), 'the stamp lands on the strip at the top, not on the phase'
    assert G()['tracker'] == 1 and pg.locator('#tracker.bump').count() == 1, 'the tracker shakes when it moves'
    pg.click('#undo'); assert G()['phase'] == 'vote' and G()['tracker'] == 0 and G()['chanc'] == 4
    votes(False); assert G()['tracker'] == 1 and G()['pres'] == 4 and 'rejeitado' in txt('#toast')
    nominate(5); votes(False)
    stack('LFFLFFLL')
    nominate(6); votes(False)
    g = G(); assert g['laws'] == {'L': 1, 'F': 0} and g['tracker'] == 0 and g['pres'] == 6 and 'Lei liberal aprovada' in txt('#toast'), g['log'][-3:]
    # a government: 3 laws, 2, one enacted
    stack('FFLFFLFFL'); govern(0, 'F')
    assert G()['laws']['F'] == 1 and G()['pres'] == 0 and 'Lei fascista aprovada' in txt('#toast')
    # term limits: the last government cannot come back as chancellor
    assert pg.locator('#phase [data-act=nominate][data-i="0"]').count() == 0 and pg.locator('#phase [data-act=nominate][data-i="6"]').count() == 0 and 'último governo' in txt('#phase')
    assert overflow() == 0; shot(f's3-mesa-de-jogo-{THEME}.png')

    # 2nd fascist law: Ana sees Caio's party
    stack('FFLFFL'); govern(1, 'F'); assert G()['phase'] == 'investigate'
    pg.click('#phase [data-act=investigate][data-i="2"]')
    assert pg.locator('#party').count() == 0; pg.click('[data-act=open]'); assert pg.locator('#party svg.art').count() == 1 and 'FASCISTA' in txt('#party').upper() and 'Caio' in txt('#party')
    pg.click('[data-act=endpower]'); assert G()['phase'] == 'nominate' and G()['pres'] == 1
    # 3rd, at a table of 7: Bia calls a special election and makes Edu president; then the order goes on after Bia
    stack('FFLFFL'); govern(3, 'F'); assert G()['phase'] == 'special' and 'eleição especial' in txt('#phase')
    assert pg.locator('#phase [data-act=special][data-i="1"]').count() == 0, 'not the president herself'
    pg.click('#phase [data-act=special][data-i="4"]'); assert G()['pres'] == 4 and G()['back'] == 1 and 'Edu é o próximo presidente' in txt('#toast')
    nominate(6); votes(False); assert G()['pres'] == 2 and G()['back'] is None
    # 4th: Caio eliminates Gil (Fê went back in at the end of the table)
    stack('FFLFFL'); govern(4, 'F'); assert G()['phase'] == 'execute'
    assert pg.locator('[data-act=execute]').is_disabled()
    pg.click('#phase [data-act=pickp][data-i="5"]'); assert 'Eliminar <b>Gil</b>' in txt('[data-act=execute]')
    pg.click('[data-act=execute]'); assert G()['players'][5]['alive'] is False and '<b>Gil</b> foi eliminado' in txt('#toast') and pg.locator('#players li.dead').count() == 1
    # 5th: Duda eliminates Bia
    stack('FFLFFL'); govern(6, 'F'); assert G()['phase'] == 'execute' and G()['laws']['F'] == 5
    pg.click('#phase [data-act=pickp][data-i="1"]'); pg.click('[data-act=execute]'); assert G()['pres'] == 4

    # veto: refused, then the chancellor must enact one
    stack('LLFLLF'); nominate(2); votes(True)
    hand('p', 'L'); pg.click('[data-act=pdiscard]')
    pg.click('[data-act=open]'); pg.click('[data-act=askveto]'); assert G()['phase'] == 'veto' and 'quer vetar' in txt('#phase')
    pg.click('[data-act=veto][data-v="0"]'); assert G()['phase'] == 'chancellor' and 'Veto recusado' in txt('#toast')
    hand('c', 'L'); assert pg.locator('[data-act=askveto]').count() == 0 and 'recusou o veto' in txt('#phase')
    pg.click('[data-act=cdiscard]'); assert G()['laws'] == {'L': 2, 'F': 5} and G()['pres'] == 6
    # veto: accepted, and it counts as a failed government
    stack('LLFLLF'); nominate(3); votes(True)
    hand('p', 'L'); pg.click('[data-act=pdiscard]'); pg.click('[data-act=open]'); pg.click('[data-act=askveto]')
    pg.click('[data-act=veto][data-v="1"]'); assert G()['tracker'] == 1 and G()['laws'] == {'L': 2, 'F': 5} and 'Veto aceito' in txt('#toast')

    # Hitler elected chancellor with 3 or more fascist laws: the fascists win
    assert G()['pres'] == 0; nominate(2); votes(False); assert G()['pres'] == 2
    nominate(0); votes(True)
    g = G(); assert g['phase'] == 'over' and g['winner'] == 'F' and 'fascistas venceram' in txt('#phase')
    assert pg.locator('#confetti i').count() > 0 and pg.locator('#phase .cheer svg.art').count() == 1, 'confetti and the winners cheering'
    assert pg.locator('#players .role').count() == 7 and 'Hitler' in txt('#players'), 'the roles are shown at the end'
    # D18: the end in tabs: the result first, the whole game and the record one tap away
    assert pg.get_attribute('#tab-res', 'aria-selected') == 'true' and pg.locator('#summary').count() == 0 and pg.locator('#log').count() == 0
    pg.click('#tab-jogo'); assert pg.locator('#summary').count() == 1 and pg.locator('#players').count() == 0
    assert 'Ana investigou Caio: era fascista' in ' '.join(txt('#summary').split()), txt('#summary')
    assert 'eliminou' in txt('#summary') and 'rejeitados' in txt('#summary') and 'Caos' in txt('#summary') and 'vetaram' in txt('#summary'), txt('#summary')
    pg.click('#tab-log'); assert pg.locator('#log li').count() > 10; pg.click('#tab-res')
    # D19: the good and bad plays of each person, only with the assistance on
    assert pg.locator('.card.review').count() == 0 and pg.locator('#reviewon').count() == 1, 'assistance off: a button, not the review'
    pg.click('#reviewon'); assert pg.locator('.card.review').count() == 7 and pg.locator('.plays li').count() > 0, 'one review per person at the table'
    rv = txt('#view'); assert '{p' not in rv and '{f' not in rv and 'undefined' not in rv and 'NaN' not in rv
    pg.evaluate('(() => { delete window.__APP.S.assist; })()'); pg.click('#tab-res')
    assert overflow() == 0; shot(f's4-fim-{THEME}.png')

    # again with the same table, then ending a game halfway
    pg.click('[data-act=again]'); assert G()['phase'] == 'reveal' and G()['laws'] == {'L': 0, 'F': 0}
    pg.click('[data-act=end]'); assert G() is not None and 'Toque de novo' in txt('[data-act=end]')
    pg.click('[data-act=end]'); assert G() is None and pg.locator('#table').count() == 1 and pg.locator('#names li').count() == 7
    saved = json.loads(pg.evaluate(f'localStorage.getItem("{KEY}")')); assert saved['game'] is None and len(saved['names']) == 7

    # the liberals win by eliminating Hitler
    pg.click('[data-act=start]')
    pg.evaluate('''() => { const g = window.__APP.S.game; g.players.forEach((p, i) => { p.role = i === 0 ? 'hitler' : i < 3 ? 'fascista' : 'liberal'; }); g.phase = 'nominate'; g.pres = 3; g.laws = { L: 0, F: 3 }; }''')
    pg.evaluate(f'localStorage.setItem("{KEY}", JSON.stringify(window.__APP.S))'); cov.reload(pg); wait()
    stack('FFLFFL')
    nominate(4); votes(True); hand('p', 'F'); pg.click('[data-act=pdiscard]'); hand('c', 'F'); pg.click('[data-act=cdiscard]')
    assert G()['phase'] == 'execute'
    pg.click('#phase [data-act=pickp][data-i="0"]'); pg.click('[data-act=execute]')
    assert G()['winner'] == 'L' and 'liberais venceram' in txt('#phase')
    pg.click('[data-act=table]'); assert G() is None and pg.locator('#table').count() == 1

    # a table of 5: Hitler knows the fascist, and the 3rd fascist law lets the president see the next 3 laws
    pg.locator('#names li', has_text='Fê').locator('[data-act=rmname]').click()
    pg.locator('#names li', has_text='Gil').locator('[data-act=rmname]').click()
    pg.click('[data-act=start]'); assert len(G()['players']) == 5
    pg.evaluate('''() => { window.__APP.S.game.players.forEach((p, i) => { p.role = i === 0 ? 'hitler' : i === 1 ? 'fascista' : 'liberal'; }); }''')
    pg.evaluate(f'localStorage.setItem("{KEY}", JSON.stringify(window.__APP.S))'); cov.reload(pg); wait()
    pg.click('[data-act=open]'); assert 'Seu fascista' in txt('#allies') and 'Bia' in txt('#allies .ally.F'), txt('#phase')
    # a secret closes by itself when the app leaves the screen, or when the phone is put face down
    pg.evaluate('''() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; }''')
    assert pg.locator('#role').count() == 0 and 'saiu da tela' in txt('#toast'), 'hidden when the app goes away'
    pg.click('[data-act=open]'); pg.evaluate("window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta: 175 }))")
    assert pg.locator('#role').count() == 0 and 'virado para baixo' in txt('#toast'), 'hidden when the phone is face down, with that turned on'
    pg.evaluate('(() => { delete window.__APP.S.flip; })()')
    pg.click('[data-act=open]'); pg.evaluate("window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta: 175 }))")
    assert pg.locator('#role').count() == 1, 'with it off (the default), a phone face down, or a person lying down, keeps the secret open'
    for i in range(5):
        if i: pg.click('[data-act=open]')
        pg.click('[data-act=hiderole]')
    assert 'espiar' in txt('#board') and 'partido' not in txt('#board') and 'eleição' not in txt('#board'), txt('#board')
    pg.evaluate('''() => { const g = window.__APP.S.game; g.pres = 3; g.laws = { L: 0, F: 2 }; }''')
    pg.evaluate(f'localStorage.setItem("{KEY}", JSON.stringify(window.__APP.S))'); cov.reload(pg); wait()
    stack('FFLFFL'); govern(4, 'F'); assert G()['phase'] == 'peek'
    pg.click('[data-act=open]'); top = G()['deck'][:3]
    assert [('L' if 'LIBERAL' in t.upper() else 'F') for t in pg.locator('#peek .law').all_inner_texts()] == top
    pg.click('[data-act=endpower]'); assert G()['pres'] == 4

    # ---------- against the app (D10): one person and the app's players ----------
    pg.evaluate(f"localStorage.setItem('{KEY}', JSON.stringify({{v: 1, names: []}}))"); cov.reload(pg); wait()
    pg.click('[data-act=fill][data-n="7"]'); assert 'Ponha o seu nome' in txt('#msg'), 'the app completes a table that has a person'
    pg.fill('#name', 'Lu'); pg.click('[data-act=fill][data-n="7"]')
    assert pg.locator('#names li').count() == 7 and pg.locator('#names small.ai').count() == 6 and '6 lugares são da IA' in txt('#solo')
    pg.click('[data-act=addbot]'); assert pg.locator('#names li').count() == 8
    pg.locator('#names li').nth(7).locator('[data-act=rmname]').click(); assert pg.locator('#names li').count() == 7
    # D20: the size of the table goes down as fast as it goes up: the last seats of the app go away, never a person
    pg.click('[data-act=fill][data-n="5"]'); assert pg.locator('#names li').count() == 5 and pg.locator('#names small.ai').count() == 4 and 'Lu' in txt('#names') and pg.get_attribute('[data-act=fill][data-n="5"]', 'aria-pressed') == 'true'
    pg.click('[data-act=fill][data-n="7"]'); assert pg.locator('#names li').count() == 7 and pg.locator('#names small.ai').count() == 6
    pg.click('[data-act=level][data-v=extremo]')
    assert pg.locator('[data-act=level][data-v=extremo]').get_attribute('aria-pressed') == 'true' and 'Conta as cartas' in txt('#leveltext')
    assert sum(1 for x in pg.locator('#names li b').all_text_contents() if x in pg.evaluate('window.__APP.Core.BOT_NAMES.fascismo')) == 6, 'the app players get names of well-known politicians'
    pg.click('#moretoggle'); assert pg.locator('#moreopts').count() == 1
    pg.click('[data-act=train][data-v=fascista]'); assert 'Você vai ser fascista' in txt('#traintext')
    pg.click('[data-act=assist][data-v=on]'); assert pg.locator('[data-act=assist][data-v=on]').get_attribute('aria-pressed') == 'true'
    pg.click('[data-act=coach][data-v=on]'); assert 'treinador faz as contas' in txt('#solo')
    pg.click('[data-act=speed][data-v=rapida]'); assert pg.evaluate('window.__APP.S.speed') == 'rapida'
    pg.click('[data-act=speed][data-v=normal]'); assert pg.evaluate('window.__APP.S.speed') is None
    pg.locator('#names li').nth(0).locator('[data-act=rmname]').click(); pg.click('[data-act=start]')
    assert 'pelo menos uma pessoa' in txt('#msg') and G() is None, 'a table of the app alone does not start'
    pg.fill('#name', 'Lu'); pg.press('#name', 'Enter')                     # Lu sits last: seat 6
    assert overflow() == 0; shot(f's5-contra-ia-mesa-{THEME}.png')
    pg.evaluate('window.__APP.ui.think = 60000')                              # slow, to see the app player thinking
    pg.click('[data-act=start]')
    pg.wait_for_function('window.__APP.S.game.reveal === 6')
    assert G()['level'] == 'extremo' and sum(1 for x in G()['players'] if x.get('ai')) == 6
    assert G()['players'][6]['role'] == 'fascista' and G()['train'] == 'fascista', 'training: the role chosen'
    assert 'Só para os seus olhos' in txt('#phase') and 'Passe o celular' not in txt('#phase') and txt('#phase .who') == 'Lu', 'alone, nobody to pass the phone to'
    pg.click('[data-act=open]'); assert pg.locator('#role').count() == 1 and 'Fascista' in txt('#role') and 'escolheu ser fascista' in txt('#trained'); pg.click('[data-act=hiderole]')
    assert pg.locator('#ata').count() == 1 and 'Nenhuma lei ainda' in txt('#ata')
    # the notebook: a fascist at a table of 7 knows Hitler and the other fascist; the rest is marked by hand, and kept
    assert pg.locator('#players .sure-tag').count() == 2 and not pg.locator('#drawer').is_visible(), 'the notebook starts closed; what is known shows in the list of players'
    pg.click('#notestoggle'); assert pg.locator('#drawer').is_visible() and pg.locator('#notes [data-act=note]').count() == 4 * 3 and pg.get_attribute('#notestoggle', 'aria-expanded') == 'true', 'the side panel opens from the tab'
    assert pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") == 0
    first = pg.locator('#notes [data-act=note][data-v=L]').first.get_attribute('data-i')
    pg.locator('#notes [data-act=note][data-v=L]').first.click(); assert G() and pg.evaluate('window.__APP.S.notes') == {first: 'L'}
    pg.locator(f'#notes [data-act=note][data-i="{first}"][data-v=""]').click(); assert pg.evaluate('window.__APP.S.notes') is None
    pg.locator(f'#notes [data-act=note][data-i="{first}"][data-v=F]').click()
    pg.click('#notestoggle'); assert not pg.locator('#drawer').is_visible() and pg.locator('#players .tag.mark.F').count() == 1 and '· 1' in txt('#notestoggle'), 'closed, the marks stay in view'
    # the live suspicion: off by default, on with a tap, one bar per app player
    assert pg.locator('#players .meter').count() == 0
    pg.click('#livetoggle'); assert pg.locator('#players .meter').count() == 6 and all(0 <= int(t.rstrip('%')) <= 100 for t in pg.locator('#players .meter b').all_text_contents()), 'live: how much each app player suspects the person'
    pg.click('#livetoggle'); assert pg.locator('#players .meter').count() == 0
    # the reasoning of the app players (D16): during the game, only after a warning, since it shows the roles
    assert not pg.locator('#mind').is_visible(); pg.click('#mindtoggle')
    assert pg.locator('#mind').is_visible() and 'Estraga a partida' in txt('#mind') and pg.locator('#mind .role').count() == 0, 'a warning first, no role on screen'
    pg.click('#mindon'); assert pg.evaluate('window.__APP.S.debug') is True and pg.locator('#mind .mind-who button').count() == 6 and pg.locator('#mind .mind-bel li').count() == 6, 'then each app player, and what it thinks of each other seat'
    assert 'Lu (você)' in txt('#mind .mind-bel') and 'Por que' in txt('#mind') and 'No começo' in txt('#mind .mind-trail'), txt('#mind')
    assert pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") == 0; shot(f's5-raciocinio-{THEME}.png')
    pg.click('#mindtoggle'); assert not pg.locator('#mind').is_visible()
    # D17: the panels open from a bar at the bottom that has its own room: scrolled to the end, nothing is under it
    pg.evaluate('scrollTo(0, document.documentElement.scrollHeight)')
    assert pg.evaluate("Math.max(...[...document.querySelectorAll('main .card, #app .card')].map(c => c.getBoundingClientRect().bottom)) <= document.querySelector('.dock').getBoundingClientRect().top"), 'nothing is under the bar at the bottom'
    pg.click('#notestoggle'); pg.click('#mindtoggle'); assert pg.locator('#mind').is_visible() and not pg.locator('#drawer').is_visible() and pg.evaluate('window.__APP.S.notesOpen') is None, 'one panel at a time'
    pg.click('#mindtoggle'); pg.evaluate('scrollTo(0, 0)')
    if G()['pres'] != 6:
        assert pg.locator('#thinking').count() == 1 and 'está escolhendo o chanceler' in txt('#thinking') and 'IA' in txt('#thinking'), txt('#phase')
    # D21: while an app player tells the table about its hand, the phase it holds still shows it deciding: never the gate
    # of its secret, as if the person should open it
    kept = pg.evaluate('JSON.stringify(window.__APP.S.game)')
    pg.evaluate('''(() => { const g = window.__APP.S.game, a = g.players.findIndex(p => p.ai);
      g.hist.push({ k: 'gov', pres: a, chanc: 6, law: 'L', drew: ['F', 'L', 'L'], got: ['L', 'L'] });
      g.pres = a; g.chanc = null; g.phase = 'investigated'; g.target = 6; })()''')
    pg.click('[data-act=help]'); pg.click('[data-act=help]')
    assert pg.locator('.handoff').count() == 0 and pg.locator('#thinking').count() == 1, ('an app player\'s secret never shows a gate', txt('#phase'))
    pg.evaluate(f'window.__APP.S.game = JSON.parse({kept!r})'); pg.click('[data-act=help]'); pg.click('[data-act=help]')
    pg.evaluate('window.__APP.ui.think = 0')
    pg.click('[data-act=help]'); assert 'IA no nível extremo' in txt('#helptext'); pg.click('[data-act=help]')
    me, seen, reloaded = 6, set(), False
    ORDER = ['[data-act=open]', '[data-act=hiderole]', '[data-act=say]', '#phase [data-act=nominate]', '[data-act=myvote]', '[data-act=pdiscard]:not([disabled])', '[data-act=cdiscard]:not([disabled])', '#phase [data-act=pick]', '[data-act=veto]', '#phase [data-act=investigate]', '#phase [data-act=special]', '[data-act=execute]:not([disabled])', '#phase [data-act=pickp]', '[data-act=endpower]']
    for step in range(900):
        g = G()
        if g['phase'] == 'over': break
        holder = g['pres'] if g['phase'] in ('president', 'veto', 'investigated', 'peek') else g['chanc'] if g['phase'] == 'chancellor' else None
        if holder is not None and holder != me:
            assert pg.locator('#phase .law').count() == 0 and pg.locator('#party').count() == 0, f'nothing secret of an app player on screen ({g["phase"]})'
        if pg.locator('.handoff').count():
            assert txt('#phase .who') == 'Lu', 'the phone only ever opens for the person'
        if g['phase'] == 'vote' and g['players'][me]['alive']:
            assert pg.locator('#phase [data-act=elect]').count() == 0 and pg.locator('#phase [data-act=myvote]').count() == 2; seen.add('vote')
            assert min(vote_contrast()) >= 4.5, ('Ja! and Nein! readable', vote_contrast())
        if pg.locator('.claim').count():
            seen.add('claim'); assert 'Pode mentir' in txt('.claim')
        if pg.locator('#decree:not([hidden])').count(): seen.add('decree')
        body = pg.evaluate('document.body.innerText')
        assert 'undefined' not in body and 'NaN' not in body, [l for l in body.split('\n') if 'undefined' in l or 'NaN' in l]
        if g['phase'] in ('nominate', 'vote') and 'seats' not in seen:
            seen.add('seats'); assert pg.locator('#seats li').count() == 7 and 'você' in txt('#seats').lower() and pg.locator('#seats li.F').count() >= 2, ('the table at the top, with what the person knows', txt('#seats'))
            assert 'Como funciona esta fase' in txt('[data-act=help]'), 'the help button says what it is'
        if pg.locator('#said').count(): seen.add('said'); assert 'disse' in txt('#said'), txt('#said')
        if pg.locator('#coach').count():
            seen.add('coach'); assert 'Como a mesa te vê' in txt('#coach'), txt('#coach')
            assert pg.evaluate("!!(document.querySelector('#phase').compareDocumentPosition(document.querySelector('#coach')) & Node.DOCUMENT_POSITION_FOLLOWING)"), 'what the person has to do comes before the trainer'
        if step == 40 and not reloaded:
            cov.reload(pg); wait(); pg.evaluate('window.__APP.ui.think = 0'); reloaded = True; continue   # the game comes back and the app goes on by itself
        for sel in ORDER:
            if pg.locator(sel).count():
                try: pg.locator(sel).first.click(timeout=2000)
                except Exception: pass
                break
        else:
            pg.wait_for_timeout(20)
    g = G(); log = '\n'.join(g['log'])
    assert g['phase'] == 'over' and g['winner'] in ('L', 'F'), g['log'][-5:]
    laws = sum(1 for e in g['hist'] if e['k'] in ('gov', 'chaos'))
    pg.click('#tab-jogo')
    assert pg.locator('#ata .timeline li.gov').count() == laws and 'Ja!:' in txt('#ata') and pg.locator('#ata .tally li').count() > 0, 'the minutes: every law, and who voted Ja! for it'
    assert pg.evaluate("getComputedStyle(document.querySelector('#ata .timeline')).listStyleType") == 'none', 'the minutes number the laws once (1ª, 2ª), not twice'
    pg.click('#ata [data-act=assist]'); assert pg.locator('#ata').count() == 0; pg.click('#tab-log'); pg.click('#showata'); pg.click('#tab-jogo'); assert pg.locator('#ata').count() == 1
    assert pg.locator('#summary').count() == 1; pg.click('#tab-res')
    assert {'vote', 'decree', 'coach', 'seats', 'said'} <= seen and 'Votos. Ja!' in log and ('disse que tirou' in log or 'disse que recebeu' in log), (seen, g['log'][-8:])
    assert ': "Desconfio de' in log or ': "Confio em' in log, 'the app players talk between rounds'
    assert pg.locator('#thoughts li').count() >= 1 and '→' in txt('#thoughts') and pg.locator('#thoughts svg.spark').count() >= 1, 'at the end, what the app players thought of the person'
    crux = pg.evaluate('window.__APP.Core.crux(window.__APP.S.game, 6, "end")')
    assert (pg.locator('#crux-end').count() == 1) == (crux is not None), 'a fascist sees the moment that raised the suspicion the most'
    if crux: assert 'ponto crucial' in txt('#crux-end').lower() and f"{round(crux['after'] * 100)}%" in txt('#crux-end')
    assert pg.locator('#players small.ai').count() == 6 and pg.locator('#players .role').count() == 7
    plays = pg.evaluate('window.__APP.Core.review(window.__APP.S.game, 6)')
    assert pg.locator('#review').count() == 1 and 'Suas jogadas' in txt('#review') and pg.locator('#review .plays li').count() == min(4, sum(1 for x in plays if x['good'])) + min(4, sum(1 for x in plays if not x['good'])), ('the review of the person, the main plays of each kind', plays)
    if pg.locator('#review [data-act=allplays]').count(): pg.click('#review [data-act=allplays]'); assert pg.locator('#review .plays li').count() == len(plays); pg.click('#review [data-act=allplays]')
    assert overflow() == 0; shot(f's6-contra-ia-fim-{THEME}.png')
    # at the end, the reasoning opens freely: every decision of the chosen app player, with its reason and the options weighed
    pg.evaluate('(() => { delete window.__APP.S.debug; })()'); pg.click('#mindtoggle'); assert 'Estraga' not in txt('#mind')
    for k in range(2):
        seat = int(pg.locator('#mind .mind-who button').nth(k).get_attribute('data-i')); pg.locator('#mind .mind-who button').nth(k).click()
        mine = pg.evaluate(f'window.__APP.S.game.trace.filter(t => t.seat === {seat}).length')
        assert mine > 0 and pg.locator('#mind .mind-log > li').count() == mine, (seat, mine)
    assert pg.locator('#mind .mind-rows').count() > 0 and pg.locator('#mind .mind-rows tr.on').count() > 0, 'the options it compared, the chosen one marked'
    other = pg.locator('#mind .mind-bel button').nth(1); pick = other.get_attribute('data-i'); other.click()
    assert pg.locator(f'#mind .mind-bel li.on [data-i="{pick}"]').count() == 1
    mind = txt('#mind'); assert '{p' not in mind and '{f' not in mind and 'undefined' not in mind and 'NaN' not in mind, mind[:400]
    assert pg.locator('#mind .mind-trail li').count() >= 1 and (pg.locator('#mind .mind-trail li').count() == 1 or '→' in txt('#mind .mind-trail'))
    shot(f's6-raciocinio-fim-{THEME}.png'); pg.click('#mindtoggle')

    # two people and three app players: the people vote one by one, then the votes open; and if both are out, the app plays on
    pg.click('[data-act=table]')
    for x in list(range(pg.locator('#names li').count())): pg.locator('#names li').nth(0).locator('[data-act=rmname]').click()
    for n in ('Ana', 'Bia'): pg.fill('#name', n); pg.press('#name', 'Enter')
    pg.click('[data-act=fill][data-n="7"]'); pg.click('[data-act=level][data-v=facil]')
    pg.evaluate('window.__APP.ui.think = 60000'); pg.click('[data-act=start]')
    assert pg.evaluate('window.__APP.S.notes') is None, 'a new game starts a clean notebook'
    for who in ('Ana', 'Bia'):
        assert 'Passe o celular para' in txt('#phase') and txt('#phase .who') == who
        pg.click('[data-act=open]'); pg.click('[data-act=hiderole]')
    pg.wait_for_function("window.__APP.S.game.phase === 'nominate'")
    pg.evaluate("(() => { const g = window.__APP.S.game; g.pres = 2; g.chanc = 3; g.phase = 'vote'; })()")
    pg.click('[data-act=help]'); pg.click('[data-act=help]')
    assert pg.locator('#voter-0').count() == 1 and pg.locator('#voter-1').count() == 1 and pg.locator('[data-act=countvotes]').is_disabled()
    pg.click('#voter-0 [data-act=myvote][data-v="1"]'); assert pg.locator('[data-act=countvotes]').is_disabled()
    pg.click('#voter-1 [data-act=myvote][data-v="0"]'); pg.click('[data-act=countvotes]')
    v = [e for e in G()['hist'] if e['k'] == 'vote'][-1]
    assert 0 in v['ja'] and 1 not in v['ja'] and 'Votos. Ja!: Ana' in '\n'.join(G()['log']), v
    pg.evaluate("(() => { const g = window.__APP.S.game; g.players[0].alive = false; g.players[1].alive = false; window.__APP.ui.think = 0; })()")
    if pg.locator('[data-act=undo]').count(): pg.click('[data-act=undo]')                   # taking the count back and playing it through again
    else: pg.click('[data-act=help]')
    pg.wait_for_function("window.__APP.S.game.phase === 'over'", timeout=20000)
    assert G()['winner'] in ('L', 'F')
    pg.evaluate("(() => { const g = window.__APP.S.game; g.phase = 'nominate'; g.winner = null; window.__APP.ui.think = 60000; })()"); pg.click('#tab-res')   # any tap repaints; the end screen has no help button
    assert pg.locator('#watching').count() == 1, 'with no person left, the screen says the app plays on'
    assert pg.locator('#notes').count() == 0, 'with two people at the table there is no notebook: the other one would see it'

    # the communist theme (D12): liberals against communists, Stalin, Da! and Niet!, the wolf and the bear
    pg.click('[data-act=end]'); pg.click('[data-act=end]')
    # D23: every finished game is kept on the device, and exported as a file
    kept = pg.evaluate("JSON.parse(localStorage.getItem('secrethitler.history.v1') || '[]')")
    assert len(kept) >= 2 and all(x['game']['phase'] == 'over' for x in kept) and f'{len(kept)} partidas terminadas' in txt('#historytext'), (len(kept), txt('#history'))
    with pg.expect_download() as dl: pg.click('#exportgames')
    f = json.loads(open(dl.value.path(), encoding='utf-8').read())
    assert f['app'] == 'secret-hitler' and f['format'] == 1 and len(f['games']) == len(kept) and dl.value.suggested_filename.endswith('.json') and 'trace' in f['games'][-1]['game'], 'the export holds every kept game, with the reasoning of the app players'
    pg.click('#wipe'); assert 'Toque de novo' in txt('#wipe'); pg.click('#wipe')
    assert 'Nenhuma partida terminada' in txt('#historytext') and pg.locator('#exportgames').count() == 0
    pg.click('[data-act=pack][data-v=comunismo]')
    reds = pg.evaluate('window.__APP.Core.BOT_NAMES.comunismo')
    assert txt('#boss') == 'Stalin' and sum(1 for x in pg.locator('#names li b').all_text_contents() if x in reds) == 5, 'the app seats take names of the theme'
    # D24: names by continent: the app seats change to names of the Americas
    pg.click('[data-act=region][data-v=americas]'); ams = pg.evaluate('window.__APP.Core.NAMES_BY.comunismo.americas')
    assert pg.evaluate('window.__APP.S.region') == 'americas' and all(x in ams for x in pg.locator('#names li').filter(has=pg.locator('small.ai')).locator('b').all_text_contents()) and overflow() == 0, 'the app seats take names of the Americas'
    pg.click('[data-act=region][data-v=mundo]'); assert pg.evaluate('window.__APP.S.region') is None
    assert 'Liberais x Comunistas' in txt('#pack') and 'comunistas' in txt('#rules') and 'Stalin' in txt('#rules') and 'fascis' not in (txt('#table') + txt('#solo') + txt('#rules')).lower()
    for x in list(range(pg.locator('#names li').count())):
        if pg.locator('#names li').nth(0).locator('small.ai').count() == 0: pg.locator('#names li').nth(0).locator('[data-act=rmname]').click()
        else: break
    pg.locator('#names li').nth(0).locator('[data-act=rmname]').click()
    pg.fill('#name', 'Lu'); pg.press('#name', 'Enter')
    if pg.locator('#moreopts').count() == 0: pg.click('#moretoggle')
    pg.click('[data-act=train][data-v=hitler]'); assert 'Stalin' in txt('#solo')
    pg.evaluate('window.__APP.ui.think = 0')
    pg.click('[data-act=start]'); pg.wait_for_selector('[data-act=open]'); pg.click('[data-act=open]')
    assert 'Stalin' in txt('#role') and pg.locator('#role svg.art').count() == 1 and G()['pack'] == 'comunismo'; pg.click('[data-act=hiderole]')
    for step in range(600):
        g = G()
        if g['laws']['L'] + g['laws']['F'] >= 1 or g['phase'] == 'over': break
        for sel in ORDER:
            if pg.locator(sel).count():
                try: pg.locator(sel).first.click(timeout=2000)
                except Exception: pass
                break
        else:
            pg.wait_for_timeout(20)
    body = pg.evaluate('document.body.innerText')
    assert 'fascis' not in body.lower() and 'Hitler' not in body and 'ja!' not in body.lower() and ('da!' in body.lower() or 'niet!' in body.lower()), [l for l in body.split('\n') if 'fascis' in l.lower() or 'Hitler' in l or 'Ja!' in l][:5]
    assert 'lei comunista' in txt('#decree').lower() or 'lei liberal' in txt('#decree').lower()
    assert overflow() == 0; shot(f's7-comunistas-{THEME}.png')
    pg.click('[data-act=end]'); pg.click('[data-act=end]'); pg.click('[data-act=pack][data-v=fascismo]'); assert txt('#boss') == 'Hitler'

    cov.stop(pg, f'e2e-{THEME}')
    assert not errs, errs

    # ---------- with motion on: the animations play, and taps wait for the falling card ----------
    mctx = b.new_context(viewport=dict(width=393, height=852), color_scheme=THEME, locale='pt-BR', reduced_motion='no-preference')
    mctx.route('**/*', lambda r: r.abort() if r.request.url.startswith('http') else r.continue_())
    mp = mctx.new_page(); merrs = []
    mp.on('pageerror', lambda e: merrs.append(str(e)))
    cov.start(mp)
    mp.goto((ROOT / 'dist' / 'index.html').as_uri()); mp.wait_for_function('window.__APP && window.__APP.S')
    for n in NAMES[:5]: mp.fill('#name', n); mp.press('#name', 'Enter')
    mp.click('[data-act=start]')
    mp.click('[data-act=open]'); assert mp.locator('.turn.go .back').count() == 1, 'the role card turns over'
    mp.click('[data-act=hiderole]')
    for _ in range(4): mp.click('[data-act=open]'); mp.click('[data-act=hiderole]')
    mp.locator('#phase [data-act=nominate]').first.click(); mp.click('[data-act=elect][data-v="1"]')
    assert mp.locator('#stamp.go').count() == 1 and 'Eleito' in mp.text_content('#stamp')
    mp.click('[data-act=open]'); assert mp.locator('.flip .hand .law').count() == 3, 'the laws are dealt'
    mp.click('#phase [data-act=pick][data-k="0"]'); mp.click('[data-act=pdiscard]')
    assert mp.locator('#phase .law.toss').count() == 1 and mp.evaluate('window.__APP.S.game.phase') == 'president', 'the card falls before the game moves on'
    mp.click('[data-act=pdiscard]')                                                   # a tap while it falls changes nothing
    mp.wait_for_function("window.__APP.S.game.phase === 'chancellor'", timeout=3000)
    assert mp.evaluate('window.__APP.S.game.discard.length') == 1, 'one discard, not two'
    cov.stop(mp, f'e2e-motion-{THEME}')
    assert not merrs, merrs
    b.close()
print(f'e2e ok ({THEME}): mesa, papéis atrás do portão, eleição, caos, leis, limite de mandato, poderes, veto, eleição especial, mesa de 5 (Hitler conhece o fascista, espiar), desfazer, ajuda, segredo que se esconde sozinho, resumo da partida, contra a IA (sozinho e com duas pessoas, treino, nomes, ata, anotações, conversa, treinador, o que pensavam de você, velocidade, painel lateral de anotações, desconfiança ao vivo, ponto crucial, raciocínio das IAs), tema liberais x comunistas, anúncio de quem aprovou cada lei, animações, fim de jogo pelos dois lados, guardado no aparelho, tema, sem estouro de largura e sem erro de script')
