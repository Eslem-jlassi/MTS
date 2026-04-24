import { ServiceStatus, TicketPriority, TicketStatus, UserRole } from "../types";
import {
  getSlaTone,
  roleVisuals,
  ticketPriorityVisuals,
  ticketStatusVisuals,
  toneBadgeVariant,
} from "./uiSemantics";

describe("uiSemantics", () => {
  it("maps ticket priorities to the expected semantic tones", () => {
    expect(ticketPriorityVisuals[TicketPriority.CRITICAL].tone).toBe("danger");
    expect(ticketPriorityVisuals[TicketPriority.HIGH].tone).toBe("warning");
    expect(ticketPriorityVisuals[TicketPriority.MEDIUM].tone).toBe("info");
    expect(ticketPriorityVisuals[TicketPriority.LOW].tone).toBe("success");
  });

  it("maps key ticket statuses to stable badge variants", () => {
    expect(toneBadgeVariant(ticketStatusVisuals[TicketStatus.NEW].tone)).toBe("info");
    expect(toneBadgeVariant(ticketStatusVisuals[TicketStatus.ASSIGNED].tone)).toBe("ai");
    expect(toneBadgeVariant(ticketStatusVisuals[TicketStatus.ESCALATED].tone)).toBe("danger");
    expect(toneBadgeVariant(ticketStatusVisuals[TicketStatus.RESOLVED].tone)).toBe("success");
  });

  it("keeps role badges consistent with the visual hierarchy", () => {
    expect(roleVisuals[UserRole.CLIENT].tone).toBe("info");
    expect(roleVisuals[UserRole.AGENT].tone).toBe("success");
    expect(roleVisuals[UserRole.MANAGER].tone).toBe("ai");
    expect(roleVisuals[UserRole.ADMIN].tone).toBe("danger");
  });

  it("derives the SLA tone from the backend state only", () => {
    expect(getSlaTone({ breachedSla: true })).toBe("danger");
    expect(getSlaTone({ overdue: true })).toBe("danger");
    expect(getSlaTone({ slaWarning: true })).toBe("warning");
    expect(getSlaTone({ breachedSla: false, overdue: false, slaWarning: false })).toBe("success");
  });

  it("keeps service maintenance neutral", () => {
    expect(ServiceStatus.MAINTENANCE).toBe("MAINTENANCE");
  });
});
