"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoAurex } from "./components/LogoAurex";
import { supabase } from "../../lib/supabase";

interface Plan {
  id: string;
  nombre: string;
  precioVisual: string;
  precioEnCentavos: number;
  descripcion: string;
  etiqueta?: string;
  caracteristicas: string[];
}

const planos: Plan[] = [
  {
    id: "ASAMBLEA_UNICA",
    nombre: "Por Asamblea",
    precioVisual: "$150.000",
    precioEnCentavos: 15000000,
    descripcion: "Ideal para conjuntos pequeños que realizan una asamblea al año.",
    caracteristicas: [
      "1 Asamblea Activa",
      "Soporte por email",
      "Votaciones en tiempo real",
    ],
  },
  {
    id: "PLAN_SEMESTRAL",
    nombre: "Semestral",
    precioVisual: "$750.000",
    precioEnCentavos: 75000000,
    etiqueta: "Para administradores",
    descripcion:
      "Para administradores que gestionan asambleas extraordinarias frecuentes.",
    caracteristicas: [
      "Asambleas Ilimitadas (6 meses)",
      "Soporte prioritario",
      "Exportación de actas",
    ],
  },
  {
    id: "PLAN_ANUAL",
    nombre: "Anual Pro",
    precioVisual: "$1.200.000",
    precioEnCentavos: 120000000,
    etiqueta: "Pro",
    descripcion:
      "La solución para empresas de administración de propiedad horizontal.",
    caracteristicas: [
      "Asambleas Ilimitadas (1 año)",
      "Soporte 24/7",
      "Marca blanca",
      "Capacitación",
    ],
  },
];

const procesos = [
  {
    numero: "01",
    titulo: "Carga tu padrón",
    descripcion:
      "Importa propietarios, unidades y coeficientes mediante Excel y prepara la asamblea desde un solo panel.",
  },
  {
    numero: "02",
    titulo: "Registra asistentes",
    descripcion:
      "Genera un PIN dinámico y permite que cada propietario ingrese desde el navegador, sin descargar una app.",
  },
  {
    numero: "03",
    titulo: "Gestiona la reunión",
    descripcion:
      "Controla quórum, orden del día, intervenciones y votaciones mientras la asamblea está en marcha.",
  },
  {
    numero: "04",
    titulo: "Cierra y documenta",
    descripcion:
      "Descarga el acta en Excel con asistencia, resultados electorales y detalle por inmueble.",
  },
];

const ventajas = [
  {
    icon: "quorum",
    titulo: "Quórum por coeficientes",
    descripcion:
      "El sistema trabaja con el coeficiente de copropiedad y muestra el avance del quórum en tiempo real.",
  },
  {
    icon: "vote",
    titulo: "Votaciones trazables",
    descripcion:
      "Cada votación se registra con unidad, participante, coeficiente, fecha, hora y resultado.",
  },
  {
    icon: "power",
    titulo: "Poderes y representaciones",
    descripcion:
      "Gestiona quién representa a quién y conserva la información asociada a cada representación.",
  },
  {
    icon: "voice",
    titulo: "Intervenciones ordenadas",
    descripcion:
      "La cola de peticiones de palabra ayuda a moderar el debate sin perder el orden de participación.",
  },
  {
    icon: "hybrid",
    titulo: "Presencial, virtual o híbrida",
    descripcion:
      "Mantén un mismo flujo de participación y votación para asistentes físicos y virtuales.",
  },
  {
    icon: "audit",
    titulo: "Actas y auditoría",
    descripcion:
      "Centraliza la información de la asamblea y facilita la generación de reportes y evidencias.",
  },
];

