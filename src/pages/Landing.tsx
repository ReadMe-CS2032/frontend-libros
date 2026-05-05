import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  MapPin,
  ArrowLeftRight,
  MessageCircle,
  Star,
  ArrowRight,
  Users,
  ThumbsUp,
  Globe,
} from "lucide-react";

// ─── Static data ──────────────────────────────────────────────────────────────

const STATS = [
  { value: "12,000+", label: "Usuarios activos", icon: Users },
  { value: "48,000+", label: "Libros disponibles", icon: BookOpen },
  { value: "95%", label: "Satisfacción", icon: ThumbsUp },
  { value: "150+", label: "Ciudades", icon: Globe },
];

const FEATURES = [
  {
    icon: MapPin,
    title: "Encuentra libros cerca de ti",
    description:
      "Filtra por ciudad, barrio o distancia. Conecta con lectores en tu zona y organiza el intercambio sin complicaciones.",
    accent: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
  },
  {
    icon: ArrowLeftRight,
    title: "Vende, intercambia o dona",
    description:
      "Elige cómo quieres mover tu colección. Sin intermediarios, sin comisiones ocultas. Tú decides las condiciones.",
    accent: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    icon: MessageCircle,
    title: "Chat directo con el lector",
    description:
      "Negocia, coordina la entrega y resuelve dudas en tiempo real. Todo dentro de la plataforma, seguro y simple.",
    accent: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  {
    icon: Star,
    title: "Valoraciones verificadas",
    description:
      "Cada transacción genera una reseña real. Construye tu reputación y confía en quien está del otro lado.",
    accent: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Publica tu libro",
    description:
      "Sube una foto, describe el estado y elige si vendes, intercambias o donas. En menos de 2 minutos tu libro está visible.",
  },
  {
    number: "02",
    title: "Conecta con lectores",
    description:
      "Recibe solicitudes, chatea con los interesados y acuerda los detalles del intercambio directamente.",
  },
  {
    number: "03",
    title: "Intercambia y valora",
    description:
      "Concreta el intercambio, marca la transacción como completada y deja tu valoración para construir confianza.",
  },
];

const MOSAIC_BOOKS = [
  {
    cover: "https://covers.openlibrary.org/b/id/8228631-L.jpg",
    title: "Cien años de soledad",
    top: "0%",
    left: "8%",
    rotate: "-4deg",
    z: 3,
  },
  {
    cover: "https://covers.openlibrary.org/b/id/8575708-L.jpg",
    title: "1984",
    top: "2%",
    left: "50%",
    rotate: "3deg",
    z: 4,
  },
  {
    cover: "https://covers.openlibrary.org/b/id/8701710-L.jpg",
    title: "Dune",
    top: "30%",
    left: "0%",
    rotate: "2deg",
    z: 2,
  },
  {
    cover: "https://covers.openlibrary.org/b/id/8579166-L.jpg",
    title: "La sombra del viento",
    top: "32%",
    left: "40%",
    rotate: "-2deg",
    z: 5,
  },
  {
    cover: "https://covers.openlibrary.org/b/id/8228250-L.jpg",
    title: "Harry Potter",
    top: "62%",
    left: "10%",
    rotate: "3deg",
    z: 3,
  },
  {
    cover: "https://covers.openlibrary.org/b/id/12023978-L.jpg",
    title: "El nombre de la rosa",
    top: "60%",
    left: "50%",
    rotate: "-3deg",
    z: 2,
  },
];

const AVATAR_SEEDS = ["ana", "carlos", "lucia", "darlene"];
const FOOTER_LINKS = [
  {
    heading: "Producto",
    links: ["Explorar", "Publicar libro", "Cómo funciona", "Precios"],
  },
  {
    heading: "Comunidad",
    links: ["Blog", "Eventos", "Foro de lectores", "Newsletter"],
  },
  {
    heading: "Empresa",
    links: ["Sobre nosotros", "Privacidad", "Términos", "Contacto"],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-foreground overflow-x-hidden">
      <Navbar scrolled={scrolled} />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ scrolled }: { scrolled: boolean }) {
  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-bold text-xl"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-md shadow-violet-200">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          ReadMe
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Explorar", href: "#features" },
            { label: "Cómo funciona", href: "#how-it-works" },
            { label: "Comunidad", href: "#stats" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md hover:shadow-violet-200"
          >
            Registrarse
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] bg-violet-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-40 w-[500px] h-[500px] bg-purple-200/30 rounded-full blur-3xl" />
      </div>

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle, #a78bfa 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 py-24 w-full grid lg:grid-cols-2 gap-16 items-center">
        {/* Left — text */}
        <div className="space-y-8">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.08]">
            Conecta con lectores.{" "}
            <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-violet-800 bg-clip-text text-transparent">
              Intercambia historias.
            </span>
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
            La plataforma donde los libros encuentran nuevos lectores. Vende,
            intercambia o dona tu colección y descubre miles de títulos cerca de
            ti.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-200 active:scale-[0.98]"
            >
              Empieza gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 bg-white border border-border text-foreground font-medium px-7 py-3.5 rounded-xl transition-all hover:border-violet-300 hover:bg-violet-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <BookOpen className="w-4 h-4 text-violet-600" />
              Explorar libros
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex -space-x-2.5">
              {AVATAR_SEEDS.map((seed) => (
                <img
                  key={seed}
                  src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`}
                  className="w-8 h-8 rounded-full border-2 border-white bg-violet-100"
                  alt=""
                />
              ))}
            </div>
            <span>
              Más de{" "}
              <strong className="text-foreground font-semibold">12,000</strong>{" "}
              lectores activos
            </span>
          </div>
        </div>

        {/* Right — book mosaic */}
        <div className="hidden lg:block relative h-[520px] select-none">
          {MOSAIC_BOOKS.map((book) => (
            <div
              key={book.title}
              className="absolute w-[128px] transition-all duration-300 hover:scale-105 hover:-translate-y-2"
              style={{
                top: book.top,
                left: book.left,
                transform: `rotate(${book.rotate})`,
                zIndex: book.z,
              }}
            >
              <div className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-black/10">
                <img
                  src={book.cover}
                  alt={book.title}
                  className="w-full aspect-[2/3] object-cover"
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.style.display = "none";
                    const parent = el.parentElement!;
                    parent.style.background =
                      "linear-gradient(135deg,#ede9fe,#ddd6fe)";
                    parent.style.aspectRatio = "2/3";
                  }}
                />
              </div>
            </div>
          ))}

          {/* Floating stat badge */}
          <div
            className="absolute bottom-6 right-0 bg-white/90 backdrop-blur-sm border border-border rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3"
            style={{ zIndex: 10 }}
          >
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
              <ArrowLeftRight className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Esta semana</p>
              <p className="text-sm font-semibold">847 intercambios</p>
            </div>
          </div>

          {/* Second badge */}
          <div
            className="absolute top-8 right-2 bg-white/90 backdrop-blur-sm border border-border rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3"
            style={{ zIndex: 10 }}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valoración media</p>
              <p className="text-sm font-semibold">4.9 / 5.0</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function StatsSection() {
  return (
    <section id="stats" className="border-y border-border bg-white">
      <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map(({ value, label, icon: Icon }) => (
          <div key={label} className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-violet-50 mb-1">
              <Icon className="w-5 h-5 text-violet-600" />
            </div>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <section id="features" className="py-28 bg-[#fafafa]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl font-bold tracking-tight">
            Diseñado para los que aman leer
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Cada funcionalidad fue pensada para que conectar libros con lectores
            sea tan simple y satisfactorio como abrir un buen libro.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(({ icon: Icon, title, description, accent, bg, border }) => (
            <div
              key={title}
              className={`bg-white rounded-2xl border ${border} p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group`}
            >
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${bg} mb-5`}
              >
                <Icon className={`w-6 h-6 ${accent}`} />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-28 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center space-y-4 mb-20">
          <h2 className="text-4xl font-bold tracking-tight">
            Tan fácil como parece
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Tres pasos y tu libro ya está en manos de alguien que lo va a
            disfrutar tanto como tú.
          </p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-10">
          {/* Connector */}
          <div
            className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px"
            style={{
              background:
                "linear-gradient(to right, transparent, #e2e8f0 20%, #e2e8f0 80%, transparent)",
            }}
          />

          {STEPS.map(({ number, title, description }) => (
            <div key={number} className="text-center space-y-4">
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-50 border border-violet-100 text-violet-600 font-bold text-xl z-10">
                {number}
              </div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600 via-purple-700 to-violet-900 px-8 py-20 md:px-16 text-center">
          {/* Inner glows */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute -top-10 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 right-1/4 w-72 h-72 bg-purple-300/20 rounded-full blur-3xl" />
          </div>

          {/* Dot grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative space-y-6">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-xs font-medium px-3.5 py-1.5 rounded-full">
              Gratis para siempre en el plan básico
            </span>

            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
              Tu próxima historia favorita
              <br />
              te está esperando.
            </h2>

            <p className="text-violet-200 max-w-md mx-auto">
              Únete a miles de lectores que ya intercambian libros, descubren
              autores y construyen su próxima lista de lectura.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white text-violet-700 font-semibold px-7 py-3.5 rounded-xl hover:bg-violet-50 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
              >
                Empieza ahora — es gratis
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 border border-white/30 bg-white/5 text-white font-medium px-7 py-3.5 rounded-xl hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Ver libros disponibles
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-white" />
              </div>
              ReadMe
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              La plataforma para conectar lectores y dar nueva vida a los
              libros.
            </p>
          </div>

          {FOOTER_LINKS.map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="text-sm font-semibold mb-4">{heading}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>© 2026 ReadMe. Todos los derechos reservados.</p>
          <p>Hecho con amor por lectores, para lectores. 📚</p>
        </div>
      </div>
    </footer>
  );
}
