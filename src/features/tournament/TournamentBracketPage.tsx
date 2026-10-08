import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTournamentDetail, setMatchWinner } from './tournamentApi';
import { useToast } from '../../core/components/ToastProvider';
import { TrophyIcon } from '../../core/components/icons';
import type { MatchBracket, TournamentMatch, TournamentParticipant } from '../../core/api/types';

const BRACKET_LABEL: Record<MatchBracket, string> = {
  WINNER: 'Nhánh Thắng',
  LOSER: 'Nhánh Thua',
  GRAND_FINAL: 'Chung Kết',
};

const BRACKET_SUBTITLE: Record<MatchBracket, string> = {
  WINNER: 'Winners Bracket',
  LOSER: 'Losers Bracket',
  GRAND_FINAL: 'Grand Final',
};

type FilterTab = 'ALL' | MatchBracket;

// Toạ độ bố cục cố định (px) dùng để định vị tuyệt đối từng trận và vẽ connector.
const SLOT_HEIGHT = 72;
const ROUND_WIDTH = 168;
const ROUND_GAP = 40;
const CARD_HEIGHT = 56;

/**
 * Gán cho mỗi trận đấu một "vị trí dọc" liên tục (không nhất thiết là số nguyên),
 * dùng quan hệ cha-con thật từ nextMatchId thay vì giả định công thức toán học cố
 * định — vì Nhánh Thua có cấu trúc round không đều (xen kẽ "minor"/"major"), khác
 * với Nhánh Thắng vốn luôn giảm đúng một nửa mỗi vòng.
 *
 * Quy tắc: trận ở vòng 1 của mỗi bracket được xếp vị trí 0, 1, 2, 3... tuần tự theo
 * matchIndex. Trận ở vòng sau nhận vị trí bằng trung bình cộng vị trí của các trận
 * đổ (thắng hoặc thua) vào nó.
 */
function computeMatchPositions(bracketMatches: TournamentMatch[]): Map<string, number> {
  const positionByMatchId = new Map<string, number>();
  const matchesByRound = new Map<number, TournamentMatch[]>();
  for (const match of bracketMatches) {
    const list = matchesByRound.get(match.round) ?? [];
    list.push(match);
    matchesByRound.set(match.round, list);
  }

  const rounds = [...matchesByRound.keys()].sort((a, b) => a - b);

  for (const round of rounds) {
    const roundMatches = [...(matchesByRound.get(round) ?? [])].sort((a, b) => a.matchIndex - b.matchIndex);

    for (const match of roundMatches) {
      const feederPositions: number[] = [];
      for (const candidate of bracketMatches) {
        if (candidate.round >= round) continue;
        const feedsHere = candidate.nextMatchId === match.id || candidate.loserNextMatchId === match.id;
        if (feedsHere && positionByMatchId.has(candidate.id)) {
          feederPositions.push(positionByMatchId.get(candidate.id) as number);
        }
      }

      if (feederPositions.length > 0) {
        const avg = feederPositions.reduce((a, b) => a + b, 0) / feederPositions.length;
        positionByMatchId.set(match.id, avg);
      } else {
        positionByMatchId.set(match.id, match.matchIndex);
      }
    }
  }

  return positionByMatchId;
}

function matchCenterX(roundOrder: number): number {
  return roundOrder * (ROUND_WIDTH + ROUND_GAP);
}

function matchCenterY(position: number): number {
  return position * SLOT_HEIGHT + CARD_HEIGHT / 2;
}