const faqs = [
  {
    pregunta: "¿Los propietarios deben instalar una aplicación?",
    respuesta:
      "No. El flujo actual está pensado para funcionar desde cualquier navegador. El propietario ingresa con su apartamento y el PIN asignado.",
  },
  {
    pregunta: "¿El quórum se calcula solo por cantidad de personas?",
    respuesta:
      "No. Aurex Assembly está diseñado para trabajar con los coeficientes de copropiedad y mostrar el quórum correspondiente en tiempo real.",
  },
  {
    pregunta: "¿Puedo hacer una asamblea híbrida?",
    respuesta:
      "Sí. El diseño contempla participación presencial, virtual e híbrida, manteniendo el mismo sistema de registro y votación.",
  },
  {
    pregunta: "¿Qué pasa con Zoom o Google Meet?",
    respuesta:
      "En el flujo actual puedes utilizar el enlace de tu herramienta de videoconferencia y concentrar en Aurex Assembly la parte administrativa, de participación y votación.",
  },
  {
    pregunta: "¿Qué recibo al terminar la asamblea?",
    respuesta:
      "Puedes descargar un archivo Excel con la asistencia o padrón, los resultados electorales y el detalle por inmueble, según el flujo actualmente implementado.",
  },
  {
    pregunta: "¿Aurex Assembly garantiza por sí solo el cumplimiento legal?",
    respuesta:
      "La plataforma está diseñada alrededor del proceso de asamblea y la trazabilidad de sus datos. Las afirmaciones de cumplimiento jurídico deben evaluarse según la normativa aplicable y una revisión especializada.",
  },
];

const LiveDot = () => (
  <span className="relative flex h-2.5 w-2.5">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-70" />
    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-600" />
  </span>
);

