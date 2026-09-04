# Peer Review Log (Lab 2)

## My Information
- **Name:** Alongkorn Kaewprom
- **Student ID:** 67070501050
- **GitHub Username:** Alongkron1234 (https://github.com/Alongkron1234)

---

## 1. My First Peer Reviewer Details
- **Reviewer Name:** Atiwit Thongngoen
- **Student ID:** 67070501048
- **GitHub Username:** atiwit (https://github.com/atiwit)

## 2. My Second Peer Reviewer Details
- **Reviewer Name:** Napatsun Kasemweerasan
- **Student ID:** 67070501014
- **GitHub Username:** napatsun (https://github.com/napatsun)

## 3. My Third Peer Reviewer Details
- **Reviewer Name:** Krittaphat Panyasomphan
- **Student ID:** 67070501052
- **GitHub Username:** krittaphato3 (https://github.com/krittaphato3)

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
| `feature/ticket-detail-and-attachments` | https://github.com/Alongkron1234/toktickit/pull/27 | ใน Backend (app.ts) มีการเช็คความยาวสูงสุดของเหตุผลที่ 200 ตัวอักษร แต่ใน Frontend ยังไม่ได้เช็คความยาวสูงสุด ถ้าผู้ใช้พิมพ์ยาวเกิน 200 ตัว Frontend จะไม่เตือน แต่จะยิง API ไปแล้วได้ Error กลับมาแทนรึเปล่าครับ | pdate file TicketDetailScreen.tsx เรียบร้อยครับ ผมเพิ่ม maxLength={200} เข้าไปในช่องกรอกข้อมูล | Approved |
| `feature/e2e-and-responsive` | https://github.com/Alongkron1234/toktickit/pull/28 | Pending | Pending | Pending |
| `lab2-staging` -> `main` | Pending | Pending | Pending | Pending |

---

## 2. Peer I Reviewed Details
### First Peer
- **Peer Name:** Atiwit Thongngoen
- **Student ID:** 67070501048
- **GitHub Username:** atiwit (https://github.com/atiwit)

### Second Peer
- **Peer Name:** Napatsun Kasemweerasan
- **Student ID:** 67070501014
- **GitHub Username:** napatsun (https://github.com/napatsun)

### Third Peer
- **Peer Name:** Krittaphat Panyasomphan
- **Student ID:** 67070501052
- **GitHub Username:** krittaphato3 (https://github.com/krittaphato3)

### Pull Requests Reviewed by Me (Submitted by Peer)
| PR Title / Feature Branch | Peer PR Link | My Review Comment | Peer Response / Action | Approval Status |
| :--- | :--- | :--- | :--- | :--- |
| `feat/lab2-specs` | https://github.com/krittaphato3/TokTickIT/pull/20 | เหมือนจะลืม review.md กับ ai_use.md หรือป่าว | เพื่อนเพิ่ม review.md กับ ai_use.md เรียบร้อย | Approved |
| `feat/lab2-db-schema` | https://github.com/atiwit/toktickit/pull/21 | จาก ticket ที่ทำ จาก Many to Many น่าจะเป็น 1-Many นะ รบกวนเช็คอีกทีนะครับ | เพื่อนแก้ความสัมพันธ์ของตาราง | Approved |
| `feat/lab2-requester-context` | https://github.com/krittaphato3/TokTickIT/pull/24 | ตรวจเช็คแล้วไฟล์โอเคครยถ้วนดีครับ แต่อยากเห็นผลการ test เพิ่มเติมจะดีมากครับ | เพื่อนส่งรูปภาพที่เห็นผลการรันผ่านชันเจน | Approved |
| `feat/lab2-create-ticket-api` | https://github.com/krittaphato3/TokTickIT/pull/25 | จากที่ผมดูโค้ดการทำงานทุกอย่างโอเค แต่ว่ามีตรงขื่อไฟล์ tickets.test.ts ที่อาจจะไม่ตรงกับชื่อไฟล์ใน Requirement ที่ได้รับมานะครับ รบกวนเช็คตรงส่วนนี้อีกทีนะ | เพื่อนได้ทำการแก้ไขตามที่บอกเรียบร้อย | Approved |
| `feat/lab2-create-ticket-ui` | https://github.com/krittaphato3/TokTickIT/pull/26 | มีรายละเอียด UX/UI ครบถ้วน พำวก accessibility , responsive ทุก breakpoint และ interaction states ต่าง ๆ ชัดเจนดีครับ Approved ครับผม | ขอบคุณครับ | Approved |
| `feat/lab2-my-tickets-api` | https://github.com/atiwit/toktickit/pull/22 | ตรงระบบ Search ตามข้อกำหนดที่ให้มา AC-08 (BR-07) รบกวนเช็คใน ticket.service.ts นิดนึงครับว่า keyword ก่อนส่งไปทำ ILIKE/ มีการ escape อักขระพิเศษของ SQL เช่น %, _ และ \ ไว้เรียบร้อยแล้วรึป่าว ผมลองไล่หาๆแล้วไม่เจอครับ| เพื่อนมีโค้ดสำหรับ escape อักขระพิเศษของ SQL ไว้แล้วเป็นผมที่หาไม่เจอเอง | Approved |
| `feature/lab2-ui-implement` | https://github.com/atiwit/toktickit/pull/31 | ในไฟล์รูปนี้อะครับ artifacts/lab-02/screenshots/my-tickets/desktop.png ผมไม่แน่ใจว่ามันเป็นการแสดงผลซ้ำซ้อนมั้ยครับผมดูข้อมูลเหมือนกันแต่ว่าอันบนเป็นการแสดงแบบ table แต่อันล่างเป็นการแสดงแบบเป็นบล็อคๆ ฝากเช็คตรนี้อีกทีนะครับ | เพื่อนได้เห็นข้อผิดพลาดตามที่บอกและได้ทำการแก้ไขเรียบร้อยแล้ว | Approved |