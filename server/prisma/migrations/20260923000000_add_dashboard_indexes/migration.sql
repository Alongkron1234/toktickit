-- CreateIndex
CREATE INDEX "Ticket_requesterId_currentStatus_idx" ON "Ticket"("requesterId", "currentStatus");

-- CreateIndex
CREATE INDEX "Ticket_currentStatus_updatedAt_idx" ON "Ticket"("currentStatus", "updatedAt");
