from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
BASE_URL = (ROOT / "index.html").as_uri()
OUTPUT = ROOT / "output" / "playwright"

SAFE_ROUTES = [
    [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [3, 3], [2, 3], [1, 3]],
    [[3, 0], [3, 1], [3, 2], [2, 2], [2, 1], [1, 1], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3]],
    [[0, 0], [0, 1], [0, 2], [1, 2], [1, 1], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [2, 2], [2, 3], [2, 4], [3, 4], [4, 4]],
    [[4, 0], [3, 0], [2, 0], [2, 1], [2, 2], [3, 2], [4, 2], [4, 3], [4, 4], [3, 4], [2, 4], [1, 4], [0, 4]],
    [[2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [4, 3], [4, 4], [3, 4], [2, 4]],
    [[5, 0], [5, 1], [5, 2], [4, 2], [3, 2], [3, 1], [2, 1], [1, 1], [1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [4, 4], [4, 5], [3, 5], [2, 5], [1, 5], [0, 5]],
    [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2], [2, 3], [1, 3], [1, 4], [2, 4], [3, 4], [3, 3], [4, 3], [5, 3], [5, 4], [5, 5]],
    [[5, 0], [4, 0], [3, 0], [3, 1], [3, 2], [4, 2], [5, 2], [5, 3], [4, 3], [3, 3], [2, 3], [2, 4], [1, 4], [0, 4], [0, 5]],
    [[6, 0], [6, 1], [5, 1], [4, 1], [4, 2], [3, 2], [2, 2], [2, 3], [1, 3], [1, 4], [2, 4], [3, 4], [3, 5], [2, 5], [1, 5], [0, 5], [0, 6]],
    [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [3, 1], [4, 1], [4, 2], [4, 3], [3, 3], [3, 4], [2, 4], [1, 4], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [5, 6], [6, 6]],
]


def click_route(page, route):
    for row, col in route[1:]:
        # The optional hint intentionally pulses forever, so bypass Playwright's
        # stability wait for that highlighted node while still dispatching a real click.
        page.locator(f'button[data-key="{row},{col}"]').click(force=True)


def main():
    console_errors = []
    page_errors = []
    OUTPUT.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle")
        assert page.locator("h1").inner_text() == "誘惑のシナプス"
        assert page.locator("#introScreen").is_visible()
        page.screenshot(path=str(OUTPUT / "title.png"), full_page=True)

        page.locator("#startButton").click()
        assert page.locator("#gameScreen").is_visible()
        assert page.locator("#boardGrid .node").count() == 13

        page.locator('button[data-key="3,3"]').click()
        assert "上下左右" in page.locator("#toast").inner_text()

        click_route(page, SAFE_ROUTES[0])
        assert page.locator("#feedbackModal").is_visible()
        assert page.locator("#feedbackKicker").inner_text() == "正解ルート"
        assert "+0.8kg" in page.locator("#feedbackDelta").inner_text().replace(" ", "")
        page.screenshot(path=str(OUTPUT / "week01-success.png"), full_page=True)
        page.locator("#feedbackAction").click()
        assert "朝食の『ちょっとだけ』" in page.locator("#levelHeading").inner_text()

        page.locator('button[data-key="3,1"]').click()
        page.locator('button[data-key="3,2"]').click()
        page.locator('button[data-key="3,3"]').click()
        page.locator('button[data-key="2,3"]').click()
        page.locator('button[data-key="1,3"]').click()
        page.locator('button[data-key="0,3"]').click()
        assert page.locator("#feedbackKicker").inner_text() == "不正解ルート"
        assert "理性が混ざった" in page.locator("#feedbackTitle").inner_text()
        page.locator("#feedbackAction").click()
        page.locator("#hintButton").click()
        assert page.locator('button[data-key="3,1"]').get_attribute("class").find("hinted") >= 0

        click_route(page, SAFE_ROUTES[1])
        page.locator("#feedbackAction").click()
        for week_number, route in enumerate(SAFE_ROUTES[2:], start=3):
            click_route(page, route)
            assert page.locator("#feedbackKicker").inner_text() in {"正解ルート", "10 WEEKS COMPLETE"}
            if week_number < 10:
                page.locator("#feedbackAction").click()

        assert page.locator("#feedbackModal").is_visible()
        assert page.locator("#feedbackKicker").inner_text() == "10 WEEKS COMPLETE"
        assert "誘惑の回路が完成した。" in page.locator("#feedbackTitle").inner_text()
        assert page.locator("#completedValue").inner_text().strip().startswith("10")
        page.screenshot(path=str(OUTPUT / "complete.png"), full_page=True)

        mobile = browser.new_page(viewport={"width": 390, "height": 844})
        mobile.goto(BASE_URL)
        mobile.wait_for_load_state("networkidle")
        mobile.locator("#startButton").click()
        assert mobile.locator("#boardWrap").bounding_box()["width"] > 300
        assert mobile.locator("#boardWrap").bounding_box()["height"] > 300
        mobile.close()

        browser.close()

    assert not console_errors, f"console errors: {console_errors}"
    assert not page_errors, f"page errors: {page_errors}"
    print("SMOKE_PASS: title, invalid route, success, failure, hint, all 10 weeks, final result, and mobile board")


if __name__ == "__main__":
    main()
