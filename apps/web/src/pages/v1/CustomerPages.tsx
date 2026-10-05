import {useState, type FormEvent} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {ArrowRight, CalendarDays, Cat, Dog, PawPrint} from 'lucide-react';
import {api} from '../../api/endpoints';
import type {Pet, PetInput, Profile} from '../../api/types';
import {
    Back,
    Button,
    Card,
    Empty,
    Input,
    Notice,
    Pager,
    QueryState,
    Title,
    bookingLabel,
    bookingPrice,
    dateTime,
    fieldError,
    money
} from '../../app/ui';
import {PetForm} from './PetForm';

export function CustomerHome() {
    const profile = useQuery({queryKey: ['profile'], queryFn: ({signal}) => api.profile.get(signal)});
    const pets = useQuery({queryKey: ['pets', 'mine', 1], queryFn: ({signal}) => api.pets.mine(1, 20, signal)});
    const bookings = useQuery({
        queryKey: ['bookings', 'mine', 1, 5],
        queryFn: ({signal}) => api.bookings.mine(1, 5, signal)
    });
    return <><Title>Xin chào{profile.data ? `, ${profile.data.fullName}` : ''}</Title>
        <section
            className="mb-8 border-y border-border-custom bg-surface px-4 py-5 sm:px-6 sm:py-6 flex flex-wrap items-center justify-between gap-5">
            <div><p className="text-sm text-text-secondary mb-1">Một chút chăm sóc mỗi ngày</p><h2
                className="font-serif text-xl font-semibold">Sẵn sàng đặt lịch cho bé?</h2><p
                className="text-sm text-text-secondary mt-1">Xem giá tạm tính và gửi yêu cầu đến cửa hàng.</p></div>
            <Link to="/app/bookings/new"
                  className="inline-flex min-h-11 items-center gap-2 rounded-control bg-plum-noir px-4 py-2 text-sm font-semibold text-white hover:bg-plum-light">Đặt
                lịch grooming <ArrowRight aria-hidden="true" size={16}/></Link></section>
        <div
            className="flex flex-wrap gap-x-6 gap-y-1 border-b border-border-custom pb-5 mb-8 text-sm text-text-secondary">
            <Link to="/app/pets" className="hover:text-plum-noir"><b
                className="text-text-primary">{pets.data?.total ?? '…'}</b> thú cưng</Link><Link to="/app/bookings"
                                                                                                 className="hover:text-plum-noir"><b
            className="text-text-primary">{bookings.data?.total ?? '…'}</b> lịch hẹn</Link></div>
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
            <section>
                <div className="flex items-center justify-between border-b border-border-custom pb-3 mb-1"><h2
                    className="font-serif text-xl font-semibold">Thú cưng của tôi</h2><Link to="/app/pets"
                                                                                            className="text-sm text-plum-noir underline underline-offset-4">Xem
                    tất cả</Link></div>
                <QueryState loading={pets.isLoading} error={pets.error}
                            retry={() => void pets.refetch()}>{pets.data?.items.length ? pets.data.items.map(pet =>
                        <Link key={pet.id}
                              className="flex items-center gap-3 border-b border-border-custom py-3 hover:bg-surface"
                              to={`/app/pets/${pet.id}`}><span
                            className="flex size-9 items-center justify-center rounded-control bg-muted-surface text-plum-noir">{pet.species === 'DOG' ?
                            <Dog aria-hidden="true" size={19}/> : <Cat aria-hidden="true" size={19}/>}</span><span
                            className="min-w-0 flex-1"><b className="block font-semibold">{pet.name}</b><span
                            className="text-sm text-text-secondary">{pet.species === 'DOG' ? 'Chó' : 'Mèo'} · {pet.weight} kg</span></span><ArrowRight
                            aria-hidden="true" size={16} className="text-muted-accent"/></Link>) :
                    <div className="py-6 text-sm text-text-secondary flex items-center gap-2"><PawPrint
                        aria-hidden="true" size={18}/>Chưa có thú cưng.</div>}</QueryState></section>
            <section>
                <div className="flex items-center justify-between border-b border-border-custom pb-3 mb-1"><h2
                    className="font-serif text-xl font-semibold">Lịch hẹn gần đây</h2><Link to="/app/bookings"
                                                                                            className="text-sm text-plum-noir underline underline-offset-4">Xem
                    tất cả</Link></div>
                <QueryState loading={bookings.isLoading} error={bookings.error}
                            retry={() => void bookings.refetch()}>{bookings.data?.items.length ? bookings.data.items.map(b =>
                        <Link key={b.id}
                              className="flex items-start gap-3 border-b border-border-custom py-3 hover:bg-surface"
                              to={`/app/bookings/${b.id}`}><CalendarDays aria-hidden="true" size={19}
                                                                         className="mt-0.5 text-muted-accent"/><span
                            className="min-w-0 flex-1"><span
                            className="block font-medium">{dateTime(b.bookingDate)}</span><span
                            className="text-sm text-text-secondary">{bookingLabel[b.status]} · {money(bookingPrice(b))}</span></span><ArrowRight
                            aria-hidden="true" size={16} className="mt-1 text-muted-accent"/></Link>) :
                    <p className="py-6 text-sm text-text-secondary">Chưa có lịch hẹn.</p>}</QueryState></section>
        </div>
    </>;
}

