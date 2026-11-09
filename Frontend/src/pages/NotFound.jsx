import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main className="page container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 24 }}>
      <span className="eyebrow eyebrow--accent">404</span>
      <h1 className="serif" style={{ fontSize: 'clamp(56px, 9vw, 140px)', maxWidth: '12ch' }}>{t('notfound')}</h1>
      <Link to="/" className="btn btn--primary">{t('nav.home')} <span className="arrow">→</span></Link>
    </main>
  );
}
