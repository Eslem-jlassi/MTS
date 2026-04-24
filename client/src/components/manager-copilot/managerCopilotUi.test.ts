import { UserRole } from "../../types";
import { isManagerCopilotAllowedRole } from "./managerCopilotUi";

describe("isManagerCopilotAllowedRole", () => {
  it("accepts MANAGER only", () => {
    expect(isManagerCopilotAllowedRole(UserRole.MANAGER)).toBe(true);
    expect(isManagerCopilotAllowedRole(UserRole.ADMIN)).toBe(false);
    expect(isManagerCopilotAllowedRole(UserRole.AGENT)).toBe(false);
    expect(isManagerCopilotAllowedRole(UserRole.CLIENT)).toBe(false);
    expect(isManagerCopilotAllowedRole(undefined)).toBe(false);
  });
});
