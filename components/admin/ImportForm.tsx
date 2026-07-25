"use client";

import { useActionState } from "react";
import { importCsv } from "@/app/actions/admin";

type Result = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
} | null;

const SAMPLE = `title,price,compare_at_price,sku,brand,category,stock,condition,display,processor,ram,storage,description,image_url,active,featured
HP EliteBook 830 G7,415000,485000,HP-830-G7,HP,Laptops,3,USA Used,13.3-inch,Intel Core i5,16GB,256GB SSD,"Clean unit, backlit keyboard",,yes,yes
`;

export default function ImportForm() {
  const [result, formAction, pending] = useActionState<Result, FormData>(
    importCsv,
    null,
  );

  // Build the sample download in the browser — no extra route needed.
  const sampleHref = `data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE)}`;
  const total = (result?.created ?? 0) + (result?.updated ?? 0);

  return (
    <div className="a-card">
      <h2>Upload a CSV</h2>

      {result && total > 0 && (
        <div className="a-alert good">
          Imported {total} product{total === 1 ? "" : "s"} — {result.created}{" "}
          created, {result.updated} updated
          {result.skipped > 0 && `, ${result.skipped} skipped`}.
        </div>
      )}
      {result && total === 0 && (
        <div className="a-alert bad">Nothing was imported.</div>
      )}
      {result && result.errors.length > 0 && (
        <div className="a-alert bad">
          <strong>Problems found:</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {result.errors.slice(0, 20).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
          {result.errors.length > 20 && (
            <p style={{ margin: "8px 0 0" }}>
              …and {result.errors.length - 20} more.
            </p>
          )}
        </div>
      )}

      <form action={formAction}>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="file">CSV file</label>
          <input id="file" name="file" type="file" accept=".csv,text/csv" required />
        </div>
        <button className="a-btn" type="submit" disabled={pending}>
          {pending ? "Importing…" : "Import products"}
        </button>
      </form>

      <div className="a-alert info" style={{ marginTop: 18 }}>
        Rows are matched by <code>sku</code> first, then <code>title</code>.
        Re-uploading the same file <strong>updates</strong> existing products
        rather than creating duplicates — so you can keep one master spreadsheet
        and re-import whenever prices change.
      </div>

      <a
        className="a-btn ghost sm"
        href={sampleHref}
        download="sample-products.csv"
      >
        Download sample CSV
      </a>
    </div>
  );
}
