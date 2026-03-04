package com.billcom.mts.service;

import com.billcom.mts.entity.User;
import com.billcom.mts.enums.TicketPriority;
import com.billcom.mts.enums.TicketStatus;

import java.time.LocalDateTime;

/**
 * ============================================================================
 * TicketExportService - Service for Ticket Export Operations
 * ============================================================================
 * 
 * REFACTORING FIX: Extracted from TicketServiceImpl to separate concerns
 * 
 * RESPONSIBILITIES:
 * - Export tickets to CSV format
 * - Export tickets to Excel (XLSX) format
 * - Export tickets to PDF format
 * - Apply user-specific filters based on role
 * - Generate properly formatted export files
 * 
 * SUPPORTED FORMATS:
 * 1. CSV: Comma-separated values for spreadsheet import
 * 2. Excel: Full formatting with Apache POI
 * 3. PDF: Printable reports with OpenPDF
 * 
 * ============================================================================
 */
public interface TicketExportService {

    /**
     * Export tickets to CSV format.
     * 
     * @param currentUser Current authenticated user (for filtering)
     * @param searchTerm Optional search term
     * @param status Optional status filter
     * @param priority Optional priority filter
     * @param startDate Optional start date filter
     * @param endDate Optional end date filter
     * @return CSV file as byte array
     */
    byte[] exportTicketsCsv(
        User currentUser,
        String searchTerm,
        TicketStatus status,
        TicketPriority priority,
        LocalDateTime startDate,
        LocalDateTime endDate
    );

    /**
     * Export tickets to Excel (XLSX) format.
     * 
     * @param currentUser Current authenticated user (for filtering)
     * @param searchTerm Optional search term
     * @param status Optional status filter
     * @param priority Optional priority filter
     * @param startDate Optional start date filter
     * @param endDate Optional end date filter
     * @return Excel file as byte array
     */
    byte[] exportTicketsExcel(
        User currentUser,
        String searchTerm,
        TicketStatus status,
        TicketPriority priority,
        LocalDateTime startDate,
        LocalDateTime endDate
    );

    /**
     * Export tickets to PDF format.
     * 
     * @param currentUser Current authenticated user (for filtering)
     * @param searchTerm Optional search term
     * @param status Optional status filter
     * @param priority Optional priority filter
     * @param startDate Optional start date filter
     * @param endDate Optional end date filter
     * @return PDF file as byte array
     */
    byte[] exportTicketsPdf(
        User currentUser,
        String searchTerm,
        TicketStatus status,
        TicketPriority priority,
        LocalDateTime startDate,
        LocalDateTime endDate
    );
}
