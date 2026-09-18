# AI Use Log and Reflection (Lab 3)

ในการทำ Lab 3 นี้ ผมใช้ AI สองตัวในช่วงเวลาต่างกันของ Sprint: ช่วงต้น (Issue 1-2: การวางสเปกและ Authentication Foundation) ผมใช้ **Google Antigravity IDE** ร่วมกับโมเดล **Gemini 3.6 Flash** เพื่อวิเคราะห์โจทย์และพัฒนาฟีเจอร์เริ่มต้น ส่วนช่วงหลัง (Issue 3 เป็นต้นไป: IT Staff Ticket Queue, Ticket Detail Workflow, Administrator User Management, และ E2E Testing/Final Integration) ผมเปลี่ยนมาใช้ **Claude Code** ร่วมกับโมเดล **Claude Sonnet 5** เป็น Pair Programming Partner แทน เนื่องจากต้องการความสามารถในการรันคำสั่ง ทดสอบ และดีบักโค้ดแบบ agentic ต่อเนื่องได้ดีกว่า

---

##  Selected Key Prompts by Issue

| Issue / Feature | Prompt Name | Actual Prompt Text Summary | My Reflection |
| :--- | :--- | :--- | :--- |
| **Issue 1** | Requirement Analysis & Engineering Spec Drafting | "ช่วยวิเคราะห์โจทย์แล็ป 3 และวางแผนจัดทำเอกสาร specification.md, ui-spec.md, api-spec.md, tests.md ตามหลัก Spec-Driven Development" | ได้เอกสารข้อตกลงทางวิศวกรรมที่ชัดเจนก่อนเริ่มเขียนโค้ด ทำให้ทุกทีมมีความเข้าใจตรงกันเกี่ยวกับ Acceptance Criteria, Business Rules, Authorization Matrix และ Admin Safety Rules |
| **Issue 2** | Database Migration, User Model & Authentication Foundation | "จาก Issue2 ช่วยอัปเดต schema.prisma สำหรับโมเดล User (Role, passwordHash, requiresPasswordChange), PublicComment, InternalNote พร้อมทำ seed.ts สำหรับ 3 Roles และ Auth REST APIs + Login/Password Change UI" | AI ช่วยย้ายโครงสร้าง DB มาเป็น User Model พร้อม Hash รหัสผ่านด้วย bcryptjs, พัฒนา Auth APIs, LoginScreen, ChangePasswordScreen และผ่านชุดทดสอบแบบอัตโนมัติ 100% |
| **Issue 3** | Requester Regression & Public Comments | "จาก Issue3 ช่วยลบ Development Requester selector กับปุ่ม Change Requester ที่เหลือออกให้หมด แล้วให้หน้า Requester ทุกหน้าใช้ authenticated identity แทน requesterId ที่ client ส่งมา พร้อม implement Public Commentsและปุ่ม Problem Appears Resolved ในหน้า Ticket Detail โดยห้ามกระทบแก้อะไรของเดิมจาก Lab 2" | ได้เห็นความสำคัญของการทำ regression test ควบคู่ไปกับฟีเจอร์ใหม่เสมอ เพราะการย้ายจาก Dev Requester selector มาเป็น authenticated identity เป็นจุดเสี่ยงที่จะทำให้ของเดิมพังได้ง่ายถ้าไม่มี test คอยเช็คย้ำ |
| **Issue 4** | IT Staff Ticket Queue (Search/Filter/Sort/Pagination) | "step ใน Issue 4 ตามด้วยให้ช่วย implement Queue API + Responsive UI ตาม ui-spec.md ให้ช่วยแยก 401 กับ 403 ออกจากกันให้ถูกต้อง | ได้เรียนรู้ว่าการแยก error state ตาม status code (401 = logout+redirect, 403 = Access Denied แยกต่างหาก) สำคัญมากสำหรับ UX ที่ปลอดภัย และ peer review เป็นตัวช่วยจับจุดที่ผมมองข้ามได้จริง |
| **Issue 5** | IT Staff Ticket Detail & Workflow Operations | ส่ง Issue 5 spec เต็มให้ AI ทำความเข้าใจ แล้วให้ช่วย implement Claim/Reassign, IT Priority, Status Transition Matrix, Public Comments/Internal Notes tabs  | AI ช่วยแยกแยะได้ว่า feedback ไหนเป็นบั๊กจริงที่ต้องแก้ กับไหนที่ถูกต้องอยู่แล้วไม่ต้องแก้ (เช่นความต่างของ field content/body ระหว่าง comment กับ note ตั้งใจให้ต่างกัน) ทำให้ไม่แก้เกิน scope โดยไม่จำเป็น |
| **Issue 6** | Administrator User Management & Safety Rules | ส่ง Issue 6 spec เต็มให้ทำความเข้าใจ แล้วให้ช่วย implement Admin API (CRUD user, reset password) + UI พร้อม Safety Guards ตาม BR-13 (ห้าม deactivate ตัวเอง) และ BR-14  | เข้าใจกระบวนการออกแบบ Guard ที่ป้องกันระบบพังจาก edge case ได้ลึกขึ้น และเห็นว่าการเขียน backend test ให้ครอบคลุม edge case จริงๆ เป็นเรื่องสำคัญมาก |
| **Issue 7** | E2E Testing, Screenshots, Documentation, Final Integration | ส่ง Issue 7 spec ให้ทำความเข้าใจ มอบหมายให้เขียน E2E spec 3 ไฟล์ (authentication, staff-ticket-flow, user-administration)| ได้เห็นว่าการเขียน E2E test เป็นอะไรที่ช้าและแอบยุงยากพอสมควร |

---

## AI Reflection & Technical Learnings

### 1. การทำงานร่วมกับ AI ในรูปแบบ Pair Programming
AI ไม่ได้เป็นแค่เครื่องมือเขียนโค้ดให้ครั้งเดียวจบ แต่ทำงานเหมือนคู่คิดที่ช่วยไล่ debug แบบ iterative จริงๆ โดยเฉพาะตอน Issue 7 ที่เจอ E2E test fail แบบสุ่มไม่มีรูปแบบชัดเจน กระบวนการคือ AI ตั้งสมมติฐาน ลองแก้ แล้วรันทดสอบซ้ำเพื่อดูว่าถูกจริงมั้ย แทนที่จะหยุดแค่เดาแล้วแก้ไปเรื่อยๆ ซึ่งเป็นแนวทางการทำงานที่ผมเรียนรู้ว่าสำคัญมากกว่าความเร็ว

### 2. เทคนิคการ Prompt และการควบคุมคุณภาพ
การที่ให้มันสรุปภาพรวมไว้ก่อนแล้วค่อยเจาะลึกแต่ละ issue โดยก่อนทำแต่ละ issue ให้มันอ่าน issue ก่อนเริ่มเขียนโค้ดทุกครั้งแทนที่จะบอกสั้นๆ ว่าทำอะไรช่วยให้ AI เข้าใจ scope ที่จริงๆ
