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
| | | | | |
