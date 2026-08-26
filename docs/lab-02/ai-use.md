# AI Use Log and Reflection

ในการทำ Lab นี้ผมใช้ Google Antigravity ในการช่วยทำโปรเจกต์นี้ โดย LLM ที่ใช้คือ Gemini 3.6 Flash และมี thinking level เป็น High

## Selected Key Prompts by Issue

| Issue / Feature | Prompt Name | Actual Prompt Text Summary | My Reflection |
| :--- | :--- | :--- | :--- |
| **Issue 1** | Requirement Analysis & Engineering Spec Drafting | "ช่วยวิเคราะห์โจทย์แล็ป 2 และวางแผนจัดทำเอกสาร specification.md, ui-spec.md, api-spec.md, tests.md ตามหลัก Spec-Driven Development" | ช่วยให้ได้เอกสารข้อตกลงทางวิศวกรรมที่ครบถ้วนสมบูรณ์ก่อนเริ่มเขียนโค้ดจริง |
| **Issue 2** | Database Schema & Idempotent Seed Implementation | "จาก Issue2 ช่วยอัปเดต schema.prisma สำหรับโมเดล DevelopmentRequester, Category, RelatedSystem, Ticket, Attachment พร้อมทำ idempotent seed.ts ที่รันซ้ำได้ปลอดภัยไม่เบิ้ลข้อมูล" | AI ช่วยออกแบบ Schema ตามมาตรฐาน Relational Database และสร้างสคริปต์ seed ข้อมูลตัวอย่างที่รันซ้ำได้อย่างปลอดภัย |
| **Issue 3** | Development Requester Context & Selection Screen | "จาก Issue3 ช่วยสร้าง GET /api/requesters, requireRequesterHeader middleware, RequesterContext (localStorage) และหน้า RequesterSelectionScreen ตามธีม Zen Green พร้อม Unselected Guard" | ช่วยสร้างระบบเลือกตัวตนผู้ใช้ชั่วคราวและจัดการ State ในระดับ App Shell ได้อย่างเรียบร้อยก่อนย้ายไปใช้ Real Auth ใน Lab 3 |
| **Issue 4** | Ticket Creation REST API & Backend Validation | "จาก Issue4 ช่วยพัฒนา GET /api/related-systems และ POST /api/tickets พร้อมระบบ Validation (Summary 5-150 / Description 10-2000), ฟังก์ชันเจนเลขตั๋วอัตโนมัติ TKT-YYYY-XXXXXX และเขียน API Tests" | AI ช่วยเขียนโค้ดตรวจสอบความถูกต้องของข้อมูลตาม Business Rules และสร้างระบบเจนเลข Ticket Number อัตโนมัติที่ปลอดภัย |
| **Issue 5** | Zen Green Create Ticket Form & UI Interaction | "จาก Issue5 ช่วยสร้าง CreateTicketScreen.tsx โหลดตัวเลือกจาก API อัตโนมัติ, มีระบบ Client-side Inline Validation, ปุ่ม Submitting... Busy state และจัดการ Data Retention พร้อม UI Component Tests" | ได้หน้าฟอร์มสร้างตั๋วที่ใช้งานง่าย ตอบสนองต่อการกรอกของผู้ใช้อย่างเรียลไทม์ และป้องกันข้อมูลสูญหายเมื่อเกิดข้อผิดพลาด |