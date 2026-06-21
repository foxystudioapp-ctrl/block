# Plan for Milestone 2: Set up testing environment and dev server

1. **npm install**: Run `npm install` to ensure all existing dependencies are installed.
2. **Puppeteer Check & Install**: Verify if puppeteer is in package.json/node_modules. Since it is not, install it using `npm install puppeteer --save-dev`.
3. **Start Dev Server**: Start the Vite dev server using `npm run dev` in background.
4. **Verify Server Port**: Read Vite output or verify that port 5173 is listening.
5. **Run test_browser.cjs**: Run `node test_browser.cjs` and verify there are no errors, and that it exits successfully.
6. **Generate Handoff Report**: Write a detailed report at `.agents\worker_setup\handoff.md` with port, commands, and results.
