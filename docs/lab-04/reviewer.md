# Peer Review Log (Lab 4)

## My Information
- **Name:** Alongkorn Kaewprom
- **Student ID:** 67070501050
- **GitHub Username:** Alongkron1234 (https://github.com/Alongkron1234)

---

## 1. My Peer Reviewers

### 1.1 First Peer Reviewer
- **Reviewer Name:** Atiwit Thongngoen
- **Student ID:** 67070501048
- **GitHub Username:** atiwit (https://github.com/atiwit)

### 1.2 Second Peer Reviewer
- **Reviewer Name:** Napatsun Kasemweerasan
- **Student ID:** 67070501014
- **GitHub Username:** napatsun (https://github.com/napatsun)

### 1.3 Third Peer Reviewer
- **Reviewer Name:** Krittaphat Panyasomphan
- **Student ID:** 67070501052
- **GitHub Username:** krittaphato3 (https://github.com/krittaphato3)

---

## 2. Pull Requests Submitted by Me

ทุก PR เข้า `lab4-staging` ยกเว้น release PR ที่เข้า `main`

| PR Title / Feature Branch | PR Link | Peer Review Comment | My Response / Action | Approval Status |
| :--- | :--- | :--- | :--- | :--- |
| `feature/lab-4-spec-contract` (Issue #57) | https://github.com/Alongkron1234/toktickit/pull/63 | (atiwit) เอกสารครบถ้วน และพร้อมสำหรับ Issue ต่อไปแล้วครับ สุดยอดมาก | ขอบคุณครับ ไม่มีจุดที่ต้องแก้ไข | Approved (atiwit) |
| `feature/lab-4-actions-taken` (Issue #58) | https://github.com/Alongkron1234/toktickit/pull/64 | (napatsun) ภาพรวมทำได้ดีมากและครอบคลุมตาม Spec ของ Lab 4 อย่างครบถ้วน แต่ไฟล์ ActionsTakenSection.tsx เริ่มเยอะแล้ว ถ้าอนาคตต้องเพิ่มฟีเจอร์อาจลองแยกส่วน Form ออกมาเป็น component ย่อยจะได้จัดการง่ายขึ้น | ตอบว่าไฟล์นี้รวม 4 หน้าที่ (ดึงข้อมูล, ฟอร์มเพิ่ม/แก้, ขั้นตอน Complete/Cancel, รายการ Action) เห็นด้วยว่าควรแยกเป็น component ย่อยและจะทำเมื่อ Issue ถัดไปต้องแก้ไฟล์นี้ | Approved (napatsun) |
| `feature/lab-4-ticket-workflow` (Issue #59) | https://github.com/Alongkron1234/toktickit/pull/65 | (atiwit) `beforeEach(() => vi.restoreAllMocks())` ไม่ได้ restore `global.fetch` เพราะเป็นการ assign ตรง ๆ ไม่ใช่ `vi.spyOn` fetch ของเทสก่อนหน้าจะค้างข้ามเทส (ตอนนี้ยังไม่พังเพราะ setup assign ใหม่ทุกครั้ง แต่เสี่ยงถ้ามีเทสที่ไม่เรียก setup) ให้ลองเช็คตรงนี้ | ตอบว่าจริงตามที่แนะนำ แล้วแก้ใน `TicketWorkflow.test.tsx` ให้เก็บ `originalFetch` และคืนค่า `global.fetch` ใน `afterEach` (commit `test(lab-04): restore global.fetch after each UI test`) จากนั้นแจ้ง atiwit ให้ตรวจอีกครั้ง | Approved (atiwit) หลังแก้ ยืนยันว่า "เรียบร้อยแล้ว" |
| `feature/lab-4-dashboards` (Issue #60) | https://github.com/Alongkron1234/toktickit/pull/66 | (napatsun) ทำออกมาได้ดี รอบคอบครบถ้วนดีครับ ผ่านเลย | ขอบคุณครับ ไม่มีจุดที่ต้องแก้ไข | Approved (napatsun) |
| `fix/lab-4-dashboard-followup` (แก้ต่อจาก Issue #60) | https://github.com/Alongkron1234/toktickit/pull/68 | (napatsun) แก้ปัญหาได้ตรงจุดและครอบคลุมดี โดยเฉพาะการอธิบายเหตุผลการเลือกเลข Ticket (001225-001229) และการเพิ่ม afterAll เพื่อ clean Test Account ที่ช่วยให้ Test Suite มีความเสถียรในระยะยาว | ขอบคุณครับ ไม่มีจุดที่ต้องแก้ไข | Approved (napatsun) |
| `feature/lab-4-hardening` (Issue #61) | https://github.com/Alongkron1234/toktickit/pull/69 | (krittaphato3) แก้ไข security issues ได้ดีมาก มีเทสครบถ้วน / (napatsun) ทำเสร็จเร็วมาก ครบถ้วนถูกต้อง ผ่าน | ขอบคุณครับ ไม่มีจุดที่ต้องแก้ไข | Approved (krittaphato3, napatsun) |
| `feature/lab-4-e2e-and-docs` (Issue #62) | https://github.com/Alongkron1234/toktickit/pull/70 | (krittaphato3) doc ครบถ้วนดีนะครับ และมีรูปใน artifacts ครบถ้วน e2e ก็ทำได้ดีมากครับ ไม่มีข้อติ กล้ามากเก่งมากครับ | ขอบคุณครับ ไม่มีจุดที่ต้องแก้ไข | Approved (krittaphato3) |
| `lab4-staging` -> `main` (Release PR) | https://github.com/Alongkron1234/toktickit/pull/71 | (napatsun) Approve ครับ เสร็จแล้วทำ report ต่อได้เลย | ขอบคุณครับ ไม่มีจุดที่ต้องแก้ไข | Approved (napatsun) |

---

## 3. Peers I Reviewed

### 3.1 First Peer
- **Peer Name:** Atiwit Thongngoen
- **Student ID:** 67070501048
- **GitHub Username:** atiwit (https://github.com/atiwit)

### 3.2 Second Peer
- **Peer Name:** Napatsun Kasemweerasan
- **Student ID:** 67070501014
- **GitHub Username:** napatsun (https://github.com/napatsun)

### 3.3 Third Peer
- **Peer Name:** Krittaphat Panyasomphan
- **Student ID:** 67070501052
- **GitHub Username:** krittaphato3 (https://github.com/krittaphato3)

## 4. Pull Requests Reviewed by Me (Submitted by Peer)

| PR Title / Feature Branch | Peer PR Link | My Review Comment | Peer Response / Action | Approval Status |
| :--- | :--- | :--- | :--- | :--- |
| `feature/l4-1-contract` | https://github.com/krittaphato3/TokTickIT/pull/61 | ทำออกมาได้ดีมากครับ ผ่าน | ตรวจสอบความเรียบร้อย | Approved |
| `feature/l4-2-actions-taken-api` | https://github.com/krittaphato3/TokTickIT/pull/62 | เห็นด้วยกับคุณซัน (napatsun) ครับ มีการทำมาอย่างดีทั้ง seed การวาง structure ต่างๆ | ตรวจสอบความเรียบร้อย | Approved |
| `feature/l4-3-ticket-workflow` | https://github.com/krittaphato3/TokTickIT/pull/63 | ภาพรวมทำมาดีมาก แต่ขอสอบถามจุด UX ใน `reloadAfterConflict()` ที่เรียก `setResolveOpen(false)` ทำให้พอกด Reload แล้ว Modal ปิดลง ถึงข้อความ draft จะยังอยู่ แต่ผู้ใช้ต้องไปเลือก RESOLVED จาก dropdown ใหม่อีกครั้ง ตั้งใจปิดเพื่อให้ผู้ใช้ดูข้อมูลตั๋วล่าสุดก่อน หรือควรให้ Modal เปิดค้างไว้แล้ว refresh version ในพื้นหลังดีกว่า | ตอบว่าตั้งใจปิด Modal หลัง Reload เพื่อให้ staff เห็นข้อมูลล่าสุดของตั๋วก่อนตัดสินใจ Resolve อีกครั้งตาม safety flow โดย summary draft ยังเก็บไว้ใน state ไม่สูญหาย | Approved |
| `feature/l4-4-actions-taken-ui` | https://github.com/krittaphato3/TokTickIT/pull/64 | (inline) ใน `ActionsTaken.tsx` สร้าง action แล้ววางบนสุดตลอด (`[created, ...prev]`) แต่ spec ให้เรียงตาม `actionAt DESC` แล้วตาม `id DESC` ถ้าย้อนวันที่หรือแก้วันที่ตอน edit แถวจะอยู่ผิดที่ ควร sort ใหม่หลัง create/edit | เพิ่มฟังก์ชัน `sortActions()` เรียงตาม `actionAt DESC` และ `id DESC` (BR-05) ใช้ทั้งตอน initial load, create, update และ conflict reload พร้อมเทส UI-03d ครอบคลุมเคสบันทึกย้อนหลัง ผมตอบกลับว่า "ทำดีมาก" | Approved |
| `feature/lab4-docs-prepare` | https://github.com/atiwit/toktickit/pull/64 | ไฟล์ document spec ต่างๆ เขียนเรียบร้อยดีครับ | ตรวจสอบความเรียบร้อย | Approved |
| `feature/lab4-actions-foundation` | https://github.com/atiwit/toktickit/pull/65 | (1) PATCH ไม่ validate `attachmentNotes` ส่งเกิน 1000 ตัวหรือไม่ใช่ string แล้วได้ 500 แทน 400 ให้แยก validator ใช้ร่วมกับ POST (2) ไม่ใช้ transaction `actionTaken.create/update` กับ `ticket.update({ updatedAt })` แยกกัน ถ้าตัวที่สองล้ม action ถูกบันทึกแล้วแต่ client ได้ 500 กดซ้ำจะเกิดรายการซ้ำ ให้ครอบด้วย `prisma.$transaction` | แยก shared validator `validateActionTakenPayload` ใช้ทั้ง POST และ PATCH (ได้ 400 แทน 500), ครอบ create/update ร่วมกับ ticket update ด้วย `prisma.$transaction`, เพิ่มเทส API-ACT-20 ถึง 24 (commit d23e205, 5843740) ผมตรวจซ้ำแล้วเห็นว่าแก้ตรงตามที่ comment | Approved |
| `feature/lab4-07-final-hardening-regression` | https://github.com/napatsun/TokTickIT/pull/63 | ตรวจดูเรียบร้อยแล้ว โดยรวมโอเค ครบทั้ง UI, test, screenshot 3 ขนาด ดีมาก | ตรวจสอบความเรียบร้อย | Approved |
| `fix/lab4-dashboard-gap-fix` | https://github.com/napatsun/TokTickIT/pull/65 | โดยรวมสำหรับ Issue นี้เรียบร้อยครบถ้วนดี ผ่าน | ตรวจสอบความเรียบร้อย | Approved |

---

## 5. Evidence Checklist (สำหรับ Answer Part 1)

- [x] ทุก PR ของผมได้รับ approve จาก peer reviewer และมีลิงก์ถูกต้อง (#63 ถึง #70 และ release PR #71)
- [x] มีหลักฐานว่าผม review และ approve PR ของเพื่อนอย่างน้อยหนึ่งอัน พร้อมคอมเมนต์ที่ให้และคำตอบของเพื่อน (เช่น atiwit/toktickit#65, krittaphato3/TokTickIT#63 และ #64)
- [x] Kanban บน GitHub Project มีทุก Issue (#57-#62) อยู่ในสถานะ Done
- [x] screenshot commit history บน `main` เห็น feature branch ถูก merge เข้า `lab4-staging` แล้วเข้า `main`
