import React from 'react';
import CatalogEditorClient from './CatalogEditor.client';

export default function EditCatalogExperience() {
  return (
    <div className="p-8 space-y-10 max-w-6xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black italic">Experiência do Catálogo</h1>
          <p className="text-slate-500 font-medium">Personalize como os clientes veem sua marca.</p>
        </div>
        <div>
          <button
            type="submit"
            form="catalog-editor"
            className="h-14 px-6 bg-slate-900 text-white rounded-[2rem] font-black shadow-xl hover:scale-105 transition-transform"
          >
            PUBLICAR ALTERAÇÕES
          </button>
        </div>
      </header>

      <CatalogEditorClient />
    </div>
  );
}
