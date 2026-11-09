import { api } from '../services';
import { useAsync } from '../hooks/useAsync';
import { Tour } from './Home';
import './home.css';

/** Planos 3D: recorrido edificio → piso 7 → apartamento con selector de estilo interior */
export default function Walkthrough() {
  const { data, error } = useAsync(() => api.styles.list().then((r) => r.styles), []);
  if (!data && !error) return <main className="page" aria-busy="true" />;
  return (
    <main>
      <Tour styles={data || []} />
    </main>
  );
}
