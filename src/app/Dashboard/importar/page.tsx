"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../../../lib/supabase";

interface PropietarioExcel {
  TORRE?: string;
  APARTAMENTO: string;
  PROPIETARIO: string;
  DOCUMENTO: string;
  EMAIL?: string;
  COEFICIENTE: number;
}

export default function ImportarExcelPage() {
  const [datos, setDatos] = useState<PropietarioExcel[]>([]);
  const [sumaCoeficientes, setSumaCoeficientes] = useState<number>(0);
  
  // Estados de interfaz y QA
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evento) => {
      try {
        const binario = evento.target?.result;
        const libro = XLSX.read(binario, { type: "binary" });
        const hoja = libro.Sheets[libro.SheetNames[0]];
        const datosJson = XLSX.utils.sheet_to_json<PropietarioExcel>(hoja);
        
        const totalCoeficiente = datosJson.reduce((acc, fila) => acc + (Number(fila.COEFICIENTE) || 0), 0);
        
        setDatos(datosJson);
        setSumaCoeficientes(Number(totalCoeficiente.toFixed(4)));
        setError(null);
        setMensajeExito(null);

        if (totalCoeficiente < 99.9 || totalCoeficiente > 100.1) {
          setError(`Advertencia: La suma de coeficientes es ${totalCoeficiente.toFixed(4)}%. Debería ser 100%.`);
        }
      } catch (err) {
        setError("Error al leer el archivo Excel.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // NUEVA FUNCIÓN: Envía los datos a PostgreSQL
  const importarDatosBD = async () => {
    // 1. Validar contexto
    const complexId = localStorage.getItem("complex_id");
    if (!complexId) {
      setError("Error crítico: No hay un conjunto seleccionado en el menú lateral.");
      return;
    }

    setIsImporting(true);
    setError(null);
    setMensajeExito(null);

    try {
      // Iteramos sobre cada fila del Excel (Para un MVP de < 200 filas esto es súper rápido)
      for (const fila of datos) {
        
        // A. Insertar el Inmueble (Apartamento)
        const { data: propiedad, error: errProp } = await supabase
          .from("properties")
          .insert([{
            complex_id: complexId,
            tower: fila.TORRE ? String(fila.TORRE) : null,
            number: String(fila.APARTAMENTO),
            coefficient: Number(fila.COEFICIENTE)
          }])
          .select("id")
          .single(); // Pedimos que nos devuelva el ID recién creado

        if (errProp) throw new Error(`Error en Inmueble ${fila.APARTAMENTO}: ${errProp.message}`);

        // B. Insertar el Propietario
        const { data: propietario, error: errOwner } = await supabase
          .from("owners")
          .insert([{
            complex_id: complexId,
            document_number: String(fila.DOCUMENTO),
            full_name: fila.PROPIETARIO,
            email: fila.EMAIL ? String(fila.EMAIL) : null
          }])
          .select("id")
          .single();

        if (errOwner) throw new Error(`Error en Propietario ${fila.PROPIETARIO}: ${errOwner.message}`);

        // C. Crear la Relación Propietario <-> Inmueble
        const { error: errRel } = await supabase
          .from("property_owners")
          .insert([{
            property_id: propiedad.id,
            owner_id: propietario.id,
            is_main_contact: true
          }]);

        if (errRel) throw new Error(`Error al enlazar propietario y apartamento.`);
      }

      // Si el ciclo termina sin explotar, todo fue un éxito
      setMensajeExito(`¡Se importaron ${datos.length} registros exitosamente a la base de datos!`);
      setDatos([]); // Limpiamos la tabla
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Tarjeta de Carga */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h1 className="text-2xl font-bold text-blue-950 mb-2">Importar Propietarios</h1>
          
          {mensajeExito && (
            <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 font-medium">
              ✅ {mensajeExito}
            </div>
          )}
          
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-10 text-center bg-blue-50/50">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
            />
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 font-medium">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Tarjeta de Resultados */}
        {datos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-blue-900">Vista Previa de Datos</h2>
              <div className="text-right">
                <p className="text-sm text-gray-500">Registros válidos: <span className="font-bold text-gray-800">{datos.length}</span></p>
                <p className="text-sm text-gray-500">Suma Coeficientes: <span className={`font-bold ${sumaCoeficientes !== 100 ? 'text-red-600' : 'text-green-600'}`}>{sumaCoeficientes}%</span></p>
              </div>
            </div>

            <div className="overflow-x-auto mb-6">
               {/* ... (La tabla sigue igual, resumida por brevedad visual, el código real renderiza tu mapeo de filas) ... */}
               <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-blue-50">
                  <tr>
                    <th className="px-6 py-3">Apto</th>
                    <th className="px-6 py-3">Propietario</th>
                    <th className="px-6 py-3">Coeficiente</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.slice(0, 5).map((fila, index) => (
                    <tr key={index} className="bg-white border-b">
                      <td className="px-6 py-4 font-medium">{fila.APARTAMENTO}</td>
                      <td className="px-6 py-4">{fila.PROPIETARIO}</td>
                      <td className="px-6 py-4">{fila.COEFICIENTE}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button 
              onClick={importarDatosBD}
              disabled={isImporting}
              className={`w-full font-bold py-3 px-6 rounded-lg transition-colors text-white shadow-md
                ${isImporting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isImporting ? 'Inyectando datos en PostgreSQL...' : 'Confirmar e Importar a Base de Datos'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}