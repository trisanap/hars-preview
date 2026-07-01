# BPJPH Halal Certificate Verifier

You have access to a **bash** tool that can run commands and Python scripts. Use this when the user asks to verify halal certificates or fill in the "Temuan" column of a `Daftar_Bahan` spreadsheet.

---

## 1. How to Verify

1. The user uploads a **PDF** (e.g., `Daftar_Bahan.pdf`) and an **Excel template** (`Template_Daftar_Bahan.xlsx`) to the project
2. Read both files using `pdfplumber` and `openpyxl` (or parse artifact content)
3. Extract cert IDs from the PDF — look for values starting with `ID` followed by digits (e.g., `ID00410019459060724`)
4. Write and execute a **single Python script** via bash that:
   - Calls the BPJPH API for each **unique** cert ID
   - Compares PDF data vs API data
   - Outputs a clear comparison
   - Fills the **Temuan** column in the Excel file

---

## 2. API Endpoint

```
GET https://prod-api-si.halal.go.id/api/v2/dashboard/halal-certificate-list?no_sertifikat={ID}
```

### Response Format

```json
{
  "data": [
    {
      "no_sertifikat": "ID00410019459060724",
      "tanggal_terbit": "2025-11-19",
      "produsen": "PT. SUMATRACO LANGGENG MAKMUR"
    }
  ]
}
```

### SSL Notes

In sandboxed environments, you may need:
```python
requests.get(url, verify=False)
```

---

## 3. Date Format Conversion

| Source | Format | Example |
|--------|--------|---------|
| BPJPH API | `YYYY-MM-DD` | `2025-11-19` |
| Target (Temuan) | `day Month year` in Indonesian | `19 November 2025` |

Map months:
```python
months = {
    "01": "January", "02": "February", "03": "March",
    "04": "April", "05": "May", "06": "June",
    "07": "July", "08": "August", "09": "September",
    "10": "October", "11": "November", "12": "December"
}
```

Strip leading zeros from day: `08 December 2022` not `8 December 2022` — use zero-padded day (e.g., `%d` in strftime gives `08`).

---

## 4. Temuan Column Output Format

Every item with a halal cert must have this in the **Temuan** column:

```
SH BPJPH {ID}, terbit tanggal {day Month year}, dari Produsen {produsen}
```

### Example

```
SH BPJPH ID00410019459060724, terbit tanggal 19 November 2025, dari Produsen PT. SUMATRACO LANGGENG MAKMUR
```

---

## 5. Handling Duplicate Cert IDs

Multiple products may share the same cert ID. **Only call the API once per unique ID**, then apply the result to all matching rows.

Example from this project:
- **AJINOMOTO Plus** (row 6) → `ID00410000088320221`
- **SAORI Saus Tiram** (row 42) → `ID00410000088320221`

Same cert → call API once → fill both rows.

---

## 6. Items Without Certificates

| Diragukan column | Cert ID in PDF? | Action |
|---|---|---|
| `-` (dash) | ✅ Yes | Call API & fill Temuan |
| `Ya` (Yes) | ❌ No | skip, leave Temuan blank |

Items with `Ya` are raw/unprocessed ingredients (Bawang Bombay, Telur, Wortel, etc.) — they don't have halal certificates, so leave Temuan empty.

---

## 7. Python Script Template

```python
import requests
import json
import time
from datetime import datetime

months = {
    "01": "January", "02": "February", "03": "March",
    "04": "April", "05": "May", "06": "June",
    "07": "July", "08": "August", "09": "September",
    "10": "October", "11": "November", "12": "December"
}

def fetch_cert_data(cert_id):
    """
    Fetch certificate data from BPJPH API.
    Returns dict with tanggal_terbit and produsen.
    """
    url = f"https://prod-api-si.halal.go.id/api/v2/dashboard/halal-certificate-list?no_sertifikat={cert_id}"
    try:
        resp = requests.get(url, verify=False, timeout=15)
        data = resp.json()
        if data.get("data") and len(data["data"]) > 0:
            return data["data"][0]
        return None
    except Exception as e:
        return None

def format_tanggal(tanggal_str):
    """Convert YYYY-MM-DD to 'day Month year' format."""
    parts = tanggal_str.split("-")
    year = parts[0]
    month = months[parts[1]]
    day = parts[2]
    return f"{day} {month} {year}"

def format_temuan(cert_id, tanggal_terbit, produsen):
    """Format the Temuan column string."""
    formatted_date = format_tanggal(tanggal_terbit)
    return f"SH BPJPH {cert_id}, terbit tanggal {formatted_date}, dari Produsen {produsen}"

# === Usage ===
# 1. Extract unique cert IDs from PDF/Excel
# 2. For each unique ID, call fetch_cert_data()
# 3. Apply result to all matching rows
# 4. Fill Temuan column using format_temuan()
# 5. Always add 0.3s delay between API calls
```

---

## 8. Reporting Results

| Situation | Say |
|-----------|-----|
| All match | "All [N] certificates verified" |
| Mismatch | "Row X: [item] — PDF says [A], BPJPH says [B]" |
| Not found | "Row X: [item] — cert [ID] not found in BPJPH" |
| Invalid date | "Row X: [item] — date unverifiable" |

---

## 9. Complete Workflow

```
1. Read PDF → extract all rows (name, brand, diragukan, cert IDs)
2. Read Excel template → get columns structure
3. Collect unique BPJPH cert IDs (those starting with "ID")
4. Skip certs starting with "SG" (Singapore/MUIS) — not in BPJPH
5. Call BPJPH API for each unique ID (0.3s delay between calls)
6. For each row:
   - If Diragukan = "Ya" → leave Temuan blank
   - If Diragukan = "-" and has cert ID → fill Temuan with API data
7. Write filled data back to Excel
```

---

## 10. Common Pitfalls

- **SSL errors**: Use `verify=False`
- **Timeouts**: Set `timeout=15` or higher
- **Rate limiting**: Always add 0.3s+ delay between calls
- **Duplicate IDs**: Deduplicate before calling API
- **Date parsing**: Strip leading zeros from day numbers
- **Unknown months**: Ensure all 12 Indonesian month names are mapped
- **PDF vs Excel**: Always cross-reference both sources