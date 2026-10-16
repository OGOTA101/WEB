from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "test-artifacts"
ARTIFACTS.mkdir(exist_ok=True)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1100}, device_scale_factor=1)
    page_errors = []
    console_errors = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)

    page.goto("http://127.0.0.1:5173", wait_until="networkidle")
    page.wait_for_timeout(700)
    page.locator("[data-bet-type='red']").click()
    page.locator("#spin-button").click()

    page.wait_for_timeout(350)
    page.locator(".spell-button[data-spell-id='color']").click()
    page.wait_for_timeout(600)
    assert page.locator("#skill-count").inner_text() == "1"
    assert page.locator("#alert-level").inner_text() == "1 / 10"

    page.wait_for_function("document.querySelector('#viewport-card')?.dataset.phase === 'pending'", timeout=9000)
    rects = page.evaluate("""() => {
        const wand = document.querySelector('#wand-tool').getBoundingClientRect();
        const pin = document.querySelector('#pin-target').getBoundingClientRect();
        return {
            wand: { x: wand.x, y: wand.y, width: wand.width, height: wand.height },
            pin: { x: pin.x, y: pin.y, width: pin.width, height: pin.height },
        };
    }""")
    wand = rects["wand"]
    pin = rects["pin"]

    page.mouse.move(wand["x"] + wand["width"] / 2, wand["y"] + wand["height"] / 2)
    page.mouse.down()
    page.mouse.move(pin["x"] + pin["width"] / 2, pin["y"] + pin["height"] / 2, steps=12)
    page.wait_for_timeout(2200)
    page.wait_for_function("document.querySelector('#event-log')?.textContent?.includes('爆発後')", timeout=3000)
    page.mouse.up()
    page.screenshot(path=str(ARTIFACTS / "explosion-respin.png"), full_page=True)

    assert not page_errors, page_errors
    assert not console_errors, console_errors
    browser.close()

print("cheat smoke ok")
