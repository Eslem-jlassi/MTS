import { detectPreferredChatLanguage, resolveChatLanguage } from "./chatbotLanguage";

describe("chatbotLanguage", () => {
  it("detects French when the user writes mainly in French", () => {
    expect(
      detectPreferredChatLanguage(
        "Bonjour, peux-tu analyser cet incident BSCS depuis 09h avec impact utilisateur ?",
      ),
    ).toBe("fr");
  });

  it("detects English when the user writes mainly in English", () => {
    expect(
      detectPreferredChatLanguage(
        "Hello, can you analyze this BSCS incident since 09:00 with customer impact?",
      ),
    ).toBe("en");
  });

  it("sanitizes invalid language values with a safe fallback", () => {
    expect(resolveChatLanguage("de", "fr")).toBe("fr");
    expect(resolveChatLanguage("en", "fr")).toBe("en");
  });
});
