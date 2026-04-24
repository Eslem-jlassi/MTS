import React, { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Book,
  ChevronDown,
  Cloud,
  FileText,
  Phone,
  Search,
  Server,
  ShieldAlert,
  Wifi,
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

interface QuickGuide {
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface CoveredService {
  name: string;
  detail: string;
}

interface FAQAccordionProps {
  faq: FAQItem;
}

const FAQAccordion: React.FC<FAQAccordionProps> = ({ faq }) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = `faq-panel-${faq.id}`;

  return (
    <article className="group overflow-hidden rounded-2xl border border-ds-border/90 bg-ds-card/95 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left focus:outline-none focus:ring-2 focus:ring-primary/25"
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <div className="min-w-0 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200/80 bg-primary-50/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/15 dark:text-primary-200">
            <FileText size={11} className="opacity-70" />
            {faq.category}
          </span>
          <p className="text-sm font-semibold leading-snug text-ds-primary sm:text-[0.96rem]">
            {faq.question}
          </p>
          <p className="text-xs leading-relaxed text-ds-muted line-clamp-2">
            {faq.answerText}
          </p>
        </div>
        <ChevronDown
          size={18}
          className={`mt-1 shrink-0 text-ds-muted transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : "group-hover:text-primary/60"}`}
          aria-hidden
        />
      </button>
      {isOpen && (
        <div id={panelId} className="border-t border-ds-border bg-ds-surface/35 px-5 pb-5 pt-4">
          <div className="prose-sm text-sm leading-relaxed text-ds-secondary">{faq.answer}</div>
        </div>
      )}
    </article>
  );
};

const FAQS: FAQItem[] = [
  {
    id: "faq-1",
    category: "Réseau mobile et fibre",
    question: "Comment vérifier s'il s'agit d'une panne réseau globale sur ma zone ?",
    searchText:
      "panne reseau globale zone mobile fibre signal modem ftth voyant los rouge health monitoring antennes noeuds raccordement ticket technique",
    answerText:
      "Redémarrez vos équipements, vérifiez la supervision des antennes et nœuds, puis ouvrez un ticket technique si le voyant LOS reste actif.",
    answer: (
      <div className="space-y-2">
        <p>En cas de perte totale de signal mobile ou de voyant rouge sur votre modem fibre :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Redémarrez vos équipements (smartphone, box ou routeur).</li>
          <li>
            Consultez le module de supervision pour vérifier le statut des antennes ou des nœuds
            proches.
          </li>
          <li>
            Si le voyant LOS clignote toujours, créez un ticket technique avec l'adresse du site
            impacté.
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
      "Vérifiez débit, QoS, codec et pertes de paquets puis joignez ping ou traceroute au ticket support.",
    answer: (
      <div className="space-y-2">
        <p>
          Une latence VoIP élevée provient souvent d'une gigue réseau importante ou d'une saturation
          locale.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Vérifiez le débit disponible et priorisez le trafic voix dans vos règles QoS.</li>
          <li>Contrôlez le codec utilisé et les pertes de paquets sur votre trunk SIP.</li>
          <li>Ajoutez un ping ou un traceroute au ticket pour accélérer le diagnostic support.</li>
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
      "Un incident CRM BSCS ralentit création de comptes, facturation et synchronisation sans couper forcément les services actifs.",
    answer: (
      <div className="space-y-2">
        <p>
          Un incident sur le CRM ou sur BSCS impacte généralement la création de comptes, la
          facturation ou la synchronisation entre applications support.
        </p>
        <p>
          Vos services déjà actifs ne sont pas forcément coupés, mais certaines opérations
          commerciales ou administratives peuvent être ralenties le temps du rétablissement.
        </p>
      </div>
    ),
  },
  {
    id: "faq-4",
    category: "Hébergement cloud",
    question: "Comment accéder à un serveur VPS devenu injoignable ?",
    searchText:
      "serveur vps cloud injoignable ssh rdp ping console vnc web out of band kernel panic firewall boot",
    answerText:
      "Utilisez la console de secours pour vérifier boot, firewall et services réseau avant de compléter le ticket.",
    answer: (
      <div className="space-y-2">
        <p>
          Si le ping, SSH ou RDP ne répondent plus, ouvrez la console de secours depuis la rubrique
          des services télécom.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Vérifiez le dernier redémarrage et l'état du système.</li>
          <li>Contrôlez les règles firewall et le service réseau.</li>
          <li>
            Ajoutez une capture ou un message d'erreur au ticket si le serveur ne boote plus
            correctement.
          </li>
        </ul>
      </div>
    ),
  },
];

const QUICK_GUIDES: QuickGuide[] = [
  {
    title: "Configuration APN entreprise",
    description: "Activer un profil APN privé pour les lignes mobiles B2B.",
    icon: <Wifi size={18} />,
  },
  {
    title: "Déclaration d'un lien P2P indisponible",
    description: "Structurer les infos critiques avant ouverture du ticket.",
    icon: <ShieldAlert size={18} />,
  },
  {
    title: "Paramétrage trunk SIP",
    description: "Vérifier codecs, ports SIP et prérequis QoS opérateur.",
    icon: <Phone size={18} />,
  },
  {
    title: "Extension de stockage web",
    description: "Préparer une demande propre avec capacité et fenêtre de tir.",
    icon: <Server size={18} />,
  },
];

const COVERED_SERVICES: CoveredService[] = [
  { name: "Réseau interne", detail: "LAN, WAN et interconnexion site à site" },
  { name: "Mobile B2B", detail: "Flottes, APN privés et couverture radio" },
  { name: "VoIP et SIP", detail: "Qualité voix, trunks et routage appels" },
  { name: "Hébergement VPS", detail: "Serveurs cloud, accès et supervision" },
  { name: "Fibre FTTH / FTTO", detail: "Disponibilité lien et incidents LOS" },
  { name: "SD-WAN", detail: "Priorisation flux et résilience multi-liens" },
  { name: "Sécurité firewalls", detail: "Règles ACL, NAT et contrôle trafic" },
  { name: "Billing", detail: "CRM, BSCS et parcours de facturation" },
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

  const faqCategoryCount = useMemo(() => new Set(FAQS.map((faq) => faq.category)).size, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader
        title="Base de connaissances"
        description="FAQ, guides rapides et procédures de résolution pour les opérations télécom."
        icon={<Book size={20} />}
      />

      <Card padding="lg" className="relative overflow-hidden border border-ds-border/80 shadow-card-hover">
        <div className="pointer-events-none absolute -top-20 right-0 h-56 w-56 rounded-full bg-primary/10 blur-3xl dark:bg-primary/25" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-44 w-44 rounded-full bg-info-500/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-ds-border bg-ds-elevated/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ds-secondary">
              <Book size={14} />
              Support opérationnel
            </span>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-ds-primary">
                Trouver rapidement la bonne procédure
              </h2>
              <p className="max-w-2xl text-sm text-ds-secondary">
                Recherchez un mot-clé pour filtrer les cas les plus fréquents. Le contenu reste
                orienté support, avec des réponses actionnables.
              </p>
            </div>
            <label htmlFor="knowledge-search" className="relative block">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ds-muted"
                size={18}
              />
              <input
                id="knowledge-search"
                type="text"
                placeholder="Ex: fibre, VoIP, latence, VPS..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-12 w-full rounded-xl border border-ds-border bg-ds-card pl-11 pr-4 text-sm text-ds-primary shadow-sm transition-all placeholder:text-ds-muted focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ds-border bg-ds-surface px-2.5 py-1 font-medium text-ds-secondary">
                <FileText size={12} className="text-primary opacity-60" />
                {FAQS.length} questions
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ds-border bg-ds-surface px-2.5 py-1 font-medium text-ds-secondary">
                <Book size={12} className="text-info-500 opacity-60" />
                {faqCategoryCount} catégories
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-500/30 dark:bg-primary-500/12 dark:text-primary-200"
                >
                  Effacer la recherche
                </button>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-ds-border/90 bg-ds-surface/60 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-ds-primary">Parcours fréquents</h3>
            <p className="mt-1 text-xs text-ds-muted">
              Entrées les plus utilisées pendant le triage des incidents.
            </p>
            <div className="mt-4 space-y-2">
              {QUICK_GUIDES.slice(0, 3).map((guide) => (
                <div
                  key={guide.title}
                  className="flex items-start justify-between gap-3 rounded-xl border border-ds-border bg-ds-card px-3 py-3 transition-colors hover:bg-ds-elevated/55"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ds-primary">{guide.title}</p>
                    <p className="mt-0.5 text-xs text-ds-muted">{guide.description}</p>
                  </div>
                  <ArrowUpRight size={16} className="mt-0.5 shrink-0 text-ds-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Card padding="md" className="border border-ds-border/80">
            <div className="border-b border-ds-border pb-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-ds-primary">
                <Book size={17} className="text-primary" />
                Guides rapides
              </h4>
              <p className="mt-1 text-xs text-ds-muted">Procédures essentielles pour le support télécom.</p>
            </div>
            <div className="mt-3 space-y-2">
              {QUICK_GUIDES.map((guide) => (
                <button
                  key={guide.title}
                  type="button"
                  className="group flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition-all duration-200 hover:border-ds-border hover:bg-ds-surface/60 hover:shadow-sm"
                >
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary-200/60 bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100 dark:border-primary-500/20 dark:bg-primary-500/15 dark:text-primary-300">
                    {guide.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ds-primary">{guide.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ds-muted">{guide.description}</span>
                  </span>
                  <ArrowUpRight size={14} className="mt-1 shrink-0 text-ds-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </Card>

          <Card padding="md" className="border border-ds-border/80">
            <div className="border-b border-ds-border pb-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-ds-primary">
                <Cloud size={17} className="text-info-500" />
                Services couverts
              </h4>
              <p className="mt-1 text-xs text-ds-muted">{COVERED_SERVICES.length} domaines pris en charge.</p>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {COVERED_SERVICES.map((service) => (
                <div
                  key={service.name}
                  className="flex items-center gap-3 rounded-xl border border-ds-border bg-ds-surface/45 px-3 py-2.5 transition-colors hover:bg-ds-surface/70"
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-info-50 text-info-500 dark:bg-info-500/10">
                    <Server size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ds-primary">{service.name}</p>
                    <p className="mt-0.5 text-xs text-ds-muted">{service.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </aside>

        <section className="space-y-4">
          <Card padding="md" className="border border-ds-border/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-base font-semibold text-ds-primary">
                <FileText size={18} className="text-ds-muted" />
                FAQ et résolutions
              </h3>
              <span className="rounded-full border border-ds-border bg-ds-surface px-2.5 py-1 text-xs font-medium text-ds-secondary">
                {searchQuery ? `${filteredFaqs.length} résultat(s)` : `${FAQS.length} entrée(s)`}
              </span>
            </div>
            <p className="mt-2 text-sm text-ds-secondary">
              Ouvrez chaque entrée pour voir les étapes de diagnostic recommandées.
            </p>
          </Card>

          {filteredFaqs.length > 0 ? (
            <div className="space-y-3">
              {filteredFaqs.map((faq) => (
                <FAQAccordion key={faq.id} faq={faq} />
              ))}
            </div>
          ) : (
            <Card padding="lg" className="border border-dashed border-ds-border text-center">
              <Search size={30} className="mx-auto text-ds-border-hover" />
              <p className="mt-3 font-semibold text-ds-primary">Aucun résultat trouvé</p>
              <p className="mt-1 text-sm text-ds-secondary">
                Essayez un autre mot-clé ou détaillez l'incident dans le chatbot client.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-500/30 dark:bg-primary-500/12 dark:text-primary-200"
              >
                Effacer la recherche
              </button>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
