# AI Use Log and Reflection

ในการทำ Lab นี้ผมใช้ Google Antigravity ในการช่วยทำโปรเจคนี้ โดย LLM ที่ใช้คือ Gemini 3.6 Flash และมี thinking level เป็น High

## Selected Key Prompts by Issue

| Issue / Feature | Prompt Name | Actual Prompt Text Summary | My Reflection |
| :--- | :--- | :--- | :--- |
| **Issue 1** | Requirement Analysis & Architecture Planning | "ช่วยวิเคราะห์ข้อกำหนดในโจทย์แล็ปสำหรับ Issue 1-4 สรุป roadmap การพัฒนา ลำดับขั้นตอนการทำงาน และวางโครงสร้างโฟลเดอร์สำหรับ Express, React และ Prisma" | ช่วยให้เข้าใจภาพรวมความเชื่อมโยงของทั้ง 4 Issues วางสถาปัตยกรรมโปรเจกต์ได้อย่างถูกต้องตั้งแต่เริ่มต้น |
| **Issue 1** | Project Infrastructure Setup | "ช่วยสร้างโครงสร้างโปรเจกต์ TokTickIT พร้อมกำหนดค่าไฟล์พื้นฐาน ได้แก่ .gitignore, .env.example และเขียนเอกสาร README.md สำหรับคำแนะนำการติดตั้ง" | AI สร้างโครงสร้างโฟลเดอร์ client/server และตั้งค่าไฟล์คอนฟิกพื้นฐานได้ถูกต้อง รวดเร็ว ป้องกันการหลุด commit secrets |
| **Issue 2** | Health Check API Implementation | "ช่วยพัฒนา REST API endpoint GET /api/health บน Express ให้คืนค่า HTTP 200 OK พร้อมข้อมูล JSON { status: 'ok', service: 'TokTickIT API' }" | AI สร้าง Controller ได้กระชับและส่งค่า JSON คืนตรงตามข้อกำหนดของแล็ปอย่างแม่นยำ |
| **Issue 2** | Frontend Health Check UI & State Management | "ช่วยพัฒนาหน้าจอ React UI ด้วย Bootstrap สำหรับปุ่ม Check System โดยรองรับ Loading state และ Error handling กรณีระบบ Offline" | ได้ UI ที่สวยงาม สอดคล้องกับภาพตัวอย่างในใบแล็ป และจัดการ State การเรียก API ได้อย่างสมบูรณ์ |
| **Issue 2** | Server Health Check Automated Testing | "ช่วยสร้างไฟล์ทดสอบ Supertest (api-01.test.ts) สำหรับตรวจสอบพฤติกรรมของ endpoint GET /api/health ให้คืนค่า HTTP 200 และ JSON ที่ถูกต้อง" | ช่วยสร้างชุดทดสอบ API ฝั่งเซิร์ฟเวอร์แบบอัตโนมัติได้อย่างรวดเร็ว รันการทดสอบผ่าน 100% |
| **Issue 3** | Category Model & Database Migration Design | "ช่วยออกแบบ Prisma Schema สำหรับโมเดล Category ให้มีฟิลด์ id, name (unique), createdAt พร้อมตั้งค่า Prisma v7 และรัน migration" | AI ช่วยสร้าง schema.prisma และสคริปต์ migration SQL สำหรับ PostgreSQL ได้ถูกต้องตามมาตรฐาน Prisma 7 |
| **Issue 3** | Idempotent Database Seeding Implementation | "ช่วยเขียนสคริปต์ seed.ts ด้วย Prisma upsert เพื่อบันทึกข้อมูลหมวดหมู่ IT 4 รายการ โดยต้องรันซ้ำได้ปลอดภัยไม่เกิดข้อมูลซ้ำซ้อน" | ป้องกันปัญหา Primary key หรือ Unique constraint conflict เมื่อรันสคริปต์ seed ซ้ำหลายรอบได้อย่างปลอดภัย |
| **Issue 4** | Category List REST API Implementation | "ช่วยพัฒนา REST API endpoint GET /api/categories บน Express ดึงข้อมูลหมวดหมู่จาก PostgreSQL ผ่าน Prisma โดยจัดเรียงตาม id ascending" | AI ดึงข้อมูลผ่าน Prisma Client ได้ถูกต้อง และจัดเรียงข้อมูลเรียงตาม id ascending ตรงตามข้อกำหนดแล็ป |
| **Issue 4** | Category List UI Integration & Dynamic Rendering | "ช่วยอัปเดต React UI ให้ยิงดึงข้อมูลจาก GET /api/categories เมื่อกด Check System แล้วนำรายการหมวดหมู่มาแสดงผลด้วย Bootstrap List Group" | แสดงผลรายการหมวดหมู่แบบไดนามิก รองรับทั้งกรณีดึงข้อมูลสำเร็จและกรณีระบบ Offline ได้อย่างราบรื่น |
| **Issue 4** | Comprehensive UI & End-to-End Testing Suite | "ช่วยอัปเดตไฟล์ App.test.tsx ด้วย Vitest และ Testing Library สำหรับทดสอบ UI-01, UI-02, UI-03 เพื่อยืนยันการแสดงผลและ Error State" | ได้ชุดทดสอบ UI อัตโนมัติที่ครอบคลุมทุกเคส ส่งผลให้รัน npm test ผ่านสีเขียวครบทั้ง 5 ชุดทดสอบ |
