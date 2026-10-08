import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTournament,
  getTournamentDetail,
  setupTournament,
  updateTournament,
  type SaveTournamentPayload,
} from './tournamentApi';
import { useToast } from '../../core/components/ToastProvider';
import type { TournamentFormat } from '../../core/api/types';

const FORMAT_OPTIONS: { value: TournamentFormat; label: string }[] = [
  { value: 'SINGLE_ELIMINATION', label: '1 mạng (thua là loại)' },
  { value: 'DOUBLE_ELIMINATION', label: '2 mạng (thua 2 lần mới loại)' },
];

export function TournamentFormPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const isNew = !tournamentId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: detail } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => getTournamentDetail(tournamentId as string),
    enabled: !isNew,
  });

  const [name, setName] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('SINGLE_ELIMINATION');
  const [eventDate, setEventDate] = useState('');
  const [prize, setPrize] = useState('');
  const [note, setNote] = useState('');
  const [participantNames, setParticipantNames] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!detail) return;
    setName(detail.tournament.name);
    setFormat(detail.tournament.format);
    setEventDate(detail.tournament.eventDate ?? '');
    setPrize(detail.tournament.prize ?? '');
    setNote(detail.tournament.note ?? '');
    setParticipantNames(
      detail.participants.length > 0 ? detail.participants.map((p) => p.displayName) : ['', '', '', '']
    );
  }, [detail]);

  function buildPayload(): SaveTournamentPayload {
    return {
      name,
      format,
      eventDate: eventDate || null,
      prize: prize || null,
      note: note || null,
      participantNames: participantNames.map((n) => n.trim()).filter((n) => n.length > 0),
    };
  }

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      return isNew ? createTournament(payload) : updateTournament(tournamentId as string, payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      toast.success('Đã lưu nháp giải đấu');
      navigate(`/tournaments/${result.tournament.id}/edit`, { replace: true });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message ?? 'Không thể lưu giải đấu';
      setError(message);
      toast.error(message);
    },
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      const saved = isNew
        ? await createTournament(payload)
        : await updateTournament(tournamentId as string, payload);
      return setupTournament(saved.tournament.id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      toast.success('Đã thiết lập cây đấu! Bắt đầu ghi nhận kết quả.');
      navigate(`/tournaments/${result.tournament.id}`, { replace: true });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message ?? 'Không thể thiết lập giải đấu';
      setError(message);
      toast.error(message);
    },
  });

  function validate(): boolean {
    setError(null);
    if (!name.trim()) {
      setError('Vui lòng nhập tên giải');
      return false;
    }
    return true;
  }

  function handleSaveDraft(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    saveDraftMutation.mutate();
  }

  function handleSetup() {
    if (!validate()) return;
    const validNames = participantNames.map((n) => n.trim()).filter((n) => n.length > 0);
    const count = validNames.length;
    const isPowerOfTwo = count >= 4 && (count & (count - 1)) === 0;
    if (!isPowerOfTwo) {
      setError(`Số người chơi phải là 4, 8, 16, 32... (hiện có ${count} người)`);
      return;
    }
    if (!confirm(`Thiết lập giải với ${count} người chơi? Sau khi thiết lập sẽ KHÔNG thể sửa danh sách nữa.`)) {
      return;
    }
    setupMutation.mutate();
  }

  function updateParticipantName(index: number, value: string) {
    setParticipantNames((names) => {
      const next = [...names];
      next[index] = value;
      return next;
    });
  }

  function addParticipantSlot() {
    setParticipantNames((names) => [...names, '']);
  }

  function removeParticipantSlot(index: number) {
    setParticipantNames((names) => names.filter((_, i) => i !== index));
  }

  const isDraft = isNew || detail?.tournament.status === 'DRAFT';
  const filledCount = participantNames.filter((n) => n.trim().length > 0).length;

  if (!isNew && !detail) {
    return <p>Đang tải...</p>;
  }

  if (!isDraft) {
    return (
      <div className="history-page">
        <header>
          <button onClick={() => navigate('/tournaments')}>←</button>
          <h1>Giải đấu</h1>
        </header>
        <p className="table-manage-empty">
          Giải đấu này đã được thiết lập, không thể chỉnh sửa nữa.{' '}
          <a onClick={() => navigate(`/tournaments/${tournamentId}`)} style={{ cursor: 'pointer' }}>
            Xem cây đấu
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="history-page">
      <header>
        <button onClick={() => navigate('/tournaments')}>←</button>
        <h1>{isNew ? 'Tạo giải đấu' : 'Sửa giải đấu'}</h1>
      </header>

      <form onSubmit={handleSaveDraft} className="table-form tournament-form">
        <h2>Thông tin chung</h2>
        <label>
          Tên giải
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Thể thức
          <select value={format} onChange={(e) => setFormat(e.target.value as TournamentFormat)}>
            {FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ngày tổ chức (tùy chọn)
          <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </label>
        <label>
          Giải thưởng (tùy chọn)
          <input value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="Ví dụ: 1.000.000đ + cúp" />
        </label>
        <label>
          Ghi chú / Thể lệ (tùy chọn)
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <h2 className="tournament-form__section-title">
          Danh sách người tham gia ({filledCount} người)
        </h2>
        <div className="tournament-participant-list">
          {participantNames.map((value, index) => (
            <div className="tournament-participant-row" key={index}>
              <span className="tournament-participant-row__index">{index + 1}</span>
              <input
                value={value}
                onChange={(e) => updateParticipantName(index, e.target.value)}
                placeholder="Tên người chơi"
              />
              <button type="button" onClick={() => removeParticipantSlot(index)}>
                Xóa
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addParticipantSlot}>
          + Thêm người chơi
        </button>

        {error && <p className="error-text">{error}</p>}

        <div className="table-form__actions tournament-form__actions">
          <button type="submit" disabled={saveDraftMutation.isPending}>
            {saveDraftMutation.isPending ? 'Đang lưu...' : 'Lưu nháp'}
          </button>
          <button
            type="button"
            className="btn-success"
            onClick={handleSetup}
            disabled={setupMutation.isPending}
          >
            {setupMutation.isPending ? 'Đang thiết lập...' : 'Thiết lập giải đấu'}
          </button>
        </div>
      </form>
    </div>
  );
}
