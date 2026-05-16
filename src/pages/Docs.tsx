import { useState } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

const SERVICES = [
  {
    id: "ms1",
    label: "MS1 · Usuarios",
    tech: "Go",
    url: "/openapi/ms1-users.json",
    available: true,
  },
  {
    id: "ms2",
    label: "MS2 · Libros",
    tech: "Java / Spring Boot",
    url: "/openapi/ms2-books.json",
    available: true,
  },
  {
    id: "ms3",
    label: "MS3 · Solicitudes",
    tech: "Python / FastAPI",
    url: "/openapi/ms3-solicitudes.json",
    available: true,
  },
  {
    id: "ms4",
    label: "MS4 · Orquestador",
    tech: "Node.js / Express",
    url: "/openapi/ms4-orchestrator.json",
    available: true,
  },
  {
    id: "ms5",
    label: "MS5 · Analytics",
    tech: "Python / FastAPI",
    url: "/openapi/ms5-analytics.json",
    available: true,
  },
  {
    id: "ms6",
    label: "MS6 · Transacciones",
    tech: "Python / FastAPI",
    url: "/openapi/ms6-transactions.json",
    available: true,
  },
];

export default function DocsPage() {
  const [selected, setSelected] = useState(SERVICES[0].id);
  const current = SERVICES.find((s) => s.id === selected)!;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-none">ReadMe · API Docs</h1>
          <p className="text-xs text-gray-500 mt-0.5">Documentación OpenAPI de los microservicios</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col py-4 gap-1 px-2">
          {SERVICES.map((svc) => (
            <button
              key={svc.id}
              onClick={() => svc.available && setSelected(svc.id)}
              disabled={!svc.available}
              className={[
                "w-full text-left px-3 py-2.5 rounded-lg transition-colors",
                svc.available
                  ? selected === svc.id
                    ? "bg-violet-50 text-violet-700 font-semibold"
                    : "hover:bg-gray-100 text-gray-700"
                  : "opacity-40 cursor-not-allowed text-gray-500",
              ].join(" ")}
            >
              <p className="text-sm leading-tight">{svc.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{svc.tech}</p>
              {!svc.available && (
                <span className="text-[9px] text-gray-400 italic">próximamente</span>
              )}
            </button>
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto bg-white">
          {current.available ? (
            <SwaggerUI url={current.url} docExpansion="list" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Spec no disponible aún para {current.label}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
