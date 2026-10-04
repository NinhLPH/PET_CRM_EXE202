import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import type { Pet, PetInput, Profile } from '../../api/types';
import { Back, Button, Card, Empty, Input, Notice, Pager, QueryState, Title, bookingLabel, bookingPrice, dateTime, fieldError, money } from '../../app/ui';
import { PetForm } from './PetForm';

export function CustomerHome() {
  const profile = useQuery({ queryKey: ['profile'], queryFn: ({ signal }) => api.profile.get(signal) });
  const pets = useQuery({ queryKey: ['pets', 'mine', 1], queryFn: ({ signal }) => api.pets.mine(1, 20, signal) });
  const bookings = useQuery({ queryKey: ['bookings', 'mine', 1, 5], queryFn: ({ signal }) => api.bookings.mine(1, 5, signal) });
  return <><Title>Xin chào{profile.data ? `, ${profile.data.fullName}` : ''}</Title><div className="grid md:grid-cols-3 gap-4 mb-6"><Link to="/app/pets"><Card><b>Thú cưng</b><p className="text-2xl mt-2">{pets.data?.total ?? '…'}</p></Card></Link><Link to="/app/bookings"><Card><b>Lịch hẹn</b><p className="text-2xl mt-2">{bookings.data?.total ?? '…'}</p></Card></Link><Link to="/app/bookings/new"><Card><b>Đặt lịch grooming</b><p className="text-sm mt-2">Xem giá tạm tính và gửi yêu cầu</p></Card></Link></div><div className="grid md:grid-cols-2 gap-6"><Card><h2 className="text-xl font-bold mb-3">Thú cưng của tôi</h2><QueryState loading={pets.isLoading} error={pets.error} retry={() => void pets.refetch()}>{pets.data?.items.length ? pets.data.items.map(pet => <Link key={pet.id} className="block py-2 underline" to={`/app/pets/${pet.id}`}>{pet.name} · {pet.species === 'DOG' ? 'Chó' : 'Mèo'} · {pet.weight} kg</Link>) : <p>Chưa có thú cưng.</p>}</QueryState></Card><Card><h2 className="text-xl font-bold mb-3">Lịch hẹn gần đây</h2><QueryState loading={bookings.isLoading} error={bookings.error} retry={() => void bookings.refetch()}>{bookings.data?.items.length ? bookings.data.items.map(b => <Link key={b.id} className="block py-2 underline" to={`/app/bookings/${b.id}`}>{dateTime(b.bookingDate)} · {bookingLabel[b.status]} · {money(bookingPrice(b))}</Link>) : <p>Chưa có lịch hẹn.</p>}</QueryState></Card></div></>;
}

function ProfileForm({ profile }: { profile: Profile }) {
  const client = useQueryClient(); const [fullName, setFullName] = useState(profile.fullName); const [address, setAddress] = useState(profile.address ?? '');
  const [error, setError] = useState<unknown>(); const [success, setSuccess] = useState(''); const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setPending(true); setError(undefined); setSuccess(''); try { const updated = await api.profile.update({ fullName: fullName.trim(), address }); client.setQueryData(['profile'], updated); setSuccess('Đã cập nhật hồ sơ.'); } catch (e) { setError(e); } finally { setPending(false); } };
  return <Card className="max-w-xl"><Notice error={error} success={success} /><form onSubmit={submit} className="space-y-4"><Input label="Họ tên" required maxLength={100} value={fullName} onChange={e => setFullName(e.target.value)} error={fieldError(error, 'fullName')} /><Input label="Số điện thoại" value={profile.phone} readOnly /><Input label="Địa chỉ" maxLength={255} value={address} onChange={e => setAddress(e.target.value)} error={fieldError(error, 'address')} /><Button type="submit" disabled={pending}>{pending ? 'Đang lưu…' : 'Lưu thay đổi'}</Button></form></Card>;
}
export function CustomerProfile() { const profile = useQuery({ queryKey: ['profile'], queryFn: ({ signal }) => api.profile.get(signal) }); return <><Title>Tài khoản</Title><QueryState loading={profile.isLoading} error={profile.error} retry={() => void profile.refetch()}>{profile.data && <ProfileForm key={profile.data.id} profile={profile.data} />}</QueryState></>; }

