import { requireAdmin } from "@/lib/auth";
import ImportForm from "@/components/admin/ImportForm";

export const dynamic = "force-dynamic";

const COLUMNS: [string, string][] = [
  ["title", "Required"],
  ["price", "Required. Plain number: 415000"],
  ["compare_at_price", "Higher than price → Sale badge"],
  ["sku", "Used to match rows on re-import"],
  ["brand", "HP, Dell, Apple…"],
  ["category", "Created automatically if new"],
  ["stock", "Whole number"],
  ["condition", "USA Used, Brand New…"],
  ["display", "13.3-inch"],
  ["processor", "Intel Core i5"],
  ["ram", "16GB"],
  ["storage", "256GB SSD"],
  ["description", "Quote it if it contains commas"],
  ["image_url", "Linked as-is, not copied to your bucket"],
  ["active", "yes / no (default yes)"],
  ["featured", "yes / no (default no)"],
];

export default async function ImportPage() {
  await requireAdmin();

  return (
    <>
      <div className="admin-topbar">
        <h1>Bulk import</h1>
      </div>

      <div className="a-grid a-grid-2" style={{ alignItems: "start" }}>
        <ImportForm />

        <div className="a-card">
          <h2>Column reference</h2>
          <p className="a-muted" style={{ fontSize: 13, marginTop: -6 }}>
            Column order doesn&apos;t matter and extra columns are ignored. Only{" "}
            <code>title</code> and <code>price</code> are required.
          </p>
          <table>
            <thead>
              <tr>
                <th>Column</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {COLUMNS.map(([name, note]) => (
                <tr key={name}>
                  <td>
                    <code>{name}</code>
                  </td>
                  <td>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
