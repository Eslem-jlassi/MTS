package com.billcom.mts.dto.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Graphe de dépendances services pour la page topologie. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopologyResponse {

    private List<ServiceNode> nodes;
    private List<Edge> edges;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ServiceNode {
        private Long id;
        private String name;
        private String status;
        private String category;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Edge {
        private Long parentId;
        private Long childId;
        private String parentName;
        private String childName;
    }
}
