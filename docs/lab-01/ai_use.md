# AI Use Log and Reflection

ในการทำ Lab นี้ผมใช้ Google Antigravity ในการช่วยทำโปรเจคนี้ โดย LLM ที่ใช้คือ Gemini 3.6 Flash และมี thinking level เป็น High

## Selected Key Prompts by Issue

| Issue / Feature | Prompt Name | Actual Prompt Text Summary | My Reflection |
| :--- | :--- | :--- | :--- |
| **Issue 1** | Requirement Analysis & Architecture Planning | "ช่วยวิเคราะห์ข้อกำหนดในโจทย์แล็ปสำหรับ Issue 1-4 สรุป roadmap การพัฒนา ลำดับขั้นตอนการทำงาน และวางโครงสร้างโฟลเดอร์สำหรับ Express, React และ Prisma" | ช่วยให้เข้าใจภาพรวมว่าแล็ปนี้ทำอะไรทั้ง 4 Issues เพื่อ setup โปรเจกต์ได้อย่างถูกต้องตั้งแต่เริ่มต้น |
| **Issue 1** | Project Infrastructure Setup | "จาก Issue1 ช่วยสร้างโครงสร้างโปรเจกต์นี้ พร้อมกำหนดไฟล์พื้นฐาน พวก .gitignore, .env.example และเขียน README.md สำหรับคำแนะนำการติดตั้งต่างๆ" | AI สร้างโครงสร้างโฟลเดอร์ client/server และตั้งค่าไฟล์คอนฟิกพื้นฐานได้ถูกต้อง รวดเร็ว ป้องกันการหลุด commit secrets |
| **Issue 2** | Health Check API Implementation | "จาก Issue2 ช่วยพัฒนา REST API endpoint GET /api/health บน Express ให้คืนค่า HTTP 200 OK พร้อมข้อมูล JSON { status: 'ok', service: 'TokTickIT API' }" | AI สร้าง Controller และส่งค่า JSON คืนตรงตามข้อกำหนดของแล็ปได้อย่างถูกต้อง |
| **Issue 2** | Frontend Health Check UI & State Management | "ช่วยสร้างหน้า React UI ด้วย Bootstrap สำหรับปุ่ม Check System โดยรองรับ Loading state และ Error handling กรณีระบบ Offline" | ได้ UI ที่สวยงาม สอดคล้องกับภาพตัวอย่างในใบแล็ป และจัดการ State การเรียก API ได้อย่างสมบูรณ์ |
| **Issue 2** | Server Health Check Automated Testing | "ช่วยสร้างไฟล์ทดสอบ Supertest (health.test.ts) สำหรับตรวจสอบพฤติกรรมของ endpoint GET /api/health ให้คืนค่า HTTP 200 และ JSON ที่ถูกต้อง" | ช่วยสร้างชุดทดสอบ API ฝั่งเซิร์ฟเวอร์แบบอัตโนมัติได้อย่างรวดเร็ว รันการทดสอบผ่าน 100% |
| **Issue 3** | Category Model & Database Migration Design | "จาก Issue3 ช่วยออกแบบ Prisma Schema สำหรับโมเดล Category ให้มีฟิลด์ id, name (unique), createdAt พร้อมตั้งค่า Prisma v7 และรัน migration" | AI ช่วยสร้าง schema.prisma และสคริปต์ migration SQL สำหรับ PostgreSQL ได้ถูกต้องตามมาตรฐาน Prisma 7 |
| **Issue 3** | Idempotent Database Seeding Implementation | "ช่วยเขียน seed.ts ด้วย Prisma upsert เพื่อบันทึกข้อมูลหมวดหมู่ IT 4 รายการ โดยต้องรันซ้ำได้ปลอดภัยไม่เกิดข้อมูลซ้ำซ้อน" | ป้องกันปัญหา Primary key หรือ Unique constraint conflict เมื่อรันสคริปต์ seed ซ้ำหลายรอบได้อย่างปลอดภัย |
| **Issue 4** | Category List REST API Implementation | "ช่วยพัฒนา REST API endpoint GET /api/categories บน Express ดึงข้อมูลหมวดหมู่จาก PostgreSQL ผ่าน Prisma โดยจัดเรียงตาม id ascending" | AI ดึงข้อมูลผ่าน Prisma Client ได้ถูกต้อง และจัดเรียงข้อมูลเรียงตาม id ascending ตรงตามข้อกำหนดแล็ป |
| **Issue 4** | Category List UI Integration & Dynamic Rendering | "ช่วยอัปเดต React UI ให้ยิงดึงข้อมูลจาก GET /api/categories เมื่อกด Check System แล้วนำรายการหมวดหมู่มาแสดงผลด้วย Bootstrap List Group" | แสดงผลรายการหมวดหมู่แบบไดนามิก รองรับทั้งกรณีดึงข้อมูลสำเร็จและกรณีระบบ Offline ได้อย่างราบรื่น |
| **Issue 4** | Comprehensive UI & End-to-End Testing Suite | "ช่วยอัปเดตไฟล์ App.test.tsx ด้วย Vitest และ Testing Library สำหรับทดสอบ UI-01, UI-02, UI-03 เพื่อยืนยันการแสดงผลและ Error State" | ได้ชุดทดสอบ UI อัตโนมัติที่ครอบคลุมทุกเคส ส่งผลให้รัน npm test ผ่านสีเขียวครบทั้ง 5 ชุดทดสอบ |




