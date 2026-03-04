package com.billcom.mts.service;

import com.billcom.mts.dto.ticket.BulkAssignRequest;
import com.billcom.mts.dto.ticket.BulkPriorityRequest;
import com.billcom.mts.dto.ticket.BulkStatusRequest;
import com.billcom.mts.dto.ticket.BulkResultDto;
import com.billcom.mts.entity.User;

/**
 * ============================================================================
 * TicketBulkOperationService - Service for Bulk Ticket Operations
 * ============================================================================
 * 
 * REFACTORING FIX: Extracted from TicketServiceImpl to separate concerns
 * 
 * RESPONSIBILITIES:
 * - Bulk assignment of multiple tickets to an agent
 * - Bulk status change for multiple tickets
 * - Bulk priority change for multiple tickets
 * - Transaction management for bulk operations
 * - Error handling and partial success reporting
 * 
 * BULK OPERATION BENEFITS:
 * - Performance: Single transaction for multiple updates
 * - Consistency: All-or-nothing or partial success with reporting
 * - Auditability: Single audit log entry for bulk action
 * - UX: Users can manage multiple tickets efficiently
 * 
 * ============================================================================
 */
public interface TicketBulkOperationService {

    /**
     * Bulk assign multiple tickets to an agent.
     * 
     * @param request Bulk assign request with ticket IDs and target agent
     * @param currentUser Current authenticated user (must have ASSIGN permission)
     * @param ipAddress Client IP address for audit trail
     * @return Result with success/failure counts and details
     */
    BulkResultDto bulkAssign(BulkAssignRequest request, User currentUser, String ipAddress);

    /**
     * Bulk change status for multiple tickets.
     * 
     * @param request Bulk status change request
     * @param currentUser Current authenticated user
     * @param ipAddress Client IP address for audit trail
     * @return Result with success/failure counts and details
     */
    BulkResultDto bulkStatusChange(BulkStatusRequest request, User currentUser, String ipAddress);

    /**
     * Bulk change priority for multiple tickets.
     * 
     * @param request Bulk priority change request
     * @param currentUser Current authenticated user
     * @param ipAddress Client IP address for audit trail
     * @return Result with success/failure counts and details
     */
    BulkResultDto bulkPriorityChange(BulkPriorityRequest request, User currentUser, String ipAddress);
}
