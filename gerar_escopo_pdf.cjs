const markdownpdf = require("markdown-pdf");
const fs = require("fs");
const path = require("path");

const mdFile = path.join(__dirname, "ESCOPO_SISTEMA.md");
const outputDir = path.join(__dirname, "..");
const pdfFile = path.join(outputDir, "ESCOPO_SISTEMA.pdf");

markdownpdf().from(mdFile).to(pdfFile, function () {
  console.log(`✅ PDF gerado com sucesso: ${pdfFile}`);
});
