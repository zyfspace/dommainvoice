/* eslint-disable @next/next/no-img-element */
import { CITY, ENTITIES } from "@/lib/company";
import { CUSTOMIZATION_LABEL, STATUS_LABEL, ddmmyyyy, longDateEn, rpDoc } from "@/lib/domain";
import type { InvoiceFull } from "@/lib/types";
import { PaperFit } from "./PaperFit";
import { Rich } from "./Rich";

function PaymentLine({ line }: { line: string }) {
  if (/^https?:\/\//.test(line.trim()))
    return (
      <a href={line.trim()} target="_blank" rel="noreferrer">
        {line.trim()}
      </a>
    );
  const [a, ...rest] = line.split("\t");
  return rest.length ? (
    <>
      <span className="tab">{a}</span>
      {rest.join(" ")}
    </>
  ) : (
    <>{line}</>
  );
}

const lines = (s: string | null | undefined) => (s ?? "").split(/\r?\n/).filter((l) => l.trim());

/**
 * Template invoice Domma — mengikuti "Inv PT" & "Invoice Domma (TMB)".
 * Dipakai untuk pratinjau, halaman cetak, dan sumber HTML → PDF (Gotenberg).
 */
export function InvoicePaper({ inv }: { inv: InvoiceFull }) {
  const e = ENTITIES[inv.entity ?? "dts"];
  const final = inv.status === "approved" || inv.status === "issued" || inv.status === "paid";
  const payable = inv.payable_percent ? Math.round((inv.total * inv.payable_percent) / 100) : null;
  const remarks = lines(inv.notes);
  const payment = lines(inv.payment_info ?? e.payment);

  return (
    <div className="inv-wrap">
      <PaperFit>
      <article className="inv">
        <header className="inv-head">
          <div>
            <img
              className="inv-logo"
              src={e.logo.src}
              alt={e.name}
              width={e.logo.width}
              height={e.logo.height}
            />
            <div className="inv-from">
              <b>{e.name}</b>
              {e.address.map((l) => (
                <div key={l}>{l}</div>
              ))}
              <div>Email: {e.email}</div>
            </div>
          </div>
          <div className="inv-title">
            <h2>INVOICE</h2>
            {!final && <span className="inv-stamp">{STATUS_LABEL[inv.status]}</span>}
          </div>
        </header>

        <section className="inv-info">
          <div className="inv-cust">
            <b>Customer Information:</b>
            <div>{inv.company_name}</div>
            {inv.pic_name && <div>Attn. {inv.pic_name}</div>}
            {lines(inv.billing_address).map((l, i) => (
              <div key={i}>{l}</div>
            ))}
            {inv.npwp && <div>NPWP: {inv.npwp}</div>}
          </div>
          <div className="inv-meta">
            <b>No.</b>
            <span>:</span>
            <span>{inv.invoice_number ?? "—"}</span>
            <b>
              Tanggal/<i>Date</i>
            </b>
            <span>:</span>
            <span>{ddmmyyyy(inv.invoice_date)}</span>
            <b>
              Tanggal Jatuh Tempo/<i>Due Date</i>
            </b>
            <span>:</span>
            <span>{ddmmyyyy(inv.due_date)}</span>
          </div>
        </section>
        {inv.phone && <p className="inv-phone">T : {inv.phone}</p>}

        <table className="inv-table">
          <colgroup>
            <col style={{ width: "6%" }} />
            <col style={{ width: "12.5%" }} />
            <col style={{ width: "36.5%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "16%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>No.</th>
              <th>SKU</th>
              <th>Product</th>
              <th>Qty</th>
              <th>UoM</th>
              <th>Price</th>
              <th>Total Price</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it) => (
              <tr key={it.id}>
                <td className="c">{it.position}</td>
                <td className="c">{it.sku}</td>
                <td>
                  {it.product}
                  {it.customization !== "plain" && <span className="inv-cz"> · {CUSTOMIZATION_LABEL[it.customization]}</span>}
                  {it.notes && <small>{it.notes}</small>}
                </td>
                <td className="c">{it.quantity.toLocaleString("en-US")}</td>
                <td className="c">{it.uom ?? "Pcs"}</td>
                <td className="c">{rpDoc(it.unit_price)}</td>
                <td className="c">{rpDoc(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {inv.tax_rate > 0 ? (
              <>
                <tr>
                  <td colSpan={6}>Total</td>
                  <td>{rpDoc(inv.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={6}>PPN {inv.tax_rate}%</td>
                  <td>{rpDoc(inv.tax_amount)}</td>
                </tr>
                <tr className="b">
                  <td colSpan={6}>SUBTOTAL</td>
                  <td>{rpDoc(inv.total)}</td>
                </tr>
              </>
            ) : (
              <tr className="b">
                <td colSpan={6}>TOTAL</td>
                <td>{rpDoc(inv.total)}</td>
              </tr>
            )}
            {payable != null && (
              <tr className="b hl">
                <td colSpan={6}>{inv.payable_label}</td>
                <td>{rpDoc(payable)}</td>
              </tr>
            )}
          </tfoot>
        </table>

        {remarks.length > 0 && (
          <section className="inv-block">
            <b>Remarks:</b>
            {remarks.map((l, i) => (
              <div key={i}>
                <Rich text={l} />
              </div>
            ))}
          </section>
        )}

        {inv.term_of_payment && (
          <section className="inv-block">
            <b>Term of payment:</b>
            {lines(inv.term_of_payment).map((l, i) => (
              <div key={i}>
                <Rich text={l} />
              </div>
            ))}
          </section>
        )}

        <section className="inv-block inv-pay">
          <div>
            <b>Pembayaran:</b>
            {payment.map((l, i) => (
              <div key={i}>
                <PaymentLine line={l} />
              </div>
            ))}
          </div>
          {e.signature && (
            <div className="inv-sign">
              <div>
                {CITY}, {longDateEn(inv.invoice_date)}
              </div>
              <div className="inv-sign-name">{e.name}</div>
            </div>
          )}
        </section>
      </article>
      </PaperFit>
    </div>
  );
}
