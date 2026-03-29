import React, { useState } from "react";
import { Search, Book, Wifi, Phone, Server, Cloud, ShieldAlert, ChevronDown, ChevronUp, FileText } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { Card } from "../components/ui";

/**
 * Composant interne pour l'accordéon des FAQ
 */
interface FAQAccordionProps {
  question: string;
  answer: React.ReactNode;
}

const FAQAccordion: React.FC<FAQAccordionProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-ds-border rounded-xl overflow-hidden mb-3 transition-colors hover:border-ds-border-hover bg-ds-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-5 py-4 flex justify-between items-center focus:outline-none focus:bg-ds-surface focus:ring-2 focus:ring-accent-500/20"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-ds-primary text-sm">{question}</span>
        {isOpen ? (
          <ChevronUp className="text-ds-muted shrink-0 ml-4" size={18} />
        ) : (
          <ChevronDown className="text-ds-muted shrink-0 ml-4" size={18} />
        )}
      </button>
      {isOpen && (
        <div className="px-5 pb-5 text-sm text-ds-secondary border-t border-ds-border bg-ds-surface/30 pt-3 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
};

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const faqs = [
    {
      id: "faq-1",
      category: "Réseau Mobile & Fibre",
      question: "Comment puis-je vérifier qu'il s'agit d'une panne réseau globale sur ma zone ?",
      answer: (
        <div className="space-y-2">
          <p>
            En cas de perte totale de signal (barres réseaux vides) ou de voyant rouge sur votre modem Fibre FTTH :
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Redémarrez vos équipements (smartphone ou box fibre).</li>
            <li>Si le problème persiste, vérifiez le bouton "Health Monitoring" dans votre tableau de bord MTS pour voir le statut des antennes ou noeuds de raccordement près de chez vous.</li>
            <li>En cas de voyant "LOS" rouge clignotant sur la box fibre, le câble optique est peut-être plié ou cassé. Créez un ticket technique.</li>
          </ul>
        </div>
      )
    },
    {
      id: "faq-2",
      category: "VoIP (Voix sur IP)",
      question: "Pourquoi mes appels VoIP ont-ils un écho ou une forte latence (plus d'une seconde) ?",
      answer: "La latence applicative sur la VoIP provient généralement de gigue réseau importante (Jitter) ou de saturation de bande passante locale. Assurez-vous d'utiliser un codec adapté (G.711 ou G.729) et priorisez le trafic voix dans les règles QoS de votre routeur entreprise. Si votre PING dépasse 150ms sur nos serveurs SIP, privilégiez le signalement au helpdesk avec une capture (traceroute) avant l'escalade MTS."
    },
    {
      id: "faq-3",
      category: "Billing & CRM",
      question: "Je vois un incident CRM BSCS dans mon suivi. Qu'est-ce que cela signifie ?",
      answer: "Le système BSCS valide et génère la facturation de gros pour les comptes B2B. Lorsqu'un incident impacte ce système, la création de nouvelles lignes, l'attribution des forfaits data, et l'émission des factures du mois en cours sont suspendus. Vos services réseaux actifs ne sont pas coupés. Nos ingénieurs travaillent à resynchroniser la base de données de facturation."
    },
    {
      id: "faq-4",
      category: "Hébergement Cloud",
      question: "Comment redémarrer ou accéder en mode secours à un serveur VPS Cloud injoignable ?",
      answer: "Si le ping, SSH ou le RDP ne répondent plus sur votre adresse IP publique VPS, accédez au panneau de contrôle depuis la zone 'Services Télécom' → 'Mes Serveurs'. Utilisez la Console VNC Web (accès Out-of-Band direct à la machine virtuelle) pour vérifier s'il s'agit d'un kernel panic, d'un firewall mal configuré (iptables/ufw bloquant le port 22), ou d'une erreur de boot."
    }
  ];

  const quickGuides = [
    { title: "Configuration APN d'entreprise", icon: <Wifi size={20} />, delay: "100" },
    { title: "Déclaration d'un lien P2P tombé", icon: <ShieldAlert size={20} />, delay: "200" },
    { title: "Paramétrage Trunk SIP", icon: <Phone size={20} />, delay: "300" },
    { title: "Agrandir le stockage Web", icon: <Server size={20} />, delay: "400" },
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof faq.answer === 'string' && faq.answer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Base de connaissances"
        description="Foire Aux Questions, résolutions de problèmes courants et tutoriels techniques pour vos services télécoms."
      />

      {/* Barre de Recherche (Hero) */}
      <div className="bg-gradient-to-br from-accent-600 to-accent-800 rounded-2xl p-8 sm:p-12 text-center text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Comment pouvons-nous vous aider ?</h2>
          <p className="text-accent-100 mb-8 text-sm sm:text-base">
            Trouvez rapidement vos réponses ou tapez un mot-clé (fibre, VoIP, latence)...
          </p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Ex: configuration routeur P2P..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 rounded-xl text-ds-primary shadow-inner border-0 focus:ring-4 focus:ring-accent-400/50 bg-white dark:bg-ds-surface transition-shadow"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Colonne de gauche: Quick accès & catégories */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <div className="pb-3 border-b border-ds-border">
              <h4 className="text-sm flex items-center gap-2 font-semibold text-ds-primary">
                <Book size={18} className="text-accent-500" /> Guides rapides
              </h4>
            </div>
            <div className="pt-4 px-2">
              <div className="flex flex-col gap-1">
                {quickGuides.map((guide, i) => (
                  <button key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-ds-surface text-left transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-accent-50 dark:bg-accent-900/20 text-accent-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {guide.icon}
                    </div>
                    <span className="text-sm font-medium text-ds-secondary group-hover:text-accent-500 transition-colors">{guide.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="pb-3 border-b border-ds-border">
              <h4 className="text-sm flex items-center gap-2 font-semibold text-ds-primary">
                <Cloud size={18} className="text-info-500" /> Services couverts
              </h4>
            </div>
            <div className="pt-4">
              <div className="flex flex-wrap gap-2">
                {["Réseau Interne", "Mobile B2B", "VoIP & SIP", "Hébergement VPS", "Fibre FTTH/FTTO", "SD-WAN", "Sécurité Firewalls", "Billing"].map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-ds-surface border border-ds-border rounded-full text-xs text-ds-muted font-medium cursor-default hover:border-info-400 hover:text-info-500 transition-colors">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Colonne de droite: La FAQ principale */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-ds-primary flex items-center gap-2">
               <FileText className="text-ds-muted" size={20} />
               Questions fréquentes
            </h3>
            {searchQuery && (
              <span className="text-xs text-ds-muted font-medium bg-ds-surface px-2 py-1 rounded-md">
                {filteredFaqs.length} résultat(s)
              </span>
            )}
          </div>

          <div className="space-y-4">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq) => (
                <div key={faq.id}>
                  <p className="text-xs font-bold text-ds-muted uppercase tracking-wider mb-2 ml-1">{faq.category}</p>
                  <FAQAccordion question={faq.question} answer={faq.answer} />
                </div>
              ))
            ) : (
              <div className="text-center py-12 px-4 border border-dashed border-ds-border rounded-xl bg-ds-card">
                <Book size={32} className="mx-auto text-ds-border-hover mb-3" />
                <p className="text-ds-primary font-medium">Aucun résultat trouvé</p>
                <p className="text-sm text-ds-secondary mt-1">
                  Essayez de formuler votre recherche différemment ou posez votre question au Chatbot IA.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
