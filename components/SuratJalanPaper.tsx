/* eslint-disable @next/next/no-img-element */
import { longDateId } from "@/lib/domain";
import { PaperFit } from "./PaperFit";
import { Rich } from "./Rich";

export type SjRow = { sku: string; product: string; variant: string; quantity: number; uom: string; remarks: string };

export interface SuratJalanData {
  customer: string;
  sales_no: string;
  date: string;
  po_no: string;
  vendor_no: string;
  prepared_by: string;
  rows: SjRow[];
}

const lines = (s: string) => s.split(/\r?\n/).filter((l) => l.trim());

/** Template "Surat Jalan" Domma (A4 portrait). */
export function SuratJalanPaper({ d }: { d: SuratJalanData }) {
  const totalQty = d.rows.reduce((a, r) => a + r.quantity, 0);
  const uoms = [...new Set(d.rows.map((r) => r.uom))];

  return (
    <div className="inv-wrap sj-wrap">
      <PaperFit>
        <article className="inv sj">
          <header className="inv-head">
            <div>
              <img className="sj-logo" src="/brand/domma.png" alt="domma" width={180} height={38} />
              <div className="sj-from">
                <div>Email: hi@withdomma.com</div>
                <div>Instagram: @withdomma</div>
              </div>
            </div>
            <h2 className="sj-title">Surat Jalan</h2>
          </header>

          <section className="sj-info">
            <div className="inv-cust">
              <b>Customer Information:</b>
              {lines(d.customer).map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
            <div className="inv-meta">
              <b>Category</b>
              <span>:</span>
              <span>Offline Sales</span>
              <b>Sales No.</b>
              <span>:</span>
              <span>{d.sales_no}</span>
              <b>Date</b>
              <span>:</span>
              <span>{longDateId(d.date)}</span>
              <b>No. PO</b>
              <span>:</span>
              <span>{d.po_no}</span>
              <b>No. Vendor</b>
              <span>:</span>
              <span>{d.vendor_no}</span>
            </div>
          </section>

          <table className="inv-table sj-table">
            <colgroup>
              <col style={{ width: "5%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "34%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "21%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>No</th>
                <th>SKU</th>
                <th>Product</th>
                <th>Variant</th>
                <th>Qty</th>
                <th>UoM</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r, i) => (
                <tr key={i}>
                  <td className="c">{i + 1}</td>
                  <td className="c">{r.sku}</td>
                  <td className="c">{r.product}</td>
                  <td className="c">{r.variant}</td>
                  <td className="c">{r.quantity.toLocaleString("en-US")}</td>
                  <td className="c">{r.uom}</td>
                  <td className="c">{r.remarks}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="b">
                <td colSpan={4} className="sj-nob" />
                <td className="c sj-nob">{totalQty.toLocaleString("en-US")}</td>
                <td className="c sj-nob">{uoms.length === 1 ? uoms[0] : ""}</td>
                <td className="sj-nob" />
              </tr>
            </tfoot>
          </table>

          <section className="inv-block">
            <div>Prepared By :</div>
            <div>{d.prepared_by}</div>
          </section>

          <section className="inv-block">
            <b>Note:</b>
            <div>
              <Rich text="Complain <b>MAX 7 HARI KERJA</b> setelah barang diterima" />
            </div>
          </section>

          <section className="sj-sign">
            <div>
              <div>Penerima,</div>
              <div className="sj-sign-line">(.....................................)</div>
            </div>
            <div>
              <b>Pengirim,</b>
              <div className="sj-sign-name">{d.prepared_by}</div>
              <div>(.....................................)</div>
            </div>
          </section>
        </article>
      </PaperFit>
    </div>
  );
}
