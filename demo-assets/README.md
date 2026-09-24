# Demo assets

Fictional documents for demoing the situations in `web/src/lib/catalog.ts`. Every person, organisation, address, ID and account number is invented (`ES00 0000…`, `DNI 00000000-T`, `.example` domains). Each file carries a "DOCUMENT FICTICI" footer.

Upload the files from `png/` or `pdf/` with the prototype's attach button (images and PDFs, max 5 MB). Paste the emails from `txt/`.

| File | Situation | Language | What Claude should find |
|---|---|---|---|
| `png/carta-ibi-foto.png` · `pdf/carta-ibi.pdf` | A letter I don't understand (**hero demo, Carmen**) | Catalan | Property tax (IBI) of **486,32 €**, pay **1 Oct – 20 Nov 2026** (direct debit on 5 Nov); surcharges of 5/10/20 % if late; optional discount request by 31 Dec. Money topic, so it's a chance for the "Check before trusting" card. |
| `pdf/carta-banc.pdf` | A letter I don't understand | Spanish | The bank starts charging **6 €/month** from 1 Nov 2026, plus a 36 €/year card fee. It's waived with a salary/pension over 600 € or 3 direct debits. Free cancellation before 1 Nov. |
| `png/factura-llum.png` · `pdf/factura-llum.pdf` | Check a bill | Catalan | Total **187,22 €**. Planted problems: **meter rental charged twice**; a **new "Protecció Llar Plus" service charged twice** (9,90 + 4,95); consumption **612 kWh, double** the usual ~300. |
| `pdf/contracte-lloguer.pdf` (2 pages) | A rental contract | Catalan | Rent 1.150 €/month, 1-year term. Unusual or likely abusive clauses to flag: **3 months' deposit**, **agency fees paid by the tenant**, **tenant pays IBI**, **tenant pays all repairs**, **all remaining rent as the early-exit penalty**, **landlord enters at any time without notice**. Should suggest the Oficina d'Habitatge. |
| `png/deures-fraccions.png` | Help with homework | Catalan | 5th-grade fractions sheet, partly filled in by the child with **two mistakes**: exercise 3's order (2/3 < 3/4) and 1/4 + 2/4 = 3/8 (should be 3/4). Claude should explain rather than just give the answers. |
| `png/email-client.png` · `txt/email-client.txt` | Lab "write to clients" / free chat | Catalan | A company asks a restaurant for a quote: 34 people, Fri 11 Dec, 21 h, 3 vegetarian + 1 gluten-free, ~45 €/person, answer before Friday. Good for "draft a reply in vostè". |
| `png/email-phishing.png` · `txt/email-phishing.txt` | Free chat ("is this real?") | Catalan | A scam: urgent 1,99 € customs fee, odd `.example.top` sender, asks for card number + CVV + SMS code. Chance for the "Don't share secrets" card. |
| `png/email-escola.png` · `txt/email-escola.txt` | Free chat / translate | Catalan | School trip 21–23 Oct, **168 €** (15 € off for AFA members); signed form by **2 Oct**, payment by **9 Oct**, meeting 1 Oct 17.30 h. Good for "make me a checklist" or "translate into Spanish/English". |

## Editing

The sources are the HTML files in `src/`. After changing one, rebuild everything (this needs Google Chrome; set `CHROME=/path/to/chrome` to use another binary):

```sh
demo-assets/build.sh
```
