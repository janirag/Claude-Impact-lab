#!/usr/bin/env bash
# Renders the demo documents in src/ to PDF + PNG (and emails to PNG + TXT) with headless Chrome.
# Usage: demo-assets/build.sh
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
mkdir -p pdf png txt

chrome() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-pdf-header-footer --allow-file-access-from-files "$@" 2>/dev/null; }

# A4 documents: PDF (all pages) + PNG of page 1 at 2x (1588 x 2246 px).
for name in carta-ibi carta-banc factura-llum contracte-lloguer contracte-lloguer-sense-dades contracte-lloguer-sense-signar contracte-lloguer-vencut deures-fraccions; do
  url="file://$PWD/src/$name.html"
  chrome --print-to-pdf="pdf/$name.pdf" "$url"
  chrome --window-size=794,1123 --force-device-scale-factor=2 --screenshot="png/$name.png" "$url"
  echo "built $name"
done

# Emails: phone-width screenshot + plain text to paste into the chat.
for spec in email-client:730 email-phishing:720 email-escola:870; do
  name="${spec%%:*}"; h="${spec##*:}"
  chrome --window-size=430,"$h" --force-device-scale-factor=2 --screenshot="png/$name.png" "file://$PWD/src/$name.html"
  textutil -convert txt -stdout "src/$name.html" | sed '/^[[:space:]]*$/N;/^\n$/D' > "txt/$name.txt"
  echo "built $name"
done

# "Phone photo" of the tax letter: the page slightly tilted on a table, like a real snapshot.
chrome --window-size=900,1200 --force-device-scale-factor=1.5 --screenshot="png/carta-ibi-foto.png" "file://$PWD/src/foto.html"
echo "built carta-ibi-foto"
