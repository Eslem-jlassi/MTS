package com.billcom.mts.dto.ticket;

import lombok.Builder;
import lombok.Data;
import org.springframework.core.io.Resource;

/**
 * DTO pour le téléchargement d'une pièce jointe (ressource + nom de fichier pour Content-Disposition).
 */
@Data
@Builder
public class AttachmentDownloadDto {
    private Resource resource;
    private String fileName;
}
