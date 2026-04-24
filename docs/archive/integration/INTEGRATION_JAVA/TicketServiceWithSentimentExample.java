// =============================================================================
// MTS TELECOM - EXEMPLE D'UTILISATION DANS TicketService
// =============================================================================
/**
 * Montre comment intégrer l'analyse de sentiment dans le flux de création
 * de tickets existant.
 * 
 * SCÉNARIO PFE:
 * 1. Client crée un ticket: "Ça fait 3 jours que mon internet ne marche pas !!!"
 * 2. Microservice détecte: TRÈS NÉGATIF + Colère
 * 3. Backend applique automatiquement: Priorité URGENT + Flag émotionnel
 * 4. Manager reçoit une notification WebSocket
 * 5. Ticket traité en priorité
 * 
 * RÉSULTAT MÉTIER:
 * ✓ Satisfaction client améliorée (clients en colère traités rapidement)
 * ✓ Réduction du churn (clients qui partent chez concurrents)
 * ✓ SLA respectés (moins de tickets escaladés)
 */

import com.billcom.mts.client.SentimentAnalysisClient;
import com.billcom.mts.client.SentimentAnalysisClient.SentimentResponse;
import com.billcom.mts.dto.ticket.CreateTicketRequest;
import com.billcom.mts.entity.Ticket;
import com.billcom.mts.enums.Priority;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TicketServiceWithSentimentExample {

    private final SentimentAnalysisClient sentimentClient;
    // ... autres dépendances (repositories, etc.)

    /**
     * Crée un ticket avec analyse de sentiment automatique.
     * 
     * JURY - FLUX COMPLET:
     * ┌─────────┐   1. Créer ticket    ┌──────────────┐
     * │ Client  │ ──────────────────> │   Backend    │
     * │ (React) │                      │ Spring Boot  │
     * └─────────┘                      └──────┬───────┘
     *                                         │ 2. Analyser
     *                                         ▼ sentiment
     *                                  ┌──────────────┐
     *                                  │  Microservice│
     *                                  │   Python IA  │
     *                                  └──────┬───────┘
     *                                         │ 3. Résultat
     *                                         ▼
     *                                  Si URGENT_EMOTIONAL:
     *                                  - Priorité URGENT
     *                                  - Flag émotionnel
     *                                  - Notification manager
     */
    @Transactional
    public Ticket createTicketWithSentimentAnalysis(CreateTicketRequest request, Long clientId) {
        log.info("📝 Création ticket avec analyse sentiment | Client: {}", clientId);
        
        // 1. CRÉATION DU TICKET (LOGIQUE EXISTANTE)
        Ticket ticket = new Ticket();
        ticket.setTitle(request.getTitle());
        ticket.setDescription(request.getDescription());
        ticket.setPriority(request.getPriority());
        // ... autres champs
        
        // 2. ANALYSE DE SENTIMENT DU TEXTE
        String textToAnalyze = request.getDescription();
        if (textToAnalyze != null && !textToAnalyz.isBlank()) {
            analyzeSentimentAndAdjustPriority(ticket, textToAnalyze);
        }
        
        // 3. SAUVEGARDE
        // ticket = ticketRepository.save(ticket);
        
        // 4. NOTIFICATION SI URGENCE ÉMOTIONNELLE
        if (ticket.getPriority() == Priority.URGENT && 
            ticket.getEmotionalFlag() != null) {
            // notificationService.notifyManagerOfAngryCustomer(ticket);
            log.warn("🚨 URGENCE ÉMOTIONNELLE | Ticket: {} | Manager notifié", 
                     ticket.getId());
        }
        
        return ticket;
    }
    
    /**
     * Analyse le sentiment et ajuste la priorité si nécessaire.
     * 
     * LOGIQUE MÉTIER:
     * - Si client en colère ET priorité actuelle < URGENT
     *   → Upgrade vers URGENT
     * - Flag émotionnel ajouté pour traçabilité
     * - Logs pour audit
     */
    private void analyzeSentimentAndAdjustPriority(Ticket ticket, String text) {
        try {
            // Appel au microservice Python
            SentimentResponse sentiment = sentimentClient.analyzeSentiment(
                text, 
                ticket.getId() != null ? ticket.getId().intValue() : null
            );
            
            if (sentiment == null) {
                log.warn("⚠️ Analyse sentiment échouée, ticket créé sans analyse");
                return;
            }
            
            // STOCKAGE DU RÉSULTAT (optionnel - pour analytics)
            ticket.setSentimentScore(sentiment.stars());
            ticket.setSentimentLabel(sentiment.sentiment());
            
            // DÉTECTION URGENCE ÉMOTIONNELLE
            if (Boolean.TRUE.equals(sentiment.isAngry())) {
                log.warn("🔥 Client en colère détecté | Ticket: {} | Sentiment: {} | Stars: {}/5",
                         ticket.getId(), sentiment.sentiment(), sentiment.stars());
                
                // Upgrade priorité si pas déjà URGENT
                if (ticket.getPriority() != Priority.URGENT) {
                    ticket.setPriority(Priority.URGENT);
                    log.info("⬆️ Priorité upgradée vers URGENT (détection colère)");
                }
                
                // Ajout flag émotionnel
                ticket.setEmotionalFlag("URGENT_EMOTIONAL");
                ticket.setEmotionalConfidence(sentiment.confidence());
            }
            
        } catch (Exception e) {
            log.error("❌ Erreur lors de l'analyse sentiment (ticket créé quand même)", e);
            // IMPORTANT: On ne bloque pas la création du ticket si l'analyse échoue
        }
    }
}
