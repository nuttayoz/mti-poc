# Product Vision: The Smart Document Gateway

## 1. Concept Overview
**Name:** Smart Document Gateway (SDG)
**Tagline:** "From Inbox to Archive: Intelligence in the Middle."

The **Smart Document Gateway** is a headless automation service designed to bridge the gap between communication (Gmail) and structured storage (Google Drive). It acts as an "Invisible Clerk" that monitors incoming traffic, applies external logic to attachments, and organizes the final output without any manual human intervention.

---

## 2. The "Why" (Value Proposition)
- **Zero-Touch Processing:** Eliminates the manual "Download -> Open -> Convert -> Rename -> Upload" workflow.
- **Intelligent Transformation:** Unlike simple file movers, this app uses an API "Brain" to transform raw attachments into professional, standardized PDF assets.
- **Unified Archive:** Creates a single source of truth in Google Drive for all documents received via disparate email threads.

---

## 3. How the "App" Functions (The Idea)

### A. The Interceptor (Input)
The service watches your Gmail. It doesn't look at every email; it specifically targets "Work-in-Progress" files—raw photos, Word docs, CSVs, or unformatted text—based on specific labels or senders.

### B. The Brain (Transformation)
This is where your NestJS service shines. It intercepts the file and sends it to a specialized API. 
* *Example:* A photo of a receipt is sent to an OCR API.
* *Example:* A raw data file is sent to a report-generation API.
* *Example:* A contract is sent to a PDF-securing API.

### C. The Librarian (Output)
Once the API returns a polished PDF, the service:
1.  Renames the file according to a standard convention (e.g., `YYYY-MM-DD_Invoice_Vendor.pdf`).
2.  Saves it to a specific Google Drive folder.
3.  Archives the original email so your inbox stays clean.

---

## 4. Business Use Cases
| Persona | Raw Input (Email) | The "Magic" (API) | Final Asset (Drive) |
| :--- | :--- | :--- | :--- |
| **Accountant** | Photo of a bill | OCR & Tax Extraction | Standardized Expense PDF |
| **Lawyer** | Draft Contract (.docx) | Watermarking & Formatting | Finalized Legal PDF |
| **Sales Lead** | Customer Inquiry | AI Summarization | Lead Briefing PDF |
| **Researcher** | Data Spreadsheet | Chart & Graph Generation | Visual Report PDF |

---

## 5. Future Growth (Multi-Channel Vision)
Because this app is built as a standalone service (NestJS), it is designed to grow:
- **Phase 2:** Connect to Microsoft Outlook and OneDrive.
- **Phase 3:** Connect to Slack or WhatsApp as input sources.
- **Phase 4:** Add a Dashboard to monitor how many documents are processed daily.

---

## 6. Summary of Architecture
1. **Source:** Gmail API (Intercepting)
2. **Controller:** NestJS (Routing)
3. **Logic:** External Service API (Transforming)
4. **Destination:** Google Drive API (Archiving)
