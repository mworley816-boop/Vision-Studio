"""Next.js dashboard smoke test. Requires installed npm dependencies, Playwright and Chromium.
Run `npm run dev -- --hostname 127.0.0.1 --port 4190` separately, then execute this script.
"""
import os
import traceback
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'next-browser-artifacts'
ARTIFACTS.mkdir(exist_ok=True)
BASE = os.environ.get('VISION_NEXT_TEST_URL', 'http://127.0.0.1:4190')
page = context = browser = None
try:
    with sync_playwright() as playwright:
        opts = {'headless': True, 'args': ['--no-sandbox', '--no-proxy-server']}
        if os.environ.get('VISION_CHROMIUM_PATH'):
            opts['executable_path'] = os.environ['VISION_CHROMIUM_PATH']
        browser = playwright.chromium.launch(**opts)
        context = browser.new_context()
        context.tracing.start(screenshots=True, snapshots=True, sources=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        response = page.goto(BASE, wait_until='networkidle', timeout=60000)
        assert response and response.status == 200, 'Next.js dashboard did not return HTTP 200'
        page.get_by_placeholder('e.g. Midnight Soul').fill('Next smoke project')
        page.get_by_role('button', name='Create project').click()
        assert page.get_by_text('Next smoke project').count() > 0
        page.reload(wait_until='networkidle')
        assert page.get_by_text('Next smoke project').count() > 0, 'Project not persisted after reload'
        # A fresh browser profile imports offline v3 projects without deleting the source.
        migration_context = browser.new_context()
        migration_page = migration_context.new_page()
        migration_page.add_init_script("""() => {
            localStorage.setItem('vision-studio-offline-workspace-v3', JSON.stringify({
                version:3,
                projects:[{id:'migration-p1',name:'Migrated film',kind:'music',mode:'approval'}],
                productions:[]
            }));
        }""")
        migration_page.goto(BASE, wait_until='networkidle', timeout=60000)
        assert migration_page.get_by_text('Migrated film').count() > 0, 'Offline project not imported'
        assert migration_page.evaluate("localStorage.getItem('vision-studio-offline-workspace-v3') !== null"), 'Migration deleted original'
        assert migration_page.evaluate("localStorage.getItem('vision-studio-next-workspace-v2') !== null"), 'Migration did not create Next workspace'
        migration_page.reload(wait_until='networkidle')
        assert migration_page.get_by_text('Migrated film').count() > 0, 'Migrated project not persistent'
        migration_context.close()

        # Damaged canonical storage must fail closed and offer a raw recovery export.
        recovery_context = browser.new_context(accept_downloads=True)
        recovery_page = recovery_context.new_page()
        recovery_page.add_init_script("""() => {
            localStorage.setItem('vision-studio-next-workspace-v2', '{damaged-json');
        }""")
        recovery_page.goto(BASE, wait_until='networkidle', timeout=60000)
        assert recovery_page.get_by_role('heading', name='Workspace recovery required').is_visible(), 'Damaged workspace did not block editing'
        with recovery_page.expect_download() as download_info:
            recovery_page.get_by_role('button', name='Download raw recovery copy').click()
        assert download_info.value.suggested_filename.endswith('.json'), 'Recovery export is not JSON'
        assert recovery_page.evaluate("localStorage.getItem('vision-studio-next-workspace-v2') === '{damaged-json'"), 'Recovery flow overwrote original'
        recovery_context.close()
        assert not errors, f'Uncaught browser errors: {errors}' 
        print('PASS: Next.js dashboard loaded, project created and persisted, no uncaught page errors')
except Exception:
    (ARTIFACTS / 'failure.txt').write_text(traceback.format_exc(), encoding='utf-8')
    if page is not None:
        try:
            page.screenshot(path=str(ARTIFACTS / 'failure.png'), full_page=True, timeout=3000)
        except Exception:
            pass
    raise
finally:
    if context is not None:
        try:
            context.tracing.stop(path=str(ARTIFACTS / 'trace.zip'))
        except Exception:
            pass
    if browser is not None:
        browser.close()
