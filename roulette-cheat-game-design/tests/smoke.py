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
    assert page.locator("canvas").count() == 1
    assert page.locator("[data-bet-type='straight']").count() == 37
    assert page.locator("[data-bet-type='red']").count() == 1
    assert page.locator("[data-bet-type='black']").count() == 1
    assert page.locator(".spell-button.unlocked").count() == 2
    assert page.locator("#bankroll").inner_text() == "¥1,000"

    page.locator("[data-bet-type='red']").click()
    assert page.locator("#total-bet").inner_text() == "¥10"
    assert page.locator("#round-kicker").inner_text() == "BET PLACED"
    assert page.locator("#round-title").inner_text() == "赤"
    assert page.locator("#bet-summary").inner_text() == "赤 ¥10"
    page.locator("[data-bet-type='black']").click()
    assert page.locator("#total-bet").inner_text() == "¥20"
    assert page.locator("[data-bet-type='red'] .chip-amount").inner_text() == "¥10"
    assert page.locator("[data-bet-type='black'] .chip-amount").inner_text() == "¥10"
    page.locator("#clear-bets").click()
    page.locator("[data-bet-type='red']").click()
    page.screenshot(path=str(ARTIFACTS / "bet-placed.png"), full_page=True)
    page.locator("#spin-button").click()
    assert page.locator("#viewport-card").get_attribute("data-phase") == "spinning"
    assert page.locator("#round-title").inner_text() == "START"
    assert page.locator("[data-bet-type='red']").is_disabled()

    page.wait_for_function("document.querySelector('#viewport-card')?.dataset.spinStage === 'launch'", timeout=2000)
    page.wait_for_function("document.querySelector('#viewport-card')?.dataset.spinStage === 'orbit'", timeout=3000)
    page.screenshot(path=str(ARTIFACTS / "ball-orbit.png"), full_page=True)
    page.wait_for_function("document.querySelector('#viewport-card')?.dataset.spinStage === 'drop'", timeout=7000)
    page.screenshot(path=str(ARTIFACTS / "ball-drop.png"), full_page=True)
    page.wait_for_function("document.querySelector('#viewport-card')?.dataset.spinStage === 'settle'", timeout=7000)
    page.wait_for_function("document.querySelector('#viewport-card')?.dataset.phase === 'pending'", timeout=8000)
    assert page.locator("#pending-readout").is_visible()
    assert page.locator("#round-kicker").inner_text() == "STOP"
    assert int(page.locator("#viewport-card").get_attribute("data-collisions") or "0") > 0
    page.screenshot(path=str(ARTIFACTS / "pending-state.png"), full_page=True)

    page.wait_for_function("document.querySelector('#viewport-card')?.dataset.phase === 'betting'", timeout=5000)
    assert page.locator("#round-kicker").inner_text() == "ROUND END"
    assert page.locator("#round-title").inner_text().startswith(("WIN", "LOSE"))
    page.screenshot(path=str(ARTIFACTS / "after-result.png"), full_page=True)

    assert not page_errors, page_errors
    assert not console_errors, console_errors
    browser.close()

print("smoke ok")
