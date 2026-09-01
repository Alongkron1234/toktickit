# Peer Review Log (Lab 2)

## My Information
- **Name:** Alongkorn Kaewprom
- **Student ID:** 67070501050
- **GitHub Username:** Alongkron1234 (https://github.com/Alongkron1234)

---

## 1. My Peer Reviewers Details
- **First Reviewer Name:** Atiwit Thongngoen (Student ID: 67070501048, GitHub: https://github.com/atiwit)
- **Second Reviewer Name:** Napatsun Kasemweerasan (Student ID: 67070501014, GitHub: https://github.com/napatsun)
- **Third Reviewer Name:** Krittaphat Panyasomphan (Student ID: 67070501052, GitHub: https://github.com/krittaphato3)

### Pull Requests Submitted by Me
| PR Title / Feature Branch | PR Link | Peer Review Comment | My Response / Action | Approval Status |
| :--- | :--- | :--- | :--- | :--- |
| `feature/spec-and-test-plan` | https://github.com/Alongkron1234/toktickit/pull/20 | ทุกไฟล์เหมือนจะครบดีนะ แต่อาจจะมีตรง specification AC-17 และ AC-18 ครอบคลุมการเปลี่ยนแปลงสถานะ backend และ blocked download แต่การแสดงผลภาพของไฟล์แนบที่ถูกลบไม่ได้ถูกบันทึกไว้อย่างชัดเจนใน AC ก็เลยคิดว่า ถ้าเพิ่มเข้ามาน่าจะดูครบถ้วนครอบครุมมากกว่านะครับ | เพิ่ม AC ด้านการแสดงผล UI ของไฟล์แนบที่ถูก Soft Remove แล้วนะครับ ที่ไฟล์ specification.md AC-19 | Approved |
| `feature/db-schema-and-seed` | https://github.com/Alongkron1234/toktickit/pull/21 | โดยรวมโอเคเเล้วนะ มีเรื่องอยากสอบถามเพิ่มเติมว่า คุณอลงกรณ์มีวิธีจัดการยังไงให้ Data ไม่สร้างซ้ำเพิ่มขึ้นมา | อธิบายวิธีแก้ปัญหาให้เพื่อนเข้าใจ | Approved |
| `feature/dev-requester-context` | https://github.com/Alongkron1234/toktickit/pull/22 | โดยรวมแล้ว test ดีมากๆครับ แต่ในไฟล์ create-ticket.api.test.ts Test case 3 ไม่มีการ assert error.message ทั้งที่ test case 2 มี ควรทำให้มีเหมือนกันนะครับ😘 | แก้ไฟล์ create-ticket.api.test.ts ให้มีการเช็ค error.message เหมือน test case2 | Approved |
| `feature/ticket-create-api` | https://github.com/Alongkron1234/toktickit/pull/23 | จากที่ผมดู คิดว่าตอนนี้น่าจะได้ backend api ครบถ้วน และเทสก็ปกติดี ลุยต่อได้ครับ!! | ตรวจเช็คเพิ่มเติม | Approved |
| `feature/ticket-create-ui` | https://github.com/Alongkron1234/toktickit/pull/24 | ตาม requirement จะต้องมีfolder artifacts ที่มี screenshot ของ Create Ticket UI ด้วยนะครับ ไม่ทราบว่าคุณ @Alongkron1234 จะทำใน issue นี้ หรือทำตอนท้ายหรอครับ | ตอบคำถามเพื่อนว่าทำรวดเดียวใน Issue9 เลย | Approved |
| `feature/my-tickets-api` | https://github.com/Alongkron1234/toktickit/pull/25 | ผมสงสัยตรง นี้นิดนึง เนื่องจาก Issue ระบุไว้ว่า เป็นการค้นหาแบบ Case Insensitive แต่ contains เฉยๆ ถ้าผมเข้าใจไม่ผิด จะเป็น sensitive ยังไงรบกวนตรวจสอบในส่วนนี้ด้วยนะครับ | ได้ตอบกลับและแก้ตามที่เพื่อนบอกเรียบร้อยแล้ว | Approved |
| `feature/my-tickets-ui` | https://github.com/Alongkron1234/toktickit/pull/26 | โดยรวมแล้วโค้ดชัดเจนและไร้ข้อสงสัยครับ ผ่านได้ลุยต่อเลย | ตรวจสอบความเรียบร้อย | Approved |
| `feature/ticket-detail-and-attachments` | https://github.com/Alongkron1234/toktickit/pull/27 | ใน Backend (app.ts) มีการเช็คความยาวสูงสุดของเหตุผลที่ 200 ตัวอักษร แต่ใน Frontend ยังไม่ได้เช็คความยาวสูงสุด ถ้าผู้ใช้พิมพ์ยาวเกิน 200 ตัว Frontend จะไม่เตือน แต่จะยิง API ไปแล้วได้ Error กลับมาแทนรึเปล่าครับ | update file TicketDetailScreen.tsx เรียบร้อยครับ ผมเพิ่ม maxLength={200} เข้าไปในช่องกรอกข้อมูล | Approved |
| `feature/e2e-and-responsive` | https://github.com/Alongkron1234/toktickit/pull/28 | ทดสอบรัน E2E แล้วผ่านครบถ้วน รูปภาพ responsive 3 ขนาดใน artifacts ถูกต้องสมบูรณ์ดีครับ | ขอบคุณสำหรับการตรวจสอบครับ | Approved |
| `lab2-staging` -> `main` | https://github.com/Alongkron1234/toktickit/pull/29 | รวมฟีเจอร์ Lab 2 ทั้งหมดสมบูรณ์พร้อม Merge เข้า main ครับ | ดำเนินการ Merge เข้า main เรียบร้อย | Approved |

---

## 2. Peer I Reviewed Details
- **Peer Name:** Atiwit Thongngoen
- **Student ID:** 67070501048
- **GitHub Username:** atiwit (https://github.com/atiwit)

### Pull Requests Reviewed by Me (Submitted by Peer)
| PR Title / Feature Branch | Peer PR Link | My Review Comment | Peer Response / Action | Approval Status |
| :--- | :--- | :--- | :--- | :--- |
| `feature/spec-and-test-plan` | https://github.com/atiwit/toktickit/pull/1 | ตรวจสอบเอกสาร Specification และ Test Plan แล้วครอบคลุมดีครับ แนะนำให้เพิ่มกรณีทดสอบ Unselected Guard ชัดเจนขึ้น | ปรับปรุงเพิ่มกรณีทดสอบ Unselected Guard ในเอกสารเรียบร้อยครับ | Approved |
| `feature/db-schema-and-seed` | https://github.com/atiwit/toktickit/pull/2 | โครงสร้าง Prisma Schema ออกแบบถูกต้อง และ Seed Script ทำงานแบบ Idempotent ได้ดีมากครับ | ขอบคุณสำหรับการรีวิวครับ | Approved |
| `feature/dev-requester-context` | https://github.com/atiwit/toktickit/pull/3 | การทำ State Management และ Header Guard ทำงานสลับตัวตนได้ราบรื่นดีครับ | ขอบคุณครับ | Approved |
| `feature/ticket-create-api` | https://github.com/atiwit/toktickit/pull/4 | โค้ด REST API สร้างตั๋วและเจนเลขตั๋ว TKT-YYYY-XXXXXX ทำงานถูกต้องและมี Unit Tests ครบถ้วน | ขอบคุณสำหรับการตรวจสอบครับ | Approved |
| `feature/ticket-create-ui` | https://github.com/atiwit/toktickit/pull/5 | หน้าฟอร์มสร้างตั๋วสวยงาม และมี Client-side Validation ครบถ้วนตามดีไซน์ Zen Green ครับ | ขอบคุณครับ | Approved |
| `feature/my-tickets-api` | https://github.com/atiwit/toktickit/pull/6 | API ค้นหาและกรองข้อมูลค้นหาแบบ Case-Insensitive ได้ถูกต้องเรียบร้อยดีครับ | ขอบคุณครับ | Approved |
| `feature/my-tickets-ui` | https://github.com/atiwit/toktickit/pull/7 | หน้า My Tickets รองรับการแสดงผล Responsive แบบ Mobile Cards และ Desktop Table ได้ดีมากครับ | ขอบคุณสำหรับการรีวิวครับ | Approved |
| `feature/ticket-detail-and-attachments` | https://github.com/atiwit/toktickit/pull/8 | ระบบแนบไฟล์และ Soft Removal บันทึกเหตุผลการลบและบล็อกการดาวน์โหลดไฟล์ที่ถูกลบได้ถูกต้องปลอดภัย | ปรับปรุง UI เพิ่มเติมตามคำแนะนำเรียบร้อยครับ | Approved |
| `feature/e2e-and-responsive` | https://github.com/atiwit/toktickit/pull/9 | ชุดทดสอบ E2E รันผ่านหมด และแคปรูป Responsive ครบทั้ง 3 ขนาดหน้าจอ สวยงามมากครับ | ขอบคุณสำหรับการรีวิวครับ | Approved |
| `lab2-staging` -> `main` | https://github.com/atiwit/toktickit/pull/10 | รวมฟีเจอร์ Lab 2 เข้า main สมบูรณ์แบบ พร้อมสำหรับการส่งงาน | Merge เข้า main เรียบร้อยครับ | Approved |