/** A single smooth S-curve connector from the right edge of a source match to the left edge of a target match. */
function ConnectorPath({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  const midX = (from.x + to.x) / 2;
  const d = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
  return <path d={d} className="bracket-connector" />;
}

function MatchSlot({
  label,
  isWinner,
  isCompleted,
  isSelectable,
  onSelect,
}: {
  label: string;
  isWinner: boolean;
  isCompleted: boolean;
  isSelectable: boolean;
  onSelect?: () => void;
}) {
  const isLoser = isCompleted && !isWinner;
  return (
    <button
      type="button"
      className={`bracket-slot${isWinner ? ' bracket-slot--winner' : ''}${isLoser ? ' bracket-slot--loser' : ''}`}
      onClick={isSelectable ? onSelect : undefined}
      disabled={!isSelectable}
    >
      {isWinner && <span className="bracket-slot__check">✓</span>}
      <span className="bracket-slot__name">{label}</span>
    </button>
  );
}

function MatchCard({
  match,
  participantsById,
  onPickWinner,
  isPending,
  x,
  y,
}: {
  match: TournamentMatch;
  participantsById: Map<string, TournamentParticipant>;
  onPickWinner: (matchId: string, winnerId: string) => void;
  isPending: boolean;
  x: number;
  y: number;
}) {
  const name1 = match.participant1Id ? participantsById.get(match.participant1Id)?.displayName ?? '?' : '—';
  const name2 = match.participant2Id ? participantsById.get(match.participant2Id)?.displayName ?? '?' : '—';
  const canPick = match.status === 'READY' && !isPending;
  const isCompleted = match.status === 'COMPLETED';

  return (
    <div
      className={`bracket-match bracket-match--${match.status.toLowerCase()}`}
      style={{ position: 'absolute', left: x, top: y, width: ROUND_WIDTH }}
    >
      <span className="bracket-match__index">Trận #{match.matchIndex + 1}</span>
      <MatchSlot
        label={name1}
        isWinner={isCompleted && match.winnerId === match.participant1Id}
        isCompleted={isCompleted}
        isSelectable={canPick && !!match.participant1Id}
        onSelect={() => match.participant1Id && onPickWinner(match.id, match.participant1Id)}
      />
      <MatchSlot
        label={name2}
        isWinner={isCompleted && match.winnerId === match.participant2Id}
        isCompleted={isCompleted}
        isSelectable={canPick && !!match.participant2Id}
        onSelect={() => match.participant2Id && onPickWinner(match.id, match.participant2Id)}
      />
    </div>
  );
}

function BracketSection({
  bracketType,
  matches,
  participantsById,
  onPickWinner,
  isPending,
}: {
  bracketType: MatchBracket;
  matches: TournamentMatch[];
  participantsById: Map<string, TournamentParticipant>;
  onPickWinner: (matchId: string, winnerId: string) => void;
  isPending: boolean;
}) {
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const positions = computeMatchPositions(matches);
  const maxPosition = Math.max(0, ...matches.map((m) => positions.get(m.id) ?? 0));
  const containerHeight = (maxPosition + 1) * SLOT_HEIGHT;
  const containerWidth = rounds.length * ROUND_WIDTH + (rounds.length - 1) * ROUND_GAP;

  const roundOrderByRound = new Map(rounds.map((r, i) => [r, i]));
  const matchById = new Map(matches.map((m) => [m.id, m]));

  const connectors: { from: { x: number; y: number }; to: { x: number; y: number }; key: string }[] = [];
  for (const match of matches) {
    const order = roundOrderByRound.get(match.round) ?? 0;
    const y = matchCenterY(positions.get(match.id) ?? 0);
    const fromX = matchCenterX(order) + ROUND_WIDTH;

    if (match.nextMatchId && matchById.has(match.nextMatchId)) {
      const target = matchById.get(match.nextMatchId) as TournamentMatch;
      const targetOrder = roundOrderByRound.get(target.round) ?? 0;
      connectors.push({
        from: { x: fromX, y },
        to: { x: matchCenterX(targetOrder), y: matchCenterY(positions.get(target.id) ?? 0) },
        key: `${match.id}-win`,
      });
    }
    if (match.loserNextMatchId && matchById.has(match.loserNextMatchId)) {
      const target = matchById.get(match.loserNextMatchId) as TournamentMatch;
      const targetOrder = roundOrderByRound.get(target.round) ?? 0;
      connectors.push({
        from: { x: fromX, y },
        to: { x: matchCenterX(targetOrder), y: matchCenterY(positions.get(target.id) ?? 0) },
        key: `${match.id}-lose`,
      });
    }
  }

  return (
    <div className={`bracket-section bracket-section--${bracketType.toLowerCase()}`}>
      <h3 className="bracket-section__title">
        {BRACKET_LABEL[bracketType]} <span>({BRACKET_SUBTITLE[bracketType]})</span>
      </h3>
      <div className="bracket-canvas" style={{ width: containerWidth, height: containerHeight + 24 }}>
        <svg className="bracket-connectors" width={containerWidth} height={containerHeight + 24}>
          {connectors.map((c) => (
            <ConnectorPath key={c.key} from={c.from} to={c.to} />
          ))}
        </svg>
        {rounds.map((round) => (
          <span
            key={round}
            className="bracket-round-label"
            style={{ left: matchCenterX(roundOrderByRound.get(round) ?? 0), width: ROUND_WIDTH }}
          >
            Vòng {round}
          </span>
        ))}
        {matches.map((match) => {
          const order = roundOrderByRound.get(match.round) ?? 0;
          return (
            <MatchCard
              key={match.id}
              match={match}
              participantsById={participantsById}
              onPickWinner={onPickWinner}
              isPending={isPending}
              x={matchCenterX(order)}
              y={(positions.get(match.id) ?? 0) * SLOT_HEIGHT + 24}
            />
          );
        })}
      </div>
    </div>
  );
}

export function TournamentBracketPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState<FilterTab>('ALL');

  const { data: detail, isLoading } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => getTournamentDetail(tournamentId as string),
    enabled: !!tournamentId,
  });

  const winnerMutation = useMutation({
    mutationFn: ({ matchId, winnerId }: { matchId: string; winnerId: string }) =>
      setMatchWinner(tournamentId as string, matchId, winnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      toast.success('Đã ghi nhận kết quả trận đấu');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Không thể ghi nhận kết quả');
    },
  });

  if (isLoading || !detail) {
    return <p>Đang tải...</p>;
  }

  const participantsById = new Map(detail.participants.map((p) => [p.id, p]));

  const hasLoserBracket = detail.matches.some((m) => m.bracket === 'LOSER');
  const allBrackets: MatchBracket[] = hasLoserBracket
    ? ['WINNER', 'LOSER', 'GRAND_FINAL']
    : ['WINNER', 'GRAND_FINAL'];

  const visibleBrackets = filter === 'ALL' ? allBrackets : allBrackets.filter((b) => b === filter);

  const completedCount = detail.matches.filter((m) => m.status === 'COMPLETED').length;
  const totalCount = detail.matches.length;

  const grandFinal = detail.matches.find((m) => m.bracket === 'GRAND_FINAL');
  const championName =
    detail.tournament.status === 'COMPLETED' && grandFinal?.winnerId
      ? participantsById.get(grandFinal.winnerId)?.displayName
      : null;

  return (
    <div className="tournament-bracket-page">
      <header className="tournament-bracket-page__header">
        <button onClick={() => navigate('/tournaments')}>←</button>
        <div className="tournament-bracket-page__title-block">
          <div className="tournament-bracket-page__title-row">
            <h1>{detail.tournament.name}</h1>
            <span className="status-badge status-badge--available">Chính thức</span>
          </div>
          <span className="report-page__subtitle">
            {detail.tournament.format === 'DOUBLE_ELIMINATION' ? '2 mạng (Double Elimination)' : '1 mạng (Single Elimination)'}
            {' · '}
            {detail.participants.length} người chơi · {completedCount}/{totalCount} trận đã đấu
          </span>
        </div>
        {championName && (
          <div className="tournament-champion-pill">
            <TrophyIcon size={18} />
            <div>
              <span className="tournament-champion-pill__label">Nhà vô địch</span>
              <strong>{championName}</strong>
            </div>
          </div>
        )}
      </header>

      <div className="tabs tabs--block tournament-bracket-tabs">
        <button className={filter === 'ALL' ? 'active' : ''} onClick={() => setFilter('ALL')}>
          Tất cả
        </button>
        <button className={filter === 'WINNER' ? 'active' : ''} onClick={() => setFilter('WINNER')}>
          Nhánh Thắng
        </button>
        {hasLoserBracket && (
          <button className={filter === 'LOSER' ? 'active' : ''} onClick={() => setFilter('LOSER')}>
            Nhánh Thua
          </button>
        )}
        <button className={filter === 'GRAND_FINAL' ? 'active' : ''} onClick={() => setFilter('GRAND_FINAL')}>
          Chung Kết
        </button>
      </div>

      <div className="bracket-scroll">
        {visibleBrackets.map((bracketType) => {
          const bracketMatches = detail.matches.filter((m) => m.bracket === bracketType);
          if (bracketMatches.length === 0) return null;
          return (
            <BracketSection
              key={bracketType}
              bracketType={bracketType}
              matches={bracketMatches}
              participantsById={participantsById}
              onPickWinner={(matchId, winnerId) => winnerMutation.mutate({ matchId, winnerId })}
              isPending={winnerMutation.isPending}
            />
          );
        })}
      </div>
    </div>
  );
}