export function CustomerPets() {
  const [page, setPage] = useState(1); const [adding, setAdding] = useState(false); const client = useQueryClient();
  const list = useQuery({ queryKey: ['pets', 'mine', page], queryFn: ({ signal }) => api.pets.mine(page, 20, signal) });
  const save = async (input: PetInput) => { await api.pets.create(input); await client.invalidateQueries({ queryKey: ['pets'] }); setAdding(false); setPage(1); };
  return <><Title action={<Button onClick={() => setAdding(!adding)}>{adding ? 'Đóng form' : 'Thêm thú cưng'}</Button>}>Thú cưng</Title>{adding && <Card className="mb-6 max-w-xl"><h2 className="text-xl mb-4">Thêm thú cưng</h2><PetForm onSave={save} onCancel={() => setAdding(false)} /></Card>}<QueryState loading={list.isLoading} error={list.error} retry={() => void list.refetch()}>{list.data?.items.length ? <div className="grid md:grid-cols-2 gap-4">{list.data.items.map(pet => <Link to={`/app/pets/${pet.id}`} key={pet.id}><Card><b>{pet.name}</b><p className="text-sm text-text-secondary">{pet.species === 'DOG' ? 'Chó' : 'Mèo'} · {pet.breed || 'Chưa rõ giống'} · {pet.weight} kg</p></Card></Link>)}</div> : <Empty>Chưa có thú cưng. Thêm một bé để đặt lịch.</Empty>}<Pager page={page} setPage={setPage} data={list.data} /></QueryState></>;
}

export function CustomerPetDetail() {
  const { petId = '' } = useParams(); const client = useQueryClient(); const navigate = useNavigate();
  const [editing, setEditing] = useState(false); const [error, setError] = useState<unknown>(); const [pending, setPending] = useState(false);
  const pet = useQuery({ queryKey: ['pets', petId], queryFn: ({ signal }) => api.pets.get(petId, signal), enabled: !!petId });
  const save = async (input: PetInput) => { const updated = await api.pets.update(petId, input); client.setQueryData(['pets', petId], updated); await client.invalidateQueries({ queryKey: ['pets', 'mine'] }); await client.invalidateQueries({ queryKey: ['quote'] }); setEditing(false); };
  const remove = async () => { if (!window.confirm('Xóa thú cưng này? Chỉ xóa được khi chưa có lịch hẹn hoặc nhắc chăm sóc.')) return; setPending(true); setError(undefined); try { await api.pets.remove(petId); await client.invalidateQueries({ queryKey: ['pets'] }); navigate('/app/pets'); } catch (e) { setError(e); } finally { setPending(false); } };
  return <><Back to="/app/pets" /><Title>{pet.data?.name || 'Thú cưng'}</Title><QueryState loading={pet.isLoading} error={pet.error} retry={() => void pet.refetch()}>{pet.data && <Card className="max-w-xl"><Notice error={error} />{editing ? <PetForm key={pet.data.updatedAt} initial={pet.data} onSave={save} onCancel={() => setEditing(false)} /> : <><PetFields pet={pet.data} /><div className="flex flex-wrap gap-2 mt-5"><Button onClick={() => setEditing(true)}>Chỉnh sửa</Button><Link to={`/app/bookings/new?petId=${pet.data.id}`} className="inline-block px-4 py-2 rounded-lg bg-muted-surface text-plum-noir font-semibold text-sm">Đặt lịch cho bé</Link><Button variant="danger" disabled={pending} onClick={() => void remove()}>Xóa</Button></div></>}</Card>}</QueryState></>;
}
export function PetFields({ pet }: { pet: Pet }) { return <dl className="space-y-2 text-sm"><div><dt className="font-semibold">Loài</dt><dd>{pet.species === 'DOG' ? 'Chó' : 'Mèo'}</dd></div><div><dt className="font-semibold">Giống</dt><dd>{pet.breed || '—'}</dd></div><div><dt className="font-semibold">Cân nặng</dt><dd>{pet.weight} kg</dd></div><div><dt className="font-semibold">Dị ứng</dt><dd>{pet.allergyNote || '—'}</dd></div><div><dt className="font-semibold">Lưu ý đặc biệt</dt><dd>{pet.specialNote || '—'}</dd></div></dl>; }
