import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { reportService } from "../api/reportService";
import { telecomServiceService } from "../api/telecomServiceService";
import { clientService } from "../api/clientService";
import ReportsPage from "./ReportsPage";

jest.mock("../api/reportService", () => ({
  reportService: {
    getReports: jest.fn(),
    getReportById: jest.fn(),
    upload: jest.fn(),
    reuploadFile: jest.fn(),
    download: jest.fn(),
    generate: jest.fn(),
    searchReports: jest.fn(),
    publish: jest.fn(),
    unpublish: jest.fn(),
    deleteReport: jest.fn(),
  },
}));

jest.mock("../api/telecomServiceService", () => ({
  telecomServiceService: {
    getServices: jest.fn(),
  },
}));

jest.mock("../api/clientService", () => ({
  clientService: {
    getClients: jest.fn(),
  },
}));

const baseReport = {
  id: 7,
  title: "Rapport hebdomadaire supervision",
  description: "Suivi hebdomadaire SLA",
  reportType: "WEEKLY",
  periodStart: "2026-04-01",
  periodEnd: "2026-04-07",
  fileName: "weekly-report.pdf",
  fileSize: 312000,
  createdByName: "Sara El Fassi",
  downloadCount: 0,
  isPublished: true,
  source: "GENERATED",
  createdAt: "2026-04-07T10:00:00",
};

describe("ReportsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (reportService.getReports as jest.Mock).mockResolvedValue({
      content: [baseReport],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 100,
    });

    (reportService.getReportById as jest.Mock).mockResolvedValue({
      ...baseReport,
      executiveSummary: "=== Priorites ===\nSLA stable\nALERTE: backlog a surveiller",
    });

    (telecomServiceService.getServices as jest.Mock).mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 200,
    });

    (clientService.getClients as jest.Mock).mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 200,
    });
  });

  it("loads report list and opens executive summary panel", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ReportsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reportService.getReports).toHaveBeenCalledWith({ page: 0, size: 100 });
    });

    expect(await screen.findByText("Rapport hebdomadaire supervision")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Voir le resume executif"));

    await waitFor(() => {
      expect(reportService.getReportById).toHaveBeenCalledWith(7);
    });

    expect(await screen.findByText(/executif/i)).toBeInTheDocument();
    expect(screen.getByText("Priorites")).toBeInTheDocument();
    expect(screen.getByText(/backlog a surveiller/i)).toBeInTheDocument();
  });
});
