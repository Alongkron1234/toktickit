# AI Use Log and Reflection

ในการทำ Lab 2 นี้ ผมใช้ **Google Antigravity IDE** ในการช่วยเป็น Pair Programming Partner ร่วมกับโมเดล **Gemini 3.6 Flash** (Thinking Level: High) เพื่อวิเคราะห์โจทย์ พัฒนาฟีเจอร์ตามสเปก ตรวจสอบความถูกต้องของ UI/UX และเขียนชุดทดสอบแบบอัตโนมัติ (Automated Tests) ทั้งหมด

---

## 📋 Selected Key Prompts by Issue

| Issue / Feature | Prompt Name | Actual Prompt Text Summary | My Reflection |
| :--- | :--- | :--- | :--- |
| **Issue 1** | Requirement Analysis & Engineering Spec Drafting | *"ช่วยวิเคราะห์โจทย์แล็ป 2 และวางแผนจัดทำเอกสาร specification.md, ui-spec.md, api-spec.md, tests.md ตามหลัก Spec-Driven Development"* | ได้เอกสารข้อตกลงทางวิศวกรรมที่ชัดเจนก่อนเริ่มเขียนโค้ด ทำให้ทุกทีมมีความเข้าใจตรงกันเกี่ยวกับ Acceptance Criteria และ Business Rules |
| **Issue 2** | Database Schema & Idempotent Seed Implementation | *"ช่วยอัปเดต schema.prisma สำหรับโมเดล DevelopmentRequester, Category, RelatedSystem, Ticket, Attachment พร้อมทำ idempotent seed.ts ที่รันซ้ำได้ปลอดภัยไม่เบิ้ลข้อมูล"* | AI ช่วยออกแบบ Data Model ตามหลัก Relational Database และเขียนสคริปต์ seed ข้อมูลตัวอย่างที่รันซ้ำได้อย่างปลอดภัย |
| **Issue 3** | Development Requester Context & Selection Screen | *"ช่วยสร้าง GET /api/requesters, requireRequesterHeader middleware, RequesterContext (localStorage) และหน้า RequesterSelectionScreen ตามธีม Zen Green พร้อม Unselected Guard"* | ช่วยสร้างระบบสลับตัวตนผู้ใช้ชั่วคราวเพื่อใช้ทดสอบ Multi-user Isolation ก่อนที่จะย้ายไปใช้ Real Authentication ใน Lab 3 |
| **Issue 4** | Ticket Creation REST API & Ticket Number Generation | *"ช่วยพัฒนา GET /api/related-systems และ POST /api/tickets พร้อมระบบ Validation (Summary 5-150 / Description 10-2000), ฟังก์ชันเจนเลขตั๋วอัตโนมัติ TKT-YYYY-XXXXXX และเขียน API Tests"* | AI ช่วยสร้างตรรกะเจนเลขตั๋วอัตโนมัติที่ซ้ำกันไม่ได้ พร้อมทั้งตรวจสอบความถูกต้องของข้อมูลตาม Business Rules ก่อนบันทึกลง Database |
| **Issue 5** | Create Ticket Form & Real-Time Inline Validation | *"ช่วยสร้าง CreateTicketScreen.tsx โหลดตัวเลือกจาก API อัตโนมัติ, มีระบบ Client-side Inline Validation, ปุ่ม Submitting... Busy state และจัดการ Data Retention เมื่อเกิดข้อผิดพลาด"* | ช่วยให้ผู้ใช้ได้รับประสบการณ์ใช้งานที่ราบรื่น ไม่เสียข้อมูลที่กรอกค้างไว้หากเกิดข้อผิดพลาด และแสดงป้ายสีแจ้งเตือนอย่างชัดเจน |
| **Issue 6** | My Tickets REST API (Search, Filter, Sort & Pagination) | *"ช่วยพัฒนา GET /api/tickets ที่รองรับการค้นหาตาม Ticket Number/Summaryแบบ Case-Insensitive, กรองตาม Category/Priority/Status, เรียงลำดับ และทำ Pagination (default 10 items/page)"* | ได้ REST API ฝั่ง Server ที่ค้นหาและกรองข้อมูลได้อย่างรวดเร็ว ถูกต้องตามขอบเขตสิทธิ์ของผู้ใช้แต่ละคน (`X-Dev-Requester-Id`) |
| **Issue 7** | Responsive My Tickets UI & Mobile Card View | *"ช่วยปรับ UI หน้า My Tickets ในตารางตรง In Progress ไม่ให้ข้อความตกบรรทัด และทำหน้าจอ Mobile ให้แสดงเป็นบล็อกการ์ด (Mobile Cards) แทนตารางแนวยาว"* | AI ช่วยสร้าง Responsive Design ที่ปรับตามขนาดหน้าจอ (Desktop เป็น Table, Mobile เป็น Cards) เพิ่มความสะดวกในการใช้งานบนอุปกรณ์เคลื่อนที่ |
| **Issue 8** | Read-Only Ticket Detail & Ownership Isolation | *"ช่วยพัฒนา GET /api/tickets/:id และ TicketDetailScreen.tsx แสดงรายละเอียดตั๋วแบบ Read-only และบล็อกไม่ให้ผู้ใช้คนอื่นเข้าถึงตั๋วที่ไม่ใช่ของตัวเอง (403 Forbidden)"* | ช่วยสร้างความปลอดภัยของข้อมูล (Data Isolation) ป้องกันไม่ให้ผู้ใช้ส่องดูหรือแก้ไขข้อมูลตั๋วของผู้อื่นโดยไม่ได้รับอนุญาต |
| **Issue 9** | Attachment Lifecycle & Soft Removal Protocol | *"ช่วยปรับ UI หน้านี้ให้มีกล่อง drop ไฟล์ attachments ตามแบบภาพ mockup และพัฒนาระบบ Soft Removal (`isRemoved = true`) บันทึกเหตุผลการลบ และปิดการดาวน์โหลด"* | ได้ส่วนแนบไฟล์ที่รองรับการลากวาง (Drag-and-Drop) พร้อมระบบ Soft Delete ที่ยังคงเก็บ Audit Log ไร้การลบแถวออกจากฐานข้อมูลจริง |
| **Issue 10** | Playwright E2E Testing & Multi-Viewport Screenshots | *"ช่วยสร้างชุดทดสอบ E2E ด้วย Playwright ใน requester-ticket-flow.spec.ts รันครอบคลุมทุก User Flow และแคปรูปหลักฐานครบ 3 ขนาดหน้าจอ (Desktop, Tablet, Mobile)"* | ได้ภาพถ่ายหลักฐานการทำงานแบบอัตโนมัติครบถ้วนทุกมุมมองหน้าจอ และมั่นใจได้ว่าโค้ดทั้งหมดทำงานร่วมกันได้อย่างสมบูรณ์แบบ |

