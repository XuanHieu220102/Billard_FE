import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTournaments } from './tournamentApi';
import { ChartIcon } from '../../core/components/icons';
import type { Tournament, TournamentStatus } from '../../core/api/types';

const STATUS_LABEL: Record<TournamentStatus, string> = {
  DRAFT: 'Nháp',
  SETUP: 'Đang thiết lập',
  IN_PROGRESS: 'Đang diễn ra',
  COMPLETED: 'Đã kết thúc',
};

const STATUS_BADGE_CLASS: Record<TournamentStatus, string> = {
  DRAFT: 'status-badge--maintenance',
  SETUP: 'status-badge--pending',
  IN_PROGRESS: 'status-badge--occupied',
  COMPLETED: 'status-badge--available',
};

const FORMAT_LABEL: Record<Tournament['format'], string> = {
  SINGLE_ELIMINATION: '1 mạng',
  DOUBLE_ELIMINATION: '2 mạng',
};

export function TournamentListPage() {
  const navigate = useNavigate();
  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['tournaments'],
    queryFn: getTournaments,
  });

  function openTournament(tournament: Tournament) {
    if (tournament.status === 'DRAFT') {
      navigate(`/tournaments/${tournament.id}/edit`);
    } else {
      navigate(`/tournaments/${tournament.id}`);
    }
  }

  return (
    <div className="history-page">
      <header>
        <button onClick={() => navigate('/dashboard')}>←</button>
        <h1>Giải đấu</h1>
      </header>

      <button className="btn-primary tournament-create-btn" onClick={() => navigate('/tournaments/new')}>
        + Tạo giải mới
      </button>

      {isLoading && <p>Đang tải...</p>}

      <div className="catalog-item-list">
        {tournaments?.map((t) => (
          <div key={t.id} className="catalog-item-card" onClick={() => openTournament(t)} role="button" tabIndex={0}>
            <div className="catalog-item-card__icon">
              <ChartIcon size={20} />
            </div>
            <div className="catalog-item-card__info">
              <span className="catalog-item-card__name">{t.name}</span>
              <span className="catalog-item-card__price">
                {FORMAT_LABEL[t.format]} · {t.participantCount} người chơi
                {t.eventDate ? ` · ${new Date(t.eventDate).toLocaleDateString('vi-VN')}` : ''}
              </span>
            </div>
            <span className={`status-badge ${STATUS_BADGE_CLASS[t.status]}`}>{STATUS_LABEL[t.status]}</span>
          </div>
        ))}
        {tournaments && tournaments.length === 0 && (
          <p className="table-manage-empty">Chưa có giải đấu nào. Bấm "Tạo giải mới" để bắt đầu.</p>
        )}
      </div>
    </div>
  );
}
