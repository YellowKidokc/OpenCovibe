const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.TOM_CHROMIUM,
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(process.env.TOM_APP_URL || "http://127.0.0.1:5173/");
    await page.getByText("● Connected", { exact: true }).waitFor();
    const suffix = Date.now();
    const folderName = "Browser research " + suffix;
    const noteName = "Browser note " + suffix;
    const nestedName = "Nested evidence " + suffix;
    const docName = "Evidence-" + suffix + ".md";
    await page.getByPlaceholder("Folder name").fill(folderName);
    await page.getByRole("button", { name: "Create folder", exact: true }).click();
    await page.getByRole("button", { name: new RegExp(folderName) }).waitFor();
    await page.getByPlaceholder("Folder name").fill(nestedName);
    await page.getByRole("button", { name: "Create folder", exact: true }).click();
    await page.getByRole("button", { name: new RegExp(nestedName) }).waitFor();
    await page.getByPlaceholder("Message selected AIs").fill("Browser shared thread smoke");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await page
      .getByText("Echo received 1 shared messages. Latest: Browser shared thread smoke", {
        exact: true,
      })
      .waitFor();
    await page.reload();
    await page.getByText("● Connected", { exact: true }).waitFor();
    await page
      .getByText("Echo received 1 shared messages. Latest: Browser shared thread smoke", {
        exact: true,
      })
      .waitFor();
    await page.getByRole("button", { name: "Vectorization & RAG Engine", exact: true }).click();
    await page.getByLabel("Document name", { exact: true }).fill(docName);
    await page
      .getByLabel("Document text", { exact: true })
      .fill(
        "The calibration value is forty two. This passage belongs to our nested research folder.",
      );
    await page.getByRole("button", { name: "Import document", exact: true }).click();
    await page.getByText("Saved 1 passages (keyword search).", { exact: true }).waitFor();
    await page.getByLabel("Search document passages").fill("calibration");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.getByText(docName + " · passage 1", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Add passage to message", exact: true }).click();
    assert.ok(
      (await page.getByPlaceholder("Message selected AIs").inputValue()).includes(
        "[Source: " + docName + ", passage 1]",
      ),
    );
    await page.getByRole("button", { name: "Markdown Notepad", exact: true }).click();
    await page.getByRole("button", { name: "New note", exact: true }).click();
    await page.getByLabel("Title", { exact: true }).fill(noteName);
    await page
      .getByLabel("Note", { exact: true })
      .fill("A persistent note from browser validation.");
    await page.getByRole("button", { name: "Save note", exact: true }).click();
    await page.getByText("Saved.", { exact: true }).waitFor();
    await page.reload();
    await page.getByText("● Connected", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Markdown Notepad", exact: true }).click();
    await page.getByRole("button", { name: noteName, exact: true }).click();
    assert.equal(
      await page.getByLabel("Note", { exact: true }).inputValue(),
      "A persistent note from browser validation.",
    );
    assert.deepEqual(errors, []);
    if (process.env.TOM_SCREENSHOT)
      await page.screenshot({ path: process.env.TOM_SCREENSHOT, fullPage: true });
    console.log(
      "PASS browser: nested folders, shared echo thread, reload persistence, document import/search/citation, saved notes; no page errors",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
