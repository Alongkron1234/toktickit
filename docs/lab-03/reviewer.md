# Peer Review Log (Lab 3)

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
| `feat/lab-03-spec-contract` | https://github.com/Alongkron1234/toktickit/pull/42 | Specification และ api specs, test, ui-specs เขียนได้ดีมากครับ | ตรวจสอบความเรียบร้อยของเอกสารและเตรียมพร้อมสำหรับการเริ่มทำ Issue 2 | Approved |
| `feat/lab-03-auth-foundation` | https://github.com/Alongkron1234/toktickit/pull/43 | เก่งมากครับ Implement ในส่วนของ Authentication ได้ดีมาก แต่อาจจะมีในส่วนของ Password Check ที่ตาม req เป็น both แต่ที่ pr มาในกรณี case ที่เข้าแค่ 1 อัน อย่าง Password1 แต่ไม่มี special characters ก็จะผ่านครับ ยังไงรบกวนเช็คให้หน่อย | แก้ไข validatePasswordComplexity ให้ต้องผ่านทั้งความยาวและความซับซ้อนพร้อมกัน ไม่ใช่แค่อย่างใดอย่างหนึ่ง | Approved |
| `feat/lab-03-requester-comments` | https://github.com/Alongkron1234/toktickit/pull/44 | จู๊ดก็อป เอ้ย กู๊ดจ็อป Implement ในส่วนของ Status ได้ครบถ้วน และ ยังมีในส่วนชองการทำ Public Comment ที่มีการจัดการที่ดี เยี่ยมยอด | ตรวจสอบความเรียบร้อย | Approved |
| `feat/lab-03-staff-queue` | https://github.com/Alongkron1234/toktickit/pull/45 | ภาพรวมโค้ดดูโอเคเลยครับ Test ครบถ้วนดีมาก มีจุดนึงอยากสอบถามเพื่อความแน่ใจ หากกรณีที่ฝั่ง Frontend ได้รับ status 403 เราได้จัดการให้มี UI แจ้งเตือนผู้ใช้ หรือ redirect กลับไปหน้า Login ไว้ด้วยไหมครับ / ภายหลังพบว่าตัว sorting columns เหมือนจะ break | เพิ่มการแยกจัดการ 401 (logout + redirect กลับหน้า Login) และ 403 (แสดง \"Access Denied\" แยกจาก error ทั่วไป) และแก้ไข bug การ sorting by columns ที่ break | Approved |
| `fix/docs-lab3` | https://github.com/Alongkron1234/toktickit/pull/48 | Spec ที่แก้ไขครบถ้วนดีครับ | ตรวจสอบความเรียบร้อย | Approved |
| `feat/lab-03-staff-ticket-operations` | https://github.com/Alongkron1234/toktickit/pull/49 | พบ 3 จุด ไม่มี catch block หรือการจัดการข้อผิดพลาด ถ้าหาก API ล้มเหลว ผู้ใช้จะไม่ได้รับข้อความแจ้งเตือน และสถานะการโหลดอาจค้างอยู่ ควรเพิ่ม try...catch และ state สำหรับแสดงข้อผิดพลาด เช่น priorityError, commentError, noteError | เพิ่ม try...catch และ error state ให้ handlePriorityChange, handlePostComment, handlePostNote ครบ พร้อมเพิ่ม handleUnauthorized ให้ fetchMembers/fetchComments/fetchNotes และเอา alert() ออกจาก handleDownload เปลี่ยนเป็น inline error UI | Approved |
| `feat/lab-03-admin-users` | https://github.com/Alongkron1234/toktickit/pull/50 | PR นี้ทำมาได้ครบถ้วนและยอดเยี่ยมมากครับ ครอบคลุม Requirement ของ Lab 3 (Issue 6) ทั้ง Backend และ Frontend รวมถึง Safety Guards ตาม Business Rules (BR-11, BR-13, BR-14) ข้อเสนอแนะเล็กน้อย: กรณี targetUser เป็น admin ที่ inactive อยู่แล้วแล้วส่ง isActive:false ซ้ำ อาจโดน guard บล็อกทั้งที่ไม่ได้ลด active admin จริง (ยอมรับได้เพราะปลอดภัยไว้ก่อน) | ขอบคุณสำหรับ feedback ยืนยันเก็บพฤติกรรม guard แบบปลอดภัยไว้ก่อนตามที่เพื่อนแนะนำ และตรวจสอบความ responsive ของ UI อีกรอบก่อน merge | Approved |
| `feat/lab-03-e2e-and-docs` | https://github.com/Alongkron1234/toktickit/pull/51 | ในส่วนของหน้า UI ตรง Log in ควรไม่ต้องเเสดงในส่วนของข้อความด้านล่างที่เป็น Seed Test Credentials นะครับยังไงรบกวนเเก้ด้วยครับ หรือถ้าคิดว่ามีไว้ดีกว่ายังไงมาเเลกเปลี่ยนความคิดเห็นกันได้ครับ👀 | ทำการแก้ไขตามทีี่เพื่อนบอกคือลบ Seed Test Credentials ออกจากหน้า UI | Approved |
| `fix/root-package-json-and-readme` | https://github.com/Alongkron1234/toktickit/pull/53 | ผ่านได้เลยครับ branch นี้ | ตรวจสอบความเรียบร้อย | Approved |
| `fix/lab3-e2e-screenshots` | https://github.com/Alongkron1234/toktickit/pull/56 | เรียบร้อยเเล้วครับ คุณ Ball | ตรวจสอบความเรียบร้อย | Approved |

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
|`feature/lab3-02-auth-and-authorization` | https://github.com/napatsun/TokTickIT/pull/42 | จากที่ตรวจดูระบบ Auth ครบถ้วนเรียบร้อยดีครับ ผ่านน | ตรวจสอบอีกครั้ง | Approved |
|`feature/lab3-03-requester-regression` | https://github.com/napatsun/TokTickIT/pull/43 | โค้ดทุกอย่างโอเคดีมากครับ แต่ฝากไว้นิดนึงนะ ถ้าทำถึง IT Staff Detail อย่าลืมแยก Route ให้ IT Staff และ Admin สามารถอ่านและโพสต์ Public Comments บน Ticket นี้ได้ตาม BR-04 ด้วยนะครับ | เพื่อนรับทราบตามที่บอกและชี้แจงว่าส่วนนั้นอยู่ใน scope ของ feature/lab3-04-staff-ticketingอยู่แล้วตาม api-spec.md ครับ | Approved |
|`feature/lab3-07-e2e-and-release-evidence` | https://github.com/napatsun/TokTickIT/pull/47 | เพื่อนซันๆ อย่าลืม reviewer.md นะ ทำใส่ไว้เลยจะได้ไม่ต้องมาสร้าง branch ใหม่เพิ่ม โอเคมั้ยครับ | เพื่อนทำการเพ่ิม reviewer.md ตามที่บอกครับ | Approved |
|`feature/lab3-engineering-contract` | https://github.com/krittaphato3/TokTickIT/pull/46 | จากที่ดูๆเนื้อหาไฟล์โอเคดีครับ แต่ตรงไฟล์ specification.md ตรง AD-01 เห็นว่ามีการใช้HTTP-Only Cookie + CSRF Double-Submit ตอนเขียน E2E/API Test อย่าลืมเซ็ตให้ Agent เก็บ Session Cookie และแนบ Header CSRF ใน mutating requests ด้วยนะครับ | เพื่อนตรวจสอบความเรียบร้อยอีกครั้ง | Approved |
|`feature/lab3-staff-ticket-detail` | https://github.com/krittaphato3/TokTickIT/pull/50 | โค้ดและโครงสร้างต่างๆทำมาเรียบน้อยดีมากครับ ครอบคลุมทั้ง API, Role Guard, UI Screen, Prisma Migration ก็โอเค Test coverage ครอบคลุมดีมากทั้งฝั่ง Server และ Client | เพื่อนตรวจสอบความเรียบร้อยอีกครั้ง | Approved |
|`feature/lab3-auth` | https://github.com/atiwit/toktickit/pull/45 | อยากทราบว่าตรง current password อะครับตรงหน้า UI ตอนส่งฟอรมไป มันได้นำค่า currentPassword ไปใช้หรือส่งไปที่ API หรือป่าวครับ | เพื่อนตอบว่าไม่ได้ใช้และไม่ได้ส่งไปที่ API ครับ เพราะผมจะไปทำใน PR issue ถัดไปที่เป็นของ role-base และทำตัว change password ครับ | Approved |