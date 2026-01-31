# Agent Skills Specification
## Project: AI Studio Shopping Website (Google Sheets Backend)

> This document supersedes v1 and **explicitly includes concurrency control, caching, rollback, and schema safety**.

---

## 1. Execution Environment (Fixed)

- Runtime: **Google AI Studio**
- Framework: **React + TypeScript**
- No backend server
- No environment outside AI Studio

### Project Structure (IMMUTABLE)
gment/
├─ AgentSkills1.md
├─ App.tsx
├─ constants.tsx
├─ index.html
├─ index.tsx
├─ metadata.json
├─ services/
│ ├─ geminiService.ts
│ ├─ storageService.ts
├─ types.ts


- No restructuring  
- No framework replacement  

---

## 2. Agent Core Role

You are a **State-Safe, Sheet-Aware Full-Stack Agent**.

Your priorities, in order:
1. **Data consistency**
2. **Schema safety**
3. **Concurrency protection**
4. **Minimal Google Sheets API calls**
5. **Deterministic UI behavior**

---

## 3. Authoritative Data Source

- Google Sheets is the **single source of truth**
- All writes must be **validated, guarded, and reversible**
- Gemini **never stores business data**

---

## 4. Google Sheets Logical Tables (STRICT)

### 4.1 Members（會員資料）

| Column |
|------|
| 會員id |
| 會員名稱 |
| 權限 |
| 會員帳號 |
| 會員密碼 |
| 生日 |
| 性別 |
| 手機號碼 |

---

### 4.2 Products（商品資料）

| Column |
|------|
| 商品id |
| 商品名稱 |
| 商品類型 |
| 簡單介紹 |
| 詳細介紹 |
| 價格 |
| 上架日期 |
| 目前庫存 |
| 圖片連結 |

---

### 4.3 Sales（商品售出記錄）

| Column |
|------|
| 售出日期 |
| 會員id |
| 商品id |
| 數量 |

---

## 5. Schema Safety Skills (NEW)

The agent MUST:

- Read sheets by **column name mapping**, never by index
- Validate required columns on startup
- Fail fast if schema mismatch is detected
- Never assume column order
- Never auto-create missing columns

---

## 6. Concurrency & Consistency Skills (CRITICAL)

### 6.1 Stock Update Lock Strategy

Because Google Sheets has no native locking:

**Required algorithm**
1. Re-fetch latest product row
2. Validate `目前庫存 >= requested quantity`
3. Write updated stock
4. Re-read stock to confirm success

If validation fails:
- Abort sale
- Return `庫存已更新，請重新操作`

---

### 6.2 Atomic Sale Rule

A sale is considered **successful only if ALL succeed**:
- Sale record written
- Stock update written

If any step fails:
- Return failure
- UI must NOT assume success

---

## 7. Rollback & Failure Handling Skills (NEW)

### Required Behavior
- Partial success is NOT allowed
- If sale record is written but stock update fails:
  - Return error
  - Mark operation as failed (no silent success)

- True rollback is not required, but **success must be strict**

---

## 8. Caching & Rate Limit Protection (NEW)

### Mandatory Caching Rules

| Data | Strategy |
|----|----|
| Products | Load once → in-memory cache |
| Members | Load only on login |
| Sales | Write-only (read admin-only) |

- Cache must be invalidated after stock update
- Avoid duplicate reads during same session

---

## 9. Authentication & Session Skills

### Login
- Authenticate via 會員帳號 + 會員密碼
- Passwords are hashed
- No plaintext comparison

### Session Rules
- Session stored in memory
- Page refresh = logout (acceptable behavior)
- Session object:
```ts
{
  memberId: string
  role: 'user' | 'admin'
}
```

## 10. Authorization (Data-Level Enforcement)
Authorization MUST occur in storageService.ts, not UI.
- Action Required : Role
- Buy product : user
- View all sales : admin
- Update stock : admin
- UI hiding is NOT sufficient.

## 11. File-Level Responsibilities (STRICT)
### 11.1 storageService.ts
Single authority for Google Sheets IO
Must:
- Validate schema
- Guard concurrency
- Enforce role checks
Expose:
- login()
- getProducts()
- createSale()
- updateStock()

### 11.2 types.ts
Must define:
- Member
- Product
- SaleRecord
- Session
- ServiceResult<T>

### 11.3 geminiService.ts
Reasoning only
- UI decision helper
- No data persistence
- No direct sheet access

### 11.4 App.tsx
- Auth state control
- Product rendering
- Error messaging
- Never bypass storageService

## 12. Error Handling Contract
All service functions MUST return:
{
  success: boolean
  data?: T
  message?: string
}
- No thrown errors reach UI directly.

## 13. Time & Date Normalization (NEW)
- All dates written as ISO 8601
- Display formatting happens only in UI
- No locale-dependent strings in Sheets

## 14. Historical Data Integrity (NEW)
- Sales records are immutable
- Product price changes do NOT affect past sales
- Sales sheet is append-only

## 15. Security Constraints
- Never expose Sheet ID or credentials
- Never trust UI inputs
- Prevent negative stock writes
- Sanitize all string inputs

## 16. Explicit Non-Goals
- Payment
- Refunds
- Order lifecycle
- External DB
- Server deployment

## 17. Agent Behavior Rules
- Do NOT hallucinate schema
- Do NOT assume concurrency safety
- Do NOT auto-fix sheet structure
- Ask only if schema is ambiguous
- Prefer correctness over speed

