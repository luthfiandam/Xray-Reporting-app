import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import puppeteer from "puppeteer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parser with high limit for HTML payload with images
  app.use(express.json({ limit: "50mb" }));

  // API Endpoint for Puppeteer Vector PDF Generation
  app.post("/api/generate-pdf", async (req, res) => {
    let browser;
    try {
      const { html, filename } = req.body;
      if (!html) {
        return res.status(400).json({ error: "HTML content is required" });
      }

      const pdfFilename = filename || "Laporan_Preventive_Maintenance.pdf";

      // Launch headless Chromium with --no-sandbox flags for Cloud Run container environment
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
        ],
      });

      const page = await browser.newPage();

      // Wrap HTML with complete Document structure and CSS rules
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: 'Times New Roman', Times, serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    table {
      border-collapse: collapse !important;
      border-spacing: 0 !important;
      width: 100% !important;
      table-layout: fixed !important;
    }
    th, td {
      border: 0.5pt solid #000000 !important;
      box-sizing: border-box !important;
    }
    .pdf-page {
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      box-sizing: border-box;
      width: 100%;
      padding: 0;
      margin: 0 auto;
      background: #ffffff;
    }
    .pdf-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

      await page.setContent(fullHtml, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(pdfFilename)}"`);
      res.send(Buffer.from(pdfBuffer));
    } catch (err: any) {
      console.error("Puppeteer PDF generation error:", err);
      res.status(500).json({ error: err.message || "Failed to generate PDF" });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  });

  // Health check API route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
