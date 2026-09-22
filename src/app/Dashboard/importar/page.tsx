"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

// Definimos la estructura de datos que esperamos del Excel usando TypeScript
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
  const [error, setError] = useState<string | null>(null);

  // Función que se dispara cuando el usuario selecciona un archivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Usamos FileReader de HTML5 para leer el archivo físicamente
    const reader = new FileReader();

    reader.onload = (evento) => {
      try {
        const binario = evento.target?.result;
        // La librería xlsx lee el archivo binario
        const libro = XLSX.read(binario, { type: "binary" });
        // Tomamos la primera hoja del Excel
        const nombrePrimeraHoja = libro.SheetNames[0];
        const hoja = libro.Sheets[nombrePrimeraHoja];
        
        // Convertimos la hoja de Excel a un arreglo de objetos JSON
        const datosJson = XLSX.utils.sheet_to_json<PropietarioExcel>(hoja);
        
        // --- LÓGICA DE NEGOCIO / QA ---
        // 1. Calcular la suma total de coeficientes
        const totalCoeficiente = datosJson.reduce((acc, fila) => acc + (Number(fila.COEFICIENTE) || 0), 0);
        
        setDatos(datosJson);
        setSumaCoeficientes(Number(totalCoeficiente.toFixed(4))); // Redondeamos a 4 decimales
        setError(null);

        // 2. Validación de regla de negocio
        if (totalCoeficiente < 99.9 || totalCoeficiente > 100.1) {
          setError(`Advertencia: La suma de coeficientes es ${totalCoeficiente.toFixed(4)}%. Debería ser 100%.`);
        }
      } catch (err) {
        setError("Error al leer el archivo. Asegúrate de que sea un Excel válido (.xlsx) y tenga las columnas correctas.");
      }
    };

    // Iniciamos la lectura como archivo binario
    reader.readAsBinaryString(file);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Tarjeta de Carga de Archivo */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h1 className="text-2xl font-bold text-blue-950 mb-2">Importar Propietarios</h1>
          <p className="text-gray-600 mb-6">
            Sube el archivo Excel con las columnas: TORRE, APARTAMENTO, PROPIETARIO, DOCUMENTO, EMAIL, COEFICIENTE.
          </p>

          <div className="border-2 border-dashed border-blue-300 rounded-lg p-10 text-center bg-blue-50/50 hover:bg-blue-50 transition">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-100 file:text-blue-700
                hover:file:bg-blue-200 cursor-pointer"
            />
          </div>
          
          {/* Mensaje de Error / Advertencia */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Tarjeta de Resultados (Se muestra solo si hay datos) */}
        {datos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-blue-900">Vista Previa de Datos</h2>
              <div className="text-right">
                <p className="text-sm text-gray-500">Registros válidos: <span className="font-bold text-gray-800">{datos.length}</span></p>
                <p className="text-sm text-gray-500">Suma Coeficientes: <span className={`font-bold ${sumaCoeficientes !== 100 ? 'text-red-600' : 'text-green-600'}`}>{sumaCoeficientes}%</span></p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-blue-50 border-b border-blue-100">
                  <tr>
                    <th className="px-6 py-3">Torre</th>
                    <th className="px-6 py-3">Apartamento</th>
                    <th className="px-6 py-3">Propietario</th>
                    <th className="px-6 py-3">Documento</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Coeficiente</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.slice(0, 10).map((fila, index) => (
                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4">{fila.TORRE || '-'}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{fila.APARTAMENTO}</td>
                      <td className="px-6 py-4">{fila.PROPIETARIO}</td>
                      <td className="px-6 py-4">{fila.DOCUMENTO}</td>
                      <td className="px-6 py-4">{fila.EMAIL || 'Sin correo'}</td>
                      <td className="px-6 py-4">{fila.COEFICIENTE}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {datos.length > 10 && (
                <div className="text-center p-4 text-sm text-gray-500 bg-gray-50 rounded-b-lg">
                  Mostrando los primeros 10 registros de {datos.length} totales.
                </div>
              )}
            </div>

            <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
              Confirmar e Importar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}