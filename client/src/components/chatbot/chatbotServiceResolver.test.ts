import { resolveChatbotServiceMatch } from "./chatbotServiceResolver";

describe("chatbotServiceResolver", () => {
  const services = [
    { id: 1, name: "BSCS Billing System" },
    { id: 2, name: "CRM Ericsson" },
    { id: 3, name: "Data Migration Engine" },
  ];

  it("matches chatbot services using normalized exact names", () => {
    expect(resolveChatbotServiceMatch("  data migration engine  ", services)?.id).toBe(3);
  });

  it("matches known aliases used by legacy seeds", () => {
    expect(resolveChatbotServiceMatch("Billing System", services)?.id).toBe(1);
    expect(resolveChatbotServiceMatch("CRM Platform", services)?.id).toBe(2);
  });

  it("returns a provisional candidate when the service is still unknown", () => {
    expect(resolveChatbotServiceMatch("Unknown Service", services)).toEqual({
      id: -1,
      name: "Unknown Service",
    });
  });
});
