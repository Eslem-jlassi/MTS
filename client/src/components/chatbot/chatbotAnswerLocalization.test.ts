import { normalizeAssistantAnswerToFrench } from "./chatbotAnswerLocalization";

describe("normalizeAssistantAnswerToFrench", () => {
  it("translates English labels and common telecom terms", () => {
    const input =
      "Root Cause: Network outage. Resolution: Restart the service. Workaround: Increase timeout.";

    const output = normalizeAssistantAnswerToFrench(input);

    expect(output).toContain("Cause probable :");
    expect(output).toContain("panne reseau");
    expect(output).toContain("Action recommandee :");
    expect(output).toContain("redemarrer le service");
    expect(output).toContain("Contournement possible :");
    expect(output).toContain("augmenter le delai d'attente");
  });

  it("keeps already-French answers readable", () => {
    const input =
      "Cause probable : Saturation lien international. Action recommandee : Redemarrage du routeur edge.";

    const output = normalizeAssistantAnswerToFrench(input);

    expect(output).toContain("Cause probable : Saturation lien international.");
    expect(output).toContain("Action recommandee : Redemarrage du routeur edge.");
  });

  it("supports Final Resolution label normalization", () => {
    const input = "Final Resolution: Issue resolved after restart.";
    const output = normalizeAssistantAnswerToFrench(input);

    expect(output).toContain("Resolution connue :");
    expect(output).toContain("incident");
    expect(output).toContain("resolu");
  });
});
