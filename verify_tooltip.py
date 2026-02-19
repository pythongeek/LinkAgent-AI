from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Navigate to the page
        print("Navigating to /content/history...")
        page.goto("http://localhost:5173/content/history")

        # Wait for the content to load (or empty state)
        page.wait_for_load_state("networkidle")

        # Check if we have content or empty state
        # In the empty state, there is no icon button with tooltip.
        # But wait, the file `ContentHistory.tsx` shows:
        # contents?.length > 0 ? ( render list with button ) : ( render empty state )

        # I need to know if there is content.
        # The memory says "The backend utilizes `prisma/seed.ts`... demo user...".
        # If I am not logged in, I might be redirected to login.
        # Memory says: "The ProtectedRoute component redirects unauthenticated users to /login".

        # So I probably need to login first.
        # I'll try to login with demo credentials if redirected.

        if "login" in page.url:
            print("Redirected to login, attempting to login...")
            page.fill('input[type="email"]', 'demo@example.com')
            page.fill('input[type="password"]', 'password') # Guessing password?
            # Wait, I don't know the password.
            # Memory says "backend/prisma/seed.ts file defines a demo user...".
            # Let's check seed.ts to find the password.

        # Let's assume for now I might need to check seed.ts first.

        browser.close()

if __name__ == "__main__":
    run()