---

## 🧠 AI Reflection & Technical Learnings

### 1. การทำงานร่วมกับ AI ในรูปแบบ Pair Programming
การใช้ AI (Google Antigravity / Gemini) ช่วยยกระดับความเร็วในการพัฒนาโปรเจกต์ได้อย่างมหาศาล โดยเฉพาะงานที่ต้องทำซ้ำๆ หรือการวางโครงสร้าง (Boilerplate) เช่น การสร้าง REST API endpoints, การเขียน Data Validation schema, การกำหนด CSS Tokens ตามธีม Zen Green และการเขียนชุดทดสอบทั้ง Unit Test และ E2E Test

### 2. เทคนิคการ Prompt และการควบคุมคุณภาพ (Spec-Driven Development)
- **การอ้างอิง Spec Document เป็นหลัก:** การกำหนด `specification.md` และ `api-spec.md` ไว้ล่วงหน้า ช่วยให้ AI เขียนโค้ดตรงตามโครงสร้าง JSON และ Business Rules โดยไม่ต้องเดา
- **Iterative UI/UX Refinement:** การส่งภาพ Screenshot หน้าจอจริงให้ AI ช่วยวิเคราะห์ ทำให้แก้ไขจุดบกพร่องของ UI ได้อย่างตรงจุด เช่น ข้อความในป้ายสถานะแตกเป็นสองบรรทัด (`whiteSpace: 'nowrap'`), การซ้อนทับกันของลูกศร Dropdown (`appearance: 'auto'`), และการเปลี่ยนตารางเป็นบล็อกการ์ดในจอมือถือ (`d-block d-md-none`)
- **การจัดการ Database Port Alignment:** เรียนรู้วิธีการกำหนดพอร์ตฐานข้อมูลใน `.env` ให้ตรงกับ Prisma Dev Server เพื่อป้องกันปัญหา `ECONNREFUSED` หรือ `Connection terminated`

### 3. ประโยชน์ของการทดสอบแบบอัตโนมัติ (Automated Verification)
การให้ AI ช่วยสร้างชุดทดสอบด้วย Vitest (10/10 tests passed) และ Playwright E2E tests ช่วยให้มั่นใจว่าเมื่อมีการแก้ไขดีไซน์ Responsive หน้าจอหรือปรับแต่งสไตล์ โค้ดส่วนอื่นจะไม่พัง (No Regression Errors) และสามารถสร้างรูปภาพหลักฐานส่งแล็ปได้โดยอัตโนมัติ

---

**บทสรุป:** การใช้ AI ไม่ใช่การให้ AI ทำงานแทนทั้งหมด แต่เป็นการใช้งาน AI เป็นผู้ช่วยคิด วางโครงสร้าง และตรวจสอบโค้ด โดยมีเราเป็นผู้ควบคุมทิศทาง (Human-in-the-loop) เพื่อให้ได้ซอฟต์แวร์ที่มีคุณภาพและตรงตามความต้องการมากที่สุด 🚀