## Overall Reflection on AI Assistance

ในการทำแล็ปนี้ ผมได้นำ AI เข้ามาช่วยในกระบวนการทำงานเป็นส่วนใหญ่ โดยแบ่งรูปแบบการใช้งานออกเป็น 2 ส่วนหลักๆ คือ **การใช้แชทสำหรับสอบถามข้อสงสัยทั่วไป** และ **การใช้ Agent เพื่อช่วยสร้าง แก้ไขไฟล์ และรันคำสั่งต่างๆ** ซึ่งช่วยประหยัดเวลาการทำงานไปได้มาก โดยมีข้อสะท้อนคิดและประสบการณ์ที่ได้รับ ดังนี้:

1. **ใช้ AI เป็นผู้ช่วยสอนและสร้างความเข้าใจ**
    ผมใช้ AI เหมือนผู้ช่วยสอน พอผรู้ว่าต้องทำอะไร ผมจะสั่ง AI และขอให้อธิบายโครงสร้างโค้ด , การทำงานของ Data Flow ต่างๆ เช่น การส่งผ่าน REST API และการเชื่อมต่อฐานข้อมูล PostgreSQL ผ่าน Prisma เพื่อให้เข้าใจในสิ่งที่ AI เขียนหรือสรา้งมา และสามารถนำความรู้นี้ไปต่อยอดและประยุกต์ใช้ในแล็ปถัดๆไปได้ด้วยตัวเอง

2. **การกำหนดบริบท**
    ผมรู้สึกว่าการกำหนดบริบทหรือว่า Context ที่ชัดเจนให้ AI ทำให้ AI สร้างผลลัพธ์ได้ตรงและไม่ทำเกินขอบเขตที่ต้องการ แล้ว เทคนิคผมชอบอีกอย่างคือการสั่งให้ AI มองเห็นภาพรวมการทำงานทั้งหมดก่อน จากแล้วค่อยสั่ง Prompt เจาะจงไปทีละส่วนไปเรื่อยๆ

3. **ข้อสังเกตและการตรวจสอบโดยมนุษย์**
    สิ้งที่ผมสังเกตุได้อีกอย่างคือเมื่อใช้ AI ต่อเนื่องกันเป็นเวลานานจนประวัติบทสนทนา มีขนาดใหญ่ขึ้น AI อาจเริ่มลืมหรือตั้งชื่อไฟล์และจัดโครงสร้างผิดไปจากใบแล็ปได้ ดังนั้น การตรวจสอบความถูกต้องด้วยตัวเอง เช่น การตรวจไฟล์ การเช็คชื่อตัวแปรต่างๆ ยังคงเป็นสิ่งที่ขาดไม่ได้ในการรับประกันความถูกต้องของงาน
