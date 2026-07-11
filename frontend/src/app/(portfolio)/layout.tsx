import Nav from "@/components/Nav";
import Breadcrumbs from "@/components/Breadcrumbs";
import Footer from "@/components/Footer";
import PumpkinChatButton from "@/components/PumpkinChatButton";
import ScrollToTop from "@/components/ScrollToTop";
import SearchModal from "@/components/SearchModal";
import IntroScreen from "@/components/IntroScreen";
import ScrollAtmosphere from "@/components/ScrollAtmosphere";
import SectionIndicator from "@/components/SectionIndicator";
import PageTransition from "@/components/PageTransition";
import ScrollProgress from "@/components/ScrollProgress";
import JsonLd from "@/components/JsonLd";
import { getSearchIndex } from "@/lib/searchIndex";
import { webSiteLd } from "@/lib/seo";

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={webSiteLd()} />
      <ScrollProgress />
      <IntroScreen />
      <ScrollAtmosphere />
      <SectionIndicator />
      <Nav />
      <SearchModal items={getSearchIndex()} />
      <main className="flex-1">
        <Breadcrumbs />
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
      <PumpkinChatButton />
      <ScrollToTop />
    </>
  );
}