export default function PlanesPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleCrearOrden = async (plan: Plan) => {
    setLoadingPlan(plan.id);

    // 1. Lectura forzada de la sesión en el navegador
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // 2. Bloqueo estricto si no hay ID real
    if (authError || !user || !user.id) {
      alert("Debes iniciar sesión para contratar un plan.");
      setLoadingPlan(null);
      window.location.href = "/";
      return;
    }

    const referenceCode = `AUREX-${plan.id}-${Date.now()}`;

    // 3. Empaquetado explícito de los datos
    const payload = {
      reference_code: referenceCode,
      amount_in_cents: plan.precioEnCentavos,
      currency: "COP",
      status: "PENDING",
      user_id: user.id,
    };

    // Auditoría de QA: imprimimos en consola exactamente lo que viaja a Supabase
    console.log("🚨 PAYLOAD ENVIADO A SUPABASE:", payload);

    // 4. Inserción
    const { error } = await supabase.from("invoices").insert(payload);

    if (error) {
      console.error("Fallo crítico al insertar:", error);
      alert("Hubo un problema al generar la orden.");
      setLoadingPlan(null);
      return;
    }

    window.location.href = `https://aurex-billing.vercel.app/checkout/${referenceCode}`;
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 text-gray-900 selection:bg-blue-100 selection:text-blue-950">
      <style jsx global>{`
        html { scroll-behavior: smooth; }

        @keyframes floatSlow {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -12px, 0); }
        }

        @keyframes floatReverse {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(8px, 10px, 0); }
        }

        @keyframes riseIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0% { transform: translateX(-130%); }
          100% { transform: translateX(130%); }
        }

        @keyframes softPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.10); }
          50% { box-shadow: 0 0 0 12px rgba(37, 99, 235, 0); }
        }

        .aurex-float { animation: floatSlow 6s ease-in-out infinite; }
        .aurex-float-reverse { animation: floatReverse 7s ease-in-out infinite; }
        .aurex-rise-1 { animation: riseIn .7s .05s both cubic-bezier(.2,.7,.2,1); }
        .aurex-rise-2 { animation: riseIn .7s .15s both cubic-bezier(.2,.7,.2,1); }
        .aurex-rise-3 { animation: riseIn .7s .25s both cubic-bezier(.2,.7,.2,1); }
        .aurex-rise-4 { animation: riseIn .7s .35s both cubic-bezier(.2,.7,.2,1); }
        .aurex-pulse-ring { animation: softPulse 2.8s ease-in-out infinite; }

        .aurex-shimmer::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 38%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.40), transparent);
          transform: translateX(-130%);
          animation: shimmer 3.8s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          *, *::before, *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <a href="#inicio" className="group flex items-center gap-3" onClick={closeMenu}>
            <div className="aurex-pulse-ring flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-white shadow-sm transition group-hover:-translate-y-0.5">
              <LogoAurex className="h-10 w-10" />
            </div>
            <div>
              <div className="text-base font-black tracking-tight text-blue-950">Aurex Assembly</div>
              <div className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 sm:block">
                Gestión de asambleas
              </div>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-gray-600 lg:flex">
            <a href="#como-funciona" className="transition-colors hover:text-blue-700">Cómo funciona</a>
            <a href="#funcionalidades" className="transition-colors hover:text-blue-700">Funcionalidades</a>
            <a href="#planes" className="transition-colors hover:text-blue-700">Planes</a>
            <a href="#faq" className="transition-colors hover:text-blue-700">Preguntas frecuentes</a>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/login"
              id="nav-login"
              className="rounded-lg px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
            >
              Ingresar
            </Link>
            <Link
              href="/register"
              id="nav-free-trial"
              className="aurex-shimmer relative overflow-hidden rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800"
            >
              Probar gratis
            </Link>
          </div>

          <button
            type="button"
            className="rounded-lg border border-gray-200 p-2 text-gray-700 lg:hidden"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 py-4 lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm font-semibold text-gray-700">
              <a href="#como-funciona" onClick={closeMenu} className="rounded-lg px-3 py-2 hover:bg-gray-50">Cómo funciona</a>
              <a href="#funcionalidades" onClick={closeMenu} className="rounded-lg px-3 py-2 hover:bg-gray-50">Funcionalidades</a>
              <a href="#planes" onClick={closeMenu} className="rounded-lg px-3 py-2 hover:bg-gray-50">Planes</a>
              <a href="#faq" onClick={closeMenu} className="rounded-lg px-3 py-2 hover:bg-gray-50">Preguntas frecuentes</a>
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                <Link href="/" onClick={closeMenu} className="rounded-lg border border-gray-200 px-3 py-2.5 text-center">Ingresar</Link>
                <Link href="/register" onClick={closeMenu} className="rounded-lg bg-blue-700 px-3 py-2.5 text-center text-white">Probar gratis</Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <main id="inicio">
        <section className="relative overflow-hidden border-b border-gray-200 bg-white">
          <div className="pointer-events-none absolute inset-0">
            <div className="aurex-float absolute -left-20 top-24 h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />
            <div className="aurex-float-reverse absolute right-[-5rem] top-[-4rem] h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(29,78,216,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(30,64,175,0.08),transparent_30%)]" />
            <div className="absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-transparent via-blue-100/60 to-transparent" />
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
            <div>
              <div className="aurex-rise-1 mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-800 shadow-sm">
                <LiveDot />
                Diseñada para propiedad horizontal en Colombia
              </div>

              <h1 className="aurex-rise-2 max-w-3xl text-4xl font-black leading-[1.04] tracking-tight text-blue-950 sm:text-5xl lg:text-6xl">
                Gestiona tu asamblea.
                <span className="mt-1 block bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 bg-clip-text text-transparent">
                  Controla cada decisión.
                </span>
              </h1>

              <p className="aurex-rise-3 mt-6 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
                Aurex Assembly centraliza registro, quórum, coeficientes, poderes,
                intervenciones, votaciones y documentación en un mismo flujo de trabajo.
              </p>

              <div className="aurex-rise-4 mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  id="hero-free-trial"
                  className="aurex-shimmer relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-blue-700/25 transition duration-300 hover:-translate-y-1 hover:bg-blue-800 hover:shadow-blue-700/30"
                >
                  Probar gratis 14 días
                  <svg viewBox="0 0 20 20" className="ml-2 h-4 w-4" fill="currentColor">
                    <path d="M4.5 10a.75.75 0 0 1 .75-.75h8.19l-2.72-2.72a.75.75 0 1 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 1 1-1.06-1.06l2.72-2.72H5.25A.75.75 0 0 1 4.5 10Z" />
                  </svg>
                </Link>
                <a
                  href="#como-funciona"
                  id="hero-how-it-works"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-sm font-extrabold text-gray-800 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:text-blue-700 hover:shadow-md"
                >
                  Ver cómo funciona
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ["Sin app", "Acceso desde navegador"],
                  ["Tiempo real", "Quórum y votaciones"],
                  ["Trazable", "Actas y resultados"],
                ].map(([title, text], index) => (
                  <div key={title} className="group rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="text-sm font-black text-blue-950">{title}</div>
                    <div className="mt-1 text-xs font-semibold leading-5 text-gray-500">{text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* VISUAL DE PRODUCTO */}
            <div className="relative mx-auto w-full max-w-2xl lg:pl-4">
              <div className="aurex-float absolute -right-2 -top-10 z-10 hidden rounded-2xl border border-blue-100 bg-white/95 p-3 shadow-2xl shadow-blue-950/10 sm:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 17V7m0 10 4-4 3 3 5-6 4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Quórum</div>
                    <div className="text-sm font-black text-blue-950">Actualizado en vivo</div>
                  </div>
                </div>
              </div>

              <div className="aurex-float-reverse absolute -bottom-7 -left-6 z-20 hidden rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-2xl shadow-blue-950/10 sm:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Resultado</div>
                    <div className="text-sm font-black text-gray-900">Votación registrada</div>
                  </div>
                </div>
              </div>

              <div className="absolute -inset-8 rounded-[2.5rem] bg-blue-100/70 blur-3xl" />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-2xl shadow-blue-950/15 transition duration-500 hover:-translate-y-1 hover:shadow-blue-950/20">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">Panel de Asamblea</div>
                    <div className="mt-1 text-sm font-extrabold text-gray-800">Asamblea General 2026</div>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    <LiveDot />
                    En curso
                  </span>
                </div>

                <div className="grid gap-4 p-4 sm:grid-cols-2">
                  <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:col-span-2">
                    <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-blue-200/50 blur-2xl" />
                    <div className="relative flex items-end justify-between">
                      <div>
                        <div className="text-sm font-bold text-gray-600">Quórum</div>
                        <div className="mt-1 text-3xl font-black text-blue-950">63,48%</div>
                        <div className="mt-1 text-xs font-semibold text-gray-500">112 de 180 unidades presentes</div>
                      </div>
                      <div className="aurex-pulse-ring flex h-16 w-16 items-center justify-center rounded-full border-[7px] border-blue-700 bg-white text-sm font-black text-blue-700">
                        63%
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                      <div className="h-full w-[63.48%] rounded-full bg-gradient-to-r from-blue-700 to-indigo-600" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-gray-700">Votación #04</div>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">Activa</span>
                    </div>
                    <div className="mt-3 text-sm font-extrabold leading-5 text-gray-900">¿Aprueba el presupuesto general?</div>
                    <div className="mt-4 space-y-3 text-xs font-semibold text-gray-500">
                      <div>
                        <div className="mb-1 flex justify-between"><span>SÍ</span><span>42,11%</span></div>
                        <div className="h-2 rounded-full bg-gray-100"><div className="h-full w-[42%] rounded-full bg-blue-700" /></div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between"><span>NO</span><span>14,92%</span></div>
                        <div className="h-2 rounded-full bg-gray-100"><div className="h-full w-[15%] rounded-full bg-blue-400" /></div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between"><span>BLANCO</span><span>0,79%</span></div>
                        <div className="h-2 rounded-full bg-gray-100"><div className="h-full w-[8%] rounded-full bg-blue-200" /></div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
                    <div className="text-sm font-bold text-gray-700">Cola de intervenciones</div>
                    <div className="mt-4 space-y-3">
                      {["Apartamento 406", "Apartamento 702", "Apartamento 1101"].map((item, index) => (
                        <div key={item} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 transition duration-300 hover:translate-x-1 hover:border-blue-100 hover:bg-blue-50">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">{index + 1}</span>
                          <span className="text-xs font-bold text-gray-700">{item}</span>
                          <span className="ml-auto text-[10px] font-bold text-gray-400">Esperando</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-4 text-xs font-semibold text-gray-500">
                  <span>Vista ilustrativa del flujo de Aurex Assembly.</span>
                  <span className="hidden items-center gap-1 text-blue-600 sm:inline-flex"><LiveDot /> Tiempo real</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/90 px-5 py-4 text-center shadow-sm sm:flex sm:items-center sm:justify-between sm:text-left">
              <div>
                <span className="text-xs font-black uppercase tracking-[0.15em] text-blue-700">Más que una videollamada</span>
                <p className="mt-1 text-sm font-semibold text-gray-700">El verdadero producto es el control del proceso: asistencia + quórum + votación + trazabilidad + acta.</p>
              </div>
              <a href="#funcionalidades" className="mt-3 inline-flex text-sm font-extrabold text-blue-700 hover:text-blue-800 sm:mt-0">Conocer funcionalidades →</a>
            </div>
          </div>
        </section>

        {/* PROPUESTA DE VALOR */}
        <section className="border-b border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
              <div>
                <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">No es solo una videollamada</span>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-blue-950 sm:text-4xl">Aurex Assembly entiende qué está ocurriendo en la asamblea.</h2>
                <p className="mt-5 text-base leading-7 text-gray-600 sm:text-lg">
                  Una herramienta genérica puede saber cuántas personas están conectadas. Aurex Assembly organiza la información que realmente importa para una decisión: unidades, coeficientes, representación, participación y resultados.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-950/5">
                <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-blue-100/70 blur-3xl" />
                <div className="relative grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Videollamada genérica</div>
                    <div className="mt-3 text-2xl font-black text-gray-900">120 conectados</div>
                    <div className="mt-1 text-sm text-gray-500">Personas en la reunión</div>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Aurex Assembly</div>
                    <div className="mt-3 text-2xl font-black text-blue-950">63,48%</div>
                    <div className="mt-1 text-sm text-gray-600">Coeficiente participante</div>
                  </div>
                </div>
                <div className="relative mt-4 rounded-2xl bg-blue-950 p-5 text-white">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">Lo que cambia</div>
                  <p className="mt-2 text-base font-extrabold leading-6">La plataforma no solo conecta personas: organiza el proceso de decisión.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="scroll-mt-24 border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Un flujo sencillo</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-blue-950 sm:text-4xl">De la preparación al acta.</h2>
              <p className="mt-4 text-base leading-7 text-gray-600 sm:text-lg">
                El objetivo es que la información de la asamblea avance en orden, sin depender de procesos dispersos.
              </p>
            </div>

            <div className="relative mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <div className="absolute left-[12.5%] right-[12.5%] top-10 hidden h-px bg-gradient-to-r from-blue-100 via-blue-300 to-blue-100 lg:block" />
              {procesos.map((item, index) => (
                <article key={item.numero} className="group relative rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-sm font-black text-blue-700 transition duration-300 group-hover:scale-110 group-hover:bg-blue-700 group-hover:text-white">
                    {item.numero}
                  </div>
                  <h3 className="mt-5 text-lg font-extrabold text-gray-900">{item.titulo}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600">{item.descripcion}</p>
                  <div className="mt-5 text-xs font-black uppercase tracking-[0.15em] text-gray-300">Paso {index + 1}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FUNCIONALIDADES */}
        <section id="funcionalidades" className="scroll-mt-24 border-b border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Lo esencial de la operación</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-blue-950 sm:text-4xl">Todo lo que importa durante una asamblea.</h2>
              <p className="mt-4 text-base leading-7 text-gray-600 sm:text-lg">
                El producto se está construyendo alrededor del proceso real de una asamblea, no alrededor de funciones genéricas que no resuelven el problema.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {ventajas.map((item, index) => (
                <article key={item.titulo} className="group rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 transition duration-300 group-hover:scale-110 group-hover:bg-blue-700 group-hover:text-white">
                      {item.icon === "quorum" && <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5m0 14h16" strokeLinecap="round"/><path d="M7 15v-5M11 15V8M15 15V6M19 15v-3" strokeLinecap="round"/></svg>}
                      {item.icon === "vote" && <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9"/></svg>}
                      {item.icon === "power" && <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 11h8M7 15h10M10 7h4" strokeLinecap="round"/><path d="M5 5h14v14H5z" strokeLinejoin="round"/></svg>}
                      {item.icon === "voice" && <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" strokeLinecap="round"/></svg>}
                      {item.icon === "hybrid" && <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="8" height="6" rx="1"/><rect x="13" y="13" width="8" height="6" rx="1"/><path d="m11 8 2 3m0 0-2 3m2-3h-2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      {item.icon === "audit" && <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 12h5M10 16h5" strokeLinecap="round"/></svg>}
                    </div>
                    <span className="text-xs font-black text-gray-300">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-extrabold text-gray-900">{item.titulo}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600">{item.descripcion}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 overflow-hidden rounded-3xl border border-blue-100 bg-blue-50 shadow-sm">
              <div className="grid gap-6 p-7 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Participación sencilla</span>
                  <h3 className="mt-2 text-2xl font-black text-blue-950">El propietario entra desde el navegador con su apartamento y PIN.</h3>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                    El flujo actual evita descargas, instalaciones y contraseñas adicionales para participar en la asamblea.
                  </p>
                </div>
                <Link href="/register" id="features-create-account" className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-extrabold text-white transition duration-300 hover:-translate-y-1 hover:bg-blue-800 hover:shadow-lg">
                  Crear cuenta
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* PARA QUIÉN ES */}
        <section className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Pensada para el negocio</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-blue-950 sm:text-4xl">Una herramienta para quien organiza y para quien participa.</h2>
              <p className="mt-4 text-base leading-7 text-gray-600">
                Aurex Assembly puede empezar resolviendo una asamblea puntual y evolucionar hacia un modelo de gestión para administradores con múltiples conjuntos.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <div className="group rounded-3xl border border-gray-200 bg-gray-50 p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-lg">
                <div className="text-sm font-black uppercase tracking-[0.15em] text-gray-400">Conjuntos</div>
                <h3 className="mt-3 text-xl font-black text-gray-900">Una asamblea mejor organizada</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">Centraliza registro, participación, votaciones y documentación en lugar de depender de hojas, mensajes y procesos dispersos.</p>
              </div>
              <div className="group rounded-3xl border border-blue-100 bg-blue-50 p-7 transition duration-300 hover:-translate-y-1 hover:bg-blue-100/70 hover:shadow-lg">
                <div className="text-sm font-black uppercase tracking-[0.15em] text-blue-600">Administradores</div>
                <h3 className="mt-3 text-xl font-black text-blue-950">Más control sobre cada conjunto</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">La visión de producto contempla que una empresa administradora pueda gestionar múltiples conjuntos desde una misma cuenta.</p>
              </div>
              <div className="group rounded-3xl border border-gray-200 bg-gray-50 p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-lg">
                <div className="text-sm font-black uppercase tracking-[0.15em] text-gray-400">Empresas</div>
                <h3 className="mt-3 text-xl font-black text-gray-900">Un producto que puede escalar</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">El roadmap contempla evolución hacia SaaS, escenarios privados y soluciones Enterprise según las necesidades del cliente.</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 rounded-3xl border border-gray-200 bg-gray-50 p-6 sm:grid-cols-3 sm:p-8">
              <div className="text-center sm:text-left">
                <div className="text-2xl font-black text-blue-950">1 asamblea</div>
                <div className="mt-1 text-sm text-gray-500">Para empezar sin complicaciones.</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-2xl font-black text-blue-950">6 meses</div>
                <div className="mt-1 text-sm text-gray-500">Para administradores que repiten el proceso.</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-2xl font-black text-blue-950">12 meses</div>
                <div className="mt-1 text-sm text-gray-500">Para una operación más continua.</div>
              </div>
            </div>
          </div>
        </section>

        {/* PLANES — SE CONSERVA LÓGICA DE PAGO */}
        <section id="planes" className="scroll-mt-24 border-b border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Planes Aurex</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-blue-950 sm:text-4xl">Empieza por una asamblea o escala con tu operación.</h2>
              <p className="mt-4 text-base leading-7 text-gray-600 sm:text-lg">
                Elige la modalidad que mejor se adapte a tu forma de trabajar. El flujo de contratación permanece conectado con tu sistema actual.
              </p>
            </div>

            <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
              {planos.map((plan, index) => (
                <div
                  key={plan.id}
                  className={`group relative flex h-full flex-col rounded-3xl border bg-white p-7 shadow-sm transition duration-500 hover:-translate-y-2 hover:shadow-2xl ${index === 1 ? "border-blue-300 shadow-blue-900/10" : "border-gray-200"}`}
                >
                  {index === 1 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-700 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-blue-700/20">
                      Más elegido para administración
                    </div>
                  )}

                  {plan.etiqueta && (
                    <span className="absolute right-5 top-5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-blue-700">
                      {plan.etiqueta}
                    </span>
                  )}

                  <h3 className="pr-28 text-xl font-black text-gray-900">{plan.nombre}</h3>
                  <p className="mt-3 min-h-[68px] text-sm leading-6 text-gray-500">{plan.descripcion}</p>
                  <div className="mt-6 border-t border-gray-100 pt-6">
                    <div className="text-4xl font-black tracking-tight text-blue-700">{plan.precioVisual}</div>
                    <div className="mt-1 text-xs font-semibold text-gray-400">COP · precio publicado</div>
                  </div>

                  <ul className="mt-7 grow space-y-3">
                    {plan.caracteristicas.map((caracteristica) => (
                      <li key={caracteristica} className="flex items-start text-sm text-gray-600">
                        <svg className="mr-2 mt-0.5 h-5 w-5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        {caracteristica}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    id={`plan-contratar-${plan.id.toLowerCase()}`}
                    onClick={() => handleCrearOrden(plan)}
                    disabled={loadingPlan === plan.id}
                    className={`aurex-shimmer relative mt-8 inline-flex w-full items-center justify-center overflow-hidden rounded-xl py-3.5 text-sm font-extrabold transition duration-300 hover:-translate-y-1 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-blue-300 ${index === 1 ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
                  >
                    {loadingPlan === plan.id ? "Procesando..." : "Contratar Plan"}
                  </button>
                </div>
              ))}
            </div>

            {/* PRUEBA GRATUITA */}
            <div className="relative mx-auto mt-10 max-w-5xl overflow-hidden rounded-3xl border border-blue-100 bg-blue-50 p-7 text-center shadow-sm sm:p-9">
              <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-blue-200/50 blur-3xl" />
              <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-indigo-200/40 blur-3xl" />
              <div className="relative">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3v18M3 12h18" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                </div>
                <h3 className="mt-4 text-2xl font-black text-blue-950">Prueba el flujo antes de decidir.</h3>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                  Crea tu cuenta y obtén <strong>14 días de acceso total</strong>. Explora el flujo, configura tu primera asamblea y realiza pruebas sin compromisos ni tarjeta de crédito.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    href="/register"
                    id="pricing-free-trial"
                    className="aurex-shimmer relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-700/20 transition duration-300 hover:-translate-y-1 hover:bg-blue-800"
                  >
                    Comenzar prueba gratis
                  </Link>
                  <a href="#faq" className="inline-flex items-center justify-center rounded-xl border-2 border-blue-200 bg-white px-6 py-3.5 text-sm font-extrabold text-blue-700 transition duration-300 hover:-translate-y-1 hover:border-blue-300">
                    Resolver preguntas
                  </a>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-gray-500">
                  <span>✓ Sin app</span>
                  <span>✓ Sin tarjeta</span>
                  <span>✓ Desde navegador</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 bg-white">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="text-center">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Preguntas frecuentes</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-blue-950 sm:text-4xl">Lo que necesitas saber antes de empezar.</h2>
            </div>

            <div className="mt-10 space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={faq.pregunta} className={`overflow-hidden rounded-2xl border bg-white transition duration-300 ${isOpen ? "border-blue-200 shadow-md" : "border-gray-200 hover:border-blue-100"}`}>
                    <button
                      type="button"
                      id={`faq-${index + 1}`}
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-extrabold text-gray-900 sm:text-base">{faq.pregunta}</span>
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition duration-300 ${isOpen ? "rotate-45 bg-blue-50 text-blue-700" : ""}`}>
                        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 4v12M4 10h12" strokeLinecap="round" /></svg>
                      </span>
                    </button>
                    <div className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                      <div className="min-h-0 overflow-hidden">
                        <div className="border-t border-gray-100 px-5 pb-5 pt-4 text-sm leading-6 text-gray-600">
                          {faq.respuesta}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="relative overflow-hidden bg-blue-950">
          <div className="pointer-events-none absolute inset-0">
            <div className="aurex-float absolute right-[-4rem] top-[-5rem] h-52 w-52 rounded-full bg-blue-700/30 blur-3xl" />
            <div className="aurex-float-reverse absolute bottom-[-5rem] left-[-4rem] h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">Tu próxima asamblea</span>
                <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Deja de gestionar la asamblea en piezas separadas.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
                  Prueba el flujo actual de Aurex Assembly y descubre cómo organizar el registro, la participación, las votaciones y los resultados desde un mismo lugar.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href="/register" id="footer-free-trial" className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-extrabold text-blue-950 shadow-lg transition duration-300 hover:-translate-y-1 hover:bg-blue-50">
                  Probar gratis 14 días
                </Link>
                <a href="#planes" className="inline-flex items-center justify-center rounded-xl border border-blue-700 px-6 py-3.5 text-sm font-extrabold text-white transition duration-300 hover:-translate-y-1 hover:bg-blue-900">
                  Ver planes
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-blue-900 bg-blue-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 text-sm text-blue-100 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <LogoAurex className="h-8 w-8" />
            <div>
              <div className="font-black text-white">Aurex Assembly</div>
              <div className="mt-1 text-xs text-blue-200">Aurexcode · Gestión de asambleas para propiedad horizontal</div>
            </div>
          </div>
          <div className="text-xs text-blue-200">Cloud · SaaS · En evolución</div>
        </div>
      </footer>
    </div>
  );
}