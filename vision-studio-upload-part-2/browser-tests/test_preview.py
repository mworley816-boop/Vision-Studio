"""Real Chromium smoke test for Vision Studio's dependency-free preview.
Run: python browser-tests/test_preview.py (requires playwright and Chromium).
"""
import json
import traceback
import os
import urllib.request
from playwright.sync_api import Error as PlaywrightError
import subprocess
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = 4187
ARTIFACT_DIR = ROOT / 'browser-test-artifacts'
ARTIFACT_DIR.mkdir(exist_ok=True)
page = None
context = None
browser = None
proc = subprocess.Popen(['node', 'scripts/preview-server.mjs'], cwd=ROOT,
    env={**__import__('os').environ, 'VISION_PREVIEW_PORT': str(PORT)},
    stdout=subprocess.PIPE, stderr=subprocess.PIPE)
try:
    with sync_playwright() as p:
        browser_path = os.environ.get('VISION_CHROMIUM_PATH')
        launch_options = {'headless': True, 'args': ['--no-sandbox', '--no-proxy-server']}
        if browser_path:
            launch_options['executable_path'] = browser_path
        browser = p.chromium.launch(**launch_options)
        context = browser.new_context(accept_downloads=True)
        context.tracing.start(screenshots=True, snapshots=True, sources=True)
        page = context.new_page()
        errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        for _ in range(30):
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{PORT}', timeout=1) as response:
                    assert response.status == 200
                break
            except OSError:
                time.sleep(.1)
        else:
            raise RuntimeError('Offline preview HTTP server did not become ready')
        try:
            page.goto(f'http://127.0.0.1:{PORT}', wait_until='load', timeout=5000)
        except PlaywrightError as exc:
            if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(exc):
                raise RuntimeError('Chromium navigation is blocked by the execution environment. Browser interaction tests NOT RUN; use a machine permitting localhost browser navigation.') from exc
            raise
        assert page.locator('#name').count() == 1, f'Preview form missing: {page.url}'
        page.locator('#name').fill('Browser test music')
        page.locator('#create button').click()
        assert page.locator('#count').inner_text() == '1'
        page.get_by_role('button', name='Create production draft').click()
        page.get_by_placeholder('Describe a scene').fill('Opening sunrise shot')
        page.get_by_role('button', name='Add scene').click()
        assert page.get_by_text('Planning blocked').count() == 1
        page.locator('input[type=checkbox]').check()
        assert page.get_by_text('Planning ready').count() == 1
        with page.expect_download() as download_info:
            page.locator('#export').click()
        download=download_info.value
        data=json.loads(Path(download.path()).read_text())
        assert len(data['projects'])==1 and len(data['productions'])==1
        assert data['productions'][0]['scenes'][0]['approved'] is True
        page.on('dialog', lambda d: d.accept())
        page.get_by_role('button', name='Delete local draft').click()
        assert page.locator('#count').inner_text() == '0'
        page.locator('#import').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':json.dumps(data).encode()})
        assert page.locator('#count').inner_text() == '1'
        assert page.get_by_text('Planning ready').count() == 1
        page.reload()
        assert page.locator('#count').inner_text() == '1'
        assert page.get_by_text('Planning ready').count() == 1
        assert not errors, errors
        print('PASS: Chromium project creation, scene approval, JSON export/import, reload persistence, no page errors')
except Exception:
    (ARTIFACT_DIR / 'failure.txt').write_text(traceback.format_exc(), encoding='utf-8')
    if page is not None:
        try:
            page.screenshot(path=str(ARTIFACT_DIR / 'failure.png'), full_page=True, timeout=3000)
        except Exception:
            pass
    raise
finally:
    if context is not None:
        try:
            context.tracing.stop(path=str(ARTIFACT_DIR / 'trace.zip'))
        except Exception:
            pass
    if browser is not None:
        try:
            browser.close()
        except Exception:
            pass
    proc.terminate()
    try: proc.wait(timeout=5)
    except subprocess.TimeoutExpired: proc.kill()
