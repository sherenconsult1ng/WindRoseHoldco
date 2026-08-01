/*
 * Compiles the markdown content files that Decap CMS commits into
 * /content/news/*.md and /content/products/*.md down into single JSON
 * files (news.json, products.json) at the repo root.
 *
 * Why: news.html/product pages are plain static HTML with no build step
 * of their own, and GitHub Pages doesn't offer directory listings, so the
 * browser can't discover "how many news files exist" on its own. Rather
 * than have every visitor's browser call the GitHub API (rate-limited,
 * slower) to list and fetch each file, this script runs once per publish
 * (via the GitHub Action in .github/workflows/build-content.yml) and
 * produces a single JSON file the site just fetches normally.
 *
 * Run locally with: node scripts/build-content.js
 */
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const ROOT = path.join(__dirname, "..");

function readCollection(folder) {
  const dir = path.join(ROOT, "content", folder);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((filename) => {
      const raw = fs.readFileSync(path.join(dir, filename), "utf8");
      const { data, content } = matter(raw);
      const slug = filename.replace(/\.md$/, "");
      return { slug, ...data, body: content.trim() };
    });
}

function buildNews() {
  const items = readCollection("news")
    .map((n) => ({
      id: n.slug,
      title: n.title || "",
      date: n.date
        ? new Date(n.date).toISOString().slice(0, 10)
        : "",
      body: n.body || "",
      caption: n.caption || null,
      // Decap's file widget stores the value as the public path, e.g. "/uploads/foo.pdf"
      fileUrl: n.file || null,
      fileName: n.file ? decodeURIComponent(path.basename(n.file)) : null
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  fs.writeFileSync(
    path.join(ROOT, "news.json"),
    JSON.stringify(items, null, 2) + "\n"
  );
  console.log(`Wrote news.json with ${items.length} item(s).`);
}

function buildProducts() {
  const items = readCollection("products").map((p) => ({
    id: p.slug,
    title: p.title || "",
    description: p.body || p.description || "",
    fileUrl: p.file || null,
    fileName: p.file ? decodeURIComponent(path.basename(p.file)) : null
  }));

  fs.writeFileSync(
    path.join(ROOT, "products.json"),
    JSON.stringify(items, null, 2) + "\n"
  );
  console.log(`Wrote products.json with ${items.length} item(s).`);
}

buildNews();
buildProducts();
