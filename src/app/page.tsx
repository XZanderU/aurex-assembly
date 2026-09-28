"use client";

import { useState } from "react";
import Link from "next/link";
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
    titulo: "Quórum por coeficientes",
    descripcion:
      "El sistema trabaja con el coeficiente de copropiedad y muestra el avance del quórum en tiempo real.",
  },
  {
    titulo: "Votaciones trazables",
    descripcion:
      "Cada votación se registra con unidad, participante, coeficiente, fecha, hora y resultado.",
  },
  {
    titulo: "Poderes y representaciones",
    descripcion:
      "Gestiona quién representa a quién y conserva la información asociada a cada representación.",
  },
  {
    titulo: "Intervenciones ordenadas",
    descripcion:
      "La cola de peticiones de palabra ayuda a moderar el debate sin perder el orden de participación.",
  },
  {
    titulo: "Presencial, virtual o híbrida",
    descripcion:
      "Mantén un mismo flujo de participación y votación para asistentes físicos y virtuales.",
  },
  {
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href="#inicio" className="flex items-center gap-3" onClick={closeMenu}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
              </svg>
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
              className="rounded-lg px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
            >
              Ingresar
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(29,78,216,0.10),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(30,64,175,0.06),transparent_32%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                Diseñada para propiedad horizontal en Colombia
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-blue-950 sm:text-5xl lg:text-6xl">
                Gestiona tu asamblea.
                <span className="block text-blue-700">Controla cada decisión.</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
                Aurex Assembly centraliza registro, quórum, coeficientes, poderes,
                intervenciones, votaciones y documentación en un mismo flujo de trabajo.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800"
                >
                  Probar gratis 14 días
                  <svg viewBox="0 0 20 20" className="ml-2 h-4 w-4" fill="currentColor">
                    <path d="M4.5 10a.75.75 0 0 1 .75-.75h8.19l-2.72-2.72a.75.75 0 1 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 1 1-1.06-1.06l2.72-2.72H5.25A.75.75 0 0 1 4.5 10Z" />
                  </svg>
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-sm font-extrabold text-gray-800 transition hover:border-blue-300 hover:text-blue-700"
                >
                  Ver cómo funciona
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-gray-500">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-blue-600" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-7 9a.75.75 0 0 1-1.127.075l-4-4a.75.75 0 0 1 1.06-1.06l3.404 3.403 6.475-8.325a.75.75 0 0 1 1.045-.145Z" clipRule="evenodd" /></svg>
                  Sin descargar una app
                </div>
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-blue-600" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-7 9a.75.75 0 0 1-1.127.075l-4-4a.75.75 0 0 1 1.06-1.06l3.404 3.403 6.475-8.325a.75.75 0 0 1 1.045-.145Z" clipRule="evenodd" /></svg>
                  Quórum en tiempo real
                </div>
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-blue-600" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-7 9a.75.75 0 0 1-1.127.075l-4-4a.75.75 0 0 1 1.06-1.06l3.404 3.403 6.475-8.325a.75.75 0 0 1 1.045-.145Z" clipRule="evenodd" /></svg>
                  Reportes en Excel
                </div>
              </div>
            </div>

            {/* VISUAL DE PRODUCTO */}
            <div className="relative mx-auto w-full max-w-2xl lg:pl-4">
              <div className="absolute -inset-6 rounded-[2rem] bg-blue-100/60 blur-3xl" />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-2xl shadow-blue-950/10">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">Panel de Asamblea</div>
                    <div className="mt-1 text-sm font-extrabold text-gray-800">Asamblea General 2026</div>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">En curso</span>
                </div>

                <div className="grid gap-4 p-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:col-span-2">
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-sm font-bold text-gray-600">Quórum</div>
                        <div className="mt-1 text-3xl font-black text-blue-950">63,48%</div>
                        <div className="mt-1 text-xs font-semibold text-gray-500">112 de 180 unidades presentes</div>
                      </div>
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border-[7px] border-blue-700 bg-white text-sm font-black text-blue-700">
                        63%
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                      <div className="h-full w-[63.48%] rounded-full bg-blue-700" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-gray-700">Votación #04</div>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-500">Activa</span>
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

                  <div className="rounded-2xl border border-gray-200 bg-white p-5">
                    <div className="text-sm font-bold text-gray-700">Cola de intervenciones</div>
                    <div className="mt-4 space-y-3">
                      {["Apartamento 406", "Apartamento 702", "Apartamento 1101"].map((item, index) => (
                        <div key={item} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">{index + 1}</span>
                          <span className="text-xs font-bold text-gray-700">{item}</span>
                          <span className="ml-auto text-[10px] font-bold text-gray-400">Esperando</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 text-xs font-semibold text-gray-500">
                  Vista ilustrativa del flujo de Aurex Assembly.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROPUESTA DE VALOR */}
        <section className="border-b border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">No es solo una videollamada</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-blue-950 sm:text-4xl">
                La videoconferencia es el medio. El proceso de la asamblea es el producto.
              </h2>
              <p className="mt-5 text-base leading-7 text-gray-600 sm:text-lg">
                Una herramienta genérica puede mostrar cuántas personas están conectadas.
                Aurex Assembly está planteado para entender unidades, propietarios,
                coeficientes, representaciones, quórum, intervenciones y votaciones.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h10M7 14h6" strokeLinecap="round"/></svg>
                  </div>
                  <div>
                    <div className="text-sm font-black text-gray-400">PLATAFORMA GENÉRICA</div>
                    <div className="text-base font-extrabold text-gray-800">Personas conectadas</div>
                  </div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-6 text-center">
                  <div className="text-4xl font-black text-gray-800">120</div>
                  <div className="mt-1 text-sm font-semibold text-gray-500">personas conectadas</div>
                </div>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-white p-7 shadow-sm shadow-blue-900/5">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M3 12h18" strokeLinecap="round"/><circle cx="12" cy="12" r="8"/></svg>
                  </div>
                  <div>
                    <div className="text-sm font-black text-blue-600">AUREX ASSEMBLY</div>
                    <div className="text-base font-extrabold text-gray-800">Participación con contexto</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center">
                  <div className="text-4xl font-black text-blue-950">63,48%</div>
                  <div className="mt-1 text-sm font-semibold text-gray-600">coeficiente representado</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="scroll-mt-24 border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Flujo de trabajo</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-blue-950 sm:text-4xl">De la preparación al acta, en un solo flujo.</h2>
              <p className="mt-4 text-base leading-7 text-gray-600">
                La experiencia está pensada para que el administrador tenga el control del proceso
                y los propietarios tengan una entrada sencilla.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {procesos.map((item) => (
                <div key={item.numero} className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-sm font-black text-white">{item.numero}</div>
                  <h3 className="mt-5 text-lg font-extrabold text-gray-900">{item.titulo}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600">{item.descripcion}</p>
                </div>
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
                El producto se está construyendo alrededor del proceso real de una asamblea,
                no alrededor de funciones genéricas que no resuelven el problema.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {ventajas.map((item) => (
                <article key={item.titulo} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3v18M3 12h18" strokeLinecap="round" />
                      <circle cx="12" cy="12" r="8" />
                    </svg>
                  </div>
                  <h3 className="mt-5 text-lg font-extrabold text-gray-900">{item.titulo}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600">{item.descripcion}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 rounded-3xl border border-blue-100 bg-blue-50 p-7 sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Participación sencilla</span>
                  <h3 className="mt-2 text-2xl font-black text-blue-950">El propietario entra desde el navegador con su apartamento y PIN.</h3>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                    El flujo actual evita descargas, instalaciones y contraseñas adicionales para participar en la asamblea.
                  </p>
                </div>
                <Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-blue-800">Crear cuenta</Link>
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
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-7">
                <div className="text-sm font-black uppercase tracking-[0.15em] text-gray-400">Conjuntos</div>
                <h3 className="mt-3 text-xl font-black text-gray-900">Una asamblea mejor organizada</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">Centraliza registro, participación, votaciones y documentación en lugar de depender de hojas, mensajes y procesos dispersos.</p>
              </div>
              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-7">
                <div className="text-sm font-black uppercase tracking-[0.15em] text-blue-600">Administradores</div>
                <h3 className="mt-3 text-xl font-black text-blue-950">Más control sobre cada conjunto</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">La visión de producto contempla que una empresa administradora pueda gestionar múltiples conjuntos desde una misma cuenta.</p>
              </div>
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-7">
                <div className="text-sm font-black uppercase tracking-[0.15em] text-gray-400">Empresas</div>
                <h3 className="mt-3 text-xl font-black text-gray-900">Un producto que puede escalar</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">El roadmap contempla evolución hacia SaaS, escenarios privados y soluciones Enterprise según las necesidades del cliente.</p>
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
              <p className="mt-4 text-base leading-7 text-gray-600">
                Conservamos los planes y el flujo de contratación que ya tienes funcionando.
              </p>
            </div>

            <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
              {planos.map((plan, index) => (
                <div
                  key={plan.id}
                  className={`relative flex h-full flex-col rounded-3xl border bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${index === 1 ? "border-blue-300 shadow-blue-900/10" : "border-gray-200"}`}
                >
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
                    onClick={() => handleCrearOrden(plan)}
                    disabled={loadingPlan === plan.id}
                    className={`mt-8 w-full rounded-xl py-3.5 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:bg-blue-300 ${index === 1 ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
                  >
                    {loadingPlan === plan.id ? "Procesando..." : "Contratar Plan"}
                  </button>
                </div>
              ))}
            </div>

            {/* PRUEBA GRATUITA — separada de las tarjetas para evitar repetición */}
            <div className="mx-auto mt-10 max-w-5xl rounded-3xl border border-blue-100 bg-blue-50 p-7 text-center sm:p-9">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v18M3 12h18" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="8" />
                </svg>
              </div>
              <h3 className="mt-4 text-2xl font-black text-blue-950">¿Quieres probar Aurex antes de decidir?</h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                Crea tu cuenta hoy y obtén <strong>14 días de acceso total</strong> a la plataforma.
                Configura tu primera asamblea, invita a los propietarios y realiza pruebas sin compromisos ni tarjeta de crédito.
              </p>
              <Link
                href="/register"
                className="mt-6 inline-flex items-center justify-center rounded-xl border-2 border-blue-600 bg-white px-6 py-3.5 text-sm font-extrabold text-blue-700 transition hover:bg-blue-700 hover:text-white"
              >
                Comenzar prueba gratis de 14 días
              </Link>
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
                  <div key={faq.pregunta} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-extrabold text-gray-900 sm:text-base">{faq.pregunta}</span>
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition ${isOpen ? "rotate-45" : ""}`}>
                        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 4v12M4 10h12" strokeLinecap="round" /></svg>
                      </span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-gray-100 px-5 pb-5 pt-4 text-sm leading-6 text-gray-600">
                        {faq.respuesta}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="bg-blue-950">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">Tu próxima asamblea</span>
                <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Deja de gestionar la asamblea en piezas separadas.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
                  Prueba el flujo actual de Aurex Assembly y descubre cómo organizar el registro,
                  la participación, las votaciones y los resultados desde un mismo lugar.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-extrabold text-blue-950 hover:bg-blue-50">
                  Probar gratis 14 días
                </Link>
                <a href="#planes" className="inline-flex items-center justify-center rounded-xl border border-blue-700 px-6 py-3.5 text-sm font-extrabold text-white hover:bg-blue-900">
                  Ver planes
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-blue-900 bg-blue-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 text-sm text-blue-100 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="font-black text-white">Aurex Assembly</div>
            <div className="mt-1 text-xs text-blue-200">Aurexcode · Gestión de asambleas para propiedad horizontal</div>
          </div>
          <div className="text-xs text-blue-200">Cloud · SaaS · En evolución</div>
        </div>
      </footer>
    </div>
  );
}