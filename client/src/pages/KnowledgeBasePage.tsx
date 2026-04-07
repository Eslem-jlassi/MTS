import React, { useMemo, useState } from "react";
import {
  Book,
  Cloud,
  FileText,
  Phone,
  Search,
  Server,
  ShieldAlert,
  Wifi,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { Card } from "../components/ui";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: React.ReactNode;
  searchText: string;
  answerText: string;
}

interface FAQAccordionProps {
  question: string;
  answer: React.ReactNode;
}

const FAQAccordion: React.FC<FAQAccordionProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-ds-border bg-ds-card transition-colors hover:border-ds-border-hover">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between px-5 py-4 text-left focus:outline-none focus:ring-2 focus:ring-accent-500/20"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium text-ds-primary">{question}</span>
        {isOpen ? (
          <ChevronUp className="ml-4 shrink-0 text-ds-muted" size={18} />
        ) : (
          <ChevronDown className="ml-4 shrink-0 text-ds-muted" size={18} />
        )}
      </button>
      {isOpen && (
        <div className="border-t border-ds-border bg-ds-surface/30 px-5 pb-5 pt-3 text-sm leading-relaxed text-ds-secondary">
          {answer}
        </div>
      )}
    </div>
  );
};

const FAQS: FAQItem[] = [
  {
    id: "faq-1",
    category: "Reseau mobile et fibre",
    question: "Comment verifier s'il s'agit d'une panne reseau globale sur ma zone ?",
    searchText:
      "panne reseau globale zone mobile fibre signal modem ftth voyant los rouge health monitoring antennes noeuds raccordement ticket technique",
    answerText:
      "Redemarrez vos equipements, verifiez la supervision des antennes et noeuds, puis ouvrez un ticket technique si le voyant LOS reste actif.",
    answer: (
      <div className="space-y-2">
        <p>En cas de perte totale de signal mobile ou de voyant rouge sur votre modem fibre :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Redemarrez vos equipements (smartphone, box ou routeur).</li>
          <li>
            Consultez le module de supervision pour verifier le statut des antennes ou des noeuds
            proches.
          </li>
          <li>
            Si le voyant LOS clignote toujours, creez un ticket technique avec l'adresse du site
            impacte.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "faq-2",
    category: "VoIP et SIP",
    question: "Pourquoi mes appels VoIP ont-ils un echo ou une forte latence ?",
    searchText:
      "voip sip echo latence gigue jitter qos bande passante ping codec g711 g729 traceroute helpdesk",
    answerText:
      "Verifiez debit, QoS, codec et pertes de paquets puis joignez ping ou traceroute au ticket support.",
    answer: (
      <div className="space-y-2">
        <p>
          Une latence VoIP elevee provient souvent d'une gigue reseau importante ou d'une saturation
          locale.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Verifiez le debit disponible et priorisez le trafic voix dans vos regles QoS.</li>
          <li>Controlez le codec utilise et les pertes de paquets sur votre trunk SIP.</li>
          <li>Ajoutez un ping ou un traceroute au ticket pour accelerer le diagnostic support.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "faq-3",
    category: "Billing et CRM",
    question: "Que signifie un incident CRM ou BSCS dans mon suivi ?",
    searchText:
      "incident crm bscs billing facturation creation lignes forfaits comptes b2b synchronisation services actifs",
    answerText:
      "Un incident CRM BSCS ralentit creation de comptes, facturation et synchronisation sans couper forcement les services actifs.",
    answer: (
      <div className="space-y-2">
        <p>
          Un incident sur le CRM ou sur BSCS impacte generalement la creation de comptes, la
          facturation ou la synchronisation entre applications support.
        </p>
        <p>
          Vos services deja actifs ne sont pas forcement coupes, mais certaines operations
          commerciales ou administratives peuvent etre ralenties le temps du retablissement.
        </p>
      </div>
    ),
  },
  {
    id: "faq-4",
    category: "Hebergement cloud",
    question: "Comment acceder a un serveur VPS devenu injoignable ?",
    searchText:
      "serveur vps cloud injoignable ssh rdp ping console vnc web out of band kernel panic firewall boot",
    answerText:
      "Utilisez la console de secours pour verifier boot, firewall et services reseau avant de completer le ticket.",
    answer: (
      <div className="space-y-2">
        <p>
          Si le ping, SSH ou RDP ne repondent plus, ouvrez la console de secours depuis la rubrique
          des services telecom.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Verifiez le dernier redemarrage et l'etat du systeme.</li>
          <li>Controlez les regles firewall et le service reseau.</li>
          <li>
            Ajoutez une capture ou un message d'erreur au ticket si le serveur ne boote plus
            correctement.
          </li>
        </ul>
      </div>
    ),
  },
];

const QUICK_GUIDES = [
  { title: "Configuration APN entreprise", icon: <Wifi size={20} /> },
  { title: "Declaration d'un lien P2P indisponible", icon: <ShieldAlert size={20} /> },
  { title: "Parametrage trunk SIP", icon: <Phone size={20} /> },
  { title: "Extension de stockage web", icon: <Server size={20} /> },
];

const COVERED_SERVICES = [
  "Reseau interne",
  "Mobile B2B",
  "VoIP et SIP",
  "Hebergement VPS",
  "Fibre FTTH / FTTO",
  "SD-WAN",
  "Securite firewalls",
  "Billing",
];

const normalizeSearch = (value: string): string => value.trim().toLowerCase();

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = useMemo(() => {
    const query = normalizeSearch(searchQuery);
    if (!query) {
      return FAQS;
    }

    return FAQS.filter((faq) =>
      [faq.category, faq.question, faq.searchText, faq.answerText].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [searchQuery]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <PageHeader
        title="Base de connaissances"
        description="FAQ, resolutions de problemes courants et guides pratiques pour vos services telecom."
      />

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent-600 to-accent-800 p-8 text-center text-white shadow-lg sm:p-12">
        <div className="relative z-10 mx-auto max-w-2xl">
          <h2 className="mb-3 text-2xl font-bold sm:text-3xl">Comment pouvons-nous vous aider ?</h2>
          <p className="mb-8 text-sm text-accent-100 sm:text-base">
            Recherchez un mot-cle ou parcourez les questions les plus frequentes.
          </p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Ex: fibre, VoIP, latence, VPS..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-14 w-full rounded-xl border-0 bg-white pl-12 pr-4 text-ds-primary shadow-inner transition-shadow focus:ring-4 focus:ring-accent-400/50 dark:bg-ds-surface"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-1">
          <Card>
            <div className="border-b border-ds-border pb-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-ds-primary">
                <Book size={18} className="text-accent-500" />
                Guides rapides
              </h4>
            </div>
            <div className="px-2 pt-4">
              <div className="flex flex-col gap-1">
                {QUICK_GUIDES.map((guide) => (
                  <button
                    key={guide.title}
                    type="button"
                    className="group flex items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-ds-surface"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-50 text-accent-500 transition-transform group-hover:scale-110 dark:bg-accent-900/20">
                      {guide.icon}
                    </div>
                    <span className="text-sm font-medium text-ds-secondary transition-colors group-hover:text-accent-500">
                      {guide.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="border-b border-ds-border pb-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-ds-primary">
                <Cloud size={18} className="text-info-500" />
                Services couverts
              </h4>
            </div>
            <div className="pt-4">
              <div className="flex flex-wrap gap-2">
                {COVERED_SERVICES.map((tag) => (
                  <span
                    key={tag}
                    className="cursor-default rounded-full border border-ds-border bg-ds-surface px-3 py-1 text-xs font-medium text-ds-muted transition-colors hover:border-info-400 hover:text-info-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="md:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ds-primary">
              <FileText className="text-ds-muted" size={20} />
              Questions frequentes
            </h3>
            {searchQuery && (
              <span className="rounded-md bg-ds-surface px-2 py-1 text-xs font-medium text-ds-muted">
                {filteredFaqs.length} resultat(s)
              </span>
            )}
          </div>

          <div className="space-y-4">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq) => (
                <div key={faq.id}>
                  <p className="mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-ds-muted">
                    {faq.category}
                  </p>
                  <FAQAccordion question={faq.question} answer={faq.answer} />
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-ds-border bg-ds-card px-4 py-12 text-center">
                <Book size={32} className="mx-auto mb-3 text-ds-border-hover" />
                <p className="font-medium text-ds-primary">Aucun resultat trouve</p>
                <p className="mt-1 text-sm text-ds-secondary">
                  Essayez un autre mot-cle ou utilisez le chatbot IA pour decrire votre incident.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
