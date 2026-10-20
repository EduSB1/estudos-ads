import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/componentes/Layout';
import { Busca } from '@/paginas/Busca';
import { Configuracoes } from '@/paginas/Configuracoes';
import { Inicio } from '@/paginas/Inicio';
import { Leitor } from '@/paginas/Leitor';
import { Materia } from '@/paginas/Materia';
import { Materias } from '@/paginas/Materias';
import { MiniIde } from '@/paginas/MiniIde';
import { Questoes } from '@/paginas/Questoes';
import { Revisao } from '@/paginas/Revisao';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="materias" element={<Materias />} />
        <Route path="materias/:id" element={<Materia />} />
        <Route path="leitor/:id" element={<Leitor />} />
        <Route path="questoes" element={<Questoes />} />
        <Route path="revisao" element={<Revisao />} />
        <Route path="ide" element={<MiniIde />} />
        <Route path="busca" element={<Busca />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