function ProfileForm({profile}: { profile: Profile }) {
    const client = useQueryClient();
    const [fullName, setFullName] = useState(profile.fullName);
    const [address, setAddress] = useState(profile.address ?? '');
    const [error, setError] = useState<unknown>();
    const [success, setSuccess] = useState('');
    const [pending, setPending] = useState(false);
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setPending(true);
        setError(undefined);
        setSuccess('');
        try {
            const updated = await api.profile.update({fullName: fullName.trim(), address});
            client.setQueryData(['profile'], updated);
            setSuccess('Đã cập nhật hồ sơ.');
        } catch (e) {
            setError(e);
        } finally {
            setPending(false);
        }
    };
    return <Card className="max-w-xl"><Notice error={error} success={success}/>
        <form onSubmit={submit} className="space-y-4"><Input label="Họ tên" required maxLength={100} value={fullName}
                                                             onChange={e => setFullName(e.target.value)}
                                                             error={fieldError(error, 'fullName')}/><Input
            label="Số điện thoại" value={profile.phone} readOnly/><Input label="Địa chỉ" maxLength={255} value={address}
                                                                         onChange={e => setAddress(e.target.value)}
                                                                         error={fieldError(error, 'address')}/><Button
            type="submit" disabled={pending}>{pending ? 'Đang lưu…' : 'Lưu thay đổi'}</Button></form>
    </Card>;
}

export function CustomerProfile() {
    const profile = useQuery({queryKey: ['profile'], queryFn: ({signal}) => api.profile.get(signal)});
    return <><Title>Tài khoản</Title><QueryState loading={profile.isLoading} error={profile.error}
                                                 retry={() => void profile.refetch()}>{profile.data &&
        <ProfileForm key={profile.data.id} profile={profile.data}/>}</QueryState></>;
}

export function CustomerPets() {
    const [page, setPage] = useState(1);
    const [adding, setAdding] = useState(false);
    const client = useQueryClient();
    const list = useQuery({queryKey: ['pets', 'mine', page], queryFn: ({signal}) => api.pets.mine(page, 20, signal)});
    const save = async (input: PetInput) => {
        await api.pets.create(input);
        await client.invalidateQueries({queryKey: ['pets']});
        setAdding(false);
        setPage(1);
    };
    return <><Title
        action={<Button onClick={() => setAdding(!adding)}>{adding ? 'Đóng form' : 'Thêm thú cưng'}</Button>}>Thú
        cưng</Title>{adding &&
        <Card className="mb-6 max-w-xl"><h2 className="text-xl mb-4">Thêm thú cưng</h2><PetForm onSave={save}
                                                                                                onCancel={() => setAdding(false)}/></Card>}<QueryState
        loading={list.isLoading} error={list.error} retry={() => void list.refetch()}>{list.data?.items.length ?
        <div className="grid md:grid-cols-2 gap-4">{list.data.items.map(pet => <Link to={`/app/pets/${pet.id}`}
                                                                                     key={pet.id}
                                                                                     className="block group"><Card
            className="h-full transition-colors group-hover:border-muted-accent">
            <div className="flex items-start gap-3"><span
                className="flex size-11 shrink-0 items-center justify-center rounded-control bg-muted-surface text-plum-noir">{pet.species === 'DOG' ?
                <Dog aria-hidden="true" size={22}/> : <Cat aria-hidden="true" size={22}/>}</span>
                <div className="min-w-0"><b className="font-serif text-lg font-semibold">{pet.name}</b><p
                    className="text-sm text-text-secondary mt-1">{pet.species === 'DOG' ? 'Chó' : 'Mèo'} · {pet.breed || 'Chưa rõ giống'} · {pet.weight} kg</p>
                </div>
            </div>
        </Card></Link>)}</div> : <Empty>Chưa có thú cưng. Thêm một bé để đặt lịch.</Empty>}<Pager page={page}
                                                                                                  setPage={setPage}
                                                                                                  data={list.data}/></QueryState></>;
}

export function CustomerPetDetail() {
    const {petId = ''} = useParams();
    const client = useQueryClient();
    const navigate = useNavigate();
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState<unknown>();
    const [pending, setPending] = useState(false);
    const pet = useQuery({
        queryKey: ['pets', petId],
        queryFn: ({signal}) => api.pets.get(petId, signal),
        enabled: !!petId
    });
    const save = async (input: PetInput) => {
        const updated = await api.pets.update(petId, input);
        client.setQueryData(['pets', petId], updated);
        await client.invalidateQueries({queryKey: ['pets', 'mine']});
        await client.invalidateQueries({queryKey: ['quote']});
        setEditing(false);
    };
    const remove = async () => {
        if (!window.confirm('Xóa thú cưng này? Chỉ xóa được khi chưa có lịch hẹn hoặc nhắc chăm sóc.')) return;
        setPending(true);
        setError(undefined);
        try {
            await api.pets.remove(petId);
            await client.invalidateQueries({queryKey: ['pets']});
            navigate('/app/pets');
        } catch (e) {
            setError(e);
        } finally {
            setPending(false);
        }
    };
    return <><Back to="/app/pets"/><Title>{pet.data?.name || 'Thú cưng'}</Title><QueryState loading={pet.isLoading}
                                                                                            error={pet.error}
                                                                                            retry={() => void pet.refetch()}>{pet.data &&
        <div className="max-w-2xl"><Notice error={error}/>{editing ?
            <Card><PetForm key={pet.data.updatedAt} initial={pet.data} onSave={save}
                           onCancel={() => setEditing(false)}/></Card> : <>
                <div className="flex items-center gap-4 border-b border-border-custom pb-5 mb-5"><span
                    className="flex size-16 shrink-0 items-center justify-center rounded-panel bg-muted-surface text-plum-noir">{pet.data.species === 'DOG' ?
                    <Dog aria-hidden="true" size={32} strokeWidth={1.5}/> :
                    <Cat aria-hidden="true" size={32} strokeWidth={1.5}/>}</span>
                    <div><p className="font-serif text-xl font-semibold">{pet.data.name}</p><p
                        className="text-sm text-text-secondary">{pet.data.species === 'DOG' ? 'Chó' : 'Mèo'} · {pet.data.breed || 'Chưa rõ giống'}</p>
                    </div>
                </div>
                <PetFields pet={pet.data}/>
                <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-border-custom"><Button
                    onClick={() => setEditing(true)}>Chỉnh sửa</Button><Link
                    to={`/app/bookings/new?petId=${pet.data.id}`}
                    className="inline-flex min-h-10 items-center px-4 py-2 rounded-control border border-border-custom bg-surface text-plum-noir font-semibold text-sm hover:bg-muted-surface">Đặt
                    lịch cho bé</Link><Button variant="danger" disabled={pending}
                                              onClick={() => void remove()}>Xóa</Button></div>
            </>}</div>}</QueryState></>;
}

export function PetFields({pet}: { pet: Pet }) {
    return <dl className="text-sm">
        <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-border-custom py-3">
            <dt className="text-text-secondary">Loài</dt>
            <dd>{pet.species === 'DOG' ? 'Chó' : 'Mèo'}</dd>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-border-custom py-3">
            <dt className="text-text-secondary">Giống</dt>
            <dd>{pet.breed || '—'}</dd>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-border-custom py-3">
            <dt className="text-text-secondary">Cân nặng</dt>
            <dd>{pet.weight} kg</dd>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-border-custom py-3">
            <dt className="text-text-secondary">Dị ứng</dt>
            <dd className="break-words min-w-0">{pet.allergyNote || '—'}</dd>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-border-custom py-3">
            <dt className="text-text-secondary">Lưu ý đặc biệt</dt>
            <dd className="break-words min-w-0">{pet.specialNote || '—'}</dd>
        </div>
    </dl>;
}
